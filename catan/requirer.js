// Finders, Reactions, and Requirers
// Finders get some subject in the world, reactions do something to that subject.
// Requirers combine both a finder and a reaction to make a sort of recipe.
// There are multiple kinds of reactions, but a limited number of finder types.

const logger = require('winston');
const lodash = require('lodash');

const ci = require('./item.js');
const ce = require('./effect.js');
const cu = require('./utils.js');
const cx = require('./context.js');


let reaction_list = [];

class CatanReaction {
    constructor (name, func = trueCF, extra_params = {}) {
        this.name = name;
        this.func = func;
        this.extra_params = extra_params;
    }

    // The run function always takes in the context, the params, and the subject, and returns a string.
    // It WILL also modify the context.
    // The extra 'times' parameter is for situations where you want to run the same effect many times. 
    run(context, params, subject, times = 1) {
        var real_params = cu.combineObjects(params, this.extra_params);
        return this.func(context, real_params, subject, times);
    }
}


function duraDmgRF (context, params, subject, times = 1) {
    logger.info(subject);
    if (params.amount == null || subject.stats.durability == null) return "ERROR"; //todo error
    var acc = "";


    var dmg = cu.parseIntOrRange(params.amount);
    dmg *= times;
    var reduction = subject.stats.flexibility;
    if (reduction != null) dmg = cu.randRound(dmg*(1-reduction));

    if (dmg <= 0) return null;
    
    ce.addStatusTo(subject.statuses, "Durability Damage", {"amount":dmg});
    var new_amount = ce.findStatusIn(subject.statuses, "Durability Damage").params.amount;
    var full_dura = subject.stats.durability;
    acc += subject.name + " took " + dmg + " points of durability damage! (now " + (full_dura - new_amount) + "/" + full_dura + ")";

    if (new_amount >= subject.stats.durability) {
        context.removeID(subject.id);
        acc += "\nYour " + subject.name + " broke!";
    }
    
    return acc;
}


module.exports = {
    CatanReaction : CatanReaction,
    initReactions : initReactions,
    getReaction : getReaction,
    runReaction : runReaction,
    evalReaction : evalReaction,
    testRequires : testRequires,
    runRequires : runRequires
}


function initReactions() {
    reaction_list.push( new CatanReaction("dura_dmg", duraDmgRF));

    //logger.info(reaction_list);
}


function getReaction(name) {
    for (var reaction of reaction_list) {
        if (reaction.name.toLowerCase() == name.toLowerCase()) return reaction;
    }
    return null;
}

function runReaction(context, params, subject, name, times = 1) {
    var reaction = getReaction(name);
    if (reaction == null) return; // todo error
    return reaction.run(context, params, subject, times);
}

// Returns a string with the result message of the evaluated reaction.
function evalReaction(context, subject, obj, times = 1) {
    if (obj.type == null) {} // todo error
    else if (obj.type == "AND") {} // todo
    else if (obj.type == "OR") {} // todo
    
    return runReaction(context, obj, subject, obj.type, times);
}

// Requirer and Finder Stuff

// A few variants a tag can take:
// A single value has to be equal
// An object of the format {min:,max:} for ints (only min or max is required)
function tagValFits(expected_val, real_val) {
    if (real_val == null) return false;
    if (expected_val == real_val) return true;
    
    if (expected_val.min != null || expected_val.max != null) {
        if (expected_val.min != null && expected_val.min > real_val) return false;
        if (expected_val.max != null && expected_val.max < real_val) return false;
        return true;
    }

    return false;
}

function evalFinder(context, finder, discluded_ids) {
    // We use a generator function provided by context to iterate over the possible objects,
    // as designated by the 'type' tag. (yields {"subject":..., "container":...}s)
    var iter;
    var final_function;
    if (finder.type == "player_item") {
        iter = cx.playerItemGen(context);
    }

    // We extract the tags of the finder object that aren't finder parameters
    var required_tags = [];
    for (var param in finder) {
        if (param != "type" && param != "count" && param != "id") required_tags.push(param);
    }

    // These are the finder-specific tags we won't search for when matching objects.
    // We assume we only need one item if no count is provided.
    var count_left = (finder.count == null)? 1 : finder.count;
    var id = finder.id;
    var valid_candidates = [];

    // We screen each possible object through the finder object's filters.
    for (var iter_obj of iter) {
        var candidate = iter_obj.subject;
        var candidate_container = iter_obj.container;

        if (discluded_ids.includes(candidate.id)) continue;
        if (id != null && candidate.id != id) continue;

        for (var required of required_tags) {
            if (!tagValFits(finder[required], candidate.stats[required])) continue;
        }

        // If the object met all the criteria, we have to figure out how to get the count we need.
        // This means splitting a stack if we only need a part of it, or taking multiple candidates
        // to add up to the desired amount.
        if (count_left < candidate.count) {
            var split_item = ci.splitItemInInventory(candidate_container, candidate, count_left);
            discluded_ids.push(split_item.id);
            valid_candidates.push(split_item);
            count_left = 0;
        }
        else {
            discluded_ids.push(candidate.id);
            valid_candidates.push(candidate);
            count_left -= candidate.count;
        }
        
        if (count_left == 0) break;
    }

    // If no match is found, we return the provided failure message to print.
    if (count_left == 0) return valid_candidates;
    else obj.failure_message;
}

// Either returns of a complete list of the finder matches in order, or a list of failure strings.
function evalFinders(context, finders_obj) {
    var matches = [];
    var failure_messages = [];
    // We keep a list of all the object ids currently selected, so we don't use an object twice.
    var discluded_ids = [];

    for (var finder of finders_obj) {
        var result = evalFinder(context, finder, discluded_ids);
        if (typeof(result) == "String") failure_messages.push(result);
        else matches.push(result);
    }

    if (failure_messages.length > 0) return failure_messages;
    else return matches;
}

// This will return whether or not a requirerer can be fully run- so, whether all finders were able to find different subjects.
// If this succeeds, it will return true, otherwise it will return a list of failure strings.
function testRequires(context, requires_obj) {
    // We create a deep copy here in order to *not* mangle whatever is searched through with stack-splitting and all that.
    // TODO this is a TERRIBLE way to do this! this needs to be redone at some point...
    // it might be better to just call the clean function instead of this...
    var context_cpy = lodash.cloneDeep(context)
    var results = evalFinders(context_cpy, requires_obj.finders);

    if (results.length == 0) return "ERROR: Something is wrong with your gather tables!";
    if (typeof(results[0]) == "String") return results;

    return true;
}

function evalFindersFinals(context, finders_obj) {
    for (var finder of finders_obj) {
        switch (finder.type) {
            case "player_item":
                ci.cleanInventory(context.player.inventory);
            default:
                //todo error
        }
    }
}

function runRequires(context, requires_obj, times = 1) {
    var results = evalFinders(context, requires_obj.finders);

    //logger.info(results);

    if (results.length == 0) return "ERROR: Something is wrong with your gather tables";
    if (typeof(results[0]) == "String") return results;

    var msg = ""
    for (var i = 0; i < results.length; i++) {
        for (var found_item of results[i]) {
            msg += evalReaction(context, found_item, requires_obj.reactions[i], times) + "\n";
        }
    }

    evalFindersFinals(context, requires_obj.finders)
    
    return msg;
}


// Final Functions
// For cleaning up stuff after a require-run

function cleanPlayerInventoryFF(context) {
    ci.cleanInventory(context.player.inventory);
}
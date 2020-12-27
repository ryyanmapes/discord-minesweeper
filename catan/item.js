

const logger = require('winston');
const fs = require('fs');
const lodash = require('lodash');

const cu = require('./utils.js');
const ct = require('./tag.js');
const cc = require('./conditions.js');
const cr = require('./requirer.js');
const ce = require('./effect.js');
const { inherits } = require('util');

const prefabs_directory = "./data/prefabs/"

// IDs are random 10-digit integers.
// Yeah, I know, those aren't guranteed to be random, but the chances are in our favor, at least.
class CatanItem {
    constructor (id, name = "", has_special_name = false, picture = null, description = "", count = 1, properties = [], statuses = [], stats = []) {
        if (id == null) this.id = cu.makeID();
        else this.id = id;

        this.name = name;
        this.has_special_name = has_special_name;
        this.picture = picture;
        this.description = description;
        this.count = count;
        this.properties = properties;
        this.statuses = statuses;
        this.stats = stats;
    }

    // Printing stuff

    getInspectLines () {
        var acc = this.count + "x **" + this.name + "**"

        for (var status of this.statuses) {
            acc += " (" + ce.getStatus(status).getOverviewLine(this, status.params) + ")";
        }

        acc += "\n" + this.description;

        if (this.stats.tool_power != null) acc += "\nTool Level " + this.stats.tool_power;

        acc += "\nProperties:"

        var property;
        for (property of this.properties) {
            var tag = ct.getTag(property.tag);
            acc += "\n- " + tag.getOverviewLine();
        }

        if (this.picture != "") return [this.picture, acc];
        return [acc];
    }

    getOverviewLine (include_ids = false) {
        if (include_ids) return this.count + "x **" + this.name + "**   [" + this.id + "]";
        else return this.count + "x **" + this.name + "**";
    }

    // Combining stuff

    isIdenticalTo(item) {
        if (this.properties.length != item.properties.length) return false;
        
        for (var i = 0; i < this.properties.length; i++) {
            if (!ct.tagsMatch(this.properties[i], item.properties[i])) return false;
        }

        return true;
    }

    canStackWith(item) {
        // todo check for uncompramising status effects, like durability dmg or perishibility
        return this.isIdenticalTo(item);
    }

    // Update stuff

    updateName (env) {
        if (this.has_special_name) return;

        var best_base = "Thing";
        var best_base_value = -1;
        var best_material = "";
        var best_material_value = -1;
        var best_adj = "";
        var best_adj_value = -1;

        for (var property of this.properties) {
            var tag = ct.getTag(property.tag);
            logger.info(tag);
            if (tag.type == "Function" && tag.value > best_base_value) {
                best_base = tag.name;
            } else if (tag.type == "Material" && tag.value > best_material_value) {
                best_material = tag.name + " ";
            } else if (tag.type == "Adj" && tag.value > best_adj_value) {
                best_adj = tag.name + " ";
            }
        }

        this.name = best_adj + best_material + best_base;
    }

    updateStats (context) {
        var acc = { };

        var property;
        for (property of this.properties) {
            var tag = ct.getTag(property.tag);
            tag.applyTag(acc, context, property);
        }
        logger.info(acc);
        this.stats = acc;
    }

    update (context) {
        this.updateName();
        this.updateStats(context);
    }

}

function makeItem(obj) {
    var base = new CatanItem();
    var applied = Object.assign(base,obj);
    applied.update({});
    return applied;
}

module.exports = {
    CatanItem : CatanItem,
    makeItem : makeItem,
    addItemToInventory : addItemToInventory,
    doGather : doGather,
    saveAllPrefabs : saveAllPrefabs,
    readAllPrefabs : readAllPrefabs,
    instantiatePrefab : instantiatePrefab,
    splitItemInInventory : splitItemInInventory,
    cleanInventory : cleanInventory,
}

// Helper item functions

function addItemToInventory(item_list, item, amount) {
    if (amount != null) item.count = amount;
    else if (item.count == 0) return;

    for (i of item_list) {
        if (i.canStackWith(item)) {
            i.count += item.count;
            return item_list;
        }
    }
    item_list.push(item);
    return item_list;
}

// returns the taken item stack
function splitItemInInventory(item_list, item, take) {
    if (item.count < take) return null;
    if (item.count == take) return item;

    var new_item = lodash.cloneDeep(item);
    new_item.id = cu.makeID();

    item.count -= take;
    new_item.count = take;

    item_list.push(new_item);
    return new_item;
}

function cleanInventory(item_list) {
    var removal_indices = [];

    for (var i = item_list.length - 1; i >= 0; i--) {
        const item = item_list[i];

        if (item.count == 0) {
            removal_indices.push(i);
            continue;
        }

        for (let j = 0; j < i; j++) {
            const other_item = item_list[j];
            
            if (other_item.canStackWith(item)) {
                other_item.count += item.count;
                removal_indices.push(i);
                break;
            }
        }
        
    }

    for (var n of removal_indices) {
        item_list.splice(n, 1);
    }
}

// gather list is the environment's gathers list object, and specifier allows the player to state what, specifically, they want from the environment.
function doGather (context, prefab_list, gather_list, specifier, power) {
    var item_haul = []; // output acc
    var possible_draws = [];
    var filtered_possible_draws = [];

    // We filter out objects according to the specifier.
    if (specifier == null || specifier == 'anything') possible_draws = gather_list;
    else {
        for (gather_obj of gather_list) {
            if (gather_obj.labels != null && gather_obj.labels.includes(specifier)) possible_draws.push(gather_obj);
            else if (gather_obj.prefab != null && gather_obj.prefab.toLowerCase() == specifier) possible_draws.push(gather_obj);
            else if (gather_obj.item != null && gather_obj.item.name.toLowerCase() == specifier) possible_draws.push(gather_obj);
        }
    }

    // And objects that the conditional forbids (ex: a plant that only blooms during the night)
    for (gather_obj of gather_list) {
        if (gather_obj.condition == null) filtered_possible_draws.push(gather_obj);
        else if ( cc.evalCondition(context, gather_obj.condition) ) filtered_possible_draws.push(gather_obj);
    }
    possible_draws = filtered_possible_draws;
    filtered_possible_draws = [];

    if (possible_draws.length == 0) return "You don't see any of that around here to gather.";

    // And the draws they don't have the ability to collect.
    // We put all the failure messages together into one big string.
    var failure_messages = ""
    for (gather_obj of gather_list) {
        var results = cr.testRequires(context, gather_obj.requires);
        if (results == true) filtered_possible_draws.push(gather_obj);
        else failure_messages += results.reduce( (acc, s) => acc + "(" + s + ") " );
    }
    possible_draws = filtered_possible_draws;
    filtered_possible_draws = [];

    // If the gather fails at this stage, we return a seperate message, using the failure messages.
    if (possible_draws.length == 0) return "You're unable to harvest any of that. " + failure_messages;

    // We use a special weighted randomization here, utilizing stochastic rounding. This allows us to fairly divide the results by how many items are in the pool.
    // The info can have either a prefab name (string) or the data of an item.
    var reaction_messages = "";
    for (var gather_obj of possible_draws) {
        var true_weight = (gather_obj.weight / possible_draws.length) * power

        var amount = cu.randRound(true_weight);
        if (amount != 0) {
            reaction_messages += cr.runRequires(context, gather_obj.requires);

            if (gather_obj.prefab != null) {
                var item = instantiatePrefab(prefab_list, gather_obj.prefab);
                item_haul = addItemToInventory(item_haul, item, amount);
            }
            else if (gather_obj.item != null) {
                item_haul = addItemToInventory(item_haul, makeItem(gather_obj.item), amount);
            }
        }
    }

    return {"items":item_haul, "reaction_messages":reaction_messages, "failure_messages":failure_messages};
}

// Reading, writing, and working with prefabs

// todo: I need to find a way to save everything async
function saveAllPrefabs(prefab_list) {
    for (prefab of prefab_list) {
        fs.writeFileSync(prefabs_directory + prefab.name + ".json", JSON.stringify(prefab, null, 2)  );
    }
}

function readAllPrefabs() {
    var acc = []
    var dirs = fs.readdirSync(prefabs_directory).forEach( filename => {
        var file = fs.readFileSync(prefabs_directory + filename);
        var prefab = JSON.parse(file);

        logger.info(prefab);
        acc.push(prefab);
    });
    return acc;
}

function instantiatePrefab(prefab_list, name, amount = 1) {
    for (prefab of prefab_list) {
        logger.info(prefab);
        if (prefab.name.toLowerCase() == name.toLowerCase()) {
            var instance = makeItem(prefab);
            instance.update({});
            instance.count = amount;
            return instance;
        }
    }
    return null;
}
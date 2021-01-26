

const logger = require('winston');

const cu = require('./utils.js');

let tag_list = [];

// func: acc, contextironment, tag_data -> acc
class CatanTag {
    constructor (name, description, type, value, func, inherited_tags) {
        if (name == null) this.name = "NULL";
        else this.name = name;

        if (description == null) this.description = "";
        else this.description = description;

        if (type == null) this.type = "Other";
        else this.type = type;

        if (value == null) this.value = 0;
        else this.value = value;

        if (func == null) this.func = defaultTagFunction;
        else this.func = func;

        if (inherited_tags == null) this.inherited_tags = [];
        else this.inherited_tags = inherited_tags;
    }

    getInspectLine() {
        var acc = "";
        if (this.inherited_tags.length > 0) {
            acc += "\nSee also: ";
            for (var inherit of this.inherited_tags) {
                acc += "__" + inherit + "__, ";
            }
            acc = acc.slice(0,-2);
        }
        return "__" + this.name + "__ (" + type + ", " + value + ")\n" + this.description + acc; 
    }

    getOverviewLine() {
        var acc = "";
        for (var inherit of this.inherited_tags) {
            acc += "(__" + inherit + "__) ";
        }
        return "__" + this.name + "__ " + acc; 
    }

    getAsProperty() {
        return {"tag":this.name}
    }

    // All tags, when applied, add the lowercase of the name to the acc.
    // Returns nothing, modifies acc
    applyTag (acc, context, params) {

        for (var tag of this.inherited_tags) {
            applyTag(acc, context, params, tag);
        }

        this.func(acc, context, params);

        setStat(acc, this.name.toLowerCase().replace(' ', '_'), true);
    }
}

module.exports = {
    CatanTag : CatanTag,
    initTags : initTags,
    getTag : getTag,
    applyTag : applyTag,
    tagsMatch : tagsMatch,
}


// All TagFunctions only modify acc

function defaultTF(acc, context, params) { return acc; }

function toolTF(acc, context, params) {
    minStat(acc, 'tool_power', 0);
}

function woodenTF(acc, context, params) {
    addStat(acc, 'ignitability', 0.33, 0.0);
    addStat(acc, 'flexibility', 0.1, 0.0);

    avgStat(acc, 'durability', 20);
    avgStat(acc, 'bouyancy', 0.5);

    minStat(acc, 'tool_power', 1);
}

function cherryWoodTF(acc, context, params) {
    addStat(acc, 'incense', 0.1, 0.0);
    addStat(acc, 'fragrant', 0.2, 0.0);

    mulStat(acc, 'durability', 0.9, 1.0);
}

function flintTF(acc, context, params) {
    avgStat(acc, 'durability', 30);
    avgStat(acc, 'bouyancy', 0);

    minStat(acc, 'tool_power', 2);
}


function initTags() {
    tag_list.push( new CatanTag("Axe", "Can be used to chop trees and wood stuff.", "Function", 0, toolTF) );
    tag_list.push( new CatanTag("Log", "Raw wood from a tree.", "Function", 0, defaultTF) );
    tag_list.push( new CatanTag("Rod", "A long shaft. Good for tool handles.", "Function", 0, defaultTF) );
    tag_list.push( new CatanTag("Stick", "A stick. What more is there to say?", "Function", 0, defaultTF, ["Rod"]) );
    tag_list.push( new CatanTag("Basic Tool Head", "By chipping this into the right shape, you can use this as a head for simple tools.", "Function", 0, defaultTF, ["Axe Head", "Pickaxe Head"]) );
    tag_list.push( new CatanTag("Axe Head", "Head of an axe.", "Function", 0, defaultTF) );
    tag_list.push( new CatanTag("Pickaxe Head", "Head of a pickaxe.", "Function", 0, defaultTF) );

    tag_list.push( new CatanTag("Wooden", "Made of wood.", "Material", 0, woodenTF) );
    tag_list.push( new CatanTag("Cherry Wood", "Made of soft, fragrant cherry wood.", "Material", 1, cherryWoodTF, ["Wooden"]) );
    tag_list.push( new CatanTag("Flint", "Made of a shard of flint. Suprisingly sharp, but not very durable.", "Material", 0, flintTF) );
    
    //logger.info(tag_list);
}

// Tag manipulation

function getTag(name) {
    for (var tag of tag_list) {
        if (tag.name.toLowerCase() == name.toLowerCase()) return tag;
    }
    return null;
}

function applyTag(acc, context, params, name) {
    var tag = getTag(name);
    if (tag == null) return; // todo error
    return tag.applyTag(acc, context, params);
}

function tagsMatch(tag1, tag2) {
    return tag1.tag == tag2.tag;
}

// TF helper functions

function setStat(acc, key, val) {
    acc[key] = val;
}

function addStat(acc, key, n, def) {
    if (acc[key] == null) acc[key] = def;
    acc[key] += n
}

function mulStat(acc, key, n, def) {
    if (acc[key] == null) acc[key] = def;
    acc[key] *= n
}

function avgStat(acc, key, n) {
    if (acc[key] == null) {
         acc[key] = n;
         return;
    }
    acc[key] += n;
    acc[key] /= 2;
}

function minStat(acc, key, n) {
    if (acc[key] == null || acc[key] < n) acc[key] = n;
    return;
}

function capStat(acc, key, n) {
    if (acc[key] == null || acc[key] > n) acc[key] = n;
    return;
}


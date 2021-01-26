// Item
// The core of catan. You collect them and use them. Always stored in an Inventory (itemlist).

const logger = require('winston');
const fs = require('fs');
const lodash = require('lodash');
const { property } = require('lodash');

const cu = require('./utils.js');
const ct = require('./tag.js');
const ce = require('./effect.js');

const prefabs_directory = "./data/prefabs/"

// IDs are random 10-digit integers.
// Yeah, I know, those aren't guranteed to be unique, but the chances are in our favor, at least.
class CatanItem {
    constructor (id, name = "", has_special_name = false, picture = null, description = "", count = 1, properties = [], statuses = [], stats = []) {
        if (id == null) this.id = cu.makeID();
        else this.id = id;

        this.name = name;
        this.has_special_name = has_special_name;
        this.picture = picture;
        this.description = description;
        this.count = Math.floor(count);
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


    // Tag Stuff

    containsTag(tag) {
        for (var property of this.properties) {
            if (property.tag == tag.name) return true;
        }
        return false;
    }

    addTag(tag) {
        if (this.containsTag(tag)) return;
        this.properties.push(tag.getAsProperty());
    }

    // Combining stuff

    isIdenticalTo(item) {
        if (this.properties.length != item.properties.length) return false;
        
        for (var i = 0; i < this.properties.length; i++) {
            if (!ct.tagsMatch(this.properties[i], item.properties[i])) return false;
        }

        // TODO combining status effects!

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
            //logger.info(tag);
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
        //logger.info(acc);
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


// Helper inventory functions

function getItemInInventory(inventory, name_or_id, is_lenient = true) {
    for (var item of inventory) {
        if (typeof(name_or_id) == "string") {
            if (item.name.toLowerCase() == name_or_id.toLowerCase() || (is_lenient && item.name.toLowerCase().split(' ').includes(name_or_id.toLowerCase()) )) return item;
        }
        else {
            if (item.id == name_or_id) return item;
        }
    }
    return null;
}

function addItemToInventory(inventory, item, amount) {
    if (amount != null) item.count = amount;
    else if (item.count == 0) return;

    for (i of inventory) {
        if (i.canStackWith(item)) {
            i.count += item.count;
            return inventory;
        }
    }
    inventory.push(item);
    return inventory;
}

function removeItemFromInventory(inventory, item) {
    for (var i = inventory.length - 1; i >= 0; i--) {
        const check_item = inventory[i];
        if (check_item.id == item.id) {
            return inventory.splice(i, 1);
        }
    }

    return null;
}

// returns the taken item stack
function splitItemInInventory(inventory, item, take) {
    if (item.count < take) return null;
    if (item.count == take) return item;

    var new_item = lodash.cloneDeep(item);
    new_item.id = cu.makeID();

    item.count -= take;
    new_item.count = take;

    inventory.push(new_item);
    return new_item;
}

function transferPortionTo(from_inventory, to_inventory, item, take) {
    if (take <= 0) return null;
    if (take == null) take = item.count;
    else if (take > item.count) take = item.count;

    var new_item = lodash.cloneDeep(item);
    new_item.id = cu.makeID();

    item.count -= take;
    new_item.count = take;

    if (item.count == 0) removeItemFromInventory(from_inventory, item);
    addItemToInventory(to_inventory, new_item);

    return new_item;
}

function cleanInventory(inventory) {
    var removal_indices = [];

    for (var i = inventory.length - 1; i >= 0; i--) {
        const item = inventory[i];

        if (item.count == 0) {
            removal_indices.push(i);
            continue;
        }

        for (let j = 0; j < i; j++) {
            const other_item = inventory[j];
            
            if (other_item.canStackWith(item)) {
                other_item.count += item.count;
                removal_indices.push(i);
                break;
            }
        }
        
    }

    for (var n of removal_indices) {
        inventory.splice(n, 1);
    }
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

        //logger.info(prefab);
        acc.push(prefab);
    });
    return acc;
}

function instantiatePrefab(prefab_list, name, amount = 1) {
    for (prefab of prefab_list) {
        //logger.info(prefab);
        if (prefab.name.toLowerCase() == name.toLowerCase()) {
            var clone = lodash.cloneDeep(prefab);
            var instance = makeItem(clone);
            instance.update({});
            instance.count = amount;
            return instance;
        }
    }
    return null;
}





module.exports = {
    CatanItem : CatanItem,
    makeItem : makeItem,
    saveAllPrefabs : saveAllPrefabs,
    readAllPrefabs : readAllPrefabs,
    instantiatePrefab : instantiatePrefab,
    getItemInInventory : getItemInInventory,
    removeItemFromInventory : removeItemFromInventory,
    addItemToInventory : addItemToInventory,
    splitItemInInventory : splitItemInInventory,
    transferPortionTo : transferPortionTo,
    cleanInventory : cleanInventory
}
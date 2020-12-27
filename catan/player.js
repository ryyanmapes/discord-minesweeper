// Tools for making and displaying characters.

const Discord = require('discord.js');
const logger = require('winston');
const fs = require('fs')

const cl = require('./location.js')
const cs = require('./subspace.js');
const ci = require('./item.js');
const { getLocation } = require('./location.js');
const { Cipher } = require('crypto');

const players_directory = "./data/players/"

class CatanPlayer {
    constructor (user_id, user_name, name, picture, location, subspace, inventory, statuses) {

        if (user_id == null) this.user_id = ""
        else this.user_id = user_id;

        if (user_name == null) this.user_name = "";
        else this.user_name = user_name;

        if (name == null) this.name = "";
        else this.name = name;

        this.picture = picture;

        if (location == null) this.location = "No Place";
        else this.location = location;

        if (subspace == null) this.subspace = "";
        else this.subspace = subspace;

        if (inventory == null) this.inventory = [];
        else this.inventory = inventory;

        if (statuses == null) this.statuses = [];
        else this.statuses = statuses;
    }

    // Printing Stuff

    getInspectLines(locations, subspaces) {
        var msg = "";

        var location_title = cl.getLocation(locations, this.location).title;
        var subspace = cs.getSubspace(subspaces, this.subspace);

        if (subspace == null) msg += "**" + this.name + "** (" + this.user_name + ")\nCurrently " + location_title.getFullDisplay() + ".";
        else msg += "**" + this.name + "** (" + this.user_name + ")\nCurrently " + location_title.getFullDisplay() + ", " + subspace.title.getFullDisplay() + ".";

        msg += "\n" + this.getInventoryLine();

        if (this.picture != null) return [this.picture, msg];
        else return [msg];
    }

    getInventoryLine() {
        var msg = "";
        if (this.inventory.length == 0) msg += "Your inventory is empty."
        else {
            msg += "Inventory:";
            for (var item of this.inventory) {
                msg += "\n- ";
                msg += item.getOverviewLine(true);
                item.update({});
            }
        }
        return msg;
    }

    // Inventory Management

    addItems (items) {
        for (var item of items) {
            this.inventory = ci.addItemToInventory(this.inventory, item);
        }
    }

    // Getters

    getItemInInventoryByName(name) {
        for (var item of this.inventory) {
            if (item.name.toLowerCase() == name.toLowerCase() || item.name.toLowerCase().split(' ').includes(name.toLowerCase())) return item;
        }
    }

    getItemInInventoryByID(id) {
        for (var item of this.inventory) {
            if (item.id == id) return item;
        }
    }

}

module.exports = {
    CatanPlayer : CatanPlayer,
    saveAllPlayers : saveAllPlayers,
    readAllPlayers : readAllPlayers,
    getPlayer : getPlayer,
    getPlayerByName : getPlayerByName
}

function makePlayer(obj) {
    var base = new CatanPlayer();
    var applied = Object.assign(base,obj);

    for (var i = 0; i < applied.inventory.length; i++) {
        applied.inventory[i] = ci.makeItem(applied.inventory[i]);
    }

    return applied;
}


// todo: I need to find a way to save everything async
function saveAllPlayers(player_list) {
    for (player of player_list) {
        fs.writeFileSync(players_directory + player.user_id + ".json", JSON.stringify(player, null, 2)  );
    }
}

function readAllPlayers() {
    var acc = []
    var dirs = fs.readdirSync(players_directory).forEach( filename => {
        var file = fs.readFileSync(players_directory + filename);
        var player = makePlayer(JSON.parse(file));

        logger.info(player);
        acc.push(player);
    });
    return acc;
}

function getPlayer(player_list, user) {
    for (player of player_list) {
        if (player.user_id == user.id) return player;
    }
    return null;
}

function getPlayerByName(player_list, name) {
    for (player of player_list) {
        if (player.name.toLowerCase() == name.toLowerCase()) return player;
    }
    return null;
}


// Tools for making and displaying characters.

const Discord = require('discord.js');
const logger = require('winston');
const fs = require('fs')

const players_directory = "./data/players/"

class CatanPlayer {
    constructor (user_id, user_name, name, picture, location) {
        this.user_id = user_id;
        this.user_name = user_name;
        this.name = name;
        this.picture = picture;
        this.location = location
    }

    getInspectLines() {
        return [this.picture, "**" + this.name + "** (" + this.user_name + ")\nCurrently at the **" + this.location + "**"];
    }
}

module.exports = {
    CatanPlayer : CatanPlayer,
    saveAllPlayers : saveAllPlayers,
    readAllPlayers : readAllPlayers,
    getPlayer : getPlayer
}

function makePlayer(obj) {
    var base = new CatanPlayer(null,null,null,null,null);
    return Object.assign(base,obj);
}


// todo: I need to find a way to save everything async
function saveAllPlayers(player_list) {
    for (player of player_list) {
        fs.writeFileSync(players_directory + player.user_id + ".json", JSON.stringify(player)  );
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


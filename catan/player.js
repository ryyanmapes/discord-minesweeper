// Tools for making, displaying characters.

const Discord = require('discord.js');
const logger = require('winston');
const fs = require('fs')

const players_directory = "./data/players/"

module.exports = {
    saveAllPlayers : saveAllPlayers,
    readAllPlayers : readAllPlayers,
    getPlayerByUserID : getPlayerByUserID
}


module.exports.CatanPlayer = class CatanPlayer {
    constructor (user_id, user_name, name, picture) {
        this.user_id = user_id;
        this.user_name = user_name;
        this.name = name;
        this.picture = picture;
    }

    getInspect() {
        return this.name + " (" + this.user_name + ")";
    }
}

// todo: I need to find a way to save everything async
function saveAllPlayers(player_list) {
    for (player of player_list) {
        fs.writeFileSync(players_directory + player.user_id + ".json", JSON.stringify(player),  );
    }
}

function readAllPlayers() {
    let acc = []
    var dirs = fs.readdirSync(players_directory).forEach( filename => {
        let file = fs.readFileSync(players_directory + filename);
        acc.push(JSON.parse(file));
    });
    return acc;
}


function getPlayerByUserID(player_list, user_id) {
    for (player of player_list) {
        if (player.user_id == user_id) return player;
    }
    return null;
}


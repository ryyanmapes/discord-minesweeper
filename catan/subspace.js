// Tools for making, navigating, and displaying smaller locations within locations.

const Discord = require('discord.js');
const logger = require('winston');
const fs = require('fs');

const subspaces_directory = "./data/subspaces/"

class PlaceTitle {
    constructor (name, precedent, preposition, moving_preposition) {
        if (name == null) this.name = "No Name"
        else this.name = name;

        if (precedent == null) this.precedent = "the"
        else this.precedent = precedent;

        if (preposition == null) this.preposition = "at"
        else this.preposition = preposition;

        if (moving_preposition == null) this.moving_preposition = "to"
        else this.moving_preposition = moving_preposition;
    }

    // ex: "at the castle"
    getFullDisplay(capitalize = false) {
        var phrase = this.preposition + " " + this.precedent + " **" + this.name + "**";
        if (capitalize) phrase = phrase.slice(0,1).toUpperCase() + phrase.slice(1);
        return phrase;
    }

    // ex: "to the castle"
    getFullMovingDisplay(capitalize = false) {
        var phrase = this.moving_preposition + " " + this.precedent + " **" + this.name + "**";
        if (capitalize) phrase = phrase.slice(0,1).toUpperCase() + phrase.slice(1);
        return phrase;
    }

    // ex: "the castle"
    getPartialDisplay(capitalize = false) {
        var phrase = this.precedent + " **" + this.name + "**";
        if (capitalize) phrase = phrase.slice(0,1).toUpperCase() + phrase.slice(1);
        return phrase;
    }

    // ex: "castle"
    getNameDisplay(capitalize = false) {
        var phrase = this.name;
        if (capitalize) phrase = phrase.slice(0,1).toUpperCase() + phrase.slice(1);
        return "**" + this.name + "**";
    }
}

function makeTitle(obj) {
    var base = new PlaceTitle();
    return Object.assign(base,obj);
}


class CatanSubspace {
    constructor (title, picture, description, parent_location_title, transition_desc, enter_desc, exit_desc, gathers) {
        if (title == null) this.title = new PlaceTitle();
        else this.title = title;

        this.picture = picture;

        if (description == null) this.description = "";
        else this.description = description;

        if (parent_location_title == null) this.parent_location_title = new PlaceTitle();
        else this.parent_location_title = parent_location_title;

        if (transition_desc == null) this.transition_desc = "";
        else this.transition_desc = transition_desc;
        
        if (enter_desc == null) this.enter_desc = "";
        else this.enter_desc = enter_desc;

        if (exit_desc == null) this.exit_desc = "";
        else this.exit_desc = exit_desc;

        if (gathers == null) this.gathers = null;
        else this.gathers = gathers;
    }

    getInspectLines() {
        var acc = "You are " + this.title.getFullDisplay() + ", " + this.parent_location_title.getFullDisplay() + ".\n" + this.description;
        if (this.picture != null) return [this.picture, acc];
        return [acc];
    }

    getOverviewLine() {
        if (this.transition_desc != "") return this.transition_desc;
        else return "Nearby is " + this.title.getPartialDisplay() + ".";
    }

    getEnterLine () {
        if (this.enter_desc != "") return this.enter_desc;
        else return "You enter " + this.title.getPartialDisplay() + ".";
    } 
    
    getExitLine () {
        if (this.exit_desc != "") return this.exit_desc;
        else return "You leave " + this.title.getPartialDisplay() + ", out to " + this.parent_location_title.getPartialDisplay();
    }

}

function makeSubspace(obj) {
    var base = new CatanSubspace();
    return Object.assign(base,obj);
}


module.exports = {
    PlaceName : PlaceTitle,
    makeTitle : makeTitle,
    CatanSubspace : CatanSubspace,
    saveAllSubspaces : saveAllSubspaces,
    readAllSubspaces : readAllSubspaces,
    getSubspace : getSubspace
}

function saveAllSubspaces(sbsp_list) {
    for (sbsp of sbsp_list) {
        fs.writeFileSync(subspaces_directory + sbsp.parent_location_title.name + "-" + sbsp.title.name + ".json", JSON.stringify(sbsp, null, 2)  );
    }
}

function readAllSubspaces() {
    var acc = []
    var dirs = fs.readdirSync(subspaces_directory).forEach( filename => {
        var file = fs.readFileSync(subspaces_directory + filename);
        var sbsp = makeSubspace(JSON.parse(file));

        sbsp.title = makeTitle(sbsp.title);
        sbsp.parent_location_title = makeTitle(sbsp.parent_location_title);

        logger.info(sbsp);
        acc.push(sbsp);
    });
    return acc;
}

function getSubspace(sbsp_list, name) {
    for (sbsp of sbsp_list) {
        if (sbsp.title.name.toLowerCase() == name.toLowerCase()) return sbsp;
    }
    return null;
}

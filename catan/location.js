// Tools for making, navigating, and displaying locations.

const Discord = require('discord.js');
const logger = require('winston');
const fs = require('fs')

const locations_directory = "./data/locations/"

class CatanLocation {
    constructor (name, picture, description, transitions) {
        this.name = name;
        this.picture = picture;
        this.description = description;
        this.transitions = transitions;
    }

    getInspectLines() {
        var acc = "**" + this.name + "**\n" + this.description;

        var transition;
        for (transition of this.transitions) {
            acc += "\n";
            acc += transition.getInspectLine();
        }

        if (this.picture != "") return [this.picture, acc];
        return [acc];
    }

}

function makeLocation(obj) {
    var base = new CatanLocation("","","",[]);
    return Object.assign(base,obj);
}

class CatanTransition {
    constructor (type, to, preview_desc, travel_desc) {
        this.type = type;
        this.to = to;
        this.preview_desc = preview_desc;
        this.travel_desc = travel_desc;
    }

    getInspectLine() {
        if (this.preview_desc == "") return this.preview_desc;

        switch (this.type) {
            case 'north':
                return "To the north is the **" + this.to + "**";
            case 'east':
                return "Off to the east is the **" + this.to + "**";
            case 'south':
                return "To the south of here is the **" + this.to + "**";
            case 'west':
                return "Over to the west is the **" + this.to + "**";
            default:
                return "Somewhere nearby is the **" + this.to + "**";
        }
    }

    getTravelLine() {
        if (this.travel_desc == "") return this.travel_desc;

        switch (this.type) {
            case 'north':
                return "You head northward towards the **" + this.to + "**";
            case 'east':
                return "You head towards the east, to the **" + this.to + "**";
            case 'south':
                return "You move to the south, towards the **" + this.to + "**";
            case 'west':
                return "You head west, towards the **" + this.to + "**";
            default:
                return "Somewhere nearby is the **" + this.to + "**";
        }
    }
}

function makeTransition(obj) {
    var base = new CatanTransition("","","","");
    return Object.assign(base,obj);
}

module.exports = {
    CatanLocation : CatanLocation,
    CatanTransition : CatanTransition,
    saveAllLocations : saveAllLocations,
    readAllLocations : readAllLocations,
    getLocation : getLocation
}

// todo: I need to find a way to save everything async
function saveAllLocations(loc_list) {
    for (loc of loc_list) {
        fs.writeFileSync(locations_directory + loc.name + ".json", JSON.stringify(loc)  );
    }
}

function readAllLocations() {
    var acc = []
    var dirs = fs.readdirSync(locations_directory).forEach( filename => {
        var file = fs.readFileSync(locations_directory + filename);
        var loc = makeLocation(JSON.parse(file));

        for (var i = 0; i < loc.transitions.length; i++) {
            loc.transitions[i] = makeTransition(loc.transitions[i]);
        }
        logger.info(loc);
        acc.push(loc);
    });
    return acc;
}

function getLocation(loc_list, name) {
    for (loc of loc_list) {
        if (loc.name == name) return loc;
    }
    return null;
}

function getTransitionByType(loc_list, name) {
    for (loc of loc_list) {
        if (loc.name == name) return loc;
    }
    return null;
}

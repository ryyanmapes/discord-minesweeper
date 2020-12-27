// Tools for making, navigating, and displaying locations.

const Discord = require('discord.js');
const logger = require('winston');
const fs = require('fs')

const cu = require('./utils.js')
const cs = require('./subspace.js');
const ci = require('./item.js')
const { info } = require('winston');

const locations_directory = "./data/locations/"

class CatanLocation {
    constructor (title, picture, description, transitions, subspace_names, gathers) {
        if (title == null) this.title = new cs.PlaceName();
        else this.title = title;

        this.picture = picture;

        if (description == null) this.description = "";
        else this.description = description;

        if (transitions == null) this.transitions = [];
        else this.transitions = transitions;

        if (subspace_names == null) this.subspace_names = [];
        else this.subspace_names = subspace_names;

        if (gathers == null) this.gathers = [];
        else this.gathers = gathers;
    }

    getInspectLines(locations, subspaces) {
        var acc = "You are " + this.title.getFullDisplay() + "\n" + this.description;

        var transition;
        for (transition of this.transitions) {
            acc += "\n";
            acc += transition.getInspectLine(locations);
        }

        var sbsp;
        for (sbsp of this.subspace_names) {
            acc += "\n";
            var full_sbsp = cs.getSubspace(subspaces, sbsp);
            acc += full_sbsp.getTransitionInspectLine();
        }

        if (this.picture == null) return [this.picture, acc];
        return [acc];
    }

    getTransitionByType (type) {
        var transition;
        for (transition of this.transitions) {
            if (transition.type.toLowerCase() == type.toLowerCase()) return transition;
        }
        return null;
    } 
    
    getTransitionByTo (to) {
        var transition;
        for (transition of this.transitions) {
            if (transition.to_title.name.toLowerCase() == to.toLowerCase()) return transition;
        }
        return null;
    }

    getSubspace (subspaces, name) {
        var sbsp;
        for (sbsp of this.subspace_names) {
            if (sbsp.toLowerCase() == name.toLowerCase()) {
                var subspace = cs.getSubspace(subspaces, sbsp);
                return subspace;
            }
        }
        return null;
    }

}

function makeLocation(obj) {
    var base = new CatanLocation();
    var applied = Object.assign(base,obj);

    applied.title = cs.makeTitle(applied.title);
    for (var i = 0; i < applied.transitions.length; i++) {
        applied.transitions[i] = makeTransition(applied.transitions[i]);
    }

    return applied;
}

class CatanTransition {
    constructor (type, to_name, preview_desc, travel_desc) {
        if (type == null) this.type = ""
        else this.type = type;

        if (to_name == null) this.to_name = "No Place";
        else this.to_name = to_name;

        if (preview_desc == null) this.preview_desc = "";
        else this.preview_desc = preview_desc;

        if (travel_desc == null) this.travel_desc = "";
        else this.travel_desc = travel_desc;
    }

    getInspectLine(locations) {
        if (this.preview_desc != "") return this.preview_desc;

        var to = getLocation(locations, this.to_name);
        if (to == null) return "ERROR " + this.to_name;
        var to_title = to.title;

        switch (this.type) {
            case 'north':
                return "To the north is " + to_title.getPartialDisplay() + ".";
            case 'east':
                return "Off to the east is " + to_title.getPartialDisplay() + ".";
            case 'south':
                return "To the south of here is " + to_title.getPartialDisplay() + ".";
            case 'west':
                return "Over to the west is " + to_title.getPartialDisplay() + ".";
            default:
                return "Somewhere nearby is " + to_title.getPartialDisplay() + ".";
        }
    }

    getTravelLine(locations) {
        if (this.travel_desc != "") return this.travel_desc;

        var to = getLocation(locations, this.to_name);
        if (to == null) return "ERROR " + this.to_name;
        var to_title = to.title;

        switch (this.type) {
            case 'north':
                return "You head northward " + to_title.getFullMovingDisplay() + ".";
            case 'east':
                return "You head towards the east, " + to_title.getFullMovingDisplay() + ".";
            case 'south':
                return "You move to the south, " + to_title.getFullMovingDisplay() + ".";
            case 'west':
                return "You head west, " + to_title.getFullMovingDisplay() + ".";
            default:
                return "You enter " + to_title.getFullMovingDisplay() + ".";
        }
    }
}

function makeTransition(obj) {
    var base = new CatanTransition();
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
        fs.writeFileSync(locations_directory + loc.title.name + ".json", JSON.stringify(loc, null, 2)  );
    }
}

function readAllLocations() {
    var acc = []
    var dirs = fs.readdirSync(locations_directory).forEach( filename => {
        var file = fs.readFileSync(locations_directory + filename);
        var loc = makeLocation(JSON.parse(file));

        logger.info(loc);
        acc.push(loc);
    });
    return acc;
}

function getLocation(loc_list, name) {
    for (loc of loc_list) {
        if (loc.title.name.toLowerCase() == name.toLowerCase()) return loc;
    }
    return null;
}

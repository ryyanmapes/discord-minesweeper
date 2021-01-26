// Context
// This is the state of the world, in varying proximity to the player.

const logger = require('winston');
const lodash = require('lodash');

const ci = require('./item.js');
const subspace = require('./subspace.js');

// player- the command-user's character.
// env- the local environment, so either the player's subspace, or their location.
// global- global stats that apply everywhere. 
// preferred_ids- object IDs that will be prioritized before
class CatanContext {
    constructor (player, subspace, location, global, preferred_ids = []) {
        this.player = player;
        this.subspace = subspace;
        this.location = location;
        this.global = global;
        this.preferred_ids = preferred_ids;
    }

    // We prioritize the environment over the player inventory here.
    getLocal (name_or_id, is_lenient = true) {
        var env_search = ci.getItemInInventory(this.subspace.inventory, name_or_id, is_lenient);
        if (env_search != null) return env_search;
        return getInPlayer(name_or_id, is_lenient);
    }

    getNotInPlayer (name_or_id, is_lenient = true) {
        if (this.subspace == null) return null;
        return ci.getItemInInventory(this.subspace.inventory, name_or_id, is_lenient);
    }

    getInPlayer (name_or_id, is_lenient = true) {
        return ci.getItemInInventory(this.player.inventory, name_or_id, is_lenient);
    }
}

// Gens
// Always return an object like {"subject":..., "container":...}
// The container param is important because it allows the finder to manipulate the surrounding inventory if needed.

function* playerItemGen(context) {
    for (var preferred_id of context.preferred_ids) {
        for (var item of player.inventory) {
            if (item.id == preferred_id) {
                yield {"subject":item, "container":player.inventory};
                break;
            }
        }
    }

    for (var item of player.inventory) {
        yield {"subject":item, "container":player.inventory};
    }
    return;
}

module.exports = {
    CatanContext : CatanContext,
    playerItemGen : playerItemGen
}
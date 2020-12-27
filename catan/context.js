



// player- the command-user's character.
// env- the local environment, so either the player's subspace, or their location.
// global- global stats that apply everywhere. 
// preferred_ids- object IDs that will be prioritized before
class CatanContext {
    constructor (player, env, global, preferred_ids = []) {
        this.player = player;
        this.env = env;
        this.global = global;
        this.preferred_ids = preferred_ids;
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
// Minesweeper Bot
//////////////////////////////////////////////////////////////////////////////////////////////////

const Discord = require('discord.js');
const logger = require('winston');
const auth = require('./auth.json');
const player = require('./catan/player.js');

const cu = require('./catan/utils.js');
const cp = require('./catan/player.js');
const cl = require('./catan/location.js');
const cs = require('./catan/subspace.js');
const ci = require('./catan/item.js');
const ct = require('./catan/tag.js');
const cc = require('./catan/conditions.js');
const ca = require('./catan/affector_field.js');
const ce = require('./catan/effect.js');
const cx = require('./catan/context.js');
const cr = require('./catan/recipe.js');
const minesweeper = require('./minesweeper.js');
const { runAffectorField } = require('./catan/affector_field.js');

const bot = new Discord.Client();

// Configuring logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';


// Initializing from json files
var prompted_user = undefined;
var current_prompt = "none";
var prompt_data = {};
ct.initTags();
ce.initStatuses();
cc.initConditions();
ca.initAffector();
var players = cp.readAllPlayers();
var locations = cl.readAllLocations();
var subspaces = cs.readAllSubspaces();
var prefabs = ci.readAllPrefabs();
var recipes = cr.readAllRecipes();

// Initializing Discord Bot
bot.login(auth.token)

// Logging to the console that the bot is ready
bot.on('ready', () => {
    logger.info('Connected as: ' + bot.user.username + ' - (' + bot.user.id + ')');
});

// Handling user commands
bot.on('message', msg => {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    text = msg.content;
    if (text.substring(0, 1) != '>') return;

    var full_cmd = text.substring(1).trim()
    var args = full_cmd.split(' ').filter( (s) => s != "");
    var cmd = args.shift();


    // The bot takes this parsing path if the player answering had just been prompted, e.g. during character creation.
    if (prompted_user != null && prompted_user.id === msg.author.id) {

        if (cmd == "cancel") resetPrompt();
        else if (cmd == "confirm") {
            switch (current_prompt) {
                case "join_confirm":
                    var new_player = new cp.CatanPlayer(prompted_user.id, prompted_user.username, prompt_data["name"], prompt_data["picture"], "Spawn");
                    players.push(new_player);
                    saveGame();
                    resetPrompt();
                    send(msg,"You have been spawned into the game! Good luck!");
                default:
                    break;
            }
        }
        else {
            switch (current_prompt) {
                case "join_name":
                    prompt_data["name"] = full_cmd;
                    current_prompt = "join_picture";
                    send(msg,"\nYour character\'s name is **" + full_cmd + "**.\nNext, I'll need a picture url for your character." );
                    break;
                case "join_picture":
                    prompt_data["picture"] = full_cmd;
                    current_prompt = "join_confirm";
                    var new_player = new cp.CatanPlayer(prompted_user.id, prompted_user.username, prompt_data["name"], prompt_data["picture"], "Spawn");
                    send(msg,"\nIs this correct?");
                    sendLines(msg, new_player.getInspectLines());
                    send(msg,"\nIf so, say \'confirm\', otherwise, say \'cancel\'.");
                    break;
                default:
                    break;
            }
        }


    }

    // Commands that can be run without a player

    switch (cmd) {
        case 'joingame':
            if (cp.getPlayer(players, msg.author) == null) {
                beginPrompt(msg.author, "join_name")
                send(msg, "\n" + msg.author.username + ' is joining the game! \nWhat will your character\'s name be?');
            }
            else send(msg, "You already have a character!");
            return;
        case 'on': 
            send(msg, 'I am live.');
            return;
        case 'save':
            saveGame();
            send(msg, 'Saved!');
            return;
        case 'generate':
            var field;
            var numMines;

            if (args.length > 0) {
                numMines = parseInt(args[0]);
            } else {
                numMines = 10;
            }
            field = minesweeper.mineGen(numMines);

            msg.channel.send('Total Mines: :boom:' + Math.min(numMines, 81) + ':boom:\n' + field);
            return;
    }

    // Commands past here require a player (and a valid location)

    var player = cp.getPlayer(players, msg.author);
    if (player == null) return;
    var location = cl.getLocation(locations, player.location);
    if (location == null) {
        send(msg, "Where... *are* you? Contact the GM, somehow you ended up in the formless void... (and you're not supposed to be there, *yet*)");
        return;
    }
    // *subspace* may be null
    var subspace = cs.getSubspace(subspaces, player.subspace);
    // We specify inventory specifically here because for commands like 'gather stone with iron pickaxe' the player should use only the iron pickaxe.
    var context = new cx.CatanContext(player, subspace, location);


    if (cmd == 'whoami' || cmd == 'stats' || cmd == 'profile') { 
        sendLines(msg, player.getInspectLines(locations, subspaces) );
        return;
    }

    if (cmd == 'inventory' || cmd == 'inv') { 
        send(msg, player.getInventoryLine() );
        return;
    }
    
    if (cmd == 'inspect' || cmd == 'examine') {
        if (args.length == 0) sendLines(msg, player.getInspectLines(locations, subspaces) );
        else {
            var input = formatItemInput(args);
            var item = context.getLocal(input);
            if (item == null) send(msg, "You don't see any \'" + input + "\' around here.");
            else sendLines(msg, item.getInspectLines());
        }
        return;
    }

    if (cmd == 'look') {
        if (subspace == null || args.includes("outside")) {
            sendLines(msg, location.getInspectLines(locations, subspaces));
        }
        else {
            sendLines(msg, subspace.getInspectLines());
        }
        return;
    }

    if (cmd == 'exit') {
        if (subspace == null) send(msg, "You're already outside!");
        else {
            player.subspace = "";
            send(msg, subspace.getExitLine());
        }
        return;
    }

    if ((cmd ==  'enter' || cmd == 'approach') && args.length > 0) { 
        var subspace_name = formatLocationInput(args);
        var enter_subspace = location.getSubspace(subspaces, subspace_name);
        if (enter_subspace == null) send(msg, "\'**" + subspace_name + "**\' is not within this location.");
        else {
            player.subspace = enter_subspace.title.name;
            saveGame();
            send(msg, enter_subspace.getEnterLine());
        }
        return;
    }

    if ( (cmd == 'go' || cmd == 'move') && args.length > 0) {
        if (args[0] == "to" && args.length > 1) {
            
            var to = formatLocationInput(args.slice(1));
            //logger.info(to);
            var transition = location.getTransitionByTo(to);

            if (transition == null) send(msg, "\'**" + to + "**\' is not directly adjacent to here.");
            else {
                player.location = transition.to;
                if (subspace != null) {
                    player.subspace = "";
                    send(msg, subspace.getExitLine());
                }
                send(msg, transition.getTravelLine(locations));
                saveGame();
            }
            
        }
        else {

            var direction;
            switch (args[0]) {
                case 'north':
                case 'east':
                case 'south':
                case 'west':
                    direction = args[0];
                default:
            }

            if (direction == null) send(msg, "You're not sure how to move \'" + args[0] + "\'.");
            else {
                var transition = location.getTransitionByType(direction);

                if (transition == null) send(msg, "You can't go " + args[0] + " from here.");
                else {
                    player.location = transition.to_name;
                    if (subspace != null) {
                        player.subspace = "";
                        send(msg, subspace.getExitLine());
                    }
                    send(msg, transition.getTravelLine(locations));
                    saveGame();
                }
            }

        }
        return;
    }

    if ( (cmd == 'gather' || cmd == 'collect') && args.length > 0) {
        var input = formatItemInput(args);

        if (input == 'all' || input == 'everything' || input == 'any') input = 'anything';

        var power = 6 // todo roll stuff

        // We first check if there's anything to gather in the player's subspace, and if not, or if the player isn't in a subspace, we use the location's gatherlist.
        // gather_results is either just a failure string, or an object with 'items' and 'failure_messages'
        if (subspace == null || subspace.gathers == null) {
            send(msg, "You collect **" + input + "** in " + location.title.getPartialDisplay() + ".");
            var gather_results = doGather(context, prefabs, location.gathers, input, power);
        }
        else {
            send(msg, "You collect **" + input + "** in " + subspace.title.getPartialDisplay() + ".");
            var gather_results = doGather(context, prefabs, subspace.gathers, input, power);
        }

        // If there is an error message instead of items, we send that instead. We don't charge action points in this case.
        if (typeof(gather_results) == 'string') send(msg, gather_results);
        // If no item was found, we apologize to the player, but still charge them the action points.
        else if (gather_results.items.length == 0) send(msg, "Sadly, you couldn't find anything. " + gather_results.failure_messages);
        // If everything went well, we print what the player got, and any failure messages.
        else {
            var text = "";
            text += gather_results.reaction_messages;
            text += "You found the following items:"
            for (var item of gather_results.items) {
                text += "\n- " + item.getOverviewLine();
            }
            if (gather_results.failure_messages != "") text += "\n" + gather_results.failure_messages;
            send(msg, text);

            player.addItems(gather_results.items);
            saveGame();
        }
        return;
    }

    if ( (cmd == 'craft' || cmd == 'make') && args.length > 0) {
        var input = formatItemInput(args);

        var result = cr.craftRecipe(prefabs, recipes, context, input);

        if (!result.worked) send(msg, ["You can't craft that.  "].concat(result.msg).reduce( (acc, s) => acc + "(" + s + ")  " ));
        else {
            send(msg, result.msg);
            // todo something here, subtract ap?
        }

        saveGame();
        return;
    }

    if ( (cmd == 'drop') && args.length > 0) {
        if (subspace == null) send(msg, "You can't do that yet.");
        else {
            var count;

            var attempt_parse_num = getNumberInput(args[0]);
            if (attempt_parse_num != null && args.length > 0) { 
                count = attempt_parse_num;
                args.shift();
            }

            var input = formatItemInput(args);
            var item = context.getInPlayer(input);
            if (item == null) send(msg, "You don't have a \'" + input + "\'.");
            else {
                var new_item = ci.transferPortionTo(player.inventory, subspace.inventory, item, count);
                send(msg, "You drop " + new_item.count + "x " + item.name + " into " + subspace.title.getPartialDisplay() + ".");
                saveGame();
            }
        }
        return;
    }

    if ( (cmd == 'grab' || cmd == 'take') && args.length > 0) {
        if (subspace == null) send(msg, "There's nothing within reach. Try using 'gather' instead.")
        else {
            var count;

            var attempt_parse_num = getNumberInput(args[0]);
            if (attempt_parse_num != null && args.length > 0) { 
                count = attempt_parse_num;
                args.shift();
            }

            var input = formatItemInput(args);
            var item = context.getNotInPlayer(input);
            if (item == null) send(msg, "There's no \'" + input + "\' around here.");
            else if (item.stats.immovable == true) send(msg, "You can't pick " + item.name + " up!");
            else {
                var new_item = ci.transferPortionTo(subspace.inventory, player.inventory, item, count);
                send(msg, "You take " + new_item.count + "x " + item.name + " from " + subspace.title.getPartialDisplay() + ".");
                saveGame();
            }
        }
        return;
    }

});


function send(msg, line) {
    msg.channel.send(line);
}

function sendLines(msg, lines) {
    for (line of lines) {
        msg.channel.send(line);
    }
}

function saveGame() {
    cp.saveAllPlayers(players);
    cl.saveAllLocations(locations);
    cs.saveAllSubspaces(subspaces);
    ci.saveAllPrefabs(prefabs);
    cr.saveAllRecipes(recipes);
}


// returns either the item name string, or the id as an int
function formatLocationInput (strings) {
    return strings.filter((s) => s.toLowerCase() != "the" && s.toLowerCase() != "a").reduce((acc, s) => acc + " " + s);
}

function getNumberInput (string) {
    num_regex = /^([0-9]+)$/g;
    var match = num_regex.exec(string);
    if (match == null) return null;
    else return parseInt(match[1]);
}

function formatItemInput (strings) {
    var full_string = strings.reduce((acc, s) => acc + " " + s);
    if (full_string.charAt(full_string.length-1) == 's') full_string = full_string.slice(0,-1);

    id_regex = /^\[([0-9]+)\]$/g;
    var match = id_regex.exec(full_string);
    if (match != null) {
        return parseInt(match[1]);
    }
    else {
        return full_string;
    }
}

function resetPrompt() {
    prompted_user = undefined;
    current_prompt = "none";
    prompt_data = {};
}

function beginPrompt(user, prompt) {
    prompted_user = user;
    current_prompt = prompt;
    prompt_data = {};
}


// gather list is the environment's gathers list object, and specifier allows the player to state what, specifically, they want from the environment.
// todo find a better place for this
function doGather (context, prefab_list, gather_list, specifier, power) {
    var item_haul = []; // output acc
    var possible_draws = gather_list;
    var filtered_possible_draws = [];

    // We filter out objects according to the specifier.
    if (specifier == null || specifier == 'anything') filtered_possible_draws = possible_draws;
    else {
        for (gather_obj of possible_draws) {
            if (gather_obj.labels != null && gather_obj.labels.includes(specifier)) filtered_possible_draws.push(gather_obj);
            else if (gather_obj.prefab != null && gather_obj.prefab.toLowerCase() == specifier) filtered_possible_draws.push(gather_obj);
            else if (gather_obj.item != null && gather_obj.item.name.toLowerCase() == specifier) filtered_possible_draws.push(gather_obj);
        }
    }
    possible_draws = filtered_possible_draws;
    filtered_possible_draws = [];

    // And objects that the conditional forbids (ex: a plant that only blooms during the night)
    for (gather_obj of possible_draws) {
        if (gather_obj.condition == null) filtered_possible_draws.push(gather_obj);
        else if ( cc.evalCondition(context, gather_obj.condition) ) filtered_possible_draws.push(gather_obj);
    }
    possible_draws = filtered_possible_draws;
    filtered_possible_draws = [];

    if (possible_draws.length == 0) return "You don't see any of that around here to gather.";

    // And the draws they don't have the ability to collect.
    // We put all the failure messages together into one big string.
    var failure_messages = ""
    for (gather_obj of possible_draws) {
        if (gather_obj.requires == null) filtered_possible_draws.push(gather_obj);
        else {
            var results = ca.testField(context, gather_obj.requires);
            if (results == true) filtered_possible_draws.push(gather_obj);
            else failure_messages += [""].concat(results).reduce( (acc, s) => acc + "(" + s + ")  " );
        }
    }
    possible_draws = filtered_possible_draws;
    filtered_possible_draws = [];

    // If the gather fails at this stage, we return a seperate message, using the failure messages.
    if (possible_draws.length == 0) return "You're unable to harvest that. " + failure_messages;

    // We use a special weighted randomization here, utilizing stochastic rounding. This allows us to fairly divide the results by how many items are in the pool.
    // The info can have either a prefab name (string) or the data of an item.
    var reaction_messages = "";
    for (var gather_obj of possible_draws) {
        var true_weight = (gather_obj.weight / possible_draws.length) * power

        var amount = cu.randRound(true_weight);
        if (amount != 0) {
            if (gather_obj.requires != null) reaction_messages += runAffectorField(context, gather_obj.requires);

            if (gather_obj.prefab != null) {
                var item = ci.instantiatePrefab(prefab_list, gather_obj.prefab);
                item_haul = ci.addItemToInventory(item_haul, item, amount);
            }
            else if (gather_obj.item != null) {
                item_haul = ci.addItemToInventory(item_haul, ci.makeItem(gather_obj.item), amount);
            }
        }
    }

    return {"items":item_haul, "reaction_messages":reaction_messages, "failure_messages":failure_messages};
}
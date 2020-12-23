// Minesweeper Bot
//////////////////////////////////////////////////////////////////////////////////////////////////

const Discord = require('discord.js');
const logger = require('winston');
const auth = require('./auth.json');
const player = require('./catan/player.js');

const cp = require('./catan/player.js')
const cl = require('./catan/location.js')
const minesweeper = require('./minesweeper.js');
const { CatanLocation } = require('./catan/location.js');

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
var players = cp.readAllPlayers();
var locations = cl.readAllLocations();


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
    var args = full_cmd.split(' ');
    var cmd = args.shift();


    // The bot takes this parsing path if the player answering had just been prompted, e.g. during character creation.
    if (prompted_user != null && prompted_user.id === msg.author.id) {

        if (cmd == "cancel") resetPrompt();
        else if (cmd == "confirm") {
            switch (current_prompt) {
                case "join_confirm":
                    var new_player = new cp.CatanPlayer(prompted_user.id, prompted_user.username, prompt_data["name"], prompt_data["picture"], "Spawn");
                    players.push(new_player);
                    cp.saveAllPlayers(players);
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
        send(msg, "Where... are you? Contact the GM, somehow you ended up in the formless void...");
        break;
    } 

    switch (cmd) {
        case 'whoami':
            sendLines(msg, player.getInspectLines() );
            //locations.push(new cl.CatanLocation("Spawn", "", "The place before places.", [ new cl.CatanTransition("", "Cherry Forest")  ]));
            //locations.push(new cl.CatanLocation("Cherry Forest", "", "TODO", []));
            //cl.saveAllLocations(locations);
            return;
        case 'look':
            sendLines(msg, location.getInspectLines());
            return;
        
        // Past here requires action points to perform.

        case 'go':
        case 'move':
            if (args.length == 0) return;

            if (args[0] == "to" && args.length > 1) {
                
                var transition = location.getTransitionByTo(location, smoosh());

                
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
                    var transition = location.getTransitionByType(location, direction);
                    if (transition == null) send(msg, "You can't go " + args[0] + " from here.");
                    else {
                        player.location = transition.to;
                        send(msg, transition.getTravelLine());
                    }
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

// Minesweeper Bot
//////////////////////////////////////////////////////////////////////////////////////////////////

const Discord = require('discord.js');
const logger = require('winston');
const auth = require('./auth.json');

const cp = require('./catan/player.js')
const minesweeper = require('./minesweeper.js')

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
    if (text.substring(0, 1) == '>') {
        var full_cmd = text.substring(1).trim()
        var args = full_cmd.split(' ');
        var cmd = args.shift();

        // The bot takes this parsing path if the player answering had just been prompted, e.g. during character creation.
        if (prompted_user != null && prompted_user.id === msg.author.id) {
            if (cmd == "cancel") reset_prompt();
            else if (cmd == "confirm") {
                switch (current_prompt) {
                    case "join_confirm":
                        let new_player = new cp.CatanPlayer(prompted_user.id, prompted_user.username, prompt_data["name"], prompt_data["picture"]);
                        players.push(new_player);
                        cp.saveAllPlayers(players);
                        reset_prompt();
                        msg.channel.send("You have been spawned into the game! Good luck!");
                    default:
                        break;
                }
            }
            else {
                switch (current_prompt) {
                    case "join_name":
                        prompt_data["name"] = full_cmd;
                        current_prompt = "join_picture";
                        msg.channel.send("\nYour character\'s name is " + full_cmd + ".\nNext, I'll need a picture url for your character." );
                        break;
                    case "join_picture":
                        prompt_data["picture"] = full_cmd;
                        current_prompt = "join_confirm";
                        let new_player = new cp.CatanPlayer(prompted_user.id, prompted_user.username, prompt_data["name"], prompt_data["picture"]);
                        msg.channel.send("\nIs this correct?");
                        msg.channel.send(new_player.picture);
                        msg.channel.send(new_player.getInspect());
                        msg.channel.send("\nIf so, say \'confirm\', otherwise, say \'cancel\'.");
                        break;
                    default:
                        break;
                }
            }
        } // Most of the time the bot will take the next path, which parses any command from any person at any time.
        else {

            switch (cmd) {
                case 'joingame':
                    if (cp.getPlayerByUserID(players, msg.author.id) == null) {
                        begin_prompt(msg.author, "join_name")
                        msg.channel.send("\n" + msg.author.username + ' is joining the game! \nWhat will your character\'s name be?');
                    }
                    else msg.channel.send("You already have a character!");
                    break;
                case 'on': 
                    msg.channel.send('I am live.');
                    break;
                case 'whoami':
                    msg.channel.send('You are: ' + user + '.');
                    break;
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
                    break;
                default:
                    msg.channel.send('Invalid command.');
                    break;
            }

        }
    }
});

function reset_prompt() {
    prompted_user = undefined;
    current_prompt = "none";
    prompt_data = {};
}

function begin_prompt(user, prompt) {
    prompted_user = user;
    current_prompt = prompt;
    prompt_data = {};
}

// Minesweeper Bot
//////////////////////////////////////////////////////////////////////////////////////////////////
// Including libraries
const Discord = require('discord.js');
const logger = require('winston');
const auth = require('./auth.json');

const minesweeper = require('./minesweeper.js')

const bot = new Discord.Client();

// Configuring logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

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
        var args = text.substring(1).split(' ').filter(str => str != '');
        var cmd = args.shift();

        switch(cmd) {
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
});

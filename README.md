# discord-minesweeper
A Discord bot for Minesweeper.

## Starting the Bot
Getting a Discord bot started involves creating a bot account, registering it with a server, creating code for it, and then finally running the bot in the command line, using `node bot.js`. This README will not go into further detail, but a guide on this topic can be found at this DigitalTrends article (which this project is generally based on): https://www.digitaltrends.com/gaming/how-to-make-a-discord-bot/

## Using the Bot
After turning the bot on, you can use the following commands to interact with it:
```
!on: Outputs whether or not the bot is on.
!whoami: Outputs the name of the user who issued the command.
!generate <mines>: Generates a 9x9 minesweeper board, with
	an optional argument for the number of mines. Default
	mine count is 10.
```

Upon generating a board, each tile is behind a spoiler tag. Click the spoiler tags to reveal tiles, and try not to hit any mines!

# Discord LP-Tracker

## 📌 Description
Discord LP-Tracker is a Discord bot that tracks the match history of you and your friends in League of Legends. The bot sends a message every time a tracked player finishes a game. Every morning, it provides a recap of wins, losses, and LP gains for each tracked player. It supports both SoloQ and Flex queues.

### 🔍 APIs Used
The bot uses Riot APIs:
- `matchv5`
- `summoner`
- `account`
- `league`

### 🛠️ Technologies
The bot is built using:
- **Node.js**
- **TypeScript**
- **discord.js**
- **SQLite3**
- **Sequelize**
- **@fightmegg/riot-api**

## 🚀 Features
✅ Sends a daily recap of tracked players' ranked performance every morning  
✅ Sends a summary after every ranked SoloQ/Flex game played by a tracked player  
✅ Leaderboard feature   

## 📌 Bot Usage Guide
Welcome! Here are the commands to use the bot properly:

### 🔹 Initialization
- `/init` : Initializes the bot for your server.

### 🔹 Adding Players
- `/addplayer accountname:<name> tag:<tag> region:<region>` : Adds a player to the tracking list.

### 🔹 Player Management
- `/deleteplayer accountname:<name> tag:<tag> region:<region>` : Removes a player from the list.
- `/list` : Displays the list of tracked players.
- `/leaderboard` : Shows the general ranking of players.

### 🔹 Daily Recap
📢 Every morning, the bot sends a performance summary:
- Wins / Losses 🎉💀
- LP gained / lost 📈📉

### 🔹 Language Selection
- `/language` : Switch the bot's language between English and French. 🌍

*Need help? Feel free to ask!*

## 📦 Installation
```bash
git clone https://github.com/yourusername/discord-lp-tracker.git
cd discord-lp-tracker
npm install
```

## ⚙️ Configuration
1. Create a `config.json` file and add your Riot API key and Discord bot token:
```json
{
  "token": "your_discord_bot_token",
  "clientId": "your_client_id",
  "leagueAPI": "your_riot_api_key"
}
```
2. Run the bot:
```bash
npm start
```

## 🤝 Contributing
Pull requests are welcome! Feel free to fork the repository and submit your improvements.
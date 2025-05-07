# Discord LP-Tracker

## 📌 Description
Discord LP-Tracker is a Discord bot that tracks the match history of you and your friends in League of Legends. The bot sends a message every time a tracked player finishes a game. Every morning, it provides a recap of wins, losses, and LP gains for each tracked player. It supports both SoloQ and Flex queues.

### 🔍 APIs Used
The bot uses Riot APIs:
- `matchv5`
- `summoner`
- `account`
- `league`
- `tft-summoner-v1`
- `tft-match-v1`
- `tft-league-v1`

### 🛠️ Technologies
The bot is built using:
- **Node.js**
- **TypeScript**
- **discord.js**
- **SQLite3**
- **Sequelize**
- **@fightmegg/riot-api**

## 🚀 Features
- ✅ Real-time match tracking (SoloQ, Flex, TFT)
- ✅ Daily performance recap for tracked players
- ✅ Leaderboard support
- ✅ Toggle tracking per game mode (Flex / TFT)
- ✅ Multilingual: English & French  

## 📌 Bot Usage Guide
Welcome! Here are the commands to use the bot properly:

### 🔹 Initialization
- `/init` : Initializes the bot for your server.
- `/flextoggle` : Toggle Flex queue Tracking for your server.
- `/tfttoggle` : Toggle TFT queue Tracking for your server.

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
git clone https://github.com/@twear81/discord-lp-tracker.git
cd discord-lp-tracker
npm install
```

## ⚙️ Configuration
Set up the required environment variables:
```bash
export DISCORD_TOKEN=your_discord_bot_token
export DISCORD_CLIENTID=your_discord_clientid
export RIOT_API=your_riot_api_key
export RIOT_API_TFT=your_riot_api_tft_key
```
Alternatively, you can use a `.env` file:
```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENTID=your_discord_clientid
RIOT_API=your_riot_api_key
RIOT_API_TFT=your_riot_api_tft_key
```
Then, run the bot:
```bash
npm start
```

## 🤝 Contributing
Pull requests are welcome! Feel free to fork the repository and submit your improvements.
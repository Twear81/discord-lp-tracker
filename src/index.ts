
import { CacheType, ChatInputCommandInteraction, Client, Events, GatewayIntentBits, Guild } from "discord.js";
import cron from "node-cron";
import axios from "axios";
import { promises as fs } from "fs";
import path from "path";
import dotenv from 'dotenv';
import { DDragon } from "@fightmegg/riot-api";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";
import { initDB } from './database/init_database';
import { generateRecapOfTheDay, initLastDayInfo, trackPlayers } from "./tracking/tracking";
import { deleteAllPlayersOfServer, deleteServer } from "./database/databaseHelper";

dotenv.config();
export const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	]
});

export const TACTICIAN_FILE_PATH = path.resolve(__dirname, "../tft-tactician.json");

client.once(Events.ClientReady, async () => {
	await deployCommands();
	await initDB();
	console.log("Discord bot is ready! 🤖");

	console.log("Init LastDay start");
	await initLastDayInfo(false);
	console.log("Init LastDay end");

	// First run for the tracker
	console.log("First tracking start");
	await trackPlayers(true);
	console.log("First tracking end");

	// Tracking each 5 min
	cron.schedule("*/5 * * * *", async () => {
		try {
			console.log("Tracking start");
			await trackPlayers(false);
			console.log("Tracking end");
		} catch (error) {
			console.error("❌ An error occurred during player tracking:", error);
		}
	});
	// Daily recap
	cron.schedule("33 6 * * *", async () => dailyRecapAndReset);

	// Update tft-tactician json
	updateTFTTacticianFile();
	cron.schedule("0 10 * * *", async () => updateTFTTacticianFile);
});

const dailyRecapAndReset = async () => {
	try {
		console.log("Generate recap of the day start");
		await generateRecapOfTheDay();
		console.log("Recap generated");

		await initLastDayInfo(true);
		console.log("Last day info reseted");

		console.log("Generate recap of the day end");
	} catch (error) {
		console.error("❌ A fatal error occurred during daily recap and reset:", error);
	}
};

const updateTFTTacticianFile = async () => {
	try {
		console.log("➡️ Starting the daily update of tft-tactician.json...");

		const latestVersion = await new DDragon().versions.latest();
		let currentVersion = null;
		// Try to read the file
		try {
			const currentFileContent = await fs.readFile(TACTICIAN_FILE_PATH, "utf-8");
			const currentTacticianData = JSON.parse(currentFileContent);
			currentVersion = currentTacticianData.version;
		} catch (readErr) {
			if (
				typeof readErr === "object" &&
				readErr !== null &&
				"code" in readErr &&
				(readErr as NodeJS.ErrnoException).code === "ENOENT"
			) {
				console.log("⚠️ File does not exist, will create a new one.");
			} else {
				throw readErr;
			}
		}

		if (latestVersion === currentVersion) {
			console.log(`✅ tft-tactician.json is already up to date (version: ${latestVersion}). No update needed.`);
			return;
		}

		console.log(`🆕 New version found! Updating from ${currentVersion} to ${latestVersion}.`);

		const newTacticianDataUrl = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/tft-tactician.json`;
		const response = await axios.get(newTacticianDataUrl);

		const updatedData = {
			version: latestVersion,
			data: response.data.data,
		};

		await fs.writeFile(TACTICIAN_FILE_PATH, JSON.stringify(updatedData));
		console.log("✅ tft-tactician.json has been successfully updated!");

		// Optionnel : recharge le cache si tu fais du require à chaud
		delete require.cache[require.resolve(TACTICIAN_FILE_PATH)];

	} catch (error) {
		console.error("❌ An error occurred during the update of tft-tactician.json:", error);
	}
};

// client.on(Events.GuildCreate, async (guild: Guild) => {
// 	await deployCommands({ guildId: guild.id });
// });

client.on(Events.GuildDelete, async (guild: Guild) => {
	const serverId = guild.id;

	await deleteServer(serverId);
	await deleteAllPlayersOfServer(serverId);
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isCommand()) {
		console.error(`No command matching ${interaction.valueOf()} was found.`);
		return;
	}
	const { commandName } = interaction;
	if (commands[commandName as keyof typeof commands]) {
		commands[commandName as keyof typeof commands].execute(interaction as ChatInputCommandInteraction<CacheType>);
	}
});

client.login(process.env.DISCORD_TOKEN);
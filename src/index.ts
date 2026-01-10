
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
import { generateMonthlyRecap } from "./tracking/monthlyRecap";
import { deleteAllPlayersOfServer, deleteServer } from "./database/databaseHelper";
import logger from "./logger/logger";
import { purgeOldGames } from "./tracking/purge";

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
	logger.info("Discord bot is ready! 🤖");

	logger.info("Init LastDay start");
	await initLastDayInfo(false);
	logger.info("Init LastDay end");

	// First run for the tracker
	logger.info("First tracking start");
	await trackPlayers(true);
	logger.info("First tracking end");

	// Tracking each 5 min
	cron.schedule("*/5 * * * *", async () => {
		try {
			logger.info("Tracking start");
			await trackPlayers(false);
			logger.info("Tracking end");
		} catch (error) {
			logger.error("❌ An error occurred during player tracking:", error);
		}
	});
	// Daily recap
	cron.schedule("33 6 * * *", async () => dailyRecapAndReset());

	// Update tft-tactician json
	updateTFTTacticianFile();
	cron.schedule("0 10 * * *", async () => updateTFTTacticianFile());
	
	// Monthly recap - 1st of each month at 8:00
	cron.schedule("0 8 1 * *", async () => {
		try {
			const now = new Date();
			const month = now.getMonth() + 1; // getMonth() returns 0-11
			const year = now.getFullYear();
			logger.info(`📊 Generating monthly recap for ${month}/${year}...`);
			await generateMonthlyRecap(month, year);
			logger.info(`✅ Monthly recap for ${month}/${year} completed`);
		} catch (error) {
			logger.error(`❌ Failed to generate monthly recap:`, error);
		}
	});

	// Cleanup task - 1st of month: Prune records > 12 months old
	cron.schedule("0 0 1 * *", async () => {
		try {
			const yearsToKeep = 1
			await purgeOldGames(yearsToKeep);
		} catch (error) {
			logger.error(`❌ Failed to generate monthly recap:`, error);
		}
	});

});

const dailyRecapAndReset = async () => {
	try {
		logger.info("Generate recap of the day start");
		await generateRecapOfTheDay();
		logger.info("Recap generated");

		await initLastDayInfo(true);
		logger.info("Last day info reseted");

		logger.info("Generate recap of the day end");
	} catch (error) {
		logger.error("❌ A fatal error occurred during daily recap and reset:", error);
	}
};

const updateTFTTacticianFile = async () => {
	try {
		logger.info("➡️ Starting the daily update of tft-tactician.json...");

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
				logger.info("⚠️ File does not exist, will create a new one.");
			} else {
				throw readErr;
			}
		}

		if (latestVersion === currentVersion) {
			logger.info(`✅ tft-tactician.json is already up to date (version: ${latestVersion}). No update needed.`);
			return;
		}

		logger.info(`🆕 New version found! Updating from ${currentVersion} to ${latestVersion}.`);

		const newTacticianDataUrl = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/tft-tactician.json`;
		const response = await axios.get(newTacticianDataUrl);

		const updatedData = {
			version: latestVersion,
			data: response.data.data,
		};

		await fs.writeFile(TACTICIAN_FILE_PATH, JSON.stringify(updatedData));
		logger.info("✅ tft-tactician.json has been successfully updated!");

		// Optionnel : recharge le cache si tu fais du require à chaud
		delete require.cache[require.resolve(TACTICIAN_FILE_PATH)];

	} catch (error) {
		logger.error("❌ An error occurred during the update of tft-tactician.json:", error);
	}
};

// client.on(Events.GuildCreate, async (guild: Guild) => {
// 	await deployCommands({ guildId: guild.id });
// });

client.on(Events.GuildDelete, async (guild: Guild) => {
	try {
		const serverId = guild.id;

		await deleteAllPlayersOfServer(serverId);
		await deleteServer(serverId);
	} catch (error) {
		logger.error("❌ A fatal error occurred during server delete:", error);
	}
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isCommand()) {
		logger.error(`No command matching ${interaction.valueOf()} was found.`);
		return;
	}
	const { commandName } = interaction;
	if (commands[commandName as keyof typeof commands]) {
		commands[commandName as keyof typeof commands].execute(interaction as ChatInputCommandInteraction<CacheType>);
	}
});

client.login(process.env.DISCORD_TOKEN);
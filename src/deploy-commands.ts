import { REST, Routes } from "discord.js";
import { commands } from "./commands";
import dotenv from 'dotenv';
import logger from "./logger/logger";

dotenv.config();

const commandsData = Object.values(commands).map((command) => command.data);

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENTID = process.env.DISCORD_CLIENTID;
if (!DISCORD_TOKEN || !DISCORD_CLIENTID) {
	logger.error('❌ DISCORD_TOKEN and DISCORD_CLIENTID must be set in the environment.');
	process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

export async function deployCommands() {
	try {
		logger.info('Started refreshing application (/) commands.');

		await rest.put(Routes.applicationCommands(DISCORD_CLIENTID!), {
			body: commandsData
		});

		logger.info('Successfully reloaded application (/) commands.');
	} catch (error) {
		logger.error('❌ Failed to deploy commands:', error);
		throw error;
	}
}
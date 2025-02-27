
import { CacheType, ChatInputCommandInteraction, Client, Events, GatewayIntentBits, Guild } from "discord.js";
import cron from "node-cron";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";
import { initDB } from './database/init_database';
import { generateRecapOfTheDay, initLastDayInfo, trackPlayer } from "./tracking/tracking";
import dotenv from 'dotenv';
import { deleteAllPlayersOfServer, deleteServer } from "./database/databaseHelper";

dotenv.config();
export const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	]
});

client.once(Events.ClientReady, async () => {
	await initDB();
	console.log("Discord bot is ready! 🤖");

	console.log("Init LastDay start");
	await initLastDayInfo(false);
	console.log("Init LastDay end");
	// First run for the tracker
	console.log("First tracking start");
	await trackPlayer(true);
	console.log("First tracking end");

	// Start the tracking
	cron.schedule("*/5 * * * *", async () => { // Each minute 5
		console.log("Tracking start");
		await trackPlayer(false);
		console.log("Tracking end");
	});

	cron.schedule("33 6 * * *", async () => { // Each day on 6am 33
		console.log("Generate recap of the day start");
		await generateRecapOfTheDay();
		console.log("Recap generated");
		// Reset for the next day
		await initLastDayInfo(true);
		console.log("Last day info reseted");
		console.log("Generate recap of the day end");
	});
});

client.on(Events.GuildCreate, async (guild: Guild) => {
	await deployCommands({ guildId: guild.id });
});

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
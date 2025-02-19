
import { CacheType, ChatInputCommandInteraction, Client, GatewayIntentBits } from "discord.js";
import cron from "node-cron";
import { token } from '../config.json';
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";
import { initDB } from  './database/init_database';
import { initLastDayInfo, trackPlayer } from "./tracking/tracking";

export const client = new Client({ intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent 
] });

client.once("ready", async () => {
	await initDB();
	console.log("Discord bot is ready! 🤖");

	await initLastDayInfo(false);
	// First run for the tracker
	console.log("First tracking");
	await trackPlayer(true);
	// Start the tracking
	
	cron.schedule("5 * * * *", async () => {
		console.log("Tracking start");
		await trackPlayer(false);
		console.log("Tracking finish");
	}, {
		timezone: "Europe/Paris"
	});

	cron.schedule("1 7 * * *", async () => { // Each day on 7am 01
		console.log("Generate recap of the day start");
		// await generateRecapOfTheDay();
		// Reset for the next day
		await initLastDayInfo(true);
		console.log("Generate recap of the day finish");
	}, {
		timezone: "Europe/Paris"
	});
});

client.on("guildCreate", async (guild) => {
	await deployCommands({ guildId: guild.id });
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) {
		console.error(`No command matching ${interaction.valueOf()} was found.`);
		return;
	}
	const { commandName } = interaction;
	if (commands[commandName as keyof typeof commands]) {
		commands[commandName as keyof typeof commands].execute(interaction as ChatInputCommandInteraction<CacheType>);
	}
});

client.login(token);
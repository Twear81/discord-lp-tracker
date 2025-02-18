
import { CacheType, ChatInputCommandInteraction, Client, GatewayIntentBits } from "discord.js";
import { token } from '../config.json';
import { commands } from "./commands";
// import { deployCommands } from "./deploy-commands";
import { initDB } from  './database/init_database';
import { trackPlayer } from "./tracking/tracking";

export const client = new Client({ intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent 
] });
// const CHECK_INTERVAL = 300000; // track every 5 min

client.once("ready", async () => {
	// await deployCommands();
	await initDB();
	console.log("Discord bot is ready! 🤖");

	// First run for the tracker
	console.log("First tracking");
	await trackPlayer(true);
	// Start the tracking
	console.log("Tracking start");
	// setInterval(trackPlayer, CHECK_INTERVAL);
});

// client.on("guildCreate", async (guild) => {
// 	await deployCommands({ guildId: guild.id });
// });

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
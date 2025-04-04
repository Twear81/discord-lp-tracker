import { REST, Routes } from "discord.js";
import { commands } from "./commands";
import dotenv from 'dotenv';

dotenv.config();

const commandsData = Object.values(commands).map((command) => command.data);

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

export async function deployCommands() { //{ guildId }: DeployCommandsProps
	try {
		console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENTID!), {
            body: commandsData
        })

        console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error(error);
	}
}
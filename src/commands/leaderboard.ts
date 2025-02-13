import { SlashCommandBuilder, CommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
	.setName('leaderboard')
	.setDescription('Check who is the best from player watched!');

export async function execute(interaction: CommandInteraction): Promise<void> {
	// interaction.user is the object representing the User who ran the command
	// interaction.member is the GuildMember object, which represents the user in the specific guild
	await interaction.reply('Pong!');
}
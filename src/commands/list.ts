import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { listAllPlayerForSpecificServer, PlayerInfo } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';

export const data = new SlashCommandBuilder()
	.setName('list')
	.setDescription('List all players watched!');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	try {
		const serverId = interaction.guildId as string;

		const accountNameTagPlayerList: PlayerInfo[] = await listAllPlayerForSpecificServer(serverId);

		// Create the message
		const messageToDisplay = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('List of player tracked')
			.setDescription(
				accountNameTagPlayerList.map(acc => `**Account:** ${acc.accountnametag}\n**Region:** ${acc.region}`).join('\n\n')
			)
			.setTimestamp();

		await interaction.reply({
			embeds: [messageToDisplay],
			flags: MessageFlags.Ephemeral,
		});
		console.log('The list has been demanded');
	} catch (error) {
		if (error instanceof AppError) {
			if (error.type === ErrorTypes.SERVER_NOT_INITIALIZE) {
				await interaction.reply({
					content: 'You have to init the bot first',
					flags: MessageFlags.Ephemeral,
				});
			}
		} else {
			console.error('Failed to display the list:', error);
			await interaction.reply({
				content: 'Failed to display the list, contact the dev',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
}
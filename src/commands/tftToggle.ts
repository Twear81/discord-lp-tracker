import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction } from 'discord.js';
import { AppError, ErrorTypes } from '../error/error';
import { updateTFTToggleServer } from '../database/databaseHelper';

export const data = new SlashCommandBuilder()
	.setName('tfttoggle')
	.setDescription('Whether or not the tft games are tracked!')
	.addBooleanOption(option =>
		option.setName('tfttoggle')
			.setDescription('Whether or not the tft games are tracked')
			.setRequired(true)
	);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	try {
		const serverId = interaction.guildId as string;
		const tftToggle = interaction.options.getBoolean('tfttoggle')!;

		await updateTFTToggleServer(serverId, tftToggle);

		const tftMessage = tftToggle === true
			? 'will watch for tft game'
			: 'will not watch for tft game';

		await interaction.reply({
			content: `The bot ${tftMessage}`,
			flags: MessageFlags.Ephemeral,
		});
		console.log(`The tfttoggle has been changed for serverId: ${serverId}`);
	} catch (error) {
		if (error instanceof AppError) {
			if (error.type === ErrorTypes.SERVER_NOT_INITIALIZE) {
				await interaction.reply({
					content: 'You have to init the bot first',
					flags: MessageFlags.Ephemeral,
				});
			}
		} else {
			console.error('Failed to change tft toggle:', error);
			await interaction.reply({
				content: 'Failed to change tft toggle, contact the dev',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
}

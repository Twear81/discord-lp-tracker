import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { updateLangServer } from '../database/databaseHelper';
import { replyCommandError } from './commandError';
import logger from '../logger/logger';

export const data = new SlashCommandBuilder()
	.setName('language')
	.setDescription('Change the message language!')
	.addStringOption(option =>
		option.setName('lang')
			.setDescription('The language used by the bot')
			.setRequired(true)
			.addChoices(
				{ name: 'fr', value: 'fr' },
				{ name: 'en', value: 'en' }
			)
	);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	const serverId = interaction.guildId as string;
	const lang = interaction.options.getString('lang', true);
	try {
		await updateLangServer(serverId, lang);

		await interaction.reply({
			content: `The bot has been set to "${lang}" language.`,
			flags: MessageFlags.Ephemeral,
		});
		logger.info(`The language has been changed for serverId: ${serverId}`);
	} catch (error) {
		await replyCommandError(interaction, error, 'Failed to change the language, contact the dev');
	}
}

import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ChatInputCommandInteraction, InteractionContextType } from 'discord.js';
import { getTranslations } from '../translation/translation';
import logger from '../logger/logger';
import { getCommandLang, replyCommandError } from './commandError';

export const data = new SlashCommandBuilder()
	.setName('help')
	.setContexts(InteractionContextType.Guild)
	.setDescription('I will explain you how to setup the bot on your server!');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	// /help is most useful *before* /init: getCommandLang falls back to
	// English instead of failing when the server is not set up yet.
	const translations = getTranslations(await getCommandLang(interaction.guildId));
	try {
		const t = translations.help;

		const helpEmbed = new EmbedBuilder()
			.setTitle(t.title)
			.setColor(0x0099FF)
			.setDescription(t.description)
			.setTimestamp();

		await interaction.reply({
			embeds: [helpEmbed],
			flags: MessageFlags.Ephemeral,
		});
		logger.info('The help has been called');
	} catch (error) {
		await replyCommandError(interaction, error, translations);
	}
}

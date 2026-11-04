import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, InteractionContextType, PermissionFlagsBits } from 'discord.js';
import { updateLangServer } from '../database/databaseHelper';
import { getCommandLang, replyCommandError } from './commandError';
import { getTranslations } from '../translation/translation';
import logger from '../logger/logger';

export const data = new SlashCommandBuilder()
	.setName('language')
	.setContexts(InteractionContextType.Guild)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
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
	const t = getTranslations(await getCommandLang(serverId));
	try {
		await updateLangServer(serverId, lang);

		await interaction.reply({
			content: getTranslations(lang).commands.languageChanged,
			flags: MessageFlags.Ephemeral,
		});
		logger.info(`The language has been changed for serverId: ${serverId}`);
	} catch (error) {
		await replyCommandError(interaction, error, t);
	}
}

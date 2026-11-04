import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getCommandLang, replyCommandError } from './commandError';
import { updateTFTToggleServer } from '../database/databaseHelper';
import { getTranslations } from '../translation/translation';
import logger from '../logger/logger';

export const data = new SlashCommandBuilder()
	.setName('tfttoggle')
	.setContexts(InteractionContextType.Guild)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.setDescription('Whether or not the tft games are tracked!')
	.addBooleanOption(option =>
		option.setName('tfttoggle')
			.setDescription('Whether or not the tft games are tracked')
			.setRequired(true)
	);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	const serverId = interaction.guildId as string;
	const tftToggle = interaction.options.getBoolean('tfttoggle')!;
	const t = getTranslations(await getCommandLang(serverId));
	try {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		await updateTFTToggleServer(serverId, tftToggle);

		await interaction.editReply({
			content: t.commands.tftToggle(tftToggle),
		});
		logger.info(`The tfttoggle has been changed for serverId: ${serverId}`);
	} catch (error) {
		await replyCommandError(interaction, error, t);
	}
}

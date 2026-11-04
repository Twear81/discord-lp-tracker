import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { replyCommandError } from './commandError';
import { updateTFTToggleServer } from '../database/databaseHelper';
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
	try {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		await updateTFTToggleServer(serverId, tftToggle);

		const tftMessage = tftToggle === true
			? 'will watch for tft game'
			: 'will not watch for tft game';

		await interaction.editReply({
			content: `The bot ${tftMessage}`
		});
		logger.info(`The tfttoggle has been changed for serverId: ${serverId}`);
	} catch (error) {
		await replyCommandError(interaction, error, 'Failed to change tft toggle, contact the dev');
	}
}

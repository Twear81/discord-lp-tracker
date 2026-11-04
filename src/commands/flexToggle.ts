import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits } from 'discord.js';
import { updateFlexToggleServer } from '../database/databaseHelper';
import { replyCommandError } from './commandError';
import logger from '../logger/logger';

export const data = new SlashCommandBuilder()
	.setName('flextoggle')
	.setContexts(InteractionContextType.Guild)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.setDescription('Whether or not the flex games are tracked!')
	.addBooleanOption(option =>
		option.setName('flextoggle')
			.setDescription('Whether or not the flex games are tracked')
			.setRequired(true)
	);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	try {
		const serverId = interaction.guildId as string;
		const flexToggle = interaction.options.getBoolean('flextoggle')!;

		await updateFlexToggleServer(serverId, flexToggle);

		const flexMessage = flexToggle === true
			? 'will watch for flex game'
			: 'will not watch for flex game';

		await interaction.reply({
			content: `The bot ${flexMessage}`,
			flags: MessageFlags.Ephemeral,
		});
		logger.info(`The flextoggle has been changed for serverId: ${serverId}`);
	} catch (error) {
		await replyCommandError(interaction, error, 'Failed to change flex toggle, contact the dev');
	}
}

import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits } from 'discord.js';
import { updateFlexToggleServer } from '../database/databaseHelper';
import { getCommandLang, replyCommandError } from './commandError';
import { getTranslations } from '../translation/translation';
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
	const serverId = interaction.guildId as string;
	const t = getTranslations(await getCommandLang(serverId));
	try {
		const flexToggle = interaction.options.getBoolean('flextoggle')!;

		await updateFlexToggleServer(serverId, flexToggle);

		await interaction.reply({
			content: t.commands.flexToggle(flexToggle),
			flags: MessageFlags.Ephemeral,
		});
		logger.info(`The flextoggle has been changed for serverId: ${serverId}`);
	} catch (error) {
		await replyCommandError(interaction, error, t);
	}
}

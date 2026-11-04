import { ChannelType, SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, InteractionContextType, PermissionFlagsBits } from 'discord.js';
import { addOrUpdateServer } from '../database/databaseHelper';
import logger from '../logger/logger';
import { getTranslations } from '../translation/translation';
import { replyCommandError } from './commandError';

export const data = new SlashCommandBuilder()
	.setName('init')
	.setContexts(InteractionContextType.Guild)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.setDescription('Init the bot for your server!')
	.addChannelOption(option =>
		option.setName('channel')
			.setDescription('The channel to echo into')
			.setRequired(true)
			.addChannelTypes(ChannelType.GuildText)
	)
	.addBooleanOption(option =>
		option.setName('flextoggle')
			.setDescription('Whether or not the flex games are tracked')
			.setRequired(true)
	)
	.addBooleanOption(option =>
		option.setName('tfttoggle')
			.setDescription('Whether or not the tft games are tracked')
			.setRequired(true)
	)
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
	const lang: string = interaction.options.getString('lang', true);
	const t = getTranslations(lang);
	try {
		const serverId: string = interaction.guildId as string;
		const channel = interaction.options.getChannel('channel', true);
		const channelId: string = channel.id;
		const flexToggle: boolean = interaction.options.getBoolean('flextoggle', true);
		const tftToggle: boolean = interaction.options.getBoolean('tfttoggle', true);

		await addOrUpdateServer(serverId, channelId, flexToggle, tftToggle, lang);

		await interaction.reply({
			content: t.commands.init(channel.name ?? channelId, flexToggle, tftToggle),
			flags: MessageFlags.Ephemeral,
		});
		logger.info(`Bot has been setup for serverId: ${serverId}`);
	} catch (error) {
		await replyCommandError(interaction, error, t);
	}
}

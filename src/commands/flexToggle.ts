import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction } from 'discord.js';
import { updateFlexToggleServer } from '../database/databaseHelper';
import { ErrorTypes } from '../error/error';

export const data = new SlashCommandBuilder()
	.setName('flextoggle')
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
		console.log(`The flextoggle has been changed for serverId: ${serverId}`);
	} catch (error) {
		if (error.type === ErrorTypes.SERVER_NOT_INITIALIZE) {
			await interaction.reply({
				content: 'You have to init the bot first',
				flags: MessageFlags.Ephemeral,
			});
		} else {
			console.error('Failed to change flex toggle:', error);
			await interaction.reply({
				content: 'Failed to change flex toggle, contact the dev',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
}

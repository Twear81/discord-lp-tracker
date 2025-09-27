import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction } from 'discord.js';
import { deletePlayer } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import logger from '../logger/logger';

export const data = new SlashCommandBuilder()
	.setName('deleteplayer')
	.setDescription('Delete player to the watch list!')
	.addStringOption(option =>
		option.setName('accountname')
			.setDescription('The account name')
			.setRequired(true)
	)
	.addStringOption(option =>
		option.setName('tag')
			.setDescription('The account tag (after the "#")')
			.setRequired(true)
	)
	.addStringOption(option =>
		option.setName('region')
			.setDescription('Region of the account')
			.setRequired(true)
			.addChoices(
				{ name: 'EUW', value: 'EUW' },
				{ name: 'NA', value: 'NA' }
			)
	);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	try {
		const serverId = interaction.guildId as string;
		logger.info(`Deleting a player for serverId: ${serverId}`);
		const accountname = interaction.options.getString('accountname')!;
		const tag = interaction.options.getString('tag')!;
		const region = interaction.options.getString('region')!;

		await deletePlayer(serverId, accountname, tag, region);

		await interaction.reply({
			content: `The player "${accountname}#${tag}" for region ${region} has been deleted.`,
			flags: MessageFlags.Ephemeral,
		});
		logger.info(`The player ${accountname}#${tag} has been deleted for serverId: ${serverId}`);
	} catch (error: unknown) {
		if (error instanceof AppError) {
			// Inside this block, err is known to be a ValidationError
			if (error.type === ErrorTypes.SERVER_NOT_INITIALIZE) {
				await interaction.reply({
					content: 'You have to init the bot first',
					flags: MessageFlags.Ephemeral,
				});
			} else if (error.type === ErrorTypes.PLAYER_NOT_FOUND) {
				await interaction.reply({
					content: 'Player not found',
					flags: MessageFlags.Ephemeral,
				});
			}
		} else {
			logger.error('Failed to delete the player:', error);
			await interaction.reply({
				content: 'Failed to delete the player, contact the dev',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
}
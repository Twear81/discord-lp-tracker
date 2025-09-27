import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
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
	const serverId = interaction.guildId as string;
	logger.info(`Deleting a player for serverId: ${serverId}`);
	const accountname = interaction.options.getString('accountname')!;
	const tag = interaction.options.getString('tag')!;
	const region = interaction.options.getString('region')!;

	try {
		await interaction.deferReply({ ephemeral: true });

		await deletePlayer(serverId, accountname, tag, region);

		await interaction.editReply({
			content: `The player "${accountname}#${tag}" for region ${region} has been deleted.`
		});
		logger.info(`The player ${accountname}#${tag} has been deleted for serverId: ${serverId}`);
	} catch (error: unknown) {
		let content: string;
        
        if (error instanceof AppError) {
            switch (error.type) {
                case ErrorTypes.SERVER_NOT_INITIALIZE:
                    content = 'You have to init the bot first';
                    break;
                case ErrorTypes.PLAYER_NOT_FOUND:
                    content = 'Player not found';
                    break;
                default:
                    content = 'Failed to delete the player, contact the dev';
                    logger.error('Failed to delete the player:', error);
                    break;
            }
        } else {
            content = 'Failed to delete the player, contact the dev';
            logger.error('Failed to delete the player:', error);
        }

        await interaction.editReply({ content });
	}
}
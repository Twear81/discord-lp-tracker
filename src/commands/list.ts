import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getServer, listAllPlayerForSpecificServer, PlayerInfo } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { getTranslations } from '../translation/translation';
import logger from '../logger/logger';

export const data = new SlashCommandBuilder()
	.setName('list')
	.setDescription('List all players watched!');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	try {
		const serverId = interaction.guildId as string;
		const serverInfo = await getServer(serverId);
		const accountNameTagPlayerList: PlayerInfo[] = await listAllPlayerForSpecificServer(serverId);

		const t = getTranslations(serverInfo.lang).list;

		if (accountNameTagPlayerList.length === 0) {
			await interaction.reply({
				content: t.noPlayers,
				flags: MessageFlags.Ephemeral,
			})
		} else {
			const messageToDisplay = new EmbedBuilder()
				.setTitle(t.title)
				.setColor(0x0099FF)
				.setDescription(
					`${t.description}\n\n` +
					accountNameTagPlayerList.map((acc, index) => t.playerLine(index + 1, `${acc.gameName}#${acc.tagLine}`, acc.region)).join("\n\n")
				)
				.setFooter({ text: t.total(accountNameTagPlayerList.length) })
				.setTimestamp();

			await interaction.reply({
				embeds: [messageToDisplay],
				flags: MessageFlags.Ephemeral,
			});
		}
		logger.info('The list has been demanded');
	} catch (error) {
		if (error instanceof AppError) {
			if (error.type === ErrorTypes.SERVER_NOT_INITIALIZE) {
				await interaction.reply({
					content: 'You have to init the bot first',
					flags: MessageFlags.Ephemeral,
				});
			}
		} else {
			logger.error('Failed to display the list:', error);
			await interaction.reply({
				content: 'Failed to display the list, contact the dev',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
}
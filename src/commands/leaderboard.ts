import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { getServer, listAllPlayerForQueueInfoForSpecificServer, listAllPlayerForSpecificServer, PlayerForQueueInfo, PlayerInfo } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { GameQueueType } from '../tracking/GameQueueType';
import { sortPlayersByRank } from '../tracking/rank';
import { getTranslations } from '../translation/translation';
import logger from '../logger/logger';

export const data = new SlashCommandBuilder()
	.setName('leaderboard')
	.setDescription('Check who is the best from player watched!');

export async function execute(interaction: CommandInteraction): Promise<void> {
	const serverId = interaction.guildId as string;
	try {
		await interaction.deferReply({ ephemeral: true });
		const serverInfo = await getServer(serverId);

		const playerInfoList: PlayerInfo[] = await listAllPlayerForSpecificServer(serverId);

		const playerSortForSoloQ: PlayerForQueueInfo[] = sortPlayersByRank(await listAllPlayerForQueueInfoForSpecificServer(serverId, GameQueueType.RANKED_SOLO_5x5));
		const playerSortForFlex: PlayerForQueueInfo[] = sortPlayersByRank(await listAllPlayerForQueueInfoForSpecificServer(serverId, GameQueueType.RANKED_FLEX_SR));
		const playerSortForClash: PlayerForQueueInfo[] = sortPlayersByRank(await listAllPlayerForQueueInfoForSpecificServer(serverId, GameQueueType.RANKED_CLASH));
		const playerSortFor5v5: PlayerForQueueInfo[] = sortPlayersByRank(await listAllPlayerForQueueInfoForSpecificServer(serverId, GameQueueType.RANKED_5v5));
		const playerSortForTFT: PlayerForQueueInfo[] = sortPlayersByRank(await listAllPlayerForQueueInfoForSpecificServer(serverId, GameQueueType.RANKED_TFT));

		let hasAlreadySentAMessage = false;
		if (serverInfo.flextoggle) {
			await generateLeaderboardMessage(interaction, serverInfo.lang, playerInfoList, playerSortForFlex, GameQueueType.RANKED_FLEX_SR, hasAlreadySentAMessage);
			hasAlreadySentAMessage = true;
		}
		await generateLeaderboardMessage(interaction, serverInfo.lang, playerInfoList, playerSortForClash, GameQueueType.RANKED_CLASH, hasAlreadySentAMessage);
		hasAlreadySentAMessage = true;
		await generateLeaderboardMessage(interaction, serverInfo.lang, playerInfoList, playerSortFor5v5, GameQueueType.RANKED_5v5, hasAlreadySentAMessage);
		hasAlreadySentAMessage = true;
		if (serverInfo.tfttoggle) {
			await generateLeaderboardMessage(interaction, serverInfo.lang, playerInfoList, playerSortForTFT, GameQueueType.RANKED_TFT, hasAlreadySentAMessage);
			hasAlreadySentAMessage = true;
		}
		await generateLeaderboardMessage(interaction, serverInfo.lang, playerInfoList, playerSortForSoloQ, GameQueueType.RANKED_SOLO_5x5, hasAlreadySentAMessage);
		logger.info('The leaderboard has been demanded');
	} catch (error) {
		if (error instanceof AppError) {
			if (error.type === ErrorTypes.SERVER_NOT_INITIALIZE) {
				await interaction.editReply({
					content: 'You have to init the bot first',
				});
			}
		} else {
			logger.error('Failed to display the leaderboard:', error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: 'Failed to display the leaderboard, contact the dev',
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await interaction.reply({
					content: 'Failed to display the leaderboard, contact the dev',
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	}
}

enum QueueColor {
	RANKED_SOLO_5x5 = 0x0099FF, // Bleu for SoloQ
	RANKED_FLEX_SR = 0xFFD700,  // Gold for Flex
	RANKED_CLASH = 0xE74C3C,    // Red for Clash
	RANKED_5v5 = 0x2ECC71,      // Green for 5v5
	RANKED_TFT = 0x8A2BE2       // Purple for TFT
}

const generateLeaderboardMessage = async (interaction: CommandInteraction, lang: string, playersInfos: PlayerInfo[], sortedPlayerForQueueInfos: PlayerForQueueInfo[], queueType: GameQueueType, isSecondMessage: boolean) => {
	const t = getTranslations(lang);

	if (sortedPlayerForQueueInfos.length === 0) {
		return interaction.editReply({ content: t.leaderboard.noPlayers });
	}

	// Join queue rows onto Player rows via a Map; skip (with a warning) any
	// queue row whose Player no longer exists instead of crashing on a
	// non-null assertion.
	const playersById = new Map(playersInfos.map(player => [player.id, player]));
	let rankIndex = 0;
	const playerLines = sortedPlayerForQueueInfos.flatMap(player => {
		const playerInfo = playersById.get(player.playerId);
		if (!playerInfo) {
			logger.warn(`No Player row for playerId ${player.playerId}, skipping its leaderboard entry.`);
			return [];
		}
		rankIndex += 1;
		return [t.leaderboard.playerLine(
			rankIndex,
			playerInfo.gameName,
			playerInfo.tagLine,
			playerInfo.region,
			player.currentRank!,
			player.currentTier!,
			player.currentLP!
		)];
	}).join("\n\n");

	const messageToDisplay = new EmbedBuilder()
		.setTitle(t.leaderboardTitles[queueType])
		.setColor(QueueColor[queueType as keyof typeof QueueColor] || 0xFFFFFF) // default to white
		.setDescription(
			`${t.leaderboard.description}\n\n${playerLines}`
		)
		.setFooter({ text: t.leaderboard.total(sortedPlayerForQueueInfos.length) })
		.setTimestamp();

	if (isSecondMessage) {
		await interaction.followUp({
			embeds: [messageToDisplay],
			flags: MessageFlags.Ephemeral,
		});
	} else {
		await interaction.editReply({
			embeds: [messageToDisplay],
		});
	}

}
import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, MessageFlags } from 'discord.js';
import { addPlayer, getPlayerForSpecificServer, updatePlayerInfoCurrentAndLastForQueueType, updatePlayerLastGameId } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { replyCommandError } from './commandError';
import { getLastRankedLeagueMatch, getLastTFTMatch, getPlayerRankInfo, getSummonerByName, getTFTPlayerRankInfo, getTFTSummonerByName } from '../riot';
import { GameQueueType, ManagedGameQueueType } from '../tracking/GameQueueType';
import logger from '../logger/logger';

const API_ERROR_MESSAGE = 'The player was not found. Please check the name and tag.';
const GENERIC_ERROR_MESSAGE = 'Failed to add the player, contact the dev.';
const NOT_FOUND_ERROR = 'Not Found';

export const data = new SlashCommandBuilder()
	.setName('addplayer')
	.setContexts(InteractionContextType.Guild)
	.setDescription('Add player to the watch list!')
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
	logger.info(`Adding a player for serverId: ${serverId}`);
	const accountname = interaction.options.getString('accountname')!;
	const tag = interaction.options.getString('tag')!;
	const region = interaction.options.getString('region')!;
	try {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		// LoL and TFT account lookups hit different keys → fire in parallel.
		const [summoner, summonerTFT] = await Promise.all([
			getSummonerByName(accountname, tag, region),
			getTFTSummonerByName(accountname, tag, region),
		]);
		// `summonerTFT?.puuid` covers both the (rare) case of a malformed Riot
		// response where `summonerTFT` is null/undefined, and a puuid field
		// that came back as an empty string. The TS type of `summonerTFT` is
		// non-nullable but the runtime value is not formally guaranteed.
		if (!summoner.puuid || !summonerTFT?.puuid) {
			throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, NOT_FOUND_ERROR);
		}

		await addPlayer(serverId, summoner.puuid, summonerTFT.puuid, summoner.gameName!, summoner.tagLine!, region);

		// Both rank endpoints are independent → fire in parallel.
		const [playerRankInfos, playerRankInfosTFT] = await Promise.all([
			getPlayerRankInfo(summoner.puuid, region),
			getTFTPlayerRankInfo(summonerTFT.puuid, region),
		]);

		const currentPlayer = await getPlayerForSpecificServer(serverId, summoner.puuid);

		// Build the list of rank-update promises up front; each entry is an
		// independent DB write on a different queue row, so they can run
		// concurrently. We use allSettled to keep the previous behaviour
		// (a single failing rank doesn't abort the whole command).
		const rankUpdates: Promise<unknown>[] = [];
		for (const playerRankStat of playerRankInfos) {
			if (playerRankStat.queueType in GameQueueType) {
				rankUpdates.push(updatePlayerInfoCurrentAndLastForQueueType(
					serverId,
					currentPlayer.puuid,
					GameQueueType[playerRankStat.queueType as keyof typeof GameQueueType],
					playerRankStat.leaguePoints,
					playerRankStat.rank,
					playerRankStat.tier,
				));
			} else {
				logger.warn(playerRankStat.queueType + ' was not a know queue type.');
			}
		}
		for (const playerRankStat of playerRankInfosTFT) {
			if (playerRankStat.queueType in GameQueueType) {
				rankUpdates.push(updatePlayerInfoCurrentAndLastForQueueType(
					serverId,
					currentPlayer.tftpuuid,
					GameQueueType[playerRankStat.queueType as keyof typeof GameQueueType],
					playerRankStat.leaguePoints || 0,
					playerRankStat.rank || "",
					playerRankStat.tier || "Unranked",
				));
			} else {
				logger.warn(playerRankStat.queueType + ' was not a know queue type.');
			}
		}
		await Promise.allSettled(rankUpdates);

		// Last-match lookups for LoL and TFT are independent.
		const [leagueMatchIds, tftMatchIds] = await Promise.all([
			getLastRankedLeagueMatch(currentPlayer.puuid, currentPlayer.region),
			getLastTFTMatch(currentPlayer.tftpuuid, currentPlayer.region),
		]);
		const currentLeagueGameIdWithRegion = leagueMatchIds[0] ?? null; // example -> EUW1_7294524077
		const currentTFTGameIdWithRegion = tftMatchIds[0] ?? null; // example -> EUW1_7294524077

		// Both last-game writes are independent.
		await Promise.all([
			updatePlayerLastGameId(serverId, currentPlayer.puuid, currentLeagueGameIdWithRegion, ManagedGameQueueType.LEAGUE),
			updatePlayerLastGameId(serverId, currentPlayer.tftpuuid, currentTFTGameIdWithRegion, ManagedGameQueueType.TFT),
		]);

		await interaction.editReply({
			content: `The player "${accountname}#${tag}" for region ${region} has been added.`
		});
		logger.info(`The player ${accountname}#${tag} has been added for serverId: ${serverId}`);
	} catch (error: unknown) {
		await replyCommandError(interaction, error, GENERIC_ERROR_MESSAGE, {
			[ErrorTypes.DATABASE_ALREADY_INSIDE]: 'Player already added',
			[ErrorTypes.PLAYER_NOT_FOUND]: API_ERROR_MESSAGE,
		});
	}
}

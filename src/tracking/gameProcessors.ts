import { TextChannel } from 'discord.js';
import { updatePlayerLastGameId, updatePlayerCurrentOrLastDayRank, PlayerInfo, updatePlayerLastDayWinLose, getPlayerForQueueInfoForSpecificServer, ServerInfo, saveTFTGameToDatabase, saveLeagueGameToDatabase } from '../database/databaseHelper';
import { getLeagueGameDetailForCurrentPlayer, getLastRankedLeagueMatch, getLastTFTMatch, getPlayerRankInfo, getTFTGameDetailForCurrentPlayer, getTFTPlayerRankInfo, PlayerTFTGameInfo, PlayerLeagueGameInfo } from '../riot';
import { client } from '../index';
import { GameQueueType, ManagedGameQueueType } from './GameQueueType';
import { sendLeagueGameResultMessage, sendTFTGameResultMessage } from './sendMessage';
import { calculateLPDifference, isGameDurationValid, isTimestampInRecapRange } from './util';
import logger from '../logger/logger';
import { AppError, ErrorTypes } from '../error/error';

async function handleNewLeagueGame(server: ServerInfo, player: PlayerInfo, matchId: string, firstRun: boolean): Promise<void> {
	logger.info(`➡️ [League] New match ${matchId} found for player ${player.gameName}#${player.tagLine} on server ${server.serverid}.`);

	// 1. Fetch game and rank details
	let gameDetails: PlayerLeagueGameInfo;
	try {
		gameDetails = await getLeagueGameDetailForCurrentPlayer(player.puuid, matchId, player.region, server.lang);
	} catch (error) {
		if (error instanceof AppError && error.type === ErrorTypes.GAMEDETAIL_NOT_FOUND && error.message.includes("Queue type not found")) {
			// Match is not in one of our tracked queues (SoloQ/Flex/Clash/5v5). Just update lastGameID so we don't re-check it.
			logger.info(`[League] Skipping non-tracked queue match ${matchId} for player ${player.gameName}.`);
			await updatePlayerLastGameId(server.serverid, player.puuid, matchId, ManagedGameQueueType.LEAGUE);
			return;
		}
		throw error;
	}

	// 2. If the match is Flex and the server has Flex tracking disabled, skip it
	if (gameDetails.queueType === GameQueueType.RANKED_FLEX_SR && !server.flextoggle) {
		logger.info(`[League] Skipping Flex match ${matchId} for player ${player.gameName} (server flextoggle is off).`);
		await updatePlayerLastGameId(server.serverid, player.puuid, matchId, ManagedGameQueueType.LEAGUE);
		return;
	}

	// 2b. Skip remakes / cancelled games (shorter than MIN_GAME_DURATION_SECONDS)
	if (!isGameDurationValid(gameDetails.gameDurationSeconds)) {
		logger.info(`[League] Skipping remake/cancelled match ${matchId} for player ${player.gameName} (${gameDetails.gameDurationSeconds}s).`);
		await updatePlayerLastGameId(server.serverid, player.puuid, matchId, ManagedGameQueueType.LEAGUE);
		return;
	}

	const playerRankStats = await getPlayerRankInfo(player.puuid, player.region);

	// 2. Update database
	if (isTimestampInRecapRange(gameDetails.gameEndTimestamp)) {
		await updatePlayerLastDayWinLose(server.serverid, player.puuid, gameDetails.queueType, gameDetails.win);
	}

	const rankStat = playerRankStats.find(r => r.queueType === gameDetails.queueType);
	if (rankStat) {
		await updatePlayerCurrentOrLastDayRank(server.serverid, player.puuid, true, rankStat.queueType as GameQueueType, rankStat.leaguePoints, rankStat.rank, rankStat.tier);
	}

	await updatePlayerLastGameId(server.serverid, player.puuid, matchId, ManagedGameQueueType.LEAGUE);
	logger.info(`[League] DB updated for player ${player.gameName} with match ${matchId}.`);

	// 3. Send notification if not the first run
	if (firstRun) {
		logger.info(`[League] First run: skipping notification for ${player.gameName}.`);
		return;
	}

	const channel = await client.channels.fetch(server.channelid) as TextChannel;
	if (!channel) {
		logger.error(`❌ [League] Failed to find channel with ID ${server.channelid} for server ${server.serverid}.`);
		return;
	}

	const playerQueueInfo = await getPlayerForQueueInfoForSpecificServer(server.serverid, player.puuid, gameDetails.queueType);

	const { currentRank, currentTier, currentLP, oldRank, oldTier, oldLP } = playerQueueInfo;
	let lpGain = 0;
	if (currentRank != null && oldRank != null) {
		lpGain = calculateLPDifference(oldRank, currentRank, oldTier!, currentTier!, oldLP!, currentLP!);
	} else {
		logger.warn("Can't calculateRRDifference because there is a null info");
	}

	// Save game details to database for monthly recap
	await saveLeagueGameToDatabase(
		playerQueueInfo,
		gameDetails,
		matchId
	);

	await sendLeagueGameResultMessage(
		channel,
		player.gameName,
		player.tagLine,
		gameDetails,
		currentRank ?? '',
		currentTier ?? 'Unranked',
		lpGain,
		currentLP ?? 0,
		player.region,
		matchId,
		gameDetails.customMessage,
		server.lang
	);
	logger.info(`✅ [League] Notification sent to channel ${channel.id} for player ${player.gameName}.`);
}

async function handleNewTFTGame(server: ServerInfo, player: PlayerInfo, matchId: string, firstRun: boolean): Promise<void> {
	logger.info(`➡️ [TFT] New match ${matchId} found for player ${player.gameName}#${player.tagLine} on server ${server.serverid}.`);

	// 1. Fetch game details and validate queue type
	let gameDetails: PlayerTFTGameInfo;

	try {
		gameDetails = await getTFTGameDetailForCurrentPlayer(player.tftpuuid, matchId, player.region, server.lang);
	} catch (error) {
		if (error instanceof AppError && error.type === ErrorTypes.GAMEDETAIL_NOT_FOUND && error.message.includes("TFT Queue type not found")) {
			logger.info(`[TFT] Skipping non-tracked queue match ${matchId} for player ${player.gameName} (Queue ID not recognized).`);
			return;
		}
		throw error;
	}

	// 2. Skip remakes / cancelled games (shorter than MIN_GAME_DURATION_SECONDS)
	if (!isGameDurationValid(gameDetails.gameDurationSeconds)) {
		logger.info(`[TFT] Skipping remake/cancelled match ${matchId} for player ${player.gameName} (${gameDetails.gameDurationSeconds}s).`);
		await updatePlayerLastGameId(server.serverid, player.tftpuuid, matchId, ManagedGameQueueType.TFT);
		return;
	}

	// 3. Update database
	const playerRankStats = await getTFTPlayerRankInfo(player.tftpuuid, player.region);
	if (isTimestampInRecapRange(gameDetails.gameEndTimestamp)) {
		await updatePlayerLastDayWinLose(server.serverid, player.tftpuuid, gameDetails.queueType, gameDetails.win);
	}

	const rankStat = playerRankStats.find(r => r.queueType === gameDetails.queueType);
	if (rankStat) {
		await updatePlayerCurrentOrLastDayRank(server.serverid, player.tftpuuid, true, rankStat.queueType as GameQueueType, rankStat.leaguePoints!, rankStat.rank!, rankStat.tier!);
	}

	await updatePlayerLastGameId(server.serverid, player.tftpuuid, matchId, ManagedGameQueueType.TFT);
	logger.info(`[TFT] DB updated for player ${player.gameName} with match ${matchId}.`);

	// 3. Send notification
	if (firstRun) {
		logger.info(`[TFT] First run: skipping notification for ${player.gameName}.`);
		return;
	}

	const channel = await client.channels.fetch(server.channelid) as TextChannel;
	if (!channel) {
		logger.error(`❌ [TFT] Failed to find channel with ID ${server.channelid} for server ${server.serverid}.`);
		return;
	}

	const playerQueueInfo = await getPlayerForQueueInfoForSpecificServer(server.serverid, player.tftpuuid, gameDetails.queueType);
	const { currentRank, currentTier, currentLP, oldRank, oldTier, oldLP } = playerQueueInfo;
	let lpGain = 0;
	if (currentRank != null && oldRank != null) {
		lpGain = calculateLPDifference(oldRank, currentRank, oldTier!, currentTier!, oldLP!, currentLP!);
	} else {
		logger.warn("Can't calculateRRDifference because there is a null info");
	}

	// Save game details to database for monthly recap
	await saveTFTGameToDatabase(
		playerQueueInfo,
		gameDetails,
		matchId
	);

	await sendTFTGameResultMessage(
		channel,
		player.gameName,
		player.tagLine,
		gameDetails,
		currentRank ?? '',
		currentTier ?? 'Unranked',
		lpGain,
		currentLP ?? 0,
		player.region,
		matchId,
		gameDetails.customMessage,
		server.lang
	);
	logger.info(`✅ [TFT] Notification sent to channel ${channel.id} for player ${player.gameName}.`);
}

interface GameProcessor {
	gameName: 'League' | 'TFT';
	isEnabled(server: ServerInfo): boolean;
	getPUUID(player: PlayerInfo): string;
	getLastGameId(player: PlayerInfo): string | null;
	getLastMatches(puuid: string, region: string): Promise<string[]>;
	handleNewGame(server: ServerInfo, player: PlayerInfo, matchId: string, firstRun: boolean): Promise<void>;
}

export const leagueGameProcessor: GameProcessor = {
	gameName: 'League',
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	isEnabled: (server) => true, // Always active
	getPUUID: (player) => player.puuid,
	getLastGameId: (player) => player.lastGameID,
	// Single API call: fetch the player's most recent match (any type).
	// We then check its queueId against our tracked queues (SoloQ, Flex, Clash, 5v5) in handleNewLeagueGame.
	getLastMatches: (puuid, region) => getLastRankedLeagueMatch(puuid, region),
	handleNewGame: handleNewLeagueGame,
};

export const tftGameProcessor: GameProcessor = {
	gameName: 'TFT',
	isEnabled: (server) => server.tfttoggle,
	getPUUID: (player) => player.tftpuuid,
	getLastGameId: (player) => player.lastTFTGameID,
	getLastMatches: (puuid, region) => getLastTFTMatch(puuid, region),
	handleNewGame: handleNewTFTGame,
};

export async function processGameType(server: ServerInfo, players: PlayerInfo[], processor: GameProcessor, firstRun: boolean): Promise<void> {
	if (!processor.isEnabled(server)) {
		return;
	}
	logger.info(`ℹ️ Starting ${processor.gameName} tracking for server ${server.serverid}...`);

	const matchRequests = players.map(player => {
		const puuid = processor.getPUUID(player);
		if (!puuid) {
			return Promise.resolve({ player, matchIds: [] });
		}
		return processor.getLastMatches(puuid, player.region)
			.then(matchIds => ({ player, matchIds }))
			.catch(error => {
				logger.error(`❌ Failed to fetch ${processor.gameName} matches for ${player.gameName}:`, error);
				return { player, matchIds: [] }; // Return empty result to not block others
			});
	});

	const results = await Promise.all(matchRequests);

	for (const result of results) {
		const { player, matchIds } = result;
		if (matchIds.length === 0) continue;

		const latestMatchId = matchIds[0];
		const lastGameIdInDb = processor.getLastGameId(player);

		if (latestMatchId !== lastGameIdInDb) {
			try {
				await processor.handleNewGame(server, player, latestMatchId, firstRun);
			} catch (error) {
				logger.error(`❌❌ Critical error processing ${processor.gameName} match ${latestMatchId} for player ${player.gameName}:`, error);
			}
		}
	}
}


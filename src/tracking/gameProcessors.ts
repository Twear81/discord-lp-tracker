import { TextChannel } from 'discord.js';
import { updatePlayerLastGameId, updatePlayerCurrentOrLastDayRank, PlayerInfo, updatePlayerLastDayWinLose, getPlayerForQueueInfoForSpecificServer, ServerInfo, saveTFTGameToDatabase, saveLeagueGameToDatabase, PlayerForQueueInfo } from '../database/databaseHelper';
import { getLeagueGameDetailForCurrentPlayer, getLastRankedLeagueMatch, getLastTFTMatch, getPlayerRankInfo, getTFTGameDetailForCurrentPlayer, getTFTPlayerRankInfo, PlayerTFTGameInfo, PlayerLeagueGameInfo } from '../riot';
import { client } from '../index';
import { GameQueueType, ManagedGameQueueType } from './GameQueueType';
import { sendLeagueGameResultMessage, sendTFTGameResultMessage } from './sendMessage';
import { getLPGainFromSnapshot, isGameDurationValid, isTimestampInRecapRange } from './util';
import logger from '../logger/logger';
import { AppError, ErrorTypes } from '../error/error';

// What the shared flow needs from a League or TFT game.
interface TrackedGame {
	queueType: GameQueueType;
	gameDurationSeconds: number;
	gameEndTimestamp: number;
	win: boolean;
	customMessage: string | undefined;
}

// League-V4 and TFT-League entries (TFT fields are optional in twisted).
interface RankEntry {
	queueType: string;
	leaguePoints?: number;
	rank?: string;
	tier?: string;
}

type ResultSender<TGame> = (channel: TextChannel, gameName: string, tagline: string, game: TGame, rank: string, tier: string, lpChange: number, updatedLP: number, region: string, matchId: string, customMessage: string | undefined, lang: string) => Promise<void>;

// Everything that differs between League and TFT; the flow itself lives in
// handleNewGame and processGameType.
interface GameProcessor<TGame extends TrackedGame> {
	gameName: 'League' | 'TFT';
	managedQueueType: ManagedGameQueueType;
	getPUUID(player: PlayerInfo): string;
	getLastGameId(player: PlayerInfo): string | null;
	getLastMatches(puuid: string, region: string): Promise<string[]>;
	// Throws AppError(UNTRACKED_QUEUE) for matches outside the tracked queues.
	fetchGame(puuid: string, matchId: string, region: string, lang: string): Promise<TGame>;
	isQueueEnabled(server: ServerInfo, queueType: GameQueueType): boolean;
	fetchRanks(puuid: string, region: string): Promise<RankEntry[]>;
	saveGame(playerQueueInfo: PlayerForQueueInfo, game: TGame, matchId: string, lpGain: number): Promise<void>;
	sendResult: ResultSender<TGame>;
}

export const leagueGameProcessor: GameProcessor<PlayerLeagueGameInfo> = {
	gameName: 'League',
	managedQueueType: ManagedGameQueueType.LEAGUE,
	getPUUID: (player) => player.puuid,
	getLastGameId: (player) => player.lastGameID,
	// Single API call: fetch the player's most recent match (any type). Its
	// queueId is then checked against the tracked queues in fetchGame.
	getLastMatches: (puuid, region) => getLastRankedLeagueMatch(puuid, region),
	fetchGame: getLeagueGameDetailForCurrentPlayer,
	// SoloQ, Clash and Ranked 5v5 are always tracked; Flex follows the server toggle.
	isQueueEnabled: (server, queueType) => queueType !== GameQueueType.RANKED_FLEX_SR || server.flextoggle,
	fetchRanks: getPlayerRankInfo,
	saveGame: saveLeagueGameToDatabase,
	sendResult: sendLeagueGameResultMessage,
};

export const tftGameProcessor: GameProcessor<PlayerTFTGameInfo> = {
	gameName: 'TFT',
	managedQueueType: ManagedGameQueueType.TFT,
	getPUUID: (player) => player.tftpuuid,
	getLastGameId: (player) => player.lastTFTGameID,
	getLastMatches: (puuid, region) => getLastTFTMatch(puuid, region),
	fetchGame: getTFTGameDetailForCurrentPlayer,
	// The TFT processor only runs on servers with tfttoggle on (trackPlayers).
	isQueueEnabled: () => true,
	fetchRanks: getTFTPlayerRankInfo,
	saveGame: saveTFTGameToDatabase,
	sendResult: sendTFTGameResultMessage,
};

async function handleNewGame<TGame extends TrackedGame>(processor: GameProcessor<TGame>, server: ServerInfo, player: PlayerInfo, matchId: string, firstRun: boolean): Promise<void> {
	const tag = `[${processor.gameName}]`;
	const puuid = processor.getPUUID(player);
	logger.info(`➡️ ${tag} New match ${matchId} found for player ${player.gameName}#${player.tagLine} on server ${server.serverid}.`);

	// Remember the match so the next cycles don't process it again.
	const markAsProcessed = () => updatePlayerLastGameId(server.serverid, puuid, matchId, processor.managedQueueType);

	// 1. Fetch the game, skipping the ones we don't report
	let game: TGame;
	try {
		game = await processor.fetchGame(puuid, matchId, player.region, server.lang);
	} catch (error) {
		if (error instanceof AppError && error.type === ErrorTypes.UNTRACKED_QUEUE) {
			logger.info(`${tag} Skipping non-tracked queue match ${matchId} for player ${player.gameName}.`);
			await markAsProcessed();
			return;
		}
		throw error;
	}

	if (!processor.isQueueEnabled(server, game.queueType)) {
		logger.info(`${tag} Skipping ${game.queueType} match ${matchId} for player ${player.gameName} (disabled on this server).`);
		await markAsProcessed();
		return;
	}

	// Remakes / cancelled games (shorter than MIN_GAME_DURATION_SECONDS)
	if (!isGameDurationValid(game.gameDurationSeconds)) {
		logger.info(`${tag} Skipping remake/cancelled match ${matchId} for player ${player.gameName} (${game.gameDurationSeconds}s).`);
		await markAsProcessed();
		return;
	}

	// 2. Update the daily counters and the rank
	const rankStats = await processor.fetchRanks(puuid, player.region);

	if (isTimestampInRecapRange(game.gameEndTimestamp)) {
		await updatePlayerLastDayWinLose(server.serverid, puuid, game.queueType, game.win);
	}

	const rankStat = rankStats.find(r => r.queueType === game.queueType);
	if (rankStat) {
		await updatePlayerCurrentOrLastDayRank(server.serverid, puuid, true, game.queueType, rankStat.leaguePoints!, rankStat.rank!, rankStat.tier!);
	}

	await markAsProcessed();
	logger.info(`${tag} DB updated for player ${player.gameName} with match ${matchId}.`);

	const playerQueueInfo = await getPlayerForQueueInfoForSpecificServer(server.serverid, puuid, game.queueType);
	const lpGain = getLPGainFromSnapshot(playerQueueInfo);
	if (lpGain === null) {
		logger.warn(`${tag} Can't compute the LP gain of match ${matchId}: missing rank before or after.`);
	}

	// 3. Save the game for the monthly recap — before the first-run / channel
	// checks below, so a game detected at startup or on a server whose channel
	// was deleted still counts.
	await processor.saveGame(playerQueueInfo, game, matchId, lpGain ?? 0);

	// 4. Notify
	if (firstRun) {
		logger.info(`${tag} First run: skipping notification for ${player.gameName}.`);
		return;
	}

	// channels.fetch() throws (Unknown Channel) instead of returning null when
	// the channel was deleted — bail out of this notification only.
	let channel: TextChannel;
	try {
		channel = await client.channels.fetch(server.channelid) as TextChannel;
	} catch (error) {
		logger.error(`❌ ${tag} Failed to find channel with ID ${server.channelid} for server ${server.serverid}.`, error);
		return;
	}

	await processor.sendResult(
		channel,
		player.gameName,
		player.tagLine,
		game,
		playerQueueInfo.currentRank ?? '',
		playerQueueInfo.currentTier ?? 'Unranked',
		lpGain ?? 0,
		playerQueueInfo.currentLP ?? 0,
		player.region,
		matchId,
		game.customMessage,
		server.lang,
	);
	logger.info(`✅ ${tag} Notification sent to channel ${channel.id} for player ${player.gameName}.`);
}

export async function processGameType<TGame extends TrackedGame>(server: ServerInfo, players: PlayerInfo[], processor: GameProcessor<TGame>, firstRun: boolean): Promise<void> {
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
				await handleNewGame(processor, server, player, latestMatchId, firstRun);
			} catch (error) {
				logger.error(`❌❌ Critical error processing ${processor.gameName} match ${latestMatchId} for player ${player.gameName}:`, error);
			}
		}
	}
}

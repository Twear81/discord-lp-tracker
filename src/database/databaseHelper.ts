import { DoubleTFT, FlexQ, Player, ClashQ, Ranked5v5, SoloQ, SoloTFT } from './playerModel';
import { Server } from './serverModel';
import { LeagueGame, TFTGame } from './gameModel';
import { AppError, ErrorTypes } from '../error/error';
import { Model, Op } from 'sequelize';
import { GameQueueType, ManagedGameQueueType } from '../tracking/GameQueueType';
import { PlayerLeagueGameInfo, PlayerTFTGameInfo } from '../riot';
import logger from '../logger/logger';
import { calculateLPDifference, MIN_GAME_DURATION_SECONDS } from '../tracking/util';

// SERVER PART
export const addOrUpdateServer = async (serverId: string, channelId: string, flexToggle: boolean, tftToggle: boolean, lang: string): Promise<void> => {
	try {
		const existingServer = await Server.findOne({ where: { serverid: serverId } });
		if (existingServer) {
			await existingServer.update({ channelid: channelId, flextoggle: flexToggle, tfttoggle: tftToggle, tftdoubletoggle: false, lang: lang });
			logger.info(`The server ${serverId} has been updated`);
		} else {
			await Server.create({ serverid: serverId, channelid: channelId, flextoggle: flexToggle, tfttoggle: tftToggle, tftdoubletoggle: false, lang: lang });
			logger.info(`The server ${serverId} has been added`);
		}
	} catch (error) {
		logger.error(`❌ Failed to add or update the database for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to add or update the lang');
	}
};

export const updateLangServer = async (serverId: string, lang: string): Promise<void> => {
	const existingServer = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	await existingServer.update({ lang });
	logger.info(`The language has been set to ${lang} for server ${serverId}`);
};

export const updateFlexToggleServer = async (serverId: string, flexToggle: boolean): Promise<void> => {
	const existingServer = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	await existingServer.update({ flextoggle: flexToggle });
	logger.info(`The flex queue watch has been set to ${flexToggle} for server ${serverId}`);
};

export const updateTFTToggleServer = async (serverId: string, tftToggle: boolean): Promise<void> => {
	const existingServer = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	await existingServer.update({ tfttoggle: tftToggle });
	logger.info(`The TFT queue watch has been set to ${tftToggle} for server ${serverId}`);
};

export const getLangServer = async (serverId: string): Promise<string> => {
	const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });

	let lang = 'en';

	if (existingServer) {
		lang = existingServer.dataValues.lang;
	} else {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not initialize');
	}
	return lang;
};

export const getAllServer = async (): Promise<ServerInfo[]> => {
	try {
		const servers = await Server.findAll();
		const result: ServerInfo[] = servers.map(server => server.dataValues);
		return result;
	} catch (error) {
		logger.error('❌ Failed to list servers :', error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to list servers');
	}
};

export const getServer = async (serverId: string): Promise<ServerInfo> => {
	try {
		const server = await Server.findOne({ where: { serverid: serverId } });
		if (server != null) {
			const result: ServerInfo = server.dataValues;
			return result;
		}
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not initialize');
	} catch (error) {
		logger.error('❌ Failed to list servers :', error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to list servers');
	}
};

export const deleteServer = async (serverId: string): Promise<void> => {
	const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		logger.info(`No server found to delete for serverid: ${serverId} (already cleaned up)`);
		return;
	}

	await Server.destroy({ where: { serverid: serverId } });
};

// PLAYER PART

// Resolve the Player row by LoL puuid first, then by TFT puuid — the
// tracking layer passes whichever puuid it knows. The Server.findOne
// pre-check that used to precede this lookup in every helper was dropped:
// players are always listed from an existing Server row, and the commands
// that care surface SERVER_NOT_INITIALIZE via getServer()/getLangServer().
const findPlayerByPuuid = async (serverId: string, puuid: string): Promise<Model> => {
	let existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });
	if (existingPlayer == null) {
		// TFT puuid
		existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
	}
	if (existingPlayer == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
	}
	return existingPlayer;
};

export const addPlayer = async (serverId: string, puuid: string, tftpuuid: string, accountName: string, tag: string, region: string): Promise<void> => {
	const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	const existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid, tftpuuid: tftpuuid } });
	if (existingPlayer != null) {
		throw new AppError(ErrorTypes.DATABASE_ALREADY_INSIDE, 'Player already exists');
	}

	const player = await Player.create({ serverid: serverId, puuid: puuid, tftpuuid: tftpuuid, gameName: accountName, tagLine: tag, region: region });
	// Create all sub table entry
	await SoloQ.create({ playerId: player.dataValues.id, puuid: player.dataValues.puuid });
	await FlexQ.create({ playerId: player.dataValues.id, puuid: player.dataValues.puuid });
	await ClashQ.create({ playerId: player.dataValues.id, puuid: player.dataValues.puuid });
	await Ranked5v5.create({ playerId: player.dataValues.id, puuid: player.dataValues.puuid });
	await SoloTFT.create({ playerId: player.dataValues.id, puuid: player.dataValues.tftpuuid });
	await DoubleTFT.create({ playerId: player.dataValues.id, puuid: player.dataValues.tftpuuid });
};

export const deletePlayer = async (serverId: string, accountName: string, tag: string, region: string): Promise<void> => {
	const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	const existingPlayer: Model | null = await Player.findOne({
		where: {
			serverid: serverId,
			gameName: accountName,
			tagLine: tag,
			region: region,
		},
	});
	if (existingPlayer == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
	}

	const puuid = existingPlayer.dataValues.puuid;
	await Player.destroy({
		where: {
			serverid: serverId,
			puuid: puuid,
		},
	});
};

export const deleteAllPlayersOfServer = async (serverId: string): Promise<void> => {
	const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		logger.info(`No server row for serverid ${serverId}, skipping player cleanup`);
		return;
	}

	await Player.destroy({ where: { serverid: serverId } });
};

export const updatePlayerLastGameId = async (serverId: string, puuid: string, lastGameID: string | null, managedGameQueueType: ManagedGameQueueType): Promise<void> => {
	const existingPlayer = await findPlayerByPuuid(serverId, puuid);

	if (managedGameQueueType === ManagedGameQueueType.LEAGUE) {
		await existingPlayer.update({ lastGameID: lastGameID });
	} else if (managedGameQueueType === ManagedGameQueueType.TFT) {
		await existingPlayer.update({ lastTFTGameID: lastGameID });
	} else {
		throw new AppError(ErrorTypes.MANAGEDGAMEQUEUE_NOT_FOUND, 'ManagedGameQueueType not found');
	}
};

export const updatePlayerGameNameAndTagLine = async (serverId: string, puuid: string, gameName: string, tagLine: string): Promise<void> => {
	const existingPlayer = await findPlayerByPuuid(serverId, puuid);

	if (existingPlayer.dataValues.gameName !== gameName || existingPlayer.dataValues.tagLine !== tagLine) {
		await existingPlayer.update({
			gameName: gameName,
			tagLine: tagLine,
		});
	}
};

export const updatePlayerCurrentOrLastDayRank = async (serverId: string, puuid: string, isCurrent: boolean, queueType: GameQueueType, leaguePoints: number, rank: string, tier: string): Promise<void> => {
	const existingPlayer = await findPlayerByPuuid(serverId, puuid);
	const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
	await updatePlayerRank(playerToUpdate, isCurrent, rank, tier, leaguePoints);
};

// One model per tracked queue type — shared by the row lookups, the daily
// reset and the batched list helpers below.
const QUEUE_MODELS: Record<GameQueueType, typeof SoloQ> = {
	[GameQueueType.RANKED_FLEX_SR]: FlexQ,
	[GameQueueType.RANKED_SOLO_5x5]: SoloQ,
	[GameQueueType.RANKED_CLASH]: ClashQ,
	[GameQueueType.RANKED_5v5]: Ranked5v5,
	[GameQueueType.RANKED_TFT]: SoloTFT,
	[GameQueueType.RANKED_TFT_DOUBLE_UP]: DoubleTFT
};

const findPlayerToUpdate = async (existingPlayer: Model, queueType: GameQueueType): Promise<Model | null> => {
	const model = QUEUE_MODELS[queueType];
	if (!model) {
		logger.error(`❌ Unknown queue type: ${queueType}`);
		return null;
	}

	const playerToUpdate = await model.findOne({ where: { playerId: existingPlayer.dataValues.id } });

	if (!playerToUpdate) {
		logger.warn(`⚠️ No player data found in ${queueType} for playerId ${existingPlayer.dataValues.id}`);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
	}

	return playerToUpdate;
};

const updatePlayerRank = async (playerToUpdate: Model | null, isCurrent: boolean, rank: string, tier: string, leaguePoints: number): Promise<void> => {
	if (!playerToUpdate) return;

	if (isCurrent) {
		await playerToUpdate.update({
			oldRank: playerToUpdate.dataValues.currentRank,
			oldTier: playerToUpdate.dataValues.currentTier,
			oldLP: playerToUpdate.dataValues.currentLP,
			currentRank: rank,
			currentTier: tier,
			currentLP: leaguePoints
		});
	} else {
		await playerToUpdate.update({
			lastDayRank: rank,
			lastDayTier: tier,
			lastDayLP: leaguePoints
		});
	}
};

export const updatePlayerLastDate = async (serverId: string, puuid: string, queueType: GameQueueType, currentDate: Date): Promise<void> => {
	const existingPlayer = await findPlayerByPuuid(serverId, puuid);
	const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
	await updatePlayerLastDateDatabase(playerToUpdate, currentDate);
};

const updatePlayerLastDateDatabase = async (playerToUpdate: Model | null, currentDate: Date): Promise<void> => {
	if (!playerToUpdate) return;
	await playerToUpdate.update({ lastDayDate: currentDate });
};

export const updatePlayerLastDayWinLose = async (serverId: string, puuid: string, queueType: GameQueueType, isWin: boolean): Promise<void> => {
	const existingPlayer = await findPlayerByPuuid(serverId, puuid);
	const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
	await updatePlayerLastDayWinLoseDatabase(playerToUpdate, isWin);
};

const updatePlayerLastDayWinLoseDatabase = async (playerToUpdate: Model | null, isWin: boolean): Promise<void> => {
	if (!playerToUpdate) return;
	let lastDayWin: number = playerToUpdate.dataValues.lastDayWin != null ? playerToUpdate.dataValues.lastDayWin : 0;
	let lastDayLose: number = playerToUpdate.dataValues.lastDayLose != null ? playerToUpdate.dataValues.lastDayLose : 0;
	if (isWin) {
		lastDayWin += 1;
	} else {
		lastDayLose += 1;
	}
	await playerToUpdate.update({ lastDayWin: lastDayWin, lastDayLose: lastDayLose });
};

export const updatePlayerInfoCurrentAndLastForQueueType = async (serverId: string, puuid: string, queueType: GameQueueType, leaguePoints: number, rank: string, tier: string): Promise<void> => {
	const existingPlayer = await findPlayerByPuuid(serverId, puuid);
	const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
	if (playerToUpdate == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
	}

	// Single row update, equivalent to the previous three separate calls
	// (lastDay snapshot, current/old rotation, then lastDayDate stamp):
	// the old* values are read from the row before anything is written.
	await playerToUpdate.update({
		lastDayRank: rank,
		lastDayTier: tier,
		lastDayLP: leaguePoints,
		oldRank: playerToUpdate.dataValues.currentRank,
		oldTier: playerToUpdate.dataValues.currentTier,
		oldLP: playerToUpdate.dataValues.currentLP,
		currentRank: rank,
		currentTier: tier,
		currentLP: leaguePoints,
		lastDayDate: new Date(),
	});
};

export const resetLastDayOfAllPlayer = async (): Promise<void> => {
	// One bulk UPDATE per queue table instead of a findOne + update per
	// player per queue — the reset targets every row anyway.
	for (const model of Object.values(QUEUE_MODELS)) {
		const [affectedRows] = await model.update({
			lastDayWin: null,
			lastDayLose: null,
			lastDayRank: null,
			lastDayTier: null,
			lastDayLP: null,
			lastDayDate: null,
		}, { where: {} });
		logger.info(`Reset lastDay info on ${affectedRows} ${model.getTableName()} row(s).`);
	}
};

export const listAllPlayerForSpecificServer = async (serverId: string): Promise<PlayerInfo[]> => {
	try {
		const players = await Player.findAll({ where: { serverid: serverId } });
		const result: PlayerInfo[] = players.map(player => player.dataValues);
		return result;
	} catch (error) {
		logger.error(`❌ Failed to list players for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to list players');
	}
};

export const listAllPlayerForQueueInfoForSpecificServer = async (serverId: string, queueType: GameQueueType): Promise<PlayerForQueueInfo[]> => {
	const players = await Player.findAll({ where: { serverid: serverId } });
	if (players.length === 0) return [];

	const model = QUEUE_MODELS[queueType];
	if (!model) {
		throw new AppError(ErrorTypes.MANAGEDGAMEQUEUE_NOT_FOUND, `Unknown queue type: ${queueType}`);
	}

	// Single IN query instead of one findOne per player. A player whose queue
	// row is missing simply won't appear in the results (previously this threw
	// and could abort the whole daily recap).
	const queueRows = await model.findAll({
		where: { playerId: { [Op.in]: players.map(player => player.dataValues.id) } },
	});
	return queueRows.map(row => row.dataValues as PlayerForQueueInfo);
};

export const getPlayerForSpecificServer = async (serverId: string, puuid: string): Promise<PlayerInfo> => {
	const player = await findPlayerByPuuid(serverId, puuid);
	return player.dataValues;
};

export const getPlayerForQueueInfoForSpecificServer = async (serverId: string, puuid: string, queueType: GameQueueType): Promise<PlayerForQueueInfo> => {
	const existingPlayer = await findPlayerByPuuid(serverId, puuid);
	const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
	if (playerToUpdate == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found for getPlayerForQueueInfoForSpecificServer');
	}

	const result: PlayerForQueueInfo = playerToUpdate.dataValues;
	return result;
};

export interface PlayerInfo {
	id: number;
	puuid: string;
	tftpuuid: string;
	serverid: string;
	gameName: string;
	tagLine: string;
	region: string;
	lastGameID: string | null;
	lastTFTGameID: string | null;
}

export interface PlayerForQueueInfo {
	id: number;
	playerId: number;
	puuid: string;
	currentRank: string | null;
	currentTier: string | null;
	currentLP: number | null;
	oldRank: string | null;
	oldTier: string | null;
	oldLP: number | null;
	lastDayWin: number | null;
	lastDayLose: number | null;
	lastDayRank: string | null;
	lastDayTier: string | null;
	lastDayLP: number | null;
	lastDayDate: Date | null;
}

export interface ServerInfo {
	serverid: string;
	channelid: string;
	flextoggle: boolean;
	tfttoggle: boolean;
	lang: string;
}

export interface PlayerRecapInfo {
	player: PlayerInfo;
	playerQueue: PlayerForQueueInfo;
	lpChange: number;
}

export interface LeagueGameInfo {
	id: number;
	playerId: number;
	matchId: string;
	gameEndTimestamp: number;
	gameDurationSeconds: number;
	win: boolean;
	kills: number;
	deaths: number;
	assists: number;
	totalCS: number;
	damage: number;
	visionScore: number;
	pings: number;
	scoreRating: number;
	teamRank: string;
	championName: string;
	championId: number;
	queueType: string;
	lpGain: number | null;
	rankBefore: string | null;
	tierBefore: string | null;
	lpBefore: number | null;
	rankAfter: string | null;
	tierAfter: string | null;
	lpAfter: number | null;
}

export interface TFTGameInfo {
	id: number;
	playerId: number;
	matchId: string;
	gameEndTimestamp: number;
	gameDurationSeconds: number;
	win: boolean;
	placement: number;
	level: number;
	roundEliminated: string;
	playersEliminated: number;
	totalDamageToPlayers: number;
	goldLeft: number;
	mainTraits: string | null;
	queueType: string;
	lpGain: number | null;
	rankBefore: string | null;
	tierBefore: string | null;
	lpBefore: number | null;
	rankAfter: string | null;
	tierAfter: string | null;
	lpAfter: number | null;
}

// GAME DATABASE HELPERS

export const saveLeagueGameToDatabase = async (
	playerQueueInfo: PlayerForQueueInfo,
	gameInfo: PlayerLeagueGameInfo,
	riotMatchId: string,
): Promise<void> => {
	try {
		const { playerId, currentRank, currentTier, currentLP, oldRank, oldTier, oldLP } = playerQueueInfo;
		// Check if game already exists - use playerId + riotMatchId as unique combination
		const existingGame = await LeagueGame.findOne({ where: { playerId, matchId: riotMatchId } });
		if (existingGame) {
			logger.info(`Game ${riotMatchId} already exists in database for player ${playerId}. Skipping.`);
			return;
		}
		
		let lpGain = 0;
		if (currentRank != null && oldRank != null) {
			lpGain = calculateLPDifference(oldRank, currentRank, oldTier!, currentTier!, oldLP!, currentLP!);
		} else {
			logger.warn("Can't calculateRRDifference because there is a null info");
		}

		const createdGame = await LeagueGame.create({
			playerId,
			matchId: riotMatchId,
			gameEndTimestamp: gameInfo.gameEndTimestamp,
			gameDurationSeconds: gameInfo.gameDurationSeconds,
			win: gameInfo.win,
			kills: gameInfo.kills,
			deaths: gameInfo.deaths,
			assists: gameInfo.assists,
			totalCS: gameInfo.totalCS,
			damage: gameInfo.damage,
			visionScore: gameInfo.visionScore,
			pings: gameInfo.pings,
			scoreRating: gameInfo.scoreRating,
			teamRank: gameInfo.teamRank,
			championName: gameInfo.championName,
			championId: gameInfo.championId,
			queueType: gameInfo.queueType,
			lpGain,
			// The model columns are rankBefore/tierBefore/... (see gameModel.ts);
			// passing oldRank/currentRank here was silently dropped by Sequelize.
			rankBefore: oldRank,
			tierBefore: oldTier,
			lpBefore: oldLP,
			rankAfter: currentRank,
			tierAfter: currentTier,
			lpAfter: currentLP,
		});

		if (createdGame && createdGame.dataValues && createdGame.dataValues.id) {
			logger.info(`✅ League game saved to database for playerId ${playerId}, gameId: ${createdGame.dataValues.id}`);
		} else {
			logger.error(`❌ League game creation returned no ID for playerId ${playerId}`);
			throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to save League game - no ID returned');
		}
	} catch (error) {
		logger.error(`❌ Failed to save League game to database:`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to save League game');
	}
};

export const saveTFTGameToDatabase = async (
	playerQueueInfo: PlayerForQueueInfo,
	gameInfo: PlayerTFTGameInfo,
	riotMatchId: string,
): Promise<void> => {
	try {
		const { playerId, currentRank, currentTier, currentLP, oldRank, oldTier, oldLP } = playerQueueInfo;
		// Check if game already exists - use playerId + riotMatchId as unique combination
		const existingGame = await TFTGame.findOne({ where: { playerId, matchId: riotMatchId } });
		if (existingGame) {
			logger.info(`TFT game ${riotMatchId} already exists in database for player ${playerId}. Skipping.`);
			return;
		}

		let lpGain = 0;
		if (currentRank != null && oldRank != null) {
			lpGain = calculateLPDifference(oldRank, currentRank, oldTier!, currentTier!, oldLP!, currentLP!);
		} else {
			logger.warn("Can't calculateRRDifference because there is a null info");
		}

		const createdGame = await TFTGame.create({
			playerId,
			matchId: riotMatchId,
			gameEndTimestamp: gameInfo.gameEndTimestamp,
			gameDurationSeconds: gameInfo.gameDurationSeconds,
			win: gameInfo.win,
			placement: gameInfo.placement,
			level: gameInfo.level,
			roundEliminated: gameInfo.roundEliminated,
			playersEliminated: gameInfo.playersEliminated,
			totalDamageToPlayers: gameInfo.totalDamageToPlayers,
			goldLeft: gameInfo.goldLeft,
			mainTraits: gameInfo.mainTraits.join(', '),
			queueType: gameInfo.queueType,
			lpGain,
			rankBefore: oldRank,
			tierBefore: oldTier,
			lpBefore: oldLP,
			rankAfter: currentRank,
			tierAfter: currentTier,
			lpAfter: currentLP,
		});
		
		if (createdGame && createdGame.dataValues && createdGame.dataValues.id) {
			logger.info(`✅ TFT game saved to database for playerId ${playerId}, gameId: ${createdGame.dataValues.id}`);
		} else {
			logger.error(`❌ TFT game creation returned no ID for playerId ${playerId}`);
			throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to save TFT game - no ID returned');
		}
	} catch (error) {
		logger.error(`❌ Failed to save TFT game to database:`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to save TFT game');
	}
};

// Shared WHERE clause for the monthly recap queries.
const monthRangeWhere = (playerIds: number[], month: number, year: number) => ({
	playerId: { [Op.in]: playerIds },
	gameEndTimestamp: {
		[Op.gte]: new Date(year, month - 1, 1).getTime(),
		[Op.lte]: new Date(year, month, 0, 23, 59, 59).getTime(),
	},
	gameDurationSeconds: {
		[Op.gte]: MIN_GAME_DURATION_SECONDS,
	},
});

const groupGamesByPlayer = <T extends { playerId: number }>(games: T[]): Map<number, T[]> => {
	const byPlayer = new Map<number, T[]>();
	for (const game of games) {
		const list = byPlayer.get(game.playerId) ?? [];
		list.push(game);
		byPlayer.set(game.playerId, list);
	}
	return byPlayer;
};

// One query per game table for all players of a server, grouped by playerId —
// the monthly recap used to run one query per player per queue type (6x per
// player) and filter by queue in JS.
export const getLeagueGamesForPlayersInMonth = async (playerIds: number[], month: number, year: number): Promise<Map<number, LeagueGameInfo[]>> => {
	try {
		const games = await LeagueGame.findAll({ where: monthRangeWhere(playerIds, month, year) });
		return groupGamesByPlayer(games.map(game => game.dataValues as LeagueGameInfo));
	} catch (error) {
		logger.error(`❌ Failed to get League games in ${month}/${year}:`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to get League games');
	}
};

export const getTFTGamesForPlayersInMonth = async (playerIds: number[], month: number, year: number): Promise<Map<number, TFTGameInfo[]>> => {
	try {
		const games = await TFTGame.findAll({ where: monthRangeWhere(playerIds, month, year) });
		return groupGamesByPlayer(games.map(game => game.dataValues as TFTGameInfo));
	} catch (error) {
		logger.error(`❌ Failed to get TFT games in ${month}/${year}:`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to get TFT games');
	}
};

export const deleteOldLeagueGames = async (beforeDate: Date): Promise<number> => {
	try {
		const timestamp = beforeDate.getTime();
		const result = await LeagueGame.destroy({
			where: {
				gameEndTimestamp: {
					[Op.lt]: timestamp,
				},
			},
		});
		logger.info(`✅ Deleted ${result} old League games from database`);
		return result;
	} catch (error) {
		logger.error(`❌ Failed to delete old League games:`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to delete old League games');
	}
};

export const deleteOldTFTGames = async (beforeDate: Date): Promise<number> => {
	try {
		const timestamp = beforeDate.getTime();
		const result = await TFTGame.destroy({
			where: {
				gameEndTimestamp: {
					[Op.lt]: timestamp,
				},
			},
		});
		logger.info(`✅ Deleted ${result} old TFT games from database`);
		return result;
	} catch (error) {
		logger.error(`❌ Failed to delete old TFT games:`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to delete old TFT games');
	}
};

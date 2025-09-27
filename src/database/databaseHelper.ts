import { DoubleTFT, FlexQ, Player, SoloQ, SoloTFT } from './playerModel';
import { Server } from './serverModel';
import { AppError, ErrorTypes } from '../error/error';
import { Model } from 'sequelize';
import { GameQueueType, ManagedGameQueueType } from '../tracking/GameQueueType';
import logger from '../logger/logger';

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
		const server = await Server.findOne({ where: { serverId: serverId } });
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
		logger.error("No server found to delete for serverid: " + serverId);
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	await Server.destroy({ where: { serverid: serverId } });
};

// PLAYER PART
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
	await SoloTFT.create({ playerId: player.dataValues.id, puuid: player.dataValues.tftpuuid });
	await DoubleTFT.create({ playerId: player.dataValues.id, puuid: player.dataValues.tftpuuid });
};

export const deletePlayer = async (serverId: string, accountName: string, tag: string, region: string): Promise<void> => {
	const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	const existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, gameName: accountName, tagLine: tag, region: region } });
	if (existingPlayer != null) {
		throw new AppError(ErrorTypes.DATABASE_ALREADY_INSIDE, 'Player already exists');
	}


	await Player.destroy({ where: { serverid: serverId, gameName: accountName, tagLine: tag, region: region } });
};

export const deleteAllPlayersOfServer = async (serverId: string): Promise<void> => {
	const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	await Player.destroy({ where: { serverid: serverId } });
};

export const updatePlayerLastGameId = async (serverId: string, puuid: string, lastGameID: string, managedGameQueueType: ManagedGameQueueType): Promise<void> => {
	const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	let existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });
	if (existingPlayer == null) {
		// TFT puuid
		existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
	}
	if (existingPlayer == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
	}

	if (managedGameQueueType == ManagedGameQueueType.LEAGUE) {
		await existingPlayer.update({ lastGameID: lastGameID });
	} else if (managedGameQueueType == ManagedGameQueueType.TFT) {
		await existingPlayer.update({ lastTFTGameID: lastGameID });
	} else {
		throw new AppError(ErrorTypes.MANAGEDGAMEQUEUE_NOT_FOUND, 'ManagedGameQueueType not found');
	}
};

export const updatePlayerGameNameAndTagLine = async (serverId: string, puuid: string, gameName: string, tagLine: string): Promise<void> => {
	const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	let existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });
	if (existingPlayer == null) {
		// TFT puuid
		existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
	}
	if (existingPlayer == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
	}

	if (existingPlayer.dataValues.gameName !== gameName || existingPlayer.dataValues.tagLine !== tagLine) {
		await existingPlayer.update({
			gameName: gameName,
			tagLine: tagLine,
		});
	}
};

export const updatePlayerCurrentOrLastDayRank = async (serverId: string, puuid: string, isCurrent: boolean, queueType: GameQueueType, leaguePoints: number, rank: string, tier: string): Promise<void> => {
	const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	let existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });
	if (existingPlayer == null) {
		// TFT puuid
		existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
	}
	if (existingPlayer == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
	}

	const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
	await updatePlayerRank(playerToUpdate, isCurrent, rank, tier, leaguePoints);
};

const findPlayerToUpdate = async (existingPlayer: Model, queueType: GameQueueType): Promise<Model | null> => {
	const queueModels = {
		[GameQueueType.RANKED_FLEX_SR]: FlexQ,
		[GameQueueType.RANKED_SOLO_5x5]: SoloQ,
		[GameQueueType.RANKED_TFT]: SoloTFT,
		[GameQueueType.RANKED_TFT_DOUBLE_UP]: DoubleTFT
	};
	const model = queueModels[queueType];
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

	if (isCurrent == true) {
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
	const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	let existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });
	if (existingPlayer == null) {
		// TFT puuid
		existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
	}
	if (existingPlayer == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
	}

	const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
	await updatePlayerLastDateDatabase(playerToUpdate, currentDate);
};

const updatePlayerLastDateDatabase = async (playerToUpdate: Model | null, currentDate: Date): Promise<void> => {
	if (!playerToUpdate) return;
	await playerToUpdate.update({ lastDayDate: currentDate });
};

export const updatePlayerLastDayWinLose = async (serverId: string, puuid: string, queueType: GameQueueType, isWin: boolean): Promise<void> => {
	const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	let existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });
	if (existingPlayer == null) {
		// TFT puuid
		existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
	}
	if (existingPlayer == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
	}

	const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
	await updatePlayerLastDayWinLoseDatabase(playerToUpdate, isWin);
};

const updatePlayerLastDayWinLoseDatabase = async (playerToUpdate: Model | null, isWin: boolean): Promise<void> => {
	if (!playerToUpdate) return;
	let lastDayWin: number = playerToUpdate.dataValues.lastDayWin != null ? playerToUpdate.dataValues.lastDayWin : 0;
	let lastDayLose: number = playerToUpdate.dataValues.lastDayLose != null ? playerToUpdate.dataValues.lastDayLose : 0;
	if (isWin == true) {
		lastDayWin += 1;
	} else {
		lastDayLose += 1;
	}
	await playerToUpdate.update({ lastDayWin: lastDayWin, lastDayLose: lastDayLose });
};

export const updatePlayerInfoCurrentAndLastForQueueType = async (serverId: string, player: PlayerInfo, queueType: GameQueueType, leaguePoints: number, rank: string, tier: string): Promise<void> => {
	const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
	if (existingServer == null) {
		throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
	}

	let existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: player.puuid } });
	if (existingPlayer == null) {
		// TFT puuid
		existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: player.tftpuuid } });
	}
	if (existingPlayer == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
	}

	let isCurrent = false;
	await updatePlayerCurrentOrLastDayRank(serverId, player.puuid, isCurrent, queueType, leaguePoints, rank, tier);
	isCurrent = true;
	await updatePlayerCurrentOrLastDayRank(serverId, player.puuid, isCurrent, queueType, leaguePoints, rank, tier);
	// Update the date inside last day player
	await updatePlayerLastDate(serverId, player.puuid, queueType, new Date());
};

export const resetLastDayOfAllPlayer = async (): Promise<void> => {
	const existingPlayers: Model[] | null = await Player.findAll();
	if (existingPlayers == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'No players to reset');
	}
	for (const existingPlayer of existingPlayers) {
		// For each on every game queue type
		Object.values(GameQueueType).forEach(async (queueType: GameQueueType) => {
			const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
			if (!playerToUpdate) return;
			playerToUpdate.update({
				lastDayWin: null,
				lastDayLose: null,
				lastDayRank: null,
				lastDayTier: null,
				lastDayLP: null,
				lastDayDate: null,
			})
		});
	}
};

export const listAllPlayerForSpecificServer = async (serverId: string): Promise<PlayerInfo[]> => {
	try {
		const players = await Player.findAll({ where: { serverId: serverId } });
		const result: PlayerInfo[] = players.map(player => player.dataValues);
		return result;
	} catch (error) {
		logger.error(`❌ Failed to list players for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to list players');
	}
};

export const listAllPlayerForQueueInfoForSpecificServer = async (serverId: string, queueType: GameQueueType): Promise<PlayerForQueueInfo[]> => {

	const players = await Player.findAll({ where: { serverId: serverId } });
	const result: PlayerForQueueInfo[] = [];
	for (const player of players) {
		const playerToUpdate = await findPlayerToUpdate(player, queueType);
		if (playerToUpdate == null) {
			throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found for listAllPlayerForQueueInfoForSpecificServer');
		}
		result.push(playerToUpdate.dataValues as PlayerForQueueInfo);
	}
	return result;
};

export const getPlayerForSpecificServer = async (serverId: string, puuid: string): Promise<PlayerInfo> => {
	let player = await Player.findOne({ where: { serverId: serverId, puuid: puuid } });
	if (player == null) {
		// TFT puuid
		player = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
	}
	if (player == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found for getPlayerForSpecificServer');
	}

	const result: PlayerInfo = player.dataValues;
	return result;
};

export const getPlayerForQueueInfoForSpecificServer = async (serverId: string, puuid: string, queueType: GameQueueType): Promise<PlayerForQueueInfo> => {
	let existingPlayer = await Player.findOne({ where: { serverId: serverId, puuid: puuid } });
	if (existingPlayer == null) {
		// TFT puuid
		existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
	}
	if (existingPlayer == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
	}

	const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
	if (playerToUpdate == null) {
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found for getPlayerForQueueInfoForSpecificServer');

	}

	const result: PlayerForQueueInfo = playerToUpdate.dataValues;
	return result;
};

const tierOrder: Record<string, number> = {
	"IRON": 1, "BRONZE": 2, "SILVER": 3, "GOLD": 4, "PLATINUM": 5,
	"EMERALD": 6, "DIAMOND": 7, "MASTER": 8, "GRANDMASTER": 9, "CHALLENGER": 10
};

const rankOrder: Record<string, number> = { "IV": 1, "III": 2, "II": 3, "I": 4 };

function comparePlayers(a: PlayerForQueueInfo, b: PlayerForQueueInfo): number {
	const tierA = tierOrder[a.currentTier || "IRON"] || 0;
	const tierB = tierOrder[b.currentTier || "IRON"] || 0;

	if (tierA !== tierB) return tierB - tierA;

	const rankA = rankOrder[a.currentRank || "IV"] || 0;
	const rankB = rankOrder[b.currentRank || "IV"] || 0;

	if (rankA !== rankB) return rankB - rankA;

	const lpA = a.currentLP || 0;
	const lpB = b.currentLP || 0;

	return lpB - lpA;
}

export const sortPlayersByRank = (players: PlayerForQueueInfo[]): PlayerForQueueInfo[] => {
	// Don't want null info
	const filteredPlayers = players.filter(player => {
		return player.currentRank !== null && player.currentTier !== null && player.currentLP !== null;
	});
	return filteredPlayers.sort((a, b) => comparePlayers(a, b));
}

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
	tftdoubletoggle: boolean;
	lang: string;
}

export interface PlayerRecapInfo {
	player: PlayerInfo;
	playerQueue: PlayerForQueueInfo;
	lpChange: number;
}

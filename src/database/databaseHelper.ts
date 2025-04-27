import { FlexQ, Player, SoloQ, SoloTFT } from './playerModel';
import { Server } from './serverModel';
import { AppError, ErrorTypes } from '../error/error';
import { Model } from 'sequelize';
import { GameQueueType, ManagedGameQueueType } from '../tracking/GameQueueType';

// SERVER PART
export const addOrUpdateServer = async (serverId: string, channelId: string, flexToggle: boolean, tftToggle: boolean, lang: string): Promise<void> => {
	try {
		const existingServer = await Server.findOne({ where: { serverid: serverId } });
		if (existingServer) {
			await existingServer.update({ channelid: channelId, flextoggle: flexToggle, tfttoggle: tftToggle, tftdoubletoggle: false, lang: lang });
			console.log(`The server ${serverId} has been updated`);
		} else {
			await Server.create({ serverid: serverId, channelid: channelId, flextoggle: flexToggle, tfttoggle: tftToggle, tftdoubletoggle: false, lang: lang });
			console.log(`The server ${serverId} has been added`);
		}
	} catch (error) {
		console.error(`❌ Failed to add or update the database for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to add or update the lang');
	}
};

export const updateLangServer = async (serverId: string, lang: string): Promise<void> => {
	try {
		const existingServer = await Server.findOne({ where: { serverid: serverId } });
		if (existingServer) {
			await existingServer.update({ lang });
			// console.log(`The language has been set to ${lang} for server ${serverId}`);
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		console.error(`❌ Failed to update the lang for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to update the lang');
	}
};

export const updateFlexToggleServer = async (serverId: string, flexToggle: boolean): Promise<void> => {
	try {
		const existingServer = await Server.findOne({ where: { serverid: serverId } });
		if (existingServer) {
			await existingServer.update({ flextoggle: flexToggle });
			// console.log(`The flex queue watch has been set to ${flexToggle} for server ${serverId}`);
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		console.error(`❌ Failed to update the flex toggle for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to update the flex toggle');
	}
};

export const updateTFTToggleServer = async (serverId: string, tftToggle: boolean): Promise<void> => {
	try {
		const existingServer = await Server.findOne({ where: { serverid: serverId } });
		if (existingServer) {
			await existingServer.update({ tfttoggle: tftToggle });
			// console.log(`The TFT queue watch has been set to ${tftToggle} for server ${serverId}`);
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		console.error(`❌ Failed to update the tft toggle for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to update the tft toggle');
	}
};

export const getLangServer = async (serverId: string): Promise<string> => {
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		return existingServer != null ? existingServer.dataValues.lang : 'en';
	} catch (error) {
		console.error(`❌ Failed to get the lang for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to get the lang');
	}
};

export const getAllServer = async (): Promise<ServerInfo[]> => {
	try {
		const servers = await Server.findAll();
		const result: ServerInfo[] = servers.map(server => server.dataValues);
		return result;
	} catch (error) {
		console.error('❌ Failed to list servers :', error);
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
		console.error('❌ Failed to list servers :', error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to list servers');
	}
};

export const deleteServer = async (serverId: string): Promise<void> => {
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });

		if (existingServer != null) {
			await Server.destroy({ where: { serverid: serverId } });
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		console.error('❌ Failed to delete the server :', error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to delete the server');
	}
};

// PLAYER PART
export const addPlayer = async (serverId: string, puuid: string, tftpuuid: string, accountName: string, tag: string, region: string): Promise<void> => {
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		const existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid, tftpuuid: tftpuuid } });

		if (existingServer != null) {
			if (existingPlayer == null) {
				const player = await Player.create({ serverid: serverId, puuid: puuid, tftpuuid: tftpuuid, gameName: accountName, tagLine: tag, region: region });
				// Create all sub table entry
				await SoloQ.create({ playerId: player.dataValues.id, puuid: player.dataValues.puuid });
				await FlexQ.create({ playerId: player.dataValues.id, puuid: player.dataValues.puuid });
				await SoloTFT.create({ playerId: player.dataValues.id, puuid: player.dataValues.tftpuuid });
			} else {
				throw new AppError(ErrorTypes.DATABASE_ALREADY_INSIDE, 'Player already exists');
			}
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		console.error(`❌ Failed to add the player ${accountName}#${tag} for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to add the player ${accountName}#${tag}`);
	}
};

export const deletePlayer = async (serverId: string, accountName: string, tag: string, region: string): Promise<void> => {
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		const existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, gameName: accountName, tagLine: tag, region: region } });

		if (existingServer != null) {
			if (existingPlayer != null) {
				await Player.destroy({ where: { serverid: serverId, gameName: accountName, tagLine: tag, region: region } });
			} else {
				throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
			}
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		console.error(`❌ Failed to delete the player ${accountName}#${tag} for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to delete the player ${accountName}#${tag} for the serverID -> ${serverId}`);
	}
};

export const deleteAllPlayersOfServer = async (serverId: string): Promise<void> => {
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		if (existingServer != null) {
			await Player.destroy({ where: { serverid: serverId } });
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		console.error(`❌ Failed to delete all the players for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to delete all players for the serverID -> ${serverId}`);
	}
};

export const updatePlayerLastGameId = async (serverId: string, puuid: string, lastGameID: string, managedGameQueueType: ManagedGameQueueType): Promise<void> => {
	try {

		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		let existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });
		if (existingPlayer == null) {
			// TFT puuid
			existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
		}

		if (existingServer != null) {
			if (existingPlayer != null) {
				if (managedGameQueueType == ManagedGameQueueType.LEAGUE) {
					await existingPlayer.update({ lastGameID: lastGameID });
				} else if (managedGameQueueType == ManagedGameQueueType.TFT) {
					await existingPlayer.update({ lastTFTGameID: lastGameID });
				} else {
					throw new AppError(ErrorTypes.MANAGEDGAMEQUEUE_NOT_FOUND, 'ManagedGameQueueType not found');
				}
			} else {
				throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
			}
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		console.error(`❌ Failed to update lastGameID player ${puuid} for serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to update lastGameID for player ${puuid}`);
	}
};

export const updatePlayerCurrentOrLastDayRank = async (serverId: string, puuid: string, isCurrent: boolean, queueType: GameQueueType, leaguePoints: number, rank: string, tier: string): Promise<void> => {
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		let existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });
		if (existingPlayer == null) {
			// TFT puuid
			existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
		}

		if (existingServer != null) {
			if (existingPlayer != null) {
				const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
				await updatePlayerRank(playerToUpdate, isCurrent, rank, tier, leaguePoints);
			} else {
				throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
			}
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}

	} catch (error) {
		console.error(`❌ Failed to update lastDayRank player ${puuid} for serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to update lastDayRank for player ${puuid}`);
	}
};

const findPlayerToUpdate = async (existingPlayer: Model, queueType: GameQueueType): Promise<Model | null> => {
	const queueModels = {
		[GameQueueType.RANKED_FLEX_SR]: FlexQ,
		[GameQueueType.RANKED_SOLO_5x5]: SoloQ,
		[GameQueueType.RANKED_TFT]: SoloTFT
	};
	const model = queueModels[queueType];
	if (!model) {
		console.error(`❌ Unknown queue type: ${queueType}`);
		return null;
	}

	const playerToUpdate = await model.findOne({ where: { playerId: existingPlayer.dataValues.id } });

	if (!playerToUpdate) {
		console.warn(`⚠️ No player data found in ${queueType} for playerId ${existingPlayer.dataValues.id}`);
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
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		let existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });
		if (existingPlayer == null) {
			// TFT puuid
			existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
		}

		if (existingServer != null) {
			if (existingPlayer != null) {
				const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
				await updatePlayerLastDateDatabase(playerToUpdate, currentDate);
			} else {
				throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
			}
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		console.error(`❌ Failed to update lastDayDate player ${puuid} for serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to update lastDayDate for player ${puuid}`);
	}
};

const updatePlayerLastDateDatabase = async (playerToUpdate: Model | null, currentDate: Date): Promise<void> => {
	if (!playerToUpdate) return;
	await playerToUpdate.update({ lastDayDate: currentDate });
};

export const updatePlayerLastDayWinLose = async (serverId: string, puuid: string, queueType: GameQueueType, isWin: boolean): Promise<void> => {
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		let existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });
		if (existingPlayer == null) {
			// TFT puuid
			existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
		}

		if (existingServer != null) {
			if (existingPlayer != null) {
				const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
				await updatePlayerLastDayWinLoseDatabase(playerToUpdate, isWin);
			} else {
				throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
			}
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		console.error(`❌ Failed to update lastDayDate player ${puuid} for serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to update lastDayDate for player ${puuid}`);
	}
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
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		let existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: player.puuid } });
		if (existingPlayer == null) {
			// TFT puuid
			existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: player.tftpuuid } });
		}

		if (existingServer != null) {
			if (existingPlayer != null) {
				let isCurrent = false;
				await updatePlayerCurrentOrLastDayRank(serverId, player.puuid, isCurrent, queueType, leaguePoints, rank, tier);
				isCurrent = true;
				await updatePlayerCurrentOrLastDayRank(serverId, player.puuid, isCurrent, queueType, leaguePoints, rank, tier);
				// Update the date inside last day player
				await updatePlayerLastDate(serverId, player.puuid, queueType, new Date());
			} else {
				throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
			}
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		console.error(`❌ Failed to updatePlayerInfo player ${player.puuid} for serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to updatePlayerInfo for player ${player.puuid}`);
	}
};

export const resetLastDayOfAllPlayer = async (): Promise<void> => {
	try {
		const existingPlayers: Model[] | null = await Player.findAll();
		if (existingPlayers != null) {
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
		} else {
			throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'No players to reset');
		}
	} catch (error) {
		console.error(`❌ Failed to reset last day of all player :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to reset last day of all player`);
	}
};

export const listAllPlayerForSpecificServer = async (serverId: string): Promise<PlayerInfo[]> => {
	try {
		const players = await Player.findAll({ where: { serverId: serverId } });
		const result: PlayerInfo[] = players.map(player => player.dataValues);
		return result;
	} catch (error) {
		console.error(`❌ Failed to list players for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to list players');
	}
};

export const listAllPlayerForQueueInfoForSpecificServer = async (serverId: string, queueType: GameQueueType): Promise<PlayerForQueueInfo[]> => {
	try {
		const players = await Player.findAll({ where: { serverId: serverId } });
		const result: PlayerForQueueInfo[] = [];
		players.forEach(async player => {
			const playerToUpdate = await findPlayerToUpdate(player, queueType);
			if (playerToUpdate != null) {
				result.push(player.dataValues as PlayerForQueueInfo);
			} else {
				throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found for listAllPlayerForQueueInfoForSpecificServer');
			}
		});
		return result;
	} catch (error) {
		console.error(`❌ Failed to list players for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to list players');
	}
};

export const getPlayerForSpecificServer = async (serverId: string, puuid: string): Promise<PlayerInfo> => {
	try {
		let player = await Player.findOne({ where: { serverId: serverId, puuid: puuid } });
		if (player == null) {
			// TFT puuid
			player = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
		}

		if (player != null) {
			const result: PlayerInfo = player.dataValues;
			return result;
		}
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found for getPlayerForSpecificServer');
	} catch (error) {
		console.error(`❌ Failed to list players for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to list players');
	}
};

export const getPlayerForQueueInfoForSpecificServer = async (serverId: string, puuid: string, queueType: GameQueueType): Promise<PlayerForQueueInfo> => {
	try {
		let existingPlayer = await Player.findOne({ where: { serverId: serverId, puuid: puuid } });
		if (existingPlayer == null) {
			// TFT puuid
			existingPlayer = await Player.findOne({ where: { serverid: serverId, tftpuuid: puuid } });
		}

		if (existingPlayer != null) {
			const playerToUpdate = await findPlayerToUpdate(existingPlayer, queueType);
			if (playerToUpdate != null) {
				const result: PlayerForQueueInfo = playerToUpdate.dataValues;
				return result;
			} else {
				throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found for getPlayerForQueueInfoForSpecificServer');
			}
		}
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
	} catch (error) {
		console.error(`❌ Failed to list players for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to list players');
	}
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
	lang: string;
}

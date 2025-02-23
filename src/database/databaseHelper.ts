import { Player } from './playerModel';
import { Server } from './serverModel';
import { AppError, ErrorTypes } from '../error/error';
import { Model } from 'sequelize';

// SERVER PART
export const addOrUpdateServer = async (serverId: string, channelId: string, flexToggle: boolean, lang: string): Promise<void> => {
	try {
		const existingServer = await Server.findOne({ where: { serverid: serverId } });
		if (existingServer) {
			await existingServer.update({ channelid: channelId, flextoggle: flexToggle, lang });
			console.log(`The server ${serverId} has been updated`);
		} else {
			await Server.create({ serverid: serverId, channelid: channelId, flextoggle: flexToggle, lang });
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

// PLAYER PART
export const addPlayer = async (serverId: string, puuid: string, accountName: string, tag: string, region: string): Promise<void> => {
	try {
		const accountNameTag: string = `${accountName}#${tag}`;
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		const existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });

		if (existingServer != null) {
			if (existingPlayer == null) {
				await Player.create({ serverid: serverId, puuid: puuid, accountnametag: accountNameTag, region: region });
				// console.log(`The player ${accountNameTag} has been added to the database`);
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
		const accountNameTag: string = `${accountName}#${tag}`;
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		const existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, accountNameTag: accountNameTag, region: region } });

		if (existingServer != null) {
			if (existingPlayer != null) {
				await Player.destroy({ where: { serverid: serverId, accountNameTag: accountNameTag, region: region } });
				// console.log(`The player ${accountNameTag} has been added to the database`);
			} else {
				throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
			}
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		console.error(`❌ Failed to delete the player ${accountName}#${tag} for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to add the player ${accountName}#${tag}`);
	}
};

export const updatePlayerLastGameId = async (serverId: string, puuid: string, lastGameID: string): Promise<void> => {
	try {

		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		const existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });

		if (existingServer != null) {
			if (existingPlayer != null) {
				await existingPlayer.update({ lastGameID: lastGameID });
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

export const updatePlayerCurrentOrLastDayRank = async (serverId: string, puuid: string, isCurrent: boolean, queueType: string, leaguePoints: number, rank: string, tier: string): Promise<void> => {
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		const existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });

		if (existingServer != null) {
			if (existingPlayer != null) {
				if (isCurrent == true) {
					if (queueType === "RANKED_FLEX_SR") {
						await existingPlayer.update({ oldFlexRank: existingPlayer.dataValues.currentFlexRank, oldFlexTier: existingPlayer.dataValues.currentFlexTier, oldFlexLP: existingPlayer.dataValues.currentFlexLP });
						await existingPlayer.update({ currentFlexRank: rank, currentFlexTier: tier, currentFlexLP: leaguePoints });
					} else {
						await existingPlayer.update({ oldSoloQRank: existingPlayer.dataValues.currentSoloQRank, oldSoloQTier: existingPlayer.dataValues.currentSoloQTier, oldSoloQLP: existingPlayer.dataValues.currentSoloQLP });
						await existingPlayer.update({ currentSoloQRank: rank, currentSoloQTier: tier, currentSoloQLP: leaguePoints });
					}
				} else {
					if (queueType === "RANKED_FLEX_SR") {
						await existingPlayer.update({ lastDayFlexRank: rank, lastDayFlexTier: tier, lastDayFlexLP: leaguePoints });
					} else {
						await existingPlayer.update({ lastDaySoloQRank: rank, lastDaySoloQTier: tier, lastDaySoloQLP: leaguePoints });
					}
				}
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

export const updatePlayerLastDayWinLose = async (serverId: string, puuid: string, queueType: string, win: boolean): Promise<void> => {
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		const existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });

		if (existingServer != null) {
			if (existingPlayer != null) {
				if (queueType === "RANKED_FLEX_SR") {
					// Update win/lose part
					// Init
					if (existingPlayer.dataValues.lastDayFlexWin == null && existingPlayer.dataValues.lastDayFlexLose == null) {
						await existingPlayer.update({ lastDayFlexWin: 0, lastDayFlexLose: 0 });
					}
					// Update win/lose in database
					if (win == true) {
						await existingPlayer.update({ lastDayFlexWin: existingPlayer.dataValues.lastDayFlexWin += 1 });
					} else {
						await existingPlayer.update({ lastDayFlexLose: existingPlayer.dataValues.lastDayFlexLose += 1 });
					}
				} else {
					// Update win/lose part
					// Init
					if (existingPlayer.dataValues.lastDaySoloQWin == null && existingPlayer.dataValues.lastDaySoloQLose == null) {
						await existingPlayer.update({ lastDaySoloQWin: 0, lastDaySoloQLose: 0 });
					}
					// Update win/lose in database
					if (win == true) {
						await existingPlayer.update({ lastDaySoloQWin: existingPlayer.dataValues.lastDaySoloQWin += 1 });
					} else {
						await existingPlayer.update({ lastDaySoloQLose: existingPlayer.dataValues.lastDaySoloQLose += 1 });
					}
				}
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

export const updatePlayerLastDate = async (serverId: string, puuid: string, currentDate: Date): Promise<void> => {
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		const existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });

		if (existingServer != null) {
			if (existingPlayer != null) {
				await existingPlayer.update({ lastDayDate: currentDate });
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

export const updatePlayerWinLose = async (serverId: string, puuid: string, queueType: string, isWin: boolean): Promise<void> => {
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		const existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: puuid } });

		if (existingServer != null) {
			if (existingPlayer != null) {
				if (queueType === "RANKED_FLEX_SR") {
					let lastDayFlexWin: number = existingPlayer.dataValues.lastDayFlexWin != null ? existingPlayer.dataValues.lastDayFlexWin : 0;
					let lastDayFlexLose: number = existingPlayer.dataValues.lastDayFlexLose != null ? existingPlayer.dataValues.lastDayFlexLose : 0;
					if (isWin == true) {
						lastDayFlexWin += 1;
					} else {
						lastDayFlexLose += 1;
					}
					await existingPlayer.update({ lastDayFlexWin: lastDayFlexWin, lastDayFlexLose: lastDayFlexLose });
				} else {
					let lastDaySoloQWin: number = existingPlayer.dataValues.lastDaySoloQWin != null ? existingPlayer.dataValues.lastDaySoloQWin : 0;
					let lastDaySoloQLose: number = existingPlayer.dataValues.lastDaySoloQLose != null ? existingPlayer.dataValues.lastDaySoloQLose : 0;
					if (isWin == true) {
						lastDaySoloQWin += 1;
					} else {
						lastDaySoloQLose += 1;
					}
					await existingPlayer.update({ lastDaySoloQWin: lastDaySoloQWin, lastDaySoloQLose: lastDaySoloQLose });
				}
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

export const updatePlayerInfo = async (serverId: string, player: PlayerInfo, queueType: string, leaguePoints: number, rank: string, tier: string): Promise<void> => {
	try {
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		const existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, puuid: player.puuid } });

		if (existingServer != null) {
			if (existingPlayer != null) {
				// Update inside database
				let isCurrent = false;
				await updatePlayerCurrentOrLastDayRank(serverId, player.puuid, isCurrent, queueType, leaguePoints, rank, tier);
				isCurrent = true;
				await updatePlayerCurrentOrLastDayRank(serverId, player.puuid, isCurrent, queueType, leaguePoints, rank, tier);
				// Update the date inside last day player
				await updatePlayerLastDate(serverId, player.puuid, new Date());
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
			for (const player of existingPlayers) {
				player.update({
					lastDaySoloQWin: null,
					lastDaySoloQLose: null,
					lastDaySoloQRank: null,
					lastDaySoloQTier: null,
					lastDaySoloQLP: null,
					lastDayFlexWin: null,
					lastDayFlexLose: null,
					lastDayFlexRank: null,
					lastDayFlexTier: null,
					lastDayFlexLP: null,
					lastDayDate: null,
				})
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

export const getPlayerForSpecificServer = async (serverId: string, puuid: string): Promise<PlayerInfo> => {
	try {
		const player = await Player.findOne({ where: { serverId: serverId, puuid: puuid } });
		if (player != null) {
			const result: PlayerInfo = player.dataValues;
			return result;
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

function comparePlayers(a: PlayerInfo, b: PlayerInfo, queueType: string): number {
	const rankKey = queueType === "RANKED_SOLO_5x5" ? "currentSoloQRank" : "currentFlexRank";
	const tierKey = queueType === "RANKED_SOLO_5x5" ? "currentSoloQTier" : "currentFlexTier";
	const lpKey = queueType === "RANKED_SOLO_5x5" ? "currentSoloQLP" : "currentFlexLP";

	const tierA = tierOrder[a[tierKey] || "IRON"] || 0;
	const tierB = tierOrder[b[tierKey] || "IRON"] || 0;

	if (tierA !== tierB) return tierB - tierA;

	const rankA = rankOrder[a[rankKey] || "IV"] || 0;
	const rankB = rankOrder[b[rankKey] || "IV"] || 0;

	if (rankA !== rankB) return rankB - rankA;

	const lpA = a[lpKey] || 0;
	const lpB = b[lpKey] || 0;

	return lpB - lpA;
}

// Fonction pour trier un tableau de joueurs
export const sortPlayers = (players: PlayerInfo[], queueType: string): PlayerInfo[] => {
	// Don't want null info
	const filteredPlayers = players.filter(player => {
		const rankKey = queueType === "RANKED_SOLO_5x5" ? "currentSoloQRank" : "currentFlexRank";
		const tierKey = queueType === "RANKED_SOLO_5x5" ? "currentSoloQTier" : "currentFlexTier";
		const lpKey = queueType === "RANKED_SOLO_5x5" ? "currentSoloQLP" : "currentFlexLP";

		return player[rankKey] !== null && player[tierKey] !== null && player[lpKey] !== null;
	});
	return filteredPlayers.sort((a, b) => comparePlayers(a, b, queueType));
}

export interface PlayerInfo {
	puuid: string;
	serverid: string;
	accountnametag: string;
	region: string;
	lastGameID: string | null;
	currentSoloQRank: string | null;
	currentSoloQTier: string | null;
	currentSoloQLP: number | null;
	currentFlexRank: string | null;
	currentFlexTier: string | null;
	currentFlexLP: number | null;
	oldSoloQRank: string | null;
	oldSoloQTier: string | null;
	oldSoloQLP: number | null;
	oldFlexRank: string | null;
	oldFlexTier: string | null;
	oldFlexLP: number | null;
	lastDaySoloQWin: number | null;
	lastDaySoloQLose: number | null;
	lastDaySoloQRank: string | null;
	lastDaySoloQTier: string | null;
	lastDaySoloQLP: number | null;
	lastDayFlexWin: number | null;
	lastDayFlexLose: number | null;
	lastDayFlexRank: string | null;
	lastDayFlexTier: string | null;
	lastDayFlexLP: number | null;
	lastDayDate: Date | null;
}

export interface ServerInfo {
	serverid: string;
	channelid: string;
	flextoggle: boolean;
	lang: string;
}

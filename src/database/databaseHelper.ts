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
		const servers = await Server.findAll({ attributes: ['serverid', 'channelid', 'flextoggle', 'lang'] });
		const result: ServerInfo[] = servers.map(server => server.dataValues);
		return result;
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
				console.log(lastGameID);
				// await Player.update({ lastGameID: lastGameID }, { where: { serverid: serverId, puuid: puuid } });
			} else {
				throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, 'Player not found');
			}
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		console.error(`❌ Failed to update lastGameID player ${puuid} for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to add the player ${puuid}`);
	}
};

export const listAllPlayer = async (serverId: string): Promise<PlayerInfo[]> => {
	try {
		const players = await Player.findAll({ attributes: ['puuid', 'serverid', 'accountnametag', 'region', 'lastGameID'] });
		const result: PlayerInfo[] = players.map(player => player.dataValues);
		return result;
	} catch (error) {
		console.error(`❌ Failed to list players for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to list players');
	}
};

export interface PlayerInfo {
	puuid: string;
	serverid: string;
	accountnametag: string;
	region: string;
	lastGameID: string | null;
}

export interface ServerInfo {
	serverid: string;
	channelid: string;
	flextoggle: boolean;
	lang: string;
}

import Player from './playerModel';
import Server from './serverModel';
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

// PLAYER PART
export const addPlayer = async (serverId: string, accountName: string, tag: string, region: string): Promise<void> => {
	try {
		const accountNameTag: string = `${accountName}#${tag}`;
		const existingServer: Model | null = await Server.findOne({ where: { serverid: serverId } });
		const existingPlayer: Model | null = await Player.findOne({ where: { serverid: serverId, accountnametag: accountNameTag, region } });

		if (existingServer != null) {
			if (existingPlayer != null) {
				await Player.create({ serverid: serverId, accountnametag: accountNameTag, region });
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

export const listAllPlayer = async (serverId: string): Promise<PlayerInfo[]> => {
	try {
		const players = await Player.findAll({ attributes: ['accountnametag', 'region'] });
		const result: PlayerInfo[] = players.map(player => player.dataValues);
		return result;
	} catch (error) {
		console.error(`❌ Failed to list players for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to list players');
	}
};

export interface PlayerInfo {
	accountnametag: string;
	region: string;
}

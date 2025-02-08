const Player = require('./playerModel');
const Server = require('./serverModel');
const { AppError, ErrorTypes } = require('../error/error');

// SERVER PART
const addOrUpdateServer = async (serverId, channelId, flextoggle, lang) => {
	try {
		const existingServer = await Server.findOne({ where: { serverid: serverId } });
		// Check if the server has already been init
		if (existingServer != null) {
			// Already init so we update it
			await existingServer.update({
				channelid: channelId,
				flextoggle: flextoggle,
				lang: lang,
			}, { where: { serverid: serverId } });
			console.log(`The server ${serverId} has been updated`);
		} else {
			// Create the server
			await Server.create({
				serverid: serverId,
				channelid: channelId,
				flextoggle: flextoggle,
				lang: lang,
			});
			console.log(`The server ${serverId} has been added`);
		}
	} catch (error) {
		console.error(`❌ Failed to add or update the database for the serverID -> ${serverId} :`, error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to add or update the lang');
	}
};
const updateLangServer = async (serverId, lang) => {
	try {
		const existingServer = await Server.findOne({ where: { serverid: serverId } });
		// Check if the server has already been init
		if (existingServer != null) {
			// Already init so we update it
			await existingServer.update({
				lang: lang,
			}, { where: { serverid: serverId } });
			console.log(`The language has been set to ${lang} for server ${serverId}`);
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		if (error.type == ErrorTypes.SERVER_NOT_INITIALIZE) {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		} else {
			console.error(`❌ Failed to update the lang for the serverID -> ${serverId} :`, error);
			throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to update the lang');
		}
	}
};
const updateFlexToggleServer = async (serverId, flexToggle) => {
	try {
		const existingServer = await Server.findOne({ where: { serverid: serverId } });
		// Check if the server has already been init
		if (existingServer != null) {
			// Already init so we update it
			await existingServer.update({
				flextoggle: flexToggle,
			}, { where: { serverid: serverId } });
			console.log(`The flex queue watch has been set to ${flexToggle} for server ${serverId}`);
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		if (error.type == ErrorTypes.SERVER_NOT_INITIALIZE) {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		} else {
			console.error(`❌ Failed to update the lang for the serverID -> ${serverId} :`, error);
			throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to update the lang');
		}
	}
};

// PLAYER PART
const addPlayer = async (serverId, accountname, tag, region) => {
	try {
		const accountnametag = accountname + '#' + tag;
		// Check if the server has been initialized
		const existingServer = await Server.findOne({ where: { serverid: serverId } });
		// Check if the player already been added
		const existingPlayer = await Player.findOne({ where: { serverid: serverId, accountnametag: accountnametag, region: region } });
		if (existingServer != null) {
			if (existingPlayer == null) {
				// Create the player
				await Player.create({
					serverid: serverId,
					accountnametag: accountnametag,
					region: region,
				});
				console.log(`The server ${serverId} has been added`);
			} else {
				throw new AppError(ErrorTypes.DATABASE_ALREADY_INSIDE, 'Player already exist');
			}
		} else {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		}
	} catch (error) {
		if (error.type == ErrorTypes.SERVER_NOT_INITIALIZE) {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		} else if (error.type == ErrorTypes.DATABASE_ALREADY_INSIDE) {
			throw new AppError(ErrorTypes.DATABASE_ALREADY_INSIDE, 'Player already exist');
		} else {
			console.error(`❌ Failed to add the player ${accountname}#${tag} for the serverID -> ${serverId} :`, error);
			throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to add the player ${accountname}#${tag}`);
		}
	}
};

const listAllPlayer = async (serverId) => {
	try {
		const playerList = await Player.findAll({ attributes: ['accountnametag', 'region'] });
		return playerList;
	} catch (error) {
		if (error.type == ErrorTypes.SERVER_NOT_INITIALIZE) {
			throw new AppError(ErrorTypes.SERVER_NOT_INITIALIZE, 'Server not init');
		} else {
			console.error(`❌ Failed to add the player ${accountname}#${tag} for the serverID -> ${serverId} :`, error);
			throw new AppError(ErrorTypes.DATABASE_ERROR, `Failed to add the player ${accountname}#${tag}`);
		}
	}
};

module.exports = { addPlayer, listAllPlayer, addOrUpdateServer, updateFlexToggleServer, updateLangServer };
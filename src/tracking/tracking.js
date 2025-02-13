const trackPlayer = async () => {

	// Every 10 min, track all the player
	// Get all the server

	// Get all the player for each server
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

const startTracking = async () => {

	// Every 10 min, track all the player
	// Get all the server

	// Get all the player for each server
	;
};

module.exports = { startTracking, trackPlayer, listAllPlayer };
import { getAllServer, listAllPlayer, updatePlayerLastGameId } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { getGameDetailForCurrentPlayer, getLastMatch, PlayerGameInfo } from '../riot/riotHelper';

export const trackPlayer = async (firstRun: boolean): Promise<void> => {
	try {
		// Get all the servers
		const servers = await getAllServer();
		
		for (const server of servers) {
			const currentServerID = server.serverid;
			const currentServerFlexTracker = server.flextoggle;
			// Get all the players for the current server
			const players = await listAllPlayer(currentServerID);

			// Get match history for each players
			const matchRequests = players.map(async (player) => {
				const matchIds = await getLastMatch(player.puuid, player.region, currentServerFlexTracker);
				return { player, matchIds };
			});
			const results = await Promise.all(matchRequests.filter(req => req !== null));
			// Check if there is a new game to notify
			for (const result of results) {
				if (!result) continue;
				const { player, matchIds } = result;
				if (player.lastGameID != matchIds[0]) { // New game detected
					// Get game details
					const currentGameId = matchIds[0]; // example -> EUW1_7294524077
					const gameDetailForThePlayer: PlayerGameInfo = await getGameDetailForCurrentPlayer(player.puuid, currentGameId, player.region);

					// Update last game inside database
					await updatePlayerLastGameId(currentServerID, player.puuid, currentGameId);

					// Send the notification to the specified channel
					if (firstRun == true) {
						// don't notify
						console.log("first run, don't notify");
					} else {
						// Create the message with game detail
						console.log("NOTIFY !!!" + gameDetailForThePlayer.win);
					}
				}
			}
		}
	} catch (error) {
		console.error('❌ Failed to track players :', error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to track players');
	}
};
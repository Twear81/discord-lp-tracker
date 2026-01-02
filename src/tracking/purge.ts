import { deleteOldLeagueGames, deleteOldTFTGames } from '../database/databaseHelper';
import logger from '../logger/logger';

export const purgeOldGames = async (yearsToKeep: number = 1): Promise<void> => {
	logger.info(`🗑️ Starting old games purge (keeping last ${yearsToKeep} year(s))...`);
	
	try {
		const currentDate = new Date();
		const purgeDate = new Date(currentDate.getFullYear() - yearsToKeep, 0, 1); // January 1st of the year to purge

		logger.info(`🗓️ Purging games older than ${purgeDate.toISOString()}`);

		const deletedLeagueGames = await deleteOldLeagueGames(purgeDate);
		const deletedTFTGames = await deleteOldTFTGames(purgeDate);

		const totalDeleted = deletedLeagueGames + deletedTFTGames;

		logger.info(`✅ Purge completed: ${deletedLeagueGames} League games and ${deletedTFTGames} TFT games deleted (${totalDeleted} total).`);
	} catch (error) {
		logger.error('❌ Failed to purge old games:', error);
		throw error;
	}
};

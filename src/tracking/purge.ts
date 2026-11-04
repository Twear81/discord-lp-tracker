import { deleteOldLeagueGames, deleteOldTFTGames } from '../database/databaseHelper';
import logger from '../logger/logger';
import { getPurgeCutoffDate } from './util';

export const purgeOldGames = async (yearsToKeep: number = 1): Promise<void> => {
	logger.info(`🗑️ Starting old games purge (keeping last ${yearsToKeep} year(s))...`);
	
	try {
		const purgeDate = getPurgeCutoffDate(new Date(), yearsToKeep);

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

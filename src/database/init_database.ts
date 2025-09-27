import logger from '../logger/logger';
import sequelize from './database';
import { Player } from './playerModel';
import { Server } from './serverModel';

const initDB = async (): Promise<void> => {
	try {
		// force: true réinitialise la DB à chaque exécution
		await sequelize.sync({ force: false });
		logger.info('📦 Database synced');
	} catch (error) {
		logger.error('❌ Failed to sync the database:', error);
	}
};

export { sequelize, Player, Server, initDB };

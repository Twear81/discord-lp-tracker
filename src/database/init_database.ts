import sequelize from './database';
import { Player } from './playerModel';
import { Server } from './serverModel';

const initDB = async (): Promise<void> => {
	try {
		// force: true réinitialise la DB à chaque exécution
		await sequelize.sync({ force: false });
		console.log('📦 Database synced');
	} catch (error) {
		console.error('❌ Failed to sync the database:', error);
	}
};

export { sequelize, Player, Server, initDB };

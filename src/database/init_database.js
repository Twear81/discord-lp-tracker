const sequelize = require('../database/database');
const Player = require('./playerModel');
const Server = require('./serverModel');

const initDB = async () => {
	try {
		// force: true réinitialise la DB à chaque exécution
		await sequelize.sync({ force: false });
		console.log('📦 Database synced');
	} catch (error) {
		console.error('❌ Failed to sync the database:', error);
	}
};

module.exports = { sequelize, Player, Server, initDB };


import { DataTypes } from 'sequelize';
import sequelize from './database';

// Define a Player model (can be any entity you are working with)
const Player = sequelize.define('Player', {
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true,
	},
	puuid: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	serverid: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	accountnametag: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	region: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	lastGameID: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
});

// Export the Player model
export default Player;
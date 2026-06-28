import { DataTypes } from 'sequelize';
import sequelize from './database';


// Define a Server model (can be any entity you are working with)
export const Server = sequelize.define('Server', {
	serverid: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: true,
	},
	channelid: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: true,
	},
	flextoggle: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
	},
	tfttoggle: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
	},
	// Deprecated: kept for backwards compatibility with existing SQLite databases.
	// TFT Double shares the tfttoggle (AGENTS.md). New writes must always set this to false.
	tftdoubletoggle: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
	},
	lang: {
		type: DataTypes.STRING,
		allowNull: false,
	},
});
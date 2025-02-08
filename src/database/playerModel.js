const { DataTypes } = require('sequelize');
const sequelize = require('./database');

// Define a User model (can be any entity you are working with)
const Player = sequelize.define('Player', {
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true,
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

// Export the User model
module.exports = Player;
const { DataTypes } = require('sequelize');
const sequelize = require('./database');

// Define a Server model (can be any entity you are working with)
const Server = sequelize.define('Server', {
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
	lang: {
		type: DataTypes.STRING,
		allowNull: false,
	},
});

// Export the User model
module.exports = Server;
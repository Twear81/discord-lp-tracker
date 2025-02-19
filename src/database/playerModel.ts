
import { DataTypes } from 'sequelize';
import sequelize from './database';

// Define a Player model (can be any entity you are working with)
export const Player = sequelize.define('Player', {
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
	currentSoloQRank: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
	currentSoloQTier: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
	currentSoloQLP: {
		type: DataTypes.NUMBER,
		allowNull: true,
		defaultValue: null,
	},
	currentFlexRank: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
	currentFlexTier: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
	currentFlexLP: {
		type: DataTypes.NUMBER,
		allowNull: true,
		defaultValue: null,
	},
	oldSoloQRank: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
	oldSoloQTier: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
	oldSoloQLP: {
		type: DataTypes.NUMBER,
		allowNull: true,
		defaultValue: null,
	},
	oldFlexRank: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
	oldFlexTier: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
	oldFlexLP: {
		type: DataTypes.NUMBER,
		allowNull: true,
		defaultValue: null,
	},
	lastDaySoloQWin: {
		type: DataTypes.NUMBER,
		allowNull: true,
		defaultValue: null,
	},
	lastDaySoloQLose: {
		type: DataTypes.NUMBER,
		allowNull: true,
		defaultValue: null,
	},
	lastDaySoloQRank: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
	lastDaySoloQTier: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
	lastDaySoloQLP: {
		type: DataTypes.NUMBER,
		allowNull: true,
		defaultValue: null,
	},
	lastDayFlexWin: {
		type: DataTypes.NUMBER,
		allowNull: true,
		defaultValue: null,
	},
	lastDayFlexLose: {
		type: DataTypes.NUMBER,
		allowNull: true,
		defaultValue: null,
	},
	lastDayFlexRank: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
	lastDayFlexTier: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
	lastDayFlexLP: {
		type: DataTypes.NUMBER,
		allowNull: true,
		defaultValue: null,
	},
	lastDayDate: {
		type: DataTypes.DATE,
		allowNull: true,
		defaultValue: null,
	},
});
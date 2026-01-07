
import { DataTypes } from 'sequelize';
import sequelize from './database';

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
	tftpuuid: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	serverid: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	gameName: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	tagLine: {
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
	lastTFTGameID: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: null,
	},
});

const defineQueueModel = (name: string) => {
	return sequelize.define(name, {
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		playerId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: 'Players',
				key: 'id',
			},
			onDelete: 'CASCADE',
		},
		puuid: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		currentRank: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		currentTier: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		currentLP: {
			type: DataTypes.INTEGER,
			allowNull: true,
		},
		oldRank: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		oldTier: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		oldLP: {
			type: DataTypes.INTEGER,
			allowNull: true,
		},
		lastDayWin: {
			type: DataTypes.INTEGER,
			allowNull: true,
		},
		lastDayLose: {
			type: DataTypes.INTEGER,
			allowNull: true,
		},
		lastDayRank: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		lastDayTier: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		lastDayLP: {
			type: DataTypes.INTEGER,
			allowNull: true,
		},
		lastDayDate: {
			type: DataTypes.DATE,
			allowNull: true,
			defaultValue: null,
		},
	});
};

// --- LoL Ranked ---
export const SoloQ = defineQueueModel('SoloQ');
export const FlexQ = defineQueueModel('FlexQ');

// --- LoL Normal & Special ---
export const Quickplay = defineQueueModel('Quickplay');
export const NormalDraft = defineQueueModel('NormalDraft');
export const Aram = defineQueueModel('Aram');
export const Arena = defineQueueModel('Arena');
export const Urf = defineQueueModel('Urf');
export const AllForOne = defineQueueModel('AllForOne');

// --- TFT ---
export const SoloTFT = defineQueueModel('SoloTFT');
export const DoubleTFT = defineQueueModel('DoubleTFT');
export const HyperRollTFT = defineQueueModel('HyperRollTFT');
export const FortunesFavorTFT = defineQueueModel('FortunesFavorTFT');
export const ChonccsTreasureTFT = defineQueueModel('ChonccsTreasureTFT');
export const SetRevivalTFT = defineQueueModel('SetRevivalTFT');

// --- Bots (IA) ---
export const BotIntro = defineQueueModel('BotIntro');
export const BotBeginner = defineQueueModel('BotBeginner');
export const BotIntermediate = defineQueueModel('BotIntermediate');

// Associations
Player.hasOne(SoloQ, { foreignKey: 'playerId', onDelete: 'CASCADE' });
Player.hasOne(FlexQ, { foreignKey: 'playerId', onDelete: 'CASCADE' });
Player.hasOne(SoloTFT, { foreignKey: 'playerId', onDelete: 'CASCADE' });
Player.hasOne(DoubleTFT, { foreignKey: 'playerId', onDelete: 'CASCADE' });

SoloQ.belongsTo(Player, { foreignKey: 'playerId' });
FlexQ.belongsTo(Player, { foreignKey: 'playerId' });
SoloTFT.belongsTo(Player, { foreignKey: 'playerId' });
DoubleTFT.belongsTo(Player, { foreignKey: 'playerId' });
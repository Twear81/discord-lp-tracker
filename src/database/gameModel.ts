import { DataTypes } from 'sequelize';
import sequelize from './database';
import { Player } from './playerModel';

// League Game Model - Stores detailed information about each League of Legends game
export const LeagueGame = sequelize.define('LeagueGame', {
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
	matchId: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	gameEndTimestamp: {
		type: DataTypes.BIGINT,
		allowNull: false,
	},
	gameDurationSeconds: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	win: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
	},
	kills: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	deaths: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	assists: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	totalCS: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	damage: {
		type: DataTypes.BIGINT,
		allowNull: false,
	},
	visionScore: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	pings: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	scoreRating: {
		type: DataTypes.FLOAT,
		allowNull: false,
	},
	teamRank: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	championName: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	championId: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	queueType: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	lpGain: {
		type: DataTypes.INTEGER,
		allowNull: true,
	},
	rankBefore: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	tierBefore: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	lpBefore: {
		type: DataTypes.INTEGER,
		allowNull: true,
	},
	rankAfter: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	tierAfter: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	lpAfter: {
		type: DataTypes.INTEGER,
		allowNull: true,
	},
});

// TFT Game Model - Stores detailed information about each TFT game
export const TFTGame = sequelize.define('TFTGame', {
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
	matchId: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	gameEndTimestamp: {
		type: DataTypes.BIGINT,
		allowNull: false,
	},
	gameDurationSeconds: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	win: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
	},
	placement: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	level: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	roundEliminated: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	playersEliminated: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	totalDamageToPlayers: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	goldLeft: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	mainTraits: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	queueType: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	lpGain: {
		type: DataTypes.INTEGER,
		allowNull: true,
	},
	rankBefore: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	tierBefore: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	lpBefore: {
		type: DataTypes.INTEGER,
		allowNull: true,
	},
	rankAfter: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	tierAfter: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	lpAfter: {
		type: DataTypes.INTEGER,
		allowNull: true,
	},
});

// Associations
Player.hasMany(LeagueGame, { foreignKey: 'playerId', onDelete: 'CASCADE' });
Player.hasMany(TFTGame, { foreignKey: 'playerId', onDelete: 'CASCADE' });

LeagueGame.belongsTo(Player, { foreignKey: 'playerId' });
TFTGame.belongsTo(Player, { foreignKey: 'playerId' });

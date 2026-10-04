import logger from '../logger/logger';
import sequelize from './database';
import { Player, ClashQ, Ranked5v5, SoloQ, FlexQ, SoloTFT, DoubleTFT } from './playerModel';
import { Server } from './serverModel';
import { LeagueGame, TFTGame } from './gameModel';
import { Op } from 'sequelize';

const initDB = async (): Promise<void> => {
	try {
		// SQLite disables FK enforcement by default — without this, the
		// `onDelete: 'CASCADE'` declared on Player.hasOne(...) and
		// Player.hasMany(...) is ignored and rows are orphaned on delete.
		await sequelize.query('PRAGMA foreign_keys = ON;');

		// force: false to preserve existing data on production
		await sequelize.sync({ force: false });
		logger.info('📦 Database synced');

		await ensureIndexes();
		await backfillQueueTables();
	} catch (error) {
		logger.error('❌ Failed to initialize the database:', error);
		throw error;
	}
};

const ensureIndexes = async (): Promise<void> => {
	const queries: string[] = [
		'CREATE INDEX IF NOT EXISTS idx_players_serverid ON Players (serverid)',
		'CREATE INDEX IF NOT EXISTS idx_soloq_playerid ON SoloQs (playerId)',
		'CREATE INDEX IF NOT EXISTS idx_flexq_playerid ON FlexQs (playerId)',
		'CREATE INDEX IF NOT EXISTS idx_clashq_playerid ON ClashQs (playerId)',
		'CREATE INDEX IF NOT EXISTS idx_ranked5v5_playerid ON Ranked5v5s (playerId)',
		'CREATE INDEX IF NOT EXISTS idx_solotft_playerid ON SoloTFTs (playerId)',
		'CREATE INDEX IF NOT EXISTS idx_doubletft_playerid ON DoubleTFTs (playerId)',
		'CREATE INDEX IF NOT EXISTS idx_leaguegames_playerid_endts ON LeagueGames (playerId, gameEndTimestamp)',
		'CREATE INDEX IF NOT EXISTS idx_leaguegames_endts ON LeagueGames (gameEndTimestamp)',
		'CREATE INDEX IF NOT EXISTS idx_tftgames_playerid_endts ON TFTGames (playerId, gameEndTimestamp)',
		'CREATE INDEX IF NOT EXISTS idx_tftgames_endts ON TFTGames (gameEndTimestamp)',
	];

	for (const sql of queries) {
		await sequelize.query(sql);
	}
	logger.info('📇 Indexes ensured');
};

// Queue tables to backfill, with the Player column holding the right puuid
// (League tables store the LoL puuid, TFT tables the TFT puuid).
const QUEUE_TABLES: Array<{ model: typeof SoloQ; puuidKey: 'puuid' | 'tftpuuid' }> = [
	{ model: SoloQ, puuidKey: 'puuid' },
	{ model: FlexQ, puuidKey: 'puuid' },
	{ model: ClashQ, puuidKey: 'puuid' },
	{ model: Ranked5v5, puuidKey: 'puuid' },
	{ model: SoloTFT, puuidKey: 'tftpuuid' },
	{ model: DoubleTFT, puuidKey: 'tftpuuid' },
];

const backfillQueueTables = async (): Promise<void> => {
	try {
		const players = await Player.findAll();
		if (players.length === 0) {
			logger.info('No players to backfill.');
			return;
		}

		// Two queries per queue table (existing rows, then one bulk insert for
		// the missing ones) instead of a findOne per player per queue.
		const playerIds = players.map(player => player.dataValues.id);
		for (const { model, puuidKey } of QUEUE_TABLES) {
			const existing = await model.findAll({ where: { playerId: { [Op.in]: playerIds } } });
			const backfilledIds = new Set(existing.map(row => row.dataValues.playerId));
			const missing = players.filter(player => !backfilledIds.has(player.dataValues.id));
			if (missing.length > 0) {
				await model.bulkCreate(missing.map(player => ({
					playerId: player.dataValues.id,
					puuid: player.dataValues[puuidKey],
				})));
			}
		}

		logger.info(`✅ Backfilled queue tables for ${players.length} player(s).`);
	} catch (error) {
		logger.error('❌ Failed to backfill queue tables:', error);
	}
};

export { sequelize, Player, Server, LeagueGame, TFTGame, ClashQ, Ranked5v5, initDB };
import logger from '../logger/logger';
import sequelize from './database';
import { Player, ClashQ, Ranked5v5, SoloQ, FlexQ, SoloTFT, DoubleTFT } from './playerModel';
import { Server } from './serverModel';
import { LeagueGame, TFTGame } from './gameModel';

const initDB = async (): Promise<void> => {
	try {
		// force: false to preserve existing data on production
		await sequelize.sync({ force: false });
		logger.info('📦 Database synced');

		await ensureIndexes();
		await backfillQueueTables();
	} catch (error) {
		logger.error('❌ Failed to sync the database:', error);
		throw error;
	}
};

const ensureIndexes = async (): Promise<void> => {
	const queries: string[] = [
		'CREATE INDEX IF NOT EXISTS idx_players_serverid ON Players (serverid)',
		'CREATE INDEX IF NOT EXISTS idx_soloq_playerid ON SoloQ (playerId)',
		'CREATE INDEX IF NOT EXISTS idx_flexq_playerid ON FlexQ (playerId)',
		'CREATE INDEX IF NOT EXISTS idx_clashq_playerid ON ClashQ (playerId)',
		'CREATE INDEX IF NOT EXISTS idx_ranked5v5_playerid ON Ranked5v5 (playerId)',
		'CREATE INDEX IF NOT EXISTS idx_solotft_playerid ON SoloTFT (playerId)',
		'CREATE INDEX IF NOT EXISTS idx_doubletft_playerid ON DoubleTFT (playerId)',
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

const backfillQueueTables = async (): Promise<void> => {
	try {
		const players = await Player.findAll();
		if (players.length === 0) {
			logger.info('No players to backfill.');
			return;
		}

		for (const player of players) {
			const playerId = (player as unknown as { dataValues: { id: number; puuid: string; tftpuuid: string } }).dataValues.id;
			const puuid = (player as unknown as { dataValues: { id: number; puuid: string; tftpuuid: string } }).dataValues.puuid;
			const tftpuuid = (player as unknown as { dataValues: { id: number; puuid: string; tftpuuid: string } }).dataValues.tftpuuid;

			await ensureQueueEntry(SoloQ, playerId, puuid);
			await ensureQueueEntry(FlexQ, playerId, puuid);
			await ensureQueueEntry(ClashQ, playerId, puuid);
			await ensureQueueEntry(Ranked5v5, playerId, puuid);
			await ensureQueueEntry(SoloTFT, playerId, tftpuuid);
			await ensureQueueEntry(DoubleTFT, playerId, tftpuuid);
		}

		logger.info(`✅ Backfilled queue tables for ${players.length} player(s).`);
	} catch (error) {
		logger.error('❌ Failed to backfill queue tables:', error);
	}
};

const ensureQueueEntry = async (
	queueModel: typeof SoloQ,
	playerId: number,
	puuid: string,
): Promise<void> => {
	const existing = await queueModel.findOne({ where: { playerId } });
	if (!existing) {
		await queueModel.create({ playerId, puuid });
	}
};

export { sequelize, Player, Server, LeagueGame, TFTGame, ClashQ, Ranked5v5, initDB };
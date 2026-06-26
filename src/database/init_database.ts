import logger from '../logger/logger';
import sequelize from './database';
import { Player, ClashQ, Ranked5v5, SoloQ, FlexQ, SoloTFT, DoubleTFT } from './playerModel';
import { Server } from './serverModel';
import { LeagueGame, TFTGame } from './gameModel';

const initDB = async (): Promise<void> => {
	try {
		// force: true réinitialise la DB à chaque exécution
		await sequelize.sync({ force: false });
		logger.info('📦 Database synced');

		await backfillQueueTables();
	} catch (error) {
		logger.error('❌ Failed to sync the database:', error);
	}
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
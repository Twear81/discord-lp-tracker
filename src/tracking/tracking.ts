import { TextChannel } from 'discord.js';
import { getAllServer, listAllPlayerForSpecificServer, resetLastDayOfAllPlayer, getPlayerForQueueInfoForSpecificServer, listAllPlayerForQueueInfoForSpecificServer, updatePlayerGameNameAndTagLine, updatePlayerInfoCurrentAndLastForQueueType } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { getPlayerRankInfo, getTFTPlayerRankInfo, getAccountByPUUID } from '../riot/riotHelper';
import { client } from '../index';
import { GameQueueType } from './GameQueueType';
import { leagueGameProcessor, processGameType, tftGameProcessor } from './gameProcessors';
import { generatePlayerRecapInfo, sendRecapMessage } from './sendMessage';
import { isTimestampInRecapRange } from './util';
import logger from '../logger/logger';

export const trackPlayers = async (firstRun: boolean): Promise<void> => {
	logger.info('------------------------------------');
	logger.info(`🚀 Starting player tracking cycle. First run: ${firstRun}`);

	try {
		const servers = await getAllServer();
		logger.info(`Found ${servers.length} servers to process.`);

		for (const server of servers) {
			const players = await listAllPlayerForSpecificServer(server.serverid);
			if (players.length === 0) {
				logger.info(`No players to track on server ${server.serverid}.`);
				continue;
			}

			// Add classic game processor by default because is always active
			const gameProcessors: Promise<void>[] = [processGameType(server, players, leagueGameProcessor, firstRun)];

			if (server.tfttoggle == true) {
				gameProcessors.push(processGameType(server, players, tftGameProcessor, firstRun));
			}

			// Process League and TFT in parallel for the current server
			await Promise.all(gameProcessors);
		}
	} catch (error) {
		logger.error('❌ A fatal error occurred during the trackPlayer cycle:', error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to track players');
	}

	logger.info('✅ Player tracking cycle finished.');
	logger.info('------------------------------------');
};

export const initLastDayInfo = async (haveToResetLastDay: boolean): Promise<void> => {
	logger.info('🔄 Starting initLastDayInfo cycle...');
	try {
		if (haveToResetLastDay) {
			await resetLastDayOfAllPlayer();
			logger.info('✅ All players last day info has been reset.');
		}

		const servers = await getAllServer();

		for (const server of servers) {
			const players = await listAllPlayerForSpecificServer(server.serverid);
			if (players.length === 0) return;

			for (const player of players) {
				try {
					const playerAccount = await getAccountByPUUID(player.puuid, player.region);
					const leagueRanks = await getPlayerRankInfo(player.puuid, player.region);
					const tftRanks = await getTFTPlayerRankInfo(player.tftpuuid, player.region);

					if (!playerAccount || !leagueRanks || !tftRanks) {
						logger.error(`❌ Missing data for player ${player.puuid}.`);
						continue;
					}

					// Update name and tagline if necessary
					if (playerAccount && (playerAccount.gameName !== player.gameName || playerAccount.tagLine !== player.tagLine)) {
						logger.info(`✏️ Updating name for ${player.gameName}#${player.tagLine}...`);
						await updatePlayerGameNameAndTagLine(server.serverid, player.puuid, playerAccount.gameName!, playerAccount.tagLine!);
					}

					// Process both League and TFT ranks
					const combinedRanks = [...leagueRanks, ...tftRanks];

					for (const rankInfo of combinedRanks) {
						if (rankInfo.queueType in GameQueueType && rankInfo.leaguePoints !== undefined && rankInfo.rank !== undefined && rankInfo.tier !== undefined) {
							const queueType = GameQueueType[rankInfo.queueType as keyof typeof GameQueueType];
							const playerQueueInfo = await getPlayerForQueueInfoForSpecificServer(server.serverid, player.puuid, queueType);

							const shouldUpdate = playerQueueInfo.lastDayDate == null || !isTimestampInRecapRange(playerQueueInfo.lastDayDate.valueOf());
							logger.info(`Should update: ${shouldUpdate}, for rank ${rankInfo.rank} and tier ${rankInfo.tier} and ${rankInfo.leaguePoints} lp`);

							if (shouldUpdate) {
								updatePlayerInfoCurrentAndLastForQueueType(server.serverid, player.puuid, queueType, rankInfo.leaguePoints, rankInfo.rank, rankInfo.tier)
							}
						} else {
							logger.warn(`❌ Missing rank ou queue data for player ${player.puuid}.`);
						}
					}
				} catch (e) {
					logger.error(`❌  A fatal error occurred during initLastDayInfo for player: ${player.puuid} :`, e);
				}
			}
		}

		logger.info('✅ initLastDayInfo cycle finished successfully.');
	} catch (error) {
		logger.error('❌ A fatal error occurred during initLastDayInfo:', error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to initialize last day info');
	}
};

export const generateRecapOfTheDay = async (): Promise<void> => {
	logger.info('📝 Starting daily recap generation...');
	try {
		const servers = await getAllServer();
		for (const server of servers) {
			const currentServerID = server.serverid;
			const channel = await client.channels.fetch(server.channelid) as TextChannel;

			if (!channel) {
				logger.error(`❌ Failed to find channel with ID ${server.channelid} for server ${currentServerID}. Skipping recap.`);
				return;
			}

			const players = await listAllPlayerForSpecificServer(currentServerID);
			if (players.length === 0) {
				logger.info(`No players to send recap for on server ${currentServerID}.`);
				return;
			}

			// Define a function to process a specific queue type
			const processQueue = async (queueType: GameQueueType, enabled: boolean) => {
				if (!enabled) return;

				const playersQueueInfo = await listAllPlayerForQueueInfoForSpecificServer(currentServerID, queueType);
				const recapInfo = generatePlayerRecapInfo(players, playersQueueInfo);

				if (recapInfo.length > 0) {
					await sendRecapMessage(channel, recapInfo, queueType, server.lang);
				} else {
					logger.info(`No players with games found for ${GameQueueType[queueType]} on server ${currentServerID}.`);
				}
			};

			// Process all queue types in parallel
			await Promise.all([
				processQueue(GameQueueType.RANKED_SOLO_5x5, true), // SoloQ is always on
				processQueue(GameQueueType.RANKED_FLEX_SR, server.flextoggle),
				processQueue(GameQueueType.RANKED_TFT, server.tfttoggle),
				processQueue(GameQueueType.RANKED_TFT_DOUBLE_UP, server.tfttoggle)
			]);
		}

		logger.info('✅ Daily recap generation finished successfully.');
	} catch (error) {
		logger.error('❌ A fatal error occurred during recap generation:', error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to generate the recap');
	}
};
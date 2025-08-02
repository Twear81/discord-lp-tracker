import { TextChannel } from 'discord.js';
import { getAllServer, listAllPlayerForSpecificServer, resetLastDayOfAllPlayer, updatePlayerCurrentOrLastDayRank, updatePlayerLastDate, getPlayerForQueueInfoForSpecificServer, listAllPlayerForQueueInfoForSpecificServer, updatePlayerGameNameAndTagLine } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { getPlayerRankInfo, getTFTPlayerRankInfo, getAccountByPUUID } from '../riot/riotHelper';
import { client } from '../index';
import { GameQueueType } from './GameQueueType';
import { leagueFlexGameProcessor, leagueGameProcessor, processGameType, tftGameProcessor } from './gameProcessors';
import { generatePlayerRecapInfo, sendRecapMessage } from './sendMessage';
import { isTimestampInRecapRange } from './util';

export const trackPlayers = async (firstRun: boolean): Promise<void> => {
	console.log('------------------------------------');
    console.log(`🚀 Starting player tracking cycle. First run: ${firstRun}`);
    
    try {
        const servers = await getAllServer();
        console.log(`Found ${servers.length} servers to process.`);

        for (const server of servers) {
            const players = await listAllPlayerForSpecificServer(server.serverid);
            if (players.length === 0) {
                console.log(`No players to track on server ${server.serverid}.`);
                continue;
            }

            const gameProcessors: Promise<void>[] = [processGameType(server, players, leagueGameProcessor, firstRun)];
            if (server.flextoggle == true) {
                gameProcessors.push(processGameType(server, players, leagueFlexGameProcessor, firstRun));
            }
            if (server.tfttoggle == true) {
                gameProcessors.push(processGameType(server, players, tftGameProcessor, firstRun));
            }

            // Process League and TFT in parallel for the current server
            await Promise.all(gameProcessors);
        }
    } catch (error) {
        console.error('❌ A fatal error occurred during the trackPlayer cycle:', error);
        throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to track players');
    }
	
    console.log('✅ Player tracking cycle finished.');
    console.log('------------------------------------');
};

export const initLastDayInfo = async (haveToResetLastDay: boolean): Promise<void> => {
	console.log('🔄 Starting initLastDayInfo cycle...');
    try {
        if (haveToResetLastDay) {
            await resetLastDayOfAllPlayer();
            console.log('✅ All players last day info has been reset.');
        }

        const servers = await getAllServer();
        const serverPromises = servers.map(async (server) => {
            const players = await listAllPlayerForSpecificServer(server.serverid);
            if (players.length === 0) return;

            const playerUpdates = players.map(async (player) => {
                const [playerAccount, leagueRanks, tftRanks] = await Promise.all([
                    getAccountByPUUID(player.puuid, player.region).catch(e => {
                        console.error(`❌ Failed to get account for ${player.puuid}:`, e);
                        return null;
                    }),
                    getPlayerRankInfo(player.puuid, player.region).catch(e => {
                        console.error(`❌ Failed to get LoL ranks for ${player.gameName}:`, e);
                        return [];
                    }),
                    getTFTPlayerRankInfo(player.tftpuuid, player.region).catch(e => {
                        console.error(`❌ Failed to get TFT ranks for ${player.gameName}:`, e);
                        return [];
                    }),
                ]);

                // Update name and tagline if necessary
                if (playerAccount && (playerAccount.gameName !== player.gameName || playerAccount.tagLine !== player.tagLine)) {
                    console.log(`✏️ Updating name for ${player.gameName}#${player.tagLine}...`);
                    await updatePlayerGameNameAndTagLine(server.serverid, player.puuid, playerAccount.gameName!, playerAccount.tagLine!);
                }
                
                // Process both League and TFT ranks
                const combinedRanks = [...leagueRanks, ...tftRanks];
                
                return Promise.all(combinedRanks.map(async (rankInfo) => {
                    if (rankInfo.queueType in GameQueueType && rankInfo.leaguePoints !== undefined && rankInfo.rank !== undefined && rankInfo.tier !== undefined) {
                        const queueType = GameQueueType[rankInfo.queueType as keyof typeof GameQueueType];
                        const playerQueueInfo = await getPlayerForQueueInfoForSpecificServer(server.serverid, player.puuid, queueType);
                        
                        const shouldUpdate = playerQueueInfo.lastDayDate == null || !isTimestampInRecapRange(playerQueueInfo.lastDayDate.valueOf());

                        if (shouldUpdate) {
                            // Use a single function call to handle both current and lastDay updates
                            await updatePlayerCurrentOrLastDayRank(server.serverid, player.puuid, false, queueType, rankInfo.leaguePoints, rankInfo.rank, rankInfo.tier);
                            await updatePlayerCurrentOrLastDayRank(server.serverid, player.puuid, true, queueType, rankInfo.leaguePoints, rankInfo.rank, rankInfo.tier);
                            await updatePlayerLastDate(server.serverid, player.puuid, queueType, new Date());
                        }
                    }
                }));
            });

            await Promise.all(playerUpdates.flat());
        });

        await Promise.all(serverPromises);

        console.log('✅ initLastDayInfo cycle finished successfully.');
    } catch (error) {
        console.error('❌ A fatal error occurred during initLastDayInfo:', error);
        throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to initialize last day info');
    }
};

export const generateRecapOfTheDay = async (): Promise<void> => {
	console.log('📝 Starting daily recap generation...');
    try {
        const servers = await getAllServer();
        const recapPromises = servers.map(async (server) => {
            const currentServerID = server.serverid;
            const channel = await client.channels.fetch(server.channelid) as TextChannel;
            
            if (!channel) {
                console.error(`❌ Failed to find channel with ID ${server.channelid} for server ${currentServerID}. Skipping recap.`);
                return;
            }

            const players = await listAllPlayerForSpecificServer(currentServerID);
            if (players.length === 0) {
                console.log(`No players to send recap for on server ${currentServerID}.`);
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
                    console.log(`No players with games found for ${GameQueueType[queueType]} on server ${currentServerID}.`);
                }
            };
            
            // Process all queue types in parallel
            await Promise.all([
                processQueue(GameQueueType.RANKED_SOLO_5x5, true), // SoloQ is always on
                processQueue(GameQueueType.RANKED_FLEX_SR, server.flextoggle),
                processQueue(GameQueueType.RANKED_TFT, server.tfttoggle),
                processQueue(GameQueueType.RANKED_TFT_DOUBLE_UP, server.tfttoggle)
            ]);
        });
        
        await Promise.all(recapPromises);
        
        console.log('✅ Daily recap generation finished successfully.');
    } catch (error) {
        console.error('❌ A fatal error occurred during recap generation:', error);
        throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to generate the recap');
    }
};
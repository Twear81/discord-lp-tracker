import { TextChannel } from 'discord.js';
import { updatePlayerLastGameId, updatePlayerCurrentOrLastDayRank, PlayerInfo, updatePlayerLastDayWinLose, getPlayerForQueueInfoForSpecificServer, ServerInfo } from '../database/databaseHelper';
import { getLeagueGameDetailForCurrentPlayer, getLastRankedLeagueMatch, getLastTFTMatch, getPlayerRankInfo, getTFTGameDetailForCurrentPlayer, getTFTPlayerRankInfo, PlayerTFTGameInfo, PlayerLeagueGameInfo } from '../riot/riotHelper';
import { client } from '../index';
import { GameQueueType, ManagedGameQueueType } from './GameQueueType';
import { sendLeagueGameResultMessage, sendTFTGameResultMessage } from './sendMessage';
import { calculateLPDifference, isTimestampInRecapRange } from './util';

async function handleNewLeagueGame(server: ServerInfo, player: PlayerInfo, matchId: string, firstRun: boolean): Promise<void> {
    console.log(`➡️ [League] New match ${matchId} found for player ${player.gameName}#${player.tagLine} on server ${server.serverid}.`);

    // 1. Fetch game and rank details
    const gameDetails: PlayerLeagueGameInfo = await getLeagueGameDetailForCurrentPlayer(player.puuid, matchId, player.region, server.lang);
    const playerRankStats = await getPlayerRankInfo(player.puuid, player.region);

    // 2. Update database
    if (isTimestampInRecapRange(gameDetails.gameEndTimestamp)) {
        await updatePlayerLastDayWinLose(server.serverid, player.puuid, gameDetails.queueType, gameDetails.win);
    }

    const rankStat = playerRankStats.find(r => r.queueType === gameDetails.queueType);
    if (rankStat) {
        await updatePlayerCurrentOrLastDayRank(server.serverid, player.puuid, true, rankStat.queueType as GameQueueType, rankStat.leaguePoints, rankStat.rank, rankStat.tier);
    }

    await updatePlayerLastGameId(server.serverid, player.puuid, matchId, ManagedGameQueueType.LEAGUE);
    console.log(`[League] DB updated for player ${player.gameName} with match ${matchId}.`);

    // 3. Send notification if not the first run
    if (firstRun) {
        console.log(`[League] First run: skipping notification for ${player.gameName}.`);
        return;
    }

    const channel = await client.channels.fetch(server.channelid) as TextChannel;
    if (!channel) {
        console.error(`❌ [League] Failed to find channel with ID ${server.channelid} for server ${server.serverid}.`);
        return;
    }

    const playerQueueInfo = await getPlayerForQueueInfoForSpecificServer(server.serverid, player.puuid, gameDetails.queueType);

    const { currentRank, currentTier, currentLP, oldRank, oldTier, oldLP } = playerQueueInfo;
    let lpGain = 0;
    if (currentRank != null && oldRank != null) {
        lpGain = calculateLPDifference(oldRank, currentRank, oldTier!, currentTier!, oldLP!, currentLP!);
    }

    await sendLeagueGameResultMessage(
        channel,
        player.gameName,
        player.tagLine,
        gameDetails,
        currentRank ?? '',
        currentTier ?? 'Unranked',
        lpGain,
        currentLP ?? 0,
        player.region,
        matchId,
        gameDetails.customMessage,
        server.lang
    );
    console.log(`✅ [League] Notification sent to channel ${channel.id} for player ${player.gameName}.`);
}

async function handleNewTFTGame(server: ServerInfo, player: PlayerInfo, matchId: string, firstRun: boolean): Promise<void> {
    console.log(`➡️ [TFT] New match ${matchId} found for player ${player.gameName}#${player.tagLine} on server ${server.serverid}.`);

    // 1. Fetch game details and validate queue type
    const gameDetails: PlayerTFTGameInfo = await getTFTGameDetailForCurrentPlayer(player.tftpuuid, matchId, player.region);
    if (gameDetails.queueType !== GameQueueType.RANKED_TFT && gameDetails.queueType !== GameQueueType.RANKED_TFT_DOUBLE_UP) {
        console.log(`[TFT] Skipping non-ranked TFT match ${matchId} for player ${player.gameName}.`);
        return;
    }

    // 2. Update database
    const playerRankStats = await getTFTPlayerRankInfo(player.tftpuuid, player.region);
    if (isTimestampInRecapRange(gameDetails.gameEndTimestamp)) {
        await updatePlayerLastDayWinLose(server.serverid, player.tftpuuid, gameDetails.queueType, gameDetails.win);
    }

    const rankStat = playerRankStats.find(r => r.queueType === gameDetails.queueType);
    if (rankStat) {
        await updatePlayerCurrentOrLastDayRank(server.serverid, player.tftpuuid, true, rankStat.queueType as GameQueueType, rankStat.leaguePoints!, rankStat.rank!, rankStat.tier!);
    }

    await updatePlayerLastGameId(server.serverid, player.tftpuuid, matchId, ManagedGameQueueType.TFT);
    console.log(`[TFT] DB updated for player ${player.gameName} with match ${matchId}.`);

    // 3. Send notification
    if (firstRun) {
        console.log(`[TFT] First run: skipping notification for ${player.gameName}.`);
        return;
    }

    const channel = await client.channels.fetch(server.channelid) as TextChannel;
    if (!channel) {
        console.error(`❌ [TFT] Failed to find channel with ID ${server.channelid} for server ${server.serverid}.`);
        return;
    }

    const playerQueueInfo = await getPlayerForQueueInfoForSpecificServer(server.serverid, player.tftpuuid, gameDetails.queueType);
    const { currentRank, currentTier, currentLP, oldRank, oldTier, oldLP } = playerQueueInfo;
    let lpGain = 0;
    if (currentRank != null && oldRank != null) {
        lpGain = calculateLPDifference(oldRank, currentRank, oldTier!, currentTier!, oldLP!, currentLP!);
    }

    await sendTFTGameResultMessage(
        channel,
        player.gameName,
        player.tagLine,
        gameDetails,
        currentRank ?? '',
        currentTier ?? 'Unranked',
        lpGain,
        currentLP ?? 0,
        player.region,
        matchId,
        gameDetails.customMessage,
        server.lang
    );
    console.log(`✅ [TFT] Notification sent to channel ${channel.id} for player ${player.gameName}.`);
}

interface GameProcessor {
    gameName: 'League' | 'TFT';
    isEnabled(server: ServerInfo): boolean;
    getPUUID(player: PlayerInfo): string;
    getLastGameId(player: PlayerInfo): string | null;
    getLastMatches(puuid: string, region: string, options?: boolean): Promise<string[]>;
    handleNewGame(server: ServerInfo, player: PlayerInfo, matchId: string, firstRun: boolean): Promise<void>;
}

export const leagueGameProcessor: GameProcessor = {
    gameName: 'League',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isEnabled: (server) => true, // Always active
    getPUUID: (player) => player.puuid,
    getLastGameId: (player) => player.lastGameID,
    getLastMatches: (puuid, region, flexToggle) => getLastRankedLeagueMatch(puuid, region, flexToggle!),
    handleNewGame: handleNewLeagueGame,
};

export const tftGameProcessor: GameProcessor = {
    gameName: 'TFT',
    isEnabled: (server) => server.tfttoggle,
    getPUUID: (player) => player.tftpuuid,
    getLastGameId: (player) => player.lastTFTGameID,
    getLastMatches: (puuid, region) => getLastTFTMatch(puuid, region),
    handleNewGame: handleNewTFTGame,
};

export async function processGameType(server: ServerInfo, players: PlayerInfo[], processor: GameProcessor, firstRun: boolean): Promise<void> {
    if (!processor.isEnabled(server)) {
        return;
    }
    console.log(`ℹ️ Starting ${processor.gameName} tracking for server ${server.serverid}...`);

    const matchRequests = players.map(player => {
        const puuid = processor.getPUUID(player);
        if (!puuid) {
            return Promise.resolve({ player, matchIds: [] });
        }
        return processor.getLastMatches(puuid, player.region, server.flextoggle)
            .then(matchIds => ({ player, matchIds }))
            .catch(error => {
                console.error(`❌ Failed to fetch ${processor.gameName} matches for ${player.gameName}:`, error);
                return { player, matchIds: [] }; // Return empty result to not block others
            });
    });

    const results = await Promise.all(matchRequests);

    for (const result of results) {
        const { player, matchIds } = result;
        if (matchIds.length === 0) continue;

        const latestMatchId = matchIds[0];
        const lastGameIdInDb = processor.getLastGameId(player);

        if (latestMatchId !== lastGameIdInDb) {
            try {
                await processor.handleNewGame(server, player, latestMatchId, firstRun);
            } catch (error) {
                console.error(`❌❌ Critical error processing ${processor.gameName} match ${latestMatchId} for player ${player.gameName}:`, error);
            }
        }
    }
}


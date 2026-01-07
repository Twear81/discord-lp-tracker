import { TextChannel } from 'discord.js';
import { getAllServer, listAllPlayerForSpecificServer, getLeagueGamesForPlayerInMonth, getTFTGamesForPlayerInMonth } from '../database/databaseHelper';
import { GameQueueType } from './GameQueueType';
import { PlayerInfo } from '../database/databaseHelper';
import { client } from '../index';
import { sendLeagueMonthlyRecapMessage, sendTFTMonthlyRecapMessage } from './sendMessage';
import logger from '../logger/logger';

export interface MonthlyRecapStats {
	player: PlayerInfo;
	totalGames: number;
	totalTimePlayed: number; // in seconds
	totalLPGain: number;
	totalCS?: number;
	totalPing?: number;
	wins: number;
	losses: number;
	winrate: number;
	averageKDA?: {
		kills: number;
		deaths: number;
		assists: number;
	};
	averageDamage?: number;
	averageCSPerMin?: number;
	averageVisionPerMin?: number;
	averagePlacement?: number;
	averageLevel?: number;
}

export const generateMonthlyRecap = async (month: number, year: number): Promise<void> => {
	logger.info(`📊 Starting monthly recap generation for ${month}/${year}...`);
	
	try {
		const servers = await getAllServer();
		
		for (const server of servers) {
			const currentServerID = server.serverid;
			const channel = await client.channels.fetch(server.channelid) as TextChannel;

			if (!channel) {
				logger.error(`❌ Failed to find channel with ID ${server.channelid} for server ${currentServerID}. Skipping monthly recap.`);
				return;
			}

			const players = await listAllPlayerForSpecificServer(currentServerID);
			if (players.length === 0) {
				logger.info(`No players to send monthly recap for on server ${currentServerID}.`);
				return;
			}

			// Generate monthly recap for each queue type
			// --- LEAGUE OF LEGENDS RECAPS ---
			// SoloQ & Flex (Classé)
			await generateLeagueMonthlyRecap(channel, players, month, year, server.lang, GameQueueType.RANKED_SOLO_5x5);
			await generateLeagueMonthlyRecap(channel, players, month, year, server.lang, GameQueueType.RANKED_FLEX_SR);

			// Modes Normaux & Spéciaux (Si tu souhaites suivre l'activité ARAM/Arena)
			await generateLeagueMonthlyRecap(channel, players, month, year, server.lang, GameQueueType.ARAM);
			await generateLeagueMonthlyRecap(channel, players, month, year, server.lang, GameQueueType.ARENA);
			await generateLeagueMonthlyRecap(channel, players, month, year, server.lang, GameQueueType.NORMAL_QUICKPLAY);
			await generateLeagueMonthlyRecap(channel, players, month, year, server.lang, GameQueueType.URF);


			// --- TFT RECAPS ---
			// Standard & Double Up (Classé)
			await generateTFTMonthlyRecap(channel, players, month, year, server.lang, GameQueueType.RANKED_TFT);
			await generateTFTMonthlyRecap(channel, players, month, year, server.lang, GameQueueType.RANKED_TFT_DOUBLE_UP);

			// Autres modes TFT
			await generateTFTMonthlyRecap(channel, players, month, year, server.lang, GameQueueType.TFT_HYPER_ROLL);
			await generateTFTMonthlyRecap(channel, players, month, year, server.lang, GameQueueType.TFT_CHONCCS_TREASURE);
			await generateTFTMonthlyRecap(channel, players, month, year, server.lang, GameQueueType.TFT_SET_REVIVAL);
		}

		logger.info(`✅ Monthly recap generation finished successfully.`);
	} catch (error) {
		logger.error(`❌ A fatal error occurred during monthly recap generation:`, error);
		throw error;
	}
};

const generateLeagueMonthlyRecap = async (
	channel: TextChannel,
	players: PlayerInfo[],
	month: number,
	year: number,
	lang: string,
	queueType: GameQueueType
): Promise<void> => {
	const playerStats: MonthlyRecapStats[] = [];

	for (const player of players) {
		const games = await getLeagueGamesForPlayerInMonth(player.id, month, year);
		
		// Filter games by queue type
		const filteredGames = games.filter(game => game.queueType === queueType.toString());
		
		if (filteredGames.length === 0) continue;

		const stats = calculateLeagueStats(filteredGames);
		playerStats.push({
			player,
			...stats,
		});
	}

	if (playerStats.length === 0) {
		logger.info(`No League games found for ${queueType} in ${month}/${year}.`);
		return;
	}

	// Sort by LP gain
	playerStats.sort((a, b) => b.totalLPGain - a.totalLPGain);

	await sendLeagueMonthlyRecapMessage(channel, playerStats, month, year, queueType, lang);
};

const generateTFTMonthlyRecap = async (
	channel: TextChannel,
	players: PlayerInfo[],
	month: number,
	year: number,
	lang: string,
	queueType: GameQueueType
): Promise<void> => {
	const playerStats: MonthlyRecapStats[] = [];

	for (const player of players) {
		const games = await getTFTGamesForPlayerInMonth(player.id, month, year);
		
		// Filter games by queue type
		const filteredGames = games.filter(game => game.queueType === queueType.toString());
		
		if (filteredGames.length === 0) continue;

		const stats = calculateTFTStats(filteredGames);
		playerStats.push({
			player,
			...stats,
		});
	}

	if (playerStats.length === 0) {
		logger.info(`No TFT games found for ${queueType} in ${month}/${year}.`);
		return;
	}

	// Sort by LP gain
	playerStats.sort((a, b) => b.totalLPGain - a.totalLPGain);

	await sendTFTMonthlyRecapMessage(channel, playerStats, month, year, queueType, lang);
};

const calculateLeagueStats = (games: any[]): Omit<MonthlyRecapStats, 'player'> => {
	const totalGames = games.length;
	const totalTimePlayed = games.reduce((sum, game) => sum + game.gameDurationSeconds, 0);
	const totalLPGain = games.reduce((sum, game) => sum + (game.lpGain || 0), 0);
	const wins = games.filter(game => game.win).length;
	const losses = totalGames - wins;
	const winrate = (wins / totalGames) * 100;

	const totalKills = games.reduce((sum, game) => sum + game.kills, 0);
	const totalDeaths = games.reduce((sum, game) => sum + game.deaths, 0);
	const totalAssists = games.reduce((sum, game) => sum + game.assists, 0);
	const totalDamage = games.reduce((sum, game) => sum + game.damage, 0);
	const totalCS = games.reduce((sum, game) => sum + game.totalCS, 0);
	const totalPing = games.reduce((sum, game) => sum + game.pings, 0);
	const totalVision = games.reduce((sum, game) => sum + game.visionScore, 0);

	const averageKDA = {
		kills: totalKills / totalGames,
		deaths: totalDeaths / totalGames,
		assists: totalAssists / totalGames,
	};

	const averageDamage = totalDamage / totalGames;
	const averageCSPerMin = totalCS / (totalTimePlayed / 60);
	const averageVisionPerMin = totalVision / (totalTimePlayed / 60);

	return {
		totalGames,
		totalTimePlayed,
		totalLPGain,
		totalCS,
		totalPing,
		wins,
		losses,
		winrate,
		averageKDA,
		averageDamage,
		averageCSPerMin,
		averageVisionPerMin,
	};
};

const calculateTFTStats = (games: any[]): Omit<MonthlyRecapStats, 'player'> => {
	const totalGames = games.length;
	const totalTimePlayed = games.reduce((sum, game) => sum + game.gameDurationSeconds, 0);
	const totalLPGain = games.reduce((sum, game) => sum + (game.lpGain || 0), 0);
	const wins = games.filter(game => game.win).length;
	const losses = totalGames - wins;
	const winrate = (wins / totalGames) * 100;

	const totalPlacement = games.reduce((sum, game) => sum + game.placement, 0);
	const totalLevel = games.reduce((sum, game) => sum + game.level, 0);

	const averagePlacement = totalPlacement / totalGames;
	const averageLevel = totalLevel / totalGames;

	return {
		totalGames,
		totalTimePlayed,
		totalLPGain,
		wins,
		losses,
		winrate,
		averagePlacement,
		averageLevel,
	};
};

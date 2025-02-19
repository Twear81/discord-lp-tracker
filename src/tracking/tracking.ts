import { EmbedBuilder, TextChannel } from 'discord.js';
import { getAllServer, listAllPlayerForSpecificServer, resetLastDayOfAllPlayer, updatePlayerLastGameId, updatePlayerCurrentOrLastDayRank, updatePlayerLastDate, getPlayerForSpecificServer } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { getGameDetailForCurrentPlayer, getLastMatch, getPlayerRankInfo, PlayerGameInfo } from '../riot/riotHelper';
import { client } from '../index';

export const trackPlayer = async (firstRun: boolean): Promise<void> => {
	try {
		// Get all the servers
		const servers = await getAllServer();

		for (const server of servers) {
			const currentServerID = server.serverid;
			const currentServerFlexTracker = server.flextoggle;
			// Get all the players for the current server
			const players = await listAllPlayerForSpecificServer(currentServerID);

			// Get match history for each players
			const matchRequests = players.map(async (player) => {
				const matchIds = await getLastMatch(player.puuid, player.region, currentServerFlexTracker);
				return { player, matchIds };
			});
			const results = await Promise.all(matchRequests.filter(req => req !== null));
			// Check if there is a new game to notify
			for (const result of results) {
				if (!result) continue;
				const { player, matchIds } = result;
				if (player.lastGameID != matchIds[0]) { // New game detected
					// Get game details
					const currentGameIdWithRegion = matchIds[0]; // example -> EUW1_7294524077
					const gameDetailForThePlayer: PlayerGameInfo = await getGameDetailForCurrentPlayer(player.puuid, currentGameIdWithRegion, player.region);
					// Get current player rank info
					const playerRankStats = await getPlayerRankInfo(player.puuid, player.region);

					// Update current player rank
					const currentQueueType = gameDetailForThePlayer.isFlex ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5";
					for (const playerRankStat of playerRankStats) {
						if (playerRankStat.queueType === currentQueueType) {
							const queueType = playerRankStat.queueType;
							const leaguePoints = playerRankStat.leaguePoints;
							const rank = playerRankStat.rank;
							const tier = playerRankStat.tier;
							// Update inside database
							const isCurrent = true;
							await updatePlayerCurrentOrLastDayRank(currentServerID, player.puuid, isCurrent, queueType, leaguePoints, rank, tier);
						}
					}
					// Update last game inside database
					await updatePlayerLastGameId(currentServerID, player.puuid, currentGameIdWithRegion);

					// Send the notification to the specified channel
					if (firstRun == true) {
						// don't notify
						console.log("first run, don't notify");
					} else {
						// Create the message with game detail
						const updatePlayer = await getPlayerForSpecificServer(currentServerID, player.puuid);
						const channel = (await client.channels.fetch(server.channelid)) as TextChannel;
						if (channel != null) {
							let rank = null;
							let tier = null;
							let lpGain = 0;
							if (gameDetailForThePlayer.isFlex == true) {
								if (updatePlayer.currentFlexRank != null && updatePlayer.currentFlexTier != null && updatePlayer.currentFlexLP != null) {
									rank = updatePlayer.currentFlexRank;
									tier = updatePlayer.currentFlexTier;
									if (updatePlayer.oldFlexRank !== null && updatePlayer.oldFlexTier !== null && updatePlayer.oldFlexLP !== null) {
										lpGain = calculateLPDifference(updatePlayer.oldFlexRank, updatePlayer.currentFlexRank, updatePlayer.oldFlexTier, updatePlayer.currentFlexTier, updatePlayer.oldFlexLP, updatePlayer.currentFlexLP);
									}
								}
							} else {
								if (updatePlayer.currentSoloQRank != null && updatePlayer.currentSoloQTier != null && updatePlayer.currentSoloQLP != null) {
									rank = updatePlayer.currentSoloQRank;
									tier = updatePlayer.currentSoloQTier;
									if (updatePlayer.oldSoloQRank !== null && updatePlayer.oldSoloQTier !== null && updatePlayer.oldSoloQLP !== null) {
										lpGain = calculateLPDifference(updatePlayer.oldSoloQRank, updatePlayer.currentSoloQRank, updatePlayer.oldSoloQTier, updatePlayer.currentSoloQTier, updatePlayer.oldSoloQLP, updatePlayer.currentSoloQLP);
									}
								}
							}
							sendGameResultMessage(channel, player.accountnametag, gameDetailForThePlayer, rank!, tier!, lpGain!, player.region, currentGameIdWithRegion, server.lang);
						} else {
							console.error('❌ Failed send the message, can`t find the channel');
						}
					}
				}
			}
		}
	} catch (error) {
		console.error('❌ Failed to track players :', error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to track players');
	}
};

export const sendGameResultMessage = async (channel: TextChannel, playerName: string, gameInfo: PlayerGameInfo, rank: string, tier: string, lpChange: number, region: string, gameIdWithRegion: string, lang: string): Promise<void> => {
	const translations = {
		fr: {
			title: "[📜 Résultat de partie ]",
			win: "Victoire",
			loss: "Défaite",
			lpChange: lpChange > 0 ? "gagner" : "perdre",
			league: "point(s) de ligue",
			score: "Score",
			champion: "Champion",
			queue: "File",
			queueType: gameInfo.isFlex ? "Flex" : "Solo/Duo", // TODO fix
			timestamp: "Date"
		},
		en: {
			title: "[📜 Match Result ]",
			win: "Victory",
			loss: "Defeat",
			lpChange: lpChange > 0 ? "gained" : "lost",
			league: "league point(s)",
			score: "Score",
			champion: "Champion",
			queue: "Queue",
			queueType: gameInfo.isFlex ? "Flex" : "Solo/Duo",
			timestamp: "Date"
		}
	};

	const t = translations[lang as keyof typeof translations];

	const currentGameId = gameIdWithRegion.split("_")[1];
	const matchUrl = `https://www.leagueofgraphs.com/match/${region.toLocaleLowerCase()}/${currentGameId}`;

	const embed = new EmbedBuilder()
		.setColor(gameInfo.win ? '#00FF00' : '#FF0000') // grean if win, Red if loose
		.setTitle(t.title)
		.setURL(matchUrl)
		.setDescription(`**${gameInfo.win ? t.win : t.loss}**\n\n${playerName} vient de ${t.lpChange} ${Math.abs(lpChange)} ${t.league} ! **(${tier} ${rank})**`)
		.addFields(
			{ name: t.score, value: `${gameInfo.kills}/${gameInfo.deaths}/${gameInfo.assists}`, inline: true },
			{ name: t.champion, value: gameInfo.championName, inline: true },
			{ name: t.queue, value: t.queueType, inline: true }
		)
		.setThumbnail(`https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/${gameInfo.championName}.png`)
		.setFooter({ text: `${t.timestamp}: ${new Date().toLocaleString()}` });

	await channel.send({ embeds: [embed] });
}

export const initLastDayInfo = async (haveToResetLastDay: boolean): Promise<void> => {
	try {
		// Get the current date
		const currentDate = new Date();

		if (haveToResetLastDay == true) {
			// Reset all players last day info
			await resetLastDayOfAllPlayer();
		}

		// Update all player info
		// Get all the servers
		const servers = await getAllServer();

		for (const server of servers) {
			const currentServerID = server.serverid;
			// Get all the players for the current server
			const players = await listAllPlayerForSpecificServer(currentServerID);

			// Get player rank info for each players
			const playerRankStats = players.map(async (player) => {
				const playerRankInfos = await getPlayerRankInfo(player.puuid, player.region);
				return { player, playerRankInfos };
			});
			const results = await Promise.all(playerRankStats.filter(req => req !== null));
			for (const result of results) {
				if (!result) continue;
				const { player, playerRankInfos } = result;
				for (const playerRankStat of playerRankInfos) {
					const queueType = playerRankStat.queueType;
					const leaguePoints = playerRankStat.leaguePoints;
					const rank = playerRankStat.rank;
					const tier = playerRankStat.tier;
					// Update inside database
					const isCurrent = false;
					await updatePlayerCurrentOrLastDayRank(currentServerID, player.puuid, isCurrent, queueType, leaguePoints, rank, tier);
				}
				// Update the date inside last day player
				await updatePlayerLastDate(currentServerID, player.puuid, currentDate);
			}
		}
	} catch (error) {
		console.error('❌ Failed to track players :', error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to track players');
	}
};

const calculateLPDifference = (beforeRank: string, afterRank: string, beforeTier: string, afterTier: string, beforeLP: number, afterLP: number): number => {
	const tierOrder: string[] = ["IV", "III", "II", "I"];
    if (beforeRank !== afterRank || beforeTier !== afterTier) {
        // Handle promotion or demotion properly
        if (tierOrder.indexOf(beforeTier) < tierOrder.indexOf(afterTier)) {
            // Promotion: LP resets, difference is just the new LP
            return afterLP;
        } else {
            // Demotion: Assume LP was reset at 0 before dropping
            return afterLP - 100;
        }
    }
    return afterLP - beforeLP;
};
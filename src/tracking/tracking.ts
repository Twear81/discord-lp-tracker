import { EmbedBuilder, TextChannel } from 'discord.js';
import { getAllServer, listAllPlayerForSpecificServer, resetLastDayOfAllPlayer, updatePlayerLastGameId, updatePlayerCurrentOrLastDayRank, updatePlayerLastDate, getPlayerForSpecificServer, PlayerInfo, updatePlayerLastDayWinLose } from '../database/databaseHelper';
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
					if (isTimestampInRecapRange(gameDetailForThePlayer.gameEndTimestamp) == true) {
						console.log("Update Win/lose");
						await updatePlayerLastDayWinLose(currentServerID, player.puuid, currentQueueType, gameDetailForThePlayer.win); // Update win/lose
					}
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
							let rank = "";
							let tier = "Unranked";
							let lpGain = 0;
							let updatedLP = 0;
							if (gameDetailForThePlayer.isFlex == true) {
								if (updatePlayer.currentFlexRank != null && updatePlayer.currentFlexTier != null && updatePlayer.currentFlexLP != null) {
									rank = updatePlayer.currentFlexRank;
									tier = updatePlayer.currentFlexTier;
									updatedLP = updatePlayer.currentFlexLP;
									if (updatePlayer.oldFlexRank !== null && updatePlayer.oldFlexTier !== null && updatePlayer.oldFlexLP !== null) {
										lpGain = calculateLPDifference(updatePlayer.oldFlexRank, updatePlayer.currentFlexRank, updatePlayer.oldFlexTier, updatePlayer.currentFlexTier, updatePlayer.oldFlexLP, updatePlayer.currentFlexLP);
									}
								}
							} else {
								if (updatePlayer.currentSoloQRank != null && updatePlayer.currentSoloQTier != null && updatePlayer.currentSoloQLP != null) {
									rank = updatePlayer.currentSoloQRank;
									tier = updatePlayer.currentSoloQTier;
									updatedLP = updatePlayer.currentSoloQLP;
									if (updatePlayer.oldSoloQRank !== null && updatePlayer.oldSoloQTier !== null && updatePlayer.oldSoloQLP !== null) {
										lpGain = calculateLPDifference(updatePlayer.oldSoloQRank, updatePlayer.currentSoloQRank, updatePlayer.oldSoloQTier, updatePlayer.currentSoloQTier, updatePlayer.oldSoloQLP, updatePlayer.currentSoloQLP);
									}
								}
							}
							sendGameResultMessage(channel, player.accountnametag, gameDetailForThePlayer, rank!, tier!, lpGain!, updatedLP, player.region, currentGameIdWithRegion, gameDetailForThePlayer.customMessage, server.lang);
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

export const sendGameResultMessage = async (channel: TextChannel, playerName: string, gameInfo: PlayerGameInfo, rank: string, tier: string, lpChange: number, updatedLP: number, region: string, gameIdWithRegion: string, customMessage: string | undefined, lang: string): Promise<void> => {
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
			timestamp: "Date",
			date: new Date().toLocaleString("fr-FR", {
				year: "numeric",
				month: "long",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				timeZone: "Europe/Paris",
			})
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
			timestamp: "Date",
			date: new Date().toLocaleString("en-GB", {
				year: "numeric",
				month: "long",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				timeZone: "Europe/London", // Change selon ton besoin
			}).replace(",", " at")
		}
	};

	const t = translations[lang as keyof typeof translations];

	const currentGameId = gameIdWithRegion.split("_")[1];
	const matchUrl = `https://www.leagueofgraphs.com/match/${region.toLocaleLowerCase()}/${currentGameId}`;

	const embed = new EmbedBuilder()
		.setColor(gameInfo.win ? '#00FF00' : '#FF0000') // grean if win, Red if loose
		.setTitle(t.title)
		.setURL(matchUrl)
		.setDescription(`**${gameInfo.win ? t.win : t.loss}**\n\n${playerName} vient de ${t.lpChange} ${Math.abs(lpChange)} ${t.league} ! **(${tier} ${rank} / ${updatedLP} lp)**`)
		.addFields(
			{ name: t.score, value: `${gameInfo.kills}/${gameInfo.deaths}/${gameInfo.assists}`, inline: true },
			{ name: t.champion, value: gameInfo.championName, inline: true },
			{ name: t.queue, value: t.queueType, inline: true },
			{ name: '', value: customMessage ? "*" + customMessage + "*" : "" }
		)
		.setThumbnail(`https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/${gameInfo.championName}.png`)
		.setFooter({ text: `${t.timestamp}: ${t.date}` });

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
					let isCurrent = false;
					await updatePlayerCurrentOrLastDayRank(currentServerID, player.puuid, isCurrent, queueType, leaguePoints, rank, tier);
					isCurrent = true;
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
	const rankOrder: string[] = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINIUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
	const tierOrder: string[] = ["IV", "III", "II", "I"];
	if (beforeRank === null || beforeTier === null || beforeLP === null) {
		return 0; // If previous rank info is null, return 0
	}

	const oldRankIndex = rankOrder.indexOf(beforeRank);
	const currentRankIndex = rankOrder.indexOf(afterRank);
	const oldTierIndex = tierOrder.indexOf(beforeTier);
	const currentTierIndex = tierOrder.indexOf(afterTier);

	if (oldRankIndex < currentRankIndex || (oldRankIndex === currentRankIndex && oldTierIndex < currentTierIndex)) {
		// Promotion: LP resets, calculate LP difference correctly
		return afterLP + (100 - beforeLP) + (currentRankIndex - oldRankIndex) * 400 + (currentTierIndex - oldTierIndex) * 100;
	} else if (oldRankIndex > currentRankIndex || (oldRankIndex === currentRankIndex && oldTierIndex > currentTierIndex)) {
		// Demotion: Assume LP was reset before dropping
		return afterLP - (beforeLP + (oldRankIndex - currentRankIndex) * 400 + (oldTierIndex - currentTierIndex) * 100);
	}
	return afterLP - beforeLP;
};

export const generateRecapOfTheDay = async (): Promise<void> => {
	try {
		// Get all the servers
		const servers = await getAllServer();

		for (const server of servers) {
			const currentServerID = server.serverid;
			// Get all the players for the current server
			const players = await listAllPlayerForSpecificServer(currentServerID);
			const channel = (await client.channels.fetch(server.channelid)) as TextChannel;

			if (channel != null) {
				// Flex part
				if (server.flextoggle == true) {
					const flexChanges: PlayerRecapInfo[] = players.filter(player => player.lastDayFlexWin != null && player.lastDayFlexLose != null && player.lastDayFlexRank != null && player.currentFlexRank != null && player.lastDayFlexTier != null && player.currentFlexTier != null && player.lastDayFlexLP != null && player.currentFlexLP != null) // Remove entries with no win/lose or unranked (didn't play)
						.map<PlayerRecapInfo>(player => (
							{
								player,
								lpChange: calculateLPDifference(player.lastDayFlexRank!, player.currentFlexRank!, player.lastDayFlexTier!, player.currentFlexTier!, player.lastDayFlexLP!, player.currentFlexLP!)
							}
						))
						.sort((a, b) => b.lpChange - a.lpChange);
					const isFlex = true;
					await sendRecapMessage(channel, flexChanges, isFlex, server.lang);
				}

				// Soloq part
				const soloQChanges: PlayerRecapInfo[] = players.filter(player => player.lastDaySoloQWin != null && player.lastDaySoloQLose != null && player.lastDaySoloQRank != null && player.currentSoloQRank != null && player.lastDaySoloQTier != null && player.currentSoloQTier != null && player.lastDaySoloQLP != null && player.currentSoloQLP != null) // Remove entries with no win/lose or unranked (didn't play)
					.map<PlayerRecapInfo>(player => (
						{
							player,
							lpChange: calculateLPDifference(player.lastDaySoloQRank!, player.currentSoloQRank!, player.lastDaySoloQTier!, player.currentSoloQTier!, player.lastDaySoloQLP!, player.currentSoloQLP!)
						}
					))
					.sort((a, b) => b.lpChange - a.lpChange);
				const isFlex = false;
				await sendRecapMessage(channel, soloQChanges, isFlex, server.lang);
			} else {
				console.error('❌ Failed send the message, can`t find the channel');
			}

		}
	} catch (error) {
		console.error('❌ Failed to generate the recap :', error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to generate the recap');
	}
};

const sendRecapMessage = async (channel: TextChannel, playerRecapInfos: PlayerRecapInfo[], isFlex: boolean, lang: string): Promise<void> => {
	if (playerRecapInfos.length > 0) {
		const translations = {
			fr: {
				title: isFlex ? "[📊 Résumé Quotidien Flex]" : "[📈 Résumé Quotidien SoloQ]",
				league: "LP",
				wins: "Victoires",
				losses: "Défaites",
				from: "De",
				to: "À"
			},
			en: {
				title: isFlex ? "[📊 Flex Daily Recap]" : "[📈 SoloQ Daily Recap]",
				league: "LP",
				wins: "Wins",
				losses: "Losses",
				from: "From",
				to: "To"
			}
		};

		const t = translations[lang as keyof typeof translations];

		const embed = new EmbedBuilder()
			.setTitle(t.title)
			.setColor(isFlex ? 'Purple' : 'Blue')
			.setDescription(
				playerRecapInfos.map(entry => {
					const { accountnametag, currentSoloQTier, currentSoloQRank, currentFlexTier, currentFlexRank, lastDaySoloQTier, lastDaySoloQRank, lastDayFlexTier, lastDayFlexRank, lastDaySoloQWin, lastDaySoloQLose, lastDayFlexWin, lastDayFlexLose, lastDayFlexLP, lastDaySoloQLP, currentFlexLP, currentSoloQLP } = entry.player;
					const tier = isFlex ? currentFlexTier : currentSoloQTier;
					const rank = isFlex ? currentFlexRank : currentSoloQRank;
					const lastTier = isFlex ? lastDayFlexTier : lastDaySoloQTier;
					const lastRank = isFlex ? lastDayFlexRank : lastDaySoloQRank;
					const wins = isFlex ? lastDayFlexWin : lastDaySoloQWin;
					const losses = isFlex ? lastDayFlexLose : lastDaySoloQLose;
					const lastLP = isFlex ? lastDayFlexLP : lastDaySoloQLP;
					const currentLP = isFlex ? currentFlexLP : currentSoloQLP;
					return `**${accountnametag} : ${entry.lpChange > 0 ? '+' : ''}${entry.lpChange} ${t.league}**  
						🏆 ${t.wins}: **${wins}** | ❌ ${t.losses}: **${losses}** 
						${t.from}: **${lastTier} ${lastRank} ${lastLP}** ➡️ ${t.to}: **${tier} ${rank} ${currentLP}**`;
				}).join('\n\n')
			);

		await channel.send({ embeds: [embed] });
	} else {
		console.log("No player did a game during this last 24 hours.");
	}
};

function isTimestampInRecapRange(timestamp: number): boolean {
	// Convert timestamp to milliseconds if it's in seconds
	if (timestamp < 1e12) {
		timestamp *= 1000; // Convert from seconds to milliseconds
	}

	const now = new Date();

	// Set 08:33 AM today
	const today8AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 33, 0, 0);

	// Manage the last day
	if (now.getHours() < 7 || (now.getHours() === 7 && now.getMinutes() < 33)) {
        today8AM.setDate(today8AM.getDate() - 1);
    }

	// Check if the timestamp falls within the range
	return timestamp >= today8AM.getTime();
}

interface PlayerRecapInfo {
	player: PlayerInfo;
	lpChange: number;
}
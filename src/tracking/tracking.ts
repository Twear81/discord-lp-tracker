import { EmbedBuilder, TextChannel } from 'discord.js';
import { getAllServer, listAllPlayerForSpecificServer, resetLastDayOfAllPlayer, updatePlayerLastGameId, updatePlayerCurrentOrLastDayRank, updatePlayerLastDate, PlayerInfo, updatePlayerLastDayWinLose, getPlayerForQueueInfoForSpecificServer, PlayerForQueueInfo, listAllPlayerForQueueInfoForSpecificServer } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { getLeagueGameDetailForCurrentPlayer, getLastRankedLeagueMatch, getLastTFTMatch, getPlayerRankInfo, PlayerLeagueGameInfo, getTFTGameDetailForCurrentPlayer, PlayerTFTGameInfo, getTFTPlayerRankInfo } from '../riot/riotHelper';
import { client } from '../index';
import { GameQueueType, ManagedGameQueueType } from './GameQueueType';

export const trackPlayer = async (firstRun: boolean): Promise<void> => {
	try {
		// Get all the servers
		const servers = await getAllServer();

		for (const server of servers) {
			const currentServerID = server.serverid;
			const currentServerFlexTracker = server.flextoggle;
			const currentServerTFTTracker = server.tfttoggle;
			// Get all the players for the current server
			const players = await listAllPlayerForSpecificServer(currentServerID);

			// LEAGUE PART
			// Get match history for each players
			const matchRequests = players.map(async (player) => {
				const matchIds = await getLastRankedLeagueMatch(player.puuid, player.region, currentServerFlexTracker);
				return { player, matchIds };
			});
			const leagueResults = await Promise.all(matchRequests.filter(req => req !== null));
			// Check if there is a new game to notify
			for (const result of leagueResults) {
				if (!result) continue;
				const { player, matchIds } = result;
				if (matchIds.length > 0 && player.lastGameID != matchIds[0]) { // New game detected
					// Get game details
					const currentGameIdWithRegion = matchIds[0]; // example -> EUW1_7294524077
					const gameDetailForThePlayer: PlayerLeagueGameInfo = await getLeagueGameDetailForCurrentPlayer(player.puuid, currentGameIdWithRegion, player.region);
					// Get current player rank info
					const playerRankStats = await getPlayerRankInfo(player.puuid, player.region);
					// Update current player rank
					const currentQueueType = gameDetailForThePlayer.queueType;
					if (isTimestampInRecapRange(gameDetailForThePlayer.gameEndTimestamp) == true) {
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
					await updatePlayerLastGameId(currentServerID, player.puuid, currentGameIdWithRegion, ManagedGameQueueType.LEAGUE);

					// Send the notification to the specified channel
					if (firstRun == true) {
						// don't notify
						console.log("first run, don't notify");
					} else {
						// Create the message with game detail
						const playerForQueueInfo = await getPlayerForQueueInfoForSpecificServer(currentServerID, player.puuid, currentQueueType);
						const channel = (await client.channels.fetch(server.channelid)) as TextChannel;
						if (channel != null) {
							let rank = "";
							let tier = "Unranked";
							let lpGain = 0;
							let updatedLP = 0;
							if (playerForQueueInfo.currentRank != null && playerForQueueInfo.currentTier != null && playerForQueueInfo.currentLP != null) {
								rank = playerForQueueInfo.currentRank;
								tier = playerForQueueInfo.currentTier;
								updatedLP = playerForQueueInfo.currentLP;
								if (playerForQueueInfo.oldRank !== null && playerForQueueInfo.oldTier !== null && playerForQueueInfo.oldLP !== null) {
									lpGain = calculateLPDifference(playerForQueueInfo.oldRank, playerForQueueInfo.currentRank, playerForQueueInfo.oldTier, playerForQueueInfo.currentTier, playerForQueueInfo.oldLP, playerForQueueInfo.currentLP);
								}
							}
							sendLeagueGameResultMessage(channel, player.gameName, player.tagLine, gameDetailForThePlayer, rank, tier, lpGain, updatedLP, player.region, currentGameIdWithRegion, gameDetailForThePlayer.customMessage, server.lang);
						} else {
							console.error('❌ Failed send the message, can`t find the channel');
						}
					}
				}
			}

			// TFT PART
			if (currentServerTFTTracker == true) {
				// Get match history for each players
				const tftMatchRequests = players.map(async (player) => {
					const matchIds = await getLastTFTMatch(player.tftpuuid, player.region);
					return { player, matchIds };
				});
				const tftResults = await Promise.all(tftMatchRequests.filter(req => req !== null));
				// Check if there is a new game to notify
				for (const result of tftResults) {
					if (!result) continue;
					const { player, matchIds } = result;
					if (matchIds.length > 0 && player.lastTFTGameID != matchIds[0]) { // New game detected
						// Get game details
						const currentGameIdWithRegion = matchIds[0]; // example -> EUW1_7294524077
						const tftGameDetailForThePlayer: PlayerTFTGameInfo = await getTFTGameDetailForCurrentPlayer(player.tftpuuid, currentGameIdWithRegion, player.region);
						// Get current player rank info
						const playerRankStats = await getTFTPlayerRankInfo(player.tftpuuid, player.region);
						// Update current player rank
						const currentTFTQueueType = tftGameDetailForThePlayer.queueType;
						if (isTimestampInRecapRange(tftGameDetailForThePlayer.gameEndTimestamp) == true) {
							await updatePlayerLastDayWinLose(currentServerID, player.tftpuuid, currentTFTQueueType, tftGameDetailForThePlayer.win); // Update win/lose
						}
						for (const playerRankStat of playerRankStats) {
							if (playerRankStat.queueType === currentTFTQueueType) {
								const queueType = playerRankStat.queueType;
								const leaguePoints = playerRankStat.leaguePoints;
								const rank = playerRankStat.rank;
								const tier = playerRankStat.tier;
								// Update inside database
								const isCurrent = true;
								await updatePlayerCurrentOrLastDayRank(currentServerID, player.tftpuuid, isCurrent, queueType, leaguePoints!, rank!, tier!);
							}
						}
						// Update last game inside database
						await updatePlayerLastGameId(currentServerID, player.tftpuuid, currentGameIdWithRegion, ManagedGameQueueType.TFT);

						// Send the notification to the specified channel
						if (firstRun == true) {
							// don't notify
							console.log("first run, don't notify");
						} else {
							// Create the message with game detail
							const playerForQueueInfo = await getPlayerForQueueInfoForSpecificServer(currentServerID, player.tftpuuid, currentTFTQueueType);
							const channel = (await client.channels.fetch(server.channelid)) as TextChannel;
							if (channel != null) {
								let rank = "";
								let tier = "Unranked";
								let lpGain = 0;
								let updatedLP = 0;
								if (playerForQueueInfo.currentRank != null && playerForQueueInfo.currentTier != null && playerForQueueInfo.currentLP != null) {
									rank = playerForQueueInfo.currentRank;
									tier = playerForQueueInfo.currentTier;
									updatedLP = playerForQueueInfo.currentLP;
									if (playerForQueueInfo.oldRank !== null && playerForQueueInfo.oldTier !== null && playerForQueueInfo.oldLP !== null) {
										lpGain = calculateLPDifference(playerForQueueInfo.oldRank, playerForQueueInfo.currentRank, playerForQueueInfo.oldTier, playerForQueueInfo.currentTier, playerForQueueInfo.oldLP, playerForQueueInfo.currentLP);
									}
								}
								sendTFTGameResultMessage(channel, player.gameName, player.tagLine, tftGameDetailForThePlayer.placement, tftGameDetailForThePlayer.principalTrait, rank, tier, lpGain, updatedLP, player.region, currentGameIdWithRegion, tftGameDetailForThePlayer.customMessage, server.lang);
							} else {
								console.error('❌ Failed send the message, can`t find the channel');
							}
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

export const sendLeagueGameResultMessage = async (channel: TextChannel, gameName: string, tagline: string, gameInfo: PlayerLeagueGameInfo, rank: string, tier: string, lpChange: number, updatedLP: number, region: string, gameIdWithRegion: string, customMessage: string | undefined, lang: string): Promise<void> => {
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
			queueType: gameInfo.queueType == GameQueueType.RANKED_FLEX_SR ? "Flex" : "Solo/Duo", // TODO fix
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
			queueType: gameInfo.queueType == GameQueueType.RANKED_FLEX_SR ? "Flex" : "Solo/Duo",
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
		.setColor(gameInfo.win ? '#00FF00' : '#FF0000') // green if win, Red if loose
		.setTitle(t.title)
		.setURL(matchUrl)
		.setDescription(`**${gameInfo.win ? t.win : t.loss}**\n\n${gameName}#${tagline} vient de ${t.lpChange} ${Math.abs(lpChange)} ${t.league} ! **(${tier} ${rank} / ${updatedLP} lp)**`)
		.addFields(
			{ name: t.score, value: `${gameInfo.kills}/${gameInfo.deaths}/${gameInfo.assists}`, inline: true },
			{ name: t.champion, value: gameInfo.championName, inline: true },
			{ name: t.queue, value: t.queueType, inline: true },
			{ name: '', value: customMessage ? "*" + customMessage + "*" : "" }
		)
		.setThumbnail(`https://ddragon.leagueoflegends.com/cdn/15.7.1/img/champion/${gameInfo.championName}.png`)
		.setFooter({ text: `${t.timestamp}: ${t.date}` });

	await channel.send({ embeds: [embed] });
}

export const sendTFTGameResultMessage = async (channel: TextChannel, gameName: string, tagline: string, placement: number, mainTrait: string | null, rank: string, tier: string, lpChange: number, updatedLP: number, region: string, gameIdWithRegion: string, customMessage: string | undefined, lang: string): Promise<void> => {
	const translations = {
		fr: {
			title: "[📜 Résultat TFT ]",
			win: "Victoire",
			loss: "Défaite",
			placement: "Placement",
			description: (gameName: string, tagline: string, placement: number, lpChange: number, league: string, tier: string, rank: string, updatedLP: number) =>
				`**${placement <= 4 ? "Top 4" : "Bottom 4"}**\n\n${gameName}#${tagline} vient de ${lpChange > 0 ? "gagner" : "perdre"} ${Math.abs(lpChange)} ${league} ! **(${tier} ${rank} / ${updatedLP} lp)**`,
			lpChange: lpChange > 0 ? "gagne" : "perd",
			league: "point(s) de ligue",
			queue: "Mode",
			queueType: "TFT Classé",
			mainTrait: "Trait Principal",
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
			title: "[📜 TFT Match Result ]",
			win: "Victory",
			loss: "Defeat",
			placement: "Placement",
			description: (gameName: string, tagline: string, placement: number, lpChange: number, league: string, tier: string, rank: string, updatedLP: number) =>
				`**${placement <= 4 ? "Top 4" : "Bottom 4"}**\n\n${gameName}#${tagline} just ${lpChange > 0 ? "gained" : "lost"} ${Math.abs(lpChange)} ${league}! **(${tier} ${rank} / ${updatedLP} LP)**`,
			lpChange: lpChange > 0 ? "gained" : "lost",
			league: "league point(s)",
			queue: "Queue",
			queueType: "TFT Ranked",
			mainTrait: "Main Trait",
			timestamp: "Date",
			date: new Date().toLocaleString("en-GB", {
				year: "numeric",
				month: "long",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				timeZone: "Europe/London",
			}).replace(",", " at")
		}
	};

	const t = translations[lang as keyof typeof translations];

	const currentGameId = gameIdWithRegion.split("_")[1];
	const matchUrl = `https://www.leagueofgraphs.com/tft/match/${region.toLowerCase()}/${currentGameId}`;

	const embed = new EmbedBuilder()
		.setColor(placement === 1 ? '#FFD700' : placement <= 4 ? '#00FF00' : '#FF0000') // Or = 1er, vert = top 4, rouge sinon
		.setTitle(t.title)
		.setURL(matchUrl)
		.setDescription(t.description(gameName, tagline, placement, lpChange, t.league, tier, rank, updatedLP))
		.addFields(
			{
				name: t.placement,
				value: `${getPlacementBadge(placement)} ${placement}${getOrdinalSuffix(placement, lang)}`,
				inline: true
			},
			{ name: t.queue, value: t.queueType, inline: true },
			{ name: '\u200B', value: customMessage ? "*" + customMessage + "*" : '\u200B' }
		);

		if (mainTrait) {
			embed.addFields({ name: t.mainTrait, value: `**${mainTrait}**`, inline: true });
		}
		
		embed.setFooter({ text: `${t.timestamp}: ${t.date}` });

	await channel.send({ embeds: [embed] });
};

const getOrdinalSuffix = (placement: number, lang: string): string => {
	if (lang === "fr") {
		return placement === 1 ? "er" : "e";
	} else {
		const j = placement % 10, k = placement % 100;
		if (j === 1 && k !== 11) return "st";
		if (j === 2 && k !== 12) return "nd";
		if (j === 3 && k !== 13) return "rd";
		return "th";
	}
};

const getPlacementBadge = (place: number): string => {
	switch (place) {
		case 1: return "🥇";
		case 2: return "🥈";
		case 3: return "🥉";
		case 4: return "🏅";
		default: return "❌";
	}
};

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
					const queueType: GameQueueType = GameQueueType[playerRankStat.queueType as keyof typeof GameQueueType];
					const leaguePoints: number = playerRankStat.leaguePoints;
					const rank: string = playerRankStat.rank;
					const tier: string = playerRankStat.tier;
					const playerQueueInfo: PlayerForQueueInfo = await getPlayerForQueueInfoForSpecificServer(currentServerID, player.puuid, queueType);
					// Only update rank info when we are outside the lastDay window
					const shouldUpdate = playerQueueInfo.lastDayDate == null || !isTimestampInRecapRange(playerQueueInfo.lastDayDate.valueOf());
					if (shouldUpdate == true) {
						// Update current and lastDay
						let isCurrent = false;
						await updatePlayerCurrentOrLastDayRank(currentServerID, player.puuid, isCurrent, queueType, leaguePoints, rank, tier);
						isCurrent = true;
						await updatePlayerCurrentOrLastDayRank(currentServerID, player.puuid, isCurrent, queueType, leaguePoints, rank, tier);
						// Update the date inside last day player
						await updatePlayerLastDate(currentServerID, player.puuid, queueType, currentDate);
					}
				}
			}
		}
	} catch (error) {
		console.error('❌ Failed to track players :', error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to track players');
	}
};

const calculateLPDifference = (beforeRank: string, afterRank: string, beforeTier: string, afterTier: string, beforeLP: number, afterLP: number): number => {
	if (!beforeRank || !beforeTier || beforeLP === null || !afterRank || !afterTier || afterLP === null) {
		return 0; // If any data is null, return 0
	}
	const beforeAbsoluteLP = getAbsoluteLP(beforeTier, beforeRank, beforeLP);
	const afterAbsoluteLP = getAbsoluteLP(afterTier, afterRank, afterLP);

	return afterAbsoluteLP - beforeAbsoluteLP;
};

const getAbsoluteLP = (tier: string, rank: string, lp: number): number => {
	const tierOrder: string[] = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
	const rankOrder: string[] = ["IV", "III", "II", "I"];

	const tierIndex = tierOrder.indexOf(tier);
	const rankIndex = rankOrder.indexOf(rank);

	if (tierIndex === -1 || rankIndex === -1) return 0; // Safety check for invalid values

	if (tierIndex >= 7) { // MASTER and above have no fixed ranks
		return 2800 + (tierIndex - 7) * 1000 + lp;
	}

	return tierIndex * 400 + rankIndex * 100 + lp;
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
					const playersFlexInfo = await listAllPlayerForQueueInfoForSpecificServer(currentServerID, GameQueueType.RANKED_FLEX_SR);
					const flexChanges: PlayerRecapInfo[] = generatePlayerRecapInfo(players, playersFlexInfo);
					await sendRecapMessage(channel, flexChanges, GameQueueType.RANKED_FLEX_SR, server.lang);
				}

				// TFT part
				if (server.tfttoggle == true) {
					const playersTFTInfo = await listAllPlayerForQueueInfoForSpecificServer(currentServerID, GameQueueType.RANKED_TFT);
					const tftChanges: PlayerRecapInfo[] = generatePlayerRecapInfo(players, playersTFTInfo);
					await sendRecapMessage(channel, tftChanges, GameQueueType.RANKED_TFT, server.lang);
				}

				// Soloq part
				const playersSoloQInfo = await listAllPlayerForQueueInfoForSpecificServer(currentServerID, GameQueueType.RANKED_SOLO_5x5);
				const soloQChanges: PlayerRecapInfo[] = generatePlayerRecapInfo(players, playersSoloQInfo);
				await sendRecapMessage(channel, soloQChanges, GameQueueType.RANKED_SOLO_5x5, server.lang);
			} else {
				console.error('❌ Failed send the message, can`t find the channel');
			}

		}
	} catch (error) {
		console.error('❌ Failed to generate the recap :', error);
		throw new AppError(ErrorTypes.DATABASE_ERROR, 'Failed to generate the recap');
	}
};

const generatePlayerRecapInfo = (players: PlayerInfo[], playersQueue: PlayerForQueueInfo[]): PlayerRecapInfo[] => {
	return playersQueue.filter(playerQueue => playerQueue.lastDayWin != null && playerQueue.lastDayLose != null && playerQueue.lastDayRank != null && playerQueue.currentRank != null && playerQueue.lastDayTier != null && playerQueue.currentTier != null && playerQueue.lastDayLP != null && playerQueue.currentLP != null) // Remove entries with no win/lose or unranked (didn't play)
		.map<PlayerRecapInfo>(playerQueueToMap => (
			{
				player: players.find((value: PlayerInfo) => value.id == playerQueueToMap.playerId)!,
				playerQueue: playerQueueToMap,
				lpChange: calculateLPDifference(playerQueueToMap.lastDayRank!, playerQueueToMap.currentRank!, playerQueueToMap.lastDayTier!, playerQueueToMap.currentTier!, playerQueueToMap.lastDayLP!, playerQueueToMap.currentLP!)
			}
		))
		.sort((a, b) => b.lpChange - a.lpChange);
}

const sendRecapMessage = async (channel: TextChannel, playerRecapInfos: PlayerRecapInfo[], queueType: GameQueueType, lang: string): Promise<void> => {
	if (playerRecapInfos.length > 0) {
		const translations = {
			fr: {
				title: {
					[GameQueueType.RANKED_FLEX_SR]: "[📊 Résumé Quotidien Flex]",
					[GameQueueType.RANKED_SOLO_5x5]: "[📈 Résumé Quotidien SoloQ]",
					[GameQueueType.RANKED_TFT]: "[📜 Résumé Quotidien TFT]"
				},
				league: "LP",
				wins: "Victoires",
				losses: "Défaites",
				from: "De",
				to: "À"
			},
			en: {
				title: {
					[GameQueueType.RANKED_FLEX_SR]: "[📊 Flex Daily Recap]",
					[GameQueueType.RANKED_SOLO_5x5]: "[📈 SoloQ Daily Recap]",
					[GameQueueType.RANKED_TFT]: "[📜 TFT Daily Recap]"
				},
				league: "LP",
				wins: "Wins",
				losses: "Losses",
				from: "From",
				to: "To"
			}
		};

		const t = translations[lang as keyof typeof translations];
		const queueTitle = t.title[queueType as keyof typeof t.title];

		const embed = new EmbedBuilder()
			.setTitle(queueTitle)
			.setColor(
				queueType === GameQueueType.RANKED_FLEX_SR ? 'Purple' :
					queueType === GameQueueType.RANKED_SOLO_5x5 ? 'Blue' :
						'Green'
			)
			.setDescription(
				playerRecapInfos.map(entry => {
					const { currentTier, currentRank, lastDayTier, lastDayRank, lastDayWin, lastDayLose, lastDayLP, currentLP } = entry.playerQueue;
					const { gameName, tagLine } = entry.player;
					return `**${gameName}#${tagLine} : ${entry.lpChange > 0 ? '+' : ''}${entry.lpChange} ${t.league}**  
						🏆 ${t.wins}: **${lastDayWin}** | ❌ ${t.losses}: **${lastDayLose}** 
						${t.from}: **${lastDayTier} ${lastDayRank} ${lastDayLP}** ➡️ ${t.to}: **${currentTier} ${currentRank} ${currentLP}**`;
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

	// Set 06:33 AM today
	const today6am33 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 33, 0, 0);

	// Manage the last day
	if (now.getHours() < 6 || (now.getHours() === 6 && now.getMinutes() < 33)) {
		today6am33.setDate(today6am33.getDate() - 1);
	}

	// Check if the timestamp falls within the range
	return timestamp >= today6am33.getTime();
}

interface PlayerRecapInfo {
	player: PlayerInfo;
	playerQueue: PlayerForQueueInfo;
	lpChange: number;
}
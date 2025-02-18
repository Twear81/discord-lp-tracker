import { EmbedBuilder, TextChannel } from 'discord.js';
import { getAllServer, listAllPlayer, updatePlayerLastGameId } from '../database/databaseHelper';
import { AppError, ErrorTypes } from '../error/error';
import { getGameDetailForCurrentPlayer, getLastMatch, PlayerGameInfo } from '../riot/riotHelper';
import { client } from '../index';

export const trackPlayer = async (firstRun: boolean): Promise<void> => {
	try {
		// Get all the servers
		const servers = await getAllServer();

		for (const server of servers) {
			const currentServerID = server.serverid;
			const currentServerFlexTracker = server.flextoggle;
			// Get all the players for the current server
			const players = await listAllPlayer(currentServerID);

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
					const currentGameId = matchIds[0]; // example -> EUW1_7294524077
					const gameDetailForThePlayer: PlayerGameInfo = await getGameDetailForCurrentPlayer(player.puuid, currentGameId, player.region);

					// Update last game inside database
					await updatePlayerLastGameId(currentServerID, player.puuid, currentGameId);

					// Send the notification to the specified channel
					if (firstRun == true) {
						// don't notify
						console.log("first run, don't notify");
					} else {
						// Create the message with game detail
						const channel = (await client.channels.fetch(server.channelid)) as TextChannel;
						if (channel != null) {
							sendGameResultMessage(channel, player.accountnametag, gameDetailForThePlayer, "", 0, server.lang);
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

export const sendGameResultMessage = async (channel: TextChannel, playerName: string, gameInfo: PlayerGameInfo, rank: string, lpChange: number, lang: string): Promise<void> => {
	// Définition des traductions
	const translations = {
		fr: {
			title: "📜 Résultat de partie",
			win: "Victoire",
			loss: "Défaite",
			lpChange: lpChange > 0 ? `gagner` : `perdre`,
			league: "point(s) de ligue",
			score: "Score",
			champion: "Champion",
			queue: "File",
			queueType: "Solo/Duo", // TODO fix
			timestamp: "Date"
		},
		en: {
			title: "📜 Match Result",
			win: "Victory",
			loss: "Defeat",
			lpChange: lpChange > 0 ? `gained` : `lost`,
			league: "league point(s)",
			score: "Score",
			champion: "Champion",
			queue: "Queue",
			queueType: "Solo/Duo", // TODO fix
			timestamp: "Date"
		}
	};

	const t = translations[lang as keyof typeof translations];

	const embed = new EmbedBuilder()
		.setColor(gameInfo.win ? '#00FF00' : '#FF0000') // grean if win, Red if loose
		.setTitle(t.title)
		.setDescription(`**${gameInfo.win ? t.win : t.loss}**\n\n${playerName} vient de ${t.lpChange} ${Math.abs(lpChange)} ${t.league} ! **(${rank})**`)
		.addFields(
			{ name: t.score, value: `${gameInfo.kills}/${gameInfo.deaths}/${gameInfo.assists}`, inline: true },
			{ name: t.champion, value: gameInfo.championName, inline: true },
			{ name: t.queue, value: t.queueType, inline: true }
		)
		.setThumbnail(`https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/${gameInfo.championName}.png`)
		.setFooter({ text: `${t.timestamp}: ${new Date().toLocaleString()}` });

	await channel.send({ embeds: [embed] });
}
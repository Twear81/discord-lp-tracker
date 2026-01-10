import { ColorResolvable, EmbedBuilder, TextChannel } from 'discord.js';
import { DDragon } from '@fightmegg/riot-api';
import { PlayerLeagueGameInfo, PlayerTFTGameInfo } from '../riot/riotHelper';
import { GameQueueType } from './GameQueueType';
import { PlayerForQueueInfo, PlayerInfo, PlayerRecapInfo } from '../database/databaseHelper';
import { calculateLPDifference, getDisplayRank, getDurationString } from './util';
import logger from '../logger/logger';
import { getTranslations } from '../translation/translation';
import { MonthlyRecapStats } from './monthlyRecap';

export const sendLeagueGameResultMessage = async (channel: TextChannel, gameName: string, tagline: string, gameInfo: PlayerLeagueGameInfo, rank: string, tier: string, lpChange: number, updatedLP: number, region: string, gameIdWithRegion: string, customMessage: string | undefined, lang: string): Promise<void> => {
	const t = getTranslations(lang);

	const durationMinutes = gameInfo.gameDurationSeconds / 60;
	const csPerMin = gameInfo.totalCS / durationMinutes;
	const dmgPerMin = gameInfo.damage / durationMinutes;
	const visionPerMin = gameInfo.visionScore / durationMinutes;

	const displayRank = getDisplayRank(tier, rank);

	const currentGameId = gameIdWithRegion.split("_")[1];
	const matchUrl = `https://www.leagueofgraphs.com/match/${region.toLowerCase()}/${currentGameId}#participant${gameInfo.participantNumber}`;
	const dpmUrl = `https://dpm.lol/${encodeURI(gameName)}-${tagline}`;

	const latestVersion = await new DDragon().versions.latest();

	const embed = new EmbedBuilder()
		.setColor(gameInfo.win ? '#00FF00' : '#FF0000')
		.setTitle(t.title)
		.setURL(matchUrl)
		.setAuthor({ name: `${gameName}#${tagline}`, url: dpmUrl })
		.setThumbnail(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${gameInfo.championName}.png`)
		.setDescription(`**${t.lpChange(lpChange)} ${Math.abs(lpChange)} LP | Rank : ${tier}${displayRank} (${updatedLP} LP)**`)
		.addFields(
			{ name: t.kda, value: `${gameInfo.kills}/${gameInfo.deaths}/${gameInfo.assists}`, inline: true },
			{ name: t.time, value: getDurationString(gameInfo.gameDurationSeconds), inline: true },
			{ name: t.score, value: `${gameInfo.scoreRating.toFixed(2)}`, inline: true },
			{ name: t.csPerMin, value: csPerMin.toFixed(1), inline: true },
			{ name: t.pings, value: `${gameInfo.pings}`, inline: true },
			{ name: t.damage, value: `${(gameInfo.damage / 1000).toFixed(1)}K (${Math.round(dmgPerMin)}/min)`, inline: true },
			{ name: t.visionPerMin, value: visionPerMin.toFixed(2), inline: true },
			{ name: t.teamRank, value: gameInfo.teamRank, inline: true },
			{ name: t.queue, value: gameInfo.queueType === GameQueueType.RANKED_FLEX_SR ? t.queueTypeFlex : t.queueTypeSolo, inline: true },
		)
		.setTimestamp();

	if (customMessage) {
		embed.addFields({ name: '\u200b', value: `*${customMessage}*` });
	}

	await channel.send({ embeds: [embed] });
}

export const sendTFTGameResultMessage = async (channel: TextChannel, gameName: string, tagline: string, tftGameInfo: PlayerTFTGameInfo, rank: string, tier: string, lpChange: number, updatedLP: number, region: string, gameIdWithRegion: string, customMessage: string | undefined, lang: string): Promise<void> => {
	const t = getTranslations(lang);

	const formattedDuration = getDurationString(tftGameInfo.gameDurationSeconds);
	const displayRank = getDisplayRank(tier, rank);

	const currentGameId = gameIdWithRegion.split("_")[1];
	const matchUrl = `https://www.leagueofgraphs.com/tft/match/${region.toLowerCase()}/${currentGameId}`;
	const lolChessUrl = `https://lolchess.gg/profile/${region.toLowerCase()}/${encodeURI(gameName)}-${tagline}`;

	const tftColor = tftGameInfo.placement === 1 ? '#FFD700' :
		tftGameInfo.placement <= 4 ? '#1DB954' : // Top 4
			'#FF0000'; // Bottom 4

	const embed = new EmbedBuilder()
		.setColor(tftColor)
		.setTitle(t.title)
		.setURL(matchUrl)
		.setAuthor({ name: `${gameName}#${tagline}`, url: lolChessUrl })
		.setThumbnail(tftGameInfo.littleLegendIconUrl || null)
		.setDescription(`**${t.lpChange(lpChange)} ${Math.abs(lpChange)} LP | Rank : ${tier}${displayRank} (${updatedLP} LP)**`)
		.addFields(
			{ name: t.placement, value: `${getPlacementBadge(tftGameInfo.placement)} ${tftGameInfo.placement}${getOrdinalSuffix(tftGameInfo.placement, lang)}`, inline: true },
			{ name: t.level, value: `${tftGameInfo.level}`, inline: true },
			{ name: t.round, value: `${tftGameInfo.roundEliminated}`, inline: true },
			{ name: t.time, value: formattedDuration, inline: true },
			{ name: t.eliminated, value: `${tftGameInfo.playersEliminated}`, inline: true },
			{ name: t.goldLeft, value: `${tftGameInfo.goldLeft} 🪙`, inline: true },
		);

	if (tftGameInfo.mainTraits && tftGameInfo.mainTraits.length > 0) {
		embed.addFields({
			name: t.mainTraits,
			value: `**${tftGameInfo.mainTraits.join(', ')}**`,
			inline: true
		});
	}

	embed.addFields(
		{ name: t.damage, value: `${tftGameInfo.totalDamageToPlayers}`, inline: true },
		{ name: t.queue, value: tftGameInfo.queueType === GameQueueType.RANKED_TFT_DOUBLE_UP ? t.queueTypeTFTDouble : t.queueTypeTFT, inline: true }
	);

	embed.setTimestamp();

	if (customMessage) {
		embed.addFields({ name: '\u200b', value: `*${customMessage}*` });
	}

	await channel.send({ embeds: [embed] });
}

export const sendRecapMessage = async (channel: TextChannel, playerRecapInfos: PlayerRecapInfo[], queueType: GameQueueType, lang: string): Promise<void> => {
	if (playerRecapInfos.length === 0) {
		logger.info("No player did a game during this last 24 hours.");
		return;
	}

	const queueColors: Record<GameQueueType, ColorResolvable> = {
		[GameQueueType.RANKED_SOLO_5x5]: "#0078D4",
		[GameQueueType.RANKED_FLEX_SR]: "#7247A4",
		[GameQueueType.RANKED_TFT]: "#1DB954",
		[GameQueueType.RANKED_TFT_DOUBLE_UP]: "#FFC72C",
	};


	const t = getTranslations(lang);

	const queueTitle = t.recapTitles[queueType];
	const recapColor = queueColors[queueType] || "#808080";

	const embed = new EmbedBuilder()
		.setTitle(queueTitle)
		.setColor(recapColor);

	playerRecapInfos.forEach(currentPlayerRecap => {
		const { currentTier, currentRank, lastDayTier, lastDayRank, lastDayWin, lastDayLose, lastDayLP, currentLP } = currentPlayerRecap.playerQueue;
		const { gameName, tagLine } = currentPlayerRecap.player;

		const lpChange = currentPlayerRecap.lpChange;

		const lpEmoji = lpChange > 0 ? '📈' : '📉';
		const lpChangeText = `${lpChange > 0 ? '+' : ''}${lpChange} ${t.league}`;

		const displayCurrentRank = getDisplayRank(currentTier!, currentRank!);
		const displayLastDayRank = getDisplayRank(lastDayTier!, lastDayRank!);

		const winsLossesLine = `🏆 ${t.wins}: **${lastDayWin}** | ❌ ${t.losses}: **${lastDayLose}**`;
		const rankProgressionLine = `**${lastDayTier}${displayLastDayRank} ${lastDayLP} ${t.league}** ➡️ **${currentTier}${displayCurrentRank} ${currentLP} ${t.league}**`;

		embed.addFields({
			name: `${gameName}#${tagLine} - ${lpEmoji} ${lpChangeText}`,
			value: `${winsLossesLine}\n${rankProgressionLine}`,
			inline: false,
		});
	});

	await channel.send({ embeds: [embed] });
}

export const generatePlayerRecapInfo = (players: PlayerInfo[], playersQueue: PlayerForQueueInfo[]): PlayerRecapInfo[] => {
	// Remove entries with no win/lose or unranked (didn't play)
	const completePlayers = playersQueue.filter(playerQueue =>
		playerQueue.lastDayWin !== null &&
		playerQueue.lastDayLose !== null &&
		playerQueue.lastDayRank !== null &&
		playerQueue.currentRank !== null &&
		playerQueue.lastDayTier !== null &&
		playerQueue.currentTier !== null &&
		playerQueue.lastDayLP !== null &&
		playerQueue.currentLP !== null
	);

	// Map playerInfo to PlayerRecapInfo
	const playerRecaps = completePlayers.map<PlayerRecapInfo>(playerQueueToMap => ({
		player: players.find((value: PlayerInfo) => value.id === playerQueueToMap.playerId)!,
		playerQueue: playerQueueToMap,
		lpChange: calculateLPDifference(
			playerQueueToMap.lastDayRank!,
			playerQueueToMap.currentRank!,
			playerQueueToMap.lastDayTier!,
			playerQueueToMap.currentTier!,
			playerQueueToMap.lastDayLP!,
			playerQueueToMap.currentLP!
		),
	}));

	const sortedPlayerRecaps = playerRecaps.sort((a, b) => b.lpChange - a.lpChange);
	return sortedPlayerRecaps;
}

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

export const sendLeagueMonthlyRecapMessage = async (channel: TextChannel, playerStats: MonthlyRecapStats[], month: number, year: number, queueType: GameQueueType, lang: string): Promise<void> => {
	const t = getTranslations(lang);
	const queueColors: Record<GameQueueType, ColorResolvable> = {
		[GameQueueType.RANKED_SOLO_5x5]: "#0078D4",
		[GameQueueType.RANKED_FLEX_SR]: "#7247A4",
		[GameQueueType.RANKED_TFT]: "#1DB954",
		[GameQueueType.RANKED_TFT_DOUBLE_UP]: "#FFC72C",
	};

	const monthNames = lang === 'fr'
		? ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
		: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	const monthName = monthNames[month - 1];
	const recapColor = queueColors[queueType] || "#808080";

	const embed = new EmbedBuilder()
		.setTitle(`${t.monthlyRecapTitles[queueType]} - ${monthName} ${year}`)
		.setColor(recapColor)
		.setDescription(lang === 'fr' ? 'Statistiques du mois' : 'Monthly statistics');

	// Format similaire au récap quotidien avec des infos en plus - regroupé dans un embed
	// Si le message est trop grand, on le découpe en plusieurs messages
	let currentEmbed = embed;
	let playerCount = 0;

	for (const stats of playerStats) {
		const { player, totalGames, totalTimePlayed, totalLPGain, totalCS, totalPing, wins, losses, winrate, averageKDA, averageDamage, averageVisionPerMin } = stats;
		const { gameName, tagLine } = player;

		const hoursPlayed = Math.floor(totalTimePlayed / 3600);
		const minutesPlayed = Math.floor((totalTimePlayed % 3600) / 60);

		const lpEmoji = totalLPGain > 0 ? '📈' : totalLPGain < 0 ? '📉' : '➡️';
		const lpChangeText = `${totalLPGain > 0 ? '+' : ''}${totalLPGain} ${t.league}`;

		const playerStatsText = `🏆 ${t.wins}: **${wins}** | ❌ ${t.losses}: **${losses}**
🎮 ${t.games}: **${totalGames}** | ${t.time}: **${hoursPlayed}h ${minutesPlayed}min** | 📊 ${t.winrate}: **${winrate.toFixed(1)}%**
⚔️ KDA: **${averageKDA?.kills.toFixed(1)}/${averageKDA?.deaths.toFixed(1)}/${averageKDA?.assists.toFixed(1)}**
${t.damage}: **${(averageDamage! / 1000).toFixed(1)}K/game**
${t.totalCs}: **${totalCS?.toFixed(1)}**
${t.pings}: **${totalPing?.toFixed(1)}**
${t.visionPerMin}: **${averageVisionPerMin?.toFixed(2)}**`;

		currentEmbed.addFields({
			name: `${gameName}#${tagLine} - ${lpEmoji} ${lpChangeText}`,
			value: playerStatsText,
			inline: false,
		});

		playerCount++;

		// Vérifier si l'embed dépasse la limite (25 fields)
		if (currentEmbed.data && currentEmbed.data.fields && currentEmbed.data.fields.length > 24) {
			// Envoyer l'embed actuel et en créer un nouveau
			await channel.send({ embeds: [currentEmbed] });
			currentEmbed = new EmbedBuilder()
				.setTitle(`${t.monthlyRecapTitles[queueType]} - ${monthName} ${year}`)
				.setColor(recapColor)
				.setDescription(lang === 'fr' ? 'Statistiques du mois' : 'Monthly statistics');
			playerCount = 0;
		}
	}

	// Envoyer le dernier embed
	if (playerCount > 0) {
		currentEmbed.setTimestamp();
		await channel.send({ embeds: [currentEmbed] });
	}
};

export const sendTFTMonthlyRecapMessage = async (channel: TextChannel, playerStats: MonthlyRecapStats[], month: number, year: number, queueType: GameQueueType, lang: string): Promise<void> => {
	const t = getTranslations(lang);
	const queueColors: Record<GameQueueType, ColorResolvable> = {
		[GameQueueType.RANKED_SOLO_5x5]: "#0078D4",
		[GameQueueType.RANKED_FLEX_SR]: "#7247A4",
		[GameQueueType.RANKED_TFT]: "#1DB954",
		[GameQueueType.RANKED_TFT_DOUBLE_UP]: "#FFC72C",
	};

	const monthNames = lang === 'fr'
		? ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
		: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	const monthName = monthNames[month - 1];
	const recapColor = queueColors[queueType] || "#808080";

	const embed = new EmbedBuilder()
		.setTitle(`${t.monthlyRecapTitles[queueType]} - ${monthName} ${year}`)
		.setColor(recapColor)
		.setDescription(lang === 'fr' ? 'Statistiques du mois' : 'Monthly statistics');

	// Format similaire au récap quotidien avec des infos en plus - regroupé dans un embed
	// Si le message est trop grand, on le découpe en plusieurs messages
	let currentEmbed = embed;
	let playerCount = 0;

	for (const stats of playerStats) {
		const { player, totalGames, totalTimePlayed, totalLPGain, wins, losses, winrate, averagePlacement, averageLevel } = stats;
		const { gameName, tagLine } = player;

		const hoursPlayed = Math.floor(totalTimePlayed / 3600);
		const minutesPlayed = Math.floor((totalTimePlayed % 3600) / 60);

		const lpEmoji = totalLPGain > 0 ? '📈' : totalLPGain < 0 ? '📉' : '➡️';
		const lpChangeText = `${totalLPGain > 0 ? '+' : ''}${totalLPGain} ${t.league}`;

		const playerStatsText = `🏆 ${t.wins}: **${wins}** | ❌ ${t.losses}: **${losses}**
🎮 ${t.games}: **${totalGames}** | ${t.time}: **${hoursPlayed}h ${minutesPlayed}min** | 📊 ${t.winrate}: **${winrate.toFixed(1)}%**
${t.avgPlacement}: **${averagePlacement?.toFixed(1)}**
${t.level}: **${averageLevel?.toFixed(1)}**`;

		currentEmbed.addFields({
			name: `${gameName}#${tagLine} - ${lpEmoji} ${lpChangeText}`,
			value: playerStatsText,
			inline: false,
		});

		playerCount++;

		// Vérifier si l'embed dépasse la limite (25 fields)
		if (currentEmbed.data && currentEmbed.data.fields && currentEmbed.data.fields.length > 24) {
			// Envoyer l'embed actuel et en créer un nouveau
			await channel.send({ embeds: [currentEmbed] });
			currentEmbed = new EmbedBuilder()
				.setTitle(`${t.monthlyRecapTitles[queueType]} - ${monthName} ${year}`)
				.setColor(recapColor)
				.setDescription(lang === 'fr' ? 'Statistiques du mois' : 'Monthly statistics');
			playerCount = 0;
		}
	}

	// Envoyer le dernier embed
	if (playerCount > 0) {
		currentEmbed.setTimestamp();
		await channel.send({ embeds: [currentEmbed] });
	}
};

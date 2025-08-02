import { EmbedBuilder, TextChannel } from 'discord.js';
import { PlayerLeagueGameInfo } from '../riot/riotHelper';
import { GameQueueType } from './GameQueueType';
import { PlayerForQueueInfo, PlayerInfo, PlayerRecapInfo } from '../database/databaseHelper';
import { calculateLPDifference } from './util';

export const sendLeagueGameResultMessage = async (channel: TextChannel, gameName: string, tagline: string, gameInfo: PlayerLeagueGameInfo, rank: string, tier: string, lpChange: number, updatedLP: number, region: string, gameIdWithRegion: string, customMessage: string | undefined, lang: string): Promise<void> => {
    const translations = {
        fr: {
            title: "[📜 Résultat de partie ]",
            win: "Victoire",
            loss: "Défaite",
            lpChange: lpChange > 0 ? "a gagné" : "a perdu",
        },
        en: {
            title: "[📜 Match Result ]",
            win: "Victory",
            loss: "Defeat",
            lpChange: lpChange > 0 ? "won" : "lost",
        },
    };

    const t = translations[lang as keyof typeof translations];
    const durationMinutes = gameInfo.gameDurationSeconds / 60;
    const csPerMin = gameInfo.totalCS / durationMinutes;
    const dmgPerMin = gameInfo.damage / durationMinutes;
    const visionPerMin = gameInfo.visionScore / durationMinutes;

    const currentGameId = gameIdWithRegion.split("_")[1];
    const matchUrl = `https://www.leagueofgraphs.com/match/${region.toLowerCase()}/${currentGameId}#participant${gameInfo.participantNumber}`;
    const dpmUrl = `https://dpm.lol/${encodeURI(gameName)}-${tagline}`;

    const embed = new EmbedBuilder()
        .setColor(gameInfo.win ? '#00FF00' : '#FF0000')
        .setTitle(t.title)
        .setURL(matchUrl)
        .setAuthor({ name: `${gameName}#${tagline}` })
        .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/15.15.1/img/champion/${gameInfo.championName}.png`)
        .setDescription(`**${gameName} ${t.lpChange} ${Math.abs(lpChange)} LP (${tier} ${rank} – ${updatedLP} LP)**`)
        .addFields(
            { name: 'KDA', value: `${gameInfo.kills}/${gameInfo.deaths}/${gameInfo.assists}`, inline: true },
            { name: 'Time', value: `${Math.floor(durationMinutes)}:${(gameInfo.gameDurationSeconds % 60).toString().padStart(2, '0')}`, inline: true },
            { name: 'Score', value: `${gameInfo.scoreRating.toFixed(2)}`, inline: true },
            { name: 'CS/m', value: csPerMin.toFixed(1), inline: true },
            { name: 'Pings', value: `${gameInfo.pings}`, inline: true },
            { name: 'DMG', value: `${(gameInfo.damage / 1000).toFixed(1)}K (${Math.round(dmgPerMin)}/min)`, inline: true },
            { name: 'Vision score/m', value: visionPerMin.toFixed(2), inline: true },
            { name: 'Team Rank', value: gameInfo.teamRank, inline: true },
            { name: 'Queue', value: gameInfo.queueType == GameQueueType.RANKED_FLEX_SR ? "Flex" : "Solo/Duo", inline: true },
            { name: '', value: customMessage ? "*" + customMessage + "*" : "" }
        )
        .addFields(
            {
                name: '',
                value: `[DPM](${dpmUrl})`,
                inline: false
            }
        )
        .setFooter({
            text: `Date: ${new Date().toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: "Europe/Paris",
            })}`,
        });

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

export const sendRecapMessage = async (channel: TextChannel, playerRecapInfos: PlayerRecapInfo[], queueType: GameQueueType, lang: string): Promise<void> => {
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

export const generatePlayerRecapInfo = (players: PlayerInfo[], playersQueue: PlayerForQueueInfo[]): PlayerRecapInfo[] => {
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
import { EmbedBuilder, TextChannel } from 'discord.js';
import { PlayerLeagueGameInfo, PlayerTFTGameInfo } from '../riot/riotHelper';
import { GameQueueType } from './GameQueueType';
import { PlayerForQueueInfo, PlayerInfo, PlayerRecapInfo } from '../database/databaseHelper';
import { calculateLPDifference } from './util';
import { DDragon } from '@fightmegg/riot-api';

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

    const latestVersion = await new DDragon().versions.latest();

    const embed = new EmbedBuilder()
        .setColor(gameInfo.win ? '#00FF00' : '#FF0000')
        .setTitle(t.title)
        .setURL(matchUrl)
        .setAuthor({ name: `${gameName}#${tagline}` })
        .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${gameInfo.championName}.png`)
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

export const sendTFTGameResultMessage = async (channel: TextChannel, gameName: string, tagline: string, tftGameInfo: PlayerTFTGameInfo, rank: string, tier: string, lpChange: number, updatedLP: number, region: string, gameIdWithRegion: string, customMessage: string | undefined, lang: string): Promise<void> => {
    const translations = {
        fr: {
            title: "[📜 Résultat TFT ]",
            lpChangeText: lpChange > 0 ? "a gagné" : "a perdu",
            placement: "Placement",
            level: "Niveau",
            round: "Round",
            eliminated: "Joueurs Éliminés",
            damage: "Dégâts",
            mainTraits: "Traits Principaux",
            queue: "Mode",
            queueType: "TFT Classé",
            time: "Durée",
            goldLeft: "Or Restant",
        },
        en: {
            title: "[📜 TFT Result ]",
            lpChangeText: lpChange > 0 ? "gained" : "lost",
            placement: "Placement",
            level: "Level",
            round: "Round",
            eliminated: "Players Eliminated",
            damage: "Damage",
            mainTraits: "Main Traits",
            queue: "Queue",
            queueType: "TFT Ranked",
            time: "Duration",
            goldLeft: "Gold Left",
        },
    };

    const t = translations[lang as keyof typeof translations];
    const durationMinutes = Math.floor(tftGameInfo.gameDurationSeconds / 60);
    const durationSeconds = Math.floor(tftGameInfo.gameDurationSeconds % 60);
    const formattedDurationSeconds = durationSeconds.toString().padStart(2, '0');

    const currentGameId = gameIdWithRegion.split("_")[1];
    const matchUrl = `https://www.leagueofgraphs.com/tft/match/${region.toLowerCase()}/${currentGameId}`;

    const embed = new EmbedBuilder()
        .setColor(tftGameInfo.placement === 1 ? '#FFD700' : tftGameInfo.placement <= 4 ? '#00FF00' : '#FF0000')
        .setTitle(t.title)
        .setURL(matchUrl)
        .setAuthor({ name: `${gameName}#${tagline}` })
        .setThumbnail(tftGameInfo.littleLegendIconUrl || null)
        .setDescription(`**${gameName} ${t.lpChangeText} ${Math.abs(lpChange)} LP (${tier} ${rank} – ${updatedLP} LP)**`)
        .addFields(
            { name: t.placement, value: `${getPlacementBadge(tftGameInfo.placement)} ${tftGameInfo.placement}${getOrdinalSuffix(tftGameInfo.placement, lang)}`, inline: true },
            { name: t.level, value: `${tftGameInfo.level}`, inline: true },
            { name: t.round, value: `${tftGameInfo.roundEliminated}`, inline: true },
            { name: t.time, value: `${durationMinutes}:${formattedDurationSeconds}`, inline: true },
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
        { name: t.queue, value: t.queueType, inline: true }
    );

    if (customMessage) {
        embed.addFields({ name: '\u200B', value: `${customMessage}` });
    }

    embed.setFooter({
        text: `Date: ${new Date().toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: "Europe/Paris",
        })}`,
    });

    await channel.send({ embeds: [embed] });
};

export const sendRecapMessage = async (channel: TextChannel, playerRecapInfos: PlayerRecapInfo[], queueType: GameQueueType, lang: string): Promise<void> => {
    if (playerRecapInfos.length > 0) {
        const translations = {
            fr: {
                title: {
                    [GameQueueType.RANKED_FLEX_SR]: "[📊 Résumé Quotidien Flex]",
                    [GameQueueType.RANKED_SOLO_5x5]: "[📈 Résumé Quotidien SoloQ]",
                    [GameQueueType.RANKED_TFT]: "[📜 Résumé Quotidien TFT]",
                    [GameQueueType.RANKED_TFT_DOUBLE_UP]: "[📜 Résumé Quotidien TFT Double]"
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
                    [GameQueueType.RANKED_TFT]: "[📜 TFT Daily Recap]",
                    [GameQueueType.RANKED_TFT_DOUBLE_UP]: "[📜 TFT Double Daily Recap]"
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
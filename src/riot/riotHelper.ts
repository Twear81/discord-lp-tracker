import { PlatformId, RiotAPI, RiotAPITypes } from "@fightmegg/riot-api";
import { AppError, ErrorTypes } from "../error/error";
import dotenv from 'dotenv';
import Bottleneck from "bottleneck";
import { GameQueueType } from "../tracking/GameQueueType";
type PingKeys =
	| "basicPings"
	| "allInPings"
	| "assistMePings"
	| "baitPings"
	| "enemyMissingPings"
	| "enemyVisionPings"
	| "holdPings"
	| "needVisionPings"
	| "onMyWayPings"
	| "pushPings"
	| "retreatPings"
	| "visionClearedPings"
	| "visionPings";

type ParticipantWithPings = RiotAPITypes.MatchV5.ParticipantDTO & {
	[key in PingKeys]?: number;
};


dotenv.config();

const config: RiotAPITypes.Config = {
	debug: false,
	cache: {
		cacheType: "local", // local or ioredis
		ttls: {
			byMethod: {
				[RiotAPITypes.METHOD_KEY.SUMMONER_V4.GET_BY_PUUID]: 60000, // ms
				[RiotAPITypes.METHOD_KEY.LEAGUE_V4.GET_ENTRIES_BY_PUUID]: 30000, // ms
				[RiotAPITypes.METHOD_KEY.ACCOUNT_V1.GET_BY_RIOT_ID]: 60000, // ms
				[RiotAPITypes.METHOD_KEY.ACCOUNT_V1.GET_BY_PUUID]: 60000, // ms
				[RiotAPITypes.METHOD_KEY.MATCH_V5.GET_MATCH_BY_ID]: 30000, // ms
				[RiotAPITypes.METHOD_KEY.MATCH_V5.GET_IDS_BY_PUUID]: 5000, // ms
			},
		},
	},
};
const configTFT: RiotAPITypes.Config = {
	debug: false,
	cache: {
		cacheType: "local", // local or ioredis
		ttls: {
			byMethod: {
				[RiotAPITypes.METHOD_KEY.TFT_SUMMONER_V1.GET_BY_PUUID]: 60000, // ms
				[RiotAPITypes.METHOD_KEY.TFT_LEAGUE_V1.GET_ENTRIES_BY_PUUID]: 30000, // ms
				[RiotAPITypes.METHOD_KEY.ACCOUNT_V1.GET_BY_RIOT_ID]: 60000, // ms
				[RiotAPITypes.METHOD_KEY.ACCOUNT_V1.GET_BY_PUUID]: 60000, // ms
				[RiotAPITypes.METHOD_KEY.TFT_MATCH_V1.GET_MATCH_BY_ID]: 30000, // ms
				[RiotAPITypes.METHOD_KEY.TFT_MATCH_V1.GET_MATCH_IDS_BY_PUUID]: 5000, // ms
			},
		},
	},
};
const riotApi = new RiotAPI(process.env.RIOT_API!, config);
const riotApiTFT = new RiotAPI(process.env.RIOT_API_TFT!, configTFT);

// Bottleneck configuration for Riot's limits
const limiter = new Bottleneck({
	minTime: 50, // 1 request per 50ms (ensures < 20 requests per second)
	reservoir: 100, // Max 100 requests in 2 minutes
	reservoirRefreshAmount: 100, // Reset to 100 requests
	reservoirRefreshInterval: 120000, // Every 2 minutes
});

// Wrapper function to limit API calls
const limitedRequest = limiter.wrap(async (fn: () => Promise<RiotAPITypes.Account.AccountDTO | RiotAPITypes.MatchV5.MatchDTO | string[] | RiotAPITypes.League.LeagueEntryDTO[] | RiotAPITypes.TftLeague.LeagueEntryDTO[] | RiotAPITypes.TftMatch.MatchDTO>) => {
	try {
		return await fn();
	} catch (error) {
		console.error("API Error:", error);
		throw error;
	}
});

export async function getSummonerByName(accountName: string, tag: string, region: string): Promise<RiotAPITypes.Account.AccountDTO> {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		return await limitedRequest(() => riotApi.account.getByRiotId({
			region: platformId,
			gameName: accountName,
			tagLine: tag,
		})) as unknown as Promise<RiotAPITypes.Account.AccountDTO>;
	} catch (error) {
		console.error(`Error API Riot (getSummonerByName) :`, error);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `No player found for ${accountName}#${tag} for region ${region}`);
	}
}

export async function getAccountByPUUID(puuid: string, region: string): Promise<RiotAPITypes.Account.AccountDTO> {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		return await limitedRequest(() => riotApi.account.getByPUUID({
			region: platformId,
			puuid: puuid
		})) as unknown as Promise<RiotAPITypes.Account.AccountDTO>;
	} catch (error) {
		console.error(`Error API Riot (getSummonerByName) :`, error);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `No player found for puuid:${puuid} for region ${region}`);
	}
}

export async function getTFTSummonerByName(accountName: string, tag: string, region: string): Promise<RiotAPITypes.Account.AccountDTO> {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		return await limitedRequest(() => riotApiTFT.account.getByRiotId({
			region: platformId,
			gameName: accountName,
			tagLine: tag,
		})) as unknown as Promise<RiotAPITypes.Account.AccountDTO>;
	} catch (error) {
		console.error(`Error API Riot (getTFTSummonerByName) :`, error);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `No player found for ${accountName}#${tag} for region ${region}`);
	}
}

async function getGameDetail(gameID: string, region: string): Promise<RiotAPITypes.MatchV5.MatchDTO> {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		return await limitedRequest(() => riotApi.matchV5.getMatchById({
			cluster: platformId,
			matchId: gameID
		})) as unknown as Promise<RiotAPITypes.MatchV5.MatchDTO>;
	} catch (error) {
		console.error(`Error API Riot (getGameDetail) :`, error);
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No game detail found for gameID ${gameID} for region ${region}`);
	}
}

async function getTFTGameDetail(gameID: string, region: string): Promise<RiotAPITypes.TftMatch.MatchDTO> {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		return await limitedRequest(() => riotApiTFT.tftMatch.getById({
			region: platformId,
			matchId: gameID
		})) as unknown as Promise<RiotAPITypes.TftMatch.MatchDTO>;
	} catch (error) {
		console.error(`Error API Riot (getTFTGameDetail) :`, error);
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No game detail found for gameID ${gameID} for region ${region}`);
	}
}

export async function getLeagueGameDetailForCurrentPlayer(puuid: string, gameID: string, region: string, lang: string): Promise<PlayerLeagueGameInfo> {
	try {
		const gameDetail: RiotAPITypes.MatchV5.MatchDTO = await getGameDetail(gameID, region);
		const { info: { gameDuration, participants, gameEndTimestamp, queueId } } = gameDetail;

		// Déterminer le type de la queue
		let queueType: GameQueueType;
		switch (queueId) {
			case 420:
				queueType = GameQueueType.RANKED_SOLO_5x5;
				break;
			case 440:
				queueType = GameQueueType.RANKED_FLEX_SR;
				break;
			default:
				throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `Queue type not found for queueId:${queueId} for game:${gameID}`);
		}

		const participant = participants.find(p => p.puuid === puuid);
		if (!participant) {
			throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No participant found for player:${puuid} in game:${gameID}`);
		}

		const result: PlayerLeagueGameInfo = {
			gameDurationSeconds: gameDuration,
			totalCS: participant.neutralMinionsKilled + participant.totalMinionsKilled,
			damage: participant.totalDamageDealtToChampions,
			visionScore: participant.visionScore,
			pings: getTotalPings(participant),
			scoreRating: computePlayerScore(participant, participants, gameDuration),
			teamRank: getTeamLevelFromMatch(participants, gameDuration, puuid, lang),
			participantNumber: participants.findIndex(p => p.puuid === puuid) + 1,
			gameEndTimestamp,
			assists: participant.assists,
			deaths: participant.deaths,
			kills: participant.kills,
			championId: participant.championId,
			championName: participant.championName,
			win: participant.win,
			queueType,
			customMessage: generateLeagueCustomMessage(participant)
		};

		return result;
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}
		console.error(`Riot API Error (getLeagueGameDetailForCurrentPlayer):`, error);
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `Game details not found for game ${gameID}, player ${puuid}, and region ${region}`);
	}
}

export async function getTFTGameDetailForCurrentPlayer(puuid: string, gameID: string, region: string): Promise<PlayerTFTGameInfo> {
	try {
		const tftGameDetail: RiotAPITypes.TftMatch.MatchDTO = await getTFTGameDetail(gameID, region);
		const { info: { queue_id, participants, game_datetime } } = tftGameDetail;

		let queueType: GameQueueType;
		switch (queue_id) {
			case 1100:
				queueType = GameQueueType.RANKED_TFT;
				break;
			case 1160:
				queueType = GameQueueType.RANKED_TFT_DOUBLE_UP;
				break;
			default:
				throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `TFT Queue type not found for queueId:${queue_id} for game:${gameID}`);
		}

		const participant = participants.find(p => p.puuid === puuid);
		if (!participant) {
			throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No participant found for player ${puuid} in game ${gameID}`);
		}

		return {
			gameEndTimestamp: game_datetime,
			placement: participant.placement,
			principalTrait: getMainTrait(participant.traits),
			participantNumber: participants.findIndex(p => p.puuid === puuid) + 1,
			traits: participant.traits,
			units: participant.units,
			win: participant.placement <= 4,
			queueType: queueType,
			customMessage: generateTFTCustomMessage(participant)
		};
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}
		console.error(`Riot API Error (getTFTGameDetailForCurrentPlayer):`, error);
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `TFT Game details not found for game ${gameID}, player ${puuid}, and region ${region}`);
	}
}


export async function getLastRankedLeagueMatch(puuid: string, region: string, isFlex: boolean): Promise<string[]> {
	try {
		const platformId = getPlatformIdFromRegionString(region);

		const params = {
			queue: 420, // default to Ranked Solo/Duo
			count: 1
		};
		if (isFlex) {
			params.queue = 440; // Ranked Flex
		}

		return await limitedRequest(() => riotApi.matchV5.getIdsByPuuid({
			cluster: platformId,
			puuid,
			params,
		})) as unknown as Promise<string[]>;

	} catch (error) {
		console.error(`Riot API Error (getLastRankedLeagueMatch):`, error);
		throw new AppError(ErrorTypes.LASTMATCH_NOT_FOUND, `No last match found for player ${puuid} for region ${region}`);
	}
}

export async function getLastTFTMatch(puuid: string, region: string): Promise<string[]> {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		// Can't get only ranked match
		return await limitedRequest(() => riotApiTFT.tftMatch.getMatchIdsByPUUID({
			region: platformId,
			puuid,
			params: {
				count: 1
			}
		})) as unknown as Promise<string[]>;
	} catch (error) {
		console.error(`Error API Riot (getLastTFTMatch) :`, error);
		throw new AppError(ErrorTypes.LASTMATCH_NOT_FOUND, `No last tft match found for player ${puuid} for region ${region}`);
	}
}

export async function getPlayerRankInfo(puuid: string, region: string): Promise<RiotAPITypes.League.LeagueEntryDTO[]> {
	try {
		const platformId = getLolRegionFromRegionString(region);
		const leagueRankedInfo = await limitedRequest(() => riotApi.league.getEntriesByPUUID({
			region: platformId,
			encryptedPUUID: puuid,
		})) as unknown as RiotAPITypes.League.LeagueEntryDTO[];
		return leagueRankedInfo;
	} catch (error) {
		console.error(`Error API Riot (getPlayerRankInfo) :`, error);
		throw new AppError(ErrorTypes.PLAYERRANKINFO_NOT_FOUND, `No PLAYERRANKINFO found for player puuid:${puuid} for region ${region}`);
	}
}

export async function getTFTPlayerRankInfo(puuid: string, region: string): Promise<RiotAPITypes.TftLeague.LeagueEntryDTO[]> {
	try {
		const platformId = getLolRegionFromRegionString(region);
		const tftRankedInfo = await limitedRequest(() => riotApiTFT.tftLeague.getEntriesByPUUID({
			region: platformId,
			puuid: puuid,
		})) as unknown as RiotAPITypes.TftLeague.LeagueEntryDTO[];
		return tftRankedInfo;
	} catch (error) {
		console.error(`Error API Riot (getTFTPlayerRankInfo) :`, error);
		throw new AppError(ErrorTypes.PLAYERRANKINFO_NOT_FOUND, `No PLAYERRANKINFO tft found for player puuid:${puuid} for region ${region}`);
	}
}

function getPlatformIdFromRegionString(region: string): PlatformId.EUROPE | PlatformId.AMERICAS {
	const mapping: Record<string, (PlatformId.EUROPE | PlatformId.AMERICAS)> = {
		"EUW": PlatformId.EUROPE,
		"NA": PlatformId.AMERICAS
	};
	return mapping[region.toUpperCase()];
}

function getLolRegionFromRegionString(region: string): PlatformId.EUW1 | PlatformId.NA1 {
	const mapping: Record<string, (PlatformId.EUW1 | PlatformId.NA1)> = {
		"EUW": PlatformId.EUW1,
		"NA": PlatformId.NA1
	};
	return mapping[region.toUpperCase()];
}

function generateLeagueCustomMessage(participant: RiotAPITypes.MatchV5.ParticipantDTO): string | undefined { // matchInfo: RiotAPITypes.MatchV5.MatchInfoDTO
	let result = undefined;

	// If the player play Anivia
	if (participant.championName == "Anivia") {
		result = addCustomMessage(result, "🎵 Floflo toujours dans son délire 🎵");
	}

	// If the player play Zoe and win
	if (participant.championName == "Zoe" && participant.win == true) {
		result = addCustomMessage(result, "🚨 Controle de police ! Photo de pied svp 🚨");
	}

	// If the player play Zoe and lose
	if (participant.championName == "Zoe" && participant.win == false) {
		result = addCustomMessage(result, "Team diff");
	}

	// If the player play Gwen and win
	if (participant.championName == "Gwen" && participant.win == true) {
		result = addCustomMessage(result, "☕️ Cafe chouchou ! ☕️");
	}

	// If the player play Gwen and lose
	if (participant.championName == "Gwen" && participant.win == false) {
		result = addCustomMessage(result, "☕️ Cafe choucroute ? ☕️");
	}

	// If the player play jungle and loose
	if (participant.teamPosition == "JUNGLE" && participant.win == false) {
		result = addCustomMessage(result, "Ouin ouin ? 😭");
	}

	// El famosso 2 7
	if (participant.kills == 2 && participant.deaths == 7) {
		result = addCustomMessage(result, "💪🏿 Tu connais la recette ? 💪🏿");
	}

	// If the player don't ward
	if (participant.visionScore <= 8) {
		result = addCustomMessage(result, "Ta mere c'est une pute si tu ward ouuuuuuuu ?");
	}

	// If the player died too much
	if (participant.deaths >= 9) {
		result = addCustomMessage(result, "💀 Maxime approuved 💀");
	}

	if (participant.kills >= 9) {
		result = addCustomMessage(result, "Un massacre !");
	}

	if (participant.totalDamageDealtToChampions >= 30000) {
		result = addCustomMessage(result, "Ca fait la bagarre");
	}

	if (participant.gameEndedInSurrender == true && participant.win == false) {
		result = addCustomMessage(result, "Et ca surrend en plus ...");
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if (((participant as any).riotIdGameName.toLowerCase() === "jukeboox81" || (participant as any).riotIdGameName.toLowerCase() === "baltrou") && participant.win == false) {
		result = addCustomMessage(result, "Normal, il est jamais la 💀🐸");
	}

	return result;
}

function generateTFTCustomMessage(participant: RiotAPITypes.TftMatch.ParticipantDTO): string | undefined { // matchInfo: RiotAPITypes.MatchV5.MatchInfoDTO
	let result = undefined;

	if (participant.placement == 1) {
		result = addCustomMessage(result, "SIUUUU !");
	}

	if (participant.placement == 7) {
		result = addCustomMessage(result, "Full chatte hein ...");
	}

	if (participant.placement == 8) {
		result = addCustomMessage(result, "Arrete de chialer stp ...");
	}

	if (participant.total_damage_to_players >= 200) {
		result = addCustomMessage(result, "Le massacre !");
	}

	if ((participant.placement >= 7) && (participant.gold_left >= 25)) {
		result = addCustomMessage(result, "On est mort avec de la tune en plus ???");
	}

	return result;
}

function getMainTrait(traits: RiotAPITypes.TftMatch.TraitDTO[]): string | null {
	if (!traits || traits.length === 0) return null;

	// Filtrer les traits inutiles (par exemple les "TFT7_TrainerTrait" qui peuvent avoir num_units mais pas être vraiment joués)
	const filteredTraits = traits.filter(trait => trait.tier_current > 0);

	if (filteredTraits.length === 0) return null;

	// Trier par nombre d'unités, puis par style décroissant
	filteredTraits.sort((a, b) => {
		if (b.num_units !== a.num_units) return b.num_units - a.num_units;
		if ((b.style ?? 0) !== (a.style ?? 0)) return (b.style ?? 0) - (a.style ?? 0);
		return 0;
	});

	return filteredTraits[0].name.replace(/^TFT\d+_/, ''); // enlève "TFT14_", "TFT13_", etc.
}

function getTotalPings(participant: ParticipantWithPings): number {
	const pingKeys: PingKeys[] = [
		"basicPings",
		"allInPings",
		"assistMePings",
		"baitPings",
		"enemyMissingPings",
		"enemyVisionPings",
		"holdPings",
		"needVisionPings",
		"onMyWayPings",
		"pushPings",
		"retreatPings",
		"visionClearedPings",
		"visionPings",
	];

	return pingKeys.reduce((sum, key) => {
		const value = participant[key];
		return sum + (typeof value === "number" ? value : 0);
	}, 0);
}

function getTeamLevelFromMatch(participants: RiotAPITypes.MatchV5.ParticipantDTO[], gameDurationSeconds: number, puuid: string, lang: string): string {
	const participant = participants.find((p: RiotAPITypes.MatchV5.ParticipantDTO) => p.puuid === puuid);
	if (!participant) return "Unknown";

	const scores = participants.map((p: RiotAPITypes.MatchV5.ParticipantDTO, index: number, array: RiotAPITypes.MatchV5.ParticipantDTO[]) => computePlayerScore(p, array, gameDurationSeconds));

	const playerTeamId = participant.teamId;
	const teammateIndex: Array<number> = [];
	for (let index = 0; index < participants.length; index++) {
		if (participants[index].teamId === playerTeamId) {
			teammateIndex.push(index);
		}
	}
	const teammatesWithScores = teammateIndex.map(i => ({
		participant: participants[i],
		score: scores[i],
	}));

	const sortedTeammates = teammatesWithScores.sort((a, b) => b.score - a.score);
	const currentPlayerPositionInTheTeam = sortedTeammates.findIndex(obj => obj.participant.puuid === participant.puuid);

	// Seuils basés sur 100
	if (lang === 'fr') {
		switch (currentPlayerPositionInTheTeam) {
			case 0: return "🥇 MVP";
			case 1: return "🥈 Solide";
			case 2: return "🫥 Invisible";
			case 3: return "🐢 Traîné";
			default: return "🤡 Ancre";
		}
	}
	switch (currentPlayerPositionInTheTeam) {
		case 0: return "🥇 MVP";
		case 1: return "🥈 Solid";
		case 2: return "🫥 Invisible";
		case 3: return "🐢 Dragged";
		default: return "🤡 Anchor";
	}
}

function computePlayerScore(player: RiotAPITypes.MatchV5.ParticipantDTO, allPlayers: RiotAPITypes.MatchV5.ParticipantDTO[], gameDurationSeconds: number): number {
	const minutes = gameDurationSeconds / 60;
	if (minutes < 5) return 0; // Ignore too short games (remakes)
	const role = player.teamPosition || "UNKNOWN";

	const playerTeamId = player.teamId;
	const teammates = allPlayers.filter(p => p.teamId === playerTeamId);
	const totalTeamKills = teammates.reduce((sum, p) => sum + p.kills, 0);

	const csValue = player.neutralMinionsKilled + player.totalMinionsKilled;

	const stats = {
		kills: player.kills,
		deaths: player.deaths,
		assists: player.assists,
		kp: totalTeamKills > 0 ? (player.kills + player.assists) / totalTeamKills : 0,
		csPerMin: csValue / minutes,
		goldPerMin: player.goldEarned / minutes,
		dmgPerMin: player.totalDamageDealtToChampions / minutes,
		visionPerMin: player.visionScore / minutes,
		damageToObjectives: player.damageDealtToObjectives
	};

	type RoleData = Record<string, number>;
	type RoleBasedData = Record<string, RoleData>;

	const weightsByRole: RoleBasedData = {
		TOP: { kills: 10, deaths: 10, assists: 5, kp: 10, csPerMin: 15, goldPerMin: 10, dmgPerMin: 15, visionPerMin: 5, damageToObjectives: 15 },
		JUNGLE: { kills: 10, deaths: 10, assists: 10, kp: 20, csPerMin: 5, goldPerMin: 10, dmgPerMin: 10, visionPerMin: 10, damageToObjectives: 15 },
		MIDDLE: { kills: 15, deaths: 10, assists: 5, kp: 10, csPerMin: 15, goldPerMin: 10, dmgPerMin: 20, visionPerMin: 5, damageToObjectives: 5 },
		BOTTOM: { kills: 15, deaths: 10, assists: 5, kp: 10, csPerMin: 20, goldPerMin: 15, dmgPerMin: 20, visionPerMin: 2, damageToObjectives: 5 },
		UTILITY: { kills: 2, deaths: 10, assists: 20, kp: 20, csPerMin: 1, goldPerMin: 5, dmgPerMin: 8, visionPerMin: 20, damageToObjectives: 2 },
		UNKNOWN: { kills: 10, deaths: 10, assists: 10, kp: 10, csPerMin: 10, goldPerMin: 10, dmgPerMin: 10, visionPerMin: 10, damageToObjectives: 10 }
	};
	// --- NEW: Role-based "target" benchmarks for an excellent game ---
	const targetStatsByRole: RoleBasedData = {
		TOP: {
			kills: 8, deaths: 4, assists: 7, kp: 0.50,
			csPerMin: 7.5, goldPerMin: 420, dmgPerMin: 700,
			visionPerMin: 0.8, damageToObjectives: 12000
		},
		JUNGLE: {
			kills: 7, deaths: 4, assists: 12, kp: 0.70, // KP very important
			csPerMin: 5.1, goldPerMin: 430, dmgPerMin: 620,
			visionPerMin: 1.5, damageToObjectives: 23000 // Crucial objective damage
		},
		MIDDLE: {
			kills: 10, deaths: 4, assists: 8, kp: 0.60,
			csPerMin: 8.0, goldPerMin: 450, dmgPerMin: 900, // High damage
			visionPerMin: 0.9, damageToObjectives: 8000
		},
		BOTTOM: { // ADC
			kills: 11, deaths: 4, assists: 8, kp: 0.55,
			csPerMin: 8.5, // CS very important
			goldPerMin: 480, dmgPerMin: 1000, // Very high damage
			visionPerMin: 0.7, damageToObjectives: 10000
		},
		UTILITY: { // Support
			kills: 2, deaths: 5, assists: 18, // Very important assists
			kp: 0.65, // KP very important
			csPerMin: 1.5, // CS less important
			goldPerMin: 280, dmgPerMin: 300,
			visionPerMin: 2.0, // Vision crucial
			damageToObjectives: 3000
		},
		UNKNOWN: { // Generic fallback
			kills: 7, deaths: 5, assists: 10, kp: 0.50,
			csPerMin: 6.0, goldPerMin: 400, dmgPerMin: 600,
			visionPerMin: 1.0, damageToObjectives: 8000
		}
	};

	const currentWeights = weightsByRole[role] || weightsByRole.UNKNOWN;
	const currentTargets = targetStatsByRole[role] || targetStatsByRole.UNKNOWN;

	let score = 0;
	let deathPenalty = 0; // Initialize death penalty

	for (const key in stats) {
		const statName = key as keyof typeof stats;
		const playerValue = stats[statName];

		if (!currentTargets[statName] || !currentWeights[statName]) continue;

		const targetValue = currentTargets[statName];
		const weight = currentWeights[statName];

		let ratio = 0;

		if (statName === 'deaths') {
			if (playerValue <= targetValue) {
				// If fewer deaths than target, reward/don't penalize.
				// Ratio goes from 1 (0 deaths) to approx. 0.5 (targetValue deaths).
				ratio = 1 / (1 + (playerValue / targetValue));
				score += Math.pow(ratio, 1.2) * weight;
			} else {
				// Penalty for deaths above target.
				const excessDeaths = playerValue - targetValue;
				// NEW: Reduced exponent and multiplier for a softer penalty.
				// With an exponent of 1.4 and a multiplier of 0.3, it gets closer to ~45 points for 11 deaths
				// (assuming a targetValue of 4 or 5 and a weight of 10).
				deathPenalty += Math.pow(excessDeaths, 1.4) * (weight * 0.3);
			}
			continue;
		} else {
			// For other stats, allow ratio to exceed 1.0 to reward excellence.
			// Power of 1.2 is maintained to amplify good and bad performances.
			ratio = playerValue / targetValue;
			// Optional: You can add a very high ceiling to prevent disproportionate ratios in case of exceptionally low target stats.
			// ratio = Math.min(5, playerValue / targetValue); // Example ceiling at 5 times the target
			score += Math.pow(ratio, 1.2) * weight;
		}
	}

	// Apply death penalty to final score
	score = Math.max(0, score - deathPenalty);
	score = Math.min(100, score); // Ensure score never exceeds 100
	return Math.round(score);
}

function addCustomMessage(finalString: string | undefined, newString: string): string { // matchInfo: RiotAPITypes.MatchV5.MatchInfoDTO
	if (finalString == undefined) {
		finalString = newString;
	} else {
		finalString += "\n" + newString;
	}
	return finalString;
}

export interface PlayerLeagueGameInfo {
	gameEndTimestamp: number;
	gameDurationSeconds: number;
	totalCS: number;
	assists: number;
	deaths: number;
	kills: number;
	damage: number;
	visionScore: number;
	pings: number;
	scoreRating: number;
	teamRank: string;
	championId: number;
	championName: string;
	participantNumber: number;
	win: boolean;
	queueType: GameQueueType;
	customMessage: string | undefined;
}

export interface PlayerTFTGameInfo {
	gameEndTimestamp: number;
	placement: number;
	principalTrait: string | null;
	participantNumber: number,
	traits: RiotAPITypes.TftMatch.TraitDTO[];
	units: RiotAPITypes.TftMatch.UnitDTO[];
	win: boolean;
	queueType: GameQueueType;
	customMessage: string | undefined;
}


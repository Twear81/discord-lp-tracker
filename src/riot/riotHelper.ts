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
				[RiotAPITypes.METHOD_KEY.SUMMONER.GET_BY_PUUID]: 60000, // ms
				[RiotAPITypes.METHOD_KEY.LEAGUE.GET_ENTRIES_BY_SUMMONER]: 30000, // ms
				[RiotAPITypes.METHOD_KEY.ACCOUNT.GET_BY_RIOT_ID]: 60000, // ms
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
				[RiotAPITypes.METHOD_KEY.TFT_SUMMONER.GET_BY_PUUID]: 60000, // ms
				[RiotAPITypes.METHOD_KEY.TFT_LEAGUE.GET_ENTRIES_BY_SUMMONER]: 30000, // ms
				[RiotAPITypes.METHOD_KEY.ACCOUNT.GET_BY_RIOT_ID]: 60000, // ms
				[RiotAPITypes.METHOD_KEY.TFT_MATCH.GET_MATCH_BY_ID]: 30000, // ms
				[RiotAPITypes.METHOD_KEY.TFT_MATCH.GET_MATCH_IDS_BY_PUUID]: 5000, // ms
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
		// Parse the gameDetail to get data for the specific player
		let result: PlayerLeagueGameInfo | null = null;
		let participantNumber = 0;
		for (const participant of gameDetail.info.participants) {
			participantNumber++;
			if (participant.puuid == puuid) {
				result = {
					gameDurationSeconds: gameDetail.info.gameDuration,
					totalCS: participant.totalMinionsKilled,
					damage: participant.totalDamageDealtToChampions,
					visionScore: participant.visionScore,
					pings: getTotalPings(participant),
					scoreRating: computePlayerScore(participant, gameDetail.info.participants, gameDetail.info.gameDuration),
					teamLevel: getTeamLevelFromMatch(gameDetail.info.participants, gameDetail.info.gameDuration, puuid, lang),
					participantNumber: participantNumber,
					gameEndTimestamp: gameDetail.info.gameEndTimestamp,
					assists: participant.assists,
					deaths: participant.deaths,
					kills: participant.kills,
					championId: participant.championId,
					championName: participant.championName,
					win: participant.win,
					queueType: gameDetail.info.queueId == 440 ? GameQueueType.RANKED_FLEX_SR : GameQueueType.RANKED_SOLO_5x5,
					customMessage: undefined
				};

				// Custom Message
				result.customMessage = generateLeagueCustomMessage(participant);
			}
		}
		if (result == null) {
			throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No game detail found for gameID ${gameID} for player ${puuid} for region ${region}`);
		} else {
			return result;
		}
	} catch (error) {
		console.error(`Error API Riot (getLeagueGameDetailForCurrentPlayer) :`, error);
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No game detail found for gameID ${gameID} for player ${puuid} for region ${region}`);
	}
}

export async function getTFTGameDetailForCurrentPlayer(puuid: string, gameID: string, region: string): Promise<PlayerTFTGameInfo> {
	try {
		const tftGameDetail: RiotAPITypes.TftMatch.MatchDTO = await getTFTGameDetail(gameID, region);
		// Parse the gameDetail to get data for the specific player
		let result: PlayerTFTGameInfo | null = null;
		for (const participant of tftGameDetail.info.participants) {
			if (participant.puuid == puuid) {
				result = {
					gameEndTimestamp: tftGameDetail.info.game_datetime,
					placement: participant.placement,
					principalTrait: getMainTrait(participant.traits),
					traits: participant.traits,
					units: participant.units,
					win: (participant.placement <= 4) ? true : false,
					queueType: GameQueueType.RANKED_TFT,
					customMessage: undefined
				};

				// Custom Message
				result.customMessage = generateTFTCustomMessage(participant);
			}
		}
		if (result == null) {
			throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No tft game detail found for gameID ${gameID} for player ${puuid} for region ${region}`);
		} else {
			return result;
		}
	} catch (error) {
		console.error(`Error API Riot (getTFTGameDetailForCurrentPlayer) :`, error);
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No tft game detail found for gameID ${gameID} for player ${puuid} for region ${region}`);
	}
}


export async function getLastRankedLeagueMatch(puuid: string, region: string, isFlex: boolean): Promise<string[]> {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		if (isFlex == false) {
			const queueID: number = 420; // 440 flex, 420 soloq
			return await limitedRequest(() => riotApi.matchV5.getIdsByPuuid({
				cluster: platformId,
				puuid,
				params: {
					queue: queueID,
					count: 1
				}
			})) as unknown as Promise<string[]>;
		} else {
			return await limitedRequest(() => riotApi.matchV5.getIdsByPuuid({
				cluster: platformId,
				puuid,
				params: {
					type: RiotAPITypes.MatchV5.MatchType.Ranked,
					count: 1
				}
			})) as unknown as Promise<string[]>;
		}
	} catch (error) {
		console.error(`Error API Riot (getLastRankedLeagueMatch) :`, error);
		throw new AppError(ErrorTypes.LASTMATCH_NOT_FOUND, `No last match found for player ${puuid} for region ${region}`);
	}
}

// Can't get only ranked match
export async function getLastTFTMatch(puuid: string, region: string): Promise<string[]> {
	try {
		const platformId = getPlatformIdFromRegionString(region);
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
		const summoner = await limitedRequest(() => riotApi.summoner.getByPUUID({
			region: platformId,
			puuid: puuid,
		})) as unknown as RiotAPITypes.Summoner.SummonerDTO;
		const summonerId = summoner.id; // Encrypted summonerId

		const leagueRankedInfo = await limitedRequest(() => riotApi.league.getEntriesBySummonerId({
			region: platformId,
			summonerId: summonerId,
		})) as unknown as RiotAPITypes.League.LeagueEntryDTO[];
		return leagueRankedInfo;
	} catch (error) {
		console.error(`Error API Riot (getPlayerRankInfo) :`, error);
		throw new AppError(ErrorTypes.LASTMATCH_NOT_FOUND, `No last match found for player ${puuid} for region ${region}`);
	}
}

export async function getTFTPlayerRankInfo(puuid: string, region: string): Promise<RiotAPITypes.TftLeague.LeagueEntryDTO[]> {
	try {
		const platformId = getLolRegionFromRegionString(region);
		const summoner = await limitedRequest(() => riotApiTFT.tftSummoner.getByPUUID({
			region: platformId,
			puuid: puuid,
		})) as unknown as RiotAPITypes.Summoner.SummonerDTO;
		const summonerId = summoner.id; // Encrypted summonerId

		const tftRankedInfo = await limitedRequest(() => riotApiTFT.tftLeague.getEntriesBySummonerId({
			region: platformId,
			summonerId: summonerId,
		})) as unknown as RiotAPITypes.TftLeague.LeagueEntryDTO[];
		return tftRankedInfo;
	} catch (error) {
		console.error(`Error API Riot (getTFTPlayerRankInfo) :`, error);
		throw new AppError(ErrorTypes.LASTMATCH_NOT_FOUND, `No last match found for player ${puuid} for region ${region}`);
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

	const playerTeamId = participant.teamId;

	const teammates = participants.filter(
		(p: RiotAPITypes.MatchV5.ParticipantDTO) => p.teamId === playerTeamId
	);

	const scores =  participants.map((p: RiotAPITypes.MatchV5.ParticipantDTO, index: number, array: RiotAPITypes.MatchV5.ParticipantDTO[]) => computePlayerScore(p, array, gameDurationSeconds));
	const playerIndex = teammates.findIndex((p: RiotAPITypes.MatchV5.ParticipantDTO) => p.puuid === puuid);
	const playerScore = scores[playerIndex];

	const avgTeammatesScore =
		(scores.reduce((a, b) => a + b, 0) - playerScore) / (scores.length - 1);

	const diff = playerScore - avgTeammatesScore;

	// Seuils basés sur 100
	if (lang === 'fr') {
		if (diff >= 30) return "🧠 T1";
		if (diff >= 20) return "🔥 Très solide";
		if (diff >= 10) return "👍 Plutôt bon";
		if (diff >= -10) return "😐 Moyen";
		if (diff >= -20) return "🫠 Faiblards";
		return "🤡 Dégueulasse";
	}
	if (diff >= 30) return "🧠 T1";
	if (diff >= 20) return "🔥 Really solid";
	if (diff >= 10) return "👍 Decent";
	if (diff >= -10) return "😐 Meh";
	if (diff >= -20) return "🫠 Weak";
	return "🤡 Awful";
}

function computePlayerScore(player: RiotAPITypes.MatchV5.ParticipantDTO, allPlayers: RiotAPITypes.MatchV5.ParticipantDTO[], gameDurationSeconds: number): number {
	const minutes = gameDurationSeconds / 60;
	const role = player.teamPosition || "UNKNOWN";

	// Pré-calculs du joueur
	const stats = {
		kills: player.kills,
		deaths: player.deaths,
		assists: player.assists,
		csPerMin: player.totalMinionsKilled / minutes,
		goldPerMin: player.goldEarned / minutes,
		dmgPerMin: player.totalDamageDealtToChampions / minutes,
		visionPerMin: player.visionScore / minutes,
		firstBlood: player.firstBloodKill ? 1 : 0
	};

	// Valeurs maximales globales
	const maxStats = {
		kills: Math.max(...allPlayers.map(p => p.kills)),
		deaths: Math.max(...allPlayers.map(p => p.deaths)),
		assists: Math.max(...allPlayers.map(p => p.assists)),
		csPerMin: Math.max(...allPlayers.map(p => p.totalMinionsKilled / minutes)),
		goldPerMin: Math.max(...allPlayers.map(p => p.goldEarned / minutes)),
		dmgPerMin: Math.max(...allPlayers.map(p => p.totalDamageDealtToChampions / minutes)),
		visionPerMin: Math.max(...allPlayers.map(p => p.visionScore / minutes)),
		firstBlood: 1
	};

	// Ratios (entre 0 et 1, ou 1 = parfait)
	const ratios = {
		kills: stats.kills / maxStats.kills,
		deaths: maxStats.deaths === 0 ? 1 : 1 - stats.deaths / maxStats.deaths,
		assists: stats.assists / maxStats.assists,
		csPerMin: stats.csPerMin / maxStats.csPerMin,
		goldPerMin: stats.goldPerMin / maxStats.goldPerMin,
		dmgPerMin: stats.dmgPerMin / maxStats.dmgPerMin,
		visionPerMin: stats.visionPerMin / maxStats.visionPerMin,
		firstBlood: stats.firstBlood
	};

	// Pondération : chaque stat compte pour X points
	type weights = {
		kills: number,
		deaths: number,
		assists: number,
		csPerMin: number,
		goldPerMin: number,
		dmgPerMin: number,
		visionPerMin: number,
		firstBlood: number
	};
	const roleBasedWeights: Record<string, weights> = {
		TOP: {
			kills: 15,
			deaths: 15,
			assists: 10,
			csPerMin: 20,
			goldPerMin: 15,
			dmgPerMin: 15,
			visionPerMin: 5,
			firstBlood: 5
		},
		JUNGLE: {
			kills: 15,
			deaths: 10,
			assists: 15,
			csPerMin: 10,
			goldPerMin: 15,
			dmgPerMin: 10,
			visionPerMin: 15,
			firstBlood: 10
		},
		MIDDLE: {
			kills: 20,
			deaths: 10,
			assists: 10,
			csPerMin: 15,
			goldPerMin: 15,
			dmgPerMin: 20,
			visionPerMin: 5,
			firstBlood: 5
		},
		BOTTOM: {
			kills: 20,
			deaths: 10,
			assists: 10,
			csPerMin: 20,
			goldPerMin: 15,
			dmgPerMin: 15,
			visionPerMin: 5,
			firstBlood: 5
		},
		UTILITY: {
			kills: 5,
			deaths: 10,
			assists: 25,
			csPerMin: 0,
			goldPerMin: 10,
			dmgPerMin: 10,
			visionPerMin: 30,
			firstBlood: 10
		}
	};

	let totalScore = 0;
	for (const key in ratios) {
		const ratio = (ratios as never)[key];
		const weight: number = (roleBasedWeights[role] as never)[key];
		totalScore += ratio * weight;
	}

	// Round sur 100
	return Math.round(totalScore);
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
	teamLevel: string;
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
	traits: RiotAPITypes.TftMatch.TraitDTO[];
	units: RiotAPITypes.TftMatch.UnitDTO[];
	win: boolean;
	queueType: GameQueueType;
	customMessage: string | undefined;
}


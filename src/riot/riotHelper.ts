import { PlatformId, RiotAPI, RiotAPITypes } from "@fightmegg/riot-api";
import { AppError, ErrorTypes } from "../error/error";
import dotenv from 'dotenv';
import Bottleneck from "bottleneck";
import { GameQueueType } from "../tracking/GameQueueType";

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

export async function getLeagueGameDetailForCurrentPlayer(puuid: string, gameID: string, region: string): Promise<PlayerLeagueGameInfo> {
	try {
		const gameDetail = await getGameDetail(gameID, region);
		// Parse the gameDetail to get data for the specific player
		let result: PlayerLeagueGameInfo | null = null;
		for (const participant of gameDetail.info.participants) {
			if (participant.puuid == puuid) {
				result = {
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
		const tftGameDetail = await getTFTGameDetail(gameID, region);
		// Parse the gameDetail to get data for the specific player
		let result: PlayerTFTGameInfo | null = null;
		for (const participant of tftGameDetail.info.participants) {
			if (participant.puuid == puuid) {
				result = {
					gameEndTimestamp: tftGameDetail.info.game_datetime,
					placement: participant.placement,
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
	if (participant.visionScore <= 10) {
		result = addCustomMessage(result, "Ta mere c'est une pute si tu ward ouuuuuuuu ?");
	}

	// If the player died too much
	if (participant.deaths >= 9) {
		result = addCustomMessage(result, "💀 Maxime approuved 💀");
	}

	if ((participant.riotIdName.toLowerCase() == "jukeboox81" || participant.riotIdName.toLowerCase() == "baltrou") && participant.win == false) {
		result = addCustomMessage(result, "Normal, il est jamais la 💀🐸");
	}

	return result;
}

function generateTFTCustomMessage(participant: RiotAPITypes.TftMatch.ParticipantDTO): string | undefined { // matchInfo: RiotAPITypes.MatchV5.MatchInfoDTO
	let result = undefined;

	// If the player play Anivia
	if (participant.placement >= 7) {
		result = addCustomMessage(result, "Full chatte hein ...");
	}

	return result;
}

function addCustomMessage(finalString: string | undefined, newString: string): string | undefined { // matchInfo: RiotAPITypes.MatchV5.MatchInfoDTO
	if (finalString == undefined) {
		finalString = newString;
	} else {
		finalString += "\n" + newString;
	}
	return finalString;
}

export interface PlayerLeagueGameInfo {
	gameEndTimestamp: number;
	assists: number;
	deaths: number;
	kills: number;
	championId: number;
	championName: string;
	win: boolean;
	queueType: GameQueueType;
	customMessage: string | undefined;
}

export interface PlayerTFTGameInfo {
	gameEndTimestamp: number;
	placement: number;
	customMessage: string | undefined;
}


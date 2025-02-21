import { PlatformId, RiotAPI, RiotAPITypes } from "@fightmegg/riot-api";
import { AppError, ErrorTypes } from "../error/error";
import dotenv from 'dotenv';
import Bottleneck from "bottleneck";

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
const riotApi = new RiotAPI(process.env.RIOT_API!, config);

// Create a limiter to manage the rate limit
const limiter = new Bottleneck({
	minTime: 100, // Minimum 100ms between each request (10 req/sec max)
	maxConcurrent: 1, // Only one request at a time
});

// Wrapper function to limit API calls
const limitedRequest = limiter.wrap(async (fn: () => Promise<RiotAPITypes.Account.AccountDTO | RiotAPITypes.MatchV5.MatchDTO | string[] | RiotAPITypes.League.LeagueEntryDTO[]>) => {
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

export async function getGameDetailForCurrentPlayer(puuid: string, gameID: string, region: string): Promise<PlayerGameInfo> {
	try {
		const gameDetail = await getGameDetail(gameID, region);
		// Parse the gameDetail to get data for the specific player
		let result: PlayerGameInfo | null = null;
		for (const participant of gameDetail.info.participants) {
			if (participant.puuid == puuid) {
				result = {
					assists: participant.assists,
					deaths: participant.deaths,
					kills: participant.kills,
					championId: participant.championId,
					championName: participant.championName,
					win: participant.win,
					isFlex: gameDetail.info.queueId == 440 ? true : false,
				};
			}
		}
		if (result == null) {
			throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No game detail found for gameID ${gameID} for player ${puuid} for region ${region}`);
		} else {
			return result;
		}
	} catch (error) {
		console.error(`Error API Riot (getGameDetailForCurrentPlayer) :`, error);
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No game detail found for gameID ${gameID} for player ${puuid} for region ${region}`);
	}
}


export async function getLastMatch(puuid: string, region: string, isFlex: boolean): Promise<string[]> {
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
		console.error(`Error API Riot (getIdsByPuuid) :`, error);
		throw new AppError(ErrorTypes.LASTMATCH_NOT_FOUND, `No last match found for player ${puuid} for region ${region}`);
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

		return await limitedRequest(() => riotApi.league.getEntriesBySummonerId({
			region: platformId,
			summonerId: summonerId,
		})) as unknown as Promise<RiotAPITypes.League.LeagueEntryDTO[]>;
	} catch (error) {
		console.error(`Error API Riot (getIdsByPuuid) :`, error);
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

export interface PlayerGameInfo {
	assists: number;
	deaths: number;
	kills: number;
	championId: number;
	championName: string;
	win: boolean;
	isFlex: boolean;
}
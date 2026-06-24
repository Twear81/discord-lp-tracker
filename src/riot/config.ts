import { RiotAPI, RiotAPITypes } from "@fightmegg/riot-api";
import dotenv from "dotenv";
import Bottleneck from "bottleneck";

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

export const riotApi = new RiotAPI(process.env.RIOT_API!, config);
export const riotApiTFT = new RiotAPI(process.env.RIOT_API_TFT!, configTFT);

// Bottleneck configuration for Riot's limits
const limiter = new Bottleneck({
	minTime: 50, // 1 request per 50ms (ensures < 20 requests per second)
	reservoir: 100, // Max 100 requests in 2 minutes
	reservoirRefreshAmount: 100, // Reset to 100 requests
	reservoirRefreshInterval: 120000, // Every 2 minutes
});

export type RiotAPICall =
	| RiotAPITypes.Account.AccountDTO
	| RiotAPITypes.MatchV5.MatchDTO
	| string[]
	| RiotAPITypes.League.LeagueEntryDTO[]
	| RiotAPITypes.TftLeague.LeagueEntryDTO[]
	| RiotAPITypes.TftMatch.MatchDTO;

// Wrapper function to limit API calls
export async function limitedRequest<T extends RiotAPICall>(apiCallFn: () => Promise<T>): Promise<T> {
	const response = await limiter.schedule(() => apiCallFn());
	return response as T;
}

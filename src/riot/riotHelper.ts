import { PlatformId, RiotAPI, RiotAPITypes } from "@fightmegg/riot-api";
import { leagueAPI } from '../../config.json';
import { AppError, ErrorTypes } from "../error/error";

const riotApi = new RiotAPI(leagueAPI);

export async function getSummonerByName(accountName: string, tag: string, region: string) {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		return await riotApi.account.getByRiotId({
			region: platformId,
			gameName: accountName,
			tagLine: tag,
		});
	} catch (error) {
		console.error(`Error API Riot (getSummonerByName) :`, error);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `No player found for ${accountName}#${tag} for region ${region}`);
	}
}

async function getGameDetail(gameID: string, region: string) {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		return await riotApi.matchV5.getMatchById({
			cluster: platformId,
			matchId: gameID
		});
	} catch (error) {
		console.error(`Error API Riot (getGameDetail) :`, error);
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No game detail found for gameID ${gameID} for region ${region}`);
	}
}

export async function getGameDetailForCurrentPlayer(puuid: string, gameID: string, region: string) {
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


export async function getLastMatch(puuid: string, region: string, isFlex: boolean) {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		if (isFlex == false) {
			const queueID: number = 420; // 440 flex, 420 soloq
			return await riotApi.matchV5.getIdsByPuuid({
				cluster: platformId,
				puuid,
				params: {
					queue: queueID,
					count: 1
				}
			});
		} else {
			return await riotApi.matchV5.getIdsByPuuid({
				cluster: platformId,
				puuid,
				params: {
					type: RiotAPITypes.MatchV5.MatchType.Ranked,
					count: 1
				}
			});
		}
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

export interface PlayerGameInfo {
	assists: number;
	deaths: number;
	kills: number;
	championId: number;
	championName: string;
	win: boolean;
	isFlex: boolean;
}
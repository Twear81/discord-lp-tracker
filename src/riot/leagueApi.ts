import { RiotAPITypes } from "@fightmegg/riot-api";
import { AppError, ErrorTypes } from "../error/error";
import { GameQueueType } from "../tracking/GameQueueType";
import logger from "../logger/logger";
import { limitedRequest, riotApi } from "./config";
import { getPlatformIdFromRegionString, getLolRegionFromRegionString } from "./region";
import { PlayerLeagueGameInfo } from "./types";
import { computePlayerScore } from "./score";
import { getTotalPings, getTeamLevelFromMatch } from "./matchStats";
import { generateLeagueCustomMessage } from "./customMessages";

export async function getSummonerByName(accountName: string, tag: string, region: string): Promise<RiotAPITypes.Account.AccountDTO> {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		return await limitedRequest(() => riotApi.account.getByRiotId({
			region: platformId,
			gameName: accountName,
			tagLine: tag,
		})) as unknown as Promise<RiotAPITypes.Account.AccountDTO>;
	} catch (error) {
		logger.error(`Error API Riot (getSummonerByName) :`, error);
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
		logger.error(`Error API Riot (getSummonerByName) :`, error);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `No player found for puuid:${puuid} for region ${region}`);
	}
}

export async function getGameDetail(gameID: string, region: string): Promise<RiotAPITypes.MatchV5.MatchDTO> {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		return await limitedRequest(() => riotApi.matchV5.getMatchById({
			cluster: platformId,
			matchId: gameID
		})) as unknown as Promise<RiotAPITypes.MatchV5.MatchDTO>;
	} catch (error) {
		logger.error(`Error API Riot (getGameDetail) :`, error);
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No game detail found for gameID ${gameID} for region ${region}`);
	}
}

export async function getLeagueGameDetailForCurrentPlayer(puuid: string, gameID: string, region: string, lang: string): Promise<PlayerLeagueGameInfo> {
	try {
		const gameDetail: RiotAPITypes.MatchV5.MatchDTO = await getGameDetail(gameID, region);
		const { info: { gameDuration, participants, gameEndTimestamp, queueId } } = gameDetail;

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
			matchId: gameID,
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
		logger.error(`Riot API Error (getLeagueGameDetailForCurrentPlayer):`, error);
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `Game details not found for game ${gameID}, player ${puuid}, and region ${region}`);
	}
}

export async function getLastRankedLeagueMatch(puuid: string, region: string, isFlex: boolean): Promise<string[]> {
	try {
		const platformId = getPlatformIdFromRegionString(region);

		let params;
		if (isFlex) {
			params = {
				type: RiotAPITypes.MatchV5.MatchType.Ranked, // All ranked game
				count: 1
			};
		} else {
			params = {
				queue: 420, // default to Ranked Solo/Duo
				count: 1
			};
		}

		return await limitedRequest(() => riotApi.matchV5.getIdsByPuuid({
			cluster: platformId,
			puuid,
			params,
		})) as unknown as Promise<string[]>;

	} catch (error) {
		logger.error(`Riot API Error (getLastRankedLeagueMatch):`, error);
		throw new AppError(ErrorTypes.LASTMATCH_NOT_FOUND, `No last match found for player ${puuid} for region ${region}`);
	}
}

export async function getPlayerRankInfo(puuid: string, region: string): Promise<RiotAPITypes.League.LeagueEntryDTO[]> {
	try {
		const platformId = getLolRegionFromRegionString(region);
		return await limitedRequest(() => riotApi.league.getEntriesByPUUID({
			region: platformId,
			encryptedPUUID: puuid,
		})) as unknown as RiotAPITypes.League.LeagueEntryDTO[];
	} catch (error) {
		logger.error(`Error API Riot (getPlayerRankInfo) :`, error);
		throw new AppError(ErrorTypes.PLAYERRANKINFO_NOT_FOUND, `No PLAYERRANKINFO found for player puuid:${puuid} for region ${region}`);
	}
}

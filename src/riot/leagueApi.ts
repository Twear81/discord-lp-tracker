import { Constants } from "twisted";
import { AppError, ErrorTypes } from "../error/error";
import { GameQueueType } from "../tracking/GameQueueType";
import logger from "../logger/logger";
import { lolApi, riotApiLol, riotCached, riotCachedWithRetry, TTL } from "./config";
import { regionToPlatform } from "./region";
import { PlayerLeagueGameInfo } from "./types";
import { computePlayerScore } from "./score";
import { getTotalPings, getTeamLevelFromMatch } from "./matchStats";
import { generateLeagueCustomMessage } from "./customMessages";
import type { AccountDto, MatchV5MatchDto, SummonerLeagueDto, V5ParticipantDto } from "./twistedTypes";

// Account-V1: getByRiotId(gameName, tagLine, region) -> ApiResponseDTO<AccountDto>
export async function getSummonerByName(accountName: string, tag: string, region: string): Promise<AccountDto> {
	try {
		const platform = regionToPlatform(region);
		const cluster = Constants.regionToRegionGroupForAccountAPI(platform);
		return await riotCached(
			`account|getByRiotId|${accountName}|${tag}|${cluster}`,
			TTL.ACCOUNT_BY_RIOT_ID_MS,
			() => riotApiLol.Account.getByRiotId(accountName, tag, cluster),
		);
	} catch (error) {
		logger.error(`Error API Riot (getSummonerByName) :`, error);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `No player found for ${accountName}#${tag} for region ${region}`);
	}
}

// Account-V1: getByPUUID(puuid, region) -> ApiResponseDTO<AccountDto>
export async function getAccountByPUUID(puuid: string, region: string): Promise<AccountDto> {
	try {
		const platform = regionToPlatform(region);
		const cluster = Constants.regionToRegionGroupForAccountAPI(platform);
		return await riotCached(
			`account|getByPUUID|${puuid}|${cluster}`,
			TTL.ACCOUNT_BY_PUUID_MS,
			() => riotApiLol.Account.getByPUUID(puuid, cluster),
		);
	} catch (error) {
		logger.error(`Error API Riot (getAccountByPUUID) :`, error);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `No player found for puuid:${puuid} for region ${region}`);
	}
}

// MatchV5: get(matchId, region) -> ApiResponseDTO<MatchV5DTOs.MatchDto>
export async function getGameDetail(gameID: string, region: string): Promise<MatchV5MatchDto> {
	try {
		const cluster = Constants.regionToRegionGroup(regionToPlatform(region));
		return await riotCached(
			`matchV5|getById|${gameID}|${cluster}`,
			TTL.MATCH_BY_ID_MS,
			() => lolApi.MatchV5.get(gameID, cluster),
		);
	} catch (error) {
		logger.error(`Error API Riot (getGameDetail) :`, error);
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No game detail found for gameID ${gameID} for region ${region}`);
	}
}

export async function getLeagueGameDetailForCurrentPlayer(puuid: string, gameID: string, region: string, lang: string): Promise<PlayerLeagueGameInfo> {
	try {
		const gameDetail: MatchV5MatchDto = await getGameDetail(gameID, region);
		const { info: { gameDuration, participants, gameEndTimestamp, queueId } } = gameDetail;

		let queueType: GameQueueType;
		switch (queueId) {
			case 420:
				queueType = GameQueueType.RANKED_SOLO_5x5;
				break;
			case 440:
				queueType = GameQueueType.RANKED_FLEX_SR;
				break;
			case 700:
				queueType = GameQueueType.RANKED_CLASH;
				break;
			case 710:
				queueType = GameQueueType.RANKED_5v5;
				break;
			default:
				throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `Queue type not found for queueId:${queueId} for game:${gameID}`);
		}

		const participant: V5ParticipantDto | undefined = participants.find((p: V5ParticipantDto) => p.puuid === puuid);
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
			participantNumber: participants.findIndex((p: V5ParticipantDto) => p.puuid === puuid) + 1,
			gameEndTimestamp,
			assists: participant.assists,
			deaths: participant.deaths,
			kills: participant.kills,
			championId: participant.championId,
			championName: participant.championName,
			win: participant.win,
			queueType,
			customMessage: generateLeagueCustomMessage(participant, participants, gameEndTimestamp, gameDuration, lang)
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

// MatchV5: list(puuid, region, query) -> ApiResponseDTO<string[]>
// Cached 5s and goes through the duplicate-job retry path because the
// tracking cron can overlap itself on redeploys.
export async function getLastRankedLeagueMatch(puuid: string, region: string): Promise<string[]> {
	try {
		const cluster = Constants.regionToRegionGroup(regionToPlatform(region));
		const query = { count: 1 };
		return await riotCachedWithRetry(
			`matchV5|list|${puuid}|${cluster}`,
			TTL.MATCH_IDS_MS,
			() => lolApi.MatchV5.list(puuid, cluster, query),
		);
	} catch (error) {
		logger.error(`Riot API Error (getLastRankedLeagueMatch):`, error);
		throw new AppError(ErrorTypes.LASTMATCH_NOT_FOUND, `No last match found for player ${puuid} for region ${region}`);
	}
}

// League-V4: byPUUID(puuid, region) -> ApiResponseDTO<SummonerLeagueDto[]>
export async function getPlayerRankInfo(puuid: string, region: string): Promise<SummonerLeagueDto[]> {
	try {
		const platform = regionToPlatform(region);
		return await riotCached(
			`league|byPUUID|${puuid}|${platform}`,
			TTL.LEAGUE_ENTRIES_MS,
			() => lolApi.League.byPUUID(puuid, platform),
		);
	} catch (error) {
		logger.error(`Error API Riot (getPlayerRankInfo) :`, error);
		throw new AppError(ErrorTypes.PLAYERRANKINFO_NOT_FOUND, `No PLAYERRANKINFO found for player puuid:${puuid} for region ${region}`);
	}
}

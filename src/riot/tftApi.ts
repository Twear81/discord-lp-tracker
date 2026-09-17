import { Constants } from "twisted";
import { AppError, ErrorTypes } from "../error/error";
import { GameQueueType } from "../tracking/GameQueueType";
import logger from "../logger/logger";
import { riotApiTft, riotCached, riotCachedWithRetry, tftApi, TTL } from "./config";
import { regionToPlatform } from "./region";
import { PlayerTFTGameInfo } from "./types";
import { getMainTrait, getStageFromRound } from "./matchStats";
import { generateTFTCustomMessage } from "./customMessages";
import { getLittleLegendIconUrl } from "./tactician";
import type { MatchTFTDto, TFTAccountDto, TFTLeagueEntryDto, TFTParticipantDto } from "./twistedTypes";

// Riot's TFT companion JSON includes `item_ID` (the little legend skin id)
// but twisted's typed wrapper only exposes content_ID / skin_ID / species.
// Accessing `item_ID` therefore requires a local widening cast at the
// callsite. The cast widens *both* the type and the optionality: the API
// sometimes omits `companion` entirely, so we degrade to skin 0 instead of
// letting `companion.item_ID` throw a TypeError mid-game-processing.
type CompanionWithItemId = { item_ID: number };

// Account-V1: getByRiotId(gameName, tagLine, region) -> ApiResponseDTO<AccountDto>
// Routed through the TFT key because Account-V1 returns a different PUUID
// per key (confirmed empirically against database.sqlite).
export async function getTFTSummonerByName(accountName: string, tag: string, region: string): Promise<TFTAccountDto> {
	try {
		const platform = regionToPlatform(region);
		const cluster = Constants.regionToRegionGroupForAccountAPI(platform);
		return await riotCached(
			`account|getByRiotId|${accountName}|${tag}|${cluster}`,
			TTL.ACCOUNT_BY_RIOT_ID_MS,
			() => riotApiTft.Account.getByRiotId(accountName, tag, cluster),
		);
	} catch (error) {
		logger.error(`Error API Riot (getTFTSummonerByName) :`, error);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `No player found for ${accountName}#${tag} for region ${region}`);
	}
}

// TftMatch: get(matchId, region) -> ApiResponseDTO<MatchTFTDTO>
export async function getTFTGameDetail(gameID: string, region: string): Promise<MatchTFTDto> {
	try {
		const cluster = Constants.regionToRegionGroup(regionToPlatform(region));
		return await riotCached(
			`tftMatch|getById|${gameID}|${cluster}`,
			TTL.MATCH_BY_ID_MS,
			() => tftApi.Match.get(gameID, cluster),
		);
	} catch (error) {
		logger.error(`Error API Riot (getTFTGameDetail) :`, error);
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No game detail found for gameID ${gameID} for region ${region}`);
	}
}

export async function getTFTGameDetailForCurrentPlayer(puuid: string, gameID: string, region: string, lang: string): Promise<PlayerTFTGameInfo> {
	const tftGameDetail: MatchTFTDto = await getTFTGameDetail(gameID, region);
	const { info: { queue_id, participants, game_datetime, game_length } } = tftGameDetail;

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

	const participant: TFTParticipantDto | undefined = participants.find(p => p.puuid === puuid);
	if (!participant) {
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No participant found for player ${puuid} in game ${gameID}`);
	}

	const companion = participant.companion as unknown as CompanionWithItemId | undefined;
	const companionItemId = companion?.item_ID ?? 0;

	return {
		gameEndTimestamp: game_datetime,
		gameDurationSeconds: game_length,
		littleLegendIconUrl: await getLittleLegendIconUrl(companionItemId),
		placement: participant.placement,
		mainTraits: getMainTrait(participant.traits),
		level: participant.level,
		roundEliminated: getStageFromRound(participant.last_round),
		playersEliminated: participant.players_eliminated,
		totalDamageToPlayers: participant.total_damage_to_players,
		goldLeft: participant.gold_left,
		participantNumber: participants.findIndex(p => p.puuid === puuid) + 1,
		traits: participant.traits,
		units: participant.units,
		win: participant.placement <= 4,
		queueType: queueType,
		customMessage: generateTFTCustomMessage(participant, game_datetime, lang)
	};
}

// TftMatch: list(puuid, region, query) -> ApiResponseDTO<string[]>
// Cached 5s and goes through the duplicate-job retry path.
export async function getLastTFTMatch(puuid: string, region: string): Promise<string[]> {
	try {
		const cluster = Constants.regionToRegionGroup(regionToPlatform(region));
		const query = { count: 1 };
		return await riotCachedWithRetry(
			`tftMatch|list|${puuid}|${cluster}`,
			TTL.MATCH_IDS_MS,
			() => tftApi.Match.list(puuid, cluster, query),
		);
	} catch (error) {
		logger.error(`Riot API Error (getLastTFTMatch):`, error);
		throw new AppError(ErrorTypes.LASTMATCH_NOT_FOUND, `No last tft match found for player ${puuid} for region ${region}`);
	}
}

// TftLeague: getByPUUID(puuid, region) -> ApiResponseDTO<LeagueEntryDTO[]>
export async function getTFTPlayerRankInfo(puuid: string, region: string): Promise<TFTLeagueEntryDto[]> {
	try {
		const platform = regionToPlatform(region);
		return await riotCached(
			`tftLeague|getByPUUID|${puuid}|${platform}`,
			TTL.LEAGUE_ENTRIES_MS,
			() => tftApi.League.getByPUUID(puuid, platform),
		);
	} catch (error) {
		logger.error(`Error API Riot (getTFTPlayerRankInfo) :`, error);
		throw new AppError(ErrorTypes.PLAYERRANKINFO_NOT_FOUND, `No PLAYERRANKINFO tft found for player puuid:${puuid} for region ${region}`);
	}
}

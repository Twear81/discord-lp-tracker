import { AppError, ErrorTypes } from "../error/error";
import { GameQueueType } from "../tracking/GameQueueType";
import logger from "../logger/logger";
import { limitedRequest, riotApiTft, tftApi, withCache, withRetryOnDuplicateJob } from "./config";
import { getAccountClusterFromRegionString, getLolRegionFromRegionString, getPlatformIdFromRegionString } from "./region";
import { PlayerTFTGameInfo } from "./types";
import { getMainTrait, getStageFromRound } from "./matchStats";
import { generateTFTCustomMessage } from "./customMessages";
import { getLittleLegendIconUrl } from "./tactician";
import type { MatchTFTDto, TFTAccountDto, TFTLeagueEntryDto, TFTParticipantDto } from "./twistedTypes";

// Local cache TTLs mirror the old @fightmegg/riot-api config.byMethod values.
const TTL = {
	ACCOUNT_BY_RIOT_ID_MS: 60_000,
	TFT_LEAGUE_ENTRIES_MS: 30_000,
	TFT_MATCH_BY_ID_MS: 30_000,
	TFT_MATCH_IDS_MS: 5_000,
} as const;

// Riot's TFT companion JSON includes `item_ID` (the little legend skin id)
// but twisted's typed wrapper only exposes content_ID / skin_ID / species.
// Accessing `item_ID` requires a local widening cast at the callsite.
type CompanionWithItemId = { item_ID: number };

// Account-V1: getByRiotId(gameName, tagLine, region) -> ApiResponseDTO<AccountDto>
// Routed through the TFT key to double Account quota across both keys.
export async function getTFTSummonerByName(accountName: string, tag: string, region: string): Promise<TFTAccountDto> {
	try {
		const cluster = getAccountClusterFromRegionString(region);
		return await withCache(
			`account|getByRiotId|${accountName}|${tag}|${cluster}`,
			TTL.ACCOUNT_BY_RIOT_ID_MS,
			async () => {
				const { response } = await limitedRequest(() => riotApiTft.Account.getByRiotId(accountName, tag, cluster));
				return response;
			},
		);
	} catch (error) {
		logger.error(`Error API Riot (getTFTSummonerByName) :`, error);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `No player found for ${accountName}#${tag} for region ${region}`);
	}
}

// TftMatch: get(matchId, region) -> ApiResponseDTO<MatchTFTDTO>
export async function getTFTGameDetail(gameID: string, region: string): Promise<MatchTFTDto> {
	try {
		const cluster = getPlatformIdFromRegionString(region);
		return await withCache(
			`tftMatch|getById|${gameID}|${cluster}`,
			TTL.TFT_MATCH_BY_ID_MS,
			async () => {
				const { response } = await limitedRequest(() => tftApi.Match.get(gameID, cluster));
				return response;
			},
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

	const companion = participant.companion as unknown as CompanionWithItemId;

	return {
		gameEndTimestamp: game_datetime,
		gameDurationSeconds: game_length,
		littleLegendIconUrl: await getLittleLegendIconUrl(companion.item_ID),
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
// Cached 5s to dedupe rapid polls.
export async function getLastTFTMatch(puuid: string, region: string): Promise<string[]> {
	try {
		const cluster = getPlatformIdFromRegionString(region);
		return await withCache(
			`tftMatch|list|${puuid}|${cluster}`,
			TTL.TFT_MATCH_IDS_MS,
			() => withRetryOnDuplicateJob(() => limitedRequest(async () => {
				const { response } = await tftApi.Match.list(puuid, cluster, { count: 1 });
				return response;
			})),
		);
	} catch (error) {
		logger.error(`Riot API Error (getLastTFTMatch):`, error);
		throw new AppError(ErrorTypes.LASTMATCH_NOT_FOUND, `No last tft match found for player ${puuid} for region ${region}`);
	}
}

// TftLeague: getByPUUID(puuid, region) -> ApiResponseDTO<LeagueEntryDTO[]>
export async function getTFTPlayerRankInfo(puuid: string, region: string): Promise<TFTLeagueEntryDto[]> {
	try {
		const lolRegion = getLolRegionFromRegionString(region);
		return await withCache(
			`tftLeague|getByPUUID|${puuid}|${lolRegion}`,
			TTL.TFT_LEAGUE_ENTRIES_MS,
			async () => {
				const { response } = await limitedRequest(() => tftApi.League.getByPUUID(puuid, lolRegion));
				return response;
			},
		);
	} catch (error) {
		logger.error(`Error API Riot (getTFTPlayerRankInfo) :`, error);
		throw new AppError(ErrorTypes.PLAYERRANKINFO_NOT_FOUND, `No PLAYERRANKINFO tft found for player puuid:${puuid} for region ${region}`);
	}
}

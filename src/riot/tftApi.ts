import { RiotAPITypes } from "@fightmegg/riot-api";
import { AppError, ErrorTypes } from "../error/error";
import { GameQueueType } from "../tracking/GameQueueType";
import logger from "../logger/logger";
import { limitedRequest, riotApiTFT } from "./config";
import { getPlatformIdFromRegionString, getLolRegionFromRegionString } from "./region";
import { PlayerTFTGameInfo } from "./types";
import { getMainTrait, getStageFromRound } from "./matchStats";
import { generateTFTCustomMessage } from "./customMessages";
import { getLittleLegendIconUrl } from "./tactician";

export async function getTFTSummonerByName(accountName: string, tag: string, region: string): Promise<RiotAPITypes.Account.AccountDTO> {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		return await limitedRequest(() => riotApiTFT.account.getByRiotId({
			region: platformId,
			gameName: accountName,
			tagLine: tag,
		})) as unknown as Promise<RiotAPITypes.Account.AccountDTO>;
	} catch (error) {
		logger.error(`Error API Riot (getTFTSummonerByName) :`, error);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `No player found for ${accountName}#${tag} for region ${region}`);
	}
}

export async function getTFTGameDetail(gameID: string, region: string): Promise<RiotAPITypes.TftMatch.MatchDTO> {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		return await limitedRequest(() => riotApiTFT.tftMatch.getById({
			region: platformId,
			matchId: gameID
		})) as unknown as Promise<RiotAPITypes.TftMatch.MatchDTO>;
	} catch (error) {
		logger.error(`Error API Riot (getTFTGameDetail) :`, error);
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No game detail found for gameID ${gameID} for region ${region}`);
	}
}

export async function getTFTGameDetailForCurrentPlayer(puuid: string, gameID: string, region: string, lang: string): Promise<PlayerTFTGameInfo> {
	const tftGameDetail: RiotAPITypes.TftMatch.MatchDTO = await getTFTGameDetail(gameID, region);
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

	const participant = participants.find(p => p.puuid === puuid);
	if (!participant) {
		throw new AppError(ErrorTypes.GAMEDETAIL_NOT_FOUND, `No participant found for player ${puuid} in game ${gameID}`);
	}

	return {
		gameEndTimestamp: game_datetime,
		gameDurationSeconds: game_length,
		littleLegendIconUrl: await getLittleLegendIconUrl(participant.companion.item_ID),
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
		logger.error(`Error API Riot (getLastTFTMatch) :`, error);
		throw new AppError(ErrorTypes.LASTMATCH_NOT_FOUND, `No last tft match found for player ${puuid} for region ${region}`);
	}
}

export async function getTFTPlayerRankInfo(puuid: string, region: string): Promise<RiotAPITypes.TftLeague.LeagueEntryDTO[]> {
	try {
		const platformId = getLolRegionFromRegionString(region);
		return await limitedRequest(() => riotApiTFT.tftLeague.getEntriesByPUUID({
			region: platformId,
			puuid: puuid,
		})) as unknown as RiotAPITypes.TftLeague.LeagueEntryDTO[];
	} catch (error) {
		logger.error(`Error API Riot (getTFTPlayerRankInfo) :`, error);
		throw new AppError(ErrorTypes.PLAYERRANKINFO_NOT_FOUND, `No PLAYERRANKINFO tft found for player puuid:${puuid} for region ${region}`);
	}
}

import { Dto } from "twisted";
import { GameQueueType } from "../tracking/GameQueueType";

export type PingKeys =
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

export type ParticipantWithPings = Dto.MatchV5DTOs.ParticipantDto & {
	[key in PingKeys]?: number;
};

export interface PlayerLeagueGameInfo {
	matchId: string;
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
	teamRank: string;
	championId: number;
	championName: string;
	participantNumber: number;
	win: boolean;
	queueType: GameQueueType;
	customMessage: string | undefined;
}

export interface PlayerTFTGameInfo {
	gameEndTimestamp: number;
	gameDurationSeconds: number;
	littleLegendIconUrl: string;
	placement: number;
	mainTraits: Array<string>;
	level: number;
	roundEliminated: string;
	playersEliminated: number;
	totalDamageToPlayers: number;
	goldLeft: number;
	participantNumber: number;
	traits: Dto.TraitDto[];
	units: Dto.UnitDto[];
	win: boolean;
	queueType: GameQueueType;
	customMessage: string | undefined;
}

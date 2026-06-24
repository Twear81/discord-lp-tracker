import { RiotAPITypes } from "@fightmegg/riot-api";
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

export type ParticipantWithPings = RiotAPITypes.MatchV5.ParticipantDTO & {
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
	traits: RiotAPITypes.TftMatch.TraitDTO[];
	units: RiotAPITypes.TftMatch.UnitDTO[];
	win: boolean;
	queueType: GameQueueType;
	customMessage: string | undefined;
}

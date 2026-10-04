import { describe, it, expect } from 'vitest';
import {
	getMainTrait,
	getStageFromRound,
	getTeamLevelFromMatch,
	getTeamRankLabelFromPosition,
	getTeamRankPositionFromLabel,
	getTotalPings,
} from './matchStats';
import type { ParticipantWithPings } from './types';
import type { TFTTraitDto, V5ParticipantDto } from './twistedTypes';

describe('getStageFromRound', () => {
	it('returns N/A for round 0', () => {
		expect(getStageFromRound(0)).toBe('N/A');
	});

	it('maps rounds 1-4 to stage 1', () => {
		expect(getStageFromRound(1)).toBe('1-1');
		expect(getStageFromRound(4)).toBe('1-4');
	});

	it('starts stage 2 at round 5 (after the PvE carousel round)', () => {
		expect(getStageFromRound(5)).toBe('2-1');
		expect(getStageFromRound(11)).toBe('2-7');
		expect(getStageFromRound(12)).toBe('3-1');
	});
});

describe('getMainTrait', () => {
	const trait = (name: string, num_units: number, tier_current: number, style?: number): TFTTraitDto =>
		({ name, num_units, tier_current, style } as TFTTraitDto);

	it('returns an empty list when no trait is active', () => {
		expect(getMainTrait([])).toEqual([]);
		expect(getMainTrait([trait('TFT2_A', 3, 0)])).toEqual([]);
	});

	it('keeps only active traits and strips the TFT<n>_ prefix', () => {
		const traits = [
			trait('TFT14_Bruiser', 4, 2),
			trait('TFT14_Sniper', 2, 0),
		];
		expect(getMainTrait(traits)).toEqual(['Bruiser']);
	});

	it('keeps ties on unit count and style together, capped at 2', () => {
		const traits = [
			trait('TFT14_A', 3, 1, 1),
			trait('TFT14_B', 3, 1, 1),
			trait('TFT14_C', 2, 1, 1),
		];
		expect(getMainTrait(traits)).toEqual(['A', 'B']);
	});

	it('sorts by unit count first, then by style', () => {
		const traits = [
			trait('TFT14_Low', 2, 1, 3),
			trait('TFT14_High', 6, 3, 0),
		];
		expect(getMainTrait(traits)).toEqual(['High']);
	});
});

describe('getTotalPings', () => {
	it('sums every numeric ping field and ignores missing ones', () => {
		const participant = {
			basicPings: 2,
			allInPings: 1,
			assistMePings: 0,
			onMyWayPings: 3,
			enemyMissingPings: undefined,
		} as unknown as ParticipantWithPings;

		expect(getTotalPings(participant)).toBe(6);
	});

	it('returns 0 for a participant without pings', () => {
		expect(getTotalPings({} as ParticipantWithPings)).toBe(0);
	});
});

describe('team rank labels', () => {
	it('maps positions to localized labels', () => {
		expect(getTeamRankLabelFromPosition(0, 'fr')).toBe('🥇 MVP');
		expect(getTeamRankLabelFromPosition(1, 'fr')).toBe('🥈 Solide');
		expect(getTeamRankLabelFromPosition(4, 'en')).toBe('🤡 Anchor');
		expect(getTeamRankLabelFromPosition(0, 'en')).toBe('🥇 MVP');
	});

	it('round-trips labels back to positions', () => {
		for (const lang of ['fr', 'en'] as const) {
			for (let position = 0; position <= 4; position++) {
				const label = getTeamRankLabelFromPosition(position, lang);
				expect(getTeamRankPositionFromLabel(label, lang)).toBe(position);
			}
		}
	});

	it('returns -1 for "Unknown" or unrecognized labels', () => {
		expect(getTeamRankPositionFromLabel('Unknown', 'en')).toBe(-1);
		expect(getTeamRankPositionFromLabel('Nope', 'en')).toBe(-1);
	});
});

describe('getTeamLevelFromMatch', () => {
	const baseParticipant = (puuid: string, teamId: number): V5ParticipantDto => ({
		puuid,
		teamId,
		teamPosition: 'MIDDLE',
		kills: 0,
		deaths: 0,
		assists: 0,
		goldEarned: 0,
		totalDamageDealtToChampions: 0,
		visionScore: 0,
		damageDealtToObjectives: 0,
		neutralMinionsKilled: 0,
		totalMinionsKilled: 0,
	} as unknown as V5ParticipantDto);

	const strong = { ...baseParticipant('strong', 100), kills: 10, deaths: 0, assists: 10, goldEarned: 20000, totalDamageDealtToChampions: 40000, visionScore: 40, damageDealtToObjectives: 20000, totalMinionsKilled: 300 };
	const weak = { ...baseParticipant('weak', 100), kills: 0, deaths: 9, assists: 0, goldEarned: 8000, totalDamageDealtToChampions: 8000, visionScore: 5, damageDealtToObjectives: 1000, totalMinionsKilled: 100 };
	const opponents = [
		{ ...baseParticipant('enemy1', 200), kills: 5, deaths: 5, assists: 5 },
		{ ...baseParticipant('enemy2', 200), kills: 4, deaths: 6, assists: 4 },
	];

	it('ranks the strongest teammate as MVP and the weakest below', () => {
		const participants = [strong, weak, ...opponents] as V5ParticipantDto[];
		const gameDurationSeconds = 30 * 60;

		expect(getTeamLevelFromMatch(participants, gameDurationSeconds, 'strong', 'en')).toBe('🥇 MVP');
		expect(getTeamLevelFromMatch(participants, gameDurationSeconds, 'weak', 'en')).toBe('🥈 Solid');
	});

	it('ignores opponents from the other team', () => {
		const participants = [strong, weak, ...opponents] as V5ParticipantDto[];

		// 'enemy1' plays well, but their team only contains the two enemies —
		// they are ranked among themselves, not against 'strong'.
		expect(getTeamLevelFromMatch(participants, 30 * 60, 'enemy1', 'en')).toBe('🥇 MVP');
	});

	it('returns Unknown for a participant not in the match', () => {
		const participants = [strong, weak, ...opponents] as V5ParticipantDto[];
		expect(getTeamLevelFromMatch(participants, 30 * 60, 'ghost', 'en')).toBe('Unknown');
	});
});

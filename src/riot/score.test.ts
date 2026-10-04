import { describe, it, expect } from 'vitest';
import { computePlayerScore } from './score';
import type { V5ParticipantDto } from './twistedTypes';

const baseParticipant = (puuid: string): V5ParticipantDto => ({
	puuid,
	teamId: 100,
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

const GAME_DURATION_SECONDS = 30 * 60;

describe('computePlayerScore', () => {
	it('returns 0 for games shorter than 5 minutes', () => {
		const player = baseParticipant('p1');
		expect(computePlayerScore(player, [player], 4 * 60)).toBe(0);
	});

	it('always stays within 0..100', () => {
		const beast = { ...baseParticipant('beast'), kills: 40, assists: 40, goldEarned: 80000, totalDamageDealtToChampions: 120000, visionScore: 200, damageDealtToObjectives: 80000, totalMinionsKilled: 500 };
		const feeder = { ...baseParticipant('feeder'), deaths: 25 };

		const beastScore = computePlayerScore(beast, [beast], GAME_DURATION_SECONDS);
		const feederScore = computePlayerScore(feeder, [feeder], GAME_DURATION_SECONDS);

		expect(beastScore).toBeLessThanOrEqual(100);
		expect(feederScore).toBeGreaterThanOrEqual(0);
	});

	it('scores a dominant player higher than a passive one', () => {
		const dominant = { ...baseParticipant('dominant'), kills: 10, deaths: 1, assists: 8, goldEarned: 22000, totalDamageDealtToChampions: 42000, visionScore: 45, damageDealtToObjectives: 22000, totalMinionsKilled: 320 };
		const passive = { ...baseParticipant('passive'), kills: 1, deaths: 6, assists: 2, goldEarned: 11000, totalDamageDealtToChampions: 12000, visionScore: 12, damageDealtToObjectives: 4000, totalMinionsKilled: 160 };

		const dominantScore = computePlayerScore(dominant, [dominant], GAME_DURATION_SECONDS);
		const passiveScore = computePlayerScore(passive, [passive], GAME_DURATION_SECONDS);

		expect(dominantScore).toBeGreaterThan(passiveScore);
	});

	it('penalizes deaths beyond the role target', () => {
		const chill = { ...baseParticipant('chill'), deaths: 1 };
		const inting = { ...baseParticipant('inting'), deaths: 15 };

		const chillScore = computePlayerScore(chill, [chill], GAME_DURATION_SECONDS);
		const intingScore = computePlayerScore(inting, [inting], GAME_DURATION_SECONDS);

		expect(intingScore).toBeLessThan(chillScore);
	});

	it('falls back to UNKNOWN weights for an empty team position', () => {
		const player = { ...baseParticipant('roam'), teamPosition: '' as V5ParticipantDto['teamPosition'] };

		// Sanity: the fallback must still produce a bounded score, not NaN.
		const score = computePlayerScore(player, [player], GAME_DURATION_SECONDS);
		expect(Number.isFinite(score)).toBe(true);
		expect(score).toBeGreaterThanOrEqual(0);
		expect(score).toBeLessThanOrEqual(100);
	});
});

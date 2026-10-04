import { describe, it, expect } from 'vitest';
import { sortPlayersByRank, RankSortable } from './rank';

interface Row extends RankSortable {
	playerId: number;
}

const row = (playerId: number, tier: string | null, rank: string | null, lp: number | null): Row => ({
	playerId,
	currentTier: tier,
	currentRank: rank,
	currentLP: lp,
});

describe('sortPlayersByRank', () => {
	it('sorts by tier, then division, then LP — strongest first', () => {
		const players = [
			row(1, 'DIAMOND', 'II', 0),
			row(2, 'CHALLENGER', 'I', 0),
			row(3, 'GOLD', 'I', 90),
			row(4, 'DIAMOND', 'I', 25),
			row(5, 'GOLD', 'I', 100),
			row(6, 'MASTER', 'I', 0),
			row(7, 'DIAMOND', 'II', 60),
		];

		const sorted = sortPlayersByRank(players);

		// DIAMOND II tie is broken by LP: player 7 (60 LP) before player 1 (0 LP).
		expect(sorted.map(p => p.playerId)).toEqual([2, 6, 4, 7, 1, 5, 3]);
	});

	it('drops rows with any null rank field', () => {
		const players = [
			row(1, 'GOLD', 'II', 50),
			row(2, null, 'I', 100),
			row(3, 'GOLD', null, 100),
			row(4, 'GOLD', 'I', null),
		];

		const sorted = sortPlayersByRank(players);

		expect(sorted.map(p => p.playerId)).toEqual([1]);
	});

	it('sorts unknown tier strings below IRON', () => {
		const players = [
			row(1, 'UNRANKED', 'I', 999),
			row(2, 'IRON', 'IV', 0),
		];

		const sorted = sortPlayersByRank(players);

		expect(sorted.map(p => p.playerId)).toEqual([2, 1]);
	});

	it('preserves extra properties through the generic', () => {
		const players = [row(1, 'GOLD', 'II', 50), row(2, 'GOLD', 'II', 60)];
		const sorted = sortPlayersByRank(players);

		expect(sorted[0].playerId).toBe(2);
		expect(sorted[0].currentLP).toBe(60);
	});
});

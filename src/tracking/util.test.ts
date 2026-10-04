import { describe, it, expect } from 'vitest';
import {
	calculateLPDifference,
	getAbsoluteLP,
	getDisplayRank,
	getDurationString,
	isGameDurationValid,
	isTimestampInRecapRange,
	MIN_GAME_DURATION_SECONDS,
	RECAP_CUTOFF_HOUR,
	RECAP_CUTOFF_MINUTE,
} from './util';

describe('getAbsoluteLP', () => {
	it('maps IRON IV 0 LP to 0', () => {
		expect(getAbsoluteLP('IRON', 'IV', 0)).toBe(0);
	});

	it('accounts for division and LP within a tier', () => {
		// IRON tier, rank I (3 * 100) + 50 LP
		expect(getAbsoluteLP('IRON', 'I', 50)).toBe(350);
		expect(getAbsoluteLP('BRONZE', 'IV', 0)).toBe(400);
		expect(getAbsoluteLP('SILVER', 'I', 100)).toBe(1200);
	});

	it('peaks at DIAMOND I below the MASTER band', () => {
		// 6 tiers * 400 + rank I (300) + 0 LP
		expect(getAbsoluteLP('DIAMOND', 'I', 0)).toBe(2700);
	});

	it('treats MASTER and above as a 2800+ band without divisions', () => {
		expect(getAbsoluteLP('MASTER', 'I', 500)).toBe(2800 + 500);
		expect(getAbsoluteLP('GRANDMASTER', 'I', 200)).toBe(2800 + 1000 + 200);
		expect(getAbsoluteLP('CHALLENGER', 'I', 0)).toBe(2800 + 2000);
	});

	it('returns 0 for unknown tier or division', () => {
		expect(getAbsoluteLP('UNRANKED', 'I', 50)).toBe(0);
		expect(getAbsoluteLP('GOLD', 'IX', 10)).toBe(0);
	});

	it('is case-insensitive', () => {
		expect(getAbsoluteLP('gold', 'i', 10)).toBe(getAbsoluteLP('GOLD', 'I', 10));
	});
});

describe('calculateLPDifference', () => {
	it('computes LP gained within the same division', () => {
		expect(calculateLPDifference('IV', 'IV', 'GOLD', 'GOLD', 50, 75)).toBe(25);
	});

	it('computes LP lost within the same division', () => {
		expect(calculateLPDifference('IV', 'IV', 'GOLD', 'GOLD', 75, 50)).toBe(-25);
	});

	it('accounts for division changes', () => {
		// GOLD I 75 = 3*400 + 300 + 75 = 1575 ; PLATINUM IV 0 = 4*400 = 1600
		expect(calculateLPDifference('I', 'IV', 'GOLD', 'PLATINUM', 75, 0)).toBe(25);
		// SILVER II 0 = 700 ; SILVER III 0 = 600
		expect(calculateLPDifference('II', 'III', 'SILVER', 'SILVER', 0, 0)).toBe(-100);
	});

	it('returns 0 when any input is missing', () => {
		expect(calculateLPDifference('', 'IV', 'GOLD', 'GOLD', 50, 75)).toBe(0);
		expect(calculateLPDifference('IV', 'IV', '', 'GOLD', 50, 75)).toBe(0);
	});
});

describe('isGameDurationValid', () => {
	it('rejects games shorter than the remake threshold', () => {
		expect(isGameDurationValid(MIN_GAME_DURATION_SECONDS - 1)).toBe(false);
	});

	it('accepts games at or above the threshold', () => {
		expect(isGameDurationValid(MIN_GAME_DURATION_SECONDS)).toBe(true);
		expect(isGameDurationValid(2400)).toBe(true);
	});
});

describe('isTimestampInRecapRange', () => {
	it('accepts timestamps in the future', () => {
		expect(isTimestampInRecapRange(Date.now() + 60 * 60 * 1000)).toBe(true);
	});

	it('accepts second-precision timestamps', () => {
		expect(isTimestampInRecapRange(Math.floor(Date.now() / 1000))).toBe(true);
	});

	it('rejects timestamps older than any possible cutoff', () => {
		// The cutoff is at most yesterday at RECAP_CUTOFF_HOUR:RECAP_CUTOFF_MINUTE,
		// i.e. less than 24h ago — 26h ago is always out of range.
		expect(isTimestampInRecapRange(Date.now() - 26 * 60 * 60 * 1000)).toBe(false);
	});

	it('treats the daily cutoff as inclusive', () => {
		const now = new Date();
		const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), RECAP_CUTOFF_HOUR, RECAP_CUTOFF_MINUTE, 0, 0);
		if (now.getHours() < RECAP_CUTOFF_HOUR || (now.getHours() === RECAP_CUTOFF_HOUR && now.getMinutes() < RECAP_CUTOFF_MINUTE)) {
			cutoff.setDate(cutoff.getDate() - 1);
		}
		expect(isTimestampInRecapRange(cutoff.getTime())).toBe(true);
		expect(isTimestampInRecapRange(cutoff.getTime() - 1)).toBe(false);
	});
});

describe('getDurationString', () => {
	it('formats minutes and zero-padded seconds', () => {
		expect(getDurationString(0)).toBe('0:00');
		expect(getDurationString(65)).toBe('1:05');
		expect(getDurationString(3661)).toBe('61:01');
	});
});

describe('getDisplayRank', () => {
	it('hides the division for unranked and apex tiers', () => {
		expect(getDisplayRank('UNRANKED', 'I')).toBe('');
		expect(getDisplayRank('MASTER', 'I')).toBe('');
		expect(getDisplayRank('CHALLENGER', 'I')).toBe('');
	});

	it('shows the division for regular tiers', () => {
		expect(getDisplayRank('GOLD', 'II')).toBe(' II');
	});
});

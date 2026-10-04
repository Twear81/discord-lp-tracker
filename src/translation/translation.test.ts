import { describe, it, expect } from 'vitest';
import { getTranslations } from './translation';
import { GameQueueType } from '../tracking/GameQueueType';

// Structural fingerprint: functions become 'function', objects recurse into
// sorted keys, everything else collapses to its typeof.
const shapeOf = (value: unknown): unknown => {
	if (typeof value === 'function') return 'function';
	if (value !== null && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.map(([key, nested]) => [key, shapeOf(nested)] as [string, unknown])
			.sort(([a], [b]) => a.localeCompare(b));
		return Object.fromEntries(entries);
	}
	return typeof value;
};

describe('getTranslations', () => {
	it('falls back to English for unknown languages', () => {
		expect(getTranslations('xx').title).toBe(getTranslations('en').title);
	});

	it('exposes the expected locales', () => {
		expect(getTranslations('fr').league).toBe('LP');
		expect(getTranslations('en').leaderboardTitles[GameQueueType.RANKED_SOLO_5x5]).toBe('🏆 SoloQ Leaderboard');
	});
});

describe('translation structure', () => {
	it('keeps fr and en keys perfectly in sync', () => {
		const fr = getTranslations('fr');
		const en = getTranslations('en');

		expect(JSON.stringify(shapeOf(fr))).toBe(JSON.stringify(shapeOf(en)));
	});

	it('covers every queue type in every per-queue map', () => {
		for (const t of [getTranslations('fr'), getTranslations('en')]) {
			for (const map of [t.recapTitles, t.monthlyRecapTitles, t.leaderboardTitles]) {
				for (const queueType of Object.values(GameQueueType)) {
					expect(map[queueType], `missing entry for ${queueType}`).toBeTruthy();
				}
			}
		}
	});
});

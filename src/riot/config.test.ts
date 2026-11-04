import { describe, it, expect, beforeEach } from 'vitest';
import { clearRiotCache, riotCached, withCache } from './config';

beforeEach(() => {
	clearRiotCache();
});

describe('withCache', () => {
	it('shares a single in-flight request between concurrent callers', async () => {
		let calls = 0;
		const loader = async () => {
			calls += 1;
			return 'value';
		};

		const [a, b] = await Promise.all([withCache('k', 1000, loader), withCache('k', 1000, loader)]);

		expect(a).toBe('value');
		expect(b).toBe('value');
		expect(calls).toBe(1);
	});

	it('does not cache failures', async () => {
		let calls = 0;
		const failing = async () => {
			calls += 1;
			throw new Error('boom');
		};

		await expect(withCache('k', 1000, failing)).rejects.toThrow('boom');
		await expect(withCache('k', 1000, failing)).rejects.toThrow('boom');
		expect(calls).toBe(2);
	});

	it('reloads once the entry has expired', async () => {
		let calls = 0;
		const loader = async () => ++calls;

		await withCache('k', 0, loader);
		await withCache('k', 0, loader);
		expect(calls).toBe(2);
	});
});

describe('riotCached', () => {
	it('keeps LoL and TFT entries apart for the same cache key', async () => {
		// Account-V1 returns a different PUUID per API key: the two lookups
		// of the same Riot ID must never be served from one shared entry.
		const lol = await riotCached('lol', 'account|getByRiotId|Name|TAG|EUROPE', 60_000, async () => ({ response: 'lol-puuid' }));
		const tft = await riotCached('tft', 'account|getByRiotId|Name|TAG|EUROPE', 60_000, async () => ({ response: 'tft-puuid' }));

		expect(lol).toBe('lol-puuid');
		expect(tft).toBe('tft-puuid');
	});
});

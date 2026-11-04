import { LolApi, TftApi, RiotApi } from "twisted";
import dotenv from "dotenv";
import Bottleneck from "bottleneck";
import logger from "../logger/logger";

dotenv.config();

// Twisted replaces @fightmegg/riot-api. Architecture:
//   - lolApi       = LoL endpoints (Summoner, League, MatchV5)  on RIOT_API key
//   - tftApi       = TFT endpoints (TftSummoner, TftLeague, TftMatch) on RIOT_API_TFT key
//   - riotApiLol   = Account-V1 calls on RIOT_API key
//   - riotApiTft   = Account-V1 calls on RIOT_API_TFT key
//
// Two RiotApi instances (one per key) are required: the database
// confirms that Account-V1 returns different PUUIDs depending on which
// key authenticates the call, so /addplayer stores the two as
// `puuid` and `tftpuuid`. Dropping `riotApiTft` would collapse both
// columns to the same value and silently break TFT tracking.
//
// Account-V1 is exposed only on `RiotApi` (not on `LolApi` / `TftApi`),
// hence the dedicated RiotApi instance(s).
export const lolApi = new LolApi({ key: process.env.RIOT_API!, rateLimitRetry: true });
export const tftApi = new TftApi({ key: process.env.RIOT_API_TFT!, rateLimitRetry: true });
export const riotApiLol = new RiotApi({ key: process.env.RIOT_API!, rateLimitRetry: true });
export const riotApiTft = new RiotApi({ key: process.env.RIOT_API_TFT!, rateLimitRetry: true });

// Bottleneck configuration for Riot's per-key rate limits.
// Twisted already handles 429/503 with Retry-After, but Bottleneck prevents
// the burst that would trigger those responses in the first place.
//
// Riot allocates the 100 req / 2 min quota per API key, and the bot holds
// two keys (RIOT_API for LoL, RIOT_API_TFT for TFT). One limiter per key —
// sharing a single one would halve the total available throughput.
const makeLimiter = () => new Bottleneck({
	minTime: 50, // 1 request per 50ms (ensures < 20 requests per second)
	reservoir: 100, // Max 100 requests in 2 minutes
	reservoirRefreshAmount: 100, // Reset to 100 requests
	reservoirRefreshInterval: 120000, // Every 2 minutes
});

const limiters = {
	lol: makeLimiter(), // RIOT_API key
	tft: makeLimiter(), // RIOT_API_TFT key
} as const;

export type RiotKey = keyof typeof limiters;

// Wrapper that schedules the call through the key's Bottleneck without
// altering its return value.
export async function limitedRequest<T>(key: RiotKey, apiCallFn: () => Promise<T>): Promise<T> {
	const response = await limiters[key].schedule(() => apiCallFn());
	return response as T;
}

// Local TTL cache. Replaces the `cache.byMethod` config block that
// @fightmegg/riot-api had built-in. Each call site keys its cache by
// the method name + primitive args instead of relying on the
// library's METHOD_KEY constants.
// Entries hold the loader's Promise rather than its resolved value, so
// concurrent callers on the same key (e.g. the same player tracked on two
// servers) share a single in-flight Riot request instead of each missing
// the cache and firing their own.
type CacheEntry = { promise: Promise<unknown>; expires: number };
const cache = new Map<string, CacheEntry>();

// Cap the cache so the Map can't grow unbounded across the bot's
// lifetime. The key universe is roughly O(players × tracked queues +
// matches_played_per_day), and entries are replaced on access once they
// expire. 1000 entries is well above the typical deployment size for
// this bot and keeps memory under a few hundred KB even with full
// Riot payload bodies.
const MAX_CACHE_ENTRIES = 1000;

export function withCache<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
	const now = Date.now();
	const hit = cache.get(key);
	if (hit && hit.expires > now) {
		return hit.promise as Promise<T>;
	}
	// Evict the oldest entry when at capacity. Map iteration order is
	// insertion order, so the first key is the oldest. FIFO is fine here:
	// a hit on an expired key overwrites it in place (no size change), and
	// a cache miss just bumps size by one — which is exactly when we evict.
	if (!hit && cache.size >= MAX_CACHE_ENTRIES) {
		const oldestKey = cache.keys().next().value;
		if (oldestKey !== undefined) {
			cache.delete(oldestKey);
		}
	}
	const promise = loader();
	cache.set(key, { promise, expires: now + ttlMs });
	// Never cache failures: drop the entry (if it is still ours) so the next
	// caller retries. The caller still receives the rejection via `promise`.
	promise.catch(() => {
		if (cache.get(key)?.promise === promise) {
			cache.delete(key);
		}
	});
	return promise;
}

export function clearRiotCache(): void {
	cache.clear();
}

// --- Cache TTLs (mirror the old @fightmegg/riot-api METHOD_KEY.byMethod values) ---
export const TTL = {
	ACCOUNT_BY_RIOT_ID_MS: 60_000,
	ACCOUNT_BY_PUUID_MS: 60_000,
	MATCH_BY_ID_MS: 30_000,
	// Long enough for every server of a tracking cycle to share one matchlist
	// call per player, well below the 5-minute cycle so a new game is never
	// hidden for more than one cycle.
	MATCH_IDS_MS: 60_000,
	LEAGUE_ENTRIES_MS: 30_000,
} as const;

// --- High-level wrappers ---
//
// Most Twisted methods return Promise<ApiResponseDTO<T>> where the
// actual payload lives on `.response`. The two helpers below absorb
// that unwrapping so call sites stay short.

// `fn` must return a Twisted ApiResponseDTO (any object with a `response`
// field); the helper unwraps it and returns just the payload, cached
// under `cacheKey` for `ttlMs` and throttled by Bottleneck.
//
// The cache key is namespaced by the Riot API key: Account-V1 returns a
// different (encrypted) PUUID per API key, so the LoL and TFT lookups of
// the same Riot ID must never share an entry.
export async function riotCached<T>(
	key: RiotKey,
	cacheKey: string,
	ttlMs: number,
	fn: () => Promise<{ response: T }>,
): Promise<T> {
	return withCache(`${key}|${cacheKey}`, ttlMs, async () => {
		const { response } = await limitedRequest(key, fn);
		return response;
	});
}

// Same as riotCached but wraps Bottleneck's `withRetryOnDuplicateJob`
// on top. Used by match-listing endpoints (riotApi.MatchV5.list and
// riotApi.TftMatch.list) where the tracking cron's overlap can race
// the scheduler.
export async function riotCachedWithRetry<T>(
	key: RiotKey,
	cacheKey: string,
	ttlMs: number,
	fn: () => Promise<{ response: T }>,
): Promise<T> {
	return withCache(`${key}|${cacheKey}`, ttlMs, () =>
		withRetryOnDuplicateJob(() => limitedRequest(key, fn)).then(r => r.response),
	);
}

const DUPLICATE_JOB_MESSAGE = 'A job with the same id already exists';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function withRetryOnDuplicateJob<T>(apiCallFn: () => Promise<T>): Promise<T> {
	let lastError: unknown;
	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			return await apiCallFn();
		} catch (error) {
			lastError = error;
			const message = error instanceof Error ? error.message : String(error);
			const isDuplicate = message.includes(DUPLICATE_JOB_MESSAGE);
			if (!isDuplicate || attempt === MAX_RETRIES) {
				throw error;
			}
			const delay = BASE_DELAY_MS * (attempt + 1) + Math.floor(Math.random() * 50);
			logger.warn(`⚠️ Bottleneck duplicate job, retry ${attempt + 1}/${MAX_RETRIES} dans ${delay}ms`);
			await sleep(delay);
		}
	}
	throw lastError;
}

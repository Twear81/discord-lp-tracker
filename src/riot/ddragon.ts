import { lolApi } from "./config";

// DDragon's version list changes at most once every couple of weeks. It was
// previously fetched per sent notification, uncached and outside the rate
// limiter — cache it for an hour instead.
let cached: { version: string; expires: number } | null = null;
const TTL_MS = 60 * 60 * 1000;

export async function getLatestDDragonVersion(): Promise<string> {
	if (cached && cached.expires > Date.now()) {
		return cached.version;
	}
	const versions = await lolApi.DataDragon.getVersions();
	const version = versions[0];
	cached = { version, expires: Date.now() + TTL_MS };
	return version;
}

import { Constants } from "twisted";
import { AppError, ErrorTypes } from "../error/error";
import logger from "../logger/logger";
import type { Region } from "./twistedTypes";

// User-facing region code (stored in Player.region) -> Riot platform.
// The codes are also the lowercase slugs used by leagueofgraphs / lolchess
// links, so keep them in that format when adding a region.
const PLATFORM_FROM_DB_REGION: Record<string, Region> = {
	EUW: Constants.Regions.EU_WEST,
	EUNE: Constants.Regions.EU_EAST,
	NA: Constants.Regions.AMERICA_NORTH,
	KR: Constants.Regions.KOREA,
	BR: Constants.Regions.BRAZIL,
	LAN: Constants.Regions.LAT_NORTH,
	LAS: Constants.Regions.LAT_SOUTH,
	OCE: Constants.Regions.OCEANIA,
	TR: Constants.Regions.TURKEY,
	RU: Constants.Regions.RUSSIA,
	JP: Constants.Regions.JAPAN,
};

// Slash-command choices for the `region` option, in declaration order.
export const REGION_CHOICES = Object.keys(PLATFORM_FROM_DB_REGION).map(code => ({ name: code, value: code }));

// Translate the user-facing region string stored in the DB ("EUW", "NA", …)
// to twisted's Region enum. Cluster routing (for MatchV5 / TftMatch /
// Account-V1) is handled by twisted's own Constants.regionToRegionGroup()
// and Constants.regionToRegionGroupForAccountAPI(), so callers don't need
// parallel helpers per cluster type.
export function regionToPlatform(region: string): Region {
	const platform = PLATFORM_FROM_DB_REGION[region.toUpperCase()];
	if (!platform) {
		logger.error(`Unknown region: ${region}`);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `Unsupported region: ${region}`);
	}
	return platform;
}

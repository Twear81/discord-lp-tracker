import { Constants } from "twisted";
import { AppError, ErrorTypes } from "../error/error";
import logger from "../logger/logger";
import type { Region } from "./twistedTypes";

const PLATFORM_FROM_DB_REGION: Record<string, Region> = {
	EUW: Constants.Regions.EU_WEST,
	NA: Constants.Regions.AMERICA_NORTH,
};

// Translate the user-facing region string stored in the DB ("EUW" / "NA")
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

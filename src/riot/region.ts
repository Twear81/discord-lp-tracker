import { Constants } from "twisted";
import { AppError, ErrorTypes } from "../error/error";
import logger from "../logger/logger";
import type { AccountCluster, Region, RegionGroup } from "./twistedTypes";

// Cluster routing (used by MatchV5 and TftMatch).
export function getPlatformIdFromRegionString(region: string): RegionGroup {
	const mapping: Record<string, RegionGroup> = {
		"EUW": Constants.RegionGroups.EUROPE,
		"NA": Constants.RegionGroups.AMERICAS,
	};
	const result = mapping[region.toUpperCase()];
	if (result === undefined) {
		logger.error(`Unknown region for platform id: ${region}`);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `Unsupported region: ${region}`);
	}
	return result;
}

// Account-V1 cluster routing. Same mapping as above, narrowed to AccountCluster.
export function getAccountClusterFromRegionString(region: string): AccountCluster {
	return getPlatformIdFromRegionString(region) as AccountCluster;
}

// Platform IDs (used by League-V4 and TftLeague-V1).
export function getLolRegionFromRegionString(region: string): Region {
	const mapping: Record<string, Region> = {
		"EUW": Constants.Regions.EU_WEST,
		"NA": Constants.Regions.AMERICA_NORTH,
	};
	const result = mapping[region.toUpperCase()];
	if (result === undefined) {
		logger.error(`Unknown region for lol region: ${region}`);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `Unsupported region: ${region}`);
	}
	return result;
}

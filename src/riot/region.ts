import { Constants } from "twisted";
import { AppError, ErrorTypes } from "../error/error";
import logger from "../logger/logger";

// Twisted replaces the @fightmegg/riot-api PlatformId enum. The mapping
// stays the same in spirit (EUW -> EUROPE cluster, EUW -> EUW1 platform)
// but the value names come from twisted's Constants.Regions / RegionGroups.

// Cluster routing (used by MatchV5 and TftMatch — region groups like EUROPE/AMERICAS).
export function getPlatformIdFromRegionString(region: string): Constants.RegionGroups {
	const mapping: Record<string, Constants.RegionGroups> = {
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

// Account-V1 cluster routing. Same mapping as above but Account-V1 doesn't
// accept SEA, so the return type is narrowed to AccountAPIRegionGroups.
export function getAccountClusterFromRegionString(region: string): Constants.AccountAPIRegionGroups {
	return getPlatformIdFromRegionString(region) as Constants.AccountAPIRegionGroups;
}

// Platform IDs (used by League-V4 and TftLeague-V1 — EUW1/NA1).
export function getLolRegionFromRegionString(region: string): Constants.Regions {
	const mapping: Record<string, Constants.Regions> = {
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

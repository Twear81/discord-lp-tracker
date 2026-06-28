import { PlatformId } from "@fightmegg/riot-api";
import { AppError, ErrorTypes } from "../error/error";
import logger from "../logger/logger";

export function getPlatformIdFromRegionString(region: string): PlatformId.EUROPE | PlatformId.AMERICAS {
	const mapping: Record<string, (PlatformId.EUROPE | PlatformId.AMERICAS)> = {
		"EUW": PlatformId.EUROPE,
		"NA": PlatformId.AMERICAS
	};
	const result = mapping[region.toUpperCase()];
	if (result === undefined) {
		logger.error(`Unknown region for platform id: ${region}`);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `Unsupported region: ${region}`);
	}
	return result;
}

export function getLolRegionFromRegionString(region: string): PlatformId.EUW1 | PlatformId.NA1 {
	const mapping: Record<string, (PlatformId.EUW1 | PlatformId.NA1)> = {
		"EUW": PlatformId.EUW1,
		"NA": PlatformId.NA1
	};
	const result = mapping[region.toUpperCase()];
	if (result === undefined) {
		logger.error(`Unknown region for lol region: ${region}`);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `Unsupported region: ${region}`);
	}
	return result;
}

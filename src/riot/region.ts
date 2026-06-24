import { PlatformId } from "@fightmegg/riot-api";

export function getPlatformIdFromRegionString(region: string): PlatformId.EUROPE | PlatformId.AMERICAS {
	const mapping: Record<string, (PlatformId.EUROPE | PlatformId.AMERICAS)> = {
		"EUW": PlatformId.EUROPE,
		"NA": PlatformId.AMERICAS
	};
	return mapping[region.toUpperCase()];
}

export function getLolRegionFromRegionString(region: string): PlatformId.EUW1 | PlatformId.NA1 {
	const mapping: Record<string, (PlatformId.EUW1 | PlatformId.NA1)> = {
		"EUW": PlatformId.EUW1,
		"NA": PlatformId.NA1
	};
	return mapping[region.toUpperCase()];
}

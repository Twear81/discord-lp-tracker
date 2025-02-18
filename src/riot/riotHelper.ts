import { PlatformId, RiotAPI } from "@fightmegg/riot-api";
import { leagueAPI } from '../../config.json';
import { AppError, ErrorTypes } from "../error/error";

const riotApi = new RiotAPI(leagueAPI);

export async function getSummonerByName(accountName: string, tag: string, region: string) {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		return await riotApi.account.getByRiotId({
			region: platformId,
			gameName: accountName,
			tagLine: tag,
		});
	} catch (error) {
		console.error(`Erreur API Riot (getSummonerByName) :`, error);
		throw new AppError(ErrorTypes.PLAYER_NOT_FOUND, `No player found for ${accountName}#${tag} for region ${region}`);
	}
}

export async function getLastMatches(puuid: string, region: string, ) {
	try {
		const platformId = getPlatformIdFromRegionString(region);
		return await riotApi.matchV5.getIdsByPuuid({
			cluster: platformId,
			puuid,
			params: {
				queue: 440, // 440 flex, 420 soloq
				count: 2
			}
		});
	} catch (error) {
		console.error(`Erreur API Riot (getLastMatches) :`, error);
		return [];
	}
}

function getPlatformIdFromRegionString(region: string): PlatformId.EUROPE | PlatformId.AMERICAS {
	const mapping: Record<string, (PlatformId.EUROPE | PlatformId.AMERICAS)> = {
		"EUW": PlatformId.EUROPE,
		"NA": PlatformId.AMERICAS
	};

	return mapping[region.toUpperCase()];
}
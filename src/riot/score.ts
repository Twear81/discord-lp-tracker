import { RiotAPITypes } from "@fightmegg/riot-api";

type RoleData = Record<string, number>;
type RoleBasedData = Record<string, RoleData>;

const weightsByRole: RoleBasedData = {
	TOP: { kills: 10, deaths: 10, assists: 5, kp: 10, csPerMin: 15, goldPerMin: 10, dmgPerMin: 15, visionPerMin: 5, damageToObjectives: 15 },
	JUNGLE: { kills: 10, deaths: 10, assists: 10, kp: 20, csPerMin: 5, goldPerMin: 10, dmgPerMin: 10, visionPerMin: 10, damageToObjectives: 15 },
	MIDDLE: { kills: 15, deaths: 10, assists: 5, kp: 10, csPerMin: 15, goldPerMin: 10, dmgPerMin: 20, visionPerMin: 5, damageToObjectives: 5 },
	BOTTOM: { kills: 15, deaths: 10, assists: 5, kp: 10, csPerMin: 20, goldPerMin: 15, dmgPerMin: 20, visionPerMin: 2, damageToObjectives: 5 },
	UTILITY: { kills: 2, deaths: 10, assists: 20, kp: 20, csPerMin: 1, goldPerMin: 5, dmgPerMin: 8, visionPerMin: 20, damageToObjectives: 2 },
	UNKNOWN: { kills: 10, deaths: 10, assists: 10, kp: 10, csPerMin: 10, goldPerMin: 10, dmgPerMin: 10, visionPerMin: 10, damageToObjectives: 10 }
};

const targetStatsByRole: RoleBasedData = {
	TOP: {
		kills: 8, deaths: 4, assists: 7, kp: 0.50,
		csPerMin: 7.5, goldPerMin: 420, dmgPerMin: 700,
		visionPerMin: 0.8, damageToObjectives: 12000
	},
	JUNGLE: {
		kills: 7, deaths: 4, assists: 12, kp: 0.70,
		csPerMin: 5.1, goldPerMin: 430, dmgPerMin: 620,
		visionPerMin: 1.5, damageToObjectives: 23000
	},
	MIDDLE: {
		kills: 10, deaths: 4, assists: 8, kp: 0.60,
		csPerMin: 8.0, goldPerMin: 450, dmgPerMin: 900,
		visionPerMin: 0.9, damageToObjectives: 8000
	},
	BOTTOM: {
		kills: 11, deaths: 4, assists: 8, kp: 0.55,
		csPerMin: 8.5,
		goldPerMin: 480, dmgPerMin: 1000,
		visionPerMin: 0.7, damageToObjectives: 10000
	},
	UTILITY: {
		kills: 2, deaths: 5, assists: 18,
		kp: 0.65,
		csPerMin: 1.5,
		goldPerMin: 280, dmgPerMin: 300,
		visionPerMin: 2.0,
		damageToObjectives: 3000
	},
	UNKNOWN: {
		kills: 7, deaths: 5, assists: 10, kp: 0.50,
		csPerMin: 6.0, goldPerMin: 400, dmgPerMin: 600,
		visionPerMin: 1.0, damageToObjectives: 8000
	}
};

export function computePlayerScore(player: RiotAPITypes.MatchV5.ParticipantDTO, allPlayers: RiotAPITypes.MatchV5.ParticipantDTO[], gameDurationSeconds: number): number {
	const minutes = gameDurationSeconds / 60;
	if (minutes < 5) return 0; // Ignore too short games (remakes)
	const role = player.teamPosition || "UNKNOWN";

	const playerTeamId = player.teamId;
	const teammates = allPlayers.filter(p => p.teamId === playerTeamId);
	const totalTeamKills = teammates.reduce((sum, p) => sum + p.kills, 0);

	const csValue = player.neutralMinionsKilled + player.totalMinionsKilled;

	const stats = {
		kills: player.kills,
		deaths: player.deaths,
		assists: player.assists,
		kp: totalTeamKills > 0 ? (player.kills + player.assists) / totalTeamKills : 0,
		csPerMin: csValue / minutes,
		goldPerMin: player.goldEarned / minutes,
		dmgPerMin: player.totalDamageDealtToChampions / minutes,
		visionPerMin: player.visionScore / minutes,
		damageToObjectives: player.damageDealtToObjectives
	};

	const currentWeights = weightsByRole[role] || weightsByRole.UNKNOWN;
	const currentTargets = targetStatsByRole[role] || targetStatsByRole.UNKNOWN;

	let score = 0;
	let deathPenalty = 0;

	for (const key in stats) {
		const statName = key as keyof typeof stats;
		const playerValue = stats[statName];

		if (!currentTargets[statName] || !currentWeights[statName]) continue;

		const targetValue = currentTargets[statName];
		const weight = currentWeights[statName];

		let ratio = 0;

		if (statName === 'deaths') {
			if (playerValue <= targetValue) {
				ratio = 1 / (1 + (playerValue / targetValue));
				score += Math.pow(ratio, 1.2) * weight;
			} else {
				const excessDeaths = playerValue - targetValue;
				deathPenalty += Math.pow(excessDeaths, 1.4) * (weight * 0.3);
			}
			continue;
		} else {
			ratio = playerValue / targetValue;
			score += Math.pow(ratio, 1.2) * weight;
		}
	}

	score = Math.max(0, score - deathPenalty);
	score = Math.min(100, score);
	return Math.round(score);
}

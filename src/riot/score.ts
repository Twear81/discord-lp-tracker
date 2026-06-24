import { RiotAPITypes } from "@fightmegg/riot-api";

type RoleData = Record<string, number>;
type RoleBasedData = Record<string, RoleData>;

// Ajustement des poids pour donner plus d'importance à la survie et l'impact réel
const weightsByRole: RoleBasedData = {
	TOP: { kills: 8, deaths: 15, assists: 5, kp: 8, csPerMin: 15, goldPerMin: 12, dmgPerMin: 15, visionPerMin: 5, damageToObjectives: 17 },
	JUNGLE: { kills: 8, deaths: 15, assists: 10, kp: 15, csPerMin: 8, goldPerMin: 12, dmgPerMin: 10, visionPerMin: 10, damageToObjectives: 12 },
	MIDDLE: { kills: 12, deaths: 15, assists: 6, kp: 10, csPerMin: 15, goldPerMin: 12, dmgPerMin: 18, visionPerMin: 5, damageToObjectives: 7 },
	BOTTOM: { kills: 12, deaths: 15, assists: 5, kp: 10, csPerMin: 18, goldPerMin: 15, dmgPerMin: 18, visionPerMin: 3, damageToObjectives: 7 },
	UTILITY: { kills: 2, deaths: 15, assists: 18, kp: 15, csPerMin: 1, goldPerMin: 6, dmgPerMin: 6, visionPerMin: 22, damageToObjectives: 2 },
	UNKNOWN: { kills: 10, deaths: 10, assists: 10, kp: 10, csPerMin: 10, goldPerMin: 10, dmgPerMin: 10, visionPerMin: 10, damageToObjectives: 10 },
};

// Cibles augmentées pour coller à la vitesse et la méta actuelle du jeu
const targetStatsByRole: RoleBasedData = {
	TOP: {
		kills: 6,
		deaths: 3.2,
		assists: 6,
		kp: 0.45,
		csPerMin: 8.4,
		goldPerMin: 480,
		dmgPerMin: 780,
		visionPerMin: 1.0,
		damageToObjectives: 16000,
	},
	JUNGLE: {
		kills: 6,
		deaths: 3.5,
		assists: 9,
		kp: 0.55,
		csPerMin: 6.8,
		goldPerMin: 450,
		dmgPerMin: 640,
		visionPerMin: 1.4,
		damageToObjectives: 32000, // Très élevé : focus systématique sur les Larves/Drakes
	},
	MIDDLE: {
		kills: 7,
		deaths: 3.2,
		assists: 7,
		kp: 0.5,
		csPerMin: 8.7,
		goldPerMin: 510,
		dmgPerMin: 920,
		visionPerMin: 1.1,
		damageToObjectives: 10000,
	},
	BOTTOM: {
		kills: 7.5,
		deaths: 3.5,
		assists: 6,
		kp: 0.5,
		csPerMin: 9.0,
		goldPerMin: 540,
		dmgPerMin: 1050, // Le palier des 9 CS/min est la norme pour carry en Diamant
		visionPerMin: 0.9,
		damageToObjectives: 14000,
	},
	UTILITY: {
		kills: 1,
		deaths: 4.2,
		assists: 15,
		kp: 0.6,
		csPerMin: 1.0,
		goldPerMin: 320,
		dmgPerMin: 320,
		visionPerMin: 2.8,
		damageToObjectives: 3500, // Score de vision drastiquement augmenté (clearing + pinks)
	},
	UNKNOWN: {
		kills: 6,
		deaths: 3.5,
		assists: 8,
		kp: 0.5,
		csPerMin: 7.0,
		goldPerMin: 450,
		dmgPerMin: 700,
		visionPerMin: 1.2,
		damageToObjectives: 12000,
	},
};

export function computePlayerScore(
	player: RiotAPITypes.MatchV5.ParticipantDTO,
	allPlayers: RiotAPITypes.MatchV5.ParticipantDTO[],
	gameDurationSeconds: number,
): number {
	const minutes = gameDurationSeconds / 60;
	if (minutes < 5) return 0;
	const role = player.teamPosition || "UNKNOWN";

	const playerTeamId = player.teamId;
	const teammates = allPlayers.filter((p) => p.teamId === playerTeamId);
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
		damageToObjectives: player.damageDealtToObjectives,
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

		if (statName === "deaths") {
			if (playerValue <= targetValue) {
				ratio = 1 / (1 + playerValue / targetValue);
				score += Math.pow(ratio, 1.2) * weight;
			} else {
				const excessDeaths = playerValue - targetValue;
				deathPenalty += Math.pow(excessDeaths, 1.4) * (weight * 0.4); // Pénalité légèrement augmentée
			}
			continue;
		} else {
			ratio = playerValue / targetValue;
			// Sécurité : On cap le ratio positif à 1.5 pour éviter qu'une seule stat ultra-haute offre le 100/100
			const cappedRatio = Math.min(1.5, ratio);
			score += Math.pow(cappedRatio, 1.2) * weight;
		}
	}

	score = Math.max(0, score - deathPenalty);
	score = Math.min(100, score);
	return Math.round(score);
}

// Pure rank-comparison helpers, extracted from databaseHelper so they can be
// unit-tested without pulling in Sequelize models.

export interface RankSortable {
	currentRank: string | null;
	currentTier: string | null;
	currentLP: number | null;
}

const tierOrder: Record<string, number> = {
	"IRON": 1, "BRONZE": 2, "SILVER": 3, "GOLD": 4, "PLATINUM": 5,
	"EMERALD": 6, "DIAMOND": 7, "MASTER": 8, "GRANDMASTER": 9, "CHALLENGER": 10
};

const rankOrder: Record<string, number> = { "IV": 1, "III": 2, "II": 3, "I": 4 };

function comparePlayers(a: RankSortable, b: RankSortable): number {
	const tierA = tierOrder[(a.currentTier || "IRON").toUpperCase()] || 0;
	const tierB = tierOrder[(b.currentTier || "IRON").toUpperCase()] || 0;

	if (tierA !== tierB) return tierB - tierA;

	const rankA = rankOrder[(a.currentRank || "IV").toUpperCase()] || 0;
	const rankB = rankOrder[(b.currentRank || "IV").toUpperCase()] || 0;

	if (rankA !== rankB) return rankB - rankA;

	const lpA = a.currentLP || 0;
	const lpB = b.currentLP || 0;

	return lpB - lpA;
}

export const sortPlayersByRank = <T extends RankSortable>(players: T[]): T[] => {
	// Don't want null info
	const filteredPlayers = players.filter(player => {
		return player.currentRank !== null && player.currentTier !== null && player.currentLP !== null;
	});
	return filteredPlayers.sort((a, b) => comparePlayers(a, b));
};

export function isTimestampInRecapRange(timestamp: number): boolean {
	// Convert timestamp to milliseconds if it's in seconds
	if (timestamp < 1e12) {
		timestamp *= 1000; // Convert from seconds to milliseconds
	}

	const now = new Date();

	// Set 06:33 AM today
	const today6am33 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 33, 0, 0);

	// Manage the last day
	if (now.getHours() < 6 || (now.getHours() === 6 && now.getMinutes() < 33)) {
		today6am33.setDate(today6am33.getDate() - 1);
	}

	// Check if the timestamp falls within the range
	return timestamp >= today6am33.getTime();
}

export const calculateLPDifference = (beforeRank: string, afterRank: string, beforeTier: string, afterTier: string, beforeLP: number, afterLP: number): number => {
	if (!beforeRank || !beforeTier || beforeLP === null || !afterRank || !afterTier || afterLP === null) {
		return 0; // If any data is null, return 0
	}
	const beforeAbsoluteLP = getAbsoluteLP(beforeTier, beforeRank, beforeLP);
	const afterAbsoluteLP = getAbsoluteLP(afterTier, afterRank, afterLP);

	return afterAbsoluteLP - beforeAbsoluteLP;
};

export const getAbsoluteLP = (tier: string, rank: string, lp: number): number => {
	const tierOrder: string[] = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
	const rankOrder: string[] = ["IV", "III", "II", "I"];

	const tierIndex = tierOrder.indexOf(tier);
	const rankIndex = rankOrder.indexOf(rank);

	if (tierIndex === -1 || rankIndex === -1) return 0; // Safety check for invalid values

	if (tierIndex >= 7) { // MASTER and above have no fixed ranks
		return 2800 + (tierIndex - 7) * 1000 + lp;
	}

	return tierIndex * 400 + rankIndex * 100 + lp;
};
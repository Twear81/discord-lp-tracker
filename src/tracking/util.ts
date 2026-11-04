export const MIN_GAME_DURATION_SECONDS = 13 * 60;

// The daily recap is sent at RECAP_CUTOFF_HOUR:RECAP_CUTOFF_MINUTE. The same
// instant is the floor for "last 24h" — anything newer is counted toward
// today's recap. Both src/index.ts (cron) and isTimestampInRecapRange must
// agree on this value, so it lives here as the single source of truth.
export const RECAP_CUTOFF_HOUR = 6;
export const RECAP_CUTOFF_MINUTE = 33;

// Games strictly older than the returned date are purged. The cutoff is the
// 1st of the current month, `yearsToKeep` years back: the purge keeps the last
// `yearsToKeep * 12` full months (plus the current one), so a monthly recap
// never loses part of a month.
export const getPurgeCutoffDate = (now: Date, yearsToKeep: number): Date =>
	new Date(now.getFullYear() - yearsToKeep, now.getMonth(), 1);

// League-V4 / TFT-League often lag a few minutes behind match-v5: a game can
// be listed while the rank still shows the pre-game LP. Within this window
// after the end of the game, an unchanged rank means "not updated yet".
export const RANK_UPDATE_GRACE_MS = 20 * 60 * 1000;

/**
 * True when the rank Riot returns for the game's queue is still exactly the
 * one stored before the game, and the game ended less than
 * RANK_UPDATE_GRACE_MS ago: processing now would announce +0 LP and credit
 * the real change to the next game. Past the window the game is processed
 * anyway (the LP can legitimately stay the same, e.g. a loss at 0 LP).
 */
export const isRankUpdatePending = (
	stored: { currentRank: string | null; currentTier: string | null; currentLP: number | null },
	fetched: { rank?: string; tier?: string; leaguePoints?: number } | undefined,
	gameEndTimestamp: number,
	now: number,
): boolean => {
	// Unranked / in placements: there is no previous rank to compare with.
	if (!fetched || stored.currentTier == null) {
		return false;
	}
	const gameEndMs = gameEndTimestamp < 1e12 ? gameEndTimestamp * 1000 : gameEndTimestamp;
	if (now - gameEndMs > RANK_UPDATE_GRACE_MS) {
		return false;
	}
	return fetched.tier === stored.currentTier && fetched.rank === stored.currentRank && fetched.leaguePoints === stored.currentLP;
};

export const isGameDurationValid = (durationSeconds: number): boolean => durationSeconds >= MIN_GAME_DURATION_SECONDS;

export function isTimestampInRecapRange(timestamp: number): boolean {
	// Convert timestamp to milliseconds if it's in seconds
	if (timestamp < 1e12) {
		timestamp *= 1000; // Convert from seconds to milliseconds
	}

	const now = new Date();

	// Set the cutoff time today
	const todayCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), RECAP_CUTOFF_HOUR, RECAP_CUTOFF_MINUTE, 0, 0);

	// If we're earlier in the day than the cutoff, "last 24h" starts at the
	// previous day's cutoff instead of today's.
	if (now.getHours() < RECAP_CUTOFF_HOUR || (now.getHours() === RECAP_CUTOFF_HOUR && now.getMinutes() < RECAP_CUTOFF_MINUTE)) {
		todayCutoff.setDate(todayCutoff.getDate() - 1);
	}

	const cutoffTimestamp = todayCutoff.getTime();

	// Check if the timestamp falls within the range
	return timestamp >= cutoffTimestamp;
}

export const calculateLPDifference = (beforeRank: string, afterRank: string, beforeTier: string, afterTier: string, beforeLP: number, afterLP: number): number => {
	if (!beforeRank || !beforeTier || beforeLP === null || !afterRank || !afterTier || afterLP === null) {
		return 0; // If any data is null, return 0
	}
	const beforeAbsoluteLP = getAbsoluteLP(beforeTier, beforeRank, beforeLP);
	const afterAbsoluteLP = getAbsoluteLP(afterTier, afterRank, afterLP);

	return afterAbsoluteLP - beforeAbsoluteLP;
};

export interface RankSnapshot {
	currentRank: string | null;
	currentTier: string | null;
	currentLP: number | null;
	oldRank: string | null;
	oldTier: string | null;
	oldLP: number | null;
}

// LP won or lost by the last rank change (old* -> current*), or null when
// either side is unknown (first ranked game, unranked player…).
export const getLPGainFromSnapshot = (snapshot: RankSnapshot): number | null => {
	const { currentRank, currentTier, currentLP, oldRank, oldTier, oldLP } = snapshot;
	if (currentRank == null || oldRank == null) {
		return null;
	}
	return calculateLPDifference(oldRank, currentRank, oldTier!, currentTier!, oldLP!, currentLP!);
};

export const getAbsoluteLP = (tier: string, rank: string, lp: number): number => {
	const tierOrder: string[] = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
	const rankOrder: string[] = ["IV", "III", "II", "I"];

	const tierIndex = tierOrder.indexOf(tier.toUpperCase());
	const rankIndex = rankOrder.indexOf(rank.toUpperCase());

	if (tierIndex === -1 || rankIndex === -1) return 0; // Safety check for invalid values

	if (tierIndex >= 7) { // MASTER and above have no fixed ranks
		return 2800 + (tierIndex - 7) * 1000 + lp;
	}

	return tierIndex * 400 + rankIndex * 100 + lp;
};

export const getDurationString = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
};

export const getDisplayRank = (tier: string, rank: string): string => {
	if (!tier || tier.toUpperCase() === 'UNRANKED') {
        return ''; 
    }
    const isHighRank = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier);
    return isHighRank ? '' : ` ${rank}`;
};
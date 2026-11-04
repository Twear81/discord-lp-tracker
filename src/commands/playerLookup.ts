// Pure helpers behind /deleteplayer's `player` option: autocomplete
// suggestions and resolution of the submitted value. Kept free of Discord and
// Sequelize imports so they can be unit-tested.

export interface PlayerIdentity {
	id: number;
	gameName: string;
	tagLine: string;
	region: string;
}

// Discord caps autocomplete responses at 25 choices.
export const MAX_AUTOCOMPLETE_CHOICES = 25;

export const formatPlayerLabel = (player: PlayerIdentity): string => `${player.gameName}#${player.tagLine} (${player.region})`;

const riotId = (player: PlayerIdentity): string => `${player.gameName}#${player.tagLine}`.toLowerCase();

// Players whose Riot ID contains the (case-insensitive) query.
export const suggestPlayers = <T extends PlayerIdentity>(players: T[], query: string): T[] => {
	const needle = query.trim().toLowerCase();
	return players
		.filter(player => riotId(player).includes(needle))
		.slice(0, MAX_AUTOCOMPLETE_CHOICES);
};

// The submitted value is the player id when picked from the autocomplete;
// otherwise accept a typed "name#tag" or "name#tag (REGION)", ignoring case.
// Returns undefined when nothing (or more than one player) matches.
export const resolvePlayer = <T extends PlayerIdentity>(players: T[], input: string): T | undefined => {
	const value = input.trim();
	if (/^\d+$/.test(value)) {
		const byId = players.find(player => player.id === Number(value));
		if (byId) return byId;
	}

	const lower = value.toLowerCase();
	const matches = players.filter(player => riotId(player) === lower || formatPlayerLabel(player).toLowerCase() === lower);
	return matches.length === 1 ? matches[0] : undefined;
};

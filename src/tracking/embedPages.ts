// Discord embed limits (https://discord.com/developers/docs/resources/message#embed-object-embed-limits).
// Exceeding any of them makes the whole send fail, so recaps / leaderboards
// that grow with the number of players are split into several pages.
export const EMBED_LIMITS = {
	fields: 25,
	description: 4096,
	// Combined length of title, description, field names/values, footer and
	// author — across *all* embeds of a single message.
	total: 6000,
} as const;

export interface EmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

const fieldLength = (field: EmbedField): number => field.name.length + field.value.length;

/**
 * Splits `fields` into pages that each fit one embed: at most 25 fields and
 * at most `EMBED_LIMITS.total - reservedChars` characters, where
 * `reservedChars` is what the page's title/description/footer already use.
 * Every page is meant to be sent as its own message.
 */
export const paginateFields = <T extends EmbedField>(fields: T[], reservedChars: number): T[][] => {
	const budget = EMBED_LIMITS.total - reservedChars;
	const pages: T[][] = [];
	let page: T[] = [];
	let pageLength = 0;

	for (const field of fields) {
		const length = fieldLength(field);
		if (page.length > 0 && (page.length >= EMBED_LIMITS.fields || pageLength + length > budget)) {
			pages.push(page);
			page = [];
			pageLength = 0;
		}
		page.push(field);
		pageLength += length;
	}
	if (page.length > 0) {
		pages.push(page);
	}
	return pages;
};

/**
 * Joins `lines` with `separator` into as few strings as possible, each at
 * most `maxChars` long — for embeds that list players in their description.
 */
export const paginateLines = (lines: string[], separator: string, maxChars: number): string[] => {
	const pages: string[] = [];
	let page = '';

	for (const line of lines) {
		const candidate = page === '' ? line : `${page}${separator}${line}`;
		if (page !== '' && candidate.length > maxChars) {
			pages.push(page);
			page = line;
		} else {
			page = candidate;
		}
	}
	if (page !== '') {
		pages.push(page);
	}
	return pages;
};

import { describe, it, expect } from 'vitest';
import { formatPlayerLabel, MAX_AUTOCOMPLETE_CHOICES, resolvePlayer, suggestPlayers } from './playerLookup';

const players = [
	{ id: 1, gameName: 'Faker', tagLine: 'KR1', region: 'KR' },
	{ id: 2, gameName: 'Caps', tagLine: 'EUW', region: 'EUW' },
	{ id: 3, gameName: 'Twin', tagLine: 'EUW', region: 'EUW' },
	{ id: 4, gameName: 'Twin', tagLine: 'EUW', region: 'NA' },
];

describe('suggestPlayers', () => {
	it('matches the Riot ID case-insensitively', () => {
		expect(suggestPlayers(players, 'fAk').map(p => p.id)).toEqual([1]);
		expect(suggestPlayers(players, '#euw').map(p => p.id)).toEqual([2, 3, 4]);
	});

	it('returns everyone for an empty query, capped at the Discord limit', () => {
		const many = Array.from({ length: 30 }, (_, i) => ({ id: i, gameName: `P${i}`, tagLine: 'T', region: 'EUW' }));
		expect(suggestPlayers(many, '')).toHaveLength(MAX_AUTOCOMPLETE_CHOICES);
	});
});

describe('resolvePlayer', () => {
	it('resolves an autocomplete value (player id)', () => {
		expect(resolvePlayer(players, '2')?.gameName).toBe('Caps');
	});

	it('resolves a typed Riot ID regardless of case', () => {
		expect(resolvePlayer(players, ' faker#kr1 ')?.id).toBe(1);
	});

	it('resolves the displayed label', () => {
		expect(resolvePlayer(players, formatPlayerLabel(players[3]))?.id).toBe(4);
	});

	it('refuses an ambiguous Riot ID tracked in two regions', () => {
		expect(resolvePlayer(players, 'twin#euw')).toBeUndefined();
	});

	it('returns undefined for an unknown player', () => {
		expect(resolvePlayer(players, 'nobody#000')).toBeUndefined();
		expect(resolvePlayer(players, '999')).toBeUndefined();
	});
});

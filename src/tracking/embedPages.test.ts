import { describe, it, expect } from 'vitest';
import { EMBED_LIMITS, paginateFields, paginateLines } from './embedPages';

const field = (i: number, valueLength = 10) => ({ name: `Player${i}`, value: 'x'.repeat(valueLength) });

describe('paginateFields', () => {
	it('keeps everything on one page when it fits', () => {
		expect(paginateFields([field(1), field(2)], 100)).toHaveLength(1);
	});

	it('never puts more than 25 fields on a page', () => {
		const pages = paginateFields(Array.from({ length: 60 }, (_, i) => field(i)), 0);
		expect(pages.map(page => page.length)).toEqual([25, 25, 10]);
	});

	it('splits on the 6000-character total, header included', () => {
		// ~410 chars per field: 14 fit in 6000, fewer once the header is reserved.
		const fields = Array.from({ length: 20 }, (_, i) => field(i, 400));
		for (const reserved of [0, 1000]) {
			const pages = paginateFields(fields, reserved);
			expect(pages.flat()).toEqual(fields);
			for (const page of pages) {
				const length = page.reduce((sum, f) => sum + f.name.length + f.value.length, 0);
				expect(length + reserved).toBeLessThanOrEqual(EMBED_LIMITS.total);
			}
		}
	});

	it('returns no page for no fields', () => {
		expect(paginateFields([], 0)).toEqual([]);
	});
});

describe('paginateLines', () => {
	it('joins lines and splits before exceeding the limit', () => {
		expect(paginateLines(['aaa', 'bbb', 'ccc'], '\n', 7)).toEqual(['aaa\nbbb', 'ccc']);
	});

	it('keeps every line, in order', () => {
		const lines = Array.from({ length: 100 }, (_, i) => `line ${i} `.repeat(10));
		const pages = paginateLines(lines, '\n\n', EMBED_LIMITS.description);
		expect(pages.join('\n\n')).toBe(lines.join('\n\n'));
		for (const page of pages) expect(page.length).toBeLessThanOrEqual(EMBED_LIMITS.description);
	});

	it('returns no page for no lines', () => {
		expect(paginateLines([], '\n', 10)).toEqual([]);
	});
});

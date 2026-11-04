import { describe, it, expect } from 'vitest';
import { Constants } from 'twisted';
import { REGION_CHOICES, regionToPlatform } from './region';

describe('regionToPlatform', () => {
	it('maps every offered region to a platform with a routing cluster', () => {
		for (const { value } of REGION_CHOICES) {
			const platform = regionToPlatform(value);
			expect(Constants.regionToRegionGroup(platform)).toBeTruthy();
			expect(Constants.regionToRegionGroupForAccountAPI(platform)).toBeTruthy();
		}
	});

	it('is case-insensitive', () => {
		expect(regionToPlatform('euw')).toBe(Constants.Regions.EU_WEST);
	});

	it('rejects unknown regions', () => {
		expect(() => regionToPlatform('MOON')).toThrow();
	});
});

import { describe, expect, it } from 'vitest';
import { normalizeSqlValue, shouldBindParams } from './db';

describe('db helpers', () => {
	it('binds only when params contain at least one value', () => {
		expect(shouldBindParams(undefined)).toBe(false);
		expect(shouldBindParams([])).toBe(false);
		expect(shouldBindParams([1])).toBe(true);
		expect(shouldBindParams(['x', 2])).toBe(true);
	});

	it('normalizes BigInt values for UI/runtime compatibility', () => {
		expect(normalizeSqlValue(123n)).toBe(123);
		expect(normalizeSqlValue('abc')).toBe('abc');
		expect(normalizeSqlValue(null)).toBeNull();
	});
});

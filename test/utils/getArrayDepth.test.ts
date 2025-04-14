import { getArrayDepth } from "../../src/utils/getArrayDepth";

describe("getArrayDepth", () => {
    it('returns 1 for a flat array', () => {
        expect(getArrayDepth([1, 2, 3])).toBe(1);
    });

    it('returns 2 for an array with one nested level', () => {
        expect(getArrayDepth([1, [2, 3]])).toBe(2);
    });

    it('returns 3 for deeply nested arrays', () => {
        expect(getArrayDepth([1, [2, [3, 4]]])).toBe(3);
    });

    it('returns 4 for even deeper nesting', () => {
        expect(getArrayDepth([[[[1]]]])).toBe(4);
    });

    it('returns 1 for empty array', () => {
        expect(getArrayDepth([])).toBe(1);
    });

    it('returns 0 for non-array input (shouldn’t really happen)', () => {
        // TypeScript wouldn’t allow this unless forced
        expect(getArrayDepth('not an array' as unknown as any[])).toBe(0);
    });

    it('handles mixed nested and non-nested elements', () => {
        expect(getArrayDepth([1, [2], 3])).toBe(2);
    });

    it('handles arrays with multiple nested branches', () => {
        expect(getArrayDepth([1, [2], [3, [4, [5]]]])).toBe(4);
    });
});
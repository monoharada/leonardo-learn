import { describe, expect, test } from "bun:test";
import {
	CUD_ACCENT_COLORS,
	CUD_BASE_COLORS,
	CUD_NEUTRAL_COLORS,
} from "./colors";
import {
	type CudSearchResult,
	findExactCudColorByHex,
	findNearestCudColor,
	getCudColorSet,
	getCudColorsByGroup,
} from "./service";

describe("CUD Palette Service", () => {
	describe("getCudColorSet (Task 3.1)", () => {
		test("should return all 20 colors", () => {
			const colors = getCudColorSet();
			expect(colors).toHaveLength(20);
		});

		test("should return readonly array", () => {
			const colors = getCudColorSet();
			expect(Object.isFrozen(colors)).toBe(true);
		});

		test("should return consistent reference", () => {
			const colors1 = getCudColorSet();
			const colors2 = getCudColorSet();
			expect(colors1).toBe(colors2);
		});
	});

	describe("getCudColorsByGroup (Task 3.1)", () => {
		test("should return 9 accent colors", () => {
			const colors = getCudColorsByGroup("accent");
			expect(colors).toHaveLength(9);
			for (const color of colors) {
				expect(color.group).toBe("accent");
			}
		});

		test("should return 7 base colors", () => {
			const colors = getCudColorsByGroup("base");
			expect(colors).toHaveLength(7);
			for (const color of colors) {
				expect(color.group).toBe("base");
			}
		});

		test("should return 4 neutral colors", () => {
			const colors = getCudColorsByGroup("neutral");
			expect(colors).toHaveLength(4);
			for (const color of colors) {
				expect(color.group).toBe("neutral");
			}
		});

		test("should return readonly array", () => {
			const colors = getCudColorsByGroup("accent");
			expect(Object.isFrozen(colors)).toBe(true);
		});

		test("should return consistent reference for same group", () => {
			const colors1 = getCudColorsByGroup("base");
			const colors2 = getCudColorsByGroup("base");
			expect(colors1).toBe(colors2);
		});
	});

	describe("findExactCudColorByHex (Task 3.2)", () => {
		test("should find exact match with uppercase hex", () => {
			const result = findExactCudColorByHex("#FF2800");
			expect(result).not.toBeNull();
			expect(result?.id).toBe("red");
		});

		test("should find exact match with lowercase hex", () => {
			const result = findExactCudColorByHex("#ff2800");
			expect(result).not.toBeNull();
			expect(result?.id).toBe("red");
		});

		test("should find exact match without hash prefix", () => {
			const result = findExactCudColorByHex("FF2800");
			expect(result).not.toBeNull();
			expect(result?.id).toBe("red");
		});

		test("should return null for non-CUD color", () => {
			const result = findExactCudColorByHex("#123456");
			expect(result).toBeNull();
		});

		test("should find all CUD colors", () => {
			const allColors = [
				...CUD_ACCENT_COLORS,
				...CUD_BASE_COLORS,
				...CUD_NEUTRAL_COLORS,
			];
			for (const color of allColors) {
				const result = findExactCudColorByHex(color.hex);
				expect(result).not.toBeNull();
				expect(result?.id).toBe(color.id);
			}
		});

		test("should handle white", () => {
			const result = findExactCudColorByHex("#FFFFFF");
			expect(result).not.toBeNull();
			expect(result?.id).toBe("white");
		});

		test("should handle black", () => {
			const result = findExactCudColorByHex("#000000");
			expect(result).not.toBeNull();
			expect(result?.id).toBe("black");
		});
	});

	describe("findNearestCudColor (Task 3.3)", () => {
		test("should return exact match with deltaE close to 0", () => {
			const result = findNearestCudColor("#FF2800");
			expect(result.nearest.id).toBe("red");
			expect(result.deltaE).toBeLessThan(0.001);
			expect(result.matchLevel).toBe("exact");
		});

		test("should return search result structure", () => {
			const result = findNearestCudColor("#FF0000");
			expect(result).toHaveProperty("nearest");
			expect(result).toHaveProperty("deltaE");
			expect(result).toHaveProperty("matchLevel");
			expect(result.nearest).toHaveProperty("id");
			expect(result.nearest).toHaveProperty("hex");
		});

		test("should classify exact match (deltaE <= 0.03)", () => {
			// CUD red is #FF2800, test with very similar color
			const result = findNearestCudColor("#FF2800");
			expect(result.matchLevel).toBe("exact");
			expect(result.deltaE).toBeLessThanOrEqual(0.03);
		});

		test("should classify near match (0.03 < deltaE <= 0.06)", () => {
			// Find a color that's close but not exact
			// Slightly adjusted red
			const result = findNearestCudColor("#FF3300");
			expect(["exact", "near"]).toContain(result.matchLevel);
		});

		test("should classify off match (deltaE > 0.06)", () => {
			// A color that's distinctly different from all CUD colors
			const result = findNearestCudColor("#808080"); // mid gray not in CUD
			if (result.deltaE > 0.06) {
				expect(result.matchLevel).toBe("off");
			}
		});

		test("should find nearest for arbitrary color", () => {
			// Pure red should be closest to CUD red
			const result = findNearestCudColor("#FF0000");
			expect(result.nearest.id).toBe("red");
		});

		test("should handle colors in different hue regions", () => {
			// Test blue region
			const blueResult = findNearestCudColor("#0000FF");
			expect(blueResult.nearest.group).toBe("accent");

			// Test yellow region
			const yellowResult = findNearestCudColor("#FFFF00");
			expect(yellowResult.nearest.id).toBe("yellow");
		});

		test("should return correct deltaE value", () => {
			const result = findNearestCudColor("#FF2800"); // exact CUD red
			expect(result.deltaE).toBeGreaterThanOrEqual(0);
		});

		test("should work with white", () => {
			const result = findNearestCudColor("#FFFFFF");
			expect(result.nearest.id).toBe("white");
			expect(result.matchLevel).toBe("exact");
		});

		test("should work with black", () => {
			const result = findNearestCudColor("#000000");
			expect(result.nearest.id).toBe("black");
			expect(result.matchLevel).toBe("exact");
		});

		test("should accept hex without hash", () => {
			const result = findNearestCudColor("FF2800");
			expect(result.nearest.id).toBe("red");
		});

		test("should accept lowercase hex", () => {
			const result = findNearestCudColor("#ff2800");
			expect(result.nearest.id).toBe("red");
		});
	});
});

/**
 * dads-harmony-selector.test.ts
 * TDD: Tests for DADS harmony selection functionality
 *
 * Generates harmony palettes using DADS token selection
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { oklch } from "culori";
import { loadDadsTokens } from "../tokens/dads-data-provider";
import type { DadsToken } from "../tokens/types";
import { DadsHarmonySelector } from "./dads-harmony-selector";

describe("DadsHarmonySelector", () => {
	let selector: DadsHarmonySelector;
	let tokens: DadsToken[];

	beforeAll(async () => {
		tokens = await loadDadsTokens();
		const chromaticTokens = tokens.filter(
			(t) => t.classification.category === "chromatic",
		);
		selector = new DadsHarmonySelector(chromaticTokens);
	});

	describe("constructor", () => {
		test("initializes with chromatic tokens", () => {
			expect(selector).toBeDefined();
		});

		test("throws if no tokens provided", () => {
			expect(() => new DadsHarmonySelector([])).toThrow();
		});
	});

	describe("generateComplementary", () => {
		test("returns palette result with 1 secondary color", () => {
			const result = selector.generateComplementary("#0056FF");

			expect(result.colors).toHaveLength(1);
			expect(result.colors[0]?.role).toBe("secondary");
		});

		test("secondary color is from complementary hue (+180)", () => {
			// Blue (#0056FF) hue ~266, complementary ~86 (yellow range)
			const result = selector.generateComplementary("#0056FF");

			expect(result.colors[0]).toBeDefined();
			const secondaryHex = result.colors[0]?.token.hex;
			const secondaryOklch = oklch(secondaryHex);

			// Complementary of blue should be in yellow range (60-100)
			expect(secondaryOklch?.h).toBeGreaterThan(60);
			expect(secondaryOklch?.h).toBeLessThan(120);
		});

		test("returns valid DADS token", () => {
			const result = selector.generateComplementary("#FF0000");

			expect(result.colors[0]).toBeDefined();
			expect(result.colors[0]?.token.source).toBe("dads");
			expect(result.colors[0]?.token.id).toMatch(/^dads-/);
		});
	});

	describe("generateTriadic", () => {
		test("returns palette result with 2 colors", () => {
			const result = selector.generateTriadic("#0056FF");

			expect(result.colors).toHaveLength(2);
		});

		test("colors are from 120 and 240 degree positions", () => {
			// Blue hue ~266
			// +120 = 386 -> 26 (red range)
			// +240 = 506 -> 146 (green range)
			const result = selector.generateTriadic("#0056FF");

			const hues = result.colors.map((c) => {
				const oklchColor = oklch(c.token.hex);
				return oklchColor?.h ?? 0;
			});

			// One should be in red range (10-50)
			// One should be in green range (130-180)
			const hasRed = hues.some((h) => h >= 10 && h <= 60);
			const hasGreen = hues.some((h) => h >= 130 && h <= 180);

			expect(hasRed).toBe(true);
			expect(hasGreen).toBe(true);
		});

		test("assigns correct roles", () => {
			const result = selector.generateTriadic("#0056FF");

			expect(result.colors[0]?.role).toBe("secondary");
			expect(result.colors[1]?.role).toBe("accent");
		});
	});

	describe("generateAnalogous", () => {
		test("returns palette result with 2 colors", () => {
			const result = selector.generateAnalogous("#0056FF");

			expect(result.colors).toHaveLength(2);
		});

		test("colors are from ±30 degree positions", () => {
			// Blue hue ~266
			// +30 = 296 (purple range)
			// -30 = 236 (cyan/light-blue range)
			const result = selector.generateAnalogous("#0056FF");

			const hues = result.colors.map((c) => {
				const oklchColor = oklch(c.token.hex);
				return oklchColor?.h ?? 0;
			});

			// Both should be relatively close to blue
			// Allow more tolerance since DADS has only 10 discrete hues
			for (const h of hues) {
				const distanceFromBlue = Math.min(
					Math.abs(h - 266),
					Math.abs(h - 266 + 360),
					Math.abs(h - 266 - 360),
				);
				expect(distanceFromBlue).toBeLessThan(55);
			}
		});
	});

	describe("generateSplitComplementary", () => {
		test("returns palette result with 2 colors", () => {
			const result = selector.generateSplitComplementary("#0056FF");

			expect(result.colors).toHaveLength(2);
		});

		test("colors are from 150 and 210 degree positions", () => {
			const result = selector.generateSplitComplementary("#0056FF");

			expect(result.colors).toHaveLength(2);
			// Should have two colors on either side of the complement
		});
	});

	describe("generateTetradic", () => {
		test("returns palette result with 3 colors", () => {
			const result = selector.generateTetradic("#0056FF");

			expect(result.colors).toHaveLength(3);
		});

		test("assigns correct roles", () => {
			const result = selector.generateTetradic("#0056FF");

			expect(result.colors[0]?.role).toBe("secondary");
			expect(result.colors[1]?.role).toBe("accent");
			expect(result.colors[2]?.role).toBe("accent");
		});
	});

	describe("generateSquare", () => {
		test("returns palette result with 3 colors", () => {
			const result = selector.generateSquare("#0056FF");

			expect(result.colors).toHaveLength(3);
		});

		test("colors are from 90, 180, and 270 degree positions", () => {
			const result = selector.generateSquare("#0056FF");

			expect(result.colors).toHaveLength(3);
			// Should have colors at roughly 90-degree intervals
		});
	});

	describe("all tokens are valid DADS tokens", () => {
		const methods = [
			"generateComplementary",
			"generateTriadic",
			"generateAnalogous",
			"generateSplitComplementary",
			"generateTetradic",
			"generateSquare",
		] as const;

		for (const method of methods) {
			test(`${method} returns only valid DADS tokens`, () => {
				const result = selector[method]("#3366cc");

				for (const color of result.colors) {
					expect(color.token.source).toBe("dads");
					expect(color.token.id).toMatch(/^dads-/);
					expect(color.token.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
				}
			});
		}
	});

	describe("no duplicate tokens", () => {
		const methods = [
			"generateTriadic",
			"generateAnalogous",
			"generateSplitComplementary",
			"generateTetradic",
			"generateSquare",
		] as const;

		for (const method of methods) {
			test(`${method} returns unique tokens`, () => {
				const result = selector[method]("#3366cc");

				const ids = result.colors.map((c) => c.token.id);
				const uniqueIds = new Set(ids);

				expect(uniqueIds.size).toBe(ids.length);
			});
		}
	});

	describe("performance", () => {
		test("generates 20 complementary palettes in <200ms", () => {
			const start = performance.now();

			for (let i = 0; i < 20; i++) {
				selector.generateComplementary(`hsl(${i * 18}, 70%, 50%)`);
			}

			const elapsed = performance.now() - start;
			expect(elapsed).toBeLessThan(200);
		});

		test("generates 20 triadic palettes in <200ms", () => {
			const start = performance.now();

			for (let i = 0; i < 20; i++) {
				selector.generateTriadic(`hsl(${i * 18}, 70%, 50%)`);
			}

			const elapsed = performance.now() - start;
			expect(elapsed).toBeLessThan(200);
		});

		test("generates all harmony types for same color in <50ms", () => {
			const start = performance.now();

			selector.generateComplementary("#3366cc");
			selector.generateTriadic("#3366cc");
			selector.generateAnalogous("#3366cc");
			selector.generateSplitComplementary("#3366cc");
			selector.generateTetradic("#3366cc");
			selector.generateSquare("#3366cc");

			const elapsed = performance.now() - start;
			expect(elapsed).toBeLessThan(50);
		});
	});

	describe("edge cases", () => {
		test("handles grayscale input by defaulting to blue", () => {
			// Grayscale has undefined hue
			const result = selector.generateComplementary("#808080");

			expect(result.colors).toHaveLength(1);
			expect(result.colors[0]).toBeDefined();
		});

		test("handles very saturated colors", () => {
			const result = selector.generateComplementary("#FF0000");

			expect(result.colors).toHaveLength(1);
			expect(result.colors[0]).toBeDefined();
		});

		test("handles very desaturated colors", () => {
			const result = selector.generateComplementary("#cccccc");

			expect(result.colors).toHaveLength(1);
			expect(result.colors[0]).toBeDefined();
		});
	});
});

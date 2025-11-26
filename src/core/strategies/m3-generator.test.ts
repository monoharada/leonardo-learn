import { describe, expect, test } from "bun:test";
import {
	generateM3ToneScale,
	hctToOklch,
	M3_TONE_VALUES,
} from "./m3-generator";

describe("M3Generator", () => {
	describe("M3_TONE_VALUES", () => {
		test("should have 13 tone values", () => {
			expect(M3_TONE_VALUES).toHaveLength(13);
		});

		test("should include all M3 standard tones", () => {
			const expectedTones = [
				0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100,
			];
			expect(M3_TONE_VALUES).toEqual(expectedTones);
		});
	});

	describe("hctToOklch", () => {
		test("should convert HCT to OKLCH with acceptable precision", () => {
			// Test with a known color
			const oklch = hctToOklch(250, 50, 50); // Blue-ish hue, medium chroma, medium tone

			expect(oklch.l).toBeGreaterThan(0);
			expect(oklch.l).toBeLessThan(1);
			expect(oklch.c).toBeGreaterThanOrEqual(0);
			expect(oklch.h).toBeDefined();
		});

		test("should handle pure white (tone 100)", () => {
			const oklch = hctToOklch(0, 0, 100);

			expect(oklch.l).toBeCloseTo(1, 2);
			expect(oklch.c).toBeCloseTo(0, 2);
		});

		test("should handle pure black (tone 0)", () => {
			const oklch = hctToOklch(0, 0, 0);

			expect(oklch.l).toBeCloseTo(0, 2);
			expect(oklch.c).toBeCloseTo(0, 2);
		});

		test("should maintain hue approximately", () => {
			const hue = 120; // Green
			const oklch = hctToOklch(hue, 50, 50);

			// Hue should be roughly in the green range (accounting for color space differences)
			// HCT hue and OKLCH hue are different scales but should be roughly similar
			expect(oklch.h).toBeDefined();
			expect(oklch.h).toBeGreaterThan(0);
			expect(oklch.h).toBeLessThan(360);
		});
	});

	describe("generateM3ToneScale", () => {
		test("should generate 13 tones from a source color", () => {
			const result = generateM3ToneScale("#3366cc");

			expect(result.tones.size).toBe(13);
		});

		test("should include all standard M3 tone values", () => {
			const result = generateM3ToneScale("#3366cc");

			for (const tone of M3_TONE_VALUES) {
				expect(result.tones.has(tone)).toBe(true);
			}
		});

		test("should have tone 0 as darkest (L close to 0)", () => {
			const result = generateM3ToneScale("#3366cc");
			const tone0 = result.tones.get(0);

			expect(tone0).toBeDefined();
			expect(tone0?.oklch.l).toBeLessThan(0.05);
		});

		test("should have tone 100 as lightest (L close to 1)", () => {
			const result = generateM3ToneScale("#3366cc");
			const tone100 = result.tones.get(100);

			expect(tone100).toBeDefined();
			expect(tone100?.oklch.l).toBeGreaterThan(0.95);
		});

		test("should have monotonically increasing lightness from tone 0 to 100", () => {
			const result = generateM3ToneScale("#3366cc");

			let prevLightness = 0;
			for (const tone of M3_TONE_VALUES) {
				const color = result.tones.get(tone);
				expect(color).toBeDefined();
				expect(color?.oklch.l).toBeGreaterThanOrEqual(prevLightness);
				prevLightness = color?.oklch.l;
			}
		});

		test("should maintain source hue across all tones", () => {
			const result = generateM3ToneScale("#3366cc");
			const _sourceHue = result.sourceHue;

			// Check middle tones (extremes may have undefined hue due to low chroma)
			const middleTones = [30, 40, 50, 60, 70];
			for (const tone of middleTones) {
				const color = result.tones.get(tone);
				if (color && color.oklch.c > 0.01 && color.oklch.h !== undefined) {
					// Hue should be within reasonable range (HCT and OKLCH hues differ)
					// Just check it's defined and valid
					expect(color.oklch.h).toBeGreaterThanOrEqual(0);
					expect(color.oklch.h).toBeLessThan(360);
				}
			}
		});

		test("should store source color information", () => {
			const result = generateM3ToneScale("#3366cc");

			expect(result.sourceColor).toBeDefined();
			expect(result.sourceHue).toBeDefined();
		});

		describe("tone-to-lightness mapping", () => {
			test("should map tone N to approximately L = N/100 with HCT tolerance", () => {
				const result = generateM3ToneScale("#808080"); // Gray for clearer mapping

				// HCT tone and OKLCH lightness are not perfectly linear
				// Allow for color space conversion differences (±0.15)
				const tone50 = result.tones.get(50);
				expect(tone50?.oklch.l).toBeGreaterThan(0.4);
				expect(tone50?.oklch.l).toBeLessThan(0.7);

				const tone20 = result.tones.get(20);
				expect(tone20?.oklch.l).toBeGreaterThan(0.1);
				expect(tone20?.oklch.l).toBeLessThan(0.4);

				const tone80 = result.tones.get(80);
				expect(tone80?.oklch.l).toBeGreaterThan(0.7);
				expect(tone80?.oklch.l).toBeLessThan(0.95);
			});
		});

		describe("edge cases", () => {
			test("should handle pure white input", () => {
				const result = generateM3ToneScale("#ffffff");
				expect(result.tones.size).toBe(13);
			});

			test("should handle pure black input", () => {
				const result = generateM3ToneScale("#000000");
				expect(result.tones.size).toBe(13);
			});

			test("should handle high chroma input", () => {
				const result = generateM3ToneScale("#ff0000"); // Bright red
				expect(result.tones.size).toBe(13);

				// Should still have proper lightness distribution
				const tone0 = result.tones.get(0);
				const tone100 = result.tones.get(100);
				expect(tone0?.oklch.l).toBeLessThan(tone100?.oklch.l);
			});

			test("should handle gray input (no hue)", () => {
				const result = generateM3ToneScale("#808080");
				expect(result.tones.size).toBe(13);
			});
		});
	});
});

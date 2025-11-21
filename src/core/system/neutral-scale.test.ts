import { describe, expect, test } from "bun:test";
import {
	generateNeutralScale,
	NEUTRAL_SHADE_KEYS,
	type NeutralScaleOptions,
} from "./neutral-scale";

describe("NeutralScale", () => {
	describe("NEUTRAL_SHADE_KEYS", () => {
		test("should have 11 shade levels", () => {
			expect(NEUTRAL_SHADE_KEYS).toHaveLength(11);
		});

		test("should include standard shade values", () => {
			const expectedKeys = [
				50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
			];
			expect(NEUTRAL_SHADE_KEYS).toEqual(expectedKeys);
		});
	});

	describe("generateNeutralScale", () => {
		test("should generate 11 shades from a base color", () => {
			const result = generateNeutralScale("#3366cc");
			expect(Object.keys(result.shades)).toHaveLength(11);
		});

		test("should maintain base color hue in all shades", () => {
			const result = generateNeutralScale("#3366cc");
			const baseHue = result.shades[500].oklch.h;

			for (const [_key, shade] of Object.entries(result.shades)) {
				// Hue should be maintained (or undefined for pure achromatic)
				if (shade.oklch.h !== undefined && baseHue !== undefined) {
					expect(shade.oklch.h).toBeCloseTo(baseHue, 1);
				}
			}
		});

		test("should generate very low chroma (0.00-0.02) for all shades", () => {
			const result = generateNeutralScale("#3366cc");

			for (const [_key, shade] of Object.entries(result.shades)) {
				expect(shade.oklch.c).toBeLessThanOrEqual(0.02);
				expect(shade.oklch.c).toBeGreaterThanOrEqual(0);
			}
		});

		test("should have perceptually uniform lightness distribution", () => {
			const result = generateNeutralScale("#3366cc");
			const shadeEntries = Object.entries(result.shades).sort(
				([a], [b]) => Number(a) - Number(b),
			);

			// Check that lightness decreases monotonically from 50 to 950
			let prevLightness = 1;
			for (const [_key, shade] of shadeEntries) {
				expect(shade.oklch.l).toBeLessThanOrEqual(prevLightness);
				prevLightness = shade.oklch.l;
			}
		});

		test("should have shade 50 as lightest and 950 as darkest", () => {
			const result = generateNeutralScale("#3366cc");

			// Shade 50 should be very light (L > 0.9)
			expect(result.shades[50].oklch.l).toBeGreaterThan(0.9);

			// Shade 950 should be very dark (L < 0.15)
			expect(result.shades[950].oklch.l).toBeLessThan(0.15);
		});

		test("should have roughly equal lightness steps between adjacent shades", () => {
			const result = generateNeutralScale("#3366cc");
			const shadeEntries = Object.entries(result.shades).sort(
				([a], [b]) => Number(a) - Number(b),
			);

			const lightnesses = shadeEntries.map(([_, shade]) => shade.oklch.l);
			const steps: number[] = [];

			for (let i = 1; i < lightnesses.length; i++) {
				steps.push(lightnesses[i - 1] - lightnesses[i]);
			}

			// Steps should be roughly similar (within 0.05 of each other)
			const avgStep = steps.reduce((a, b) => a + b, 0) / steps.length;
			for (const step of steps) {
				expect(Math.abs(step - avgStep)).toBeLessThan(0.05);
			}
		});

		describe("with options", () => {
			test("should use custom chroma when specified", () => {
				const options: NeutralScaleOptions = {
					chroma: 0.015,
				};
				const result = generateNeutralScale("#3366cc", options);

				for (const [_key, shade] of Object.entries(result.shades)) {
					expect(shade.oklch.c).toBeCloseTo(0.015, 3);
				}
			});

			test("should generate pure gray (C=0) when chroma is 0", () => {
				const options: NeutralScaleOptions = {
					chroma: 0,
				};
				const result = generateNeutralScale("#3366cc", options);

				for (const [_key, shade] of Object.entries(result.shades)) {
					expect(shade.oklch.c).toBe(0);
				}
			});

			test("should use custom hue when overrideHue is specified", () => {
				const options: NeutralScaleOptions = {
					overrideHue: 180,
				};
				const result = generateNeutralScale("#3366cc", options);

				for (const [_key, shade] of Object.entries(result.shades)) {
					if (shade.oklch.c > 0) {
						expect(shade.oklch.h).toBeCloseTo(180, 1);
					}
				}
			});
		});

		describe("edge cases", () => {
			test("should handle pure white input", () => {
				const result = generateNeutralScale("#ffffff");
				expect(Object.keys(result.shades)).toHaveLength(11);
			});

			test("should handle pure black input", () => {
				const result = generateNeutralScale("#000000");
				expect(Object.keys(result.shades)).toHaveLength(11);
			});

			test("should handle gray input (no hue)", () => {
				const result = generateNeutralScale("#808080");
				expect(Object.keys(result.shades)).toHaveLength(11);

				// Gray has no hue, so all shades should be achromatic
				for (const [_key, shade] of Object.entries(result.shades)) {
					expect(shade.oklch.c).toBeLessThanOrEqual(0.02);
				}
			});

			test("should handle high chroma input by reducing to neutral range", () => {
				// Bright red with high chroma
				const result = generateNeutralScale("#ff0000");

				for (const [_key, shade] of Object.entries(result.shades)) {
					expect(shade.oklch.c).toBeLessThanOrEqual(0.02);
				}
			});
		});
	});
});

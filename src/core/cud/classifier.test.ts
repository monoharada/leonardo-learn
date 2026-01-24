import { describe, expect, test } from "bun:test";
import {
	classifyColor,
	classifyHue,
	classifyLightness,
	isSameCluster,
} from "./classifier";
import { CUD_ACCENT_COLORS, CUD_NEUTRAL_COLORS } from "./colors";

describe("Color Classifier", () => {
	describe("classifyHue (Task 4.1)", () => {
		test("should classify red hue to warm_red_orange", () => {
			// Red has hue around 28-30
			const result = classifyHue({ l: 0.6, c: 0.2, h: 30 });
			expect(result).toBe("warm_red_orange");
		});

		test("should classify orange hue to warm_red_orange", () => {
			// Orange has hue around 55-60
			const result = classifyHue({ l: 0.7, c: 0.2, h: 55 });
			expect(result).toBe("warm_red_orange");
		});

		test("should classify yellow hue to yellow", () => {
			// Yellow has hue around 100-105
			const result = classifyHue({ l: 0.95, c: 0.2, h: 100 });
			expect(result).toBe("yellow");
		});

		test("should classify yellow-green hue to yellow_green", () => {
			// Yellow-green has hue around 120-130
			const result = classifyHue({ l: 0.9, c: 0.15, h: 125 });
			expect(result).toBe("yellow_green");
		});

		test("should classify green hue to green", () => {
			// Green has hue around 150-165
			const result = classifyHue({ l: 0.6, c: 0.15, h: 155 });
			expect(result).toBe("green");
		});

		test("should classify cyan/sky hue to cyan_sky", () => {
			// Cyan/sky has hue around 200-220
			const result = classifyHue({ l: 0.8, c: 0.1, h: 210 });
			expect(result).toBe("cyan_sky");
		});

		test("should classify blue hue to blue", () => {
			// Blue has hue around 260-280
			const result = classifyHue({ l: 0.5, c: 0.25, h: 265 });
			expect(result).toBe("blue");
		});

		test("should classify purple/magenta hue to magenta_purple", () => {
			// Purple/magenta has hue around 300-340
			const result = classifyHue({ l: 0.5, c: 0.2, h: 320 });
			expect(result).toBe("magenta_purple");
		});

		test("should classify brown hue correctly", () => {
			// Brown typically has low lightness and warm hue
			// Requires special handling based on both hue and lightness
			const result = classifyHue({ l: 0.3, c: 0.08, h: 50 });
			expect(result).toBe("brown");
		});

		test("should classify low chroma colors as neutral", () => {
			// Colors with chroma < 0.03 should be neutral
			const result = classifyHue({ l: 0.5, c: 0.02, h: 180 });
			expect(result).toBe("neutral");
		});

		test("should classify very low chroma regardless of hue", () => {
			// Even if hue suggests a color, low chroma means neutral
			const result = classifyHue({ l: 0.5, c: 0.01, h: 30 }); // Would be red if chromatic
			expect(result).toBe("neutral");
		});

		test("should handle hue wrapping at 360", () => {
			// Hues near 0 and 360 should both be warm_red_orange
			const result1 = classifyHue({ l: 0.6, c: 0.2, h: 5 });
			const result2 = classifyHue({ l: 0.6, c: 0.2, h: 355 });
			expect(result1).toBe("warm_red_orange");
			expect(result2).toBe("warm_red_orange");
		});
	});

	describe("classifyLightness (Task 4.2)", () => {
		test("should classify very light (L >= 0.9)", () => {
			const result = classifyLightness(0.95);
			expect(result).toBe("very_light");
		});

		test("should classify light (0.7 <= L < 0.9)", () => {
			const result = classifyLightness(0.75);
			expect(result).toBe("light");
		});

		test("should classify medium (0.45 <= L < 0.7)", () => {
			const result = classifyLightness(0.55);
			expect(result).toBe("medium");
		});

		test("should classify dark (L < 0.45)", () => {
			const result = classifyLightness(0.3);
			expect(result).toBe("dark");
		});

		test("should handle boundary at 0.9", () => {
			expect(classifyLightness(0.9)).toBe("very_light");
			expect(classifyLightness(0.89)).toBe("light");
		});

		test("should handle boundary at 0.7", () => {
			expect(classifyLightness(0.7)).toBe("light");
			expect(classifyLightness(0.69)).toBe("medium");
		});

		test("should handle boundary at 0.45", () => {
			expect(classifyLightness(0.45)).toBe("medium");
			expect(classifyLightness(0.44)).toBe("dark");
		});

		test("should handle extreme values", () => {
			expect(classifyLightness(1.0)).toBe("very_light");
			expect(classifyLightness(0.0)).toBe("dark");
		});
	});

	describe("classifyColor (Task 4.3)", () => {
		test("should return both hue and lightness classification", () => {
			const result = classifyColor({ l: 0.6, c: 0.2, h: 30 });
			expect(result).toHaveProperty("hueCluster");
			expect(result).toHaveProperty("lightnessBucket");
		});

		test("should flag confusable color combinations", () => {
			// Yellow + high lightness
			const yellowLight = classifyColor({ l: 0.95, c: 0.15, h: 100 });
			expect(yellowLight.isConfusableRisk).toBe(true);

			// Yellow-green + high lightness
			const yellowGreenLight = classifyColor({ l: 0.92, c: 0.15, h: 125 });
			expect(yellowGreenLight.isConfusableRisk).toBe(true);
		});

		test("should not flag non-confusable combinations", () => {
			// Blue + medium lightness
			const blueResult = classifyColor({ l: 0.5, c: 0.25, h: 265 });
			expect(blueResult.isConfusableRisk).toBe(false);

			// Red + medium lightness
			const redResult = classifyColor({ l: 0.6, c: 0.2, h: 30 });
			expect(redResult.isConfusableRisk).toBe(false);
		});

		test("should work with CUD accent colors", () => {
			for (const color of CUD_ACCENT_COLORS) {
				const result = classifyColor(color.oklch);
				expect(result.hueCluster).toBeDefined();
				expect(result.lightnessBucket).toBeDefined();
			}
		});

		test("should classify CUD neutral colors as neutral hue", () => {
			for (const color of CUD_NEUTRAL_COLORS) {
				const result = classifyColor(color.oklch);
				// Neutral colors should have neutral hue cluster (low chroma)
				// Note: gray has slight blue tint with c=0.024, might not be strictly neutral
				if (color.oklch.c < 0.03) {
					expect(result.hueCluster).toBe("neutral");
				}
			}
		});
	});

	describe("isSameCluster (Task 4.3)", () => {
		test("should return true for same hue cluster and lightness bucket", () => {
			const color1 = { l: 0.6, c: 0.2, h: 30 };
			const color2 = { l: 0.55, c: 0.18, h: 35 };
			const result = isSameCluster(color1, color2);
			expect(result.sameHue).toBe(true);
			expect(result.sameLightness).toBe(true);
		});

		test("should return false for different hue clusters", () => {
			const color1 = { l: 0.6, c: 0.2, h: 30 }; // warm_red_orange
			const color2 = { l: 0.6, c: 0.2, h: 210 }; // cyan_sky
			const result = isSameCluster(color1, color2);
			expect(result.sameHue).toBe(false);
		});

		test("should return false for different lightness buckets", () => {
			const color1 = { l: 0.95, c: 0.2, h: 30 }; // very_light
			const color2 = { l: 0.3, c: 0.2, h: 30 }; // dark
			const result = isSameCluster(color1, color2);
			expect(result.sameLightness).toBe(false);
		});

		test("should identify confusable pairs", () => {
			// Two colors in same cluster/bucket with high lightness
			const yellow1 = { l: 0.95, c: 0.15, h: 100 };
			const yellow2 = { l: 0.93, c: 0.12, h: 105 };
			const result = isSameCluster(yellow1, yellow2);
			expect(result.sameHue).toBe(true);
			expect(result.sameLightness).toBe(true);
		});
	});
});

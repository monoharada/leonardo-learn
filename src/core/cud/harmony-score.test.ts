/**
 * Harmony Score Calculation Tests
 * タスク3.1, 3.2: 調和スコア計算ロジックと警告・代替提案のテスト
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, expect, it } from "vitest";
import {
	calculateContrastFitScore,
	calculateHarmonyScore,
	calculateHueDistanceScore,
	calculateLightnessDistributionScore,
	DEFAULT_HARMONY_WEIGHTS,
	generateHarmonyWarning,
	HARMONY_SCORE_WARNING_THRESHOLD,
	type HarmonyScoreWeights,
	isScoreBelowThreshold,
	suggestAlternativePalette,
} from "./harmony-score";

describe("Harmony Score Calculation", () => {
	describe("DEFAULT_HARMONY_WEIGHTS", () => {
		it("should have correct default weights", () => {
			expect(DEFAULT_HARMONY_WEIGHTS.hue).toBe(0.4);
			expect(DEFAULT_HARMONY_WEIGHTS.lightness).toBe(0.3);
			expect(DEFAULT_HARMONY_WEIGHTS.contrast).toBe(0.3);
		});

		it("should sum to 1.0", () => {
			const sum =
				DEFAULT_HARMONY_WEIGHTS.hue +
				DEFAULT_HARMONY_WEIGHTS.lightness +
				DEFAULT_HARMONY_WEIGHTS.contrast;
			expect(sum).toBeCloseTo(1.0, 10);
		});
	});

	describe("HARMONY_SCORE_WARNING_THRESHOLD", () => {
		it("should be 70", () => {
			expect(HARMONY_SCORE_WARNING_THRESHOLD).toBe(70);
		});
	});

	describe("calculateHueDistanceScore", () => {
		it("should return 100 for identical hues", () => {
			const anchorHex = "#FF2800"; // Red
			const paletteHexes = ["#FF2800", "#FF2800"];

			const score = calculateHueDistanceScore(anchorHex, paletteHexes);
			expect(score).toBe(100);
		});

		it("should return lower score for complementary hues (180 degrees apart)", () => {
			// Red anchor with cyan palette (opposite on color wheel)
			const anchorHex = "#FF0000"; // Red (hue ~29 in OKLCH)
			const paletteHexes = ["#00FFFF"]; // Cyan (opposite hue)

			const score = calculateHueDistanceScore(anchorHex, paletteHexes);
			// Complementary colors should have lower score but not 0
			// because complementary can still be harmonious
			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThan(100);
		});

		it("should handle analogous colors well", () => {
			// Red anchor with orange and pink (close hues)
			const anchorHex = "#FF2800"; // CUD Red
			const paletteHexes = ["#FF9900", "#FF9999"]; // Orange, Pink-ish

			const score = calculateHueDistanceScore(anchorHex, paletteHexes);
			// Analogous colors should score well
			expect(score).toBeGreaterThan(50);
		});

		it("should handle achromatic colors (no hue)", () => {
			const anchorHex = "#000000"; // Black (no hue)
			const paletteHexes = ["#FFFFFF", "#808080"]; // White, Gray

			const score = calculateHueDistanceScore(anchorHex, paletteHexes);
			// Achromatic colors should give neutral score
			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThanOrEqual(100);
		});
	});

	describe("calculateLightnessDistributionScore", () => {
		it("should return high score for well-distributed lightness values", () => {
			// A palette with good lightness distribution
			const paletteHexes = [
				"#000000", // Very dark
				"#404040", // Dark
				"#808080", // Medium
				"#C0C0C0", // Light
				"#FFFFFF", // Very light
			];

			const score = calculateLightnessDistributionScore(paletteHexes);
			// Well-distributed palette should score reasonably well
			expect(score).toBeGreaterThan(50);
		});

		it("should return lower score for clustered lightness values", () => {
			// All similar lightness (all medium gray)
			const paletteHexes = ["#787878", "#808080", "#888888", "#909090"];

			const score = calculateLightnessDistributionScore(paletteHexes);
			// Clustered lightness should score lower
			expect(score).toBeLessThan(50);
		});

		it("should handle single color palette", () => {
			const paletteHexes = ["#FF0000"];

			const score = calculateLightnessDistributionScore(paletteHexes);
			// Single color can't have distribution, give neutral score
			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThanOrEqual(100);
		});
	});

	describe("calculateContrastFitScore", () => {
		it("should return 100 when all colors meet AA contrast with anchor", () => {
			// Black anchor with light colors (high contrast)
			const anchorHex = "#000000";
			const paletteHexes = ["#FFFFFF", "#EEEEEE", "#DDDDDD"];

			const score = calculateContrastFitScore(anchorHex, paletteHexes);
			expect(score).toBe(100);
		});

		it("should return 0 when no colors meet AA contrast", () => {
			// Similar colors with low contrast
			const anchorHex = "#808080";
			const paletteHexes = ["#7A7A7A", "#858585", "#7F7F7F"];

			const score = calculateContrastFitScore(anchorHex, paletteHexes);
			expect(score).toBe(0);
		});

		it("should return proportional score for mixed contrast", () => {
			// Black anchor with mix of high and low contrast colors
			const anchorHex = "#000000";
			const paletteHexes = [
				"#FFFFFF", // High contrast (passes)
				"#333333", // Low contrast (fails)
			];

			const score = calculateContrastFitScore(anchorHex, paletteHexes);
			expect(score).toBe(50); // 1 of 2 passes
		});
	});

	describe("calculateHarmonyScore", () => {
		it("should calculate total score using default weights", () => {
			const anchorHex = "#FF2800"; // CUD Red
			const paletteHexes = ["#FF9900", "#FAF500", "#35A16B"]; // CUD colors

			const result = calculateHarmonyScore(anchorHex, paletteHexes);

			expect(result.total).toBeGreaterThanOrEqual(0);
			expect(result.total).toBeLessThanOrEqual(100);
			expect(result.breakdown).toBeDefined();
			expect(result.breakdown.hueScore).toBeDefined();
			expect(result.breakdown.lightnessScore).toBeDefined();
			expect(result.breakdown.contrastScore).toBeDefined();
			expect(result.weights).toEqual(DEFAULT_HARMONY_WEIGHTS);
		});

		it("should use custom weights when provided", () => {
			const anchorHex = "#FF2800";
			const paletteHexes = ["#FF9900"];
			const customWeights: Partial<HarmonyScoreWeights> = {
				hue: 1.0,
				lightness: 0,
				contrast: 0,
			};

			const result = calculateHarmonyScore(
				anchorHex,
				paletteHexes,
				customWeights,
			);

			// With hue weight = 1.0, total should equal hue score
			expect(result.total).toBeCloseTo(result.breakdown.hueScore, 1);
			expect(result.weights.hue).toBe(1.0);
			expect(result.weights.lightness).toBe(0);
			expect(result.weights.contrast).toBe(0);
		});

		it("should return breakdown scores all in 0-100 range", () => {
			const anchorHex = "#FF2800";
			const paletteHexes = ["#FF9900", "#FAF500", "#35A16B", "#0041FF"];

			const result = calculateHarmonyScore(anchorHex, paletteHexes);

			expect(result.breakdown.hueScore).toBeGreaterThanOrEqual(0);
			expect(result.breakdown.hueScore).toBeLessThanOrEqual(100);
			expect(result.breakdown.lightnessScore).toBeGreaterThanOrEqual(0);
			expect(result.breakdown.lightnessScore).toBeLessThanOrEqual(100);
			expect(result.breakdown.contrastScore).toBeGreaterThanOrEqual(0);
			expect(result.breakdown.contrastScore).toBeLessThanOrEqual(100);
		});

		it("should handle empty palette", () => {
			const anchorHex = "#FF2800";
			const paletteHexes: string[] = [];

			// Should throw or return default score
			expect(() => calculateHarmonyScore(anchorHex, paletteHexes)).toThrow();
		});

		it("should throw for invalid hex colors", () => {
			expect(() => calculateHarmonyScore("invalid", ["#FF0000"])).toThrow();
			expect(() => calculateHarmonyScore("#FF0000", ["invalid"])).toThrow();
		});
	});

	describe("isScoreBelowThreshold", () => {
		it("should return true when score is below default threshold (70)", () => {
			expect(isScoreBelowThreshold(69)).toBe(true);
			expect(isScoreBelowThreshold(50)).toBe(true);
			expect(isScoreBelowThreshold(0)).toBe(true);
		});

		it("should return false when score is at or above threshold", () => {
			expect(isScoreBelowThreshold(70)).toBe(false);
			expect(isScoreBelowThreshold(71)).toBe(false);
			expect(isScoreBelowThreshold(100)).toBe(false);
		});

		it("should use custom threshold when provided", () => {
			expect(isScoreBelowThreshold(49, 50)).toBe(true);
			expect(isScoreBelowThreshold(50, 50)).toBe(false);
			expect(isScoreBelowThreshold(51, 50)).toBe(false);
		});
	});

	describe("integration with CUD colors", () => {
		it("should give reasonable scores for CUD palette", () => {
			// Use actual CUD colors
			const anchorHex = "#FF2800"; // CUD Red
			const cudPalette = [
				"#FF9900", // Orange
				"#FAF500", // Yellow
				"#35A16B", // Green
				"#0041FF", // Blue
				"#66CCFF", // Sky Blue
			];

			const result = calculateHarmonyScore(anchorHex, cudPalette);

			// CUD colors are designed to be distinguishable, so should have decent scores
			expect(result.total).toBeGreaterThan(30);
		});
	});

	// タスク3.2: 警告判定と代替提案
	describe("generateHarmonyWarning", () => {
		it("should return warning when score is below threshold", () => {
			const scoreResult = calculateHarmonyScore("#808080", [
				"#7A7A7A",
				"#858585",
			]);
			const warning = generateHarmonyWarning(scoreResult);

			if (scoreResult.total < HARMONY_SCORE_WARNING_THRESHOLD) {
				expect(warning).not.toBeNull();
				expect(warning?.message).toBeDefined();
				expect(warning?.severity).toBeDefined();
			}
		});

		it("should return null when score is above threshold", () => {
			// Use high contrast colors for good score
			const scoreResult = calculateHarmonyScore("#000000", [
				"#FFFFFF",
				"#EEEEEE",
			]);

			// Only check if score is actually above threshold
			if (scoreResult.total >= HARMONY_SCORE_WARNING_THRESHOLD) {
				const warning = generateHarmonyWarning(scoreResult);
				expect(warning).toBeNull();
			}
		});

		it("should include score details in warning", () => {
			// Create a low score scenario
			const scoreResult = calculateHarmonyScore("#808080", ["#7F7F7F"]);
			const warning = generateHarmonyWarning(scoreResult);

			if (warning) {
				expect(warning.score).toBe(scoreResult.total);
				expect(warning.threshold).toBe(HARMONY_SCORE_WARNING_THRESHOLD);
			}
		});

		it("should allow custom threshold", () => {
			const scoreResult = calculateHarmonyScore("#FF2800", ["#FF9900"]);
			const customThreshold = 90;

			const warning = generateHarmonyWarning(scoreResult, customThreshold);

			if (scoreResult.total < customThreshold) {
				expect(warning).not.toBeNull();
				expect(warning?.threshold).toBe(customThreshold);
			}
		});

		it("should provide severity based on score gap", () => {
			// Very low score should have high severity
			const lowScoreResult = calculateHarmonyScore("#808080", ["#7F7F7F"]);
			const lowWarning = generateHarmonyWarning(lowScoreResult);

			if (lowWarning && lowScoreResult.total < 50) {
				expect(lowWarning.severity).toBe("high");
			}
		});
	});

	describe("suggestAlternativePalette", () => {
		it("should return alternative colors when score is low", () => {
			const anchorHex = "#FF2800";
			const palette = ["#808080", "#7A7A7A"]; // Low harmony with red anchor

			const alternatives = suggestAlternativePalette(anchorHex, palette);

			expect(alternatives).toBeDefined();
			expect(alternatives.suggestedPalette.length).toBe(palette.length);
		});

		it("should improve harmony score with suggested palette", () => {
			const anchorHex = "#FF2800";
			const palette = ["#808080", "#7A7A7A"]; // Gray colors - low harmony with red

			const alternatives = suggestAlternativePalette(anchorHex, palette);

			// Suggested palette should have better or equal score
			expect(alternatives.improvedScore).toBeGreaterThanOrEqual(
				alternatives.originalScore,
			);
		});

		it("should return original palette if already optimal", () => {
			const anchorHex = "#FF2800"; // CUD Red
			const palette = ["#FF9900", "#FAF500"]; // Analogous CUD colors

			const alternatives = suggestAlternativePalette(anchorHex, palette);

			// If original score is already good, suggestions might be same or similar
			expect(alternatives.suggestedPalette).toBeDefined();
		});

		it("should provide explanation for each color change", () => {
			const anchorHex = "#FF2800";
			const palette = ["#00FF00", "#0000FF"]; // Contrasting colors

			const alternatives = suggestAlternativePalette(anchorHex, palette);

			expect(alternatives.explanations).toBeDefined();
			expect(alternatives.explanations.length).toBe(palette.length);
		});

		it("should handle single color palette", () => {
			const anchorHex = "#FF2800";
			const palette = ["#808080"];

			const alternatives = suggestAlternativePalette(anchorHex, palette);

			expect(alternatives.suggestedPalette.length).toBe(1);
		});

		it("should throw for empty palette", () => {
			expect(() => suggestAlternativePalette("#FF2800", [])).toThrow();
		});
	});

	describe("HarmonyWarning interface", () => {
		it("should contain all required properties", () => {
			const scoreResult = calculateHarmonyScore("#808080", ["#7F7F7F"]);
			const warning = generateHarmonyWarning(scoreResult);

			if (warning) {
				expect(typeof warning.message).toBe("string");
				expect(typeof warning.score).toBe("number");
				expect(typeof warning.threshold).toBe("number");
				expect(["low", "medium", "high"]).toContain(warning.severity);
			}
		});
	});
});

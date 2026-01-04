/**
 * HarmonyFilterCalculator Tests
 *
 * Task 3.1: HarmonyFilterCalculator の実装
 * Requirements: 3.1, 3.2
 */

import { describe, expect, it } from "bun:test";
import {
	calculateCircularDistance,
	getHarmonyTypes,
	getTargetHues,
	type HarmonyTypeDefinition,
	isWithinHarmonyRange,
} from "./harmony-filter-calculator";

describe("HarmonyFilterCalculator", () => {
	describe("getHarmonyTypes", () => {
		it("should return 5 harmony type definitions", () => {
			const types = getHarmonyTypes();
			expect(types.length).toBe(5);
		});

		it("should include all required harmony types", () => {
			const types = getHarmonyTypes();
			const ids = types.map((t) => t.id);
			expect(ids).toContain("all");
			expect(ids).toContain("complementary");
			expect(ids).toContain("triadic");
			expect(ids).toContain("analogous");
			expect(ids).toContain("split-complementary");
		});

		it('should have correct definitions for "all" type', () => {
			const types = getHarmonyTypes();
			const allType = types.find(
				(t) => t.id === "all",
			) as HarmonyTypeDefinition;
			expect(allType.nameJa).toBe("全候補");
			expect(allType.nameEn).toBe("All");
			expect(allType.hueOffsets).toEqual([]);
		});

		it('should have correct definitions for "complementary" type', () => {
			const types = getHarmonyTypes();
			const compType = types.find(
				(t) => t.id === "complementary",
			) as HarmonyTypeDefinition;
			expect(compType.nameJa).toBe("補色");
			expect(compType.nameEn).toBe("Complementary");
			expect(compType.hueOffsets).toEqual([180]);
		});

		it('should have correct definitions for "triadic" type', () => {
			const types = getHarmonyTypes();
			const triadicType = types.find(
				(t) => t.id === "triadic",
			) as HarmonyTypeDefinition;
			expect(triadicType.nameJa).toBe("トライアド");
			expect(triadicType.nameEn).toBe("Triadic");
			expect(triadicType.hueOffsets).toEqual([120, 240]);
		});

		it('should have correct definitions for "analogous" type', () => {
			const types = getHarmonyTypes();
			const analogousType = types.find(
				(t) => t.id === "analogous",
			) as HarmonyTypeDefinition;
			expect(analogousType.nameJa).toBe("類似色");
			expect(analogousType.nameEn).toBe("Analogous");
			expect(analogousType.hueOffsets).toEqual([-30, 30]);
		});

		it('should have correct definitions for "split-complementary" type', () => {
			const types = getHarmonyTypes();
			const splitCompType = types.find(
				(t) => t.id === "split-complementary",
			) as HarmonyTypeDefinition;
			expect(splitCompType.nameJa).toBe("分裂補色");
			expect(splitCompType.nameEn).toBe("Split Complementary");
			expect(splitCompType.hueOffsets).toEqual([150, 210]);
		});
	});

	describe("getTargetHues", () => {
		it('should return empty array for "all" type', () => {
			const result = getTargetHues(120, "all");
			expect(result).toEqual([]);
		});

		it('should return [300] for "complementary" type with brandHue=120', () => {
			const result = getTargetHues(120, "complementary");
			expect(result).toEqual([300]);
		});

		it('should return [0] for "complementary" type with brandHue=180', () => {
			const result = getTargetHues(180, "complementary");
			expect(result).toEqual([0]);
		});

		it('should handle hue wrap-around for "complementary" with brandHue=200', () => {
			// 200 + 180 = 380 -> 20
			const result = getTargetHues(200, "complementary");
			expect(result).toEqual([20]);
		});

		it('should return [240, 0] for "triadic" type with brandHue=120', () => {
			// 120 + 120 = 240, 120 + 240 = 360 -> 0
			const result = getTargetHues(120, "triadic");
			expect(result).toEqual([240, 0]);
		});

		it('should return [90, 150] for "analogous" type with brandHue=120', () => {
			// 120 - 30 = 90, 120 + 30 = 150
			const result = getTargetHues(120, "analogous");
			expect(result).toEqual([90, 150]);
		});

		it('should handle negative hue for "analogous" with brandHue=10', () => {
			// 10 - 30 = -20 -> 340, 10 + 30 = 40
			const result = getTargetHues(10, "analogous");
			expect(result).toEqual([340, 40]);
		});

		it('should return [270, 330] for "split-complementary" type with brandHue=120', () => {
			// 120 + 150 = 270, 120 + 210 = 330
			const result = getTargetHues(120, "split-complementary");
			expect(result).toEqual([270, 330]);
		});

		it('should handle wrap-around for "split-complementary" with brandHue=200', () => {
			// 200 + 150 = 350, 200 + 210 = 410 -> 50
			const result = getTargetHues(200, "split-complementary");
			expect(result).toEqual([350, 50]);
		});

		it("should handle 0 degree brandHue", () => {
			const result = getTargetHues(0, "complementary");
			expect(result).toEqual([180]);
		});

		it("should handle 360 degree brandHue (same as 0)", () => {
			const result = getTargetHues(360, "complementary");
			// 360 + 180 = 540 -> 180
			expect(result).toEqual([180]);
		});
	});

	describe("calculateCircularDistance", () => {
		it("should return 0 for same hue", () => {
			expect(calculateCircularDistance(120, 120)).toBe(0);
		});

		it("should return 30 for hues 30 degrees apart", () => {
			expect(calculateCircularDistance(120, 150)).toBe(30);
		});

		it("should return 30 for hues -30 degrees apart", () => {
			expect(calculateCircularDistance(150, 120)).toBe(30);
		});

		it("should return 180 for opposite hues", () => {
			expect(calculateCircularDistance(0, 180)).toBe(180);
		});

		it("should use shortest path across 0/360 boundary", () => {
			// Distance between 350 and 10 should be 20, not 340
			expect(calculateCircularDistance(350, 10)).toBe(20);
		});

		it("should handle boundary case at 0", () => {
			expect(calculateCircularDistance(0, 350)).toBe(10);
		});

		it("should handle exact 360 degree difference", () => {
			expect(calculateCircularDistance(0, 360)).toBe(0);
		});

		it("should handle hue values > 360", () => {
			// Normalize before calculation
			expect(calculateCircularDistance(370, 10)).toBe(0);
		});

		it("should handle negative hue values", () => {
			// -10 should be normalized to 350
			expect(calculateCircularDistance(-10, 350)).toBe(0);
		});
	});

	describe("isWithinHarmonyRange", () => {
		it("should return true for exact match", () => {
			expect(isWithinHarmonyRange(180, [180])).toBe(true);
		});

		it("should return true for candidate within ±30°", () => {
			expect(isWithinHarmonyRange(200, [180])).toBe(true);
			expect(isWithinHarmonyRange(160, [180])).toBe(true);
		});

		it("should return true for candidate exactly at ±30° boundary", () => {
			expect(isWithinHarmonyRange(210, [180])).toBe(true);
			expect(isWithinHarmonyRange(150, [180])).toBe(true);
		});

		it("should return false for candidate outside ±30°", () => {
			expect(isWithinHarmonyRange(220, [180])).toBe(false);
			expect(isWithinHarmonyRange(140, [180])).toBe(false);
		});

		it("should work across 0/360 boundary", () => {
			// Target hue is 350, candidate is 10 (distance is 20)
			expect(isWithinHarmonyRange(10, [350])).toBe(true);
			// Target hue is 10, candidate is 350 (distance is 20)
			expect(isWithinHarmonyRange(350, [10])).toBe(true);
		});

		it("should return true if within any target hue for multiple targets", () => {
			// Triadic: targetHues = [120, 240]
			expect(isWithinHarmonyRange(110, [120, 240])).toBe(true);
			expect(isWithinHarmonyRange(250, [120, 240])).toBe(true);
		});

		it("should return false if not within any target hue for multiple targets", () => {
			// Triadic: targetHues = [120, 240]
			// Candidate 180 is 60 degrees from both
			expect(isWithinHarmonyRange(180, [120, 240])).toBe(false);
		});

		it("should return false for empty target hues array", () => {
			expect(isWithinHarmonyRange(180, [])).toBe(false);
		});
	});
});

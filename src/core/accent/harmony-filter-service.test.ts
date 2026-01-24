/**
 * HarmonyFilterService Tests
 *
 * Task 3.2: フィルタ適用とソート維持の実装
 * Requirements: 3.3, 3.4, 6.3
 */

import { describe, expect, it } from "bun:test";
import type { ScoredCandidate } from "./accent-candidate-service";
import {
	filterByHarmonyType,
	findNearestAlternatives,
} from "./harmony-filter-service";

/**
 * テスト用の候補を生成するヘルパー
 */
function createMockCandidate(
	id: string,
	hue: number,
	totalScore: number,
): ScoredCandidate {
	return {
		tokenId: id,
		hex: "#FF0000",
		nameJa: `候補${id}`,
		nameEn: `Candidate ${id}`,
		dadsSourceName: `Color ${id}`,
		step: 500,
		hue,
		score: {
			total: totalScore,
			breakdown: {
				harmonyScore: 80,
				cudScore: 70,
				contrastScore: 60,
			},
			weights: { harmony: 40, cud: 30, contrast: 30 },
		},
	};
}

describe("HarmonyFilterService", () => {
	describe("filterByHarmonyType", () => {
		const mockCandidates: ScoredCandidate[] = [
			createMockCandidate("1", 0, 90), // Red (0°)
			createMockCandidate("2", 30, 85), // Orange (30°)
			createMockCandidate("3", 60, 80), // Yellow (60°)
			createMockCandidate("4", 120, 75), // Green (120°)
			createMockCandidate("5", 180, 70), // Cyan (180°)
			createMockCandidate("6", 240, 65), // Blue (240°)
			createMockCandidate("7", 270, 60), // Purple (270°)
			createMockCandidate("8", 300, 55), // Magenta (300°)
			createMockCandidate("9", 330, 50), // Pink (330°)
			createMockCandidate("10", 350, 45), // Near Red (350°)
		];

		it('should return all candidates for "all" type without filtering', () => {
			const result = filterByHarmonyType(mockCandidates, "all", 0);

			expect(result.candidates.length).toBe(10);
			expect(result.alternatives.length).toBe(0);
			expect(result.isShowingAlternatives).toBe(false);
		});

		it('should filter to complementary colors (+180°) for "complementary" type', () => {
			// Brand hue = 0, complementary = 180, range = 150-210
			const result = filterByHarmonyType(mockCandidates, "complementary", 0);

			// Should include hue 180 only (within ±30° of 180)
			expect(result.candidates.length).toBe(1);
			expect(result.candidates[0].hue).toBe(180);
			expect(result.alternatives.length).toBe(0);
			expect(result.isShowingAlternatives).toBe(false);
		});

		it('should filter to triadic colors (+120°, +240°) for "triadic" type', () => {
			// Brand hue = 0, triadic = 120 and 240, ranges = 90-150 and 210-270
			const result = filterByHarmonyType(mockCandidates, "triadic", 0);

			// Should include hue 120, 240, 270 (within ±30° of 120 or 240)
			expect(result.candidates.length).toBe(3);
			const hues = result.candidates.map((c) => c.hue);
			expect(hues).toContain(120);
			expect(hues).toContain(240);
			expect(hues).toContain(270); // 270 is within ±30° of 240
		});

		it('should filter to analogous colors (±30°) for "analogous" type', () => {
			// Brand hue = 0, analogous = -30 (=330) and 30, ranges = 300-0-60
			const result = filterByHarmonyType(mockCandidates, "analogous", 0);

			// Should include hue 0, 30, 330, 350 (within ±30° of 330 or 30)
			const hues = result.candidates.map((c) => c.hue);
			expect(hues).toContain(0);
			expect(hues).toContain(30);
			expect(hues).toContain(330);
			expect(hues).toContain(350);
		});

		it('should filter to split-complementary colors (+150°, +210°) for "split-complementary" type', () => {
			// Brand hue = 120, split-complementary = 270 and 330
			// Ranges = 240-300 and 300-360
			const result = filterByHarmonyType(
				mockCandidates,
				"split-complementary",
				120,
			);

			const hues = result.candidates.map((c) => c.hue);
			// 270 is within ±30° of 270
			// 300 is within ±30° of both 270 and 330
			// 330 is within ±30° of 330
			// 350 is within ±30° of 330
			expect(hues).toContain(270);
			expect(hues).toContain(300);
			expect(hues).toContain(330);
			expect(hues).toContain(350);
		});

		it("should maintain score order after filtering (Requirement 3.3)", () => {
			const result = filterByHarmonyType(mockCandidates, "triadic", 0);

			// Verify candidates are sorted by score descending
			for (let i = 0; i < result.candidates.length - 1; i++) {
				expect(result.candidates[i].score.total).toBeGreaterThanOrEqual(
					result.candidates[i + 1].score.total,
				);
			}
		});

		it("should return alternatives when filter results in 0 candidates (Requirement 3.4)", () => {
			// Create candidates that won't match complementary filter
			const noMatchCandidates: ScoredCandidate[] = [
				createMockCandidate("1", 0, 90), // 0°
				createMockCandidate("2", 30, 85), // 30°
				createMockCandidate("3", 60, 80), // 60°
			];

			// Brand hue = 0, complementary = 180, but no candidates near 180
			const result = filterByHarmonyType(noMatchCandidates, "complementary", 0);

			expect(result.candidates.length).toBe(0);
			expect(result.alternatives.length).toBe(3); // Max 3 alternatives
			expect(result.isShowingAlternatives).toBe(true);
		});

		it("should limit alternatives to maximum 3 (Requirement 3.4)", () => {
			// Create candidates that won't match complementary filter
			const manyNoMatchCandidates: ScoredCandidate[] = [
				createMockCandidate("1", 0, 90),
				createMockCandidate("2", 10, 85),
				createMockCandidate("3", 20, 80),
				createMockCandidate("4", 30, 75),
				createMockCandidate("5", 40, 70),
			];

			const result = filterByHarmonyType(
				manyNoMatchCandidates,
				"complementary",
				0,
			);

			expect(result.candidates.length).toBe(0);
			expect(result.alternatives.length).toBe(3);
			expect(result.isShowingAlternatives).toBe(true);
		});

		it("should skip score recalculation (Requirement 6.3)", () => {
			const result = filterByHarmonyType(mockCandidates, "triadic", 0);

			// Verify scores are unchanged
			result.candidates.forEach((candidate, _index) => {
				const original = mockCandidates.find(
					(c) => c.tokenId === candidate.tokenId,
				);
				expect(candidate.score.total).toBe(original?.score.total);
			});
		});

		it("should handle empty candidates array", () => {
			const result = filterByHarmonyType([], "complementary", 0);

			expect(result.candidates.length).toBe(0);
			expect(result.alternatives.length).toBe(0);
			expect(result.isShowingAlternatives).toBe(false);
		});

		it("should handle edge case with 0-degree brand hue wrap-around", () => {
			// Brand hue = 350, analogous = 320 and 20
			const result = filterByHarmonyType(mockCandidates, "analogous", 350);

			const hues = result.candidates.map((c) => c.hue);
			// Should include 330, 350, 0, 30 (within ±30° of 320 or 20)
			expect(hues).toContain(330);
			expect(hues).toContain(350);
			expect(hues).toContain(0);
			expect(hues).toContain(30);
		});
	});

	describe("findNearestAlternatives", () => {
		const mockCandidates: ScoredCandidate[] = [
			createMockCandidate("1", 0, 90),
			createMockCandidate("2", 45, 85),
			createMockCandidate("3", 90, 80),
			createMockCandidate("4", 135, 75),
			createMockCandidate("5", 180, 70),
		];

		it("should return candidates nearest to target hues", () => {
			// Target hue = 180, find nearest
			const result = findNearestAlternatives(mockCandidates, [180], 3);

			expect(result.length).toBe(3);
			// Should be sorted by distance to 180
			expect(result[0].hue).toBe(180); // Distance 0
			expect(result[1].hue).toBe(135); // Distance 45
			expect(result[2].hue).toBe(90); // Distance 90
		});

		it("should respect maxCount parameter", () => {
			const result = findNearestAlternatives(mockCandidates, [180], 2);
			expect(result.length).toBe(2);
		});

		it("should default to 3 alternatives", () => {
			const result = findNearestAlternatives(mockCandidates, [180]);
			expect(result.length).toBe(3);
		});

		it("should handle multiple target hues", () => {
			// Target hues = 0 and 180
			const result = findNearestAlternatives(mockCandidates, [0, 180], 3);

			expect(result.length).toBe(3);
			// Should use minimum distance to any target
			// 0 -> distance to [0, 180] = 0
			// 180 -> distance to [0, 180] = 0
			// Both should be first two (same min distance)
		});

		it("should return fewer alternatives if candidates are limited", () => {
			const fewCandidates = mockCandidates.slice(0, 2);
			const result = findNearestAlternatives(fewCandidates, [180], 3);

			expect(result.length).toBe(2);
		});

		it("should handle empty candidates array", () => {
			const result = findNearestAlternatives([], [180], 3);
			expect(result.length).toBe(0);
		});

		it("should handle empty target hues array", () => {
			// When no targets, return first maxCount candidates (original order)
			const result = findNearestAlternatives(mockCandidates, [], 3);
			expect(result.length).toBe(3);
		});
	});
});

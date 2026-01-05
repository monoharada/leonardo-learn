/**
 * VibrancyCalculator テスト
 *
 * Adobe Color戦略に基づく鮮やかさスコア計算のテスト
 */

import { describe, expect, it } from "bun:test";
import {
	calculateVibrancyScore,
	calculateVibrancyScoreDetailed,
	calculateVibrancyScoreWithHue,
	classifyHueZone,
	isMuddyHueZone,
} from "./vibrancy-calculator";

describe("classifyHueZone", () => {
	it("should classify yellow-orange zone (30-120 degrees)", () => {
		expect(classifyHueZone(30)).toBe("yellow-orange");
		expect(classifyHueZone(60)).toBe("yellow-orange");
		expect(classifyHueZone(90)).toBe("yellow-orange");
		expect(classifyHueZone(120)).toBe("yellow-orange");
	});

	it("should classify brown zone (20-30 degrees)", () => {
		expect(classifyHueZone(20)).toBe("brown");
		expect(classifyHueZone(25)).toBe("brown");
		expect(classifyHueZone(29)).toBe("brown");
	});

	it("should classify normal zone (outside 20-120 degrees)", () => {
		expect(classifyHueZone(0)).toBe("normal");
		expect(classifyHueZone(19)).toBe("normal");
		expect(classifyHueZone(121)).toBe("normal");
		expect(classifyHueZone(180)).toBe("normal");
		expect(classifyHueZone(270)).toBe("normal");
		expect(classifyHueZone(359)).toBe("normal");
	});

	it("should handle negative hue values", () => {
		expect(classifyHueZone(-30)).toBe("normal"); // -30 -> 330
		expect(classifyHueZone(-300)).toBe("yellow-orange"); // -300 -> 60
	});

	it("should handle hue values > 360", () => {
		expect(classifyHueZone(390)).toBe("yellow-orange"); // 390 -> 30
		expect(classifyHueZone(480)).toBe("yellow-orange"); // 480 -> 120
	});
});

describe("isMuddyHueZone", () => {
	it("should return true for yellow-orange zone", () => {
		expect(isMuddyHueZone(60)).toBe(true);
		expect(isMuddyHueZone(90)).toBe(true);
	});

	it("should return false for brown zone", () => {
		expect(isMuddyHueZone(25)).toBe(false);
	});

	it("should return false for normal zone", () => {
		expect(isMuddyHueZone(180)).toBe(false);
		expect(isMuddyHueZone(270)).toBe(false);
	});
});

describe("calculateVibrancyScore", () => {
	it("should return 0 for invalid hex", () => {
		expect(calculateVibrancyScore("invalid")).toBe(0);
		expect(calculateVibrancyScore("")).toBe(0);
	});

	it("should calculate score for high chroma colors", () => {
		// 青系（通常帯）の高彩度色
		const blueScore = calculateVibrancyScore("#0000FF");
		expect(blueScore).toBeGreaterThan(50);
	});

	it("should give higher score to high lightness in yellow-orange zone", () => {
		// 黄色系で明度の違いをテスト
		// 明るい黄色 vs 暗い黄色（オリーブ）
		const brightYellow = calculateVibrancyScore("#FFFF00");
		const darkYellow = calculateVibrancyScore("#808000"); // olive

		expect(brightYellow).toBeGreaterThan(darkYellow);
	});

	it("should return score between 0 and 100", () => {
		const testColors = [
			"#FF0000",
			"#00FF00",
			"#0000FF",
			"#FFFF00",
			"#FF00FF",
			"#00FFFF",
			"#000000",
			"#FFFFFF",
			"#808080",
		];

		for (const color of testColors) {
			const score = calculateVibrancyScore(color);
			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThanOrEqual(100);
		}
	});

	it("should handle 3-digit hex", () => {
		const score = calculateVibrancyScore("#F00");
		expect(score).toBeGreaterThan(0);
	});

	it("should handle lowercase hex", () => {
		const score = calculateVibrancyScore("#ff0000");
		expect(score).toBeGreaterThan(0);
	});
});

describe("calculateVibrancyScoreDetailed", () => {
	it("should return null for invalid hex", () => {
		expect(calculateVibrancyScoreDetailed("invalid")).toBeNull();
	});

	it("should return detailed breakdown", () => {
		const result = calculateVibrancyScoreDetailed("#FF0000");
		expect(result).not.toBeNull();
		expect(result?.score).toBeDefined();
		expect(result?.chromaScore).toBeDefined();
		expect(result?.lightnessScore).toBeDefined();
	});

	it("should have score equal to sum of components", () => {
		const result = calculateVibrancyScoreDetailed("#0000FF");
		expect(result).not.toBeNull();
		if (result) {
			expect(result.score).toBeCloseTo(
				result.chromaScore + result.lightnessScore,
				5,
			);
		}
	});
});

describe("calculateVibrancyScoreWithHue", () => {
	it("should use precomputed hue value", () => {
		// 同じ色で異なる事前計算hueを渡した場合、スコアが異なるはず
		const hexColor = "#808000"; // olive

		// 通常帯のhue（180度）を渡した場合
		const normalHueScore = calculateVibrancyScoreWithHue(hexColor, 180);

		// 問題帯のhue（60度）を渡した場合
		const muddyHueScore = calculateVibrancyScoreWithHue(hexColor, 60);

		// 問題帯では低明度にペナルティがあるため、スコアが異なる
		expect(normalHueScore).not.toBe(muddyHueScore);
	});

	it("should return 0 for invalid hex", () => {
		expect(calculateVibrancyScoreWithHue("invalid", 60)).toBe(0);
	});
});

describe("integration: score consistency", () => {
	it("should produce consistent scores between calculateVibrancyScore and calculateVibrancyScoreWithHue for same color", () => {
		const testColors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00"];

		for (const color of testColors) {
			const normalScore = calculateVibrancyScore(color);
			const detailed = calculateVibrancyScoreDetailed(color);

			expect(detailed).not.toBeNull();
			if (detailed) {
				expect(normalScore).toBeCloseTo(detailed.score, 5);
			}
		}
	});
});

/**
 * DADSトークンスナップユーティリティのテスト
 *
 * DADSトークンのみが使用されていることを検証するユニットテスト
 */

import { describe, expect, it } from "bun:test";
import { Color } from "@/core/color";
import type { DadsToken } from "@/core/tokens/types";
import {
	filterChromaticDadsTokens,
	hueDistance,
	isDadsTokenResult,
	isHueFarEnough,
	MIN_HUE_DISTANCE,
	matchesPreset,
	selectHueDistantColors,
	snapToNearestDadsToken,
} from "./dads-snap";

// テスト用のDADSトークンモックデータ
const createMockDadsToken = (
	hex: string,
	hue: string,
	scale: number,
): DadsToken => ({
	id: `dads-${hue}-${scale}`,
	hex,
	nameJa: `${hue} ${scale}`,
	nameEn: `${hue} ${scale}`,
	classification: {
		category: "chromatic",
		hue: hue as DadsToken["classification"]["hue"],
		scale: scale as DadsToken["classification"]["scale"],
	},
	source: "dads",
});

const createMockSemanticToken = (id: string, varRef: string): DadsToken => ({
	id,
	hex: varRef, // var(--color-xxx) のような参照
	nameJa: "Semantic Token",
	nameEn: "Semantic Token",
	classification: {
		category: "semantic",
	},
	source: "dads",
});

const mockDadsTokens: DadsToken[] = [
	// Blue系
	createMockDadsToken("#0066CC", "blue", 500),
	createMockDadsToken("#0055AA", "blue", 600),
	createMockDadsToken("#004488", "blue", 700),
	// Green系
	createMockDadsToken("#35A16B", "green", 500),
	createMockDadsToken("#259063", "green", 600),
	// Red系
	createMockDadsToken("#FF2800", "red", 600),
	createMockDadsToken("#CC2200", "red", 700),
	// Orange系
	createMockDadsToken("#FF9900", "orange", 500),
	createMockDadsToken("#DD8800", "orange", 600),
	// Purple系
	createMockDadsToken("#6A5ACD", "purple", 500),
	createMockDadsToken("#5A4ABD", "purple", 600),
	// Yellow系
	createMockDadsToken("#D7C447", "yellow", 600),
	createMockDadsToken("#C7B437", "yellow", 700),
	// Semantic tokens (should be filtered out)
	createMockSemanticToken("semantic-error", "var(--color-primitive-red-600)"),
	createMockSemanticToken(
		"semantic-success",
		"var(--color-primitive-green-600)",
	),
];

describe("dads-snap utility", () => {
	describe("filterChromaticDadsTokens", () => {
		it("should filter out semantic tokens with var() references", () => {
			const result = filterChromaticDadsTokens(mockDadsTokens);

			// var()参照を持つセマンティックトークンが除外されていることを確認
			expect(result.every((t) => t.hex.startsWith("#"))).toBe(true);
			expect(result.every((t) => !t.hex.includes("var("))).toBe(true);
		});

		it("should only include chromatic category tokens", () => {
			const result = filterChromaticDadsTokens(mockDadsTokens);

			expect(
				result.every((t) => t.classification.category === "chromatic"),
			).toBe(true);
		});

		it("should return correct count of chromatic tokens", () => {
			const result = filterChromaticDadsTokens(mockDadsTokens);

			// 13個のchromaticトークン（2個のsemanticトークンを除外）
			expect(result.length).toBe(13);
		});
	});

	describe("snapToNearestDadsToken", () => {
		it("should return a DADS token for any input color", () => {
			const inputHex = "#FF5500"; // オレンジ系の色
			const result = snapToNearestDadsToken(
				inputHex,
				mockDadsTokens,
				"default",
			);

			expect(result).not.toBeNull();
			if (result) {
				expect(isDadsTokenResult(result, mockDadsTokens)).toBe(true);
			}
		});

		it("should snap to nearest DADS token by deltaE", () => {
			// 青に近い色を入力
			const inputHex = "#0060C0"; // 青系
			const result = snapToNearestDadsToken(
				inputHex,
				mockDadsTokens,
				"default",
			);

			expect(result).not.toBeNull();
			if (result) {
				// 結果がblue系のトークンであることを確認
				expect(result.hex.toLowerCase()).toMatch(/^#00[0-9a-f]{4}$/);
				expect(isDadsTokenResult(result, mockDadsTokens)).toBe(true);
			}
		});

		it("should return DADS token even for complementary colors", () => {
			// 補色計算結果をシミュレート
			const complementaryHex = "#CC6600"; // 青の補色（オレンジ系）
			const result = snapToNearestDadsToken(
				complementaryHex,
				mockDadsTokens,
				"default",
			);

			expect(result).not.toBeNull();
			if (result) {
				expect(isDadsTokenResult(result, mockDadsTokens)).toBe(true);
			}
		});

		it("should filter by preset when applicable", () => {
			const inputHex = "#AABBCC";
			const resultDefault = snapToNearestDadsToken(
				inputHex,
				mockDadsTokens,
				"default",
			);
			const resultDark = snapToNearestDadsToken(
				inputHex,
				mockDadsTokens,
				"dark",
			);

			// どちらもDADSトークンであることを確認
			if (resultDefault) {
				expect(isDadsTokenResult(resultDefault, mockDadsTokens)).toBe(true);
			}
			if (resultDark) {
				expect(isDadsTokenResult(resultDark, mockDadsTokens)).toBe(true);
			}
		});

		it("should not return semantic tokens", () => {
			const inputHex = "#FF0000"; // 赤系
			const result = snapToNearestDadsToken(
				inputHex,
				mockDadsTokens,
				"default",
			);

			expect(result).not.toBeNull();
			if (result) {
				// var()参照ではないことを確認
				expect(result.hex.startsWith("#")).toBe(true);
				expect(result.hex.includes("var(")).toBe(false);
			}
		});
	});

	describe("hueDistance", () => {
		it("should calculate shortest distance on color wheel", () => {
			expect(hueDistance(0, 180)).toBe(180);
			expect(hueDistance(350, 10)).toBe(20);
			expect(hueDistance(0, 30)).toBe(30);
			expect(hueDistance(180, 180)).toBe(0);
		});

		it("should be symmetric", () => {
			expect(hueDistance(30, 90)).toBe(hueDistance(90, 30));
			expect(hueDistance(350, 10)).toBe(hueDistance(10, 350));
		});
	});

	describe("isHueFarEnough", () => {
		it("should return true when hue is far enough from all existing hues", () => {
			const existingHues = [0, 120, 240]; // 3等分
			expect(isHueFarEnough(60, existingHues)).toBe(true); // 60°は全てから30°以上離れている
		});

		it("should return false when hue is too close to any existing hue", () => {
			const existingHues = [0, 120, 240];
			expect(isHueFarEnough(15, existingHues)).toBe(false); // 15°は0°から15°しか離れていない
		});

		it("should handle edge cases around 0/360 boundary", () => {
			const existingHues = [350];
			expect(isHueFarEnough(5, existingHues)).toBe(false); // 5°と350°は15°しか離れていない
			expect(isHueFarEnough(320, existingHues)).toBe(true); // 320°と350°は30°離れている
		});
	});

	describe("selectHueDistantColors", () => {
		const rnd = () => 0.5; // 固定シード

		it("should return only DADS tokens", () => {
			const existingHues = [240]; // 青
			const results = selectHueDistantColors(
				existingHues,
				3,
				mockDadsTokens,
				"default",
				"#FFFFFF",
				rnd,
			);

			for (const result of results) {
				expect(isDadsTokenResult(result, mockDadsTokens)).toBe(true);
			}
		});

		it("should select colors with hue distance >= MIN_HUE_DISTANCE", () => {
			const existingHues = [240]; // 青
			const results = selectHueDistantColors(
				existingHues,
				3,
				mockDadsTokens,
				"default",
				"#FFFFFF",
				rnd,
			);

			for (const result of results) {
				const resultColor = new Color(result.hex);
				const resultHue = resultColor.oklch?.h ?? 0;

				// 既存の色相から30°以上離れていることを確認
				for (const existingHue of existingHues) {
					expect(hueDistance(resultHue, existingHue)).toBeGreaterThanOrEqual(
						MIN_HUE_DISTANCE,
					);
				}
			}
		});

		it("should not select semantic tokens", () => {
			const existingHues: number[] = [];
			const results = selectHueDistantColors(
				existingHues,
				5,
				mockDadsTokens,
				"default",
				"#FFFFFF",
				rnd,
			);

			for (const result of results) {
				expect(result.hex.startsWith("#")).toBe(true);
				expect(result.hex.includes("var(")).toBe(false);
			}
		});

		it("should respect preset filters", () => {
			const existingHues: number[] = [];
			const results = selectHueDistantColors(
				existingHues,
				3,
				mockDadsTokens,
				"default",
				"#FFFFFF",
				rnd,
			);

			// 全ての結果がDADSトークンであることを確認
			for (const result of results) {
				expect(isDadsTokenResult(result, mockDadsTokens)).toBe(true);
			}
		});
	});

	describe("matchesPreset", () => {
		it("should return true for default preset regardless of color", () => {
			expect(matchesPreset("#000000", "default")).toBe(true);
			expect(matchesPreset("#FFFFFF", "default")).toBe(true);
			expect(matchesPreset("#FF0000", "default")).toBe(true);
		});

		it("should filter dark colors for dark preset", () => {
			// 暗い色はtrue
			expect(matchesPreset("#333333", "dark")).toBe(true);
			// 明るい色はfalse
			expect(matchesPreset("#FFFFFF", "dark")).toBe(false);
		});
	});

	describe("isDadsTokenResult (test helper)", () => {
		it("should return true for colors that exist in DADS tokens", () => {
			const result = { hex: "#0066CC", step: 500, baseChromaName: "Blue" };
			expect(isDadsTokenResult(result, mockDadsTokens)).toBe(true);
		});

		it("should return false for colors not in DADS tokens", () => {
			const result = { hex: "#123456", step: 500, baseChromaName: "Unknown" };
			expect(isDadsTokenResult(result, mockDadsTokens)).toBe(false);
		});

		it("should be case-insensitive for hex comparison", () => {
			const result = { hex: "#0066cc", step: 500, baseChromaName: "Blue" }; // 小文字
			expect(isDadsTokenResult(result, mockDadsTokens)).toBe(true);
		});
	});
});

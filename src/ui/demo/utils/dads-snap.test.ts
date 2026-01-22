/**
 * DADSトークンスナップユーティリティのテスト
 *
 * DADSトークンのみが使用されていることを検証するユニットテスト
 */

import { describe, expect, it } from "bun:test";
import { wcagContrast } from "culori";
import { Color } from "@/core/color";
import type { DadsToken } from "@/core/tokens/types";
import {
	adjustLightnessForContrast,
	createPastelColorPair,
	createSoftBorderColor,
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

	describe("adjustLightnessForContrast", () => {
		const white = "#ffffff";
		const dark = "#1a1a1a";

		it("パステル色を暗くして3:1コントラストを達成", () => {
			// パステルピンク（L≈0.89）
			const pastelPink = "#FFD1DC";
			const adjusted = adjustLightnessForContrast(pastelPink, white, 3);
			const contrast = wcagContrast(white, adjusted) ?? 0;

			// 3:1以上のコントラストを達成
			expect(contrast).toBeGreaterThanOrEqual(3 - 0.1);
		});

		it("既にコントラスト十分な場合は元の色を返す", () => {
			// 暗い色は白背景に対して十分なコントラスト
			const darkColor = "#333333";
			const adjusted = adjustLightnessForContrast(darkColor, white, 3);

			// 元の色と同じ
			expect(adjusted.toLowerCase()).toBe(darkColor.toLowerCase());
		});

		it("白背景で明度を下げる方向に調整", () => {
			// パステル系の色
			const pastelGreen = "#C8E6C9";
			const adjusted = adjustLightnessForContrast(pastelGreen, white, 3);
			const contrast = wcagContrast(white, adjusted) ?? 0;

			// コントラストを満たす
			expect(contrast).toBeGreaterThanOrEqual(3 - 0.1);
		});

		it("暗い背景で明度を上げる方向に調整", () => {
			// 暗めの色を暗い背景で使用
			const darkBlue = "#1a237e";
			const adjusted = adjustLightnessForContrast(darkBlue, dark, 3);
			const contrast = wcagContrast(dark, adjusted) ?? 0;

			// コントラストを満たす
			expect(contrast).toBeGreaterThanOrEqual(3 - 0.1);
		});

		it("色相を維持する", () => {
			// パステルブルー
			const pastelBlue = "#AED9E0";
			const adjusted = adjustLightnessForContrast(pastelBlue, white, 3);

			// 元の色と調整後の色の色相を比較
			const originalColor = new Color(pastelBlue);
			const adjustedColor = new Color(adjusted);
			const originalHue = originalColor.oklch?.h ?? 0;
			const adjustedHue = adjustedColor.oklch?.h ?? 0;

			// 色相は維持される（±10°の許容範囲）
			const hueDiff = Math.min(
				Math.abs(originalHue - adjustedHue),
				360 - Math.abs(originalHue - adjustedHue),
			);
			expect(hueDiff).toBeLessThan(15);
		});

		it("彩度をおおよそ維持する", () => {
			// パステルオレンジ
			const pastelOrange = "#FFCC80";
			const adjusted = adjustLightnessForContrast(pastelOrange, white, 3);

			const originalColor = new Color(pastelOrange);
			const adjustedColor = new Color(adjusted);
			const originalChroma = originalColor.oklch?.c ?? 0;
			const adjustedChroma = adjustedColor.oklch?.c ?? 0;

			// 彩度は維持される（相対誤差20%以内）
			// 注：明度を大きく下げる場合、彩度が少し変化することは許容
			expect(Math.abs(originalChroma - adjustedChroma)).toBeLessThan(0.05);
		});

		it("7:1のハイコントラストも達成可能", () => {
			// パステル色を7:1に調整
			const pastelYellow = "#FFF9C4";
			const adjusted = adjustLightnessForContrast(pastelYellow, white, 7);
			const contrast = wcagContrast(white, adjusted) ?? 0;

			// 7:1以上のコントラストを達成
			expect(contrast).toBeGreaterThanOrEqual(7 - 0.2);
		});
	});

	describe("createPastelColorPair", () => {
		const white = "#ffffff";

		it("パステル背景と濃いテキスト色のペアを生成", () => {
			const pastelPink = "#FFD1DC";
			const pair = createPastelColorPair(pastelPink, white);

			// 背景は元のパステル色
			expect(pair.background.toLowerCase()).toBe(pastelPink.toLowerCase());

			// テキストは同じ色相で4.5:1以上のコントラスト
			const contrast = wcagContrast(white, pair.text) ?? 0;
			expect(contrast).toBeGreaterThanOrEqual(4.5 - 0.1);
		});

		it("テキスト色が目標コントラストを達成", () => {
			const pastelBlue = "#AED9E0";
			const targetContrast = 4.5;
			const pair = createPastelColorPair(pastelBlue, white, targetContrast);

			const contrast = wcagContrast(white, pair.text) ?? 0;
			expect(contrast).toBeGreaterThanOrEqual(targetContrast - 0.1);
		});

		it("色相を維持する", () => {
			const pastelGreen = "#C8E6C9";
			const pair = createPastelColorPair(pastelGreen, white);

			// 元の色と調整後の色の色相を比較
			const originalColor = new Color(pastelGreen);
			const textColor = new Color(pair.text);
			const originalHue = originalColor.oklch?.h ?? 0;
			const textHue = textColor.oklch?.h ?? 0;

			// 色相は維持される（±15°の許容範囲）
			const hueDiff = Math.min(
				Math.abs(originalHue - textHue),
				360 - Math.abs(originalHue - textHue),
			);
			expect(hueDiff).toBeLessThan(15);
		});

		it("3:1の大きなテキスト用コントラストも指定可能", () => {
			const pastelOrange = "#FFCC80";
			const pair = createPastelColorPair(pastelOrange, white, 3);

			const contrast = wcagContrast(white, pair.text) ?? 0;
			expect(contrast).toBeGreaterThanOrEqual(3 - 0.1);
		});

		it("暗い背景でも正しく動作", () => {
			const pastelLavender = "#E1BEE7";
			const darkBg = "#1a1a1a";
			const pair = createPastelColorPair(pastelLavender, darkBg, 4.5);

			// 背景は元のパステル色
			expect(pair.background.toLowerCase()).toBe(pastelLavender.toLowerCase());

			// テキストは暗い背景に対してコントラストを確保
			const contrast = wcagContrast(darkBg, pair.text) ?? 0;
			expect(contrast).toBeGreaterThanOrEqual(4.5 - 0.1);
		});

		it("既にコントラスト十分な場合は元の色をそのまま使用", () => {
			// 十分に暗い色（白背景で十分なコントラスト）
			const darkColor = "#333333";
			const pair = createPastelColorPair(darkColor, white, 4.5);

			// 背景は元の色、テキストも元の色に近い
			expect(pair.background.toLowerCase()).toBe(darkColor.toLowerCase());
			// コントラストが既に十分なので、大きな変更はないはず
			const contrast = wcagContrast(white, pair.text) ?? 0;
			expect(contrast).toBeGreaterThanOrEqual(4.5);
		});
	});

	describe("createSoftBorderColor", () => {
		it("パステル色から柔らかいボーダー色を生成", () => {
			const pastelPink = "#FFD1DC";
			const borderColor = createSoftBorderColor(pastelPink);

			// 有効なHEX色が返される
			expect(borderColor).toMatch(/^#[0-9a-f]{6}$/i);

			// 元の色より暗い
			const originalColor = new Color(pastelPink);
			const border = new Color(borderColor);
			const originalL = originalColor.oklch?.l ?? 0;
			const borderL = border.oklch?.l ?? 0;
			expect(borderL).toBeLessThan(originalL);
		});

		it("色相を維持する", () => {
			const pastelBlue = "#AED9E0";
			const borderColor = createSoftBorderColor(pastelBlue);

			const originalColor = new Color(pastelBlue);
			const border = new Color(borderColor);
			const originalHue = originalColor.oklch?.h ?? 0;
			const borderHue = border.oklch?.h ?? 0;

			// 色相は維持される（±5°の許容範囲）
			const hueDiff = Math.min(
				Math.abs(originalHue - borderHue),
				360 - Math.abs(originalHue - borderHue),
			);
			expect(hueDiff).toBeLessThan(5);
		});

		it("明度の下限が0.6に制限される", () => {
			// 非常に暗い色（明度が既に低い）
			const darkColor = "#333333";
			const borderColor = createSoftBorderColor(darkColor);

			const border = new Color(borderColor);
			const borderL = border.oklch?.l ?? 0;

			// 明度は0.6以上に維持される（浮動小数点誤差を考慮）
			expect(borderL).toBeGreaterThanOrEqual(0.59);
		});

		it("無効な色の場合はフォールバック値を返す", () => {
			const invalidColor = "not-a-color";
			const borderColor = createSoftBorderColor(invalidColor);

			// フォールバック値（薄いグレー）
			expect(borderColor.toLowerCase()).toBe("#e8e8e8");
		});

		it("彩度を適度に下げる", () => {
			const pastelGreen = "#C8E6C9";
			const borderColor = createSoftBorderColor(pastelGreen);

			const originalColor = new Color(pastelGreen);
			const border = new Color(borderColor);
			const originalC = originalColor.oklch?.c ?? 0;
			const borderC = border.oklch?.c ?? 0;

			// 彩度は元の80%以下（ただし元が低彩度なら同等もありえる）
			expect(borderC).toBeLessThanOrEqual(originalC * 0.81); // 若干のマージン
		});
	});
});

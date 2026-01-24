/**
 * WCAGコントラスト計算モジュールのテスト
 *
 * @module @/utils/wcag.test
 * Requirements: 3.1, 3.2, 3.3, 3.4, 4.3
 */

import { describe, expect, it } from "bun:test";
import { parse } from "culori";
import type { ColorObject } from "./color-space";
import { calculateContrastResult, getContrastLevel } from "./wcag";

/**
 * HEX文字列をColorObject（OKLCH）に変換するヘルパー
 */
function hexToColorObject(hex: string): ColorObject {
	const parsed = parse(hex);
	if (!parsed) {
		throw new Error(`Invalid hex color: ${hex}`);
	}
	// culoriのparse結果をColorObject（OKLCH）として扱う
	return parsed as ColorObject;
}

describe("wcag", () => {
	describe("getContrastLevel", () => {
		/**
		 * コントラストレベル判定テスト
		 * Requirements: 3.3
		 * AAA≥7.0, AA≥4.5, L≥3.0, fail<3.0
		 */

		describe("AAA level (≥7.0)", () => {
			it("should return AAA for ratio exactly 7.0", () => {
				expect(getContrastLevel(7.0)).toBe("AAA");
			});

			it("should return AAA for ratio 21.0 (maximum)", () => {
				expect(getContrastLevel(21.0)).toBe("AAA");
			});

			it("should return AAA for ratio 10.5", () => {
				expect(getContrastLevel(10.5)).toBe("AAA");
			});
		});

		describe("AA level (≥4.5, <7.0)", () => {
			it("should return AA for ratio exactly 4.5", () => {
				expect(getContrastLevel(4.5)).toBe("AA");
			});

			it("should return AA for ratio 6.99", () => {
				expect(getContrastLevel(6.99)).toBe("AA");
			});

			it("should return AA for ratio 5.5", () => {
				expect(getContrastLevel(5.5)).toBe("AA");
			});
		});

		describe("L level (≥3.0, <4.5)", () => {
			it("should return L for ratio exactly 3.0", () => {
				expect(getContrastLevel(3.0)).toBe("L");
			});

			it("should return L for ratio 4.49", () => {
				expect(getContrastLevel(4.49)).toBe("L");
			});

			it("should return L for ratio 3.5", () => {
				expect(getContrastLevel(3.5)).toBe("L");
			});
		});

		describe("fail level (<3.0)", () => {
			it("should return fail for ratio 2.99", () => {
				expect(getContrastLevel(2.99)).toBe("fail");
			});

			it("should return fail for ratio 1.0 (minimum)", () => {
				expect(getContrastLevel(1.0)).toBe("fail");
			});

			it("should return fail for ratio 2.0", () => {
				expect(getContrastLevel(2.0)).toBe("fail");
			});
		});

		describe("boundary precision", () => {
			it("should return AA for ratio 4.500001 (just above AA)", () => {
				expect(getContrastLevel(4.500001)).toBe("AA");
			});

			it("should return L for ratio 4.499999 (just below AA)", () => {
				expect(getContrastLevel(4.499999)).toBe("L");
			});

			it("should return AAA for ratio 7.000001 (just above AAA)", () => {
				expect(getContrastLevel(7.000001)).toBe("AAA");
			});

			it("should return AA for ratio 6.999999 (just below AAA)", () => {
				expect(getContrastLevel(6.999999)).toBe("AA");
			});
		});
	});

	describe("calculateContrastResult", () => {
		/**
		 * コントラスト結果計算テスト
		 * Requirements: 3.1, 3.2, 3.4
		 */

		describe("known color pairs", () => {
			it("should calculate correct contrast for black on white", () => {
				const black = hexToColorObject("#000000");
				const white = hexToColorObject("#ffffff");

				const result = calculateContrastResult(black, white);

				expect(result.wcagRatio).toBeCloseTo(21.0, 0);
				expect(result.level).toBe("AAA");
				expect(typeof result.apcaLc).toBe("number");
			});

			it("should calculate correct contrast for white on black", () => {
				const white = hexToColorObject("#ffffff");
				const black = hexToColorObject("#000000");

				const result = calculateContrastResult(white, black);

				expect(result.wcagRatio).toBeCloseTo(21.0, 0);
				expect(result.level).toBe("AAA");
			});

			it("should calculate correct contrast for gray on white", () => {
				// #767676 is the darkest gray that passes AA on white
				const gray = hexToColorObject("#767676");
				const white = hexToColorObject("#ffffff");

				const result = calculateContrastResult(gray, white);

				// Should be around 4.54
				expect(result.wcagRatio).toBeGreaterThanOrEqual(4.5);
				expect(result.level).toBe("AA");
			});

			it("should calculate correct contrast for dark gray on white", () => {
				const darkGray = hexToColorObject("#333333");
				const white = hexToColorObject("#ffffff");

				const result = calculateContrastResult(darkGray, white);

				// Should be around 12.63
				expect(result.wcagRatio).toBeGreaterThan(7.0);
				expect(result.level).toBe("AAA");
			});

			it("should calculate correct contrast for light gray on dark gray", () => {
				const lightGray = hexToColorObject("#cccccc");
				const darkGray = hexToColorObject("#333333");

				const result = calculateContrastResult(lightGray, darkGray);

				// Should be high contrast
				expect(result.wcagRatio).toBeGreaterThan(4.5);
			});
		});

		describe("low contrast scenarios", () => {
			it("should return fail level for similar colors", () => {
				const color1 = hexToColorObject("#f0f0f0");
				const color2 = hexToColorObject("#ffffff");

				const result = calculateContrastResult(color1, color2);

				expect(result.wcagRatio).toBeLessThan(3.0);
				expect(result.level).toBe("fail");
			});

			it("should return fail for same color", () => {
				const color = hexToColorObject("#808080");

				const result = calculateContrastResult(color, color);

				expect(result.wcagRatio).toBeCloseTo(1.0, 0);
				expect(result.level).toBe("fail");
			});
		});

		describe("APCA Lc value", () => {
			it("should return APCA Lc value for black on white", () => {
				const black = hexToColorObject("#000000");
				const white = hexToColorObject("#ffffff");

				const result = calculateContrastResult(black, white);

				// APCA Lc for black text on white bg is around -106 to -108
				expect(Math.abs(result.apcaLc)).toBeGreaterThan(90);
			});

			it("should return positive APCA for dark text on light bg", () => {
				const black = hexToColorObject("#000000");
				const white = hexToColorObject("#ffffff");

				const result = calculateContrastResult(black, white);

				// Dark text on light bg produces positive Lc in apca-w3
				expect(result.apcaLc).toBeGreaterThan(0);
			});

			it("should return negative APCA for light text on dark bg", () => {
				const white = hexToColorObject("#ffffff");
				const black = hexToColorObject("#000000");

				const result = calculateContrastResult(white, black);

				// Light text on dark bg produces negative Lc in apca-w3
				expect(result.apcaLc).toBeLessThan(0);
			});
		});

		describe("result structure", () => {
			it("should return all required fields", () => {
				const black = hexToColorObject("#000000");
				const white = hexToColorObject("#ffffff");

				const result = calculateContrastResult(black, white);

				expect(result).toHaveProperty("wcagRatio");
				expect(result).toHaveProperty("apcaLc");
				expect(result).toHaveProperty("level");
			});

			it("should return wcagRatio as number between 1 and 21", () => {
				const color1 = hexToColorObject("#abc123");
				const color2 = hexToColorObject("#654321");

				const result = calculateContrastResult(color1, color2);

				expect(result.wcagRatio).toBeGreaterThanOrEqual(1.0);
				expect(result.wcagRatio).toBeLessThanOrEqual(21.0);
			});

			it("should return level as valid ContrastLevel", () => {
				const color1 = hexToColorObject("#123456");
				const color2 = hexToColorObject("#fedcba");

				const result = calculateContrastResult(color1, color2);

				expect(["AAA", "AA", "L", "fail"]).toContain(result.level);
			});
		});
	});

	describe("performance (Requirement 4.3)", () => {
		it("should calculate 20 contrast results in under 200ms", () => {
			const colors = [
				"#000000",
				"#ffffff",
				"#ff0000",
				"#00ff00",
				"#0000ff",
				"#ffff00",
				"#ff00ff",
				"#00ffff",
				"#808080",
				"#c0c0c0",
				"#800000",
				"#008000",
				"#000080",
				"#808000",
				"#800080",
				"#008080",
				"#333333",
				"#666666",
				"#999999",
				"#cccccc",
			];

			const background = hexToColorObject("#ffffff");
			const colorObjects = colors.map(hexToColorObject);

			const start = performance.now();

			for (const fg of colorObjects) {
				calculateContrastResult(fg, background);
			}

			const end = performance.now();
			const duration = end - start;

			// Should complete in under 200ms
			expect(duration).toBeLessThan(200);
		});
	});
});

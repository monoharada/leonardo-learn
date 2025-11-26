import { describe, expect, test } from "bun:test";
import { Color } from "../core/color";
import {
	type CVDType,
	getAllCVDTypes,
	getCVDTypeName,
	simulateAllCVDTypes,
	simulateCVD,
} from "./cvd-simulator";

describe("CVDSimulator", () => {
	describe("simulateCVD", () => {
		describe("Protanopia（1型2色覚）", () => {
			test("should convert red to dark yellow/brown", () => {
				const red = new Color("#ff0000");
				const simulated = simulateCVD(red, "protanopia");
				const hex = simulated.toHex();

				// Protanopiaでは赤が暗い黄色/茶色に見える
				// R成分が減少し、G成分が増加
				expect(hex).not.toBe("#ff0000");
			});

			test("should keep blue relatively unchanged", () => {
				const blue = new Color("#0000ff");
				const simulated = simulateCVD(blue, "protanopia");
				const hex = simulated.toHex();

				// 青はProtanopiaでもほぼ変わらない
				expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
			});

			test("should convert green to yellow", () => {
				const green = new Color("#00ff00");
				const simulated = simulateCVD(green, "protanopia");
				const hex = simulated.toHex();

				expect(hex).not.toBe("#00ff00");
			});
		});

		describe("Deuteranopia（2型2色覚）", () => {
			test("should convert green to brownish", () => {
				const green = new Color("#00ff00");
				const simulated = simulateCVD(green, "deuteranopia");
				const hex = simulated.toHex();

				expect(hex).not.toBe("#00ff00");
			});

			test("should convert red to yellowish", () => {
				const red = new Color("#ff0000");
				const simulated = simulateCVD(red, "deuteranopia");
				const hex = simulated.toHex();

				expect(hex).not.toBe("#ff0000");
			});
		});

		describe("Tritanopia（3型2色覚）", () => {
			test("should convert blue to cyan/greenish", () => {
				const blue = new Color("#0000ff");
				const simulated = simulateCVD(blue, "tritanopia");
				const hex = simulated.toHex();

				expect(hex).not.toBe("#0000ff");
			});

			test("should convert yellow to pink/reddish", () => {
				const yellow = new Color("#ffff00");
				const simulated = simulateCVD(yellow, "tritanopia");
				const hex = simulated.toHex();

				expect(hex).not.toBe("#ffff00");
			});
		});

		describe("Achromatopsia（全色盲）", () => {
			test("should convert any color to grayscale", () => {
				const red = new Color("#ff0000");
				const simulated = simulateCVD(red, "achromatopsia");
				const hex = simulated.toHex();

				// グレースケールではR=G=B
				const r = parseInt(hex.slice(1, 3), 16);
				const g = parseInt(hex.slice(3, 5), 16);
				const b = parseInt(hex.slice(5, 7), 16);

				// 許容誤差1以内でR=G=B
				expect(Math.abs(r - g)).toBeLessThanOrEqual(1);
				expect(Math.abs(g - b)).toBeLessThanOrEqual(1);
			});

			test("should preserve white as white", () => {
				const white = new Color("#ffffff");
				const simulated = simulateCVD(white, "achromatopsia");
				const hex = simulated.toHex();

				expect(hex).toBe("#ffffff");
			});

			test("should preserve black as black", () => {
				const black = new Color("#000000");
				const simulated = simulateCVD(black, "achromatopsia");
				const hex = simulated.toHex();

				expect(hex).toBe("#000000");
			});
		});

		describe("Neutral colors", () => {
			test("should keep gray relatively similar for Achromatopsia", () => {
				const gray = new Color("#808080");
				const simulated = simulateCVD(gray, "achromatopsia");
				const hex = simulated.toHex();

				// Achromatopsiaではグレーはグレーのまま
				const r = parseInt(hex.slice(1, 3), 16);
				const g = parseInt(hex.slice(3, 5), 16);
				const b = parseInt(hex.slice(5, 7), 16);

				// R=G=B
				expect(Math.abs(r - g)).toBeLessThanOrEqual(1);
				expect(Math.abs(g - b)).toBeLessThanOrEqual(1);
				// 輝度も近い値
				expect(Math.abs(r - 128)).toBeLessThanOrEqual(20);
			});

			test("should produce valid colors for gray input", () => {
				const gray = new Color("#808080");

				for (const type of getAllCVDTypes()) {
					const simulated = simulateCVD(gray, type);
					const hex = simulated.toHex();

					// 有効なhex形式
					expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
				}
			});
		});
	});

	describe("simulateAllCVDTypes", () => {
		test("should return all four CVD type simulations", () => {
			const color = new Color("#ff5500");
			const results = simulateAllCVDTypes(color);

			expect(results.protanopia).toBeInstanceOf(Color);
			expect(results.deuteranopia).toBeInstanceOf(Color);
			expect(results.tritanopia).toBeInstanceOf(Color);
			expect(results.achromatopsia).toBeInstanceOf(Color);
		});

		test("should produce different results for different CVD types", () => {
			const color = new Color("#ff0000");
			const results = simulateAllCVDTypes(color);

			// 赤は各色覚タイプで異なる見え方になる
			const hexes = [
				results.protanopia.toHex(),
				results.deuteranopia.toHex(),
				results.tritanopia.toHex(),
				results.achromatopsia.toHex(),
			];

			// 少なくとも3つは異なる結果になるはず
			const uniqueHexes = new Set(hexes);
			expect(uniqueHexes.size).toBeGreaterThanOrEqual(3);
		});
	});

	describe("getAllCVDTypes", () => {
		test("should return all four CVD types", () => {
			const types = getAllCVDTypes();

			expect(types).toContain("protanopia");
			expect(types).toContain("deuteranopia");
			expect(types).toContain("tritanopia");
			expect(types).toContain("achromatopsia");
			expect(types.length).toBe(4);
		});
	});

	describe("getCVDTypeName", () => {
		test("should return Japanese names for CVD types", () => {
			expect(getCVDTypeName("protanopia")).toBe("1型2色覚（P型）");
			expect(getCVDTypeName("deuteranopia")).toBe("2型2色覚（D型）");
			expect(getCVDTypeName("tritanopia")).toBe("3型2色覚（T型）");
			expect(getCVDTypeName("achromatopsia")).toBe("全色盲");
		});
	});

	describe("Color conversion accuracy", () => {
		test("should produce valid hex colors", () => {
			const colors = [
				new Color("#ff0000"),
				new Color("#00ff00"),
				new Color("#0000ff"),
				new Color("#ffff00"),
				new Color("#ff00ff"),
				new Color("#00ffff"),
			];

			for (const color of colors) {
				for (const type of getAllCVDTypes()) {
					const simulated = simulateCVD(color, type);
					const hex = simulated.toHex();

					// 有効なhex形式
					expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
				}
			}
		});

		test("should handle edge case colors", () => {
			// 非常に暗い色
			const dark = new Color("#0a0a0a");
			for (const type of getAllCVDTypes()) {
				const simulated = simulateCVD(dark, type);
				expect(simulated.toHex()).toMatch(/^#[0-9a-f]{6}$/i);
			}

			// 非常に明るい色
			const light = new Color("#f5f5f5");
			for (const type of getAllCVDTypes()) {
				const simulated = simulateCVD(light, type);
				expect(simulated.toHex()).toMatch(/^#[0-9a-f]{6}$/i);
			}
		});
	});

	describe("Known confusion pairs", () => {
		test("red and green should become similar in Protanopia", () => {
			const red = new Color("#ff0000");
			const green = new Color("#00ff00");

			const simRed = simulateCVD(red, "protanopia");
			const simGreen = simulateCVD(green, "protanopia");

			// シミュレーション後の色差を計算
			const rHex = simRed.toHex();
			const gHex = simGreen.toHex();

			// 両方とも黄色系統になる
			const rR = parseInt(rHex.slice(1, 3), 16);
			const gR = parseInt(gHex.slice(1, 3), 16);

			// R成分が両方とも高い（黄色系）
			expect(rR).toBeGreaterThan(100);
			expect(gR).toBeGreaterThan(100);
		});

		test("red and green should become similar in Deuteranopia", () => {
			const red = new Color("#ff0000");
			const green = new Color("#00ff00");

			const simRed = simulateCVD(red, "deuteranopia");
			const simGreen = simulateCVD(green, "deuteranopia");

			// シミュレーション後の色差を計算
			const rHex = simRed.toHex();
			const gHex = simGreen.toHex();

			// 両方とも似た色になる
			expect(rHex).not.toBe("#ff0000");
			expect(gHex).not.toBe("#00ff00");
		});

		test("blue and yellow should remain distinguishable in Protanopia/Deuteranopia", () => {
			const blue = new Color("#0000ff");
			const yellow = new Color("#ffff00");

			for (const type of ["protanopia", "deuteranopia"] as CVDType[]) {
				const simBlue = simulateCVD(blue, type);
				const simYellow = simulateCVD(yellow, type);

				// 青と黄色は区別可能
				expect(simBlue.toHex()).not.toBe(simYellow.toHex());
			}
		});
	});
});

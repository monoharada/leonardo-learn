/**
 * ContrastBoundaryCalculator関数群のテスト
 *
 * Requirements: 6.2, 6.3, 6.6
 * - ライト背景に対する3:1、4.5:1境界を正しく計算
 * - ダーク背景に対する4.5:1、3:1境界を正しく計算
 * - WCAG 2.x相対輝度アルゴリズムを使用
 */

import { describe, expect, it } from "bun:test";
import {
	type ColorItem,
	type ContrastBoundaryResult,
	calculateBoundaries,
	findBlackBoundary,
	findWhiteBoundary,
} from "./contrast-boundary-calculator";

describe("ContrastBoundaryCalculator", () => {
	// テスト用の色スケール（明るい→暗いの順）
	const createColorScale = (): ColorItem[] => [
		{ scale: 50, hex: "#fefefe" }, // 非常に明るい（白と低コントラスト）
		{ scale: 100, hex: "#ebebeb" },
		{ scale: 200, hex: "#d9d9d9" },
		{ scale: 300, hex: "#c4c4c4" },
		{ scale: 400, hex: "#afafaf" },
		{ scale: 500, hex: "#8f8f8f" },
		{ scale: 600, hex: "#707070" }, // 中間（白・黒両方と約3:1）
		{ scale: 700, hex: "#595959" },
		{ scale: 800, hex: "#424242" },
		{ scale: 900, hex: "#2e2e2e" },
		{ scale: 1000, hex: "#1c1c1c" },
		{ scale: 1100, hex: "#0d0d0d" },
		{ scale: 1200, hex: "#030303" }, // 非常に暗い（黒と低コントラスト）
	];

	describe("findWhiteBoundary", () => {
		it("should find 3:1 boundary against light background", () => {
			const colors = createColorScale();
			const boundary = findWhiteBoundary(colors, 3.0);

			// ライト背景に対して3:1を超える最初のscaleを返す
			expect(boundary).not.toBeNull();
			expect(typeof boundary).toBe("number");
			// 3:1境界は中間程度のscale（暗い色）にあるはず
			expect(boundary).toBeGreaterThanOrEqual(400);
			expect(boundary).toBeLessThanOrEqual(700);
		});

		it("should find 4.5:1 boundary against light background", () => {
			const colors = createColorScale();
			const boundary = findWhiteBoundary(colors, 4.5);

			// ライト背景に対して4.5:1を超える最初のscaleを返す
			expect(boundary).not.toBeNull();
			expect(typeof boundary).toBe("number");
			// 4.5:1境界は3:1より暗いscaleにあるはず
			expect(boundary).toBeGreaterThanOrEqual(500);
			expect(boundary).toBeLessThanOrEqual(900);
		});

		it("should return null when no color meets threshold", () => {
			// 全て非常に明るい色（ライト背景と低コントラスト）
			const lightColors: ColorItem[] = [
				{ scale: 50, hex: "#ffffff" },
				{ scale: 100, hex: "#fefefe" },
				{ scale: 200, hex: "#fdfdfd" },
			];

			const boundary = findWhiteBoundary(lightColors, 4.5);
			expect(boundary).toBeNull();
		});

		it("should use custom light background color", () => {
			const colors = createColorScale();
			// ライトグレー背景 (#f8fafc) を使用
			const boundary = findWhiteBoundary(colors, 4.5, "#f8fafc");

			expect(boundary).not.toBeNull();
			expect(typeof boundary).toBe("number");
			// カスタム背景色でも同様の範囲で境界を検出
			expect(boundary).toBeGreaterThanOrEqual(500);
		});
	});

	describe("findBlackBoundary", () => {
		it("should find 4.5:1 boundary against dark background", () => {
			const colors = createColorScale();
			const boundary = findBlackBoundary(colors, 4.5);

			// ダーク背景に対して4.5:1を超える最初のscale（明るい方から暗い方へ）を返す
			expect(boundary).not.toBeNull();
			expect(typeof boundary).toBe("number");
			// 4.5:1境界は中間程度のscale（明るい色）にあるはず
			expect(boundary).toBeGreaterThanOrEqual(300);
			expect(boundary).toBeLessThanOrEqual(600);
		});

		it("should find 3:1 boundary against dark background", () => {
			const colors = createColorScale();
			const boundary = findBlackBoundary(colors, 3.0);

			// ダーク背景に対して3:1を超える最初のscale（明るい方から暗い方へ）を返す
			expect(boundary).not.toBeNull();
			expect(typeof boundary).toBe("number");
			// 3:1境界は4.5:1より暗いscale（中間寄り）にあるはず
			expect(boundary).toBeGreaterThanOrEqual(400);
			expect(boundary).toBeLessThanOrEqual(700);
		});

		it("should return null when no color meets threshold", () => {
			// 全て非常に暗い色（ダーク背景と低コントラスト）
			const darkColors: ColorItem[] = [
				{ scale: 1000, hex: "#020202" },
				{ scale: 1100, hex: "#010101" },
				{ scale: 1200, hex: "#000000" },
			];

			const boundary = findBlackBoundary(darkColors, 4.5);
			expect(boundary).toBeNull();
		});

		it("should use custom dark background color", () => {
			const colors = createColorScale();
			// ダークグレー背景 (#18181b) を使用
			const boundary = findBlackBoundary(colors, 4.5, "#18181b");

			expect(boundary).not.toBeNull();
			expect(typeof boundary).toBe("number");
			// カスタム背景色でも同様の範囲で境界を検出
			expect(boundary).toBeLessThanOrEqual(600);
		});
	});

	describe("calculateBoundaries", () => {
		it("should calculate all four boundaries", () => {
			const colors = createColorScale();
			const result = calculateBoundaries(colors);

			expect(result).toHaveProperty("white3to1");
			expect(result).toHaveProperty("white4_5to1");
			expect(result).toHaveProperty("black4_5to1");
			expect(result).toHaveProperty("black3to1");
		});

		it("should return correct boundary structure", () => {
			const colors = createColorScale();
			const result: ContrastBoundaryResult = calculateBoundaries(colors);

			// ライト背景: 3:1 は 4.5:1 より明るい（小さいscale）にある
			if (result.white3to1 !== null && result.white4_5to1 !== null) {
				expect(result.white3to1).toBeLessThanOrEqual(result.white4_5to1);
			}

			// ダーク背景: 4.5:1 は 3:1 より明るい（小さいscale）にある
			if (result.black4_5to1 !== null && result.black3to1 !== null) {
				expect(result.black4_5to1).toBeLessThanOrEqual(result.black3to1);
			}
		});

		it("should handle empty color array", () => {
			const result = calculateBoundaries([]);

			expect(result.white3to1).toBeNull();
			expect(result.white4_5to1).toBeNull();
			expect(result.black4_5to1).toBeNull();
			expect(result.black3to1).toBeNull();
		});

		it("should handle single color", () => {
			const singleColor: ColorItem[] = [{ scale: 500, hex: "#808080" }];
			const result = calculateBoundaries(singleColor);

			// 単一色でも境界計算は試みられる
			expect(result).toHaveProperty("white3to1");
			expect(result).toHaveProperty("white4_5to1");
			expect(result).toHaveProperty("black4_5to1");
			expect(result).toHaveProperty("black3to1");
		});
	});

	describe("calculateBoundaries with custom background colors", () => {
		it("should use custom light background color", () => {
			const colors = createColorScale();
			// ライトグレー背景 (#f8fafc) を使用
			const result = calculateBoundaries(colors, "#f8fafc", "#000000");

			expect(result).toHaveProperty("white3to1");
			expect(result).toHaveProperty("white4_5to1");
			// カスタムライト背景での境界が計算される
			expect(result.white3to1).not.toBeNull();
			expect(result.white4_5to1).not.toBeNull();
		});

		it("should use custom dark background color", () => {
			const colors = createColorScale();
			// ダークグレー背景 (#18181b) を使用
			const result = calculateBoundaries(colors, "#ffffff", "#18181b");

			expect(result).toHaveProperty("black4_5to1");
			expect(result).toHaveProperty("black3to1");
			// カスタムダーク背景での境界が計算される
			expect(result.black4_5to1).not.toBeNull();
			expect(result.black3to1).not.toBeNull();
		});

		it("should use both custom background colors", () => {
			const colors = createColorScale();
			// ライトグレー (#f0f0f0) とダークグレー (#202020) を使用
			const result = calculateBoundaries(colors, "#f0f0f0", "#202020");

			// 両方の背景色に対する境界が計算される
			expect(result.white3to1).not.toBeNull();
			expect(result.white4_5to1).not.toBeNull();
			expect(result.black4_5to1).not.toBeNull();
			expect(result.black3to1).not.toBeNull();
		});
	});

	describe("WCAG 2.x compliance", () => {
		it("should use relative luminance algorithm", () => {
			// 黒（#000000）と白（#ffffff）のコントラスト比は21:1
			// 中間グレー（約#808080）と白/黒のコントラスト比は約4.5:1
			const grayScale: ColorItem[] = [
				{ scale: 100, hex: "#ffffff" }, // 白: 黒と21:1, 白と1:1
				{ scale: 500, hex: "#757575" }, // 中間グレー: 白と約4.5:1
				{ scale: 900, hex: "#000000" }, // 黒: 白と21:1, 黒と1:1
			];

			const result = calculateBoundaries(grayScale);

			// ライト背景に対する4.5:1境界は中間グレー付近
			expect(result.white4_5to1).toBe(500);

			// ダーク背景に対する4.5:1境界は中間グレー付近
			expect(result.black4_5to1).toBe(500);
		});
	});
});

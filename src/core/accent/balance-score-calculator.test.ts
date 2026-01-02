/**
 * BalanceScoreCalculator テスト
 * Task 1.1: バランススコア計算サービスの実装
 *
 * Requirements: 1.2, 2.1, 2.2, 2.3
 */

import { describe, expect, it } from "bun:test";
import {
	calculateBalanceScore,
	InvalidColorError,
	normalizeHex,
	normalizeWeights,
	resolveBackgroundHex,
	type ScoreWeights,
} from "./balance-score-calculator";

describe("BalanceScoreCalculator", () => {
	describe("normalizeHex", () => {
		it("正規化: 大文字統一", () => {
			expect(normalizeHex("#aabbcc")).toBe("#AABBCC");
			expect(normalizeHex("aabbcc")).toBe("#AABBCC");
		});

		it("正規化: #プレフィックス保証", () => {
			expect(normalizeHex("AABBCC")).toBe("#AABBCC");
			expect(normalizeHex("#AABBCC")).toBe("#AABBCC");
		});

		it("正規化: 3桁HEXを6桁に展開", () => {
			expect(normalizeHex("#ABC")).toBe("#AABBCC");
			expect(normalizeHex("abc")).toBe("#AABBCC");
		});

		it("無効なHEX形式でエラー", () => {
			expect(() => normalizeHex("invalid")).toThrow(InvalidColorError);
			expect(() => normalizeHex("#GGG")).toThrow(InvalidColorError);
			expect(() => normalizeHex("#12")).toThrow(InvalidColorError);
			expect(() => normalizeHex("#1234567")).toThrow(InvalidColorError);
		});
	});

	describe("resolveBackgroundHex", () => {
		it("正常なHEXを正規化して返す", () => {
			expect(resolveBackgroundHex("#ffffff")).toBe("#FFFFFF");
			expect(resolveBackgroundHex("000000")).toBe("#000000");
		});

		it("未設定時はデフォルト#FFFFFFを返す", () => {
			expect(resolveBackgroundHex(undefined)).toBe("#FFFFFF");
			expect(resolveBackgroundHex("")).toBe("#FFFFFF");
		});

		it("無効なHEX時はデフォルト#FFFFFFを返す", () => {
			expect(resolveBackgroundHex("invalid")).toBe("#FFFFFF");
			expect(resolveBackgroundHex("#ZZZ")).toBe("#FFFFFF");
		});
	});

	describe("normalizeWeights", () => {
		it("デフォルト重み: 40/30/30", () => {
			const weights: ScoreWeights = { harmony: 40, cud: 30, contrast: 30 };
			const normalized = normalizeWeights(weights);
			expect(normalized).toEqual({ harmony: 40, cud: 30, contrast: 30 });
		});

		it("合計100保証: 比例配分後に丸め", () => {
			const weights: ScoreWeights = { harmony: 50, cud: 25, contrast: 25 };
			const normalized = normalizeWeights(weights);
			expect(normalized.harmony + normalized.cud + normalized.contrast).toBe(
				100,
			);
		});

		it("端数調整: 最大値に差分を加算", () => {
			const weights: ScoreWeights = { harmony: 33, cud: 33, contrast: 33 };
			const normalized = normalizeWeights(weights);
			expect(normalized.harmony + normalized.cud + normalized.contrast).toBe(
				100,
			);
			// 最大値（harmony, cud, contrastが同じ場合はharmonyが優先）
			expect(normalized.harmony).toBe(34);
		});

		it("合計0の場合はデフォルト重みを返す", () => {
			const weights: ScoreWeights = { harmony: 0, cud: 0, contrast: 0 };
			const normalized = normalizeWeights(weights);
			expect(normalized).toEqual({ harmony: 40, cud: 30, contrast: 30 });
		});

		it("極端な重み配分も正規化", () => {
			const weights: ScoreWeights = { harmony: 100, cud: 0, contrast: 0 };
			const normalized = normalizeWeights(weights);
			expect(normalized).toEqual({ harmony: 100, cud: 0, contrast: 0 });
		});
	});

	describe("calculateBalanceScore", () => {
		it("デフォルト重みでスコア計算", () => {
			const result = calculateBalanceScore(
				"#0056FF", // Blue brand color
				"#FF9900", // Orange candidate
				"#FFFFFF", // White background
			);

			expect(result.total).toBeGreaterThanOrEqual(0);
			expect(result.total).toBeLessThanOrEqual(100);
			expect(result.breakdown.harmonyScore).toBeGreaterThanOrEqual(0);
			expect(result.breakdown.harmonyScore).toBeLessThanOrEqual(100);
			expect(result.breakdown.cudScore).toBeGreaterThanOrEqual(0);
			expect(result.breakdown.cudScore).toBeLessThanOrEqual(100);
			expect(result.breakdown.contrastScore).toBeGreaterThanOrEqual(0);
			expect(result.breakdown.contrastScore).toBeLessThanOrEqual(100);
			expect(result.weights).toEqual({ harmony: 40, cud: 30, contrast: 30 });
		});

		it("カスタム重みでスコア計算", () => {
			const result = calculateBalanceScore("#0056FF", "#FF9900", "#FFFFFF", {
				harmony: 60,
				cud: 20,
				contrast: 20,
			});

			expect(result.weights).toEqual({ harmony: 60, cud: 20, contrast: 20 });
		});

		it("総合スコアは3指標の加重平均", () => {
			const result = calculateBalanceScore("#0056FF", "#FF9900", "#FFFFFF");

			const expectedTotal =
				result.breakdown.harmonyScore * (result.weights.harmony / 100) +
				result.breakdown.cudScore * (result.weights.cud / 100) +
				result.breakdown.contrastScore * (result.weights.contrast / 100);

			expect(result.total).toBeCloseTo(expectedTotal, 1);
		});

		it("無効なブランドカラーでエラー", () => {
			expect(() =>
				calculateBalanceScore("invalid", "#FF9900", "#FFFFFF"),
			).toThrow(InvalidColorError);
		});

		it("無効な候補色でエラー", () => {
			expect(() =>
				calculateBalanceScore("#0056FF", "invalid", "#FFFFFF"),
			).toThrow(InvalidColorError);
		});

		it("無効な背景色はフォールバック（#FFFFFF）", () => {
			const result = calculateBalanceScore("#0056FF", "#FF9900", "invalid");
			// エラーにならず計算が完了すること
			expect(result.total).toBeGreaterThanOrEqual(0);
		});

		it("同じ色同士は高いハーモニースコア", () => {
			const result = calculateBalanceScore("#0056FF", "#0056FF", "#FFFFFF");
			expect(result.breakdown.harmonyScore).toBeGreaterThanOrEqual(80);
		});

		it("高コントラストペアは高いコントラストスコア", () => {
			// 黒文字on白背景は高コントラスト
			const result = calculateBalanceScore("#0056FF", "#000000", "#FFFFFF");
			expect(result.breakdown.contrastScore).toBeGreaterThanOrEqual(90);
		});

		it("低コントラストペアは低いコントラストスコア", () => {
			// 白文字on白背景は低コントラスト
			const result = calculateBalanceScore("#0056FF", "#FFFFFF", "#FFFFFF");
			expect(result.breakdown.contrastScore).toBeLessThan(20);
		});
	});

	describe("CUDスコア正規化式", () => {
		it("CUD推奨色（#FF2800 赤）は高スコア", () => {
			// CUD推奨色の赤は高いCUDスコアを持つべき
			const result = calculateBalanceScore("#0056FF", "#FF2800", "#FFFFFF");
			expect(result.breakdown.cudScore).toBeGreaterThanOrEqual(80);
		});
	});

	describe("コントラストスコア正規化式", () => {
		it("コントラスト比1.0で0点", () => {
			// 同じ色同士はコントラスト比1.0
			const result = calculateBalanceScore("#0056FF", "#FFFFFF", "#FFFFFF");
			expect(result.breakdown.contrastScore).toBeLessThan(5);
		});

		it("コントラスト比7.0以上で100点に近い", () => {
			// 黒on白はコントラスト比21
			const result = calculateBalanceScore("#0056FF", "#000000", "#FFFFFF");
			expect(result.breakdown.contrastScore).toBeGreaterThanOrEqual(95);
		});
	});
});

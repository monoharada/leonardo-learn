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
		it("デフォルト重み: 30/20/25/25 (Phase 3: vibrancy追加)", () => {
			const weights: ScoreWeights = {
				harmony: 30,
				cud: 20,
				contrast: 25,
				vibrancy: 25,
			};
			const normalized = normalizeWeights(weights);
			expect(normalized).toEqual({
				harmony: 30,
				cud: 20,
				contrast: 25,
				vibrancy: 25,
			});
		});

		it("合計100保証: 比例配分後に丸め", () => {
			const weights: ScoreWeights = {
				harmony: 40,
				cud: 20,
				contrast: 20,
				vibrancy: 20,
			};
			const normalized = normalizeWeights(weights);
			const sum =
				normalized.harmony +
				normalized.cud +
				normalized.contrast +
				normalized.vibrancy;
			expect(sum).toBe(100);
		});

		it("端数調整: 最大値に差分を加算", () => {
			const weights: ScoreWeights = {
				harmony: 25,
				cud: 25,
				contrast: 25,
				vibrancy: 25,
			};
			const normalized = normalizeWeights(weights);
			const sum =
				normalized.harmony +
				normalized.cud +
				normalized.contrast +
				normalized.vibrancy;
			expect(sum).toBe(100);
		});

		it("合計0の場合はデフォルト重みを返す", () => {
			const weights: ScoreWeights = {
				harmony: 0,
				cud: 0,
				contrast: 0,
				vibrancy: 0,
			};
			const normalized = normalizeWeights(weights);
			expect(normalized).toEqual({
				harmony: 30,
				cud: 20,
				contrast: 25,
				vibrancy: 25,
			});
		});

		it("極端な重み配分も正規化", () => {
			const weights: ScoreWeights = {
				harmony: 100,
				cud: 0,
				contrast: 0,
				vibrancy: 0,
			};
			const normalized = normalizeWeights(weights);
			expect(normalized).toEqual({
				harmony: 100,
				cud: 0,
				contrast: 0,
				vibrancy: 0,
			});
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
			expect(result.breakdown.vibrancyScore).toBeGreaterThanOrEqual(0);
			expect(result.breakdown.vibrancyScore).toBeLessThanOrEqual(100);
			expect(result.weights).toEqual({
				harmony: 30,
				cud: 20,
				contrast: 25,
				vibrancy: 25,
			});
		});

		it("カスタム重みでスコア計算", () => {
			const result = calculateBalanceScore("#0056FF", "#FF9900", "#FFFFFF", {
				harmony: 50,
				cud: 15,
				contrast: 20,
				vibrancy: 15,
			});

			expect(result.weights).toEqual({
				harmony: 50,
				cud: 15,
				contrast: 20,
				vibrancy: 15,
			});
		});

		it("総合スコアは4指標の加重平均", () => {
			const result = calculateBalanceScore("#0056FF", "#FF9900", "#FFFFFF");

			const expectedTotal =
				result.breakdown.harmonyScore * (result.weights.harmony / 100) +
				result.breakdown.cudScore * (result.weights.cud / 100) +
				result.breakdown.contrastScore * (result.weights.contrast / 100) +
				result.breakdown.vibrancyScore * (result.weights.vibrancy / 100);

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

	/**
	 * Task 6.2: 追加ユニットテスト - 既知の色ペアでの期待スコア検証
	 */
	describe("既知の色ペアでの期待スコア検証 (Task 6.2)", () => {
		it("青とオレンジの色ペアはバランススコアが計算される", () => {
			// 青(220°)とオレンジ(30°)の色ペア
			const result = calculateBalanceScore("#0056FF", "#FF9900", "#FFFFFF");
			// ハーモニースコアは色相距離に基づいて計算される
			// 補色関係の場合、特定のハーモニースコアアルゴリズムに依存
			expect(result.breakdown.harmonyScore).toBeGreaterThanOrEqual(0);
			expect(result.breakdown.harmonyScore).toBeLessThanOrEqual(100);
			// 総合スコアは3指標の加重平均
			expect(result.total).toBeGreaterThanOrEqual(0);
		});

		it("同一色相は最高のハーモニースコア", () => {
			// 青系統の同色相
			const result = calculateBalanceScore("#0056FF", "#0066DD", "#FFFFFF");
			expect(result.breakdown.harmonyScore).toBeGreaterThanOrEqual(90);
		});

		it("暗い色on白背景は高コントラスト", () => {
			const result = calculateBalanceScore("#0056FF", "#333333", "#FFFFFF");
			expect(result.breakdown.contrastScore).toBeGreaterThanOrEqual(80);
		});

		it("明るい色on黒背景は高コントラスト", () => {
			const result = calculateBalanceScore("#0056FF", "#CCCCCC", "#000000");
			expect(result.breakdown.contrastScore).toBeGreaterThanOrEqual(70);
		});

		it("中間色on中間背景は低コントラスト", () => {
			const result = calculateBalanceScore("#0056FF", "#808080", "#888888");
			expect(result.breakdown.contrastScore).toBeLessThan(20);
		});
	});

	/**
	 * Task 6.2: 追加ユニットテスト - 重み正規化の境界値テスト
	 */
	describe("重み正規化の境界値テスト (Task 6.2)", () => {
		it("最小値0の重み", () => {
			const weights: ScoreWeights = {
				harmony: 0,
				cud: 40,
				contrast: 30,
				vibrancy: 30,
			};
			const normalized = normalizeWeights(weights);
			expect(normalized.harmony).toBe(0);
			const sum =
				normalized.harmony +
				normalized.cud +
				normalized.contrast +
				normalized.vibrancy;
			expect(sum).toBe(100);
		});

		it("最大値100の重み", () => {
			const weights: ScoreWeights = {
				harmony: 100,
				cud: 0,
				contrast: 0,
				vibrancy: 0,
			};
			const normalized = normalizeWeights(weights);
			expect(normalized.harmony).toBe(100);
			const sum =
				normalized.harmony +
				normalized.cud +
				normalized.contrast +
				normalized.vibrancy;
			expect(sum).toBe(100);
		});

		it("非常に小さい比率でも合計100を保証", () => {
			const weights: ScoreWeights = {
				harmony: 1,
				cud: 1,
				contrast: 1,
				vibrancy: 1,
			};
			const normalized = normalizeWeights(weights);
			const sum =
				normalized.harmony +
				normalized.cud +
				normalized.contrast +
				normalized.vibrancy;
			expect(sum).toBe(100);
		});

		it("大きな値でも合計100に正規化", () => {
			const weights: ScoreWeights = {
				harmony: 200,
				cud: 100,
				contrast: 100,
				vibrancy: 100,
			};
			const normalized = normalizeWeights(weights);
			const sum =
				normalized.harmony +
				normalized.cud +
				normalized.contrast +
				normalized.vibrancy;
			expect(sum).toBe(100);
			expect(normalized.harmony).toBe(40); // 200/500 * 100
			expect(normalized.cud).toBe(20); // 100/500 * 100
			expect(normalized.contrast).toBe(20); // 100/500 * 100
			expect(normalized.vibrancy).toBe(20); // 100/500 * 100
		});

		it("端数が発生する比率で合計100を保証", () => {
			const weights: ScoreWeights = {
				harmony: 1,
				cud: 1,
				contrast: 1,
				vibrancy: 1,
			};
			const normalized = normalizeWeights(weights);
			const sum =
				normalized.harmony +
				normalized.cud +
				normalized.contrast +
				normalized.vibrancy;
			expect(sum).toBe(100);
		});

		it("2:1:1:1比率の正規化", () => {
			const weights: ScoreWeights = {
				harmony: 40,
				cud: 20,
				contrast: 20,
				vibrancy: 20,
			};
			const normalized = normalizeWeights(weights);
			expect(normalized.harmony).toBe(40);
			expect(normalized.cud).toBe(20);
			expect(normalized.contrast).toBe(20);
			expect(normalized.vibrancy).toBe(20);
		});
	});

	/**
	 * Task 6.2: 追加ユニットテスト - CUD/コントラスト正規化式の詳細検証
	 */
	describe("スコア正規化式の詳細検証 (Task 6.2)", () => {
		it("コントラスト比4.5はWCAG AA基準相当のスコア", () => {
			// コントラスト比約4.5（WCAG AA基準）は約58%のスコア
			// score = ((4.5 - 1) / 6) * 100 = 58.3
			const result = calculateBalanceScore("#0056FF", "#767676", "#FFFFFF");
			// #767676 on #FFFFFF はコントラスト比約4.55
			expect(result.breakdown.contrastScore).toBeGreaterThanOrEqual(50);
			expect(result.breakdown.contrastScore).toBeLessThanOrEqual(70);
		});

		it("スコアは0-100の範囲内", () => {
			const testCases = [
				{ brand: "#000000", candidate: "#FFFFFF", bg: "#000000" },
				{ brand: "#FFFFFF", candidate: "#000000", bg: "#FFFFFF" },
				{ brand: "#FF0000", candidate: "#00FF00", bg: "#0000FF" },
			];

			for (const { brand, candidate, bg } of testCases) {
				const result = calculateBalanceScore(brand, candidate, bg);
				expect(result.total).toBeGreaterThanOrEqual(0);
				expect(result.total).toBeLessThanOrEqual(100);
				expect(result.breakdown.harmonyScore).toBeGreaterThanOrEqual(0);
				expect(result.breakdown.harmonyScore).toBeLessThanOrEqual(100);
				expect(result.breakdown.cudScore).toBeGreaterThanOrEqual(0);
				expect(result.breakdown.cudScore).toBeLessThanOrEqual(100);
				expect(result.breakdown.contrastScore).toBeGreaterThanOrEqual(0);
				expect(result.breakdown.contrastScore).toBeLessThanOrEqual(100);
			}
		});

		it("総合スコアは重みの加重平均（4要素）", () => {
			// 4要素の重み（合計100）
			const weights = { harmony: 40, cud: 25, contrast: 20, vibrancy: 15 };
			const result = calculateBalanceScore(
				"#0056FF",
				"#FF9900",
				"#FFFFFF",
				weights,
			);

			// 正規化後の重みを取得
			const normalizedWeights = result.weights;

			// 4要素の加重平均を計算
			const expected =
				result.breakdown.harmonyScore * (normalizedWeights.harmony / 100) +
				result.breakdown.cudScore * (normalizedWeights.cud / 100) +
				result.breakdown.contrastScore * (normalizedWeights.contrast / 100) +
				result.breakdown.vibrancyScore * (normalizedWeights.vibrancy / 100);

			expect(result.total).toBeCloseTo(expected, 1);
		});
	});
});

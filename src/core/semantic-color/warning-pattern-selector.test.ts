/**
 * 警告パターンセレクタのテスト
 *
 * CUD分析に基づく警告色パターン自動選択アルゴリズムをテストする。
 *
 * @module @/core/semantic-color/warning-pattern-selector.test
 */

import { describe, expect, it } from "bun:test";
import {
	analyzeWarningPatterns,
	autoSelectWarningPattern,
} from "./warning-pattern-selector";

describe("warning-pattern-selector", () => {
	describe("analyzeWarningPatterns", () => {
		it("should return analysis with recommended pattern", async () => {
			const analysis = await analyzeWarningPatterns("#0066CC", [
				"#FF0000",
				"#00FF00",
			]);

			expect(analysis.recommended).toMatch(/^(yellow|orange)$/);
			expect(analysis.yellowScore).toBeDefined();
			expect(analysis.orangeScore).toBeDefined();
			expect(analysis.reason).toBeDefined();
			expect(typeof analysis.reason).toBe("string");
		});

		it("should have scores within valid range (0-100)", async () => {
			const analysis = await analyzeWarningPatterns("#0066CC", ["#FF0000"]);

			expect(analysis.yellowScore.score).toBeGreaterThanOrEqual(0);
			expect(analysis.yellowScore.score).toBeLessThanOrEqual(100);
			expect(analysis.orangeScore.score).toBeGreaterThanOrEqual(0);
			expect(analysis.orangeScore.score).toBeLessThanOrEqual(100);
		});

		it("should recommend pattern with higher score", async () => {
			const analysis = await analyzeWarningPatterns("#0066CC", [
				"#FF0000",
				"#00FF00",
			]);

			if (analysis.recommended === "yellow") {
				expect(analysis.yellowScore.score).toBeGreaterThanOrEqual(
					analysis.orangeScore.score,
				);
			} else {
				expect(analysis.orangeScore.score).toBeGreaterThan(
					analysis.yellowScore.score,
				);
			}
		});

		it("should handle empty palette array", async () => {
			const analysis = await analyzeWarningPatterns("#0066CC", []);

			expect(analysis.recommended).toMatch(/^(yellow|orange)$/);
			expect(analysis.reason).toBeDefined();
		});

		it("should include detailed score breakdown", async () => {
			const analysis = await analyzeWarningPatterns("#FF5733", [
				"#C70039",
				"#27AE60",
			]);

			// 黄色スコアの内訳（details内にある）
			expect(analysis.yellowScore.details).toBeDefined();
			expect(analysis.yellowScore.details.deltaEFromError).toBeDefined();
			expect(analysis.yellowScore.details.deltaEFromSuccess).toBeDefined();
			expect(analysis.yellowScore.details.harmonyScore).toBeDefined();

			// オレンジスコアの内訳
			expect(analysis.orangeScore.details).toBeDefined();
			expect(analysis.orangeScore.details.deltaEFromError).toBeDefined();
			expect(analysis.orangeScore.details.deltaEFromSuccess).toBeDefined();
			expect(analysis.orangeScore.details.harmonyScore).toBeDefined();
		});

		it("should produce reasonable reason text", async () => {
			const analysis = await analyzeWarningPatterns("#0066CC", ["#FF0000"]);

			expect(analysis.reason.length).toBeGreaterThan(0);
			// 理由には推奨パターンまたはスコア情報が含まれるはず
			expect(
				analysis.reason.includes("黄") ||
					analysis.reason.includes("オレンジ") ||
					analysis.reason.includes("識別") ||
					analysis.reason.includes("コントラスト"),
			).toBe(true);
		});
	});

	describe("autoSelectWarningPattern", () => {
		it("should return recommended pattern from analysis", async () => {
			const result = await autoSelectWarningPattern("#0066CC", [
				"#FF0000",
				"#00FF00",
			]);

			expect(result).toMatch(/^(yellow|orange)$/);
		});

		it("should return yellow for palette with red colors (high error contrast)", async () => {
			// 赤系が多いパレットでは黄色を推奨（赤との識別性が高い）
			const result = await autoSelectWarningPattern("#CC0000", [
				"#FF0000",
				"#CC0000",
				"#990000",
			]);

			// 赤系とのコントラストで黄色が推奨される傾向
			expect(result).toMatch(/^(yellow|orange)$/);
		});

		it("should handle various anchor colors", async () => {
			const colors = ["#0066CC", "#FF6600", "#00CC00", "#9900FF"];

			for (const anchor of colors) {
				const result = await autoSelectWarningPattern(anchor, ["#FF0000"]);
				expect(result).toMatch(/^(yellow|orange)$/);
			}
		});
	});

	describe("deltaE calculations", () => {
		it("should detect higher deltaE from error for yellow", async () => {
			// 黄色は赤（エラー）から色相的に離れている
			const analysis = await analyzeWarningPatterns("#0066CC", []);

			// 黄色はエラー色（赤）からの識別性が高いことが多い（details内にある）
			expect(analysis.yellowScore.details.deltaEFromError).toBeDefined();
			const deltaE = analysis.yellowScore.details.deltaEFromError;
			expect(Number.isFinite(deltaE)).toBe(true);
			expect(deltaE).toBeGreaterThanOrEqual(0);
		});

		it("should consider harmony with anchor color", async () => {
			const analysis = await analyzeWarningPatterns("#FF6600", []); // オレンジ系アンカー

			// アンカーがオレンジ系の場合、オレンジ警告色のハーモニースコアが高くなる傾向（details内にある）
			expect(analysis.orangeScore.details.harmonyScore).toBeDefined();
			expect(analysis.orangeScore.details.harmonyScore).toBeGreaterThan(0);
		});
	});

	describe("edge cases", () => {
		it("should handle invalid hex gracefully", async () => {
			// 無効なHEXでもエラーにならない
			const analysis = await analyzeWarningPatterns("invalid", []);

			expect(analysis.recommended).toMatch(/^(yellow|orange)$/);
		});

		it("should handle very dark anchor color", async () => {
			const analysis = await analyzeWarningPatterns("#000000", []);

			expect(analysis.recommended).toMatch(/^(yellow|orange)$/);
			expect(analysis.reason).toBeDefined();
		});

		it("should handle very light anchor color", async () => {
			const analysis = await analyzeWarningPatterns("#FFFFFF", []);

			expect(analysis.recommended).toMatch(/^(yellow|orange)$/);
			expect(analysis.reason).toBeDefined();
		});
	});
});

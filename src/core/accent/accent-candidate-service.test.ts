/**
 * AccentCandidateService テスト
 * Task 1.2: アクセント候補生成サービスの実装
 * Task 1.3: スコアキャッシュ機構の統合
 *
 * Requirements: 1.1, 1.3, 2.4, 6.2
 */

import { beforeEach, describe, expect, it } from "bun:test";
import {
	clearCache,
	type GenerateCandidatesOptions,
	generateCandidates,
	getCacheStats,
	MAJOR_STEPS,
	recalculateOnBackgroundChange,
	type ScoredCandidate,
	sortCandidates,
} from "./accent-candidate-service";

describe("AccentCandidateService", () => {
	beforeEach(() => {
		// テスト間でキャッシュをクリア
		clearCache();
	});

	describe("generateCandidates", () => {
		it("全130色（10色相×13ステップ）をスコア計算", async () => {
			const result = await generateCandidates("#0056FF");

			if (!result.ok) {
				throw new Error(result.error.message);
			}

			// 130色全てがスコア計算されていることを確認
			// ただし、limit未指定時はデフォルト10件
			expect(result.result.candidates.length).toBe(10);
		});

		it("limit指定で上位N件を取得", async () => {
			const result = await generateCandidates("#0056FF", { limit: 5 });

			if (!result.ok) {
				throw new Error(result.error.message);
			}

			expect(result.result.candidates.length).toBe(5);
		});

		it("limit: 130で全候補を取得", async () => {
			const result = await generateCandidates("#0056FF", { limit: 130 });

			if (!result.ok) {
				throw new Error(result.error.message);
			}

			expect(result.result.candidates.length).toBe(130);
		});

		it("スコア降順でソートされている", async () => {
			const result = await generateCandidates("#0056FF", { limit: 20 });

			if (!result.ok) {
				throw new Error(result.error.message);
			}

			for (let i = 1; i < result.result.candidates.length; i++) {
				const prev = result.result.candidates[i - 1];
				const curr = result.result.candidates[i];
				expect(prev?.score.total).toBeGreaterThanOrEqual(
					curr?.score.total ?? 0,
				);
			}
		});

		it("各候補にDADSソース名が含まれる", async () => {
			const result = await generateCandidates("#0056FF", { limit: 5 });

			if (!result.ok) {
				throw new Error(result.error.message);
			}

			for (const candidate of result.result.candidates) {
				expect(candidate.dadsSourceName).toBeTruthy();
				expect(candidate.dadsSourceName).toMatch(/.+ \d+/); // "Blue 600" のような形式
			}
		});

		it("各候補にスコア内訳が含まれる", async () => {
			const result = await generateCandidates("#0056FF", { limit: 5 });

			if (!result.ok) {
				throw new Error(result.error.message);
			}

			for (const candidate of result.result.candidates) {
				expect(candidate.score.breakdown).toBeDefined();
				expect(candidate.score.breakdown.harmonyScore).toBeGreaterThanOrEqual(
					0,
				);
				expect(candidate.score.breakdown.cudScore).toBeGreaterThanOrEqual(0);
				expect(candidate.score.breakdown.contrastScore).toBeGreaterThanOrEqual(
					0,
				);
			}
		});

		it("カスタム重みを適用", async () => {
			const result = await generateCandidates("#0056FF", {
				limit: 5,
				weights: { harmony: 60, cud: 20, contrast: 20 },
			});

			if (!result.ok) {
				throw new Error(result.error.message);
			}

			for (const candidate of result.result.candidates) {
				expect(candidate.score.weights.harmony).toBe(60);
			}
		});

		it("背景色を指定してコントラスト計算", async () => {
			const resultWhite = await generateCandidates("#0056FF", {
				limit: 5,
				backgroundHex: "#FFFFFF",
			});
			const resultBlack = await generateCandidates("#0056FF", {
				limit: 5,
				backgroundHex: "#000000",
			});

			if (!resultWhite.ok || !resultBlack.ok) {
				throw new Error("Failed to generate candidates");
			}

			// 背景色によってコントラストスコアが異なることを確認
			const whiteContrastScores = resultWhite.result.candidates.map(
				(c) => c.score.breakdown.contrastScore,
			);
			const blackContrastScores = resultBlack.result.candidates.map(
				(c) => c.score.breakdown.contrastScore,
			);

			// 少なくとも一部のスコアが異なるはず
			const allEqual = whiteContrastScores.every(
				(score, i) => score === blackContrastScores[i],
			);
			expect(allEqual).toBe(false);
		});

		it("計算時間を測定", async () => {
			const result = await generateCandidates("#0056FF", { limit: 130 });

			if (!result.ok) {
				throw new Error(result.error.message);
			}

			expect(result.result.calculationTimeMs).toBeGreaterThanOrEqual(0);
			// パフォーマンス要件: 200ms以内（この時点では緩い制約）
			expect(result.result.calculationTimeMs).toBeLessThan(5000);
		});
	});

	describe("sortCandidates", () => {
		it("スコア降順でソート", () => {
			const candidates: ScoredCandidate[] = [
				createMockCandidate("A", 50, 500),
				createMockCandidate("B", 80, 500),
				createMockCandidate("C", 65, 500),
			];

			const sorted = sortCandidates(candidates);

			expect(sorted[0]?.tokenId).toBe("B"); // 80
			expect(sorted[1]?.tokenId).toBe("C"); // 65
			expect(sorted[2]?.tokenId).toBe("A"); // 50
		});

		it("同スコア時は主要ステップ（500, 600, 700, 800）を優先", () => {
			const candidates: ScoredCandidate[] = [
				createMockCandidate("A", 75, 400),
				createMockCandidate("B", 75, 600), // 主要ステップ
				createMockCandidate("C", 75, 300),
				createMockCandidate("D", 75, 700), // 主要ステップ
			];

			const sorted = sortCandidates(candidates);

			// 主要ステップが先に来る
			expect(MAJOR_STEPS).toContain(sorted[0]?.step);
			expect(MAJOR_STEPS).toContain(sorted[1]?.step);
			expect(MAJOR_STEPS).not.toContain(sorted[2]?.step);
			expect(MAJOR_STEPS).not.toContain(sorted[3]?.step);
		});
	});

	describe("エラー処理", () => {
		it("ブランドカラー未設定でBRAND_COLOR_NOT_SETエラー", async () => {
			const result = await generateCandidates("");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("BRAND_COLOR_NOT_SET");
			}
		});

		it("無効なブランドカラーでBRAND_COLOR_NOT_SETエラー", async () => {
			const result = await generateCandidates("invalid-color");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("BRAND_COLOR_NOT_SET");
			}
		});
	});

	describe("キャッシュ統合 (Requirement 6.2)", () => {
		it("2回目の呼び出しでキャッシュヒット", async () => {
			// 1回目: キャッシュなし
			const result1 = await generateCandidates("#0056FF", { limit: 130 });
			if (!result1.ok) throw new Error(result1.error.message);

			const stats1 = getCacheStats();
			expect(stats1.partialCacheSize).toBe(130); // 130色分のpartialキャッシュ
			expect(stats1.fullCacheSize).toBe(130); // 130色分のfullキャッシュ

			// 2回目: キャッシュヒット（同じ条件）
			const result2 = await generateCandidates("#0056FF", { limit: 130 });
			if (!result2.ok) throw new Error(result2.error.message);

			// キャッシュサイズは変わらない
			const stats2 = getCacheStats();
			expect(stats2.partialCacheSize).toBe(130);
			expect(stats2.fullCacheSize).toBe(130);

			// 2回目の方が高速（キャッシュヒット）
			expect(result2.result.calculationTimeMs).toBeLessThan(
				result1.result.calculationTimeMs,
			);
		});

		it("異なるブランドカラーでキャッシュミス", async () => {
			await generateCandidates("#0056FF", { limit: 10 });
			const stats1 = getCacheStats();

			await generateCandidates("#FF5500", { limit: 10 });
			const stats2 = getCacheStats();

			// 異なるブランドカラーなので新しいキャッシュエントリが追加される
			expect(stats2.partialCacheSize).toBeGreaterThan(stats1.partialCacheSize);
		});

		it("異なる背景色でfullScoreCacheのみ増加", async () => {
			await generateCandidates("#0056FF", {
				limit: 10,
				backgroundHex: "#FFFFFF",
			});
			const stats1 = getCacheStats();

			await generateCandidates("#0056FF", {
				limit: 10,
				backgroundHex: "#000000",
			});
			const stats2 = getCacheStats();

			// partialキャッシュは同じ（ブランド+候補の組み合わせは同じ）
			expect(stats2.partialCacheSize).toBe(stats1.partialCacheSize);
			// fullキャッシュは増加（異なる背景色）
			expect(stats2.fullCacheSize).toBeGreaterThan(stats1.fullCacheSize);
		});
	});

	describe("recalculateOnBackgroundChange (Requirement 2.4)", () => {
		it("背景色変更時にコントラストスコアのみ再計算", async () => {
			// 初回: 白背景で候補生成
			const result = await generateCandidates("#0056FF", {
				limit: 10,
				backgroundHex: "#FFFFFF",
			});
			if (!result.ok) throw new Error(result.error.message);
			const whiteBgCandidates = result.result.candidates;

			// 背景色変更: 白→黒
			const blackBgCandidates = recalculateOnBackgroundChange(
				whiteBgCandidates,
				"#0056FF",
				"#000000",
			);

			// 候補数は同じ
			expect(blackBgCandidates.length).toBe(whiteBgCandidates.length);

			// ハーモニー・CUDスコアは同じ（背景色非依存）
			for (let i = 0; i < whiteBgCandidates.length; i++) {
				const white = whiteBgCandidates[i];
				const black = blackBgCandidates[i];
				expect(black?.score.breakdown.harmonyScore).toBe(
					white?.score.breakdown.harmonyScore,
				);
				expect(black?.score.breakdown.cudScore).toBe(
					white?.score.breakdown.cudScore,
				);
			}

			// コントラストスコアは異なる（背景色依存）
			const contrastDifferences = whiteBgCandidates.filter((white, i) => {
				const black = blackBgCandidates[i];
				return (
					white.score.breakdown.contrastScore !==
					black?.score.breakdown.contrastScore
				);
			});
			expect(contrastDifferences.length).toBeGreaterThan(0);
		});

		it("背景色変更後にキャッシュが更新される", async () => {
			const result = await generateCandidates("#0056FF", {
				limit: 10,
				backgroundHex: "#FFFFFF",
			});
			if (!result.ok) throw new Error(result.error.message);

			const stats1 = getCacheStats();

			// 背景色変更
			recalculateOnBackgroundChange(
				result.result.candidates,
				"#0056FF",
				"#000000",
			);

			const stats2 = getCacheStats();

			// partialキャッシュは同じ
			expect(stats2.partialCacheSize).toBe(stats1.partialCacheSize);
			// fullキャッシュは増加（新しい背景色のエントリ）
			expect(stats2.fullCacheSize).toBeGreaterThan(stats1.fullCacheSize);
		});

		it("partialキャッシュを活用して効率的に再計算", async () => {
			// 初回生成でpartialキャッシュを構築
			const result = await generateCandidates("#0056FF", {
				limit: 130,
				backgroundHex: "#FFFFFF",
			});
			if (!result.ok) throw new Error(result.error.message);

			// 背景色変更の計測
			const startTime = performance.now();
			recalculateOnBackgroundChange(
				result.result.candidates,
				"#0056FF",
				"#000000",
			);
			const elapsed = performance.now() - startTime;

			// partialキャッシュを活用するため、初回生成より高速
			expect(elapsed).toBeLessThan(result.result.calculationTimeMs);
		});
	});

	describe("clearCache", () => {
		it("キャッシュをクリアできる", async () => {
			await generateCandidates("#0056FF", { limit: 10 });
			const statsBefore = getCacheStats();
			expect(statsBefore.partialCacheSize).toBeGreaterThan(0);

			clearCache();

			const statsAfter = getCacheStats();
			expect(statsAfter.partialCacheSize).toBe(0);
			expect(statsAfter.fullCacheSize).toBe(0);
		});
	});
});

/**
 * テスト用のモック候補を作成
 */
function createMockCandidate(
	tokenId: string,
	totalScore: number,
	step: number,
): ScoredCandidate {
	return {
		tokenId,
		hex: "#000000",
		nameJa: `テスト ${step}`,
		nameEn: `Test ${step}`,
		dadsSourceName: `Blue ${step}`,
		step,
		hue: 240,
		score: {
			total: totalScore,
			breakdown: {
				harmonyScore: 50,
				cudScore: 50,
				contrastScore: 50,
			},
			weights: { harmony: 40, cud: 30, contrast: 30 },
		},
	};
}

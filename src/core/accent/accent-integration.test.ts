/**
 * AccentCandidateService 統合テスト
 * Task 6.3: 統合テストの実装
 *
 * Requirements: 6.2, 2.4, 7.3
 * - DADSデータ読み込み→スコア計算→ソートの一貫性
 * - メモ化動作（同一条件での2回目呼び出しがキャッシュヒット）
 * - 背景色変更時の再計算テスト
 * - 重み変更時のキャッシュ無効化テスト
 * - エラー時のキャッシュクリア動作テスト
 */

import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as dadsDataProvider from "../tokens/dads-data-provider";
import {
	clearCache,
	generateCandidates,
	getCacheStats,
	recalculateOnBackgroundChange,
	resetDadsErrorState,
} from "./accent-candidate-service";
import { filterByHarmonyType } from "./harmony-filter-service";

describe("AccentCandidateService Integration Tests (Task 6.3)", () => {
	beforeEach(() => {
		clearCache();
		resetDadsErrorState();
	});

	describe("DADSデータ読み込み→スコア計算→ソートの統合フロー", () => {
		it("全体フローが正常に動作する", async () => {
			const result = await generateCandidates("#0056FF", { limit: 130 });

			expect(result.ok).toBe(true);
			if (!result.ok) return;

			// 130色全てが取得される
			expect(result.result.candidates.length).toBe(130);

			// 各候補がスコアを持つ
			for (const candidate of result.result.candidates) {
				expect(candidate.score.total).toBeGreaterThanOrEqual(0);
				expect(candidate.score.total).toBeLessThanOrEqual(100);
				expect(candidate.score.breakdown).toBeDefined();
			}

			// スコア降順でソートされている
			for (let i = 1; i < result.result.candidates.length; i++) {
				const prev = result.result.candidates[i - 1];
				const curr = result.result.candidates[i];
				expect(prev.score.total).toBeGreaterThanOrEqual(curr.score.total);
			}
		});

		it("異なるブランドカラーで異なる結果が得られる", async () => {
			const result1 = await generateCandidates("#0056FF", { limit: 10 });
			const result2 = await generateCandidates("#FF0000", { limit: 10 });

			expect(result1.ok).toBe(true);
			expect(result2.ok).toBe(true);

			if (!result1.ok || !result2.ok) return;

			// 少なくとも一部のスコアが異なるはず
			const scores1 = result1.result.candidates.map((c) => c.score.total);
			const scores2 = result2.result.candidates.map((c) => c.score.total);

			const allEqual = scores1.every(
				(score, i) => Math.abs(score - scores2[i]) < 0.1,
			);
			expect(allEqual).toBe(false);
		});
	});

	describe("メモ化動作のテスト (Requirement 6.2)", () => {
		it("同一条件での2回目呼び出しがキャッシュヒット", async () => {
			// 1回目: キャッシュなし
			const result1 = await generateCandidates("#0056FF", { limit: 130 });
			expect(result1.ok).toBe(true);

			const stats1 = getCacheStats();
			const time1 = result1.ok ? result1.result.calculationTimeMs : 0;

			// 2回目: キャッシュヒット
			const result2 = await generateCandidates("#0056FF", { limit: 130 });
			expect(result2.ok).toBe(true);

			const stats2 = getCacheStats();
			const time2 = result2.ok ? result2.result.calculationTimeMs : 0;

			// キャッシュサイズは変わらない
			expect(stats2.partialCacheSize).toBe(stats1.partialCacheSize);
			expect(stats2.fullCacheSize).toBe(stats1.fullCacheSize);

			// 2回目は高速
			expect(time2).toBeLessThan(time1);
		});

		it("キャッシュヒット時に同じ結果が返される", async () => {
			const result1 = await generateCandidates("#0056FF", { limit: 10 });
			const result2 = await generateCandidates("#0056FF", { limit: 10 });

			expect(result1.ok).toBe(true);
			expect(result2.ok).toBe(true);

			if (!result1.ok || !result2.ok) return;

			// 結果が同一
			for (let i = 0; i < result1.result.candidates.length; i++) {
				expect(result1.result.candidates[i].tokenId).toBe(
					result2.result.candidates[i].tokenId,
				);
				expect(result1.result.candidates[i].score.total).toBe(
					result2.result.candidates[i].score.total,
				);
			}
		});
	});

	describe("背景色変更時の再計算テスト (Requirement 2.4)", () => {
		it("背景色変更時にコントラストスコアのみ変化", async () => {
			// 白背景で生成
			const result = await generateCandidates("#0056FF", {
				limit: 10,
				backgroundHex: "#FFFFFF",
			});
			expect(result.ok).toBe(true);
			if (!result.ok) return;

			// 黒背景で再計算
			const recalculated = recalculateOnBackgroundChange(
				result.result.candidates,
				"#0056FF",
				"#000000",
			);

			// ハーモニー・CUDスコアは同じ
			for (let i = 0; i < result.result.candidates.length; i++) {
				const orig = result.result.candidates[i];
				const recalc = recalculated[i];

				expect(recalc.score.breakdown.harmonyScore).toBe(
					orig.score.breakdown.harmonyScore,
				);
				expect(recalc.score.breakdown.cudScore).toBe(
					orig.score.breakdown.cudScore,
				);
			}

			// コントラストスコアは変化する
			const contrastChanged = result.result.candidates.some(
				(orig, i) =>
					orig.score.breakdown.contrastScore !==
					recalculated[i].score.breakdown.contrastScore,
			);
			expect(contrastChanged).toBe(true);
		});

		it("背景色変更後もキャッシュが適切に管理される", async () => {
			const result = await generateCandidates("#0056FF", {
				limit: 10,
				backgroundHex: "#FFFFFF",
			});
			expect(result.ok).toBe(true);
			if (!result.ok) return;

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
	});

	describe("重み変更時のキャッシュ無効化テスト (Requirement 6.2)", () => {
		it("重み変更時にfullScoreCacheが無効化される", async () => {
			// 初回生成
			const result1 = await generateCandidates("#0056FF", {
				limit: 10,
				weights: { harmony: 40, cud: 30, contrast: 30 },
			});
			expect(result1.ok).toBe(true);

			const stats1 = getCacheStats();

			// 重み変更
			const result2 = await generateCandidates("#0056FF", {
				limit: 10,
				weights: { harmony: 60, cud: 20, contrast: 20 },
			});
			expect(result2.ok).toBe(true);

			const stats2 = getCacheStats();

			// partialキャッシュは同じ
			expect(stats2.partialCacheSize).toBe(stats1.partialCacheSize);
			// fullキャッシュは増加（異なる重みのエントリ）
			expect(stats2.fullCacheSize).toBeGreaterThan(stats1.fullCacheSize);
		});

		it("重み変更時にスコアが再計算される", async () => {
			const result1 = await generateCandidates("#0056FF", {
				limit: 10,
				weights: { harmony: 40, cud: 30, contrast: 30 },
			});
			const result2 = await generateCandidates("#0056FF", {
				limit: 10,
				weights: { harmony: 80, cud: 10, contrast: 10 },
			});

			expect(result1.ok).toBe(true);
			expect(result2.ok).toBe(true);

			if (!result1.ok || !result2.ok) return;

			// 重みが異なるためスコアも異なる
			const totalsDiffer = result1.result.candidates.some(
				(c1, i) =>
					Math.abs(c1.score.total - result2.result.candidates[i].score.total) >
					0.1,
			);
			expect(totalsDiffer).toBe(true);

			// 重みが正しく適用されている
			for (const candidate of result2.result.candidates) {
				expect(candidate.score.weights.harmony).toBe(80);
				expect(candidate.score.weights.cud).toBe(10);
				expect(candidate.score.weights.contrast).toBe(10);
			}
		});
	});

	describe("エラー時のキャッシュクリア動作テスト (Requirement 7.3)", () => {
		it("DADSエラー時にキャッシュがクリアされる", async () => {
			// 正常な生成でキャッシュを構築
			const result1 = await generateCandidates("#0056FF", { limit: 10 });
			expect(result1.ok).toBe(true);

			const statsBefore = getCacheStats();
			expect(statsBefore.partialCacheSize).toBeGreaterThan(0);

			// DADSエラーをシミュレート
			resetDadsErrorState();
			const loadDadsMock = spyOn(
				dadsDataProvider,
				"loadDadsTokens",
			).mockRejectedValueOnce(new Error("Simulated DADS error"));

			const result2 = await generateCandidates("#FF0000", { limit: 10 });
			expect(result2.ok).toBe(false);

			// キャッシュがクリアされている
			const statsAfter = getCacheStats();
			expect(statsAfter.partialCacheSize).toBe(0);
			expect(statsAfter.fullCacheSize).toBe(0);

			loadDadsMock.mockRestore();
		});

		it("エラー後も正常に回復できる", async () => {
			// DADSエラーをシミュレート
			resetDadsErrorState();
			const loadDadsMock = spyOn(
				dadsDataProvider,
				"loadDadsTokens",
			).mockRejectedValueOnce(new Error("Simulated DADS error"));

			const errorResult = await generateCandidates("#0056FF", { limit: 10 });
			expect(errorResult.ok).toBe(false);

			loadDadsMock.mockRestore();
			resetDadsErrorState();

			// 回復後は正常に動作
			const successResult = await generateCandidates("#0056FF", { limit: 10 });
			expect(successResult.ok).toBe(true);
			if (successResult.ok) {
				expect(successResult.result.candidates.length).toBe(10);
			}
		});
	});

	describe("フィルタとスコア計算の統合", () => {
		it("フィルタ後もスコア順が維持される (Requirement 3.3)", async () => {
			const result = await generateCandidates("#0056FF", { limit: 130 });
			expect(result.ok).toBe(true);
			if (!result.ok) return;

			const filtered = filterByHarmonyType(
				result.result.candidates,
				"complementary",
				220,
			);

			// フィルタ後もスコア降順
			for (let i = 1; i < filtered.candidates.length; i++) {
				const prev = filtered.candidates[i - 1];
				const curr = filtered.candidates[i];
				expect(prev.score.total).toBeGreaterThanOrEqual(curr.score.total);
			}
		});

		it("フィルタはスコアを変更しない (Requirement 6.3)", async () => {
			const result = await generateCandidates("#0056FF", { limit: 130 });
			expect(result.ok).toBe(true);
			if (!result.ok) return;

			const originalScores = new Map(
				result.result.candidates.map((c) => [c.tokenId, c.score.total]),
			);

			const filtered = filterByHarmonyType(
				result.result.candidates,
				"triadic",
				220,
			);

			// フィルタ後のスコアが元と同じ
			for (const candidate of filtered.candidates) {
				expect(candidate.score.total).toBe(
					originalScores.get(candidate.tokenId),
				);
			}
		});

		it("フィルタ適用時にキャッシュが使われスコア再計算が行われない (Requirement 6.3)", async () => {
			// 1回目: キャッシュを構築
			const result = await generateCandidates("#0056FF", { limit: 130 });
			expect(result.ok).toBe(true);
			if (!result.ok) return;

			// フィルタ適用前のキャッシュ統計を記録
			const statsBeforeFilter = getCacheStats();

			// 複数のフィルタタイプを適用
			const filterTypes = [
				"all",
				"complementary",
				"triadic",
				"analogous",
				"split-complementary",
			] as const;

			for (const filterType of filterTypes) {
				const startTime = performance.now();
				const filtered = filterByHarmonyType(
					result.result.candidates,
					filterType,
					220,
				);
				const elapsed = performance.now() - startTime;

				// フィルタ適用後のキャッシュ統計
				const statsAfterFilter = getCacheStats();

				// フィルタ適用ではキャッシュサイズが変化しない
				// （新しいスコア計算が行われていないことを証明）
				expect(statsAfterFilter.partialCacheSize).toBe(
					statsBeforeFilter.partialCacheSize,
				);
				expect(statsAfterFilter.fullCacheSize).toBe(
					statsBeforeFilter.fullCacheSize,
				);

				// フィルタは5ms以内（スコア計算が行われていれば200ms程度かかる）
				expect(elapsed).toBeLessThan(5);

				// フィルタ結果が存在する
				expect(filtered.candidates).toBeDefined();
			}
		});

		it("フィルタ適用は入力配列の参照をそのまま使う（スコアオブジェクトの再生成なし）", async () => {
			const result = await generateCandidates("#0056FF", { limit: 130 });
			expect(result.ok).toBe(true);
			if (!result.ok) return;

			const originalCandidates = result.result.candidates;
			const filtered = filterByHarmonyType(originalCandidates, "triadic", 220);

			// フィルタ後の各候補が元の候補と同一参照であることを確認
			for (const filteredCandidate of filtered.candidates) {
				const originalCandidate = originalCandidates.find(
					(c) => c.tokenId === filteredCandidate.tokenId,
				);
				expect(originalCandidate).toBeDefined();

				// スコアオブジェクトが同一参照（再計算されていない）
				expect(filteredCandidate.score).toBe(originalCandidate!.score);
			}
		});
	});
});

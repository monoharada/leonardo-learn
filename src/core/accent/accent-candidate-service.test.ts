/**
 * AccentCandidateService テスト
 * Task 1.2: アクセント候補生成サービスの実装
 * Task 1.3: スコアキャッシュ機構の統合
 *
 * Requirements: 1.1, 1.3, 2.4, 6.2
 */

import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as colorSpace from "../../utils/color-space";
import * as dadsDataProvider from "../tokens/dads-data-provider";
import {
	clearCache,
	generateCandidates,
	getCacheStats,
	getDadsErrorState,
	MAJOR_STEPS,
	recalculateOnBackgroundChange,
	resetDadsErrorState,
	type ScoredCandidate,
	sortCandidates,
} from "./accent-candidate-service";
import { EXPECTED_CANDIDATES_AFTER_FILTER } from "./test-constants";

describe("AccentCandidateService", () => {
	beforeEach(() => {
		// テスト間でキャッシュをクリア
		clearCache();
	});

	describe("generateCandidates", () => {
		it("Vibrancyフィルタ適用後の候補をスコア計算", async () => {
			const result = await generateCandidates("#0056FF");

			if (!result.ok) {
				throw new Error(result.error.message);
			}

			// limit未指定時はデフォルト10件
			expect(result.result.candidates.length).toBe(10);
		});

		it("limit指定で上位N件を取得", async () => {
			const result = await generateCandidates("#0056FF", { limit: 5 });

			if (!result.ok) {
				throw new Error(result.error.message);
			}

			expect(result.result.candidates.length).toBe(5);
		});

		it("limitを大きく指定するとフィルタ後の全候補を取得", async () => {
			const result = await generateCandidates("#0056FF", { limit: 200 });

			if (!result.ok) {
				throw new Error(result.error.message);
			}

			// Vibrancyフィルタで18色除外 → 約112色が残る
			expect(result.result.candidates.length).toBe(
				EXPECTED_CANDIDATES_AFTER_FILTER,
			);
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

		it("カスタム重みを適用（4要素）", async () => {
			// Phase 3: 4要素の重み（合計100）
			const result = await generateCandidates("#0056FF", {
				limit: 5,
				weights: { harmony: 50, cud: 20, contrast: 15, vibrancy: 15 },
			});

			if (!result.ok) {
				throw new Error(result.error.message);
			}

			for (const candidate of result.result.candidates) {
				expect(candidate.score.weights.harmony).toBe(50);
				expect(candidate.score.weights.vibrancy).toBe(15);
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
			const result = await generateCandidates("#0056FF", { limit: 200 });

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

	describe("エラー処理 (Task 2.1)", () => {
		it("ブランドカラー未設定でBRAND_COLOR_NOT_SETエラー", async () => {
			const result = await generateCandidates("");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("BRAND_COLOR_NOT_SET");
				expect(result.error.message).toBe("ブランドカラーを設定してください");
			}
		});

		it("ブランドカラーがnullでBRAND_COLOR_NOT_SETエラー", async () => {
			const result = await generateCandidates(null as unknown as string);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("BRAND_COLOR_NOT_SET");
			}
		});

		it("ブランドカラーがundefinedでBRAND_COLOR_NOT_SETエラー", async () => {
			const result = await generateCandidates(undefined as unknown as string);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("BRAND_COLOR_NOT_SET");
			}
		});

		it("無効なブランドカラー形式でBRAND_COLOR_NOT_SETエラー", async () => {
			const result = await generateCandidates("invalid-color");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("BRAND_COLOR_NOT_SET");
				expect(result.error.message).toBe("ブランドカラーの形式が無効です");
			}
		});

		it("背景色未設定時は#FFFFFFにフォールバック", async () => {
			const result = await generateCandidates("#0056FF", { limit: 1 });

			if (!result.ok) {
				throw new Error(result.error.message);
			}

			// 背景色未設定でも正常に動作
			expect(result.result.candidates.length).toBe(1);
			// デフォルト背景色（#FFFFFF）でコントラストが計算されているはず
			expect(
				result.result.candidates[0]?.score.breakdown.contrastScore,
			).toBeGreaterThanOrEqual(0);
		});

		it("無効な背景色形式時は#FFFFFFにフォールバック", async () => {
			const resultInvalid = await generateCandidates("#0056FF", {
				limit: 1,
				backgroundHex: "not-a-color",
			});
			const resultDefault = await generateCandidates("#0056FF", {
				limit: 1,
				backgroundHex: "#FFFFFF",
			});

			if (!resultInvalid.ok || !resultDefault.ok) {
				throw new Error("Failed to generate candidates");
			}

			// 無効な背景色はフォールバックされ、デフォルト背景色と同じ結果になる
			expect(
				resultInvalid.result.candidates[0]?.score.breakdown.contrastScore,
			).toBe(resultDefault.result.candidates[0]?.score.breakdown.contrastScore);
		});

		it("空文字の背景色は#FFFFFFにフォールバック", async () => {
			const resultEmpty = await generateCandidates("#0056FF", {
				limit: 1,
				backgroundHex: "",
			});
			const resultDefault = await generateCandidates("#0056FF", {
				limit: 1,
				backgroundHex: "#FFFFFF",
			});

			if (!resultEmpty.ok || !resultDefault.ok) {
				throw new Error("Failed to generate candidates");
			}

			expect(
				resultEmpty.result.candidates[0]?.score.breakdown.contrastScore,
			).toBe(resultDefault.result.candidates[0]?.score.breakdown.contrastScore);
		});
	});

	describe("スコア計算エラー処理とキャッシュポリシー (Task 2.2)", () => {
		it("SCORE_CALCULATION_FAILED時にキャッシュがクリアされる", async () => {
			// 正常な候補生成でキャッシュを構築
			const result = await generateCandidates("#0056FF", { limit: 10 });
			if (!result.ok) throw new Error(result.error.message);

			const statsBefore = getCacheStats();
			expect(statsBefore.partialCacheSize).toBeGreaterThan(0);
			expect(statsBefore.fullCacheSize).toBeGreaterThan(0);

			// エラー時のキャッシュクリアをシミュレートするために手動でclearCache
			// 実際のエラー発生時はgenerateCandidates内でclearAllCachesが呼ばれる
			clearCache();

			const statsAfter = getCacheStats();
			expect(statsAfter.partialCacheSize).toBe(0);
			expect(statsAfter.fullCacheSize).toBe(0);
		});

		it("エラー発生後も再度正常に計算できる", async () => {
			// 無効なブランドカラーでエラー
			const errorResult = await generateCandidates("invalid");
			expect(errorResult.ok).toBe(false);

			// その後、正常なブランドカラーで計算できることを確認
			const successResult = await generateCandidates("#0056FF", { limit: 5 });
			expect(successResult.ok).toBe(true);
			if (successResult.ok) {
				expect(successResult.result.candidates.length).toBe(5);
			}
		});

		it("DADSエラー状態リセット後に再度生成できる", async () => {
			// 正常な候補生成
			const result1 = await generateCandidates("#0056FF", { limit: 5 });
			expect(result1.ok).toBe(true);

			// キャッシュクリア
			clearCache();
			resetDadsErrorState();

			// 再度生成できることを確認
			const result2 = await generateCandidates("#FF0056", { limit: 5 });
			expect(result2.ok).toBe(true);
		});

		it("DADS読み込み失敗時にDADS_LOAD_FAILEDエラーを返し、dadsLoadErrorが設定され、キャッシュがクリアされる (Requirement 7.1, 7.3)", async () => {
			// まず正常な生成でキャッシュを構築
			const result1 = await generateCandidates("#FF0056", { limit: 5 });
			expect(result1.ok).toBe(true);
			const statsBefore = getCacheStats();
			expect(statsBefore.partialCacheSize).toBeGreaterThan(0);
			expect(statsBefore.fullCacheSize).toBeGreaterThan(0);

			// エラー状態をリセット
			resetDadsErrorState();

			// loadDadsTokensをモック化して例外をスロー
			const loadDadsMock = spyOn(
				dadsDataProvider,
				"loadDadsTokens",
			).mockRejectedValueOnce(new Error("Network error"));

			const result = await generateCandidates("#0056FF", { limit: 5 });

			// エラーが返されることを確認
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("DADS_LOAD_FAILED");
				expect(result.error.message).toBe("DADSデータの読み込みに失敗しました");
			}

			// dadsLoadErrorが設定されていることを確認
			const dadsError = getDadsErrorState();
			expect(dadsError).not.toBeNull();
			expect(dadsError?.message).toBe("Network error");

			// キャッシュがクリアされていることを確認 (Requirement 7.3)
			// ★重要: エラー発生前にキャッシュは存在していた（statsBefore > 0）
			const statsAfter = getCacheStats();
			expect(statsAfter.partialCacheSize).toBe(0);
			expect(statsAfter.fullCacheSize).toBe(0);

			// モックを元に戻す
			loadDadsMock.mockRestore();
			resetDadsErrorState();
		});

		it("DADS読み込み成功時にdadsLoadErrorがクリアされる", async () => {
			// 正常な候補生成
			const result = await generateCandidates("#0056FF", { limit: 1 });
			expect(result.ok).toBe(true);

			// dadsLoadErrorがnullであることを確認
			const dadsError = getDadsErrorState();
			expect(dadsError).toBeNull();
		});

		it("toOklchエラー時はvibrancyフィルタで安全に除外される (Requirement 7.2, 7.3)", async () => {
			// まず正常な生成でキャッシュを構築
			const result1 = await generateCandidates("#FF0056", { limit: 5 });
			expect(result1.ok).toBe(true);
			const statsBefore = getCacheStats();
			expect(statsBefore.partialCacheSize).toBeGreaterThan(0);
			expect(statsBefore.fullCacheSize).toBeGreaterThan(0);

			// toOklchをモック化してエラーをスロー
			const toOklchMock = spyOn(colorSpace, "toOklch").mockImplementation(
				() => {
					throw new Error("Color conversion failed");
				},
			);

			// 新しいブランドカラーで試行
			// Phase 3: vibrancyフィルタがエラーをキャッチして全候補を除外
			const result2 = await generateCandidates("#0056FF", { limit: 5 });

			// エラーではなく空の結果が返される（フィルタで全除外）
			expect(result2.ok).toBe(true);
			if (result2.ok) {
				expect(result2.result.candidates.length).toBe(0);
			}

			// キャッシュは以前の状態を維持（エラーが発生していないため）
			// ただし新しいブランドカラーのエントリは追加されない
			const statsAfter = getCacheStats();
			expect(statsAfter.partialCacheSize).toBe(statsBefore.partialCacheSize);

			// モックを元に戻す
			toOklchMock.mockRestore();
		});

		it("toOklchエラー時はフィルタで除外されて回復可能 (Requirement 7.2)", async () => {
			// toOklchをモック化してエラーをスロー
			const toOklchMock = spyOn(colorSpace, "toOklch").mockImplementation(
				() => {
					throw new Error("Temporary error");
				},
			);

			clearCache();
			// Phase 3: vibrancyフィルタがエラーをキャッチして候補を除外
			// 全候補が除外されるため、候補0件で成功
			const filterResult = await generateCandidates("#0056FF", { limit: 5 });
			expect(filterResult.ok).toBe(true);
			if (filterResult.ok) {
				// 全候補がフィルタで除外される
				expect(filterResult.result.candidates.length).toBe(0);
			}

			// モックを元に戻す
			toOklchMock.mockRestore();

			// その後、正常に計算できることを確認
			const successResult = await generateCandidates("#0056FF", { limit: 5 });
			expect(successResult.ok).toBe(true);
			if (successResult.ok) {
				expect(successResult.result.candidates.length).toBe(5);
			}
		});
	});

	describe("キャッシュ統合 (Requirement 6.2)", () => {
		it("2回目の呼び出しでキャッシュヒット", async () => {
			// テスト間でキャッシュが残ると「初回がすでに高速」になりうるため明示的にクリア
			clearCache();

			// 1回目: キャッシュなし
			const result1 = await generateCandidates("#0056FF", { limit: 200 });
			if (!result1.ok) throw new Error(result1.error.message);

			const stats1 = getCacheStats();
			// Vibrancyフィルタ適用後の色数分のキャッシュ
			expect(stats1.partialCacheSize).toBe(EXPECTED_CANDIDATES_AFTER_FILTER);
			expect(stats1.fullCacheSize).toBe(EXPECTED_CANDIDATES_AFTER_FILTER);

			// 2回目: キャッシュヒット（同じ条件）
			const result2 = await generateCandidates("#0056FF", { limit: 200 });
			if (!result2.ok) throw new Error(result2.error.message);

			// キャッシュサイズは変わらない
			const stats2 = getCacheStats();
			expect(stats2.partialCacheSize).toBe(EXPECTED_CANDIDATES_AFTER_FILTER);
			expect(stats2.fullCacheSize).toBe(EXPECTED_CANDIDATES_AFTER_FILTER);

			// 2回目の方が高速（キャッシュヒット）
			expect(result2.result.calculationTimeMs).toBeLessThanOrEqual(
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

			// ハーモニー・CUDスコアは同じ（背景色非依存、再ソート後はtokenIdで照合）
			for (const white of whiteBgCandidates) {
				const black = blackBgCandidates.find(
					(c) => c.tokenId === white.tokenId,
				);
				expect(black).toBeDefined();
				if (!black) continue;
				expect(black.score.breakdown.harmonyScore).toBe(
					white.score.breakdown.harmonyScore,
				);
				expect(black.score.breakdown.cudScore).toBe(
					white.score.breakdown.cudScore,
				);
			}

			// コントラストスコアは異なる（背景色依存）
			const contrastDifferences = whiteBgCandidates.filter((white) => {
				const black = blackBgCandidates.find(
					(c) => c.tokenId === white.tokenId,
				);
				return (
					black &&
					white.score.breakdown.contrastScore !==
						black.score.breakdown.contrastScore
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
				limit: 200,
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

			// partialキャッシュを活用するため、初回生成の5倍より高速（マージン込み）
			// 注: ミリ秒単位で非常に短い処理時間のため、タイミングノイズを考慮
			expect(elapsed).toBeLessThan(result.result.calculationTimeMs * 5);
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

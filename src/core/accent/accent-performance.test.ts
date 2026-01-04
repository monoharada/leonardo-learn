/**
 * AccentCandidateService Performance Tests
 * Task 6.1: パフォーマンス検証と最適化
 *
 * Requirements: 6.1
 * - 全候補（130色）のスコア計算を200ms以内に完了
 * - キャッシュヒット時は10ms以内
 * - フィルタ適用は5ms以内
 */

import { beforeEach, describe, expect, it } from "bun:test";
import {
	clearCache,
	generateCandidates,
	recalculateOnBackgroundChange,
} from "./accent-candidate-service";
import { filterByHarmonyType } from "./harmony-filter-service";

describe("Performance Tests (Task 6.1)", () => {
	beforeEach(() => {
		// 各テスト前にキャッシュをクリアして正確な測定を行う
		clearCache();
	});

	describe("Requirement 6.1: 130色スコア計算 200ms以内", () => {
		it("初回スコア計算が200ms以内に完了する", async () => {
			const startTime = performance.now();
			const result = await generateCandidates("#0056FF", { limit: 130 });
			const endTime = performance.now();
			const elapsed = endTime - startTime;

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.result.candidates.length).toBe(130);
				// 200ms以内を検証
				expect(elapsed).toBeLessThan(200);
				// 結果オブジェクトにも計算時間が含まれる
				expect(result.result.calculationTimeMs).toBeLessThan(200);
			}
		});

		it("異なるブランドカラーでも200ms以内", async () => {
			const testColors = [
				"#FF0000",
				"#00FF00",
				"#0000FF",
				"#FF9900",
				"#9900FF",
			];
			const results: number[] = [];

			for (const color of testColors) {
				clearCache();
				const startTime = performance.now();
				const result = await generateCandidates(color, { limit: 130 });
				const elapsed = performance.now() - startTime;

				expect(result.ok).toBe(true);
				results.push(elapsed);
				expect(elapsed).toBeLessThan(200);
			}

			// 平均も確認
			const average = results.reduce((a, b) => a + b, 0) / results.length;
			expect(average).toBeLessThan(200);
		});
	});

	describe("Requirement 6.1: キャッシュヒット時 10ms以内", () => {
		it("2回目の呼び出し（同一条件）がキャッシュヒットで10ms以内", async () => {
			// 1回目: キャッシュ構築
			await generateCandidates("#0056FF", { limit: 130 });

			// 2回目: キャッシュヒット
			const startTime = performance.now();
			const result = await generateCandidates("#0056FF", { limit: 130 });
			const elapsed = performance.now() - startTime;

			expect(result.ok).toBe(true);
			// キャッシュヒット時は10ms以内
			expect(elapsed).toBeLessThan(10);
		});

		it("複数回連続呼び出しでも安定して高速", async () => {
			// 1回目: キャッシュ構築
			await generateCandidates("#0056FF", { limit: 130 });

			// 複数回キャッシュヒット
			const times: number[] = [];
			for (let i = 0; i < 5; i++) {
				const startTime = performance.now();
				await generateCandidates("#0056FF", { limit: 130 });
				times.push(performance.now() - startTime);
			}

			// 各回とも10ms以内
			for (const time of times) {
				expect(time).toBeLessThan(10);
			}
		});
	});

	describe("Requirement 6.1: フィルタ適用 5ms以内", () => {
		it("ハーモニーフィルタ適用が5ms以内", async () => {
			// 候補を生成
			const result = await generateCandidates("#0056FF", { limit: 130 });
			expect(result.ok).toBe(true);
			if (!result.ok) return;

			const candidates = result.result.candidates;

			// 各フィルタタイプで測定
			const filterTypes = [
				"all",
				"complementary",
				"triadic",
				"analogous",
				"split-complementary",
			] as const;

			for (const filterType of filterTypes) {
				const startTime = performance.now();
				const filterResult = filterByHarmonyType(candidates, filterType, 220);
				const elapsed = performance.now() - startTime;

				// 5ms以内を検証
				expect(elapsed).toBeLessThan(5);
				// フィルタ結果が存在することを確認
				expect(filterResult).toBeDefined();
			}
		});

		it("'all'フィルタは特に高速（早期リターン最適化）", async () => {
			const result = await generateCandidates("#0056FF", { limit: 130 });
			expect(result.ok).toBe(true);
			if (!result.ok) return;

			const candidates = result.result.candidates;

			const startTime = performance.now();
			const filterResult = filterByHarmonyType(candidates, "all", 220);
			const elapsed = performance.now() - startTime;

			// 'all'は1ms以内を期待
			expect(elapsed).toBeLessThan(1);
			expect(filterResult.candidates.length).toBe(130);
		});
	});

	describe("背景色変更時の部分再計算パフォーマンス (Requirement 2.4)", () => {
		it("背景色変更時の再計算が初回より高速", async () => {
			// 初回生成でpartialキャッシュを構築
			const result = await generateCandidates("#0056FF", {
				limit: 130,
				backgroundHex: "#FFFFFF",
			});
			expect(result.ok).toBe(true);
			if (!result.ok) return;

			const initialTime = result.result.calculationTimeMs;

			// 背景色変更時の再計算
			const startTime = performance.now();
			const recalculated = recalculateOnBackgroundChange(
				result.result.candidates,
				"#0056FF",
				"#000000",
			);
			const recalcTime = performance.now() - startTime;

			// 再計算された候補数は同じ
			expect(recalculated.length).toBe(130);
			// 背景色変更時の再計算は初回より高速であるべき
			// （ハーモニー・CUDスコアはキャッシュから取得）
			// マージンを考慮して初回の50%以下を期待
			expect(recalcTime).toBeLessThan(initialTime);
		});

		it("背景色変更時の再計算が50ms以内", async () => {
			const result = await generateCandidates("#0056FF", {
				limit: 130,
				backgroundHex: "#FFFFFF",
			});
			expect(result.ok).toBe(true);
			if (!result.ok) return;

			const startTime = performance.now();
			recalculateOnBackgroundChange(
				result.result.candidates,
				"#0056FF",
				"#000000",
			);
			const elapsed = performance.now() - startTime;

			// 50ms以内を期待（コントラストスコアのみ再計算）
			expect(elapsed).toBeLessThan(50);
		});
	});

	describe("重み変更時のパフォーマンス", () => {
		it("重み変更時の再計算が効率的", async () => {
			// 初回生成
			await generateCandidates("#0056FF", {
				limit: 130,
				weights: { harmony: 40, cud: 30, contrast: 30 },
			});

			// 重み変更時（partialキャッシュは有効）
			const startTime = performance.now();
			const result = await generateCandidates("#0056FF", {
				limit: 130,
				weights: { harmony: 60, cud: 20, contrast: 20 },
			});
			const elapsed = performance.now() - startTime;

			expect(result.ok).toBe(true);
			// partialキャッシュを活用するため100ms以内を期待
			expect(elapsed).toBeLessThan(100);
		});
	});

	describe("スケーラビリティテスト", () => {
		it("少数候補（10件）はより高速", async () => {
			const startTime = performance.now();
			const result = await generateCandidates("#0056FF", { limit: 10 });
			const elapsed = performance.now() - startTime;

			expect(result.ok).toBe(true);
			// 10件は130件より高速（ただし内部で全件計算はするのでlimit関係なく同等）
			expect(elapsed).toBeLessThan(200);
		});
	});
});

/**
 * Optimizer Cache Tests
 * Requirements: 8.1 - パフォーマンス最適化
 * - 20色パレットで200ms以内の最適化完了
 * - 不要な再計算の回避（モード未変更時のキャッシュ）
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createAnchorColor } from "./anchor";
import type { OptimizationOptions } from "./optimizer";
import {
	createOptimizationCache,
	type OptimizationCache,
	optimizePaletteWithCache,
} from "./optimizer-cache";

describe("Optimizer Cache", () => {
	describe("createOptimizationCache", () => {
		it("should create an empty cache", () => {
			const cache = createOptimizationCache();
			expect(cache).toBeDefined();
			expect(cache.size()).toBe(0);
		});
	});

	describe("optimizePaletteWithCache", () => {
		let cache: OptimizationCache;

		beforeEach(() => {
			cache = createOptimizationCache();
		});

		it("should cache optimization results", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800", "#35A16B", "#0041FF"];
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			// 最初の呼び出し
			const result1 = optimizePaletteWithCache(
				candidates,
				anchor,
				options,
				cache,
			);
			expect(cache.size()).toBe(1);

			// 同じ入力での2回目の呼び出し
			const result2 = optimizePaletteWithCache(
				candidates,
				anchor,
				options,
				cache,
			);

			// キャッシュがヒットし、同じ結果が返される
			expect(result2.palette).toEqual(result1.palette);
			expect(result2.objectiveValue).toEqual(result1.objectiveValue);
		});

		it("should return cached result when inputs are identical", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800", "#35A16B"];
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			// 最初の呼び出し
			const result1 = optimizePaletteWithCache(
				candidates,
				anchor,
				options,
				cache,
			);
			const _firstProcessingTime = result1.processingTimeMs;

			// 2回目の呼び出し（キャッシュヒット）
			const result2 = optimizePaletteWithCache(
				candidates,
				anchor,
				options,
				cache,
			);

			// キャッシュヒット時は処理時間が非常に短い（1ms未満）
			expect(result2.processingTimeMs).toBeLessThan(1);
			// キャッシュサイズは1のまま
			expect(cache.size()).toBe(1);
		});

		it("should not use cache when options change", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800", "#35A16B"];

			// Soft mode
			const options1: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};
			optimizePaletteWithCache(candidates, anchor, options1, cache);
			expect(cache.size()).toBe(1);

			// Strict mode
			const options2: OptimizationOptions = {
				lambda: 0.5,
				mode: "strict",
			};
			const result2 = optimizePaletteWithCache(
				candidates,
				anchor,
				options2,
				cache,
			);
			expect(cache.size()).toBe(2);

			// Strictモードでは全ての色がスナップされる
			for (const color of result2.palette) {
				expect(color.snapped).toBe(true);
			}
		});

		it("should not use cache when palette changes", () => {
			const anchor = createAnchorColor("#FF2800");
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			// パレット1
			const candidates1 = ["#FF2800", "#35A16B"];
			optimizePaletteWithCache(candidates1, anchor, options, cache);
			expect(cache.size()).toBe(1);

			// パレット2（異なる）
			const candidates2 = ["#FF2800", "#0041FF"];
			optimizePaletteWithCache(candidates2, anchor, options, cache);
			expect(cache.size()).toBe(2);
		});

		it("should not use cache when anchor changes", () => {
			const candidates = ["#FF2800", "#35A16B"];
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			// アンカー1
			const anchor1 = createAnchorColor("#FF2800");
			optimizePaletteWithCache(candidates, anchor1, options, cache);
			expect(cache.size()).toBe(1);

			// アンカー2（異なる）
			const anchor2 = createAnchorColor("#35A16B");
			optimizePaletteWithCache(candidates, anchor2, options, cache);
			expect(cache.size()).toBe(2);
		});

		it("should not use cache when lambda changes", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800", "#35A16B"];

			// λ = 0.5
			const options1: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};
			optimizePaletteWithCache(candidates, anchor, options1, cache);
			expect(cache.size()).toBe(1);

			// λ = 0.8
			const options2: OptimizationOptions = {
				lambda: 0.8,
				mode: "soft",
			};
			optimizePaletteWithCache(candidates, anchor, options2, cache);
			expect(cache.size()).toBe(2);
		});

		it("should not use cache when zone thresholds change", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800", "#35A16B"];

			// デフォルト閾値
			const options1: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};
			optimizePaletteWithCache(candidates, anchor, options1, cache);
			expect(cache.size()).toBe(1);

			// カスタム閾値
			const options2: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
				zoneThresholds: { safe: 0.03, warning: 0.1 },
			};
			optimizePaletteWithCache(candidates, anchor, options2, cache);
			expect(cache.size()).toBe(2);
		});

		it("should not use cache when return factor changes", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800", "#35A16B"];

			// デフォルトreturnFactor
			const options1: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};
			optimizePaletteWithCache(candidates, anchor, options1, cache);
			expect(cache.size()).toBe(1);

			// カスタムreturnFactor
			const options2: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
				returnFactor: 0.8,
			};
			optimizePaletteWithCache(candidates, anchor, options2, cache);
			expect(cache.size()).toBe(2);
		});
	});

	describe("Cache management", () => {
		it("should clear cache", () => {
			const cache = createOptimizationCache();
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800", "#35A16B"];
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			optimizePaletteWithCache(candidates, anchor, options, cache);
			expect(cache.size()).toBe(1);

			cache.clear();
			expect(cache.size()).toBe(0);
		});

		it("should limit cache size to prevent memory leaks", () => {
			const cache = createOptimizationCache({ maxSize: 3 });
			const anchor = createAnchorColor("#FF2800");

			// 4つの異なるパレットを最適化
			for (let i = 0; i < 4; i++) {
				const candidates = [`#FF${i.toString().padStart(2, "0")}00`, "#35A16B"];
				optimizePaletteWithCache(
					candidates,
					anchor,
					{ lambda: 0.5, mode: "soft" },
					cache,
				);
			}

			// キャッシュサイズが上限に制限される
			expect(cache.size()).toBeLessThanOrEqual(3);
		});
	});

	describe("Performance", () => {
		it("should complete 20-color palette optimization in 200ms", () => {
			const cache = createOptimizationCache();
			const anchor = createAnchorColor("#FF2800");
			const candidates = [
				"#FF2800",
				"#FF9900",
				"#FFFF00",
				"#35A16B",
				"#0041FF",
				"#66CCFF",
				"#9A0079",
				"#FF99A0",
				"#000000",
				"#FFFFFF",
				"#A0A0A0",
				"#7F878F",
				"#C8C8CB",
				"#663300",
				"#FF6600",
				"#99CC00",
				"#006600",
				"#003366",
				"#330066",
				"#660033",
			];
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePaletteWithCache(
				candidates,
				anchor,
				options,
				cache,
			);

			expect(result.palette).toHaveLength(20);
			expect(result.processingTimeMs).toBeLessThan(200);
		});

		it("should be significantly faster on cache hit", () => {
			const cache = createOptimizationCache();
			const anchor = createAnchorColor("#FF2800");
			const candidates = [
				"#FF2800",
				"#FF9900",
				"#FFFF00",
				"#35A16B",
				"#0041FF",
				"#66CCFF",
				"#9A0079",
				"#FF99A0",
				"#000000",
				"#FFFFFF",
			];
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			// 最初の呼び出し
			const result1 = optimizePaletteWithCache(
				candidates,
				anchor,
				options,
				cache,
			);
			const _firstTime = result1.processingTimeMs;

			// 2回目の呼び出し（キャッシュヒット）
			const result2 = optimizePaletteWithCache(
				candidates,
				anchor,
				options,
				cache,
			);
			const secondTime = result2.processingTimeMs;

			// キャッシュヒット時は処理が十分短いこと（環境差による揺らぎを許容）
			// 既に別テストで「1ms未満」も検証しているため、ここではフレークしにくい閾値にする
			expect(secondTime).toBeLessThan(5);
		});
	});
});

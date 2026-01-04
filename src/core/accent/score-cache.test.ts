/**
 * ScoreCache テスト
 * Task 1.3: スコアキャッシュ機構の実装
 *
 * Requirements: 2.4, 6.2
 */

import { beforeEach, describe, expect, it } from "bun:test";
import type { BalanceScoreResult } from "./balance-score-calculator";
import {
	buildFullCacheKey,
	buildPartialCacheKey,
	type PartialScoreData,
	ScoreCache,
} from "./score-cache";

describe("ScoreCache", () => {
	let cache: ScoreCache;

	beforeEach(() => {
		cache = new ScoreCache();
	});

	describe("buildPartialCacheKey", () => {
		it("正規化済みHEXでキーを生成", () => {
			const key = buildPartialCacheKey("#0056ff", "#ff9900");
			expect(key).toBe("#0056FF_#FF9900");
		});

		it("大文字小文字や#の有無で同じキーを生成", () => {
			const key1 = buildPartialCacheKey("#0056FF", "#FF9900");
			const key2 = buildPartialCacheKey("0056ff", "ff9900");
			expect(key1).toBe(key2);
		});
	});

	describe("buildFullCacheKey", () => {
		it("ブランド+候補+背景+重みでキーを生成", () => {
			const key = buildFullCacheKey("#0056FF", "#FF9900", "#FFFFFF", {
				harmony: 40,
				cud: 30,
				contrast: 30,
			});
			expect(key).toBe("#0056FF_#FF9900_#FFFFFF_40_30_30");
		});
	});

	describe("partialScoreCache", () => {
		it("部分スコアを保存・取得", () => {
			const partial: PartialScoreData = {
				harmonyScore: 80,
				cudScore: 70,
			};
			cache.setPartialScore("#0056FF", "#FF9900", partial);

			const retrieved = cache.getPartialScore("#0056FF", "#FF9900");
			expect(retrieved).toEqual(partial);
		});

		it("存在しないキーはundefined", () => {
			const retrieved = cache.getPartialScore("#0056FF", "#AABBCC");
			expect(retrieved).toBeUndefined();
		});

		it("正規化前後で同じキャッシュにアクセス", () => {
			const partial: PartialScoreData = {
				harmonyScore: 80,
				cudScore: 70,
			};
			cache.setPartialScore("#0056FF", "#FF9900", partial);

			// 正規化前の値でアクセス
			const retrieved = cache.getPartialScore("0056ff", "ff9900");
			expect(retrieved).toEqual(partial);
		});
	});

	describe("fullScoreCache", () => {
		it("完全スコアを保存・取得", () => {
			const result: BalanceScoreResult = {
				total: 75,
				breakdown: {
					harmonyScore: 80,
					cudScore: 70,
					contrastScore: 75,
				},
				weights: { harmony: 40, cud: 30, contrast: 30 },
			};
			cache.setFullScore(
				"#0056FF",
				"#FF9900",
				"#FFFFFF",
				result.weights,
				result,
			);

			const retrieved = cache.getFullScore(
				"#0056FF",
				"#FF9900",
				"#FFFFFF",
				result.weights,
			);
			expect(retrieved).toEqual(result);
		});

		it("異なる背景色で別キャッシュ", () => {
			const result: BalanceScoreResult = {
				total: 75,
				breakdown: {
					harmonyScore: 80,
					cudScore: 70,
					contrastScore: 75,
				},
				weights: { harmony: 40, cud: 30, contrast: 30 },
			};
			cache.setFullScore(
				"#0056FF",
				"#FF9900",
				"#FFFFFF",
				result.weights,
				result,
			);

			// 異なる背景色ではキャッシュミス
			const retrieved = cache.getFullScore(
				"#0056FF",
				"#FF9900",
				"#000000",
				result.weights,
			);
			expect(retrieved).toBeUndefined();
		});

		it("異なる重みで別キャッシュ", () => {
			const result: BalanceScoreResult = {
				total: 75,
				breakdown: {
					harmonyScore: 80,
					cudScore: 70,
					contrastScore: 75,
				},
				weights: { harmony: 40, cud: 30, contrast: 30 },
			};
			cache.setFullScore(
				"#0056FF",
				"#FF9900",
				"#FFFFFF",
				result.weights,
				result,
			);

			// 異なる重みではキャッシュミス
			const retrieved = cache.getFullScore("#0056FF", "#FF9900", "#FFFFFF", {
				harmony: 60,
				cud: 20,
				contrast: 20,
			});
			expect(retrieved).toBeUndefined();
		});
	});

	describe("clearAllCaches", () => {
		it("全キャッシュをクリア", () => {
			const partial: PartialScoreData = {
				harmonyScore: 80,
				cudScore: 70,
			};
			const result: BalanceScoreResult = {
				total: 75,
				breakdown: {
					harmonyScore: 80,
					cudScore: 70,
					contrastScore: 75,
				},
				weights: { harmony: 40, cud: 30, contrast: 30 },
			};

			cache.setPartialScore("#0056FF", "#FF9900", partial);
			cache.setFullScore(
				"#0056FF",
				"#FF9900",
				"#FFFFFF",
				result.weights,
				result,
			);

			cache.clearAllCaches();

			expect(cache.getPartialScore("#0056FF", "#FF9900")).toBeUndefined();
			expect(
				cache.getFullScore("#0056FF", "#FF9900", "#FFFFFF", result.weights),
			).toBeUndefined();
		});
	});

	describe("invalidateFullCacheByBackground", () => {
		it("特定の背景色のキャッシュのみクリア", () => {
			const result1: BalanceScoreResult = {
				total: 75,
				breakdown: { harmonyScore: 80, cudScore: 70, contrastScore: 75 },
				weights: { harmony: 40, cud: 30, contrast: 30 },
			};
			const result2: BalanceScoreResult = {
				total: 60,
				breakdown: { harmonyScore: 80, cudScore: 70, contrastScore: 30 },
				weights: { harmony: 40, cud: 30, contrast: 30 },
			};

			// 白背景と黒背景のキャッシュを保存
			cache.setFullScore(
				"#0056FF",
				"#FF9900",
				"#FFFFFF",
				result1.weights,
				result1,
			);
			cache.setFullScore(
				"#0056FF",
				"#FF9900",
				"#000000",
				result2.weights,
				result2,
			);

			// 白背景のキャッシュをクリア
			cache.invalidateFullCacheByBackground("#FFFFFF");

			// 白背景はクリアされる
			expect(
				cache.getFullScore("#0056FF", "#FF9900", "#FFFFFF", result1.weights),
			).toBeUndefined();
			// 黒背景は残る
			expect(
				cache.getFullScore("#0056FF", "#FF9900", "#000000", result2.weights),
			).toEqual(result2);
		});
	});

	describe("キャッシュ統計", () => {
		it("キャッシュサイズを取得", () => {
			expect(cache.getPartialCacheSize()).toBe(0);
			expect(cache.getFullCacheSize()).toBe(0);

			cache.setPartialScore("#0056FF", "#FF9900", {
				harmonyScore: 80,
				cudScore: 70,
			});
			cache.setPartialScore("#0056FF", "#AABBCC", {
				harmonyScore: 60,
				cudScore: 50,
			});

			expect(cache.getPartialCacheSize()).toBe(2);
			expect(cache.getFullCacheSize()).toBe(0);
		});
	});
});

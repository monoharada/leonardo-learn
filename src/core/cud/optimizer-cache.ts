/**
 * Optimizer Cache
 * 最適化結果のキャッシュ機構
 *
 * Requirements: 8.1 - パフォーマンス最適化
 * - 不要な再計算の回避（モード未変更時のキャッシュ）
 */

import type { AnchorColorState } from "./anchor";
import {
	type OptimizationOptions,
	type OptimizationResult,
	optimizePalette,
} from "./optimizer";

/**
 * キャッシュキー
 */
export interface OptimizationCacheKey {
	/** パレット候補のハッシュ */
	paletteHash: string;
	/** アンカーカラーのハッシュ */
	anchorHash: string;
	/** オプションのハッシュ */
	optionsHash: string;
}

/**
 * キャッシュオプション
 */
export interface OptimizationCacheOptions {
	/** 最大キャッシュサイズ（デフォルト: 100） */
	maxSize?: number;
}

/**
 * キャッシュエントリ
 */
interface CacheEntry {
	key: string;
	result: OptimizationResult;
	timestamp: number;
}

/**
 * 最適化キャッシュ
 */
export interface OptimizationCache {
	/** キャッシュエントリ数を取得 */
	size(): number;
	/** キャッシュをクリア */
	clear(): void;
	/** キャッシュから取得 */
	get(key: string): OptimizationResult | undefined;
	/** キャッシュに設定 */
	set(key: string, result: OptimizationResult): void;
}

/**
 * 配列をハッシュ文字列に変換
 */
const hashArray = (arr: string[]): string => {
	return arr.join(",");
};

/**
 * アンカーカラーをハッシュ文字列に変換
 */
const hashAnchor = (anchor: AnchorColorState): string => {
	return `${anchor.originalHex}:${anchor.effectiveHex}:${anchor.priority}`;
};

/**
 * オプションをハッシュ文字列に変換
 */
const hashOptions = (options: OptimizationOptions): string => {
	const parts: string[] = [`mode:${options.mode}`, `lambda:${options.lambda}`];

	if (options.returnFactor !== undefined) {
		parts.push(`rf:${options.returnFactor}`);
	}

	if (options.zoneThresholds) {
		if (options.zoneThresholds.safe !== undefined) {
			parts.push(`safe:${options.zoneThresholds.safe}`);
		}
		if (options.zoneThresholds.warning !== undefined) {
			parts.push(`warn:${options.zoneThresholds.warning}`);
		}
	}

	return parts.join("|");
};

/**
 * キャッシュキーを生成
 */
const generateCacheKey = (
	candidates: string[],
	anchor: AnchorColorState,
	options: OptimizationOptions,
): string => {
	const paletteHash = hashArray(candidates);
	const anchorHash = hashAnchor(anchor);
	const optionsHash = hashOptions(options);

	return `${paletteHash}::${anchorHash}::${optionsHash}`;
};

/**
 * 最適化キャッシュを作成
 *
 * @param options - キャッシュオプション
 * @returns 最適化キャッシュ
 *
 * @example
 * ```ts
 * const cache = createOptimizationCache({ maxSize: 50 });
 * ```
 */
export const createOptimizationCache = (
	options: OptimizationCacheOptions = {},
): OptimizationCache => {
	const { maxSize = 100 } = options;
	const entries = new Map<string, CacheEntry>();

	/**
	 * 古いエントリを削除してサイズを制限
	 */
	const evictOldest = (): void => {
		if (entries.size <= maxSize) {
			return;
		}

		// タイムスタンプでソートして古いものから削除
		const sortedEntries = Array.from(entries.entries()).sort(
			(a, b) => a[1].timestamp - b[1].timestamp,
		);

		const toRemove = sortedEntries.slice(0, entries.size - maxSize);
		for (const [key] of toRemove) {
			entries.delete(key);
		}
	};

	return {
		size: () => entries.size,

		clear: () => {
			entries.clear();
		},

		get: (key: string) => {
			const entry = entries.get(key);
			return entry?.result;
		},

		set: (key: string, result: OptimizationResult) => {
			entries.set(key, {
				key,
				result,
				timestamp: Date.now(),
			});
			evictOldest();
		},
	};
};

/**
 * キャッシュ付きでパレットを最適化
 *
 * Requirements: 8.1 - 不要な再計算の回避
 *
 * @param candidates - 候補色の配列
 * @param anchor - アンカーカラー状態
 * @param options - 最適化オプション
 * @param cache - キャッシュインスタンス
 * @returns 最適化結果
 *
 * @example
 * ```ts
 * const cache = createOptimizationCache();
 * const anchor = createAnchorColor("#FF2800");
 * const candidates = ["#FF2800", "#35A16B"];
 *
 * // 最初の呼び出し（計算実行）
 * const result1 = optimizePaletteWithCache(candidates, anchor, options, cache);
 *
 * // 2回目の呼び出し（キャッシュヒット）
 * const result2 = optimizePaletteWithCache(candidates, anchor, options, cache);
 * ```
 */
export const optimizePaletteWithCache = (
	candidates: string[],
	anchor: AnchorColorState,
	options: OptimizationOptions,
	cache: OptimizationCache,
): OptimizationResult => {
	const startTime = performance.now();
	const cacheKey = generateCacheKey(candidates, anchor, options);

	// キャッシュヒットの確認
	const cachedResult = cache.get(cacheKey);
	if (cachedResult) {
		const endTime = performance.now();
		// キャッシュヒット時は処理時間を更新して返す
		return {
			...cachedResult,
			processingTimeMs: endTime - startTime,
		};
	}

	// キャッシュミス時は実際に最適化を実行
	const result = optimizePalette(candidates, anchor, options);

	// 結果をキャッシュに保存
	cache.set(cacheKey, result);

	return result;
};

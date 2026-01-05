/**
 * ScoreCache
 * スコア計算結果のキャッシュ機構
 *
 * Task 1.3: スコアキャッシュ機構の実装
 * Requirements: 2.4, 6.2
 */

import {
	type BalanceScoreResult,
	normalizeHex,
	type ScoreWeights,
} from "./balance-score-calculator";

/**
 * 背景色非依存のスコアデータ
 * ハーモニースコア、CUDスコア、VibrancyスコアはBrand色と候補色のみに依存
 */
export interface PartialScoreData {
	harmonyScore: number;
	cudScore: number;
	/** 鮮やかさスコア（Adobe Color戦略: 問題色相帯での高明度優遇） */
	vibrancyScore: number;
}

/**
 * 部分キャッシュのキー生成
 * キー形式: ${normalizedBrandHex}_${normalizedCandidateHex}
 *
 * @param brandHex ブランドカラー
 * @param candidateHex 候補色
 * @returns キャッシュキー
 */
export function buildPartialCacheKey(
	brandHex: string,
	candidateHex: string,
): string {
	const normalizedBrand = normalizeHex(brandHex);
	const normalizedCandidate = normalizeHex(candidateHex);
	return `${normalizedBrand}_${normalizedCandidate}`;
}

/**
 * 完全キャッシュのキー生成
 * キー形式: ${normalizedBrandHex}_${normalizedCandidateHex}_${normalizedBackgroundHex}_${harmony}_${cud}_${contrast}_${vibrancy}
 *
 * @param brandHex ブランドカラー
 * @param candidateHex 候補色
 * @param backgroundHex 背景色
 * @param weights 重み設定
 * @returns キャッシュキー
 */
export function buildFullCacheKey(
	brandHex: string,
	candidateHex: string,
	backgroundHex: string,
	weights: ScoreWeights,
): string {
	const normalizedBrand = normalizeHex(brandHex);
	const normalizedCandidate = normalizeHex(candidateHex);
	const normalizedBg = normalizeHex(backgroundHex);
	return `${normalizedBrand}_${normalizedCandidate}_${normalizedBg}_${weights.harmony}_${weights.cud}_${weights.contrast}_${weights.vibrancy}`;
}

/**
 * スコアキャッシュクラス
 *
 * 二段階キャッシュ構造:
 * - partialScoreCache: ハーモニー・CUDスコア（背景色非依存）
 * - fullScoreCache: 完全スコア結果（背景色依存）
 */
export class ScoreCache {
	/**
	 * 部分スコアキャッシュ
	 * キー: ${brandHex}_${candidateHex}
	 * 値: ハーモニースコア + CUDスコア
	 */
	private partialScoreCache: Map<string, PartialScoreData> = new Map();

	/**
	 * 完全スコアキャッシュ
	 * キー: ${brandHex}_${candidateHex}_${backgroundHex}_${weightsHash}
	 * 値: 完全なBalanceScoreResult
	 */
	private fullScoreCache: Map<string, BalanceScoreResult> = new Map();

	/**
	 * 部分スコアを取得
	 */
	getPartialScore(
		brandHex: string,
		candidateHex: string,
	): PartialScoreData | undefined {
		const key = buildPartialCacheKey(brandHex, candidateHex);
		return this.partialScoreCache.get(key);
	}

	/**
	 * 部分スコアを保存
	 */
	setPartialScore(
		brandHex: string,
		candidateHex: string,
		data: PartialScoreData,
	): void {
		const key = buildPartialCacheKey(brandHex, candidateHex);
		this.partialScoreCache.set(key, data);
	}

	/**
	 * 完全スコアを取得
	 */
	getFullScore(
		brandHex: string,
		candidateHex: string,
		backgroundHex: string,
		weights: ScoreWeights,
	): BalanceScoreResult | undefined {
		const key = buildFullCacheKey(
			brandHex,
			candidateHex,
			backgroundHex,
			weights,
		);
		return this.fullScoreCache.get(key);
	}

	/**
	 * 完全スコアを保存
	 */
	setFullScore(
		brandHex: string,
		candidateHex: string,
		backgroundHex: string,
		weights: ScoreWeights,
		result: BalanceScoreResult,
	): void {
		const key = buildFullCacheKey(
			brandHex,
			candidateHex,
			backgroundHex,
			weights,
		);
		this.fullScoreCache.set(key, result);
	}

	/**
	 * 全キャッシュをクリア（エラー時に使用）
	 * Requirement 7.3: エラー発生時は前回キャッシュを使用しない
	 */
	clearAllCaches(): void {
		this.partialScoreCache.clear();
		this.fullScoreCache.clear();
	}

	/**
	 * 特定の背景色に関連する完全キャッシュをクリア
	 * Requirement 2.4: 背景色変更時の再計算
	 *
	 * @param backgroundHex 背景色
	 */
	invalidateFullCacheByBackground(backgroundHex: string): void {
		const normalizedBg = normalizeHex(backgroundHex);
		const keysToDelete: string[] = [];

		for (const key of this.fullScoreCache.keys()) {
			// キー形式: ${brand}_${candidate}_${background}_${weights}
			// 3番目のセグメントが背景色
			const segments = key.split("_");
			if (segments[2] === normalizedBg) {
				keysToDelete.push(key);
			}
		}

		for (const key of keysToDelete) {
			this.fullScoreCache.delete(key);
		}
	}

	/**
	 * 重み変更時のキャッシュ無効化
	 * fullScoreCacheのみクリア（partialScoreCacheは維持）
	 */
	invalidateFullCacheByWeights(): void {
		this.fullScoreCache.clear();
	}

	/**
	 * 部分キャッシュのサイズを取得（デバッグ用）
	 */
	getPartialCacheSize(): number {
		return this.partialScoreCache.size;
	}

	/**
	 * 完全キャッシュのサイズを取得（デバッグ用）
	 */
	getFullCacheSize(): number {
		return this.fullScoreCache.size;
	}
}

/**
 * グローバルキャッシュインスタンス
 */
export const globalScoreCache = new ScoreCache();

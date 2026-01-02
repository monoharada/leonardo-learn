/**
 * AccentCandidateService
 * アクセント候補の生成・フィルタ・キャッシュ管理
 *
 * Task 1.2: 候補生成機能の実装
 * Task 1.3: スコアキャッシュ機構の統合
 * Requirements: 1.1, 1.3, 1.4, 1.5, 2.4, 3.3, 3.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3
 */

import { toOklch } from "../../utils/color-space";
import { getContrast } from "../../utils/wcag";
import { calculateHueDistanceScore } from "../cud/harmony-score";
import { findNearestCudColor } from "../cud/service";
import {
	getAllDadsChromatic,
	loadDadsTokens,
} from "../tokens/dads-data-provider";
import type { DadsColorHue, DadsToken } from "../tokens/types";
import {
	type BalanceScoreResult,
	DEFAULT_WEIGHTS,
	InvalidColorError,
	normalizeHex,
	normalizeWeights,
	resolveBackgroundHex,
	type ScoreWeights,
} from "./balance-score-calculator";
import {
	globalScoreCache,
	type PartialScoreData,
	type ScoreCache,
} from "./score-cache";

/**
 * スコア付き候補
 */
export interface ScoredCandidate {
	/** DADSトークンID */
	tokenId: string;
	/** HEX値 */
	hex: string;
	/** 表示名（日本語） */
	nameJa: string;
	/** 表示名（英語） */
	nameEn: string;
	/** DADSソース名（例: "Blue 600"） */
	dadsSourceName: string;
	/** DADSステップ番号（50, 100, ..., 1200） */
	step: number;
	/** バランススコア結果 */
	score: BalanceScoreResult;
	/** 色相（OKLCH） */
	hue: number;
}

/** 主要ステップ定義（同スコア時の優先順位付けに使用） */
export const MAJOR_STEPS = [500, 600, 700, 800] as const;

/**
 * 候補生成オプション
 */
export interface GenerateCandidatesOptions {
	/** 背景色（未設定時は#FFFFFF） */
	backgroundHex?: string;
	/** 重み設定 */
	weights?: Partial<ScoreWeights>;
	/** 取得件数（デフォルト: 10） */
	limit?: number;
}

/**
 * 候補生成結果
 */
export interface AccentCandidateResult {
	/** スコア順の候補リスト */
	candidates: ScoredCandidate[];
	/** 計算時間（ms） */
	calculationTimeMs: number;
}

/**
 * エラー型
 */
export interface AccentSelectionError {
	code: "BRAND_COLOR_NOT_SET" | "DADS_LOAD_FAILED" | "SCORE_CALCULATION_FAILED";
	message: string;
}

export type AccentCandidateResultOrError =
	| { ok: true; result: AccentCandidateResult }
	| { ok: false; error: AccentSelectionError };

/**
 * ブランドカラーのバリデーション
 *
 * @param brandColorHex ブランドカラー（HEX形式、undefined/null/空文字も可）
 * @returns バリデーション結果
 */
function validateBrandColor(
	brandColorHex: string | undefined | null,
):
	| { valid: true; normalizedHex: string }
	| { valid: false; error: AccentSelectionError } {
	// 未設定チェック
	if (!brandColorHex || brandColorHex.trim() === "") {
		return {
			valid: false,
			error: {
				code: "BRAND_COLOR_NOT_SET",
				message: "ブランドカラーを設定してください",
			},
		};
	}

	// 正規化・形式検証
	try {
		const normalized = normalizeHex(brandColorHex);
		return { valid: true, normalizedHex: normalized };
	} catch {
		return {
			valid: false,
			error: {
				code: "BRAND_COLOR_NOT_SET",
				message: "ブランドカラーの形式が無効です",
			},
		};
	}
}

/**
 * 部分スコア（ハーモニー + CUD）を計算
 * 背景色に依存しないスコアをキャッシュ用に分離
 */
function calculatePartialScores(
	brandHex: string,
	candidateHex: string,
): PartialScoreData {
	// ハーモニースコア
	const harmonyScore = calculateHueDistanceScore(brandHex, [candidateHex]);

	// CUDスコア
	const cudResult = findNearestCudColor(candidateHex);
	const deltaE = cudResult.deltaE;
	const rawCudScore = 100 - (deltaE / 0.2) * 100;
	const cudScore = Math.max(0, Math.min(100, rawCudScore));

	return {
		harmonyScore: Math.round(harmonyScore * 10) / 10,
		cudScore: Math.round(cudScore * 10) / 10,
	};
}

/**
 * コントラストスコアを計算
 * 背景色に依存するスコア
 */
function calculateContrastScore(
	candidateHex: string,
	backgroundHex: string,
): number {
	const candidate = toOklch(candidateHex);
	const background = toOklch(backgroundHex);

	if (!candidate || !background) {
		throw new InvalidColorError(
			`Invalid color: ${candidateHex} or ${backgroundHex}`,
		);
	}

	const contrastRatio = getContrast(candidate, background);
	const score = ((contrastRatio - 1) / 6) * 100;
	return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/**
 * キャッシュ対応のスコア計算
 * Requirement 6.2: メモ化の実装
 */
function calculateCachedScore(
	brandHex: string,
	candidateHex: string,
	backgroundHex: string,
	weights: ScoreWeights,
	cache: ScoreCache,
): BalanceScoreResult {
	// 正規化
	const normalizedBrand = normalizeHex(brandHex);
	const normalizedCandidate = normalizeHex(candidateHex);
	const normalizedBg = normalizeHex(backgroundHex);

	// 完全キャッシュチェック
	const cachedFull = cache.getFullScore(
		normalizedBrand,
		normalizedCandidate,
		normalizedBg,
		weights,
	);
	if (cachedFull) {
		return cachedFull;
	}

	// 部分キャッシュチェック
	let partial = cache.getPartialScore(normalizedBrand, normalizedCandidate);
	if (!partial) {
		partial = calculatePartialScores(normalizedBrand, normalizedCandidate);
		cache.setPartialScore(normalizedBrand, normalizedCandidate, partial);
	}

	// コントラストスコアは背景色依存なので常に計算
	const contrastScore = calculateContrastScore(
		normalizedCandidate,
		normalizedBg,
	);

	// 加重平均
	const total =
		partial.harmonyScore * (weights.harmony / 100) +
		partial.cudScore * (weights.cud / 100) +
		contrastScore * (weights.contrast / 100);

	const result: BalanceScoreResult = {
		total: Math.round(total * 10) / 10,
		breakdown: {
			harmonyScore: partial.harmonyScore,
			cudScore: partial.cudScore,
			contrastScore,
		},
		weights,
	};

	// 完全キャッシュに保存
	cache.setFullScore(
		normalizedBrand,
		normalizedCandidate,
		normalizedBg,
		weights,
		result,
	);

	return result;
}

/**
 * DADSトークンから候補のスコアを計算（キャッシュ対応）
 * Requirement 6.2: メモ化
 */
function calculateCandidateScore(
	token: DadsToken,
	brandHex: string,
	backgroundHex: string,
	weights: ScoreWeights,
	cache: ScoreCache,
): ScoredCandidate {
	const score = calculateCachedScore(
		brandHex,
		token.hex,
		backgroundHex,
		weights,
		cache,
	);
	const oklch = toOklch(token.hex);

	// 色相名を英語表示名に変換
	const hueDisplayName = getHueDisplayName(token.classification.hue);
	const step = token.classification.scale ?? 500;

	return {
		tokenId: token.id,
		hex: token.hex,
		nameJa: token.nameJa,
		nameEn: token.nameEn,
		dadsSourceName: `${hueDisplayName} ${step}`,
		step,
		hue: oklch?.h ?? 0,
		score,
	};
}

/**
 * 色相IDから英語表示名を取得
 */
function getHueDisplayName(hue: DadsColorHue | undefined): string {
	if (!hue) return "Unknown";
	const hueNames: Record<DadsColorHue, string> = {
		blue: "Blue",
		"light-blue": "Light Blue",
		cyan: "Cyan",
		green: "Green",
		lime: "Lime",
		yellow: "Yellow",
		orange: "Orange",
		red: "Red",
		magenta: "Magenta",
		purple: "Purple",
	};
	return hueNames[hue] ?? "Unknown";
}

/**
 * 候補のソート（スコア降順、同スコア時は主要ステップ優先）
 * Requirement 1.1
 */
export function sortCandidates(
	candidates: ScoredCandidate[],
): ScoredCandidate[] {
	return [...candidates].sort((a, b) => {
		// 第一ソート: スコア降順
		if (a.score.total !== b.score.total) {
			return b.score.total - a.score.total;
		}
		// 第二ソート: 主要ステップ優先
		const aIsMajor = MAJOR_STEPS.includes(
			a.step as (typeof MAJOR_STEPS)[number],
		);
		const bIsMajor = MAJOR_STEPS.includes(
			b.step as (typeof MAJOR_STEPS)[number],
		);
		if (aIsMajor && !bIsMajor) return -1;
		if (!aIsMajor && bIsMajor) return 1;
		return 0;
	});
}

/**
 * アクセント候補を生成する
 * Requirement 6.2: キャッシュ統合によるメモ化
 *
 * @param brandColorHex ブランドカラー（必須）
 * @param options 生成オプション
 * @returns 候補生成結果またはエラー
 */
export async function generateCandidates(
	brandColorHex: string,
	options?: GenerateCandidatesOptions,
): Promise<AccentCandidateResultOrError> {
	const startTime = performance.now();

	// ブランドカラーの検証
	const validation = validateBrandColor(brandColorHex);
	if (!validation.valid) {
		return { ok: false, error: validation.error };
	}
	const normalizedBrandHex = validation.normalizedHex;

	// オプションの解決
	const backgroundHex = resolveBackgroundHex(options?.backgroundHex);
	const weights = normalizeWeights({
		...DEFAULT_WEIGHTS,
		...options?.weights,
	});
	const limit = options?.limit ?? 10;

	// DADSトークンの読み込み
	let tokens: DadsToken[];
	try {
		tokens = await loadDadsTokens();
	} catch (error) {
		return {
			ok: false,
			error: {
				code: "DADS_LOAD_FAILED",
				message: "DADSデータの読み込みに失敗しました",
			},
		};
	}

	// Chromatic候補の抽出（10色相×13ステップ = 130色）
	const chromaticScales = getAllDadsChromatic(tokens);
	const chromaticTokens: DadsToken[] = chromaticScales.flatMap((scale) =>
		scale.colors.map((c) => c.token),
	);

	// 全候補のスコア計算（キャッシュ使用）
	let candidates: ScoredCandidate[];
	try {
		candidates = chromaticTokens.map((token) =>
			calculateCandidateScore(
				token,
				normalizedBrandHex,
				backgroundHex,
				weights,
				globalScoreCache,
			),
		);
	} catch (error) {
		// エラー時はキャッシュをクリア（Requirement 7.3）
		globalScoreCache.clearAllCaches();
		return {
			ok: false,
			error: {
				code: "SCORE_CALCULATION_FAILED",
				message:
					error instanceof Error
						? error.message
						: "スコア計算中にエラーが発生しました",
			},
		};
	}

	// ソート
	const sortedCandidates = sortCandidates(candidates);

	// 上位N件を取得
	const topCandidates = sortedCandidates.slice(0, limit);

	const endTime = performance.now();

	return {
		ok: true,
		result: {
			candidates: topCandidates,
			calculationTimeMs: endTime - startTime,
		},
	};
}

/**
 * 背景色変更時に候補を再計算する
 * Requirement 2.4: 背景色変更時の部分再計算
 *
 * キャッシュ済みのハーモニー・CUDスコアを活用し、
 * コントラストスコアのみを再計算することで効率的な更新を実現
 *
 * @param previousCandidates 既存の候補リスト
 * @param brandColorHex ブランドカラー
 * @param newBackgroundHex 新しい背景色
 * @param weights 重み設定
 * @returns 再計算後の候補リスト
 */
export function recalculateOnBackgroundChange(
	previousCandidates: ScoredCandidate[],
	brandColorHex: string,
	newBackgroundHex: string,
	weights?: Partial<ScoreWeights>,
): ScoredCandidate[] {
	const normalizedBrand = normalizeHex(brandColorHex);
	const normalizedBg = resolveBackgroundHex(newBackgroundHex);
	const normalizedWeights = normalizeWeights({
		...DEFAULT_WEIGHTS,
		...weights,
	});

	// 背景色に関連するfullScoreCacheはクリアしない
	// 代わりに新しい背景色で再計算し、キャッシュに追加

	return previousCandidates.map((candidate) => {
		const normalizedCandidate = normalizeHex(candidate.hex);

		// 部分キャッシュからハーモニー・CUDスコアを取得
		let partial = globalScoreCache.getPartialScore(
			normalizedBrand,
			normalizedCandidate,
		);
		if (!partial) {
			// キャッシュミス時は再計算
			partial = calculatePartialScores(normalizedBrand, normalizedCandidate);
			globalScoreCache.setPartialScore(
				normalizedBrand,
				normalizedCandidate,
				partial,
			);
		}

		// 新しい背景色でコントラストスコアを再計算
		const contrastScore = calculateContrastScore(
			normalizedCandidate,
			normalizedBg,
		);

		// 加重平均
		const total =
			partial.harmonyScore * (normalizedWeights.harmony / 100) +
			partial.cudScore * (normalizedWeights.cud / 100) +
			contrastScore * (normalizedWeights.contrast / 100);

		const newScore: BalanceScoreResult = {
			total: Math.round(total * 10) / 10,
			breakdown: {
				harmonyScore: partial.harmonyScore,
				cudScore: partial.cudScore,
				contrastScore,
			},
			weights: normalizedWeights,
		};

		// 完全キャッシュに保存
		globalScoreCache.setFullScore(
			normalizedBrand,
			normalizedCandidate,
			normalizedBg,
			normalizedWeights,
			newScore,
		);

		return {
			...candidate,
			score: newScore,
		};
	});
}

/**
 * キャッシュ統計を取得（デバッグ用）
 */
export function getCacheStats(): {
	partialCacheSize: number;
	fullCacheSize: number;
} {
	return {
		partialCacheSize: globalScoreCache.getPartialCacheSize(),
		fullCacheSize: globalScoreCache.getFullCacheSize(),
	};
}

/**
 * キャッシュをクリア（テスト用）
 */
export function clearCache(): void {
	globalScoreCache.clearAllCaches();
}

/**
 * DADSエラー状態（内部）
 * Task 2.2: エラー状態管理
 */
let dadsLoadError: Error | null = null;

/**
 * DADSエラー状態のリセット（リトライ用）
 * Task 2.2: Requirement 7.1
 */
export function resetDadsErrorState(): void {
	dadsLoadError = null;
}

/**
 * DADSエラー状態を取得（デバッグ用）
 */
export function getDadsErrorState(): Error | null {
	return dadsLoadError;
}

/**
 * BalanceScoreCalculator
 * ブランドカラーと候補色のバランススコアを計算する
 *
 * Task 1.1: バランススコア計算サービスの実装
 * Requirements: 1.2, 2.1, 2.2, 2.3
 */

import { toOklch } from "../../utils/color-space";
import { getContrast } from "../../utils/wcag";
import { calculateHueDistanceScore } from "../cud/harmony-score";
import { findNearestCudColor } from "../cud/service";
import { calculateVibrancyScore } from "./vibrancy-calculator";

/**
 * 無効な色エラー
 */
export class InvalidColorError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidColorError";
	}
}

/**
 * スコア重み設定
 */
export interface ScoreWeights {
	/** ハーモニースコア重み（0-100） */
	harmony: number;
	/** CUDスコア重み（0-100） */
	cud: number;
	/** コントラストスコア重み（0-100） */
	contrast: number;
	/** 鮮やかさスコア重み（0-100）- Adobe Color戦略による濁り防止 */
	vibrancy: number;
}

/**
 * スコア計算結果
 */
export interface BalanceScoreResult {
	/** 総合スコア（0-100） */
	total: number;
	/** スコア内訳 */
	breakdown: {
		harmonyScore: number;
		cudScore: number;
		contrastScore: number;
		/** 鮮やかさスコア（Adobe Color戦略による濁り防止） */
		vibrancyScore: number;
	};
	/** 使用した重み（正規化済み） */
	weights: ScoreWeights;
}

/**
 * デフォルト重み（ハーモニー30%、CUD20%、コントラスト25%、Vibrancy25%）
 * Phase 3: Adobe Color戦略による濁り防止のためVibrancyを追加
 */
export const DEFAULT_WEIGHTS: Readonly<ScoreWeights> = {
	harmony: 30,
	cud: 20,
	contrast: 25,
	vibrancy: 25,
};

/**
 * デフォルト背景色
 */
const DEFAULT_BACKGROUND_HEX = "#FFFFFF";

/**
 * HEX色の正規化
 * - 大文字に統一
 * - #プレフィックスを保証
 * - 3桁HEXは6桁に展開
 *
 * @param hex 入力HEX値（#付き/なし、大文字/小文字どちらも可）
 * @returns 正規化済みHEX（#RRGGBB形式、大文字）
 * @throws InvalidColorError 無効なHEX形式の場合
 */
export function normalizeHex(hex: string): string {
	let normalized = hex.trim().toUpperCase();

	// #プレフィックスを保証
	if (!normalized.startsWith("#")) {
		normalized = `#${normalized}`;
	}

	// 3桁HEXを6桁に展開 (#RGB -> #RRGGBB)
	if (normalized.length === 4) {
		const r = normalized[1];
		const g = normalized[2];
		const b = normalized[3];
		normalized = `#${r}${r}${g}${g}${b}${b}`;
	}

	// フォーマット検証
	if (!/^#[0-9A-F]{6}$/.test(normalized)) {
		throw new InvalidColorError(`Invalid hex color: ${hex}`);
	}

	return normalized;
}

/**
 * 背景色のバリデーションとフォールバック処理
 *
 * @param backgroundHex 背景色HEX（未設定/無効の場合はフォールバック）
 * @returns 正規化済み背景色HEX
 */
export function resolveBackgroundHex(
	backgroundHex: string | undefined,
): string {
	if (!backgroundHex || backgroundHex.trim() === "") {
		return DEFAULT_BACKGROUND_HEX;
	}
	try {
		return normalizeHex(backgroundHex);
	} catch {
		return DEFAULT_BACKGROUND_HEX;
	}
}

/**
 * 重みを正規化する（合計100を保証）
 *
 * @param weights 入力重み
 * @returns 正規化済み重み
 */
export function normalizeWeights(weights: ScoreWeights): ScoreWeights {
	const sum =
		weights.harmony + weights.cud + weights.contrast + weights.vibrancy;
	if (sum === 0) {
		return { ...DEFAULT_WEIGHTS };
	}

	// 各値を比例配分し四捨五入
	let harmony = Math.round((weights.harmony / sum) * 100);
	let cud = Math.round((weights.cud / sum) * 100);
	let contrast = Math.round((weights.contrast / sum) * 100);
	let vibrancy = Math.round((weights.vibrancy / sum) * 100);

	// 合計が100でない場合、最大値に差分を加算
	const total = harmony + cud + contrast + vibrancy;
	if (total !== 100) {
		const diff = 100 - total;
		const max = Math.max(harmony, cud, contrast, vibrancy);
		if (harmony === max) {
			harmony += diff;
		} else if (cud === max) {
			cud += diff;
		} else if (contrast === max) {
			contrast += diff;
		} else {
			vibrancy += diff;
		}
	}

	return { harmony, cud, contrast, vibrancy };
}

/**
 * CUDスコア計算（Requirement 2.1）
 * 既存 findNearestCudColor() からΔE値を取得し正規化
 *
 * 計算式: score = clamp(0, 100, 100 - (deltaE / 0.20) * 100)
 * - ΔE = 0.00 → 100点（完全一致）
 * - ΔE ≥ 0.20 → 0点（離れすぎ）
 *
 * @param candidateHex 候補色（HEX形式）
 * @returns CUDスコア（0-100）
 */
function calculateCudScore(candidateHex: string): number {
	const cudResult = findNearestCudColor(candidateHex);
	const deltaE = cudResult.deltaE;

	// 正規化: ΔE=0で100点、ΔE≥0.20で0点
	const score = 100 - (deltaE / 0.2) * 100;
	return Math.max(0, Math.min(100, score));
}

/**
 * ハーモニースコア計算（Requirement 2.1）
 * 既存 calculateHueDistanceScore() を使用
 *
 * @param brandHex ブランドカラー（HEX形式）
 * @param candidateHex 候補色（HEX形式）
 * @returns ハーモニースコア（0-100）
 */
function calculateHarmonyScore(brandHex: string, candidateHex: string): number {
	// 既存のharmony-score.tsのcalculateHueDistanceScore()を使用
	// 単色の場合は配列で渡す: [candidateHex]
	return calculateHueDistanceScore(brandHex, [candidateHex]);
}

/**
 * コントラストスコア計算（Requirement 2.1）
 * 既存の src/utils/wcag.ts の getContrast() を使用
 *
 * 計算式: score = clamp(0, 100, ((contrastRatio - 1) / 6) * 100)
 * - コントラスト比1.0で0点
 * - コントラスト比7.0以上で100点
 *
 * @param candidateHex 候補色（HEX形式）
 * @param backgroundHex 背景色（HEX形式）
 * @returns コントラストスコア（0-100）
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

	// 既存 getContrast() を使用
	const contrastRatio = getContrast(candidate, background);

	// 正規化: 比1.0で0点、比7.0以上で100点
	const score = ((contrastRatio - 1) / 6) * 100;
	return Math.max(0, Math.min(100, score));
}

// calculateVibrancyScore は vibrancy-calculator.ts に移動済み
// インポートにより利用可能

/**
 * バランススコアを計算する
 *
 * @param brandColorHex ブランドカラー（HEX形式）
 * @param candidateHex 候補色（HEX形式）
 * @param backgroundHex 背景色（HEX形式）
 * @param weights 重み設定（オプション、デフォルト: 30/20/25/25）
 * @returns スコア計算結果
 * @throws InvalidColorError 無効な色形式の場合
 */
export function calculateBalanceScore(
	brandColorHex: string,
	candidateHex: string,
	backgroundHex: string,
	weights?: Partial<ScoreWeights>,
): BalanceScoreResult {
	// ブランドカラーの正規化（必須、エラー時は例外）
	const normalizedBrandHex = normalizeHex(brandColorHex);

	// 候補色の正規化（必須、エラー時は例外）
	const normalizedCandidateHex = normalizeHex(candidateHex);

	// 背景色の正規化（フォールバックあり）
	const normalizedBackgroundHex = resolveBackgroundHex(backgroundHex);

	// 重みの正規化
	const mergedWeights: ScoreWeights = {
		...DEFAULT_WEIGHTS,
		...weights,
	};
	const normalizedWeights = normalizeWeights(mergedWeights);

	// 各スコアを計算
	const harmonyScore = calculateHarmonyScore(
		normalizedBrandHex,
		normalizedCandidateHex,
	);
	const cudScore = calculateCudScore(normalizedCandidateHex);
	const contrastScore = calculateContrastScore(
		normalizedCandidateHex,
		normalizedBackgroundHex,
	);
	const vibrancyScore = calculateVibrancyScore(normalizedCandidateHex);

	// 加重平均を計算（4要素）
	const total =
		harmonyScore * (normalizedWeights.harmony / 100) +
		cudScore * (normalizedWeights.cud / 100) +
		contrastScore * (normalizedWeights.contrast / 100) +
		vibrancyScore * (normalizedWeights.vibrancy / 100);

	return {
		total: Math.round(total * 10) / 10,
		breakdown: {
			harmonyScore: Math.round(harmonyScore * 10) / 10,
			cudScore: Math.round(cudScore * 10) / 10,
			contrastScore: Math.round(contrastScore * 10) / 10,
			vibrancyScore: Math.round(vibrancyScore * 10) / 10,
		},
		weights: normalizedWeights,
	};
}

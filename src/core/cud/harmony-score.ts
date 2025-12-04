/**
 * Harmony Score Calculation
 * アンカーカラーとパレットの視覚的調和度を数値化
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import {
	type ColorObject,
	clampChroma,
	toHex,
	toOklch,
} from "../../utils/color-space";
import { getContrast, WCAG_RATIO_AA } from "../../utils/wcag";

/**
 * 調和スコア重み設定
 */
export interface HarmonyScoreWeights {
	/** 色相距離の重み（デフォルト: 0.4） */
	hue: number;
	/** 明度差の重み（デフォルト: 0.3） */
	lightness: number;
	/** コントラスト適合度の重み（デフォルト: 0.3） */
	contrast: number;
}

/**
 * 調和スコア結果
 */
export interface HarmonyScoreResult {
	/** 総合スコア（0-100） */
	total: number;
	/** 内訳 */
	breakdown: {
		hueScore: number;
		lightnessScore: number;
		contrastScore: number;
	};
	/** 使用した重み */
	weights: HarmonyScoreWeights;
}

/**
 * デフォルト重み
 * Requirement 4.1: 調和スコアを以下の式で計算
 */
export const DEFAULT_HARMONY_WEIGHTS: Readonly<HarmonyScoreWeights> = {
	hue: 0.4,
	lightness: 0.3,
	contrast: 0.3,
};

/**
 * 調和スコア警告閾値
 * Requirement 4.3: 調和スコアが設定された閾値以下の場合に警告を表示
 */
export const HARMONY_SCORE_WARNING_THRESHOLD = 70;

/**
 * HEX文字列をOKLCHに変換（バリデーション付き）
 */
const hexToOklch = (hex: string): ColorObject => {
	const oklch = toOklch(hex);
	if (!oklch) {
		throw new Error(`Invalid hex color: ${hex}`);
	}
	return oklch;
};

/**
 * 色相の円周距離を計算（0-180度）
 * 色相は循環値なので、180度以上の差は360-差として計算
 */
const calculateHueDistance = (
	hue1: number | undefined,
	hue2: number | undefined,
): number => {
	// 無彩色（色相なし）の場合は0として扱う
	const h1 = hue1 ?? 0;
	const h2 = hue2 ?? 0;

	const diff = Math.abs(h1 - h2);
	return Math.min(diff, 360 - diff);
};

/**
 * 色相距離スコアを計算
 * Requirement 4.1: w1 × hueDistanceScore
 *
 * アンカーと各パレット色の色相距離の平均に基づいてスコア化
 * 距離0（同じ色相）= 100点、距離180（補色）で低スコア
 *
 * @param anchorHex - アンカーカラーのHEX値
 * @param paletteHexes - パレット色のHEX配列
 * @returns 色相距離スコア（0-100）
 */
export const calculateHueDistanceScore = (
	anchorHex: string,
	paletteHexes: string[],
): number => {
	if (paletteHexes.length === 0) {
		return 50; // 空の場合は中間スコア
	}

	const anchorOklch = hexToOklch(anchorHex);
	const anchorChroma = anchorOklch.c ?? 0;

	// 無彩色のアンカーの場合は色相比較ができないので中間スコア
	if (anchorChroma < 0.01) {
		return 50;
	}

	let totalDistance = 0;
	let chromaticCount = 0;

	for (const hex of paletteHexes) {
		const oklch = hexToOklch(hex);
		const chroma = oklch.c ?? 0;

		// 無彩色はスキップ
		if (chroma < 0.01) {
			continue;
		}

		const distance = calculateHueDistance(anchorOklch.h, oklch.h);
		totalDistance += distance;
		chromaticCount++;
	}

	// すべて無彩色の場合は中間スコア
	if (chromaticCount === 0) {
		return 50;
	}

	const avgDistance = totalDistance / chromaticCount;

	// 距離0→100点、距離180→0点に線形変換
	// ただし、調和の観点では適度な距離も良いので、より寛容に評価
	// 類似色（0-30度）: 高スコア
	// 補色（150-180度）: 中程度のスコア（補色も調和の一種）
	const score = Math.max(0, 100 - (avgDistance / 180) * 70);

	return Math.round(score * 10) / 10;
};

/**
 * 明度分布スコアを計算
 * Requirement 4.1: w2 × lightnessGapScore
 *
 * パレット内の明度がバランスよく分布しているかを評価
 * 標準偏差が適切な範囲にあれば高スコア
 *
 * @param paletteHexes - パレット色のHEX配列
 * @returns 明度分布スコア（0-100）
 */
export const calculateLightnessDistributionScore = (
	paletteHexes: string[],
): number => {
	if (paletteHexes.length === 0) {
		return 50;
	}

	if (paletteHexes.length === 1) {
		return 50; // 単一色では分布を評価できない
	}

	const lightnesses = paletteHexes.map((hex) => {
		const oklch = hexToOklch(hex);
		return oklch.l ?? 0;
	});

	// 明度の標準偏差を計算
	const mean = lightnesses.reduce((sum, l) => sum + l, 0) / lightnesses.length;
	const variance =
		lightnesses.reduce((sum, l) => sum + (l - mean) ** 2, 0) /
		lightnesses.length;
	const stdDev = Math.sqrt(variance);

	// 理想的な標準偏差は0.2-0.3程度（明度0-1の範囲で適度な分散）
	// 標準偏差が0.25付近で100点、0に近いまたは0.5以上で低スコア
	const idealStdDev = 0.25;
	const maxDeviation = 0.25; // これ以上離れると0点

	const deviation = Math.abs(stdDev - idealStdDev);
	const score = Math.max(0, 100 * (1 - deviation / maxDeviation));

	return Math.round(score * 10) / 10;
};

/**
 * コントラスト適合度スコアを計算
 * Requirement 4.1: w3 × contrastFitScore
 *
 * アンカーとパレット色のWCAGコントラスト比がAA基準を満たす割合
 *
 * @param anchorHex - アンカーカラーのHEX値
 * @param paletteHexes - パレット色のHEX配列
 * @returns コントラスト適合度スコア（0-100）
 */
export const calculateContrastFitScore = (
	anchorHex: string,
	paletteHexes: string[],
): number => {
	if (paletteHexes.length === 0) {
		return 50;
	}

	const anchorOklch = hexToOklch(anchorHex);
	let passCount = 0;

	for (const hex of paletteHexes) {
		const oklch = hexToOklch(hex);
		const contrast = getContrast(anchorOklch, oklch);

		if (contrast >= WCAG_RATIO_AA) {
			passCount++;
		}
	}

	const score = (passCount / paletteHexes.length) * 100;
	return Math.round(score * 10) / 10;
};

/**
 * 重みを正規化する（合計が1になるように）
 */
const normalizeWeights = (
	weights: HarmonyScoreWeights,
): HarmonyScoreWeights => {
	const sum = weights.hue + weights.lightness + weights.contrast;
	if (sum === 0) {
		return { ...DEFAULT_HARMONY_WEIGHTS };
	}
	return {
		hue: weights.hue / sum,
		lightness: weights.lightness / sum,
		contrast: weights.contrast / sum,
	};
};

/**
 * 調和スコアを計算する
 * Requirement 4.1, 4.2: 調和スコアを計算し0-100の範囲で算出
 *
 * @param anchorHex - アンカーカラーのHEX値
 * @param paletteHexes - パレット色のHEX配列
 * @param weights - カスタム重み（オプション）
 * @returns 調和スコア結果
 * @throws パレットが空の場合
 *
 * @example
 * ```ts
 * const result = calculateHarmonyScore("#FF2800", ["#FF9900", "#35A16B"]);
 * // => { total: 75.5, breakdown: { hueScore: 80, lightnessScore: 70, contrastScore: 75 }, weights: {...} }
 * ```
 */
export const calculateHarmonyScore = (
	anchorHex: string,
	paletteHexes: string[],
	weights?: Partial<HarmonyScoreWeights>,
): HarmonyScoreResult => {
	if (paletteHexes.length === 0) {
		throw new Error("Palette must contain at least one color");
	}

	// アンカーのバリデーション
	hexToOklch(anchorHex);

	// パレットのバリデーション
	for (const hex of paletteHexes) {
		hexToOklch(hex);
	}

	// 重みをマージして正規化
	const mergedWeights: HarmonyScoreWeights = {
		...DEFAULT_HARMONY_WEIGHTS,
		...weights,
	};
	const normalizedWeights = normalizeWeights(mergedWeights);

	// 各スコアを計算
	const hueScore = calculateHueDistanceScore(anchorHex, paletteHexes);
	const lightnessScore = calculateLightnessDistributionScore(paletteHexes);
	const contrastScore = calculateContrastFitScore(anchorHex, paletteHexes);

	// 加重平均を計算
	const total =
		hueScore * normalizedWeights.hue +
		lightnessScore * normalizedWeights.lightness +
		contrastScore * normalizedWeights.contrast;

	return {
		total: Math.round(total * 10) / 10,
		breakdown: {
			hueScore,
			lightnessScore,
			contrastScore,
		},
		weights: normalizedWeights,
	};
};

/**
 * スコアが警告閾値以下か判定する
 * Requirement 4.3: 調和スコアが設定された閾値以下の場合に警告を表示
 *
 * @param score - 調和スコア
 * @param threshold - 閾値（デフォルト: 70）
 * @returns 閾値以下ならtrue
 */
export const isScoreBelowThreshold = (
	score: number,
	threshold: number = HARMONY_SCORE_WARNING_THRESHOLD,
): boolean => {
	return score < threshold;
};

/**
 * 警告の深刻度
 */
export type WarningSeverity = "low" | "medium" | "high";

/**
 * 調和スコア警告情報
 * Requirement 4.3: 調和スコアが閾値以下の場合の警告情報
 */
export interface HarmonyWarning {
	/** 警告メッセージ */
	message: string;
	/** 現在のスコア */
	score: number;
	/** 閾値 */
	threshold: number;
	/** 深刻度 */
	severity: WarningSeverity;
	/** 改善提案 */
	suggestions: string[];
}

/**
 * 深刻度を計算する
 */
const calculateSeverity = (
	score: number,
	threshold: number,
): WarningSeverity => {
	const gap = threshold - score;
	if (gap >= 30) {
		return "high";
	}
	if (gap >= 15) {
		return "medium";
	}
	return "low";
};

/**
 * スコアに基づいた改善提案を生成する
 */
const generateSuggestions = (
	breakdown: HarmonyScoreResult["breakdown"],
): string[] => {
	const suggestions: string[] = [];

	if (breakdown.hueScore < 60) {
		suggestions.push("色相をアンカーカラーに近づけることで調和が改善します");
	}
	if (breakdown.lightnessScore < 60) {
		suggestions.push("明度のバリエーションを増やすとバランスが向上します");
	}
	if (breakdown.contrastScore < 60) {
		suggestions.push(
			"アンカーとのコントラストを改善するとアクセシビリティが向上します",
		);
	}

	if (suggestions.length === 0) {
		suggestions.push(
			"パレットの構成を見直すことで調和スコアが改善する可能性があります",
		);
	}

	return suggestions;
};

/**
 * 調和スコア警告を生成する
 * Requirement 4.3: 調和スコアが設定された閾値以下の場合に警告を表示
 *
 * @param scoreResult - 調和スコア結果
 * @param threshold - 閾値（デフォルト: 70）
 * @returns 警告情報、または閾値以上の場合はnull
 *
 * @example
 * ```ts
 * const result = calculateHarmonyScore("#FF2800", ["#808080"]);
 * const warning = generateHarmonyWarning(result);
 * if (warning) {
 *   console.log(warning.message); // "調和スコアが65です（推奨: 70以上）"
 * }
 * ```
 */
export const generateHarmonyWarning = (
	scoreResult: HarmonyScoreResult,
	threshold: number = HARMONY_SCORE_WARNING_THRESHOLD,
): HarmonyWarning | null => {
	if (scoreResult.total >= threshold) {
		return null;
	}

	const severity = calculateSeverity(scoreResult.total, threshold);
	const suggestions = generateSuggestions(scoreResult.breakdown);

	return {
		message: `調和スコアが${scoreResult.total}です（推奨: ${threshold}以上）`,
		score: scoreResult.total,
		threshold,
		severity,
		suggestions,
	};
};

/**
 * 代替パレット提案結果
 * Requirement 4.4: 調和スコア優先の代替パレットを提案
 */
export interface AlternativePaletteResult {
	/** 提案されたパレット */
	suggestedPalette: string[];
	/** 元のスコア */
	originalScore: number;
	/** 改善後のスコア */
	improvedScore: number;
	/** 各色の変更説明 */
	explanations: string[];
}

/**
 * 色相をアンカーに近づける調整を行う
 */
const adjustHueTowardsAnchor = (
	colorOklch: ColorObject,
	anchorOklch: ColorObject,
	factor: number = 0.3,
): ColorObject => {
	const colorHue = colorOklch.h ?? 0;
	const anchorHue = anchorOklch.h ?? 0;
	const colorChroma = colorOklch.c ?? 0;
	const anchorChroma = anchorOklch.c ?? 0;

	// 無彩色の場合は調整しない
	if (colorChroma < 0.01 || anchorChroma < 0.01) {
		return colorOklch;
	}

	// 色相の差を計算（円周上の最短距離）
	let hueDiff = anchorHue - colorHue;
	if (hueDiff > 180) hueDiff -= 360;
	if (hueDiff < -180) hueDiff += 360;

	// 色相をアンカーに近づける
	let newHue = colorHue + hueDiff * factor;
	if (newHue < 0) newHue += 360;
	if (newHue >= 360) newHue -= 360;

	return {
		...colorOklch,
		h: newHue,
	};
};

/**
 * 明度を調整してコントラストを改善する
 */
const adjustLightnessForContrast = (
	colorOklch: ColorObject,
	anchorOklch: ColorObject,
): ColorObject => {
	const colorL = colorOklch.l ?? 0.5;
	const anchorL = anchorOklch.l ?? 0.5;

	// アンカーとの明度差を計算
	const lDiff = Math.abs(colorL - anchorL);

	// 明度差が小さい場合は調整
	if (lDiff < 0.3) {
		// アンカーが暗い場合は色を明るく、明るい場合は暗くする
		const targetL =
			anchorL < 0.5 ? Math.min(1, colorL + 0.2) : Math.max(0, colorL - 0.2);
		return {
			...colorOklch,
			l: targetL,
		};
	}

	return colorOklch;
};

/**
 * 調和スコア優先の代替パレットを提案する
 * Requirement 4.4: 調和スコアが閾値以下かつ再生成が可能な場合、代替パレットを提案
 *
 * @param anchorHex - アンカーカラーのHEX値
 * @param paletteHexes - 現在のパレット
 * @returns 代替パレット提案結果
 *
 * @example
 * ```ts
 * const result = suggestAlternativePalette("#FF2800", ["#808080", "#7A7A7A"]);
 * console.log(result.suggestedPalette); // 調和スコアが改善されたパレット
 * console.log(result.improvedScore); // 改善後のスコア
 * ```
 */
export const suggestAlternativePalette = (
	anchorHex: string,
	paletteHexes: string[],
): AlternativePaletteResult => {
	if (paletteHexes.length === 0) {
		throw new Error("Palette must contain at least one color");
	}

	const anchorOklch = hexToOklch(anchorHex);
	const originalScore = calculateHarmonyScore(anchorHex, paletteHexes).total;

	const suggestedPalette: string[] = [];
	const explanations: string[] = [];

	for (const hex of paletteHexes) {
		let colorOklch = hexToOklch(hex);
		let explanation = "変更なし";

		// 色相をアンカーに近づける
		const hueAdjusted = adjustHueTowardsAnchor(colorOklch, anchorOklch, 0.3);
		if (hueAdjusted.h !== colorOklch.h) {
			colorOklch = hueAdjusted;
			explanation = "色相をアンカーに近づけました";
		}

		// 明度を調整してコントラストを改善
		const contrastAdjusted = adjustLightnessForContrast(
			colorOklch,
			anchorOklch,
		);
		if (contrastAdjusted.l !== colorOklch.l) {
			colorOklch = contrastAdjusted;
			explanation =
				explanation === "変更なし"
					? "明度を調整してコントラストを改善しました"
					: `${explanation}、明度も調整`;
		}

		// ガマットクランプを適用してHEXに変換
		const clampedColor = clampChroma(colorOklch);
		suggestedPalette.push(toHex(clampedColor));
		explanations.push(explanation);
	}

	const improvedScore = calculateHarmonyScore(
		anchorHex,
		suggestedPalette,
	).total;

	return {
		suggestedPalette,
		originalScore,
		improvedScore,
		explanations,
	};
};

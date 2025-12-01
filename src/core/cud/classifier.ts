/**
 * 色分類器
 * OKLCH色空間に基づく色相クラスターと明度バケットの分類
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import type { OklchColor } from "./colors";

/**
 * 色相クラスター
 * Requirement 5.1: 9つの色相クラスター
 */
export type HueCluster =
	| "warm_red_orange"
	| "yellow"
	| "yellow_green"
	| "green"
	| "cyan_sky"
	| "blue"
	| "magenta_purple"
	| "brown"
	| "neutral";

/**
 * 明度バケット
 * Requirement 5.3: 4つの明度バケット
 */
export type LightnessBucket = "very_light" | "light" | "medium" | "dark";

/**
 * 色分類結果
 */
export interface ColorClassification {
	/** 色相クラスター */
	hueCluster: HueCluster;
	/** 明度バケット */
	lightnessBucket: LightnessBucket;
	/** 混同リスクフラグ（yellow/yellow_green + 高明度） */
	isConfusableRisk: boolean;
}

/**
 * クラスター比較結果
 */
export interface ClusterComparison {
	/** 同じ色相クラスターか */
	sameHue: boolean;
	/** 同じ明度バケットか */
	sameLightness: boolean;
}

/**
 * 彩度の閾値（これ未満は無彩色として扱う）
 */
const CHROMA_THRESHOLD = 0.03;

/**
 * 明度の閾値
 */
const LIGHTNESS_THRESHOLDS = {
	veryLight: 0.9,
	light: 0.7,
	medium: 0.45,
} as const;

/**
 * 茶色判定のパラメータ
 * 低明度 + 低彩度 + 暖色系の色相 = 茶色
 */
const BROWN_PARAMS = {
	maxLightness: 0.45,
	maxChroma: 0.12,
	hueRange: { min: 20, max: 80 }, // 暖色系の色相範囲
} as const;

/**
 * 色相範囲の定義
 * 各クラスターの色相範囲（度）
 * warm_red_orangeは0-70と340-360の両方を含む
 */
const HUE_RANGES: {
	cluster: Exclude<HueCluster, "neutral" | "brown">;
	min: number;
	max: number;
}[] = [
	{ cluster: "warm_red_orange", min: 0, max: 70 },
	{ cluster: "yellow", min: 70, max: 115 },
	{ cluster: "yellow_green", min: 115, max: 145 },
	{ cluster: "green", min: 145, max: 185 },
	{ cluster: "cyan_sky", min: 185, max: 245 },
	{ cluster: "blue", min: 245, max: 295 },
	{ cluster: "magenta_purple", min: 295, max: 340 },
	{ cluster: "warm_red_orange", min: 340, max: 360 },
];

/**
 * 色相からクラスターを判定
 * Requirement 5.1, 5.2
 *
 * @param oklch - OKLCH色値
 * @returns 色相クラスター
 */
export const classifyHue = (oklch: OklchColor): HueCluster => {
	const { l, c, h } = oklch;

	// 彩度が低い場合は無彩色
	if (c < CHROMA_THRESHOLD) {
		return "neutral";
	}

	// 茶色の判定（低明度 + 低彩度 + 暖色系）
	if (
		l < BROWN_PARAMS.maxLightness &&
		c < BROWN_PARAMS.maxChroma &&
		h >= BROWN_PARAMS.hueRange.min &&
		h <= BROWN_PARAMS.hueRange.max
	) {
		return "brown";
	}

	// 色相を0-360の範囲に正規化
	const normalizedHue = ((h % 360) + 360) % 360;

	// 色相範囲からクラスターを判定
	for (const range of HUE_RANGES) {
		if (normalizedHue >= range.min && normalizedHue < range.max) {
			return range.cluster;
		}
	}

	// 360度付近（赤）の処理
	if (normalizedHue >= 340) {
		return "warm_red_orange";
	}

	// デフォルト（念のため）
	return "warm_red_orange";
};

/**
 * 明度からバケットを判定
 * Requirement 5.3
 *
 * @param lightness - OKLCH明度（0-1）
 * @returns 明度バケット
 */
export const classifyLightness = (lightness: number): LightnessBucket => {
	if (lightness >= LIGHTNESS_THRESHOLDS.veryLight) {
		return "very_light";
	}
	if (lightness >= LIGHTNESS_THRESHOLDS.light) {
		return "light";
	}
	if (lightness >= LIGHTNESS_THRESHOLDS.medium) {
		return "medium";
	}
	return "dark";
};

/**
 * 色を総合的に分類
 * Requirement 5.4
 *
 * @param oklch - OKLCH色値
 * @returns 分類結果
 */
export const classifyColor = (oklch: OklchColor): ColorClassification => {
	const hueCluster = classifyHue(oklch);
	const lightnessBucket = classifyLightness(oklch.l);

	// 混同リスクの判定
	// yellow × yellow_green × 高明度の組み合わせは特に混同しやすい
	const isConfusableRisk =
		(hueCluster === "yellow" || hueCluster === "yellow_green") &&
		(lightnessBucket === "very_light" || lightnessBucket === "light");

	return {
		hueCluster,
		lightnessBucket,
		isConfusableRisk,
	};
};

/**
 * 2色が同じクラスター・バケットかを判定
 * Requirement 5.4
 *
 * @param color1 - 1つ目のOKLCH色
 * @param color2 - 2つ目のOKLCH色
 * @returns 比較結果
 */
export const isSameCluster = (
	color1: OklchColor,
	color2: OklchColor,
): ClusterComparison => {
	const class1 = classifyColor(color1);
	const class2 = classifyColor(color2);

	return {
		sameHue: class1.hueCluster === class2.hueCluster,
		sameLightness: class1.lightnessBucket === class2.lightnessBucket,
	};
};

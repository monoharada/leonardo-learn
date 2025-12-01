/**
 * CUD（カラーユニバーサルデザイン）推奨配色セット ver.4
 * 公式ガイドブック: https://jfly.uni-koeln.de/colorset/
 *
 * Requirements: 1.1, 1.2, 1.3
 */

import { toOklab, toOklch } from "../../utils/color-space";

/**
 * CUDカラーグループ
 */
export type CudGroup = "accent" | "base" | "neutral";

/**
 * OKLCHカラー値
 */
export interface OklchColor {
	/** 明度 (0-1) */
	l: number;
	/** 彩度 (0-0.4) */
	c: number;
	/** 色相 (0-360) */
	h: number;
}

/**
 * OKLabカラー値
 */
export interface OklabColor {
	/** 明度 (0-1) */
	l: number;
	/** 赤-緑軸 (-0.4 to 0.4) */
	a: number;
	/** 青-黄軸 (-0.4 to 0.4) */
	b: number;
}

/**
 * CUDカラー定義
 * Requirements: 1.1, 1.2, 1.3
 */
export interface CudColor {
	/** 一意の識別子 */
	id: string;
	/** カラーグループ */
	group: CudGroup;
	/** 日本語名 */
	nameJa: string;
	/** 英語名 */
	nameEn: string;
	/** HEXカラーコード（#RRGGBB形式） */
	hex: string;
	/** RGB値のタプル */
	rgb: [number, number, number];
	/** OKLCH色空間の値 */
	oklch: OklchColor;
	/** OKLab色空間の値 */
	oklab: OklabColor;
	/** JPMA色票番号（将来用） */
	jpmaCode?: string;
	/** CMYKプロセスノート（将来用） */
	cmykProcessNote?: string;
	/** マンセル値（将来用） */
	munsell?: string;
}

/**
 * RGB値からHEXコードを生成
 */
const rgbToHex = (r: number, g: number, b: number): string => {
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
};

/**
 * HEXからOKLCH値を計算
 * Requirement 1.3: HEX値からOKLCH/OKLab値を自動計算
 */
const hexToOklch = (hex: string): OklchColor => {
	const oklch = toOklch(hex);
	return {
		l: oklch?.l ?? 0,
		c: oklch?.c ?? 0,
		h: oklch?.h ?? 0,
	};
};

/**
 * HEXからOKLab値を計算
 * Requirement 1.3: HEX値からOKLCH/OKLab値を自動計算
 */
const hexToOklab = (hex: string): OklabColor => {
	const oklab = toOklab(hex);
	return {
		l: oklab?.l ?? 0,
		a: oklab?.a ?? 0,
		b: oklab?.b ?? 0,
	};
};

/**
 * CUDカラーを作成するヘルパー関数
 * モジュール初期化時にOKLCH/OKLab値を計算してキャッシュ
 */
const createCudColor = (
	id: string,
	group: CudGroup,
	nameJa: string,
	nameEn: string,
	rgb: [number, number, number],
): CudColor => {
	const hex = rgbToHex(...rgb);
	return {
		id,
		group,
		nameJa,
		nameEn,
		rgb,
		hex,
		oklch: hexToOklch(hex),
		oklab: hexToOklab(hex),
	};
};

/**
 * CUD推奨配色セット ver.4 - アクセントカラー（9色）
 * 高彩度・サインやグラフなど小さな面積でも見分けやすい色
 */
const accentColors: CudColor[] = [
	createCudColor("red", "accent", "赤", "Red", [255, 40, 0]),
	createCudColor("orange", "accent", "オレンジ", "Orange", [255, 153, 0]),
	createCudColor("yellow", "accent", "黄", "Yellow", [250, 245, 0]),
	createCudColor("green", "accent", "緑", "Green", [53, 161, 107]),
	createCudColor("blue", "accent", "青", "Blue", [0, 65, 255]),
	createCudColor("sky-blue", "accent", "空色", "Sky Blue", [102, 204, 255]),
	createCudColor("pink", "accent", "ピンク", "Pink", [255, 153, 160]),
	createCudColor("purple", "accent", "紫", "Purple", [154, 0, 121]),
	createCudColor("brown", "accent", "茶", "Brown", [102, 51, 0]),
];

/**
 * CUD推奨配色セット ver.4 - ベースカラー（7色）
 * 高明度・低彩度・案内図や地図の塗り分けなど広い面積に用いる色
 */
const baseColors: CudColor[] = [
	createCudColor(
		"bright-pink",
		"base",
		"明るいピンク",
		"Bright Pink",
		[255, 202, 191],
	),
	createCudColor("cream", "base", "クリーム", "Cream", [255, 255, 128]),
	createCudColor(
		"bright-yellow-green",
		"base",
		"明るい黄緑",
		"Bright Yellow-Green",
		[216, 242, 85],
	),
	createCudColor(
		"bright-green",
		"base",
		"明るい緑",
		"Bright Green",
		[119, 217, 168],
	),
	createCudColor(
		"bright-sky-blue",
		"base",
		"明るい空色",
		"Bright Sky Blue",
		[191, 228, 255],
	),
	createCudColor("beige", "base", "ベージュ", "Beige", [255, 202, 128]),
	createCudColor(
		"bright-purple",
		"base",
		"明るい紫",
		"Bright Purple",
		[201, 172, 230],
	),
];

/**
 * CUD推奨配色セット ver.4 - 無彩色（4色）
 * アクセントカラー・ベースカラーと誤認しにくい無彩色
 */
const neutralColors: CudColor[] = [
	createCudColor("white", "neutral", "白", "White", [255, 255, 255]),
	createCudColor(
		"light-gray",
		"neutral",
		"明るいグレー",
		"Light Gray",
		[200, 200, 203],
	),
	createCudColor("gray", "neutral", "グレー", "Gray", [132, 145, 158]),
	createCudColor("black", "neutral", "黒", "Black", [0, 0, 0]),
];

/**
 * CUD推奨配色セット - アクセントカラー（9色）
 * 高彩度・サインやグラフなど小さな面積でも見分けやすい色
 */
export const CUD_ACCENT_COLORS: readonly CudColor[] =
	Object.freeze(accentColors);

/**
 * CUD推奨配色セット - ベースカラー（7色）
 * 高明度・低彩度・案内図や地図の塗り分けなど広い面積に用いる色
 */
export const CUD_BASE_COLORS: readonly CudColor[] = Object.freeze(baseColors);

/**
 * CUD推奨配色セット - 無彩色（4色）
 * アクセントカラー・ベースカラーと誤認しにくい無彩色
 */
export const CUD_NEUTRAL_COLORS: readonly CudColor[] =
	Object.freeze(neutralColors);

/**
 * CUD推奨配色セット ver.4 - 全20色
 * Requirement 1.4: 全20色をエクスポート
 */
export const CUD_COLOR_SET: readonly CudColor[] = Object.freeze([
	...accentColors,
	...baseColors,
	...neutralColors,
]);

/**
 * OKLCH統計情報
 * Requirement 1.5: グループ別の統計情報
 */
export interface OklchStats {
	/** 明度の範囲 */
	lRange: { min: number; max: number };
	/** 彩度の範囲 */
	cRange: { min: number; max: number };
	/** 色相の円平均（chromatic colorsのみ。無彩色のみの場合はNaN） */
	hueMean: number;
	/** 色相の円標準偏差 */
	hueStd: number;
}

/**
 * 統計情報のキャッシュ
 */
const statsCache = new Map<string, OklchStats>();

/**
 * 色相の円平均を計算（circular mean）
 * 色相は0-360度の循環値なので、通常の算術平均は使えない
 */
const computeCircularMean = (hues: number[]): number => {
	if (hues.length === 0) return Number.NaN;

	// 色相をラジアンに変換
	const radians = hues.map((h) => (h * Math.PI) / 180);

	// sin と cos の平均を計算
	const sinSum = radians.reduce((sum, r) => sum + Math.sin(r), 0);
	const cosSum = radians.reduce((sum, r) => sum + Math.cos(r), 0);

	const sinMean = sinSum / hues.length;
	const cosMean = cosSum / hues.length;

	// atan2 で平均角度を計算
	const meanRad = Math.atan2(sinMean, cosMean);

	// ラジアンから度に変換（0-360の範囲に正規化）
	let meanDeg = (meanRad * 180) / Math.PI;
	if (meanDeg < 0) meanDeg += 360;

	return meanDeg;
};

/**
 * 色相の円標準偏差を計算（circular standard deviation）
 */
const computeCircularStd = (hues: number[]): number => {
	if (hues.length === 0) return Number.NaN;

	// 色相をラジアンに変換
	const radians = hues.map((h) => (h * Math.PI) / 180);

	// sin と cos の平均を計算
	const sinSum = radians.reduce((sum, r) => sum + Math.sin(r), 0);
	const cosSum = radians.reduce((sum, r) => sum + Math.cos(r), 0);

	const sinMean = sinSum / hues.length;
	const cosMean = cosSum / hues.length;

	// 結果ベクトルの長さ（mean resultant length）
	const R = Math.sqrt(sinMean * sinMean + cosMean * cosMean);

	// 円標準偏差を計算
	// sqrt(-2 * ln(R)) をラジアンで計算し、度に変換
	if (R >= 1) return 0; // 完全に集中している場合
	const stdRad = Math.sqrt(-2 * Math.log(R));
	return (stdRad * 180) / Math.PI;
};

/**
 * OKLCH統計情報を計算
 * Requirement 1.5: グループ別の統計情報
 *
 * @param groupOrColors - グループ名、色の配列、または省略で全色
 * @returns OKLCH統計情報
 */
export const computeOklchStats = (
	groupOrColors?: CudGroup | readonly CudColor[],
): OklchStats => {
	// キャッシュキーを生成
	const cacheKey =
		groupOrColors === undefined
			? "all"
			: typeof groupOrColors === "string"
				? groupOrColors
				: "custom";

	// カスタム配列以外はキャッシュを確認
	if (cacheKey !== "custom") {
		const cached = statsCache.get(cacheKey);
		if (cached) return cached;
	}

	// 対象の色を取得
	let colors: readonly CudColor[];
	if (groupOrColors === undefined) {
		colors = CUD_COLOR_SET;
	} else if (typeof groupOrColors === "string") {
		switch (groupOrColors) {
			case "accent":
				colors = CUD_ACCENT_COLORS;
				break;
			case "base":
				colors = CUD_BASE_COLORS;
				break;
			case "neutral":
				colors = CUD_NEUTRAL_COLORS;
				break;
		}
	} else {
		colors = groupOrColors;
	}

	// 統計情報を計算
	const lValues = colors.map((c) => c.oklch.l);
	const cValues = colors.map((c) => c.oklch.c);

	// 色相は彩度が低い色（achromatic）を除外
	const chromaticColors = colors.filter((c) => c.oklch.c >= 0.01);
	const hueValues = chromaticColors
		.map((c) => c.oklch.h)
		.filter((h) => !Number.isNaN(h));

	const stats: OklchStats = {
		lRange: {
			min: Math.min(...lValues),
			max: Math.max(...lValues),
		},
		cRange: {
			min: Math.min(...cValues),
			max: Math.max(...cValues),
		},
		hueMean: computeCircularMean(hueValues),
		hueStd: computeCircularStd(hueValues),
	};

	// カスタム配列以外はキャッシュに保存
	if (cacheKey !== "custom") {
		statsCache.set(cacheKey, stats);
	}

	return stats;
};

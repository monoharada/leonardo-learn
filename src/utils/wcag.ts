// @ts-expect-error apca-w3 has no type definitions
import { APCAcontrast, sRGBtoY } from "apca-w3";
import { wcagContrast } from "culori";
import { type ColorObject, toRgb } from "./color-space";

/**
 * WCAG 2.1 Contrast Ratio thresholds
 */
export const WCAG_RATIO_AA_LARGE = 3.0;
export const WCAG_RATIO_AA = 4.5;
export const WCAG_RATIO_AAA = 7.0;

/**
 * コントラストレベル型
 * AAA≥7.0, AA≥4.5, L≥3.0, fail<3.0
 *
 * @see Requirements: 3.3
 */
export type ContrastLevel = "AAA" | "AA" | "L" | "fail";

/**
 * コントラスト計算結果
 *
 * @see Requirements: 3.1, 3.2, 3.4
 */
export interface ContrastResult {
	/** WCAG 2.1 コントラスト比 (1-21) */
	wcagRatio: number;
	/** APCA Lc値 (-108 to +106) */
	apcaLc: number;
	/** WCAGコントラストレベル */
	level: ContrastLevel;
}

/**
 * Calculate WCAG 2.1 contrast ratio between two colors
 * Returns a value between 1 and 21
 */
export const getContrast = (
	color1: ColorObject,
	color2: ColorObject,
): number => {
	return wcagContrast(color1, color2);
};

/**
 * Check if a contrast ratio meets a specific level
 */
export const meetsContrast = (
	contrast: number,
	level: "AA" | "AAA" | "AA_Large",
): boolean => {
	switch (level) {
		case "AA":
			return contrast >= WCAG_RATIO_AA;
		case "AAA":
			return contrast >= WCAG_RATIO_AAA;
		case "AA_Large":
			return contrast >= WCAG_RATIO_AA_LARGE;
		default:
			return false;
	}
};

/**
 * WCAGコントラスト比からコントラストレベルを判定する
 *
 * AAA≥7.0, AA≥4.5, L≥3.0, fail<3.0
 *
 * @param ratio WCAG 2.1 コントラスト比 (1-21)
 * @returns コントラストレベル
 * @see Requirements: 3.3
 */
export function getContrastLevel(ratio: number): ContrastLevel {
	if (ratio >= WCAG_RATIO_AAA) {
		return "AAA";
	}
	if (ratio >= WCAG_RATIO_AA) {
		return "AA";
	}
	if (ratio >= WCAG_RATIO_AA_LARGE) {
		return "L";
	}
	return "fail";
}

/**
 * RGB値を0-255にクランプするヘルパー
 */
function clampRgb(value: number): number {
	return Math.max(0, Math.min(255, Math.round(value * 255)));
}

/**
 * 前景色と背景色のコントラスト結果を計算する
 *
 * WCAG 2.1コントラスト比とAPCA Lc値を同時に計算し、
 * WCAGレベル判定を行う。
 *
 * @param foreground 前景色（テキスト色）
 * @param background 背景色
 * @returns コントラスト計算結果
 * @see Requirements: 3.1, 3.2, 3.4
 */
export function calculateContrastResult(
	foreground: ColorObject,
	background: ColorObject,
): ContrastResult {
	// WCAG 2.1 コントラスト比を計算
	const wcagRatio = wcagContrast(foreground, background);

	// APCA Lc値を計算
	const fgRgb = toRgb(foreground);
	const bgRgb = toRgb(background);

	const fgY = sRGBtoY([
		clampRgb(fgRgb.r),
		clampRgb(fgRgb.g),
		clampRgb(fgRgb.b),
	]);
	const bgY = sRGBtoY([
		clampRgb(bgRgb.r),
		clampRgb(bgRgb.g),
		clampRgb(bgRgb.b),
	]);

	const apcaLc = APCAcontrast(fgY, bgY) as number;

	// WCAGレベルを判定
	const level = getContrastLevel(wcagRatio);

	return {
		wcagRatio,
		apcaLc,
		level,
	};
}

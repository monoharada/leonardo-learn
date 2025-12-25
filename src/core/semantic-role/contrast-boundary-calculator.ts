/**
 * ContrastBoundaryCalculator - コントラスト比境界計算
 *
 * 色スケールに対するコントラスト比境界位置を計算する
 * WCAG 2.x相対輝度アルゴリズム（culori.js wcagContrast）を使用
 *
 * Requirements: 6.2, 6.3, 6.6
 */

import { wcagContrast } from "culori";

/**
 * 色アイテム
 */
export interface ColorItem {
	/** スケール値（例: 50, 100, 200, ... 1200） */
	scale: number;
	/** 16進数カラーコード */
	hex: string;
}

/**
 * コントラスト境界結果
 */
export interface ContrastBoundaryResult {
	/** 白背景に対する3:1境界（開始位置） */
	white3to1: number | null;
	/** 白背景に対する4.5:1境界（開始位置） */
	white4_5to1: number | null;
	/** 黒背景に対する4.5:1境界（終了位置） */
	black4_5to1: number | null;
	/** 黒背景に対する3:1境界（終了位置） */
	black3to1: number | null;
}

/**
 * WCAG 2.x コントラスト比閾値
 */
export const CONTRAST_THRESHOLD = {
	AA_LARGE: 3.0,
	AA_NORMAL: 4.5,
} as const;

/**
 * 白背景に対する境界を検索
 *
 * 小さいscale（明るい色）から大きいscale（暗い色）へ走査し、
 * 初めてコントラスト比が閾値を超えるscaleを返す
 *
 * @param colors - 色アイテム配列（scale昇順）
 * @param threshold - コントラスト比閾値（3.0 または 4.5）
 * @returns 境界が存在するscale値（存在しない場合はnull）
 */
export function findWhiteBoundary(
	colors: ColorItem[],
	threshold: number,
): number | null {
	if (colors.length === 0) return null;

	// scale昇順にソート（明るい→暗い）
	const sortedColors = [...colors].sort((a, b) => a.scale - b.scale);

	for (const color of sortedColors) {
		const contrast = wcagContrast(color.hex, "#ffffff");
		if (contrast >= threshold) {
			return color.scale;
		}
	}

	return null;
}

/**
 * 黒背景に対する境界を検索
 *
 * 大きいscale（暗い色）から小さいscale（明るい色）へ走査し、
 * 初めてコントラスト比が閾値を超えるscaleを返す
 *
 * @param colors - 色アイテム配列
 * @param threshold - コントラスト比閾値（3.0 または 4.5）
 * @returns 境界が存在するscale値（存在しない場合はnull）
 */
export function findBlackBoundary(
	colors: ColorItem[],
	threshold: number,
): number | null {
	if (colors.length === 0) return null;

	// scale降順にソート（暗い→明るい）
	const sortedColors = [...colors].sort((a, b) => b.scale - a.scale);

	for (const color of sortedColors) {
		const contrast = wcagContrast(color.hex, "#000000");
		if (contrast >= threshold) {
			return color.scale;
		}
	}

	return null;
}

/**
 * 色スケール配列からコントラスト境界位置を計算
 *
 * @param colors - 色アイテム配列（scale昇順）
 * @returns 各境界のscale位置
 */
export function calculateBoundaries(
	colors: ColorItem[],
): ContrastBoundaryResult {
	return {
		white3to1: findWhiteBoundary(colors, CONTRAST_THRESHOLD.AA_LARGE),
		white4_5to1: findWhiteBoundary(colors, CONTRAST_THRESHOLD.AA_NORMAL),
		black4_5to1: findBlackBoundary(colors, CONTRAST_THRESHOLD.AA_NORMAL),
		black3to1: findBlackBoundary(colors, CONTRAST_THRESHOLD.AA_LARGE),
	};
}

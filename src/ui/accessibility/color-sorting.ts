/**
 * カラーソートモジュール
 *
 * アクセシビリティビューで使用する色の並べ替えロジックを提供する。
 * 3種類のソートタイプをサポート:
 * - Hue（色相順）
 * - DeltaE（色差順 - 類似色を隣接）
 * - Lightness（明度順）
 *
 * @module @/ui/accessibility/color-sorting
 */

import {
	calculateSimpleDeltaE as calculateDeltaE,
	DISTINGUISHABILITY_THRESHOLD,
} from "@/accessibility/distinguishability";
import type { Color } from "@/core/color";

/**
 * ソートタイプ
 */
export type SortType = "hue" | "deltaE" | "lightness";

/**
 * 名前付きカラー
 */
export interface NamedColor {
	name: string;
	color: Color;
}

/**
 * 隣接境界検証結果
 */
export interface BoundaryValidationResult {
	/** 境界インデックス（左側の色のインデックス） */
	index: number;
	/** 左側の色名 */
	leftName: string;
	/** 右側の色名 */
	rightName: string;
	/** 色差（ΔE） */
	deltaE: number;
	/** 識別可能かどうか（ΔEOK >= 5.0） */
	isDistinguishable: boolean;
}

/**
 * ソート結果
 */
export interface SortResult {
	/** ソート済み色リスト */
	sortedColors: NamedColor[];
	/** 隣接境界検証結果 */
	boundaryValidations: BoundaryValidationResult[];
	/** ソートタイプ */
	sortType: SortType;
}

// DISTINGUISHABILITY_THRESHOLD is imported from @/accessibility/distinguishability

/**
 * 色相（Hue）でソートする
 *
 * OKLCH色空間のH値（0-360）で昇順ソート。
 *
 * @param colors 色リスト
 * @returns ソート済み色リスト
 */
export function sortByHue(colors: NamedColor[]): NamedColor[] {
	return [...colors].sort((a, b) => {
		const hueA = a.color.oklch.h ?? 0;
		const hueB = b.color.oklch.h ?? 0;
		return hueA - hueB;
	});
}

/**
 * 明度（Lightness）でソートする
 *
 * OKLCH色空間のL値（0-1）で昇順ソート（暗→明）。
 *
 * @param colors 色リスト
 * @returns ソート済み色リスト
 */
export function sortByLightness(colors: NamedColor[]): NamedColor[] {
	return [...colors].sort((a, b) => {
		const lightnessA = a.color.oklch.l ?? 0;
		const lightnessB = b.color.oklch.l ?? 0;
		return lightnessA - lightnessB;
	});
}

/**
 * 色差（ΔE）でソートする（類似色を隣接させる）
 *
 * 貪欲法を使用して、隣接色間のΔEが最小になるよう並べ替える。
 * 最初の色を基点として、未配置の色から最も近い色を次々と選択する。
 *
 * @param colors 色リスト
 * @returns ソート済み色リスト
 */
export function sortByDeltaE(colors: NamedColor[]): NamedColor[] {
	if (colors.length <= 1) return [...colors];

	const remaining = [...colors];
	const sorted: NamedColor[] = [];

	// 最初の色を選択（最も明るい色を基点とする）
	remaining.sort((a, b) => {
		const lightnessA = a.color.oklch.l ?? 0;
		const lightnessB = b.color.oklch.l ?? 0;
		return lightnessB - lightnessA;
	});

	const first = remaining.shift();
	if (first) sorted.push(first);

	// 貪欲法で残りの色を並べる
	while (remaining.length > 0) {
		const lastColor = sorted[sorted.length - 1];
		if (!lastColor) break;

		let minDeltaE = Number.POSITIVE_INFINITY;
		let closestIndex = 0;

		for (let i = 0; i < remaining.length; i++) {
			const candidate = remaining[i];
			if (!candidate) continue;
			const deltaE = calculateDeltaE(lastColor.color, candidate.color);
			if (deltaE < minDeltaE) {
				minDeltaE = deltaE;
				closestIndex = i;
			}
		}

		const closest = remaining.splice(closestIndex, 1)[0];
		if (closest) sorted.push(closest);
	}

	return sorted;
}

/**
 * 隣接境界を検証する
 *
 * ソート済み色リストの隣接ペア間の色差を計算し、識別可能性を判定する。
 *
 * @param colors ソート済み色リスト
 * @returns 隣接境界検証結果リスト
 */
export function validateBoundaries(
	colors: NamedColor[],
): BoundaryValidationResult[] {
	const results: BoundaryValidationResult[] = [];

	for (let i = 0; i < colors.length - 1; i++) {
		const left = colors[i];
		const right = colors[i + 1];
		if (!left || !right) continue;

		const deltaE = calculateDeltaE(left.color, right.color);
		results.push({
			index: i,
			leftName: left.name,
			rightName: right.name,
			deltaE,
			isDistinguishable: deltaE >= DISTINGUISHABILITY_THRESHOLD,
		});
	}

	return results;
}

/** ソート関数のマッピング */
const sortFunctions: Record<SortType, (colors: NamedColor[]) => NamedColor[]> =
	{
		hue: sortByHue,
		deltaE: sortByDeltaE,
		lightness: sortByLightness,
	};

/**
 * 指定されたソートタイプで色をソートし、境界検証を実行する
 *
 * @param colors 色リスト
 * @param sortType ソートタイプ
 * @returns ソート結果（ソート済み色リスト + 境界検証結果）
 */
export function sortColorsWithValidation(
	colors: NamedColor[],
	sortType: SortType,
): SortResult {
	const sortFn = sortFunctions[sortType];
	const sortedColors = sortFn(colors);
	const boundaryValidations = validateBoundaries(sortedColors);

	return {
		sortedColors,
		boundaryValidations,
		sortType,
	};
}

/** ソートタイプの表示名マッピング */
const sortTypeNames: Record<SortType, string> = {
	hue: "色相順 (Hue)",
	deltaE: "色差順 (ΔE)",
	lightness: "明度順 (Lightness)",
};

/**
 * ソートタイプの表示名を取得する
 *
 * @param sortType ソートタイプ
 * @returns 表示名（日本語）
 */
export function getSortTypeName(sortType: SortType): string {
	return sortTypeNames[sortType];
}

/**
 * 利用可能なすべてのソートタイプを取得する
 *
 * @returns ソートタイプ配列
 */
export function getAllSortTypes(): SortType[] {
	return ["hue", "deltaE", "lightness"];
}

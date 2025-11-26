/**
 * BaseChroma - 基本クロマ（12色相）定義
 *
 * デザインシステムとして一貫性のある色体系を提供するため、
 * 12の基本色相を定義し、生成された色をスナップさせる
 */

import { Color } from "./color";

/**
 * 基本クロマの定義
 * 各色相のOKLCH Hue値を定義
 */
export interface BaseChromaDefinition {
	name: string;
	hue: number; // OKLCH Hue (0-360)
	displayName: string;
}

/**
 * 13の基本クロマ定義
 * Hue値はOKLCH色空間に基づく
 * 青から色相順に並べる
 */
export const BASE_CHROMAS: BaseChromaDefinition[] = [
	{ name: "blue", hue: 250, displayName: "Blue" },
	{ name: "indigo", hue: 275, displayName: "Indigo" },
	{ name: "purple", hue: 300, displayName: "Purple" },
	{ name: "magenta", hue: 330, displayName: "Magenta" },
	{ name: "pink", hue: 350, displayName: "Pink" },
	{ name: "red", hue: 25, displayName: "Red" },
	{ name: "orange", hue: 55, displayName: "Orange" },
	{ name: "amber", hue: 75, displayName: "Amber" },
	{ name: "yellow", hue: 95, displayName: "Yellow" },
	{ name: "lime", hue: 125, displayName: "Lime" },
	{ name: "green", hue: 145, displayName: "Green" },
	{ name: "teal", hue: 175, displayName: "Teal" },
	{ name: "cyan", hue: 195, displayName: "Cyan" },
];

/**
 * DADS用の10色相定義
 * 実際のDADSカラーパレットから抽出したHue値
 * 色相順（青から）に並べる
 */
export const DADS_CHROMAS: BaseChromaDefinition[] = [
	{ name: "blue", hue: 266, displayName: "Blue" },
	{ name: "cyan", hue: 251, displayName: "Light Blue" },
	{ name: "teal", hue: 216, displayName: "Cyan" },
	{ name: "green", hue: 157, displayName: "Green" },
	{ name: "lime", hue: 128, displayName: "Lime" },
	{ name: "yellow", hue: 88, displayName: "Yellow" },
	{ name: "orange", hue: 41, displayName: "Orange" },
	{ name: "red", hue: 27, displayName: "Red" },
	{ name: "magenta", hue: 328, displayName: "Magenta" },
	{ name: "purple", hue: 299, displayName: "Purple" },
];

/**
 * Hue値の差を計算（円周上の最短距離）
 */
function hueDistance(hue1: number, hue2: number): number {
	const diff = Math.abs(hue1 - hue2);
	return Math.min(diff, 360 - diff);
}

/**
 * 指定されたHue値に最も近い基本クロマを見つける
 *
 * @param hue - 入力Hue値（0-360）
 * @returns 最も近い基本クロマ定義
 */
export function findNearestChroma(hue: number): BaseChromaDefinition {
	const first = BASE_CHROMAS[0];
	if (!first) {
		throw new Error("BASE_CHROMAS is empty");
	}
	let nearest = first;
	let minDistance = hueDistance(hue, nearest.hue);

	for (const chroma of BASE_CHROMAS) {
		const distance = hueDistance(hue, chroma.hue);
		if (distance < minDistance) {
			minDistance = distance;
			nearest = chroma;
		}
	}

	return nearest;
}

/**
 * 色を最も近い基本クロマにスナップする
 *
 * @param color - 入力色
 * @returns スナップされた色と基本クロマ情報
 */
export function snapToBaseChroma(color: Color): {
	color: Color;
	chroma: BaseChromaDefinition;
} {
	const oklch = color.oklch;
	const inputHue = oklch.h ?? 0;

	// 最も近い基本クロマを見つける
	const nearestChroma = findNearestChroma(inputHue);

	// Hueを基本クロマにスナップし、L/Cは維持
	const snappedColor = new Color({
		mode: "oklch",
		l: oklch.l,
		c: oklch.c,
		h: nearestChroma.hue,
	});

	return {
		color: snappedColor,
		chroma: nearestChroma,
	};
}

/**
 * 基本クロマ名から色を生成する
 *
 * @param chromaName - 基本クロマ名
 * @param lightness - 明度（0-1）
 * @param chroma - 彩度（0-0.4）
 * @returns 生成された色
 */
export function createColorFromChroma(
	chromaName: string,
	lightness: number = 0.6,
	chroma: number = 0.15,
): Color | null {
	const baseChroma = BASE_CHROMAS.find((c) => c.name === chromaName);
	if (!baseChroma) return null;

	return new Color({
		mode: "oklch",
		l: lightness,
		c: chroma,
		h: baseChroma.hue,
	});
}

/**
 * 全ての基本クロマ名を取得
 */
export function getBaseChromaNames(): string[] {
	return BASE_CHROMAS.map((c) => c.name);
}

/**
 * 基本クロマの表示名を取得
 */
export function getChromaDisplayName(chromaName: string): string {
	const chroma = BASE_CHROMAS.find((c) => c.name === chromaName);
	return chroma?.displayName ?? chromaName;
}

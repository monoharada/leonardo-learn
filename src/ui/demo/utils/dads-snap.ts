/**
 * DADSトークンスナップユーティリティ
 *
 * 計算で生成された色を最も近いDADSトークンにスナップするためのユーティリティ関数群。
 * OKLab色差（deltaE）を使用して最も近い色を見つける。
 *
 * @module @/ui/demo/utils/dads-snap
 */

import { wcagContrast } from "culori";
import { findNearestChroma } from "@/core/base-chroma";
import { Color } from "@/core/color";
import type { DadsToken } from "@/core/tokens/types";
import { deltaEok, toOklab } from "@/utils/color-space";
import type { StudioPresetType } from "../types";

/** 色相補完時の最小距離（度） */
export const MIN_HUE_DISTANCE = 30;

/** スナップ結果の型 */
export interface DadsSnapResult {
	hex: string;
	step?: number;
	baseChromaName?: string;
}

/**
 * プリセットに基づいて色がマッチするか判定
 */
export function matchesPreset(hex: string, preset: StudioPresetType): boolean {
	const oklch = new Color(hex).oklch;
	if (!oklch) return true;

	const l = oklch.l ?? 0.5;
	const c = oklch.c ?? 0;

	switch (preset) {
		case "pastel":
			return l >= 0.75 && c <= 0.1;
		case "vibrant":
			return c >= 0.12 && l >= 0.35 && l <= 0.85;
		case "dark":
			return l <= 0.4;
		case "high-contrast":
		case "default":
			return true;
	}
}

/**
 * プリセットに基づいて最小コントラスト比を取得
 */
export function resolvePresetMinContrast(preset: StudioPresetType): number {
	switch (preset) {
		case "high-contrast":
			return 7;
		case "pastel":
			return 3;
		default:
			return 4.5;
	}
}

/**
 * HEX値から基本色相名を推測
 */
export function inferBaseChromaNameFromHex(hex: string): string {
	const parsed = new Color(hex).oklch;
	const hue = parsed?.h ?? 0;
	return findNearestChroma(hue).displayName;
}

/**
 * chromaticカテゴリかつ有効なHEX値を持つDADSトークンを抽出
 */
export function filterChromaticDadsTokens(
	dadsTokens: DadsToken[],
): DadsToken[] {
	return dadsTokens.filter(
		(token) =>
			token.classification.category === "chromatic" &&
			token.hex.startsWith("#"),
	);
}

/**
 * 計算で生成された色を最も近いDADSトークンにスナップする
 * OKLab色差（deltaE）を使用して最も近い色を見つける
 *
 * @param hex - スナップ対象のHEX色
 * @param dadsTokens - DADSトークン配列
 * @param preset - プリセット（フィルタ用）
 * @returns 最も近いDADSトークンの情報、見つからない場合はnull
 */
export function snapToNearestDadsToken(
	hex: string,
	dadsTokens: DadsToken[],
	preset: StudioPresetType,
): DadsSnapResult | null {
	const targetOklab = toOklab(hex);
	if (!targetOklab) return null;

	// chromaticカテゴリかつ有効なHEX値を持つトークンのみ
	const chromaticTokens = filterChromaticDadsTokens(dadsTokens);

	// プリセットでフィルタ（オプション）
	const filteredTokens = chromaticTokens.filter((token) =>
		matchesPreset(token.hex, preset),
	);

	// フィルタ後が空なら全chromaticから選択
	const candidates =
		filteredTokens.length > 0 ? filteredTokens : chromaticTokens;

	let bestToken: DadsToken | null = null;
	let bestDeltaE = Number.POSITIVE_INFINITY;

	for (const token of candidates) {
		const tokenOklab = toOklab(token.hex);
		if (!tokenOklab) continue;

		const dE = deltaEok(targetOklab, tokenOklab);
		if (dE < bestDeltaE) {
			bestDeltaE = dE;
			bestToken = token;
		}
	}

	if (!bestToken) return null;

	return {
		hex: bestToken.hex,
		step: bestToken.classification.scale,
		baseChromaName: inferBaseChromaNameFromHex(bestToken.hex),
	};
}

/**
 * Fisher-Yatesシャッフル
 * 配列を正しく均等にシャッフルする
 */
function fisherYatesShuffle<T>(array: T[], rnd: () => number): T[] {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1));
		const temp = result[i];
		// TypeScript strict mode: array[i]とarray[j]は範囲内であることが保証されている
		result[i] = result[j] as T;
		result[j] = temp as T;
	}
	return result;
}

/**
 * 2つの色相間の距離を計算（円周上の最短距離）
 */
export function hueDistance(h1: number, h2: number): number {
	const diff = Math.abs(h1 - h2);
	return Math.min(diff, 360 - diff);
}

/**
 * 指定された色相が既存の色相すべてと十分に離れているか判定
 */
export function isHueFarEnough(hue: number, existingHues: number[]): boolean {
	return existingHues.every(
		(existing) => hueDistance(hue, existing) >= MIN_HUE_DISTANCE,
	);
}

/**
 * 既存色相と十分に離れた色をDADSトークンから選択
 * ハーモニーで生成された色が不足している場合の補完用
 *
 * @param existingHues - 既存の色相配列
 * @param needed - 必要な色数
 * @param dadsTokens - DADSトークン配列
 * @param preset - プリセット
 * @param backgroundHex - 背景色（コントラスト計算用）
 * @param rnd - 乱数生成関数
 * @returns DADSトークンから選択された色の配列
 */
export function selectHueDistantColors(
	existingHues: number[],
	needed: number,
	dadsTokens: DadsToken[],
	preset: StudioPresetType,
	backgroundHex: string,
	rnd: () => number,
): DadsSnapResult[] {
	const minContrast = resolvePresetMinContrast(preset);

	// 選択済みの色相を追跡（既存 + 新規選択分）
	const usedHues = [...existingHues];

	// DADSトークンから候補を抽出
	// chromaticカテゴリかつ有効なHEX値を持つトークンのみ
	const candidates = dadsTokens.filter((token) => {
		// セマンティックトークン（var()参照）を除外
		if (token.classification.category !== "chromatic") return false;
		if (!token.hex.startsWith("#")) return false;

		const color = new Color(token.hex);
		const oklch = color.oklch;
		if (!oklch) return false;

		const hue = oklch.h ?? 0;

		// 色相距離チェック
		if (!isHueFarEnough(hue, usedHues)) return false;

		// プリセットフィルタ
		if (!matchesPreset(token.hex, preset)) return false;

		// コントラストチェック
		const contrast = wcagContrast(token.hex, backgroundHex);
		if (contrast < minContrast) return false;

		return true;
	});

	// Fisher-Yatesシャッフルで均等にランダム化
	const shuffled = fisherYatesShuffle(candidates, rnd);

	const selected: DadsSnapResult[] = [];

	// 色相が被らないように順次選択
	for (const token of shuffled) {
		if (selected.length >= needed) break;

		const color = new Color(token.hex);
		const hue = color.oklch?.h ?? 0;

		// この候補が既に選択した色と十分に離れているか再チェック
		if (isHueFarEnough(hue, usedHues)) {
			selected.push({
				hex: token.hex,
				step: token.classification.scale,
				baseChromaName: inferBaseChromaNameFromHex(token.hex),
			});
			usedHues.push(hue);
		}
	}

	return selected;
}

/**
 * 結果がDADSトークンから取得されたものか検証
 * テスト用のヘルパー関数
 *
 * @param result - スナップ結果
 * @param dadsTokens - DADSトークン配列
 * @returns 結果がDADSトークンに存在する場合はtrue
 */
export function isDadsTokenResult(
	result: DadsSnapResult,
	dadsTokens: DadsToken[],
): boolean {
	const chromaticTokens = filterChromaticDadsTokens(dadsTokens);
	return chromaticTokens.some(
		(token) => token.hex.toLowerCase() === result.hex.toLowerCase(),
	);
}

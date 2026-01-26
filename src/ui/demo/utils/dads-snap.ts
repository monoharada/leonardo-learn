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

/**
 * 色の明度を調整して目標コントラスト比を達成する
 *
 * パステル色と明るい背景の組み合わせで使用。
 * 色相・彩度を可能な限り維持しながら、明度のみを調整。
 *
 * @param colorHex - 調整対象の色（HEX）
 * @param backgroundHex - 背景色（HEX）
 * @param targetContrast - 目標コントラスト比
 * @returns 調整後の色（HEX）。既にコントラストを満たしている場合は元の色を返す
 */
export function adjustLightnessForContrast(
	colorHex: string,
	backgroundHex: string,
	targetContrast: number,
): string {
	const currentContrast = wcagContrast(backgroundHex, colorHex) ?? 0;

	// 既にコントラストを満たしている場合は元の色を返す
	if (currentContrast >= targetContrast) {
		return colorHex;
	}

	const color = new Color(colorHex);
	const oklch = color.oklch;
	if (!oklch) return colorHex;

	const background = new Color(backgroundHex);
	const bgL = background.oklch?.l ?? 0.5;

	// 色相と彩度を維持
	const hue = oklch.h ?? 0;
	const chroma = oklch.c ?? 0;

	// 明るい背景に対しては暗くする方向、暗い背景に対しては明るくする方向を探索
	const isLightBackground = bgL > 0.5;

	// 二分探索で目標コントラストを達成する明度を探す
	// 明るい背景: 明度を下げる（0〜現在）、暗い背景: 明度を上げる（現在〜1）
	const currentL = oklch.l ?? 0.5;
	let low = isLightBackground ? 0 : currentL;
	let high = isLightBackground ? currentL : 1;

	let bestL = currentL;
	let bestContrast = currentContrast;
	const maxIterations = 25;

	for (let i = 0; i < maxIterations; i++) {
		const mid = (low + high) / 2;
		const candidate = new Color({ mode: "oklch", l: mid, c: chroma, h: hue });
		const contrast = wcagContrast(backgroundHex, candidate.toHex()) ?? 0;

		// Track the best value that meets or exceeds the target
		if (contrast >= targetContrast) {
			if (bestContrast < targetContrast || contrast < bestContrast) {
				bestContrast = contrast;
				bestL = mid;
			}
		}

		// Adjust search range based on contrast result
		// Light background: lower lightness = higher contrast
		// Dark background: higher lightness = higher contrast
		const needMoreContrast = contrast < targetContrast;
		if (isLightBackground) {
			if (needMoreContrast) high = mid;
			else low = mid;
		} else {
			if (needMoreContrast) low = mid;
			else high = mid;
		}

		if (Math.abs(high - low) < 0.001) break;
	}

	// If we couldn't find a solution that meets the target, use the most extreme value
	if (bestContrast < targetContrast) {
		bestL = isLightBackground ? 0 : 1;
	}

	const result = new Color({ mode: "oklch", l: bestL, c: chroma, h: hue });
	return result.toHex();
}

/**
 * パステル色から背景用/テキスト用のカラーペアを生成
 *
 * パステルプリセット用の「スマートカラーロール」機能。
 * パステル色を背景として活用し、同じ色相の濃い色をテキストに使用することで、
 * パステルの柔らかさを維持しつつアクセシビリティを確保する。
 *
 * @param pastelHex - パステル色（HEX）- 背景用にそのまま使用
 * @param pageBackgroundHex - ページ背景色（HEX）- テキストコントラスト計算の基準
 * @param textContrastTarget - テキスト用の目標コントラスト比（デフォルト: 4.5）
 * @returns 背景色とテキスト色のペア
 */
export function createPastelColorPair(
	pastelHex: string,
	pageBackgroundHex: string,
	textContrastTarget = 4.5,
): { background: string; text: string } {
	const color = new Color(pastelHex);
	const oklch = color.oklch;

	if (!oklch) {
		// フォールバック: パステル色をそのまま返す
		return { background: pastelHex, text: pastelHex };
	}

	const hue = oklch.h ?? 0;
	const chroma = oklch.c ?? 0;

	// 背景色はパステル色をそのまま使用
	const background = pastelHex;

	// テキスト色: 同じ色相で明度を下げてコントラストを確保
	// adjustLightnessForContrastを使用して目標コントラストを達成
	const text = adjustLightnessForContrast(
		pastelHex,
		pageBackgroundHex,
		textContrastTarget,
	);

	// 彩度を少し上げてテキストの視認性を向上
	// （パステル色は低彩度なので、濃くすると色味が薄くなりがち）
	const textColor = new Color(text);
	const textOklch = textColor.oklch;
	if (textOklch) {
		// 彩度を1.5倍に（ただし最大0.15まで）
		const enhancedChroma = Math.min(chroma * 1.5, 0.15);
		const enhancedText = new Color({
			mode: "oklch",
			l: textOklch.l,
			c: enhancedChroma,
			h: hue,
		});

		// 彩度強化後もコントラストが維持されているか確認
		const enhancedContrast =
			wcagContrast(pageBackgroundHex, enhancedText.toHex()) ?? 0;
		if (enhancedContrast >= textContrastTarget) {
			return { background, text: enhancedText.toHex() };
		}
	}

	return { background, text };
}

/**
 * パステル背景から柔らかいボーダー色を生成
 *
 * 色相を維持しながら、低コントラストで目立たない色に調整する。
 * パステルプリセット用のボーダー色生成に使用。
 *
 * @param pastelHex - パステル色（HEX）
 * @returns 柔らかいボーダー色（HEX）
 */
export function createSoftBorderColor(pastelHex: string): string {
	try {
		const color = new Color(pastelHex);
		const oklch = color.oklch;
		if (!oklch) return "#E8E8E8";

		// 明度を少し下げ、彩度を維持しつつ色相を保つ
		const result = new Color({
			mode: "oklch",
			l: Math.max((oklch.l ?? 0.9) - 0.15, 0.6),
			c: (oklch.c ?? 0) * 0.8,
			h: oklch.h,
		});
		return result.toHex();
	} catch {
		// 無効な色の場合はフォールバック値を返す
		return "#E8E8E8";
	}
}

/** 色相補完時の最小距離（度） */
export const MIN_HUE_DISTANCE = 30;

/** スナップ結果の型 */
export interface DadsSnapResult {
	hex: string;
	step?: number;
	baseChromaName?: string;
}

/** DADSスナップ候補（近傍トークン探索用） */
export interface DadsSnapCandidate extends DadsSnapResult {
	/** ターゲット色との距離（OKLab deltaE） */
	deltaE: number;
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
 * 計算色に近いDADSトークン候補をdeltaE順で返す（近傍探索用）
 *
 * - chromaticカテゴリのみ
 * - presetフィルタを適用（該当が空なら全chromatic）
 */
export function findNearestDadsTokenCandidates(
	hex: string,
	dadsTokens: DadsToken[],
	preset: StudioPresetType,
	limit: number,
): DadsSnapCandidate[] {
	const targetOklab = toOklab(hex);
	if (!targetOklab) return [];

	const finalLimit = Number.isFinite(limit)
		? Math.max(0, Math.floor(limit))
		: 0;
	if (finalLimit === 0) return [];

	const chromaticTokens = filterChromaticDadsTokens(dadsTokens);

	const filteredTokens = chromaticTokens.filter((token) =>
		matchesPreset(token.hex, preset),
	);
	const candidates =
		filteredTokens.length > 0 ? filteredTokens : chromaticTokens;

	const scored: Array<{ token: DadsToken; deltaE: number }> = [];
	for (const token of candidates) {
		const tokenOklab = toOklab(token.hex);
		if (!tokenOklab) continue;
		const dE = deltaEok(targetOklab, tokenOklab);
		scored.push({ token, deltaE: dE });
	}

	scored.sort((a, b) => a.deltaE - b.deltaE);

	return scored.slice(0, finalLimit).map(({ token, deltaE }) => ({
		hex: token.hex,
		step: token.classification.scale,
		baseChromaName: inferBaseChromaNameFromHex(token.hex),
		deltaE,
	}));
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
	const candidates = findNearestDadsTokenCandidates(hex, dadsTokens, preset, 1);
	const best = candidates[0];
	if (!best) return null;
	return {
		hex: best.hex,
		step: best.step,
		baseChromaName: best.baseChromaName,
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

	const candidatesWithContrastAndHue = dadsTokens.filter((token) => {
		if (token.classification.category !== "chromatic") return false;
		if (!token.hex.startsWith("#")) return false;

		const color = new Color(token.hex);
		const oklch = color.oklch;
		if (!oklch) return false;

		const hue = oklch.h ?? 0;
		if (!isHueFarEnough(hue, usedHues)) return false;
		if (!matchesPreset(token.hex, preset)) return false;

		const contrast = wcagContrast(token.hex, backgroundHex);
		if (contrast < minContrast) return false;

		return true;
	});

	const candidatesWithContrast = dadsTokens.filter((token) => {
		if (token.classification.category !== "chromatic") return false;
		if (!token.hex.startsWith("#")) return false;

		const color = new Color(token.hex);
		const oklch = color.oklch;
		if (!oklch) return false;

		if (!matchesPreset(token.hex, preset)) return false;

		const contrast = wcagContrast(token.hex, backgroundHex);
		if (contrast < minContrast) return false;

		return true;
	});

	const candidatesWithoutContrastCheck = dadsTokens.filter((token) => {
		if (token.classification.category !== "chromatic") return false;
		if (!token.hex.startsWith("#")) return false;
		if (!matchesPreset(token.hex, preset)) return false;
		return true;
	});

	// コントラストは維持し、色相距離のみを緩めてフォールバックする（DADS token を維持する）。
	const candidates =
		candidatesWithContrastAndHue.length >= needed
			? candidatesWithContrastAndHue
			: candidatesWithContrast.length > 0
				? candidatesWithContrast
				: candidatesWithoutContrastCheck;

	// Fisher-Yatesシャッフルで均等にランダム化
	const shuffled = fisherYatesShuffle(candidates, rnd);

	const selected: DadsSnapResult[] = [];
	const selectedHexes = new Set<string>();

	const addIfOk = (token: DadsToken, allowNearHue: boolean): void => {
		if (selected.length >= needed) return;
		const key = token.hex.trim().toLowerCase();
		if (selectedHexes.has(key)) return;

		const hue = new Color(token.hex).oklch?.h ?? 0;
		if (!allowNearHue && !isHueFarEnough(hue, usedHues)) return;

		selected.push({
			hex: token.hex,
			step: token.classification.scale,
			baseChromaName: inferBaseChromaNameFromHex(token.hex),
		});
		selectedHexes.add(key);
		usedHues.push(hue);
	};

	// まずは色相距離を守って選択（可能な限り）
	for (const token of shuffled) addIfOk(token, false);
	// 足りない場合のみ、色相距離制約を緩めて補完
	if (selected.length < needed) {
		for (const token of shuffled) addIfOk(token, true);
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

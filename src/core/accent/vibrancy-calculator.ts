/**
 * VibrancyCalculator
 * Adobe Color戦略に基づく鮮やかさスコア計算
 *
 * 目的:
 * - 濁りやすい色相帯（黄色/オレンジ/茶色系: 20-120度）で高明度を優遇
 * - 低彩度・低明度の「くすんだ」色を避け、鮮やかな候補を選定
 *
 * スコア構成:
 * - 基本彩度スコア（0-50点）: chroma 0.2以上で満点
 * - 明度調整スコア（0-50点）: 問題色相帯では高明度にボーナス
 *
 * @module vibrancy-calculator
 */

import { toOklch } from "../../utils/color-space";

/**
 * 鮮やかさスコア計算結果
 */
export interface VibrancyScoreResult {
	/** 総合スコア（0-100） */
	score: number;
	/** 彩度スコア（0-50） */
	chromaScore: number;
	/** 明度スコア（0-50） */
	lightnessScore: number;
}

/**
 * 色相帯の分類
 */
export type HueZone = "yellow-orange" | "brown" | "normal";

/**
 * 色相帯を判定する
 * OKLCH Hue基準:
 * - 20-30度: 茶色帯
 * - 30-120度: 黄色/オレンジ帯（問題色相帯）
 * - その他: 通常帯
 *
 * @param hue OKLCH色相（0-360）
 * @returns 色相帯の分類
 */
export function classifyHueZone(hue: number): HueZone {
	const normalizedHue = ((hue % 360) + 360) % 360;

	if (normalizedHue >= 30 && normalizedHue <= 120) {
		return "yellow-orange";
	}
	if (normalizedHue >= 20 && normalizedHue < 30) {
		return "brown";
	}
	return "normal";
}

/**
 * 色が問題色相帯（濁りやすい色相）かどうかを判定
 * OKLCH Hue: 30-120度が問題帯
 *
 * @param hue OKLCH色相（0-360）
 * @returns 問題色相帯の場合true
 */
export function isMuddyHueZone(hue: number): boolean {
	return classifyHueZone(hue) === "yellow-orange";
}

/**
 * 明度スコアを計算（色相帯に応じた調整）
 *
 * @param lightness OKLCH明度（0-1）
 * @param zone 色相帯の分類
 * @returns 明度スコア（0-50）
 */
function calculateLightnessScore(lightness: number, zone: HueZone): number {
	switch (zone) {
		case "yellow-orange":
			// 黄色/オレンジ帯（30-120度）: Adobe Colorは明度70-95%を選択
			if (lightness >= 0.75) {
				return 50; // 高明度は大幅ボーナス
			}
			if (lightness >= 0.6) {
				return 35; // 中高明度はボーナス
			}
			return 10; // 低明度はペナルティ

		case "brown":
			// 茶色帯（20-30度）
			return lightness >= 0.6 ? 40 : 15;

		default:
			// 通常帯: ニュートラルなスコア
			return 25;
	}
}

/**
 * 色の鮮やかさスコアを計算（Adobe Color戦略）
 *
 * 問題色相帯では高明度を大幅に優遇し、濁った色を避ける。
 * スコアは基本彩度（0-50点）と明度調整（0-50点）の合計で構成。
 *
 * @param hex HEX色（#RRGGBB形式）
 * @returns 鮮やかさスコア（0-100）、変換失敗時は0
 */
export function calculateVibrancyScore(hex: string): number {
	try {
		const oklch = toOklch(hex);
		if (!oklch) return 0;

		const chroma = oklch.c ?? 0;
		const lightness = oklch.l ?? 0.5;
		const hue = oklch.h ?? 0;

		// 1. 基本彩度スコア（0-50点）
		// chroma 0.2以上で満点
		const chromaScore = Math.min(chroma / 0.2, 1.0) * 50;

		// 2. 色相帯に応じた明度スコア（0-50点）
		const zone = classifyHueZone(hue);
		const lightnessScore = calculateLightnessScore(lightness, zone);

		return chromaScore + lightnessScore;
	} catch {
		// toOklchがエラーをスローした場合は低スコアを返す
		return 0;
	}
}

/**
 * 色の鮮やかさスコアを詳細情報付きで計算
 *
 * @param hex HEX色（#RRGGBB形式）
 * @returns 詳細なスコア情報、変換失敗時はnull
 */
export function calculateVibrancyScoreDetailed(
	hex: string,
): VibrancyScoreResult | null {
	try {
		const oklch = toOklch(hex);
		if (!oklch) return null;

		const chroma = oklch.c ?? 0;
		const lightness = oklch.l ?? 0.5;
		const hue = oklch.h ?? 0;

		const chromaScore = Math.min(chroma / 0.2, 1.0) * 50;
		const zone = classifyHueZone(hue);
		const lightnessScore = calculateLightnessScore(lightness, zone);

		return {
			score: chromaScore + lightnessScore,
			chromaScore,
			lightnessScore,
		};
	} catch {
		return null;
	}
}

/**
 * 事前計算された色相を使用した鮮やかさスコア計算
 *
 * 既にOKLCH変換済みで色相が分かっている場合に使用。
 * toOklchの重複呼び出しを避けるための最適化版。
 *
 * @param hex HEX色（#RRGGBB形式）
 * @param precomputedHue 事前計算されたOKLCH色相（0-360）
 * @returns 鮮やかさスコア（0-100）
 */
export function calculateVibrancyScoreWithHue(
	hex: string,
	precomputedHue: number,
): number {
	try {
		const oklch = toOklch(hex);
		if (!oklch) return 0;

		const chroma = oklch.c ?? 0;
		const lightness = oklch.l ?? 0.5;

		// 基本彩度スコア（0-50点）
		const chromaScore = Math.min(chroma / 0.2, 1.0) * 50;

		// 事前計算された色相を使用
		const zone = classifyHueZone(precomputedHue);
		const lightnessScore = calculateLightnessScore(lightness, zone);

		return chromaScore + lightnessScore;
	} catch {
		return 0;
	}
}

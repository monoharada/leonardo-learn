/**
 * M3Generator - Material Design 3 トーンスケール生成
 *
 * Material Design 3（M3）のカラーシステムに準拠したトーンスケールを生成します。
 * HCT色空間からOKLCHへの変換を行い、13段階のトーン値を持つスケールを生成します。
 */

import {
	argbFromHex,
	Hct,
	hexFromArgb,
} from "@material/material-color-utilities";
import { type ColorObject, toOklch } from "../../utils/color-space";
import { Color } from "../color";

/**
 * M3トーン値（13段階）
 */
export const M3_TONE_VALUES = [
	0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100,
] as const;

export type ToneValue = (typeof M3_TONE_VALUES)[number];

/**
 * トーンスケールの結果
 */
export interface ToneScale {
	/** ロール名 */
	role?: string;
	/** 各トーン値に対応するColor */
	tones: Map<ToneValue, Color>;
	/** ソースカラー */
	sourceColor: Color;
	/** ソースカラーのHue（HCT） */
	sourceHue: number;
	/** ソースカラーのChroma（HCT） */
	sourceChroma: number;
}

/**
 * HCT色空間からOKLCH色空間に変換する
 *
 * @param hue - HCT Hue (0-360)
 * @param chroma - HCT Chroma
 * @param tone - HCT Tone (0-100)
 * @returns OKLCH ColorObject
 */
export function hctToOklch(
	hue: number,
	chroma: number,
	tone: number,
): ColorObject {
	// HCTからARGBに変換
	const hct = Hct.from(hue, chroma, tone);
	const argb = hct.toInt();

	// ARGBからHexに変換
	const hex = hexFromArgb(argb);

	// HexからOKLCHに変換
	const oklch = toOklch(hex);

	if (!oklch) {
		throw new Error(
			`Failed to convert HCT to OKLCH: H=${hue}, C=${chroma}, T=${tone}`,
		);
	}

	return oklch;
}

/**
 * 指定したHue/Toneでの最大Chromaを取得する
 *
 * @param hue - 色相（0-360）
 * @param tone - トーン（0-100）
 * @returns 最大Chroma値
 */
function getMaxChromaForHueTone(hue: number, tone: number): number {
	const maxChromaHct = Hct.from(hue, 150, tone);
	return maxChromaHct.chroma;
}

/**
 * 黄色系（暖色系）の色相かどうかを判定
 *
 * @param hue - 色相（0-360）
 * @returns 黄色系の場合true
 */
function isWarmYellowHue(hue: number): boolean {
	// HCT色相で黄色〜オレンジ系（約60-120°）
	return hue >= 60 && hue <= 120;
}

/**
 * 黄色系のトーン値を調整する
 * 黄色系は暗いトーン（10, 20）では鮮やかさが出ないため、
 * 全体的に明るい方向にシフトする
 *
 * @param tone - 元のトーン値
 * @returns 調整後のトーン値
 */
function adjustToneForYellow(tone: number): number {
	// 参考画像のYellowシェードに基づいたトーンマッピング
	// 黄色系は暗いトーンでも鮮やかさを維持するため、全体的に明るい方向にシフト

	// M3 Tone → 参考画像のTone（実測値ベース、彩度を確保するため調整）
	const toneMapping: Record<number, number> = {
		0: 33, // 1200: #604B00 → Tone 33
		10: 38, // 1100: #6E5600 → Tone 38
		20: 44, // 1000: #806300 → Tone 44
		30: 50, // 900: #927200 → Tone 50
		40: 56, // 800: #A58000 → Tone 56
		50: 62, // 700: #B78F00 → Tone 62
		60: 70, // 600: #D2A400 → Tone 70
		70: 77, // 500: #EBB700 → Tone 77
		80: 83, // 400: #FFC700 → Tone 83
		90: 84, // 300: 参考Chroma 55.5を達成するためTone 84
		95: 87, // 200: 参考Chroma 38.9を達成するためTone 87
		99: 91, // 100: 参考Chroma 24.4を達成するためTone 91
		100: 96, // 50: 参考Chroma 8.9を達成するためTone 96
	};

	return toneMapping[tone] ?? tone;
}

/**
 * M3トーンスケールを生成する
 * 黄色系の色相では、トーンをシフトして鮮やかさを確保
 *
 * @param sourceColor - ソースカラー（hex文字列またはColor）
 * @returns 生成されたトーンスケール
 */
export function generateM3ToneScale(sourceColor: string | Color): ToneScale {
	// ソースカラーを解析
	const source =
		sourceColor instanceof Color ? sourceColor : new Color(sourceColor);
	const sourceHex = source.toHex();

	// HexからARGBに変換してHCTを取得
	const argb = argbFromHex(sourceHex);
	const hct = Hct.fromInt(argb);

	const sourceHue = hct.hue;
	const sourceChroma = hct.chroma;

	// 黄色系かどうかを判定
	const isYellow = isWarmYellowHue(sourceHue);

	// 各トーンを生成
	const tones = new Map<ToneValue, Color>();

	for (const tone of M3_TONE_VALUES) {
		let chroma: number;
		let actualTone: number = tone;

		if (isYellow) {
			// 黄色系: トーンをシフトして鮮やかさを確保（Tone 0, 100も含む）
			actualTone = adjustToneForYellow(tone);

			// 調整後のトーンで最大Chromaを取得
			const maxChroma = getMaxChromaForHueTone(sourceHue, actualTone);
			// 黄色系は最大彩度の95%を使用して鮮やかさを確保
			chroma = maxChroma * 0.95;
		} else if (tone === 0 || tone === 100) {
			// トーン0と100は無彩色（黄色系以外）
			chroma = 0;
		} else {
			// その他: ソースのChromaを維持（従来の動作）
			chroma = sourceChroma;
		}

		const oklch = hctToOklch(sourceHue, chroma, actualTone);
		const color = new Color(oklch, { skipClamp: true });

		tones.set(tone, color);
	}

	return {
		tones,
		sourceColor: source,
		sourceHue,
		sourceChroma,
	};
}

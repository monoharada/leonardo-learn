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
 * M3トーンスケールを生成する
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

	// 各トーンを生成
	const tones = new Map<ToneValue, Color>();

	for (const tone of M3_TONE_VALUES) {
		// トーン0と100は無彩色（Chroma=0）
		// 他のトーンはソースのChromaを維持
		const chroma = tone === 0 || tone === 100 ? 0 : sourceChroma;

		const oklch = hctToOklch(sourceHue, chroma, tone);
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

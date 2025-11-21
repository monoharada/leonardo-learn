/**
 * NeutralScale - ニュートラルカラースケール生成
 *
 * 極低Chroma（0.00〜0.02）のグレースケールを生成します。
 * ベースカラーの色相を維持しながら、知覚的に均一なLightness分布を持つ
 * 11段階のシェードを生成します。
 */

import type { ColorObject } from "../../utils/color-space";
import { Color } from "../color";

/**
 * ニュートラルスケールのシェードキー
 * 50（最も明るい）から950（最も暗い）までの11段階
 */
export const NEUTRAL_SHADE_KEYS = [
	50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

export type NeutralShadeKey = (typeof NEUTRAL_SHADE_KEYS)[number];

/**
 * ニュートラルスケール生成オプション
 */
export interface NeutralScaleOptions {
	/** Chroma値（デフォルト: 0.01、範囲: 0.00〜0.02） */
	chroma?: number;
	/** Hueを上書きする場合の値（0〜360） */
	overrideHue?: number;
}

/**
 * ニュートラルスケールの結果
 */
export interface NeutralScaleResult {
	/** 生成されたシェード */
	shades: Record<NeutralShadeKey, Color>;
	/** 元のベースカラー */
	sourceColor: Color;
	/** 使用されたHue */
	hue: number | undefined;
	/** 使用されたChroma */
	chroma: number;
}

/**
 * 各シェードのLightness値
 * 知覚的に均一な分布を目指す
 */
const SHADE_LIGHTNESS_MAP: Record<NeutralShadeKey, number> = {
	50: 0.97,
	100: 0.93,
	200: 0.87,
	300: 0.78,
	400: 0.68,
	500: 0.55,
	600: 0.45,
	700: 0.35,
	800: 0.25,
	900: 0.17,
	950: 0.1,
};

/**
 * ニュートラルスケールを生成する
 *
 * @param baseColor - ベースカラー（hex文字列またはColor）
 * @param options - 生成オプション
 * @returns 生成されたニュートラルスケール
 */
export function generateNeutralScale(
	baseColor: string | Color,
	options: NeutralScaleOptions = {},
): NeutralScaleResult {
	// ベースカラーを解析
	const sourceColor =
		baseColor instanceof Color ? baseColor : new Color(baseColor);
	const sourceOklch = sourceColor.oklch;

	// オプションから値を取得（デフォルト: 0.01）
	const chroma = options.chroma ?? 0.01;

	// Hueを決定（上書きがあればそれを使用、なければベースカラーのHue）
	const hue = options.overrideHue ?? sourceOklch.h;

	// 各シェードを生成
	const shades = {} as Record<NeutralShadeKey, Color>;

	for (const key of NEUTRAL_SHADE_KEYS) {
		const lightness = SHADE_LIGHTNESS_MAP[key];

		const colorObject: ColorObject = {
			mode: "oklch",
			l: lightness,
			c: chroma,
			h: chroma > 0 ? hue : undefined, // Chroma=0の場合はHue不要
		};

		shades[key] = new Color(colorObject, { skipClamp: true });
	}

	return {
		shades,
		sourceColor,
		hue,
		chroma,
	};
}

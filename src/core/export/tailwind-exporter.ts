/**
 * TailwindExporter - Tailwind CSS設定形式でカラーデータをエクスポート
 *
 * theme.extend.colors形式でのエクスポートをサポートします。
 * OKLCH値を使用したモダンなカラー定義を生成します。
 */

import type { Color } from "../color";

/**
 * Tailwindエクスポートオプション
 */
export interface TailwindExportOptions {
	/** インデント（スペース数、デフォルト: 2） */
	indent?: number;
	/** 色空間（デフォルト: "oklch"） */
	colorSpace?: "oklch" | "hex";
	/** ESモジュール形式で出力（デフォルト: false） */
	esModule?: boolean;
}

/**
 * Tailwindカラー設定
 */
export type TailwindColorConfig = Record<
	string,
	string | Record<string, string>
>;

/**
 * Tailwindエクスポート結果
 */
export interface TailwindExportResult {
	/** カラー設定オブジェクト */
	colors: TailwindColorConfig;
	/** JavaScript設定文字列 */
	config: string;
}

/**
 * OKLCHのTailwind形式文字列を生成する
 */
function toOklchString(color: Color): string {
	const { l, c, h } = color.oklch;
	const hue = h ?? 0;
	return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${hue.toFixed(1)})`;
}

/**
 * カラーをTailwind CSS設定形式でエクスポートする
 *
 * @param colors - エクスポートする色のレコード
 * @param options - エクスポートオプション
 * @returns Tailwindエクスポート結果
 */
export function exportToTailwind(
	colors: Record<string, Color>,
	options: TailwindExportOptions = {},
): TailwindExportResult {
	const { indent = 2, colorSpace = "oklch", esModule = false } = options;

	const tailwindColors: TailwindColorConfig = {};

	for (const [name, color] of Object.entries(colors)) {
		const value = colorSpace === "oklch" ? toOklchString(color) : color.toHex();
		tailwindColors[name] = value;
	}

	const config = generateConfigString(tailwindColors, indent, esModule);

	return {
		colors: tailwindColors,
		config,
	};
}

/**
 * トーンスケールをTailwind CSS設定形式でエクスポートする
 *
 * @param scales - ロール名とトーンスケールのレコード
 * @param options - エクスポートオプション
 * @returns Tailwindエクスポート結果
 */
export function exportScalesToTailwind(
	scales: Record<string, Map<number, Color>>,
	options: TailwindExportOptions = {},
): TailwindExportResult {
	const { indent = 2, colorSpace = "oklch", esModule = false } = options;

	const tailwindColors: TailwindColorConfig = {};

	for (const [role, tones] of Object.entries(scales)) {
		const shades: Record<string, string> = {};

		// トーン値でソート
		const sortedTones = [...tones.entries()].sort(([a], [b]) => a - b);

		for (const [tone, color] of sortedTones) {
			const value =
				colorSpace === "oklch" ? toOklchString(color) : color.toHex();
			shades[tone.toString()] = value;
		}

		tailwindColors[role] = shades;
	}

	const config = generateConfigString(tailwindColors, indent, esModule);

	return {
		colors: tailwindColors,
		config,
	};
}

/**
 * Tailwind設定文字列を生成する
 */
function generateConfigString(
	colors: TailwindColorConfig,
	indent: number,
	esModule: boolean,
): string {
	const indentStr = " ".repeat(indent);

	const colorsJson = JSON.stringify(colors, null, indent);

	if (esModule) {
		return `export default {
${indentStr}theme: {
${indentStr}${indentStr}extend: {
${indentStr}${indentStr}${indentStr}colors: ${colorsJson.split("\n").join(`\n${indentStr}${indentStr}${indentStr}`)}
${indentStr}${indentStr}}
${indentStr}}
}`;
	}

	return `module.exports = {
${indentStr}theme: {
${indentStr}${indentStr}extend: {
${indentStr}${indentStr}${indentStr}colors: ${colorsJson.split("\n").join(`\n${indentStr}${indentStr}${indentStr}`)}
${indentStr}${indentStr}}
${indentStr}}
}`;
}

/**
 * Tailwind v4形式（CSS変数ベース）でエクスポートする
 *
 * @param scales - ロール名とトーンスケールのレコード
 * @param options - エクスポートオプション
 * @returns CSS文字列
 */
export function exportToTailwindV4(
	scales: Record<string, Map<number, Color>>,
	options: { indent?: number } = {},
): string {
	const { indent = 2 } = options;
	const indentStr = " ".repeat(indent);

	const lines: string[] = [];
	lines.push("@theme {");

	for (const [role, tones] of Object.entries(scales)) {
		lines.push(`${indentStr}/* ${role} */`);

		const sortedTones = [...tones.entries()].sort(([a], [b]) => a - b);

		for (const [tone, color] of sortedTones) {
			const oklchValue = toOklchString(color);
			lines.push(`${indentStr}--color-${role}-${tone}: ${oklchValue};`);
		}
	}

	lines.push("}");

	return lines.join("\n");
}

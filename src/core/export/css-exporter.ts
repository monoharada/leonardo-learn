/**
 * CSSExporter - CSS Custom Properties形式でカラーデータをエクスポート
 *
 * OKLCH値とsRGB fallbackを提供するCSSエクスポーターです。
 * @supportsによる広色域検出付きfallback形式もサポートします。
 * CUDメタデータオプション付き。
 *
 * Requirements: 7.3
 */

import type { Color } from "../color";
import { findNearestCudColor, type MatchLevel } from "../cud/service";

/**
 * CUDコメント生成用データ
 * Requirement 7.3: CSSカスタムプロパティにCUD情報をコメントとして付加
 */
export interface CudCommentData {
	/** CUD推奨色の名称（日本語） */
	nearestName: string;
	/** マッチレベル（exact/near/moderate/off） */
	matchLevel: MatchLevel;
	/** CUD色との色差（deltaE） */
	deltaE: number;
}

/**
 * CSSエクスポートオプション
 */
export interface CSSExportOptions {
	/** プレフィックス（デフォルト: "color"） */
	prefix?: string;
	/** インデント（スペース数、デフォルト: 2） */
	indent?: number;
	/** @supportsを使った広色域fallbackを含める */
	includeWideGamutFallback?: boolean;
	/** セレクタ（デフォルト: ":root"） */
	selector?: string;
	/**
	 * CUDコメントを含めるか
	 * Requirement 7.3: CSSカスタムプロパティにCUD情報をコメントとして付加
	 */
	includeCudComments?: boolean;
}

/**
 * CSSエクスポート結果
 */
export interface CSSExportResult {
	/** CSS文字列 */
	css: string;
	/** 変数名のリスト */
	variables: string[];
}

/**
 * 色名をCSS変数名に変換する
 */
function toVariableName(name: string, prefix: string): string {
	// camelCaseをkebab-caseに変換
	const kebab = name.replace(/([A-Z])/g, "-$1").toLowerCase();
	// 先頭のハイフンを削除
	const cleaned = kebab.replace(/^-/, "");
	return `--${prefix}-${cleaned}`;
}

/**
 * OKLCHのCSS関数形式を生成する
 */
function toOklchCss(color: Color): string {
	const { l, c, h } = color.oklch;
	const hue = h ?? 0;
	return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${hue.toFixed(1)})`;
}

/**
 * CUDコメント文字列をフォーマットする
 * Requirement 7.3: CSSカスタムプロパティにCUD情報をコメントとして付加
 *
 * @param data - CUDコメントデータ
 * @returns フォーマットされたCSSコメント文字列
 * @example
 * formatCudComment({ nearestName: "赤", matchLevel: "exact", deltaE: 0.0 })
 * // => "/* CUD: 赤 (exact, ΔE=0.000) *\/"
 */
export function formatCudComment(data: CudCommentData): string {
	const { nearestName, matchLevel, deltaE } = data;
	return `/* CUD: ${nearestName} (${matchLevel}, ΔE=${deltaE.toFixed(3)}) */`;
}

/**
 * 色からCUDコメントを生成する
 *
 * @param color - 色
 * @returns CUDコメント文字列
 */
function getCudCommentForColor(color: Color): string {
	const hex = color.toHex();
	const cudResult = findNearestCudColor(hex);
	return formatCudComment({
		nearestName: cudResult.nearest.nameJa,
		matchLevel: cudResult.matchLevel,
		deltaE: cudResult.deltaE,
	});
}

/**
 * カラーをCSS Custom Properties形式でエクスポートする
 *
 * @param colors - エクスポートする色のレコード
 * @param options - エクスポートオプション
 * @returns CSSエクスポート結果
 */
export function exportToCSS(
	colors: Record<string, Color>,
	options: CSSExportOptions = {},
): CSSExportResult {
	const {
		prefix = "color",
		indent = 2,
		includeWideGamutFallback = false,
		selector = ":root",
		includeCudComments = false,
	} = options;

	const indentStr = " ".repeat(indent);
	const variables: string[] = [];
	const cssLines: string[] = [];

	// メイン変数（sRGB fallback + OKLCH）
	cssLines.push(`${selector} {`);

	for (const [name, color] of Object.entries(colors)) {
		const varName = toVariableName(name, prefix);
		variables.push(varName);

		const hex = color.toHex();
		const oklchValue = toOklchCss(color);
		const cudComment = includeCudComments
			? ` ${getCudCommentForColor(color)}`
			: "";

		// sRGB fallback
		cssLines.push(`${indentStr}${varName}: ${hex};${cudComment}`);
		// OKLCH値（モダンブラウザ用）
		cssLines.push(`${indentStr}${varName}: ${oklchValue};`);
	}

	cssLines.push("}");

	// 広色域fallback
	if (includeWideGamutFallback) {
		cssLines.push("");
		cssLines.push("@supports (color: oklch(0% 0 0)) {");
		cssLines.push(`${indentStr}${selector} {`);

		for (const [name, color] of Object.entries(colors)) {
			const varName = toVariableName(name, prefix);
			const oklchValue = toOklchCss(color);
			cssLines.push(`${indentStr}${indentStr}${varName}: ${oklchValue};`);
		}

		cssLines.push(`${indentStr}}`);
		cssLines.push("}");
	}

	return {
		css: cssLines.join("\n"),
		variables,
	};
}

/**
 * セマンティックトークン名を生成する
 *
 * @param role - カラーロール（例: "primary"）
 * @param shade - シェード番号（例: 500）
 * @param prefix - プレフィックス（デフォルト: "color"）
 * @returns CSS変数名（例: "--color-primary-500"）
 */
export function generateSemanticTokenName(
	role: string,
	shade: number | string,
	prefix = "color",
): string {
	return `--${prefix}-${role}-${shade}`;
}

/**
 * トーンスケールをCSS Custom Properties形式でエクスポートする
 *
 * @param scales - ロール名とトーンスケールのレコード
 * @param options - エクスポートオプション
 * @returns CSSエクスポート結果
 */
export function exportScalesToCSS(
	scales: Record<string, Map<number, Color>>,
	options: CSSExportOptions = {},
): CSSExportResult {
	const {
		prefix = "color",
		indent = 2,
		includeWideGamutFallback = false,
		selector = ":root",
		includeCudComments = false,
	} = options;

	const indentStr = " ".repeat(indent);
	const variables: string[] = [];
	const cssLines: string[] = [];

	// メイン変数
	cssLines.push(`${selector} {`);

	for (const [role, tones] of Object.entries(scales)) {
		// コメントでセクション分け
		cssLines.push(`${indentStr}/* ${role} */`);

		// トーン値でソート
		const sortedTones = [...tones.entries()].sort(([a], [b]) => a - b);

		for (const [tone, color] of sortedTones) {
			const varName = generateSemanticTokenName(role, tone, prefix);
			variables.push(varName);

			const hex = color.toHex();
			const oklchValue = toOklchCss(color);
			const cudComment = includeCudComments
				? ` ${getCudCommentForColor(color)}`
				: "";

			cssLines.push(`${indentStr}${varName}: ${hex};${cudComment}`);
			cssLines.push(`${indentStr}${varName}: ${oklchValue};`);
		}
	}

	cssLines.push("}");

	// 広色域fallback
	if (includeWideGamutFallback) {
		cssLines.push("");
		cssLines.push("@supports (color: oklch(0% 0 0)) {");
		cssLines.push(`${indentStr}${selector} {`);

		for (const [role, tones] of Object.entries(scales)) {
			const sortedTones = [...tones.entries()].sort(([a], [b]) => a - b);

			for (const [tone, color] of sortedTones) {
				const varName = generateSemanticTokenName(role, tone, prefix);
				const oklchValue = toOklchCss(color);
				cssLines.push(`${indentStr}${indentStr}${varName}: ${oklchValue};`);
			}
		}

		cssLines.push(`${indentStr}}`);
		cssLines.push("}");
	}

	return {
		css: cssLines.join("\n"),
		variables,
	};
}

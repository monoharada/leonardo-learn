/**
 * CSSExporter - CSS Custom Properties形式でカラーデータをエクスポート
 *
 * OKLCH値とsRGB fallbackを提供するCSSエクスポーターです。
 * @supportsによる広色域検出付きfallback形式もサポートします。
 * CUDメタデータオプション付き。
 *
 * Requirements: 7.3, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import type { Color } from "../color";
import { findNearestCudColor, type MatchLevel } from "../cud/service";
import type { BrandToken, DadsReference, DadsToken } from "../tokens/types";

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
		// includeWideGamutFallback=true の場合は @supports 側に集約する
		if (!includeWideGamutFallback) {
			cssLines.push(`${indentStr}${varName}: ${oklchValue};`);
		}
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

// ============================================
// v2 API: DADS/Brand Token Export Functions
// ============================================

/**
 * CSSエクスポートv2オプション
 * Requirements: 10.1, 10.2
 */
export interface CSSExportOptionsV2 {
	/** 出力バージョン（デフォルト: "v2"） */
	outputVersion?: "v1" | "v2";
	/** DADSトークンを含めるか（デフォルト: true） */
	includeDadsTokens?: boolean;
	/** コメントを含めるか（デフォルト: true） */
	includeComments?: boolean;
	/** インデント（スペース数、デフォルト: 2） */
	indent?: number;
	/** セレクタ（デフォルト: ":root"） */
	selector?: string;
}

/**
 * HEXカラーコードをRGBA形式に変換する
 *
 * @param hex - HEXカラーコード（#RRGGBB形式）
 * @param alpha - アルファ値（0-1）
 * @returns rgba(R, G, B, alpha)形式の文字列
 *
 * @example
 * ```ts
 * hexToRgba("#ff0000", 0.5)
 * // => "rgba(255, 0, 0, 0.5)"
 * ```
 */
export function hexToRgba(hex: string, alpha: number): string {
	const cleanHex = hex.replace("#", "");
	const r = Number.parseInt(cleanHex.substring(0, 2), 16);
	const g = Number.parseInt(cleanHex.substring(2, 4), 16);
	const b = Number.parseInt(cleanHex.substring(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 派生情報をコメント形式にフォーマットする
 * Requirement 10.5: derivationコメント（参照先DADS、deltaE、派生タイプ）を追加
 *
 * @param dadsRef - DADS参照情報
 * @returns フォーマットされたコメント文字列
 *
 * @example
 * ```ts
 * formatDerivationComment({
 *   tokenId: "dads-blue-500",
 *   tokenHex: "#0066cc",
 *   deltaE: 0.032,
 *   derivationType: "soft-snap",
 *   zone: "safe"
 * })
 * // => "/* Derived: dads-blue-500, ΔE=0.032, soft-snap *\/"
 * ```
 */
export function formatDerivationComment(dadsRef: DadsReference): string {
	const { tokenId, deltaE, derivationType } = dadsRef;
	return `/* Derived: ${tokenId}, ΔE=${deltaE.toFixed(3)}, ${derivationType} */`;
}

/**
 * トークンのカラー値を取得する（alpha考慮）
 *
 * @param hex - HEXカラーコード
 * @param alpha - オプショナルのアルファ値
 * @returns HEXまたはrgba形式の文字列
 */
function getColorValue(hex: string, alpha?: number): string {
	// alpha値がないか1の場合はHEX形式で出力
	if (alpha === undefined || alpha === 1) {
		return hex;
	}
	// alpha値を持つ場合はrgba形式で出力
	return hexToRgba(hex, alpha);
}

/**
 * DADS/Brandトークンを分離したCSS形式でエクスポートする（v2 API）
 *
 * Requirements:
 * - 10.1: DADSプリミティブを--dads-{color}形式で出力、不変性コメント追加
 * - 10.2: ブランドトークンを--brand-{role}-{shade}形式で出力、derivationコメント追加
 * - 10.3: alpha値を持つトークンはrgba(R, G, B, alpha)形式で出力
 * - 10.4: alpha値がないか1の場合は#RRGGBB形式で出力
 * - 10.5: derivationコメント（参照先DADS、deltaE、派生タイプ）を追加
 *
 * @param brandTokens - ブランドトークン配列
 * @param dadsTokens - DADSトークン配列（オプショナル）
 * @param options - エクスポートオプション
 * @returns CSS文字列
 *
 * @example
 * ```ts
 * const css = exportToCSSv2(
 *   [{ id: "brand-primary-500", hex: "#1a73e8", ... }],
 *   [{ id: "dads-blue-500", hex: "#0066cc", ... }],
 *   { includeComments: true }
 * );
 * ```
 */
export function exportToCSSv2(
	brandTokens: BrandToken[],
	dadsTokens?: DadsToken[],
	options: CSSExportOptionsV2 = {},
): string {
	const {
		includeDadsTokens = true,
		includeComments = false,
		indent = 2,
		selector = ":root",
	} = options;

	const indentStr = " ".repeat(indent);
	const cssLines: string[] = [];

	cssLines.push(`${selector} {`);

	// DADSトークンセクション（オプショナル）
	if (includeDadsTokens && dadsTokens && dadsTokens.length > 0) {
		if (includeComments) {
			cssLines.push(
				`${indentStr}/* ========================================== */`,
			);
			cssLines.push(
				`${indentStr}/* DADS Primitive Colors (Immutable/不変)     */`,
			);
			cssLines.push(
				`${indentStr}/* ========================================== */`,
			);
		}

		for (const token of dadsTokens) {
			const varName = `--${token.id}`;
			const colorValue = getColorValue(token.hex, token.alpha);
			cssLines.push(`${indentStr}${varName}: ${colorValue};`);
		}

		// セクション間のスペース
		if (brandTokens.length > 0) {
			cssLines.push("");
		}
	}

	// ブランドトークンセクション
	if (brandTokens.length > 0) {
		if (includeComments) {
			cssLines.push(
				`${indentStr}/* ========================================== */`,
			);
			cssLines.push(
				`${indentStr}/* Brand Tokens (Derived from DADS)           */`,
			);
			cssLines.push(
				`${indentStr}/* ========================================== */`,
			);
		}

		for (const token of brandTokens) {
			const varName = `--${token.id}`;
			const colorValue = getColorValue(token.hex, token.alpha);

			if (includeComments) {
				const derivationComment = formatDerivationComment(token.dadsReference);
				cssLines.push(
					`${indentStr}${varName}: ${colorValue}; ${derivationComment}`,
				);
			} else {
				cssLines.push(`${indentStr}${varName}: ${colorValue};`);
			}
		}
	}

	cssLines.push("}");

	return cssLines.join("\n");
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
			// includeWideGamutFallback=true の場合は @supports 側に集約する
			if (!includeWideGamutFallback) {
				cssLines.push(`${indentStr}${varName}: ${oklchValue};`);
			}
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

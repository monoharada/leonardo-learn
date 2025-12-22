/**
 * DADSプリミティブカラーのインポート機能
 *
 * @digital-go-jp/design-tokensのCSS変数からDADSプリミティブカラーを
 * 自動インポートし、DadsTokenオブジェクトとして生成する
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import type {
	DadsChromaScale,
	DadsColorClassification,
	DadsColorHue,
	DadsNeutralScale,
	DadsToken,
} from "./types";

/**
 * パース結果の型定義
 */
export interface DadsPrimitiveParseResult {
	/** パースされたDadsTokenの配列 */
	tokens: DadsToken[];
	/** パース中に発生した警告メッセージ */
	warnings: string[];
}

/**
 * DADS有彩色の色相リスト
 */
const VALID_HUES: readonly DadsColorHue[] = [
	"blue",
	"light-blue",
	"cyan",
	"green",
	"lime",
	"yellow",
	"orange",
	"red",
	"magenta",
	"purple",
] as const;

/**
 * 色相の日本語名マッピング
 */
const HUE_NAME_JA: Record<DadsColorHue, string> = {
	blue: "青",
	"light-blue": "ライトブルー",
	cyan: "シアン",
	green: "緑",
	lime: "ライム",
	yellow: "黄",
	orange: "オレンジ",
	red: "赤",
	magenta: "マゼンタ",
	purple: "紫",
};

/**
 * 色相の英語名マッピング
 */
const HUE_NAME_EN: Record<DadsColorHue, string> = {
	blue: "Blue",
	"light-blue": "Light Blue",
	cyan: "Cyan",
	green: "Green",
	lime: "Lime",
	yellow: "Yellow",
	orange: "Orange",
	red: "Red",
	magenta: "Magenta",
	purple: "Purple",
};

/**
 * CSS変数の正規表現パターン
 */
const CSS_VAR_PATTERN =
	/--color-(primitive|neutral|semantic)([a-z0-9-]*)\s*:\s*([^;]+);/gi;

/**
 * rgba()形式の正規表現パターン
 */
const RGBA_PATTERN =
	/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/i;

/**
 * HEX形式の正規表現パターン
 */
const HEX_PATTERN = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;

/**
 * var()参照の正規表現パターン
 */
const VAR_PATTERN = /var\(--[a-z0-9-]+\)/i;

/**
 * 数値をHEX文字列に変換
 */
function toHex(n: number): string {
	return n.toString(16).padStart(2, "0");
}

/**
 * RGB値からHEX文字列を生成
 */
function rgbToHex(r: number, g: number, b: number): string {
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

/**
 * 有彩色のトークンID、日本語名、英語名を生成
 */
function createChromaticTokenInfo(
	hue: DadsColorHue,
	scale: number,
): { id: string; nameJa: string; nameEn: string } {
	return {
		id: `dads-${hue}-${scale}`,
		nameJa: `${HUE_NAME_JA[hue]} ${scale}`,
		nameEn: `${HUE_NAME_EN[hue]} ${scale}`,
	};
}

/**
 * 有彩色プリミティブをパース
 * Requirement 2.1
 */
function parseChromaticPrimitive(
	suffix: string,
	value: string,
	warnings: string[],
): DadsToken | null {
	// suffix format: -blue-500, -light-blue-300, etc.
	const cleanSuffix = suffix.startsWith("-") ? suffix.slice(1) : suffix;

	// ハイフン付きの色相（light-blue）に対応
	let hue: DadsColorHue | null = null;
	let scale: number | null = null;

	for (const validHue of VALID_HUES) {
		if (cleanSuffix.startsWith(`${validHue}-`)) {
			const scaleStr = cleanSuffix.slice(validHue.length + 1);
			const parsedScale = parseInt(scaleStr, 10);
			if (!Number.isNaN(parsedScale)) {
				hue = validHue;
				scale = parsedScale;
				break;
			}
		}
	}

	if (!hue || scale === null) {
		return null;
	}

	// 値のパース
	const colorInfo = parseColorValue(
		value,
		`--color-primitive${suffix}`,
		warnings,
	);
	if (!colorInfo) {
		return null;
	}

	const tokenInfo = createChromaticTokenInfo(hue, scale);

	const classification: DadsColorClassification = {
		category: "chromatic",
		hue,
		scale: scale as DadsChromaScale,
	};

	const token: DadsToken = {
		id: tokenInfo.id,
		hex: colorInfo.hex,
		nameJa: tokenInfo.nameJa,
		nameEn: tokenInfo.nameEn,
		classification,
		source: "dads",
		...(colorInfo.alpha !== undefined && { alpha: colorInfo.alpha }),
	};

	return token;
}

/**
 * neutral white/blackをパース
 * Requirement 2.2
 */
function parseNeutralWhiteBlack(
	suffix: string,
	value: string,
	warnings: string[],
): DadsToken | null {
	const cleanSuffix = suffix.startsWith("-") ? suffix.slice(1) : suffix;

	if (cleanSuffix !== "white" && cleanSuffix !== "black") {
		return null;
	}

	const colorInfo = parseColorValue(
		value,
		`--color-neutral-${cleanSuffix}`,
		warnings,
	);
	if (!colorInfo) {
		return null;
	}

	const isWhite = cleanSuffix === "white";

	const classification: DadsColorClassification = {
		category: "neutral",
	};

	const token: DadsToken = {
		id: `dads-neutral-${cleanSuffix}`,
		hex: colorInfo.hex,
		nameJa: isWhite ? "白" : "黒",
		nameEn: isWhite ? "White" : "Black",
		classification,
		source: "dads",
		...(colorInfo.alpha !== undefined && { alpha: colorInfo.alpha }),
	};

	return token;
}

/**
 * グレースケールをパース
 * Requirement 2.3
 */
function parseNeutralGray(
	suffix: string,
	value: string,
	warnings: string[],
): DadsToken | null {
	const cleanSuffix = suffix.startsWith("-") ? suffix.slice(1) : suffix;

	// solid-gray-{scale} or opacity-gray-{scale}
	const solidMatch = cleanSuffix.match(/^solid-gray-(\d+)$/);
	const opacityMatch = cleanSuffix.match(/^opacity-gray-(\d+)$/);

	if (!solidMatch && !opacityMatch) {
		return null;
	}

	const isSolid = solidMatch !== null;
	const scaleStr = isSolid ? solidMatch[1] : opacityMatch?.[1];
	if (!scaleStr) {
		return null;
	}
	const scale = parseInt(scaleStr, 10);
	const varName = `--color-neutral-${cleanSuffix}`;

	const colorInfo = parseColorValue(value, varName, warnings);
	if (!colorInfo) {
		return null;
	}

	const classification: DadsColorClassification = {
		category: "neutral",
		scale: scale as DadsNeutralScale,
	};

	const typeLabel = isSolid ? "Solid" : "Opacity";
	const typeLabelJa = isSolid ? "ソリッド" : "透過";

	const token: DadsToken = {
		id: `dads-neutral-${cleanSuffix}`,
		hex: colorInfo.hex,
		nameJa: `グレー ${scale} (${typeLabelJa})`,
		nameEn: `Gray ${scale} (${typeLabel})`,
		classification,
		source: "dads",
		...(colorInfo.alpha !== undefined && { alpha: colorInfo.alpha }),
	};

	return token;
}

/**
 * セマンティック色をパース
 * Requirement 2.5
 */
function parseSemantic(
	suffix: string,
	value: string,
	_warnings: string[],
): DadsToken | null {
	const cleanSuffix = suffix.startsWith("-") ? suffix.slice(1) : suffix;

	if (!cleanSuffix) {
		return null;
	}

	const trimmedValue = value.trim();

	// var()参照を保持する
	if (VAR_PATTERN.test(trimmedValue)) {
		const classification: DadsColorClassification = {
			category: "semantic",
		};

		const token: DadsToken = {
			id: `dads-semantic-${cleanSuffix}`,
			hex: trimmedValue,
			nameJa: `セマンティック: ${cleanSuffix}`,
			nameEn: `Semantic: ${cleanSuffix}`,
			classification,
			source: "dads",
		};

		return token;
	}

	// HEX値の場合
	if (HEX_PATTERN.test(trimmedValue)) {
		const classification: DadsColorClassification = {
			category: "semantic",
		};

		const token: DadsToken = {
			id: `dads-semantic-${cleanSuffix}`,
			hex: trimmedValue.toLowerCase(),
			nameJa: `セマンティック: ${cleanSuffix}`,
			nameEn: `Semantic: ${cleanSuffix}`,
			classification,
			source: "dads",
		};

		return token;
	}

	return null;
}

/**
 * 色の値をパースしてhexとalpha（オプション）を返す
 * Requirement 2.4, 2.6
 */
function parseColorValue(
	value: string,
	varName: string,
	warnings: string[],
): { hex: string; alpha?: number } | null {
	const trimmedValue = value.trim();

	// HEX形式
	if (HEX_PATTERN.test(trimmedValue)) {
		// 3桁HEXを6桁に変換
		if (trimmedValue.length === 4) {
			const r = trimmedValue[1];
			const g = trimmedValue[2];
			const b = trimmedValue[3];
			return { hex: `#${r}${r}${g}${g}${b}${b}`.toLowerCase() };
		}
		return { hex: trimmedValue.toLowerCase() };
	}

	// rgba()形式
	const rgbaMatch = trimmedValue.match(RGBA_PATTERN);
	if (rgbaMatch?.[1] && rgbaMatch[2] && rgbaMatch[3] && rgbaMatch[4]) {
		const r = parseInt(rgbaMatch[1], 10);
		const g = parseInt(rgbaMatch[2], 10);
		const b = parseInt(rgbaMatch[3], 10);
		const a = parseFloat(rgbaMatch[4]);

		if (
			Number.isNaN(r) ||
			Number.isNaN(g) ||
			Number.isNaN(b) ||
			Number.isNaN(a)
		) {
			const warning = `パース失敗: ${varName} = ${trimmedValue} (不正なrgba値)`;
			warnings.push(warning);
			console.warn(warning);
			return null;
		}

		return {
			hex: rgbToHex(r, g, b),
			alpha: a,
		};
	}

	// var()参照
	if (VAR_PATTERN.test(trimmedValue)) {
		return { hex: trimmedValue };
	}

	// 認識できない形式
	const warning = `パース失敗: ${varName} = ${trimmedValue} (認識できない形式)`;
	warnings.push(warning);
	console.warn(warning);
	return null;
}

/**
 * CSSテキストからDADSプリミティブカラーをパースしてDadsToken配列を生成する
 *
 * @param cssText - CSS変数を含むテキスト
 * @returns パース結果（DadsToken配列と警告メッセージ）
 *
 * @example
 * ```ts
 * const css = `
 *   :root {
 *     --color-primitive-blue-500: #0066cc;
 *     --color-neutral-white: #ffffff;
 *   }
 * `;
 * const result = parseDadsPrimitives(css);
 * // result.tokens: DadsToken[]
 * // result.warnings: string[]
 * ```
 */
export function parseDadsPrimitives(cssText: string): DadsPrimitiveParseResult {
	const tokens: DadsToken[] = [];
	const warnings: string[] = [];

	if (!cssText || cssText.trim() === "") {
		return { tokens, warnings };
	}

	CSS_VAR_PATTERN.lastIndex = 0;
	let match = CSS_VAR_PATTERN.exec(cssText);

	while (match !== null) {
		const type = match[1];
		const suffix = match[2] ?? "";
		const value = match[3];

		if (!type || !value) {
			continue;
		}

		let token: DadsToken | null = null;

		switch (type) {
			case "primitive":
				token = parseChromaticPrimitive(suffix, value, warnings);
				break;
			case "neutral":
				// white/black
				token = parseNeutralWhiteBlack(suffix, value, warnings);
				// グレースケール
				if (!token) {
					token = parseNeutralGray(suffix, value, warnings);
				}
				break;
			case "semantic":
				token = parseSemantic(suffix, value, warnings);
				break;
		}

		if (token) {
			tokens.push(token);
		}

		match = CSS_VAR_PATTERN.exec(cssText);
	}

	return { tokens, warnings };
}

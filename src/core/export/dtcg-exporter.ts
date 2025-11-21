/**
 * DTCGExporter - W3C Design Tokens（DTCG）形式でカラーデータをエクスポート
 *
 * W3C Design Tokens Community Group仕様に準拠したJSONエクスポーターです。
 * semanticトークンとaliasトークンの分離をサポートします。
 */

import type { Color } from "../color";

/**
 * DTCGエクスポートオプション
 */
export interface DTCGExportOptions {
	/** インデント（スペース数、デフォルト: 2） */
	indent?: number;
	/** aliasトークンを含める */
	includeAliases?: boolean;
	/** 色空間（デフォルト: "oklch"） */
	colorSpace?: "oklch" | "srgb";
}

/**
 * DTCGトークン
 */
export interface DTCGToken {
	$value: string;
	$type: "color";
	$description?: string;
}

/**
 * DTCGエイリアストークン
 */
export interface DTCGAliasToken {
	$value: string;
	$type: "color";
}

/**
 * DTCGエクスポート結果
 */
export interface DTCGExportResult {
	/** トークンオブジェクト */
	tokens: Record<string, unknown>;
	/** JSON文字列 */
	json: string;
}

/**
 * OKLCHのDTCG形式文字列を生成する
 */
function toOklchString(color: Color): string {
	const { l, c, h } = color.oklch;
	const hue = h ?? 0;
	return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${hue.toFixed(1)})`;
}

/**
 * カラーをDTCG形式でエクスポートする
 *
 * @param colors - エクスポートする色のレコード
 * @param options - エクスポートオプション
 * @returns DTCGエクスポート結果
 */
export function exportToDTCG(
	colors: Record<string, Color>,
	options: DTCGExportOptions = {},
): DTCGExportResult {
	const { indent = 2, colorSpace = "oklch" } = options;

	const tokens: Record<string, unknown> = {
		color: {} as Record<string, DTCGToken>,
	};

	const colorTokens = tokens.color as Record<string, DTCGToken>;

	for (const [name, color] of Object.entries(colors)) {
		const value = colorSpace === "oklch" ? toOklchString(color) : color.toHex();

		colorTokens[name] = {
			$value: value,
			$type: "color",
		};
	}

	return {
		tokens,
		json: JSON.stringify(tokens, null, indent),
	};
}

/**
 * トーンスケールをDTCG形式でエクスポートする
 *
 * @param scales - ロール名とトーンスケールのレコード
 * @param options - エクスポートオプション
 * @returns DTCGエクスポート結果
 */
export function exportScalesToDTCG(
	scales: Record<string, Map<number, Color>>,
	options: DTCGExportOptions = {},
): DTCGExportResult {
	const { indent = 2, includeAliases = false, colorSpace = "oklch" } = options;

	const tokens: Record<string, unknown> = {
		color: {} as Record<string, Record<string, DTCGToken>>,
	};

	const colorTokens = tokens.color as Record<string, Record<string, DTCGToken>>;

	for (const [role, tones] of Object.entries(scales)) {
		colorTokens[role] = {};

		// トーン値でソート
		const sortedTones = [...tones.entries()].sort(([a], [b]) => a - b);

		for (const [tone, color] of sortedTones) {
			const value =
				colorSpace === "oklch" ? toOklchString(color) : color.toHex();

			colorTokens[role][tone.toString()] = {
				$value: value,
				$type: "color",
			};
		}
	}

	// aliasトークンを追加
	if (includeAliases) {
		const semantic: Record<string, Record<string, DTCGAliasToken>> = {};

		for (const role of Object.keys(scales)) {
			semantic[role] = {
				default: {
					$value: `{color.${role}.500}`,
					$type: "color",
				},
				light: {
					$value: `{color.${role}.100}`,
					$type: "color",
				},
				dark: {
					$value: `{color.${role}.900}`,
					$type: "color",
				},
			};
		}

		tokens.semantic = semantic;
	}

	return {
		tokens,
		json: JSON.stringify(tokens, null, indent),
	};
}

/**
 * semanticトークンとaliasトークンを分離したDTCG形式でエクスポートする
 *
 * @param scales - ロール名とトーンスケールのレコード
 * @param aliases - aliasの定義（例: { "button.background": "primary.500" }）
 * @param options - エクスポートオプション
 * @returns DTCGエクスポート結果
 */
export function exportWithAliases(
	scales: Record<string, Map<number, Color>>,
	aliases: Record<string, string>,
	options: DTCGExportOptions = {},
): DTCGExportResult {
	const { indent = 2, colorSpace = "oklch" } = options;

	const tokens: Record<string, unknown> = {
		color: {} as Record<string, Record<string, DTCGToken>>,
		semantic: {} as Record<string, Record<string, DTCGAliasToken>>,
	};

	const colorTokens = tokens.color as Record<string, Record<string, DTCGToken>>;

	// 基本トークン
	for (const [role, tones] of Object.entries(scales)) {
		colorTokens[role] = {};

		const sortedTones = [...tones.entries()].sort(([a], [b]) => a - b);

		for (const [tone, color] of sortedTones) {
			const value =
				colorSpace === "oklch" ? toOklchString(color) : color.toHex();

			colorTokens[role][tone.toString()] = {
				$value: value,
				$type: "color",
			};
		}
	}

	// aliasトークン
	const semanticTokens = tokens.semantic as Record<
		string,
		Record<string, DTCGAliasToken>
	>;

	for (const [aliasPath, targetPath] of Object.entries(aliases)) {
		const parts = aliasPath.split(".");
		let current = semanticTokens;

		// ネストされたパスを作成
		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			if (!current[part]) {
				current[part] = {} as Record<string, DTCGAliasToken>;
			}
			current = current[part] as Record<string, Record<string, DTCGAliasToken>>;
		}

		const lastPart = parts[parts.length - 1];
		(current as Record<string, DTCGAliasToken>)[lastPart] = {
			$value: `{color.${targetPath}}`,
			$type: "color",
		};
	}

	return {
		tokens,
		json: JSON.stringify(tokens, null, indent),
	};
}

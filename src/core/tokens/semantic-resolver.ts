/**
 * セマンティックトークン参照解決機能
 *
 * セマンティックトークンのvar()参照を実際のHEX値に解決する。
 * CUDマッピングや色計算の前処理として使用される。
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import type { DadsColorHue, DadsToken } from "./types";

/**
 * var(--color-primitive-{hue}-{scale})形式をパースするための正規表現
 *
 * グループ:
 * - 全体マッチ: var(--color-primitive-blue-500)
 * - グループ1: blue-500（色相とスケール部分）
 */
const PRIMITIVE_VAR_PATTERN = /^var\(--color-primitive-([a-z-]+-\d+)\)$/i;

/**
 * トークンレジストリのインターフェース
 *
 * DadsTokenの高速検索を提供する
 */
export interface TokenRegistry {
	/**
	 * トークンIDでDadsTokenを検索する
	 * @param id トークンID（例: "dads-blue-500"）
	 * @returns DadsTokenまたはundefined
	 */
	getById(id: string): DadsToken | undefined;

	/**
	 * 色相とスケールでDadsTokenを検索する
	 * @param hue 色相（例: "blue"）
	 * @param scale スケール値（例: 500）
	 * @returns DadsTokenまたはundefined
	 */
	getByHueAndScale(hue: string, scale: number): DadsToken | undefined;

	/**
	 * 全てのトークンを取得する
	 */
	getAllTokens(): DadsToken[];
}

/**
 * DadsToken配列からTokenRegistryを生成する
 *
 * @param tokens DadsToken配列
 * @returns TokenRegistry
 *
 * @example
 * ```ts
 * const tokens = parseDadsPrimitives(cssText).tokens;
 * const registry = createTokenRegistry(tokens);
 * const blueToken = registry.getById("dads-blue-500");
 * ```
 */
export function createTokenRegistry(tokens: DadsToken[]): TokenRegistry {
	// IDによる検索用マップ
	const byIdMap = new Map<string, DadsToken>();
	// 色相-スケールによる検索用マップ（キー形式: "blue-500"）
	const byHueScaleMap = new Map<string, DadsToken>();

	for (const token of tokens) {
		byIdMap.set(token.id, token);

		// 有彩色トークンの場合、色相-スケールでもインデックス
		if (
			token.classification.category === "chromatic" &&
			token.classification.hue &&
			token.classification.scale
		) {
			const key = `${token.classification.hue}-${token.classification.scale}`;
			byHueScaleMap.set(key, token);
		}
	}

	return {
		getById(id: string): DadsToken | undefined {
			return byIdMap.get(id);
		},

		getByHueAndScale(hue: string, scale: number): DadsToken | undefined {
			const key = `${hue}-${scale}`;
			return byHueScaleMap.get(key);
		},

		getAllTokens(): DadsToken[] {
			return tokens;
		},
	};
}

/**
 * var()参照から色相とスケールを抽出する
 *
 * @param varReference var(--color-primitive-{hue}-{scale})形式の文字列
 * @returns { hue, scale } または null
 */
function parseVarReference(
	varReference: string,
): { hue: string; scale: number } | null {
	const match = varReference.match(PRIMITIVE_VAR_PATTERN);
	if (!match || !match[1]) {
		return null;
	}

	const hueScalePart = match[1];

	// 有効な色相リスト（ハイフン含む色相を先にチェック）
	const validHues: readonly DadsColorHue[] = [
		"light-blue", // ハイフン含む色相を先に
		"blue",
		"cyan",
		"green",
		"lime",
		"yellow",
		"orange",
		"red",
		"magenta",
		"purple",
	];

	for (const hue of validHues) {
		if (hueScalePart.startsWith(`${hue}-`)) {
			const scaleStr = hueScalePart.slice(hue.length + 1);
			const scale = parseInt(scaleStr, 10);

			if (!Number.isNaN(scale)) {
				return { hue, scale };
			}
		}
	}

	return null;
}

/**
 * セマンティックトークンのvar()参照を実際のHEX値に解決する
 *
 * Requirement 3.1: var(--color-primitive-{hue}-{scale})形式の参照をパース
 * Requirement 3.2: 参照先が存在しない場合はnullを返却
 * Requirement 3.3: CUDマッピング前に呼び出されることを想定した設計
 *
 * @param varReference var()形式の参照文字列
 * @param registry トークンレジストリ
 * @returns 解決されたHEX値または null
 *
 * @example
 * ```ts
 * const registry = createTokenRegistry(parseDadsPrimitives(css).tokens);
 * const hex = resolveSemanticReference("var(--color-primitive-green-500)", registry);
 * // hex: "#00a040" または null
 * ```
 */
export function resolveSemanticReference(
	varReference: string,
	registry: TokenRegistry,
): string | null {
	// 空文字列または非var形式はnull
	if (!varReference || !varReference.startsWith("var(")) {
		return null;
	}

	// var()参照から色相とスケールを抽出
	const parsed = parseVarReference(varReference);
	if (!parsed) {
		return null;
	}

	// レジストリから対応するトークンを検索
	const token = registry.getByHueAndScale(parsed.hue, parsed.scale);
	if (!token) {
		return null;
	}

	return token.hex;
}

/**
 * DADSプリミティブカラーのデータプロバイダー
 *
 * @digital-go-jp/design-tokensからDADSプリミティブカラーを
 * 読み込み、構造化されたデータとして提供する
 */

// CSSを静的インポート（ビルド時にバンドルされる）
// @ts-expect-error Bunはテキストとしてインポートするための?textサフィックスをサポート
import dadsCssText from "@digital-go-jp/design-tokens/dist/tokens.css" with {
	type: "text",
};
import { parseDadsPrimitives } from "./dads-importer";
import type { DadsChromaScale, DadsColorHue, DadsToken } from "./types";

/**
 * 10色相の順序定義
 */
const HUE_ORDER: readonly DadsColorHue[] = [
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
 * 英語名からDadsColorHueへの逆マッピング
 */
const EN_TO_HUE: Record<string, DadsColorHue> = {
	Blue: "blue",
	"Light Blue": "light-blue",
	Cyan: "cyan",
	Green: "green",
	Lime: "lime",
	Yellow: "yellow",
	Orange: "orange",
	Red: "red",
	Magenta: "magenta",
	Purple: "purple",
};

/**
 * 表示名（displayName）からDadsColorHueを取得する
 *
 * @param displayName - 英語表示名（例："Light Blue"）
 * @returns DadsColorHue または undefined
 */
export function getDadsHueFromDisplayName(
	displayName: string,
): DadsColorHue | undefined {
	return EN_TO_HUE[displayName];
}

/**
 * スケール順序（50から1200まで）
 */
const SCALE_ORDER: readonly DadsChromaScale[] = [
	50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
] as const;

/**
 * DADSカラースケールの型定義
 */
export interface DadsColorScale {
	/** 色相 */
	hue: DadsColorHue;
	/** 色相名 */
	hueName: { ja: string; en: string };
	/** スケール別カラー配列（50から1200の順） */
	colors: Array<{
		scale: DadsChromaScale;
		hex: string;
		token: DadsToken;
	}>;
}

/**
 * トークンキャッシュ
 */
let tokenCache: DadsToken[] | null = null;

/**
 * DADSトークンを読み込む
 *
 * @digital-go-jp/design-tokensのCSSから自動的にトークンを読み込む
 * 結果はキャッシュされる
 *
 * @returns DADSトークン配列
 */
export async function loadDadsTokens(): Promise<DadsToken[]> {
	if (tokenCache) {
		return tokenCache;
	}

	try {
		// 静的インポートしたCSSテキストを使用
		const result = parseDadsPrimitives(dadsCssText);

		if (result.warnings.length > 0) {
			console.warn("DADS token parse warnings:", result.warnings);
		}

		tokenCache = result.tokens;
		return result.tokens;
	} catch (error) {
		console.error("Failed to load DADS tokens:", error);
		throw new Error("DADSトークンの読み込みに失敗しました");
	}
}

/**
 * トークンキャッシュをクリアする（テスト用）
 */
export function clearTokenCache(): void {
	tokenCache = null;
}

/**
 * 特定の色相のカラースケールを取得する
 *
 * @param tokens - DADSトークン配列
 * @param hue - 色相
 * @returns カラースケール
 */
export function getDadsColorsByHue(
	tokens: DadsToken[],
	hue: DadsColorHue,
): DadsColorScale {
	// 該当色相の有彩色トークンを抽出
	const hueTokens = tokens.filter(
		(t) =>
			t.classification.category === "chromatic" && t.classification.hue === hue,
	);

	// スケール順にソート
	const colors = SCALE_ORDER.map((scale) => {
		const token = hueTokens.find((t) => t.classification.scale === scale);
		if (!token) {
			// トークンが見つからない場合はプレースホルダー
			return {
				scale,
				hex: "#000000",
				token: {
					id: `dads-${hue}-${scale}`,
					hex: "#000000",
					nameJa: `${HUE_NAME_JA[hue]} ${scale}`,
					nameEn: `${HUE_NAME_EN[hue]} ${scale}`,
					classification: {
						category: "chromatic" as const,
						hue,
						scale,
					},
					source: "dads" as const,
				},
			};
		}
		return {
			scale,
			hex: token.hex,
			token,
		};
	});

	return {
		hue,
		hueName: {
			ja: HUE_NAME_JA[hue],
			en: HUE_NAME_EN[hue],
		},
		colors,
	};
}

/**
 * 全有彩色のカラースケールを取得する
 *
 * @param tokens - DADSトークン配列
 * @returns 全10色相のカラースケール配列
 */
export function getAllDadsChromatic(tokens: DadsToken[]): DadsColorScale[] {
	return HUE_ORDER.map((hue) => getDadsColorsByHue(tokens, hue));
}

/**
 * 色相順序を取得する
 */
export function getHueOrder(): readonly DadsColorHue[] {
	return HUE_ORDER;
}

/**
 * スケール順序を取得する
 */
export function getScaleOrder(): readonly DadsChromaScale[] {
	return SCALE_ORDER;
}

/**
 * HEX値からDADSトークンを検索する
 *
 * @param tokens - DADSトークン配列
 * @param hex - 検索するHEX値
 * @returns 一致するDADSトークン情報、見つからない場合はundefined
 */
export function findDadsColorByHex(
	tokens: DadsToken[],
	hex: string,
): { token: DadsToken; hue: DadsColorHue; scale: DadsChromaScale } | undefined {
	const normalizedHex = hex.toLowerCase();

	for (const token of tokens) {
		if (
			token.hex.toLowerCase() === normalizedHex &&
			token.classification.category === "chromatic"
		) {
			return {
				token,
				hue: token.classification.hue as DadsColorHue,
				scale: token.classification.scale as DadsChromaScale,
			};
		}
	}
	return undefined;
}

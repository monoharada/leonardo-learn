/**
 * ランダムカラー選択機能
 *
 * DADSプリミティブカラー（有彩色）からランダムに選択する
 *
 * @module @/core/tokens/random-color-picker
 */

import { parseColor } from "@/utils/color-space";
import { getContrast, WCAG_RATIO_AA } from "@/utils/wcag";
import { loadDadsTokens } from "./dads-data-provider";
import type { DadsToken } from "./types";

/**
 * ランダム選択のオプション
 */
export interface RandomColorOptions {
	/**
	 * 背景色（HEX形式）
	 * 指定された場合、この背景色に対してWCAG AA（4.5:1）以上の
	 * コントラスト比を持つ色のみを候補とする
	 */
	backgroundHex?: string;
	/**
	 * 最小コントラスト比（デフォルト: 4.5）
	 */
	minContrastRatio?: number;
}

/**
 * DADSの有彩色（chromatic）トークンからランダムに1つ選択する（内部ヘルパー）
 *
 * @param options オプション（背景色指定でコントラストフィルタリング）
 * @returns ランダムに選択されたDADSトークン
 * @throws DADSトークンの読み込みに失敗した場合
 */
async function selectRandomChromaticToken(
	options?: RandomColorOptions,
): Promise<DadsToken> {
	const tokens = await loadDadsTokens();

	// chromaticカテゴリのみをフィルター（10色相 × 13スケール = 130色）
	let chromaticTokens = tokens.filter(
		(t) => t.classification.category === "chromatic",
	);

	// 背景色が指定された場合、コントラスト比でフィルタリング
	if (options?.backgroundHex) {
		const bgColor = parseColor(options.backgroundHex);
		const minRatio = options.minContrastRatio ?? WCAG_RATIO_AA;

		if (bgColor) {
			chromaticTokens = chromaticTokens.filter((token) => {
				const fgColor = parseColor(token.hex);
				if (!fgColor) return false;
				const ratio = getContrast(fgColor, bgColor);
				return ratio >= minRatio;
			});
		}
	}

	if (chromaticTokens.length === 0) {
		throw new Error("条件を満たす有彩色トークンが見つかりませんでした");
	}

	// ランダムにトークンを選択
	const randomIndex = Math.floor(Math.random() * chromaticTokens.length);
	const selectedToken = chromaticTokens[randomIndex];

	if (!selectedToken) {
		throw new Error("トークンの選択に失敗しました");
	}

	return selectedToken;
}

/**
 * DADSの有彩色（chromatic）トークンからランダムに1つ選択する
 *
 * @param options オプション（背景色指定でコントラストフィルタリング）
 * @returns ランダムに選択されたDADSトークンのHEX値
 * @throws DADSトークンの読み込みに失敗した場合
 */
export async function getRandomDadsColor(
	options?: RandomColorOptions,
): Promise<string> {
	const token = await selectRandomChromaticToken(options);
	return token.hex;
}

/**
 * DADSの有彩色（chromatic）トークンからランダムに1つ選択する（トークン全体を返す）
 *
 * @param options オプション（背景色指定でコントラストフィルタリング）
 * @returns ランダムに選択されたDADSトークン
 * @throws DADSトークンの読み込みに失敗した場合
 */
export async function getRandomDadsToken(
	options?: RandomColorOptions,
): Promise<DadsToken> {
	return selectRandomChromaticToken(options);
}

/**
 * 指定した色が背景色に対してWCAG AA（4.5:1）以上のコントラストを持つかチェック
 *
 * @param colorHex チェック対象の色（HEX形式）
 * @param backgroundHex 背景色（HEX形式）
 * @param minRatio 最小コントラスト比（デフォルト: 4.5）
 * @returns コントラスト比と合否
 */
export function checkContrastCompliance(
	colorHex: string,
	backgroundHex: string,
	minRatio: number = WCAG_RATIO_AA,
): { ratio: number; isCompliant: boolean } {
	const fgColor = parseColor(colorHex);
	const bgColor = parseColor(backgroundHex);

	if (!fgColor || !bgColor) {
		return { ratio: 0, isCompliant: false };
	}

	const ratio = getContrast(fgColor, bgColor);
	return { ratio, isCompliant: ratio >= minRatio };
}

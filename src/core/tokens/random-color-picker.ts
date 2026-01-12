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
 * トークンとそのコントラスト比を保持する型
 */
interface TokenWithContrast {
	token: DadsToken;
	contrast: number;
}

/**
 * DADSの有彩色（chromatic）トークンからランダムに1つ選択する（内部ヘルパー）
 *
 * フォールバック動作:
 * - 指定されたコントラスト比を満たす色がない場合、要件を段階的に緩和
 * - 最低3:1まで緩和しても見つからない場合、最もコントラストが高い色を選択
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
	const chromaticTokens = tokens.filter(
		(t) => t.classification.category === "chromatic",
	);

	if (chromaticTokens.length === 0) {
		throw new Error("有彩色トークンが見つかりませんでした");
	}

	// 背景色が指定された場合、コントラスト比でフィルタリング
	if (options?.backgroundHex) {
		const bgColor = parseColor(options.backgroundHex);
		const minRatio = options.minContrastRatio ?? WCAG_RATIO_AA;

		if (bgColor) {
			// 全トークンのコントラスト比を計算
			const tokensWithContrast: TokenWithContrast[] = chromaticTokens
				.map((token) => {
					const fgColor = parseColor(token.hex);
					if (!fgColor) return null;
					const contrast = getContrast(fgColor, bgColor);
					return { token, contrast };
				})
				.filter((item): item is TokenWithContrast => item !== null);

			// 指定されたコントラスト比以上でフィルター
			let filteredTokens = tokensWithContrast.filter(
				(item) => item.contrast >= minRatio,
			);

			// フォールバック: 条件を満たす色がない場合
			if (filteredTokens.length === 0) {
				// 段階的にコントラスト要件を緩和（4.5 → 3.0）
				const FALLBACK_CONTRAST_LEVELS = [3.5, 3.0];

				for (const fallbackRatio of FALLBACK_CONTRAST_LEVELS) {
					filteredTokens = tokensWithContrast.filter(
						(item) => item.contrast >= fallbackRatio,
					);
					if (filteredTokens.length > 0) {
						break;
					}
				}
			}

			// それでも見つからない場合、最もコントラストが高い色を選択
			if (filteredTokens.length === 0 && tokensWithContrast.length > 0) {
				// コントラストでソートして上位の色から選択（ランダム性を保つため上位10色から選択）
				tokensWithContrast.sort((a, b) => b.contrast - a.contrast);
				const topCandidates = tokensWithContrast.slice(0, 10);
				const randomIndex = Math.floor(Math.random() * topCandidates.length);
				const selected = topCandidates[randomIndex];
				if (selected) {
					return selected.token;
				}
			}

			// フィルター済みトークンからランダムに選択
			if (filteredTokens.length > 0) {
				const randomIndex = Math.floor(Math.random() * filteredTokens.length);
				const selected = filteredTokens[randomIndex];
				if (selected) {
					return selected.token;
				}
			}
		}
	}

	// 背景色指定なし、または解析失敗の場合：単純なランダム選択
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

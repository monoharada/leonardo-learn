/**
 * ランダムカラー選択機能
 *
 * DADSプリミティブカラー（有彩色）からランダムに選択する
 *
 * @module @/core/tokens/random-color-picker
 */

import { loadDadsTokens } from "./dads-data-provider";
import type { DadsToken } from "./types";

/**
 * DADSの有彩色（chromatic）トークンからランダムに1つ選択する（内部ヘルパー）
 *
 * @returns ランダムに選択されたDADSトークン
 * @throws DADSトークンの読み込みに失敗した場合
 */
async function selectRandomChromaticToken(): Promise<DadsToken> {
	const tokens = await loadDadsTokens();

	// chromaticカテゴリのみをフィルター（10色相 × 13スケール = 130色）
	const chromaticTokens = tokens.filter(
		(t) => t.classification.category === "chromatic",
	);

	if (chromaticTokens.length === 0) {
		throw new Error("有彩色トークンが見つかりませんでした");
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
 * @returns ランダムに選択されたDADSトークンのHEX値
 * @throws DADSトークンの読み込みに失敗した場合
 */
export async function getRandomDadsColor(): Promise<string> {
	const token = await selectRandomChromaticToken();
	return token.hex;
}

/**
 * DADSの有彩色（chromatic）トークンからランダムに1つ選択する（トークン全体を返す）
 *
 * @returns ランダムに選択されたDADSトークン
 * @throws DADSトークンの読み込みに失敗した場合
 */
export async function getRandomDadsToken(): Promise<DadsToken> {
	return selectRandomChromaticToken();
}

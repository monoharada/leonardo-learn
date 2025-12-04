/**
 * CUD パレットサービス
 * CUD推奨配色セット ver.4 の検索・取得API
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { deltaEok, toOklab } from "../../utils/color-space";
import {
	CUD_ACCENT_COLORS,
	CUD_BASE_COLORS,
	CUD_COLOR_SET,
	CUD_NEUTRAL_COLORS,
	type CudColor,
	type CudGroup,
} from "./colors";

/**
 * マッチレベル
 * - exact: 完全一致または非常に近い（deltaE ≤ 0.03）- CUD推奨色として扱う
 * - near: 近い色（0.03 < deltaE ≤ 0.10）- 参考情報レベル
 * - moderate: やや離れている（0.10 < deltaE ≤ 0.20）- 警告レベル
 * - off: 離れている（deltaE > 0.20）- 警告レベル（強調）
 */
export type MatchLevel = "exact" | "near" | "moderate" | "off";

/**
 * CUD色検索結果
 */
export interface CudSearchResult {
	/** 最も近いCUD色 */
	nearest: CudColor;
	/** deltaE（色差）*/
	deltaE: number;
	/** マッチレベル */
	matchLevel: MatchLevel;
}

/**
 * deltaEの閾値
 * - exact: 完全一致相当（≤ 0.03）
 * - near: 近い色（0.03 < x ≤ 0.10）- 参考情報として表示
 * - moderate: やや離れている（0.10 < x ≤ 0.20）- 警告として表示
 * - off: 離れている（> 0.20）- 警告として表示（強調）
 */
const DELTA_E_THRESHOLDS = {
	exact: 0.03,
	near: 0.1,
	moderate: 0.2,
} as const;

/**
 * HEX値を正規化（大文字、#付き）
 */
const normalizeHex = (hex: string): string => {
	let normalized = hex.trim().toUpperCase();
	if (!normalized.startsWith("#")) {
		normalized = `#${normalized}`;
	}
	return normalized;
};

/**
 * 全20色を取得する
 * Requirement 2.1: 全20色を取得する関数
 *
 * @returns 全CUD色の配列（readonly）
 */
export const getCudColorSet = (): readonly CudColor[] => {
	return CUD_COLOR_SET;
};

/**
 * グループ別にCUD色を取得する
 * Requirement 2.2: グループ別にフィルタリングする関数
 *
 * @param group - カラーグループ（accent, base, neutral）
 * @returns 指定グループのCUD色配列（readonly）
 */
export const getCudColorsByGroup = (group: CudGroup): readonly CudColor[] => {
	switch (group) {
		case "accent":
			return CUD_ACCENT_COLORS;
		case "base":
			return CUD_BASE_COLORS;
		case "neutral":
			return CUD_NEUTRAL_COLORS;
	}
};

/**
 * HEXでCUD色との完全一致を判定する
 * Requirement 2.3, 2.5: 完全一致検索
 *
 * @param hex - 検索するHEX値（#付き/なし、大文字/小文字どちらも可）
 * @returns 一致するCUD色、またはnull
 */
export const findExactCudColorByHex = (hex: string): CudColor | null => {
	const normalizedHex = normalizeHex(hex);
	return CUD_COLOR_SET.find((color) => color.hex === normalizedHex) ?? null;
};

/**
 * 最も近いCUD色を検索する
 * Requirement 2.4, 2.6: 最近接色検索
 *
 * @param hex - 検索するHEX値（#付き/なし、大文字/小文字どちらも可）
 * @returns 検索結果（nearest, deltaE, matchLevel）
 */
export const findNearestCudColor = (hex: string): CudSearchResult => {
	const normalizedHex = normalizeHex(hex);

	// 入力色をOKLabに変換
	const inputOklab = toOklab(normalizedHex);
	if (!inputOklab) {
		throw new Error(`Invalid hex color: ${hex}`);
	}

	// 全CUD色との距離を計算
	let minDeltaE = Number.POSITIVE_INFINITY;
	let nearestColor: CudColor | undefined;

	for (const cudColor of CUD_COLOR_SET) {
		// CudColorのoklabをculori互換の形式に変換
		const cudOklab = { mode: "oklab" as const, ...cudColor.oklab };
		const deltaE = deltaEok(inputOklab, cudOklab);
		if (deltaE < minDeltaE) {
			minDeltaE = deltaE;
			nearestColor = cudColor;
		}
	}

	// CUD_COLOR_SETは常に20色あるので、nearestColorは必ず設定される
	if (!nearestColor) {
		throw new Error("CUD_COLOR_SET is empty");
	}

	// マッチレベルを判定
	let matchLevel: MatchLevel;
	if (minDeltaE <= DELTA_E_THRESHOLDS.exact) {
		matchLevel = "exact";
	} else if (minDeltaE <= DELTA_E_THRESHOLDS.near) {
		matchLevel = "near";
	} else if (minDeltaE <= DELTA_E_THRESHOLDS.moderate) {
		matchLevel = "moderate";
	} else {
		matchLevel = "off";
	}

	return {
		nearest: nearestColor,
		deltaE: minDeltaE,
		matchLevel,
	};
};

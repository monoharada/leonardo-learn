/**
 * Anchor Color Management
 * ブランドカラーをアンカー（基準色）として管理し、CUD優先度設定を保持
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import {
	type CudSearchResult,
	findNearestCudColor,
	type MatchLevel,
} from "./service";

/**
 * アンカーカラー優先度
 * - brand: 元のブランドカラーを優先
 * - cud: CUD推奨色を優先
 */
export type AnchorPriority = "brand" | "cud";

/**
 * アンカーカラー状態
 * Requirement 1.6: アンカーカラーの設定状態を保持
 */
export interface AnchorColorState {
	/** 元のブランドカラー（HEX、正規化済み） */
	readonly originalHex: string;
	/** CUD最近接色の検索結果 */
	readonly nearestCud: CudSearchResult;
	/** 優先度設定 */
	readonly priority: AnchorPriority;
	/** 実効色（優先度に応じた使用色） */
	readonly effectiveHex: string;
}

/**
 * HEX値を正規化（大文字、#付き）
 * @param hex - 入力HEX値
 * @returns 正規化されたHEX値
 * @throws 無効なHEX値の場合
 */
const normalizeHex = (hex: string): string => {
	if (!hex || typeof hex !== "string") {
		throw new Error(`Invalid hex color: ${hex}`);
	}

	let normalized = hex.trim().toUpperCase();
	if (!normalized.startsWith("#")) {
		normalized = `#${normalized}`;
	}

	// 有効なHEXかどうかを検証
	const hexPattern = /^#[0-9A-F]{6}$/;
	if (!hexPattern.test(normalized)) {
		throw new Error(`Invalid hex color: ${hex}`);
	}

	return normalized;
};

/**
 * MatchLevelに基づいて推奨優先度を判定する
 * Requirement 1.2, 1.3: exact/nearならcud、それ以外はbrand
 *
 * @param matchLevel - CUD色とのマッチレベル
 * @returns 推奨される優先度
 */
const getPriorityFromMatchLevel = (matchLevel: MatchLevel): AnchorPriority => {
	switch (matchLevel) {
		case "exact":
		case "near":
			return "cud";
		case "moderate":
		case "off":
			return "brand";
	}
};

/**
 * 実効色を計算する
 * Requirement 1.4, 1.5: 優先度に応じた実効色の決定
 *
 * @param originalHex - 元のブランドカラー
 * @param nearestCudHex - 最近接CUD色のHEX
 * @param priority - 優先度設定
 * @returns 実効色のHEX
 */
const calculateEffectiveHex = (
	originalHex: string,
	nearestCudHex: string,
	priority: AnchorPriority,
): string => {
	return priority === "brand" ? originalHex : nearestCudHex;
};

/**
 * アンカーカラー状態を作成する
 * Requirement 1.1: ブランドカラーをアンカーとして設定
 *
 * @param hex - ブランドカラーのHEX値
 * @returns アンカーカラー状態
 * @throws 無効なHEX値の場合
 *
 * @example
 * ```ts
 * const anchor = createAnchorColor("#FF2800");
 * // => {
 * //   originalHex: "#FF2800",
 * //   nearestCud: { nearest: { id: "red", ... }, deltaE: 0, matchLevel: "exact" },
 * //   priority: "cud",
 * //   effectiveHex: "#FF2800"
 * // }
 * ```
 */
export const createAnchorColor = (hex: string): AnchorColorState => {
	const normalizedHex = normalizeHex(hex);

	// CUD最近接色を検索
	const nearestCud = findNearestCudColor(normalizedHex);

	// マッチレベルに基づいて初期優先度を決定
	const priority = getPriorityFromMatchLevel(nearestCud.matchLevel);

	// 実効色を計算
	const effectiveHex = calculateEffectiveHex(
		normalizedHex,
		nearestCud.nearest.hex,
		priority,
	);

	return {
		originalHex: normalizedHex,
		nearestCud,
		priority,
		effectiveHex,
	};
};

/**
 * 優先度を変更する（イミュータブル）
 * Requirement 1.4, 1.5: 優先度変更による実効色の切り替え
 *
 * @param anchor - 現在のアンカーカラー状態
 * @param priority - 新しい優先度
 * @returns 新しいアンカーカラー状態
 *
 * @example
 * ```ts
 * const anchor = createAnchorColor("#123456");
 * const updated = setAnchorPriority(anchor, "cud");
 * // => { ...anchor, priority: "cud", effectiveHex: nearestCud.hex }
 * ```
 */
export const setAnchorPriority = (
	anchor: AnchorColorState,
	priority: AnchorPriority,
): AnchorColorState => {
	const effectiveHex = calculateEffectiveHex(
		anchor.originalHex,
		anchor.nearestCud.nearest.hex,
		priority,
	);

	return {
		...anchor,
		priority,
		effectiveHex,
	};
};

/**
 * 自動優先度判定
 * Requirement 1.2, 1.3: exact/nearならcud、それ以外はbrand
 *
 * @param anchor - アンカーカラー状態
 * @returns 推奨される優先度
 *
 * @example
 * ```ts
 * const anchor = createAnchorColor("#FF2800");
 * suggestPriority(anchor); // => "cud" (exact match)
 *
 * const anchor2 = createAnchorColor("#123456");
 * suggestPriority(anchor2); // => "brand" (off match)
 * ```
 */
export const suggestPriority = (anchor: AnchorColorState): AnchorPriority => {
	return getPriorityFromMatchLevel(anchor.nearestCud.matchLevel);
};

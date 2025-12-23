/**
 * DADSトークンとブランドトークンの型定義
 * DADSプリミティブカラーを不変の基盤として表現し、
 * ブランドカラーを派生トークンとして定義する
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import type { CudZone } from "../cud/zone";

/**
 * トークンのソース種別
 * - dads: DADS（デジタル庁デザインシステム）公式のプリミティブカラー
 * - brand: プロダクト固有のブランドカラー（DADSから派生）
 */
export type TokenSource = "dads" | "brand";

/**
 * DADS有彩色の10色相
 * Requirement 1.2
 */
export type DadsColorHue =
	| "blue"
	| "light-blue"
	| "cyan"
	| "green"
	| "lime"
	| "yellow"
	| "orange"
	| "red"
	| "magenta"
	| "purple";

/**
 * DADSカラーカテゴリ
 * Requirement 1.5
 */
export type DadsColorCategory = "chromatic" | "neutral" | "semantic";

/**
 * DADS有彩色スケール（50-1200）
 * Requirement 1.3
 */
export type DadsChromaScale =
	| 50
	| 100
	| 200
	| 300
	| 400
	| 500
	| 600
	| 700
	| 800
	| 900
	| 1000
	| 1100
	| 1200;

/**
 * DADS無彩色スケール（アクセシビリティ用中間値420, 536を含む）
 * Requirement 1.4
 */
export type DadsNeutralScale =
	| 50
	| 100
	| 200
	| 300
	| 400
	| 420
	| 500
	| 536
	| 600
	| 700
	| 800
	| 900;

/**
 * DADSカラー分類情報
 */
export interface DadsColorClassification {
	/** カテゴリ（有彩色/無彩色/セマンティック） */
	category: DadsColorCategory;
	/** 色相（有彩色のみ） */
	hue?: DadsColorHue;
	/** スケール値 */
	scale?: DadsChromaScale | DadsNeutralScale;
	/** CUD推奨色とのマッピング情報 */
	cudMapping?: {
		/** 最も近いCUD推奨色のID */
		nearestCudId: string;
		/** CUD推奨色との色差（deltaE） */
		deltaE: number;
	};
}

/**
 * 派生タイプ
 * - strict-snap: CUD推奨色に完全スナップ
 * - soft-snap: CUD推奨色に部分スナップ
 * - reference: 参照のみ（スナップなし）
 * - manual: 手動設定
 */
export type DerivationType =
	| "strict-snap"
	| "soft-snap"
	| "reference"
	| "manual";

/**
 * DADSトークン（不変）
 * DADSプリミティブカラーを型安全かつ不変のデータ構造として表現
 *
 * Requirement 1.1: readonly修飾子で全プロパティを不変に保護
 * Requirement 1.6: alpha値を持つ場合はオプショナルフィールドで保持
 */
export interface DadsToken {
	/** トークンID（例: "dads-blue-500"） */
	readonly id: string;
	/** HEX値（#RRGGBB形式） */
	readonly hex: string;
	/** 日本語名 */
	readonly nameJa: string;
	/** 英語名 */
	readonly nameEn: string;
	/** 分類情報 */
	readonly classification: DadsColorClassification;
	/** ソース種別（常に"dads"） */
	readonly source: "dads";
	/** alpha値（0-1、オプショナル） */
	readonly alpha?: number;
}

/**
 * DADS参照情報
 * ブランドトークンがどのDADSトークンから派生したかを示す
 *
 * Requirement 5.2
 */
export interface DadsReference {
	/** 参照先DADSトークンのID */
	tokenId: string;
	/** 参照先DADSトークンのHEX値 */
	tokenHex: string;
	/** 参照先DADSトークンのalpha値（オプショナル） */
	tokenAlpha?: number;
	/** DADSトークンとの色差（deltaE） */
	deltaE: number;
	/** 派生タイプ */
	derivationType: DerivationType;
	/** CUDゾーン */
	zone: CudZone;
}

/**
 * ブランドトークン
 * DADSプリミティブからの派生トークンとして定義
 *
 * Requirement 5.1, 5.3, 5.4, 5.5
 */
export interface BrandToken {
	/** トークンID（例: "brand-primary-500"） */
	id: string;
	/** HEX値（#RRGGBB形式） */
	hex: string;
	/** alpha値（0-1、オプショナル） */
	alpha?: number;
	/** ソース種別（常に"brand"） */
	source: "brand";
	/** DADS参照情報 */
	dadsReference: DadsReference;
	/** 最適化前の入力色（トレーサビリティ用） */
	originalHex?: string;
}

/**
 * カラートークン（Discriminated Union）
 * DADSトークンまたはブランドトークン
 *
 * sourceフィールドで判別可能
 */
export type ColorToken = DadsToken | BrandToken;

/**
 * DadsTokenかどうかを判定する型ガード関数
 *
 * Requirement 1.7
 *
 * @param token - 判定対象のトークン
 * @returns DadsTokenの場合はtrue
 *
 * @example
 * ```ts
 * if (isDadsToken(token)) {
 *   console.log(token.nameJa); // TypeScriptがDadsToken型と認識
 * }
 * ```
 */
export function isDadsToken(token: ColorToken): token is DadsToken {
	return token.source === "dads";
}

/**
 * BrandTokenかどうかを判定する型ガード関数
 *
 * Requirement 1.7
 *
 * @param token - 判定対象のトークン
 * @returns BrandTokenの場合はtrue
 *
 * @example
 * ```ts
 * if (isBrandToken(token)) {
 *   console.log(token.dadsReference.tokenId); // TypeScriptがBrandToken型と認識
 * }
 * ```
 */
export function isBrandToken(token: ColorToken): token is BrandToken {
	return token.source === "brand";
}

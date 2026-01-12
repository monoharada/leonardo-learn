/**
 * セマンティックロール関連の共有型定義
 *
 * Core層とUI層で共有される型を一元管理
 * Requirements: 1.1, 2.2, 3.2
 */

/**
 * セマンティックロールカテゴリ
 * Requirements: 2.2
 */
export type RoleCategory =
	| "primary"
	| "secondary"
	| "tertiary"
	| "accent"
	| "semantic"
	| "link";

/**
 * semanticカテゴリのサブタイプ（短縮ラベル決定用）
 * Requirements: 2.2
 */
export type SemanticSubType = "success" | "error" | "warning";

/**
 * セマンティックロール情報
 * Requirements: 1.1, 1.3, 2.2, 3.2
 */
export interface SemanticRole {
	/** ロール名（例: "Primary", "Success-1", "Accent-Blue"） */
	name: string;
	/** カテゴリ */
	category: RoleCategory;
	/**
	 * ロールの由来
	 * - dads: DADS公式定義（不変）
	 * - brand: 生成・選択されたブランドロール
	 *
	 * 省略時は互換性のため "brand" 相当として扱う。
	 */
	source?: "dads" | "brand";
	/** semanticカテゴリの場合のサブタイプ */
	semanticSubType?: SemanticSubType;
	/** フル表示名（ツールチップ用、フォーマット: "[カテゴリ名] ロール名"） */
	fullName: string;
	/** 円形スウォッチ用短縮ラベル (P/S/A/Su/E/W/L等) */
	shortLabel: string;
	/**
	 * hue-scale情報（オプション）
	 * ブランドロールでbaseChromaName/stepが存在する場合に設定
	 * 例: "blue-500", "purple-600"
	 * Requirements: 1.3
	 */
	hueScale?: string;
}

/**
 * ロールマッピング結果
 * キー形式:
 * - DADSロール: "${dadsHue}-${scale}" (例: "blue-600")
 * - ブランドロール（hue-scale特定可能時）: "${dadsHue}-${scale}" (DADSロールと同一キーにマージ)
 * - ブランドロール（hue-scale特定不可時）: "brand-unresolved"
 * Requirements: 1.1
 */
export type RoleMapping = Map<string, SemanticRole[]>;

/**
 * ブランドロール未解決キー
 * hue-scale特定不可のブランドロール用
 */
export const BRAND_UNRESOLVED_KEY = "brand-unresolved";

/**
 * カテゴリ別の短縮ラベルマップ
 * Requirements: 2.2
 */
export const CATEGORY_SHORT_LABELS: Record<RoleCategory, string> = {
	primary: "P",
	secondary: "S",
	tertiary: "T",
	accent: "A",
	semantic: "", // semanticSubTypeで決定
	link: "L",
};

/**
 * semanticサブタイプ別の短縮ラベルマップ
 * Requirements: 2.2
 */
export const SEMANTIC_SUBTYPE_LABELS: Record<SemanticSubType, string> = {
	success: "Su",
	error: "E",
	warning: "W",
};

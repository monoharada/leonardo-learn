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
	| "accent"
	| "semantic"
	| "link";

/**
 * セマンティックロール情報
 * Requirements: 1.1, 1.3, 3.2
 */
export interface SemanticRole {
	/** ロール名（例: "Primary", "Success-1", "Accent-Blue"） */
	name: string;
	/** カテゴリ */
	category: RoleCategory;
	/** フル表示名（ツールチップ用、フォーマット: "[カテゴリ名] ロール名"） */
	fullName: string;
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
 * Requirements: 1.1
 */
export type RoleMapping = Map<string, SemanticRole[]>;

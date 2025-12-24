/**
 * RoleDotIndicator - 円形ドットインジケーターの生成
 *
 * セマンティックロールカテゴリを示す円形ドットを生成する
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 4.2, 4.3
 * - 直径12pxの円形ドット
 * - カテゴリ別背景色
 * - 白い境界線（2px）とドロップシャドウで視認性確保
 * - pointer-events無効化でスウォッチ操作を妨げない
 */

import type { RoleCategory } from "@/core/semantic-role/types";

// 型の再エクスポート（後方互換性のため）
export type { RoleCategory } from "@/core/semantic-role/types";

/**
 * カテゴリ別ドット色定義（要件2.2準拠）
 */
export const ROLE_CATEGORY_COLORS: Record<RoleCategory, string> = {
	primary: "#6366f1", // インディゴ
	secondary: "#8b5cf6", // パープル
	accent: "#ec4899", // ピンク
	semantic: "#10b981", // エメラルド
	link: "#3b82f6", // ブルー
};

/**
 * ロールドットインジケーターを生成
 *
 * @param category - ロールカテゴリ
 * @returns ドット要素（span）
 *
 * スタイル:
 * - position: absolute
 * - top: 4px, right: 4px
 * - width/height: 12px
 * - border-radius: 50%
 * - border: 2px solid white
 * - box-shadow: 0 1px 3px rgba(0,0,0,0.3)
 * - pointer-events: none
 * - z-index: 10 (既存バッジより上)
 *
 * @example
 * ```ts
 * const dot = createRoleDot("primary");
 * swatchElement.appendChild(dot);
 * ```
 */
export function createRoleDot(category: RoleCategory): HTMLElement {
	const dot = document.createElement("span");

	const backgroundColor = ROLE_CATEGORY_COLORS[category];

	dot.style.cssText = `
		position: absolute;
		top: 4px;
		right: 4px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background-color: ${backgroundColor};
		border: 2px solid white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		pointer-events: none;
		z-index: 10;
	`;

	dot.dataset.semanticRoleDot = "true";

	return dot;
}

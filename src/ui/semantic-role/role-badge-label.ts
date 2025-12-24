/**
 * RoleBadgeLabel - バッジラベルの生成
 *
 * セマンティックロール名を表示するバッジを生成する
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 4.2, 4.3
 * - フォントサイズ9px、ウェイト600、角丸3px
 * - カテゴリ別背景色、白文字
 * - 長いテキストは省略記号（...）で切り詰め
 * - 最大2つまで表示、3つ以上は「+N」形式
 * - position: absoluteで左下配置
 * - pointer-events無効化
 */

import type { SemanticRole } from "@/core/semantic-role/types";
import { ROLE_CATEGORY_COLORS } from "./role-dot-indicator";

// 型の再エクスポート（後方互換性のため）
export type { SemanticRole } from "@/core/semantic-role/types";

/**
 * 単一バッジを生成
 *
 * @param role - セマンティックロール
 * @returns バッジ要素（span）
 *
 * スタイル:
 * - font-size: 9px
 * - font-weight: 600
 * - border-radius: 3px
 * - padding: 1px 4px
 * - color: white
 * - background-color: ROLE_CATEGORY_COLORS[role.category]
 * - max-width: 60px
 * - overflow: hidden
 * - text-overflow: ellipsis
 * - white-space: nowrap
 */
export function createSingleBadge(role: SemanticRole): HTMLElement {
	const badge = document.createElement("span");
	const backgroundColor = ROLE_CATEGORY_COLORS[role.category];

	badge.textContent = role.name;
	badge.style.cssText = `
		font-size: 9px;
		font-weight: 600;
		border-radius: 3px;
		padding: 1px 4px;
		color: white;
		background-color: ${backgroundColor};
		max-width: 60px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: inline-block;
	`;

	return badge;
}

/**
 * 「+N」バッジを生成
 *
 * @param count - 残りのロール数
 * @returns 「+N」バッジ要素（span）
 */
export function createOverflowBadge(count: number): HTMLElement {
	const badge = document.createElement("span");

	badge.textContent = `+${count}`;
	badge.style.cssText = `
		font-size: 9px;
		font-weight: 600;
		border-radius: 3px;
		padding: 1px 4px;
		color: white;
		background-color: #6b7280;
		display: inline-block;
	`;

	return badge;
}

/**
 * ロールバッジラベルコンテナを生成
 *
 * @param roles - セマンティックロール配列
 * @returns バッジコンテナ要素（div）、または空配列の場合はnull
 *
 * 配置:
 * - position: absolute
 * - bottom: 4px, left: 4px (既存.dads-swatch__badgesと競合しない)
 * - z-index: 10
 * - pointer-events: none
 *
 * レイアウト:
 * - display: flex
 * - flex-direction: column
 * - gap: 2px
 * - align-items: flex-start
 */
export function createRoleBadges(roles: SemanticRole[]): HTMLElement | null {
	// 空配列の場合はnullを返す（DOM追加を防ぐ）
	if (roles.length === 0) {
		return null;
	}

	const container = document.createElement("div");

	container.style.cssText = `
		position: absolute;
		bottom: 4px;
		left: 4px;
		z-index: 10;
		pointer-events: none;
		display: flex;
		flex-direction: column;
		gap: 2px;
		align-items: flex-start;
	`;

	container.dataset.semanticRoleBadges = "true";

	// 最大2つまで表示
	const maxVisible = 2;
	const visibleRoles = roles.slice(0, maxVisible);
	const remainingCount = roles.length - maxVisible;

	for (const role of visibleRoles) {
		const badge = createSingleBadge(role);
		container.appendChild(badge);
	}

	// 3つ以上ある場合は「+N」バッジを追加
	if (remainingCount > 0) {
		const overflowBadge = createOverflowBadge(remainingCount);
		container.appendChild(overflowBadge);
	}

	return container;
}

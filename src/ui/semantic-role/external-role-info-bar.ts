/**
 * ExternalRoleInfoBar - 欄外ロール情報バー関数群
 *
 * シェードビュー欄外にロール情報を表示するための機能を提供
 * - ロールバッジ生成
 * - ロール情報要素生成
 * - 未解決ロールバー生成
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type { RoleCategory, SemanticRole } from "@/core/semantic-role/types";

/**
 * ロール情報アイテム（スウォッチと紐づけ可能なロール）
 */
export interface RoleInfoItem {
	role: SemanticRole;
	/** スケール値（必須） */
	scale: number;
	/** 対応するスウォッチのDOM要素参照（位置揃え・コネクタ用） */
	swatchElement: HTMLElement;
}

/**
 * 未解決ロール情報アイテム（hue-scale特定不可のブランドロール）
 */
export interface UnresolvedRoleItem {
	role: SemanticRole;
	// scale/swatchElementなし（特定不可のため）
}

/**
 * カテゴリ別のバッジ背景色
 */
export const ROLE_CATEGORY_COLORS: Record<RoleCategory, string> = {
	primary: "#1976D2", // Blue 700
	secondary: "#7B1FA2", // Purple 700
	tertiary: "#F57C00", // Orange 700
	accent: "#00796B", // Teal 700
	semantic: "#388E3C", // Green 700
	link: "#0288D1", // Light Blue 700
};

/**
 * ロールバッジ要素を生成
 *
 * @param role - セマンティックロール
 * @param scale - スケール値（任意、未解決ロールではundefined）
 * @returns ロールバッジ要素
 */
export function createRoleBadge(
	role: SemanticRole,
	scale?: number,
): HTMLSpanElement {
	const badge = document.createElement("span");
	badge.className = "dads-role-badge";

	// テキスト内容（scaleあり/なしで分岐）
	const text = scale !== undefined ? `${role.name} (${scale})` : role.name;
	badge.textContent = text;

	// スタイル適用
	badge.style.backgroundColor = ROLE_CATEGORY_COLORS[role.category];
	badge.style.color = "white";

	// データ属性
	badge.dataset.category = role.category;

	return badge;
}

/**
 * 単一ロール情報要素を生成
 *
 * @param item - ロール情報アイテム（scale/swatchElement必須）
 * @returns ロール情報要素
 */
export function createRoleInfoElement(item: RoleInfoItem): HTMLDivElement {
	const element = document.createElement("div");
	element.className = "dads-role-info-item";
	element.dataset.scale = String(item.scale);

	// バッジを内包
	const badge = createRoleBadge(item.role, item.scale);
	element.appendChild(badge);

	return element;
}

/**
 * hue-scale不定ブランドロール専用バーを生成
 *
 * @param unresolvedRoles - hue-scale特定不可のブランドロール配列
 * @returns 未解決ロールバーコンテナ要素（空配列の場合はnull）
 */
export function renderUnresolvedRolesBar(
	unresolvedRoles: UnresolvedRoleItem[],
): HTMLDivElement | null {
	if (unresolvedRoles.length === 0) {
		return null;
	}

	const bar = document.createElement("div");
	bar.className = "dads-unresolved-roles-bar";

	// 先頭ラベル
	const label = document.createElement("span");
	label.className = "dads-unresolved-roles-bar__label";
	label.textContent = "未解決ロール:";
	bar.appendChild(label);

	// 各ロールのバッジ
	for (const item of unresolvedRoles) {
		const badge = createRoleBadge(item.role);
		bar.appendChild(badge);
	}

	return bar;
}

/**
 * スウォッチから情報バーへの視覚的コネクタを生成
 *
 * 呼び出し側（renderRoleInfoBar）で親コンテナに追加後、
 * 実際の位置計算を行う必要があります。
 *
 * @param swatchElement - スウォッチ要素（位置計算用）
 * @param infoElement - 情報要素（位置計算用）
 * @returns コネクタ要素（縦線）
 */
export function renderConnector(
	swatchElement: HTMLElement,
	infoElement: HTMLElement,
): HTMLDivElement {
	const connector = document.createElement("div");
	connector.className = "dads-role-connector";
	connector.dataset.testid = "role-connector";

	// 縦線スタイル（CSSクラスで定義済みだが、確実に適用）
	connector.style.width = "1px";
	connector.style.backgroundColor = "#9e9e9e"; // Gray 500

	// 位置計算（DOM追加後に有効になる）
	// getBoundingClientRectは要素がDOMに追加されている必要があるため、
	// 呼び出し側で再計算するか、requestAnimationFrameを使用
	const updatePosition = () => {
		const swatchRect = swatchElement.getBoundingClientRect();
		const infoRect = infoElement.getBoundingClientRect();
		const parentRect =
			connector.parentElement?.getBoundingClientRect() ?? swatchRect;

		// スウォッチの中央下部からの相対位置
		const left = swatchRect.left - parentRect.left + swatchRect.width / 2;
		const top = swatchRect.bottom - parentRect.top;
		const height = Math.max(0, infoRect.top - swatchRect.bottom);

		connector.style.left = `${left}px`;
		connector.style.top = `${top}px`;
		connector.style.height = `${height}px`;
	};

	// 要素が追加された後に位置を更新
	// requestAnimationFrameで次のフレームまで待機
	if (typeof requestAnimationFrame !== "undefined") {
		requestAnimationFrame(updatePosition);
	}

	return connector;
}

/**
 * 欄外ロール情報バーを生成
 *
 * @param roleItems - ロール情報アイテム配列
 * @returns 情報バーコンテナ要素
 *
 * Requirements: 3.1, 3.4, 3.5
 */
export function renderRoleInfoBar(roleItems: RoleInfoItem[]): HTMLDivElement {
	const bar = document.createElement("div");
	bar.className = "dads-role-info-bar";
	bar.dataset.testid = "role-info-bar";

	// 空の場合は空コンテナを返す
	if (roleItems.length === 0) {
		return bar;
	}

	// 各ロール情報アイテムを水平に配置
	for (const item of roleItems) {
		// ロール情報要素を生成
		const infoElement = createRoleInfoElement(item);
		bar.appendChild(infoElement);

		// コネクタを生成
		const connector = renderConnector(item.swatchElement, infoElement);
		bar.appendChild(connector);
	}

	return bar;
}

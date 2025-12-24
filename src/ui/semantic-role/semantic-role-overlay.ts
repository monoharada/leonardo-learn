/**
 * SemanticRoleOverlay - スウォッチへのオーバーレイ要素統括
 *
 * スウォッチDOM要素にドット・バッジを追加し、
 * アクセシビリティ対応とツールチップ結合を行う
 *
 * Requirements: 4.1, 4.2, 5.2
 */

import type { SemanticRole } from "@/core/semantic-role/types";
import type { DadsColorHue } from "@/core/tokens/types";
import { createRoleBadges } from "./role-badge-label";
import { createRoleDot } from "./role-dot-indicator";

/**
 * スウォッチにセマンティックロールオーバーレイを適用
 *
 * @param swatchElement - 対象のスウォッチDOM要素
 * @param dadsHue - DadsColorHue（DADSシェード用、ブランドスウォッチの場合はundefined）
 * @param scale - スケール値（DADSシェード用、ブランドスウォッチの場合はundefined）
 * @param roles - セマンティックロール配列
 * @param isBrand - ブランドスウォッチかどうか（trueの場合はbrandキーとして処理）
 *
 * Requirements: 4.2, 5.2
 */
export function applyOverlay(
	swatchElement: HTMLElement,
	dadsHue: DadsColorHue | undefined,
	scale: number | undefined,
	roles: SemanticRole[],
	isBrand?: boolean,
): void {
	// ロール配列が空の場合は何も追加しない
	if (roles.length === 0) {
		return;
	}

	// スウォッチをオーバーレイの基準点にする
	swatchElement.style.position = "relative";

	// キーボードフォーカス可能にする
	swatchElement.setAttribute("tabindex", "0");

	// ドットインジケーターを追加（最初のロールのカテゴリを使用）
	const firstRole = roles[0];
	if (firstRole) {
		const dot = createRoleDot(firstRole.category);
		swatchElement.appendChild(dot);
	}

	// バッジコンテナを追加
	const badges = createRoleBadges(roles);
	if (badges) {
		swatchElement.appendChild(badges);
	}

	// ツールチップ更新（既存titleに追記）
	const existingTitle = swatchElement.getAttribute("title") || "";
	const newTitle = mergeTooltipContent(existingTitle, roles);
	swatchElement.setAttribute("title", newTitle);

	// アクセシビリティ用説明要素の生成とaria-describedby設定
	const descId = createAccessibleDescription(dadsHue, scale, roles, isBrand);
	swatchElement.setAttribute("aria-describedby", descId);

	// 説明要素をDOMに追加
	const descElement = createAccessibleDescriptionElement(
		dadsHue,
		scale,
		roles,
		isBrand,
	);
	swatchElement.appendChild(descElement);
}

/**
 * 既存title属性とロール情報を結合
 *
 * @param existingTitle - 既存のtitle属性値
 * @param roles - セマンティックロール配列
 * @returns 結合後のtitle文字列
 *
 * フォーマット:
 * "${existingTitle}\n---\nセマンティックロール:\n${role.fullName}"
 *
 * Requirements: 4.1
 */
export function mergeTooltipContent(
	existingTitle: string,
	roles: SemanticRole[],
): string {
	// ロール配列が空の場合は既存titleをそのまま返す
	if (roles.length === 0) {
		return existingTitle;
	}

	// ロール情報をフォーマット
	const roleLines = roles.map((role) => role.fullName).join("\n");

	return `${existingTitle}\n---\nセマンティックロール:\n${roleLines}`;
}

/**
 * アクセシビリティ用説明要素のIDを生成
 *
 * @param dadsHue - DadsColorHue（DADSシェード用、ブランドスウォッチの場合はundefined）
 * @param scale - スケール値（DADSシェード用、ブランドスウォッチの場合はundefined）
 * @param roles - セマンティックロール配列
 * @param isBrand - ブランドスウォッチかどうか（trueの場合はbrandキーとして処理）
 * @returns 説明用span要素のID
 *
 * ID形式（要件準拠）:
 * - DADSシェード: "swatch-{dadsHue}-{scale}-desc" (例: "swatch-blue-600-desc")
 * - ブランドロール: "swatch-brand-desc" (単一キーで全ブランドロールを集約)
 *
 * Requirements: 4.1
 */
export function createAccessibleDescription(
	dadsHue: DadsColorHue | undefined,
	scale: number | undefined,
	_roles: SemanticRole[],
	isBrand?: boolean,
): string {
	// ブランドスウォッチの場合
	if (isBrand) {
		return "swatch-brand-desc";
	}

	// DADSシェードの場合
	return `swatch-${dadsHue}-${scale}-desc`;
}

/**
 * アクセシビリティ用説明要素を生成
 *
 * @param dadsHue - DadsColorHue（DADSシェード用、ブランドスウォッチの場合はundefined）
 * @param scale - スケール値（DADSシェード用、ブランドスウォッチの場合はundefined）
 * @param roles - セマンティックロール配列
 * @param isBrand - ブランドスウォッチかどうか（trueの場合はbrandキーとして処理）
 * @returns 説明用span要素
 *
 * スクリーンリーダー専用（視覚的に非表示）のspan要素を生成
 *
 * Requirements: 4.1
 */
export function createAccessibleDescriptionElement(
	dadsHue: DadsColorHue | undefined,
	scale: number | undefined,
	roles: SemanticRole[],
	isBrand?: boolean,
): HTMLElement {
	const span = document.createElement("span");

	// ID設定
	span.id = createAccessibleDescription(dadsHue, scale, roles, isBrand);

	// スクリーンリーダー専用スタイル（sr-only相当）
	span.style.cssText = `
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	`;

	// ロール情報をテキストコンテンツとして設定
	const roleTexts = roles.map((role) => role.fullName).join(", ");
	span.textContent = `セマンティックロール: ${roleTexts}`;

	return span;
}

/**
 * SemanticRoleOverlay - スウォッチへのオーバーレイ要素統括
 *
 * スウォッチDOM要素を円形化し、中央にラベルを表示
 * アクセシビリティ対応とツールチップ結合を維持
 *
 * Task 10.1: 旧RoleDotIndicator/RoleBadgeLabelを削除し、
 * CircularSwatchTransformerベースの新UIに切り替え
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2
 */

import type { SemanticRole } from "@/core/semantic-role/types";
import type { DadsColorHue } from "@/core/tokens/types";
import {
	selectPriorityRole,
	transformToCircle,
} from "./circular-swatch-transformer";

/**
 * スウォッチにセマンティックロールオーバーレイを適用
 *
 * Task 10.1: 旧RoleDotIndicator/RoleBadgeLabelを削除し、
 * CircularSwatchTransformerベースの新UIに切り替え
 *
 * @param swatchElement - 対象のスウォッチDOM要素
 * @param dadsHue - DadsColorHue（DADSシェード用、ブランドスウォッチの場合はundefined）
 * @param scale - スケール値（DADSシェード用、ブランドスウォッチの場合はundefined）
 * @param roles - セマンティックロール配列
 * @param isBrand - ブランドスウォッチかどうか（trueの場合はbrandキーとして処理）
 * @param backgroundColor - スウォッチの背景色（円形化時のテキスト色決定用、省略時は円形化をスキップ）
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2
 */
export function applyOverlay(
	swatchElement: HTMLElement,
	dadsHue: DadsColorHue | undefined,
	scale: number | undefined,
	roles: SemanticRole[],
	isBrand?: boolean,
	backgroundColor?: string,
): void {
	// ロール配列が空の場合は何も追加しない（四角形スウォッチを維持）
	if (roles.length === 0) {
		return;
	}

	// スウォッチをオーバーレイの基準点にする
	swatchElement.style.position = "relative";

	// キーボードフォーカス可能にする
	swatchElement.setAttribute("tabindex", "0");

	// 複数ロールから優先ロールを選択
	const priorityRole = selectPriorityRole(roles);

	// 円形化条件: ブランド由来のハーモニーロール（primary/secondary/accent）のみ
	// DADS公式ロール（source="dads"）やhue-scale特定不可のブランドロールは円形化しない
	const isCircularizable =
		backgroundColor !== undefined &&
		priorityRole.source !== "dads" &&
		["primary", "secondary", "accent"].includes(priorityRole.category) &&
		!(isBrand && (dadsHue === undefined || scale === undefined));

	if (isCircularizable) {
		transformToCircle(swatchElement, priorityRole, backgroundColor);
	}

	// ツールチップ更新（既存titleに追記）
	const existingTitle = swatchElement.getAttribute("title") || "";
	const newTitle = mergeTooltipContent(existingTitle, roles);
	swatchElement.setAttribute("title", newTitle);

	// アクセシビリティ用説明要素の生成とaria-describedby設定
	const descId = createAccessibleDescription(dadsHue, scale, roles, isBrand);

	// hue-scale特定不可のブランドロールの場合はaria-describedbyを設定しない
	if (descId !== null) {
		swatchElement.setAttribute("aria-describedby", descId);

		// 既存の説明要素がある場合は削除（ARIA ID重複防止）
		const existingDesc = document.getElementById(descId);
		if (existingDesc) {
			existingDesc.remove();
		}

		// 説明要素をDOMに追加
		const descElement = createAccessibleDescriptionElement(
			dadsHue,
			scale,
			roles,
			isBrand,
		);
		if (descElement) {
			swatchElement.appendChild(descElement);
		}
	}
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
 * @param isBrand - ブランドスウォッチかどうか（trueの場合で hue-scale が undefined なら ARIA ID 不要）
 * @returns 説明用span要素のID、またはnull（hue-scale特定不可のブランドロールの場合）
 *
 * ID形式（新仕様準拠）:
 * - DADSシェード: "swatch-{dadsHue}-{scale}-desc" (例: "swatch-blue-600-desc")
 * - ブランドロール（hue-scale特定可能）: 該当DADSシェードのIDを使用
 * - ブランドロール（hue-scale特定不可）: null（ARIA ID不要、欄外情報のみで表示）
 * - 廃止: "swatch-brand-desc"形式のIDは使用しない
 *
 * Requirements: 4.1
 */
export function createAccessibleDescription(
	dadsHue: DadsColorHue | undefined,
	scale: number | undefined,
	_roles: SemanticRole[],
	isBrand?: boolean,
): string | null {
	// hue-scale特定不可のブランドスウォッチの場合はnull（ARIA ID不要）
	if (isBrand && (dadsHue === undefined || scale === undefined)) {
		return null;
	}

	// DADSシェード、または hue-scale 特定可能なブランドロール
	return `swatch-${dadsHue}-${scale}-desc`;
}

/**
 * アクセシビリティ用説明要素を生成
 *
 * @param dadsHue - DadsColorHue（DADSシェード用、ブランドスウォッチの場合はundefined）
 * @param scale - スケール値（DADSシェード用、ブランドスウォッチの場合はundefined）
 * @param roles - セマンティックロール配列
 * @param isBrand - ブランドスウォッチかどうか（trueの場合で hue-scale が undefined なら要素生成不要）
 * @returns 説明用span要素、またはnull（hue-scale特定不可のブランドロールの場合）
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
): HTMLElement | null {
	// IDを取得
	const descId = createAccessibleDescription(dadsHue, scale, roles, isBrand);

	// hue-scale特定不可のブランドロールの場合は要素生成不要
	if (descId === null) {
		return null;
	}

	const span = document.createElement("span");

	// ID設定
	span.id = descId;

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

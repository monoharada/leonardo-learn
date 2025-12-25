/**
 * CircularSwatchTransformer - 円形スウォッチ変換関数群
 *
 * シェードビュー用の円形スウォッチ表示に必要な変換処理を提供
 * - ロールラベル短縮名生成
 * - 優先ロール選択
 * - テキスト色自動調整
 *
 * Requirements: 2.1, 2.2, 2.3
 */

import { wcagContrast } from "culori";
import type { RoleCategory, SemanticRole } from "@/core/semantic-role/types";

/**
 * ロール優先順位（高→低）
 * Primary > Secondary > Accent > Semantic > Link
 */
export const ROLE_PRIORITY: RoleCategory[] = [
	"primary",
	"secondary",
	"accent",
	"semantic",
	"link",
];

/**
 * カテゴリ別の短縮ラベルマップ
 */
const CATEGORY_SHORT_LABELS: Record<RoleCategory, string> = {
	primary: "P",
	secondary: "S",
	accent: "A",
	semantic: "", // semanticSubTypeで決定
	link: "L",
};

/**
 * semanticサブタイプ別の短縮ラベルマップ
 */
const SEMANTIC_SUBTYPE_LABELS: Record<string, string> = {
	success: "Su",
	error: "E",
	warning: "W",
};

/**
 * ロールから短縮ラベルを取得
 *
 * @param role - セマンティックロール
 * @param index - アクセントの場合のインデックス（0始まり、省略時は番号なし）
 * @returns 短縮ラベル（P/S/A/A1/Su/E/W/L等）
 */
export function getShortLabel(role: SemanticRole, index?: number): string {
	// semanticカテゴリはサブタイプで決定
	if (role.category === "semantic" && role.semanticSubType) {
		return SEMANTIC_SUBTYPE_LABELS[role.semanticSubType] || "";
	}

	// accentカテゴリでindexが指定されている場合は番号付き
	if (role.category === "accent" && index !== undefined) {
		return `A${index + 1}`;
	}

	// それ以外はカテゴリ別ラベル
	return CATEGORY_SHORT_LABELS[role.category] || "";
}

/**
 * 複数ロールから最優先ロールを選択
 *
 * @param roles - セマンティックロール配列
 * @returns 最優先ロール
 * @throws ロール配列が空の場合はエラー
 */
export function selectPriorityRole(roles: SemanticRole[]): SemanticRole {
	if (roles.length === 0) {
		throw new Error("roles array cannot be empty");
	}

	// 長さチェック済みのため、roles[0]は必ず存在する
	if (roles.length === 1) {
		return roles[0] as SemanticRole;
	}

	// 優先順位に基づいてソート
	const sorted = [...roles].sort((a, b) => {
		const priorityA = ROLE_PRIORITY.indexOf(a.category);
		const priorityB = ROLE_PRIORITY.indexOf(b.category);
		return priorityA - priorityB;
	});

	// ソート結果は必ず1つ以上の要素を持つ
	return sorted[0] as SemanticRole;
}

/**
 * 背景色に対する最適なテキスト色を取得
 *
 * WCAG 2.x相対輝度アルゴリズムを使用してコントラスト比を計算し、
 * 黒と白のうちコントラスト比が高い方を返す
 *
 * @param backgroundColor - 背景色（16進数カラーコード）
 * @returns テキスト色（"black" または "white"）
 */
export function getContrastTextColor(
	backgroundColor: string,
): "black" | "white" {
	// 白と黒それぞれとのコントラスト比を計算
	const contrastWithWhite = wcagContrast(backgroundColor, "#ffffff");
	const contrastWithBlack = wcagContrast(backgroundColor, "#000000");

	// コントラスト比が高い方を選択
	return contrastWithBlack >= contrastWithWhite ? "black" : "white";
}

/**
 * スウォッチを円形に変形
 *
 * @param swatchElement - 対象のスウォッチDOM要素
 * @param role - セマンティックロール
 * @param backgroundColor - スウォッチの背景色（テキスト色決定用）
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export function transformToCircle(
	swatchElement: HTMLElement,
	role: SemanticRole,
	backgroundColor: string,
): void {
	// 円形化クラスを追加
	swatchElement.classList.add("dads-swatch--circular");

	// 中央ラベル要素を生成
	const label = document.createElement("span");
	label.classList.add("dads-swatch__role-label");

	// ラベルテキストを設定（role.shortLabelを直接使用、複数アクセントのA1/A2等に対応）
	label.textContent = role.shortLabel;

	// テキスト色を背景色に応じて設定
	const textColor = getContrastTextColor(backgroundColor);
	label.style.color = textColor;

	// ラベルをスウォッチに追加
	swatchElement.appendChild(label);
}

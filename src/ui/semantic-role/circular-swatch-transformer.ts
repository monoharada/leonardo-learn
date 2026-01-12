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
import {
	CATEGORY_SHORT_LABELS,
	type RoleCategory,
	SEMANTIC_SUBTYPE_LABELS,
	type SemanticRole,
} from "@/core/semantic-role/types";

/**
 * ロール優先順位（高→低）
 * Primary > Secondary > Tertiary > Accent > Semantic > Link
 */
export const ROLE_PRIORITY: RoleCategory[] = [
	"primary",
	"secondary",
	"tertiary",
	"accent",
	"semantic",
	"link",
];

/**
 * カテゴリ別のカタカナ名マップ
 * デザインシステム上の特徴として、役割名はカタカナで表示
 */
const CATEGORY_KATAKANA: Record<RoleCategory, string> = {
	primary: "プライマリ",
	secondary: "セカンダリ",
	tertiary: "ターシャリ",
	accent: "アクセント",
	semantic: "", // semanticSubTypeで決定
	link: "リンク",
};

/**
 * semanticサブタイプ別のカタカナ名マップ
 */
const SEMANTIC_SUBTYPE_KATAKANA: Record<string, string> = {
	success: "サクセス",
	error: "エラー",
	warning: "ワーニング",
};

/**
 * ロールから表示用のカタカナラベルを取得
 *
 * @param role - セマンティックロール
 * @returns カタカナラベル（例: "アクセント", "リンク Default"）
 */
export function getKatakanaLabel(role: SemanticRole): string {
	// semanticカテゴリはサブタイプで決定
	if (role.category === "semantic" && role.semanticSubType) {
		return SEMANTIC_SUBTYPE_KATAKANA[role.semanticSubType] || "";
	}

	// カテゴリのカタカナ名を取得
	const katakanaCategory = CATEGORY_KATAKANA[role.category] || "";

	// アクセントカラーはカテゴリ名のみ（色名は不要）
	if (role.category === "accent") {
		return katakanaCategory;
	}

	// リンク等でバリアント名がある場合は追加（例: "リンク Default"）
	// role.name形式: "Link-Default", "Primary" など
	const parts = role.name.split("-");
	if (parts.length > 1) {
		const variant = parts.slice(1).join("-"); // "Default" etc
		return `${katakanaCategory} ${variant}`;
	}

	return katakanaCategory;
}

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
	const first = roles[0];
	if (first === undefined) {
		throw new Error("roles array cannot be empty");
	}

	if (roles.length === 1) {
		return first;
	}

	// 優先順位に基づいてソート
	// 1. カテゴリ優先順位（primary > secondary > accent > semantic > link）
	// 2. 同じカテゴリ内ではbrandをdadsより優先
	const sorted = [...roles].sort((a, b) => {
		const priorityA = ROLE_PRIORITY.indexOf(a.category);
		const priorityB = ROLE_PRIORITY.indexOf(b.category);
		if (priorityA !== priorityB) {
			return priorityA - priorityB;
		}
		// 同じカテゴリ内: brandを優先（source === "brand"なら先に）
		const sourceA = a.source === "brand" ? 0 : 1;
		const sourceB = b.source === "brand" ? 0 : 1;
		return sourceA - sourceB;
	});

	// sorted[0]は入力が非空かつソートのため必ず存在
	return sorted[0] ?? first;
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

	// 既存のラベルを削除（再適用時の重複防止）
	const existingLabel = swatchElement.querySelector(".dads-swatch__role-label");
	if (existingLabel) {
		existingLabel.remove();
	}

	// テキスト色を背景色に応じて設定
	const textColor = getContrastTextColor(backgroundColor);

	// カタカナロールラベル要素を生成（大きい1文字ラベルの代わり）
	const label = document.createElement("span");
	label.classList.add("dads-swatch__role-label");
	label.textContent = getKatakanaLabel(role);
	label.style.color = textColor;

	// ロールラベルを最初の子要素として挿入（scale/hexの前に配置）
	const firstChild = swatchElement.firstChild;
	if (firstChild) {
		swatchElement.insertBefore(label, firstChild);
	} else {
		swatchElement.appendChild(label);
	}

	// scale/hexラベルのテキスト色も更新
	const scaleLabel = swatchElement.querySelector(
		".dads-swatch__scale",
	) as HTMLElement | null;
	const hexLabel = swatchElement.querySelector(
		".dads-swatch__hex",
	) as HTMLElement | null;

	if (scaleLabel) scaleLabel.style.color = textColor;
	if (hexLabel) hexLabel.style.color = textColor;
}

/**
 * 円形スウォッチをラッパーで囲み、下にロール名を追加
 *
 * @param swatchElement - 対象のスウォッチDOM要素
 * @param role - セマンティックロール
 * @returns ラッパー要素
 */
export function wrapCircularSwatchWithRoleName(
	swatchElement: HTMLElement,
	role: SemanticRole,
): HTMLElement {
	const wrapper = document.createElement("div");
	wrapper.className = "dads-swatch--circular-wrapper";

	// スウォッチの位置にラッパーを挿入
	const parent = swatchElement.parentNode;
	if (parent) {
		parent.insertBefore(wrapper, swatchElement);
	}

	// スウォッチをラッパーに移動
	wrapper.appendChild(swatchElement);

	// ロール名ラベルを追加
	const roleNameLabel = document.createElement("span");
	roleNameLabel.className = "dads-swatch__role-name";
	roleNameLabel.textContent = role.name;
	roleNameLabel.title = role.fullName;
	wrapper.appendChild(roleNameLabel);

	return wrapper;
}

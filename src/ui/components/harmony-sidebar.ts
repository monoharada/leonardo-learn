/**
 * HarmonySidebar コンポーネント
 *
 * 全8種類のハーモニータイプをサイドバーに表示し、
 * ユーザーが選択できるようにするコンポーネント
 *
 * @module @/ui/components/harmony-sidebar
 */

import type { HarmonyFilterType } from "@/core/accent/harmony-filter-calculator";
import { ALL_HARMONY_TYPES } from "@/ui/demo/harmony-state-manager";

/**
 * ハーモニータイプの日本語ラベル
 */
export const HARMONY_TYPE_LABELS: Record<HarmonyFilterType, string> = {
	all: "すべて",
	complementary: "補色",
	triadic: "トライアド",
	analogous: "類似色",
	"split-complementary": "分裂補色",
	monochromatic: "モノクロマティック",
	shades: "シェード",
	compound: "コンパウンド",
	square: "スクエア",
};

/**
 * HarmonySidebar コンポーネントのプロパティ
 */
export interface HarmonySidebarProps {
	/** 現在選択中のハーモニータイプ */
	selectedType: HarmonyFilterType;
	/** 各ハーモニーのプレビュー色 */
	previews: Map<HarmonyFilterType, string[]>;
	/** ハーモニー選択時のコールバック */
	onSelect: (type: HarmonyFilterType) => void;
}

/**
 * ミニスウォッチ要素を作成する
 *
 * @param colors - 表示する色の配列
 * @returns スウォッチコンテナ要素
 */
function createSwatches(colors: string[]): HTMLElement {
	const container = document.createElement("div");
	container.className = "harmony-sidebar__swatches";
	container.style.display = "flex";
	container.style.gap = "2px";
	container.style.marginTop = "4px";

	for (const color of colors) {
		const swatch = document.createElement("div");
		swatch.className = "harmony-sidebar__swatch";
		swatch.style.width = "16px";
		swatch.style.height = "16px";
		swatch.style.borderRadius = "2px";
		swatch.style.backgroundColor = color;
		container.appendChild(swatch);
	}

	return container;
}

/**
 * ハーモニーカード要素を作成する
 *
 * @param type - ハーモニータイプ
 * @param isSelected - 選択中かどうか
 * @param previewColors - プレビュー色の配列
 * @param onSelect - 選択時のコールバック
 * @returns カード要素
 */
function createHarmonyCard(
	type: HarmonyFilterType,
	isSelected: boolean,
	previewColors: string[],
	onSelect: (type: HarmonyFilterType) => void,
): HTMLElement {
	const card = document.createElement("div");
	card.className = "harmony-sidebar__card";
	if (isSelected) {
		card.classList.add("harmony-sidebar__card--selected");
	}

	// データ属性
	card.setAttribute("data-harmony-type", type);

	// アクセシビリティ属性
	card.setAttribute("role", "option");
	card.setAttribute("aria-selected", isSelected ? "true" : "false");
	card.setAttribute("aria-label", `${HARMONY_TYPE_LABELS[type]}ハーモニー`);
	card.setAttribute("tabindex", "0");

	// スタイル
	card.style.cursor = "pointer";
	card.style.padding = "8px 12px";
	card.style.borderRadius = "4px";
	card.style.transition = "background-color 0.15s ease";

	// ハーモニー名ラベル
	const nameLabel = document.createElement("div");
	nameLabel.className = "harmony-sidebar__card-name";
	nameLabel.textContent = HARMONY_TYPE_LABELS[type];
	nameLabel.style.fontSize = "12px";
	nameLabel.style.fontWeight = isSelected ? "600" : "400";
	card.appendChild(nameLabel);

	// ミニスウォッチ
	const swatches = createSwatches(previewColors);
	card.appendChild(swatches);

	// クリックイベント
	card.addEventListener("click", () => {
		onSelect(type);
	});

	// キーボードイベント
	card.addEventListener("keydown", (event: Event) => {
		const keyEvent = event as KeyboardEvent;
		if (keyEvent.key === "Enter" || keyEvent.key === " ") {
			onSelect(type);
		}
	});

	return card;
}

/**
 * HarmonySidebar コンポーネントを作成する
 *
 * @param props - コンポーネントのプロパティ
 * @returns サイドバー要素
 */
export function createHarmonySidebar(props: HarmonySidebarProps): HTMLElement {
	const { selectedType, previews, onSelect } = props;

	const container = document.createElement("div");
	container.className = "harmony-sidebar";

	// アクセシビリティ属性
	container.setAttribute("role", "listbox");
	container.setAttribute("aria-label", "ハーモニータイプ選択");

	// スタイル
	container.style.display = "flex";
	container.style.flexDirection = "column";
	container.style.gap = "4px";
	container.style.padding = "8px";
	container.style.overflowY = "auto";

	// 全8種類のハーモニーカードを作成
	for (const type of ALL_HARMONY_TYPES) {
		const isSelected = type === selectedType;
		const previewColors = previews.get(type) ?? [];
		const card = createHarmonyCard(type, isSelected, previewColors, onSelect);
		container.appendChild(card);
	}

	return container;
}

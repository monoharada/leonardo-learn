/**
 * サイドバーモジュール
 *
 * パレット一覧のレンダリングとパレット選択機能を担当する。
 *
 * @module @/ui/demo/sidebar
 * Requirements: 7.1, 7.3
 */

import { parseKeyColor, state } from "./state";

/**
 * ボタンのアクティブ状態を設定する（モジュール内部用）
 *
 * 依存方向ルールを守るため、style-constantsへの依存を避ける最小実装。
 * data-active属性とaria-pressed属性を更新する。
 *
 * @param btn 対象のボタン要素
 * @param isActive アクティブ状態
 */
function setButtonActive(btn: HTMLElement, isActive: boolean): void {
	btn.dataset.active = String(isActive);
	btn.setAttribute("aria-pressed", String(isActive));
}

/**
 * サイドバーをレンダリングする
 *
 * state.palettesを参照してパレット一覧を表示し、
 * クリック時にonPaletteSelectコールバックを呼び出す。
 *
 * @param container パレット一覧を表示するコンテナ要素
 * @param onPaletteSelect パレット選択時のコールバック
 */
export function renderSidebar(
	container: HTMLElement,
	onPaletteSelect: (id: string) => void,
): void {
	container.innerHTML = "";

	for (const palette of state.palettes) {
		const containerDiv = document.createElement("div");
		containerDiv.className = "dads-palette-item";

		// Main Palette Entry (Primary)
		const btn = document.createElement("div");
		btn.textContent = palette.name;
		btn.className = "dads-palette-item__button";

		// Show color dot
		const dot = document.createElement("span");
		dot.className = "dads-palette-item__dot";

		// Parse first key color for dot
		const keyColorInput = palette.keyColors[0];
		if (keyColorInput) {
			const { color: hex } = parseKeyColor(keyColorInput);
			dot.style.backgroundColor = hex;
		}
		btn.prepend(dot);

		// Set active state via data attribute
		setButtonActive(btn, palette.id === state.activeId);

		btn.onclick = () => {
			onPaletteSelect(palette.id);
		};

		containerDiv.appendChild(btn);
		container.appendChild(containerDiv);
	}
}

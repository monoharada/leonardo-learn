/**
 * エディタモジュール
 *
 * エディタUI（ハーモニー選択ボタン等）の更新を担当する。
 *
 * @module @/ui/demo/editor
 * Requirements: 7.2, 7.3
 */

import { getActivePalette, state } from "./state";
import type { HarmonyType } from "./types";

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
 * エディタUIを更新する
 *
 * - パレット名をcurrent-palette-nameに設定
 * - ハーモニー選択ボタンの状態を更新
 * - ボタンクリック時にonHarmonyChangeを呼び出す
 *
 * 設計仕様:
 * - palette-generatorへの依存はコールバック経由で解決
 * - Feature→Feature依存回避のため、直接importは禁止
 *
 * @param onHarmonyChange ハーモニー変更時のコールバック
 */
export function updateEditor(onHarmonyChange: () => void): void {
	const palette = getActivePalette();
	if (!palette) return;

	// パレット名をcurrent-palette-nameに設定
	const currentNameEl = document.getElementById("current-palette-name");
	if (currentNameEl) {
		currentNameEl.textContent = `${palette.name} Settings`;
	}

	// Update Harmony Selector (Buttons) - only buttons with data-value attribute
	const harmonyButtons = document.querySelectorAll(
		"#harmony-buttons button[data-value]",
	);
	const harmonyInput = document.getElementById("harmony") as HTMLInputElement;

	if (harmonyButtons.length > 0 && harmonyInput) {
		// Set initial active state based on palette
		harmonyInput.value = palette.harmony;

		for (const btn of harmonyButtons) {
			const buttonEl = btn as HTMLElement;
			const val = buttonEl.dataset.value;
			const isActive = val === palette.harmony;

			setButtonActive(buttonEl, isActive);

			if (isActive) {
				buttonEl.classList.add("active");
			} else {
				buttonEl.classList.remove("active");
			}

			buttonEl.onclick = () => {
				const newVal = buttonEl.dataset.value as HarmonyType;
				palette.harmony = newVal;
				harmonyInput.value = newVal;
				state.activeHarmonyIndex = 0;

				// Trigger generation through callback
				onHarmonyChange();
			};
		}
	}
}

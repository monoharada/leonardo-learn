import { Color } from "@/core/color";
import { parseKeyColor, state } from "../state";
import { resolveKeyBackgroundColor } from "../utils/key-background";
import type { AccessibilityViewState } from "./accessibility-view.core";
import { renderSortingValidationSection } from "./accessibility-view.sorting-validation";
import type { AccessibilityViewHelpers } from "./accessibility-view.types";

// ============================================================================
// State Management
// ============================================================================

/**
 * ビュー状態を作成する
 *
 * @returns 初期状態のAccessibilityViewState
 */
function createViewState(): AccessibilityViewState {
	return {
		currentSortType: "hue",
	};
}

/**
 * 空状態のメッセージを表示する
 *
 * @param container - レンダリング先のコンテナ要素
 * @param viewName - ビュー名
 */
function renderEmptyState(container: HTMLElement, viewName: string): void {
	const empty = document.createElement("div");
	empty.className = "dads-empty-state";
	empty.innerHTML = `
		<p>${viewName}が生成されていません</p>
		<p>スタジオでパレットを生成してください。</p>
	`;
	container.innerHTML = "";
	container.appendChild(empty);
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * アクセシビリティビューをレンダリングする
 *
 * CVDシミュレーションによる色の識別性確認とCVD混同リスク検出を表示する。
 * キーカラー＋セマンティックカラーのみを対象とする。
 *
 * @param container - レンダリング先のコンテナ要素
 * @param helpers - ヘルパー関数（applySimulationはコールバック経由で渡す）
 */
export function renderAccessibilityView(
	container: HTMLElement,
	helpers: AccessibilityViewHelpers,
): void {
	container.innerHTML = "";
	container.classList.add("dads-section");

	// Requirements 5.2, 5.5: 画面間での背景色同期
	container.style.backgroundColor = state.lightBackgroundColor;

	if (state.palettes.length === 0) {
		renderEmptyState(container, "アクセシビリティ");
		return;
	}

	// Create view state (replaces module-level mutable state)
	const viewState = createViewState();

	// Collect key colors
	const keyColorsMap: Record<string, Color> = {};
	for (const p of state.palettes) {
		const keyColorInput = p.keyColors[0];
		if (keyColorInput) {
			const { color: hex } = parseKeyColor(keyColorInput);
			keyColorsMap[p.name] = new Color(hex);
		}
	}

	// キーサーフェスカラーを追加（CVDシミュレーション対象に含める）
	const primaryPalette = state.palettes.find(
		(p) => !p.derivedFrom && p.keyColors[0],
	);
	if (primaryPalette) {
		const { color: primaryHex } = parseKeyColor(
			primaryPalette.keyColors[0] || "",
		);
		const keySurface = resolveKeyBackgroundColor({
			primaryHex,
			backgroundHex: state.lightBackgroundColor || "#ffffff",
			textHex: state.darkBackgroundColor || "#000000",
			preset: state.activePreset,
		});
		keyColorsMap["key-surface"] = new Color(keySurface.hex);
	}

	// helpers.applySimulation is retained for future dynamic simulation switching
	void helpers;

	// CVD Simulation Section
	renderSortingValidationSection(container, keyColorsMap, viewState);
}

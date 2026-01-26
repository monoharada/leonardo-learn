import { simulateCVD } from "@/accessibility/cvd-simulator";
import type { Color } from "@/core/color";
import { state } from "../state";
import type { CVDType } from "../types";

/** Link icon SVG markup for share button */
export const LINK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;

/** Create a swatch wrapper with optional zone-end styling */
export function createSwatchWrapper(isZoneEnd: boolean): HTMLDivElement {
	const wrapper = document.createElement("div");
	wrapper.className = "studio-toolbar-swatch-wrapper";
	if (isZoneEnd) {
		wrapper.classList.add("studio-toolbar-swatch-wrapper--zone-end");
	}
	return wrapper;
}

/** Create a swatch label element */
export function createSwatchLabel(text: string): HTMLSpanElement {
	const label = document.createElement("span");
	label.className = "studio-toolbar-swatch__label";
	label.textContent = text;
	return label;
}

/**
 * 空状態のメッセージを表示する
 */
export function renderEmptyState(
	container: HTMLElement,
	viewName: string,
): void {
	const empty = document.createElement("div");
	empty.className = "dads-empty-state";
	empty.innerHTML = `
		<p>${viewName}が生成されていません</p>
		<p>スタジオでパレットを生成してください。</p>
	`;
	container.innerHTML = "";
	container.appendChild(empty);
}

/**
 * CVDシミュレーションを適用する
 */
export function applySimulation(color: Color): Color {
	if (state.cvdSimulation === "normal") {
		return color;
	}
	return simulateCVD(color, state.cvdSimulation as CVDType);
}

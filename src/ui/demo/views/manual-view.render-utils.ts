import { simulateCVD } from "@/accessibility/cvd-simulator";
import type { Color } from "@/core/color";
import { state } from "../state";
import type { CVDType } from "../types";

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

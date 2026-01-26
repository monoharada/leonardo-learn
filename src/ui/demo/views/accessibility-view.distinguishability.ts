import {
	getAllCVDTypes,
	getCVDTypeName,
	simulateCVD,
} from "@/accessibility/cvd-simulator";
import { detectColorConflicts } from "@/ui/accessibility/cvd-detection";
import { state } from "../state";
import type { Color as ColorType } from "../types";
import { createColorSwatch, renderConflictOverlay } from "../utils/dom-helpers";

/**
 * 色の入力を統一形式に正規化する
 *
 * @param colorsInput - 色のマップまたは配列
 * @returns [name, color]のタプル配列
 */
function normalizeColorInput(
	colorsInput: Record<string, ColorType> | { name: string; color: ColorType }[],
): [string, ColorType][] {
	if (Array.isArray(colorsInput)) {
		return colorsInput.map((item) => [item.name, item.color]);
	}
	return Object.entries(colorsInput);
}

// ============================================================================
// Distinguishability Analysis
// ============================================================================

/**
 * 識別性分析をレンダリングする
 *
 * 色のリストをCVDシミュレーションで表示し、識別困難な色ペアに警告を表示する。
 * シェードの場合は隣接ペアのみ、キーカラーの場合は全ペアを検証する。
 *
 * @param container - レンダリング先のコンテナ要素
 * @param colorsInput - 色のマップまたは配列
 * @param options - オプション設定
 */
export function renderDistinguishabilityAnalysis(
	container: HTMLElement,
	colorsInput: Record<string, ColorType> | { name: string; color: ColorType }[],
	options: { adjacentOnly?: boolean } = {},
): void {
	const { adjacentOnly = true } = options;
	const cvdTypes = getAllCVDTypes();
	const colorEntries = normalizeColorInput(colorsInput);

	// Normal View
	const normalRow = document.createElement("div");
	normalRow.className = "dads-cvd-row";

	const normalLabel = document.createElement("div");
	normalLabel.textContent = "一般色覚 (Normal Vision)";
	normalLabel.className = "dads-cvd-row__label";
	normalRow.appendChild(normalLabel);

	const normalStrip = document.createElement("div");
	normalStrip.className = "dads-cvd-strip";

	for (const [name, color] of colorEntries) {
		normalStrip.appendChild(createColorSwatch(color, name));
	}
	normalRow.appendChild(normalStrip);
	container.appendChild(normalRow);

	// CVD Simulations
	const simContainer = document.createElement("div");
	simContainer.className = "dads-cvd-simulations";

	for (const type of cvdTypes) {
		const row = document.createElement("div");

		const label = document.createElement("div");
		label.textContent = getCVDTypeName(type);
		label.className = "dads-cvd-row__label";
		row.appendChild(label);

		const stripContainer = document.createElement("div");
		stripContainer.className = "dads-cvd-strip-container";

		const strip = document.createElement("div");
		strip.className = "dads-cvd-strip";

		const simulatedColors = colorEntries.map(([name, color]) => ({
			name,
			color: simulateCVD(color, type),
		}));

		const conflicts = detectColorConflicts(
			simulatedColors,
			adjacentOnly,
			state.cvdConfusionThreshold,
		);

		for (const item of simulatedColors) {
			const swatch = document.createElement("div");
			swatch.className = "dads-cvd-strip__swatch";
			swatch.style.backgroundColor = item.color.toCss();
			swatch.title = `${item.name} (Simulated)`;
			strip.appendChild(swatch);
		}
		stripContainer.appendChild(strip);

		if (conflicts.length > 0) {
			const overlay = renderConflictOverlay(
				conflicts,
				simulatedColors.length,
				true,
			);
			stripContainer.appendChild(overlay);
		}

		row.appendChild(stripContainer);
		simContainer.appendChild(row);
	}
	container.appendChild(simContainer);
}

/**
 * 隣接シェード分析をレンダリングする
 *
 * グラデーションのシェードリストで、識別困難なステップを検出して表示する。
 *
 * @param container - レンダリング先のコンテナ要素
 * @param colorsInput - 色のマップまたは配列
 */
export function renderAdjacentShadesAnalysis(
	container: HTMLElement,
	colorsInput: Record<string, ColorType> | { name: string; color: ColorType }[],
): void {
	renderDistinguishabilityAnalysis(container, colorsInput, {
		adjacentOnly: true,
	});
}

/**
 * アクセシビリティビューモジュール
 *
 * アクセシビリティ分析画面のレンダリングを担当する。
 * CVDシミュレーションによる色の識別性確認とCVD混同リスク検出を表示する。
 * キーカラー＋セマンティックカラーのみを対象とし、CVDシミュレーションと識別性検証を提供する。
 *
 * @module @/ui/demo/views/accessibility-view
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.2, 5.5
 */

import {
	type CVDType,
	getAllCVDTypes,
	getCVDTypeName,
	simulateCVD,
} from "@/accessibility/cvd-simulator";
import { DISTINGUISHABILITY_THRESHOLD } from "@/accessibility/distinguishability";
import { Color } from "@/core/color";
import {
	getAllSortTypes,
	getSortTypeName,
	type NamedColor,
	type SortType,
	sortColorsWithValidation,
} from "@/ui/accessibility/color-sorting";
import {
	type CvdConfusionPair,
	detectColorConflicts,
	detectCvdConfusionPairs,
	getCvdTypeLabelJa,
	groupPairsByCvdType,
} from "@/ui/accessibility/cvd-detection";
import { parseKeyColor, state } from "../state";
import type { Color as ColorType } from "../types";
import {
	createColorSwatch,
	createConflictIndicator,
	createPairSwatch,
	renderConflictOverlay,
} from "../utils/dom-helpers";

// ============================================================================
// Types
// ============================================================================

/**
 * 境界検証の対象タイプ
 */
type BoundaryValidationType = CVDType | "normal";

/**
 * 境界検証の集計結果
 */
interface BoundaryValidationSummary {
	totalIssues: number;
}

/**
 * アクセシビリティビューの状態
 *
 * モジュールレベルの可変状態を避けるため、状態をオブジェクトとして管理する。
 */
interface AccessibilityViewState {
	currentSortType: SortType;
}

/**
 * CVD混同リスク一覧 → 該当箇所フォーカス用のパラメータ
 */
interface CvdConfusionFocusTarget {
	cvdType: CVDType;
	colorName1: string;
	colorName2: string;
}

/**
 * アクセシビリティビューのヘルパー関数
 */
export interface AccessibilityViewHelpers {
	/** CVDシミュレーションを適用する関数（純粋関数として渡す） */
	applySimulation: (color: ColorType) => ColorType;
}

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

// ============================================================================
// Rendering Helpers
// ============================================================================

const CVD_COMPARISON_FOCUS_CLASSES = [
	"dads-a11y-focus-target",
	"dads-a11y-focus-swatch",
	"dads-a11y-focus-boundary-badge",
	"dads-a11y-focus-boundary-indicator",
] as const;

function clearCvdComparisonFocus(boundaryContainer: HTMLElement): void {
	for (const className of CVD_COMPARISON_FOCUS_CLASSES) {
		boundaryContainer
			.querySelectorAll<HTMLElement>(`.${className}`)
			.forEach((el) => {
				el.classList.remove(className);
			});
	}
}

function simulateNamedColorsForType(
	colors: NamedColor[],
	cvdType: CVDType,
): NamedColor[] {
	return colors.map((item) => ({
		name: item.name,
		color: simulateCVD(item.color, cvdType),
	}));
}

function chooseBestSortTypeForAdjacency(
	colors: NamedColor[],
	target: CvdConfusionFocusTarget,
): SortType {
	const priorityOrder: SortType[] = ["deltaE", "hue", "lightness"];
	const sortTypes = getAllSortTypes();
	const prioritizedSortTypes: SortType[] = priorityOrder.filter((t) =>
		sortTypes.includes(t),
	);
	const simulatedColors = simulateNamedColorsForType(colors, target.cvdType);

	let best: { sortType: SortType; distance: number } | null = null;
	for (const sortType of prioritizedSortTypes) {
		const result = sortColorsWithValidation(simulatedColors, sortType);
		const names = result.sortedColors.map((c) => c.name);
		const index1 = names.indexOf(target.colorName1);
		const index2 = names.indexOf(target.colorName2);
		if (index1 < 0 || index2 < 0) continue;

		const distance = Math.abs(index1 - index2);
		if (distance === 1) return sortType;

		if (!best || distance < best.distance) {
			best = { sortType, distance };
		}
	}

	return best?.sortType ?? sortTypes[0] ?? "hue";
}

function focusCvdComparisonIssue(
	boundaryContainer: HTMLElement,
	colors: NamedColor[],
	sortType: SortType,
	target: CvdConfusionFocusTarget,
): void {
	clearCvdComparisonFocus(boundaryContainer);

	const row = boundaryContainer.querySelector<HTMLElement>(
		`.dads-a11y-cvd-boundary-row[data-cvd-type="${target.cvdType}"]`,
	);
	if (!row) return;

	row.classList.add("dads-a11y-focus-target");
	row.scrollIntoView({ behavior: "smooth", block: "center" });

	const simulatedColors = simulateNamedColorsForType(colors, target.cvdType);
	const sortResult = sortColorsWithValidation(simulatedColors, sortType);
	const names = sortResult.sortedColors.map((c) => c.name);
	const index1 = names.indexOf(target.colorName1);
	const index2 = names.indexOf(target.colorName2);

	const swatches = Array.from(
		row.querySelectorAll<HTMLElement>(".dads-cvd-strip__swatch"),
	);

	const targetSwatches = swatches.filter((swatch) => {
		const name = swatch.getAttribute("data-color-name");
		return name === target.colorName1 || name === target.colorName2;
	});

	for (const swatch of targetSwatches) {
		swatch.classList.add("dads-a11y-focus-swatch");
	}

	if (index1 >= 0 && index2 >= 0 && Math.abs(index1 - index2) === 1) {
		const boundaryIndex = Math.min(index1, index2);

		const badge = row.querySelector<HTMLElement>(
			`.dads-a11y-deltaE-badge[data-boundary-index="${boundaryIndex}"]`,
		);
		badge?.classList.add("dads-a11y-focus-boundary-badge");

		const icon = row.querySelector<HTMLElement>(
			`.dads-cvd-conflict-icon[data-boundary-index="${boundaryIndex}"]`,
		);
		icon?.classList.add("dads-a11y-focus-boundary-indicator");

		const line = row.querySelector<HTMLElement>(
			`.dads-cvd-conflict-line[data-boundary-index="${boundaryIndex}"]`,
		);
		line?.classList.add("dads-a11y-focus-boundary-indicator");
	}

	const focusTarget = targetSwatches[0] ?? row;
	focusTarget.focus({ preventScroll: true });
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
		<p>ハーモニービューでスタイルを選択してパレットを生成してください。</p>
	`;
	container.innerHTML = "";
	container.appendChild(empty);
}

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

/**
 * CVD混同リスク詳細をレンダリングする
 *
 * ハイブリッド形式で表示:
 * - 誰に問題か（P型/D型）を明示
 * - どの色ペアかを具体的に表示
 * - 程度をΔE値で補足
 *
 * @param container - レンダリング先のコンテナ要素
 * @param colors - 色リスト
 * @param cvdConfusionPairs - CVD混同リスクのあるペア
 */
function renderCvdConfusionDetails(
	container: HTMLElement,
	colors: NamedColor[],
	cvdConfusionPairs: CvdConfusionPair[],
	onPairActivate?: (target: CvdConfusionFocusTarget) => void,
): void {
	if (cvdConfusionPairs.length === 0) {
		return;
	}

	const groupedByType = groupPairsByCvdType(cvdConfusionPairs);

	const detailsSection = document.createElement("div");
	detailsSection.className = "dads-a11y-cvd-confusion-details";

	for (const [cvdType, pairs] of groupedByType) {
		const typeSection = document.createElement("div");
		typeSection.className = "dads-a11y-cvd-type-section";

		const header = document.createElement("div");
		header.className = "dads-a11y-cvd-type-header";
		header.innerHTML = `<span class="dads-a11y-cvd-type-icon">⚠</span> <strong>${getCvdTypeLabelJa(cvdType)}</strong>で混同リスク: ${pairs.length}ペア`;
		typeSection.appendChild(header);

		const pairList = document.createElement("ul");
		pairList.className = "dads-a11y-cvd-pair-list";

		for (const pair of pairs) {
			const color1 = colors[pair.index1];
			const color2 = colors[pair.index2];
			if (!color1 || !color2) continue;

			const li = document.createElement("li");
			li.className = "dads-a11y-cvd-pair-item";

			const button = document.createElement("button");
			button.type = "button";
			button.className = "dads-a11y-cvd-pair-button";
			button.setAttribute("data-cvd-type", cvdType);
			button.setAttribute("data-color-name-1", color1.name);
			button.setAttribute("data-color-name-2", color2.name);

			button.addEventListener("click", () => {
				onPairActivate?.({
					cvdType,
					colorName1: color1.name,
					colorName2: color2.name,
				});
			});

			const swatch1 = createPairSwatch(color1.color);
			const swatch2 = createPairSwatch(color2.color);

			const text = document.createElement("span");
			text.className = "dads-a11y-cvd-pair-text";
			text.innerHTML = `${color1.name} <span class="dads-a11y-cvd-pair-arrow">↔</span> ${color2.name}`;

			const deltaE = document.createElement("span");
			deltaE.className = "dads-a11y-cvd-pair-deltaE";
			deltaE.textContent = `（ΔE = ${pair.cvdDeltaE.toFixed(2)}）`;

			button.appendChild(swatch1);
			button.appendChild(text);
			button.appendChild(swatch2);
			button.appendChild(deltaE);
			li.appendChild(button);
			pairList.appendChild(li);
		}

		typeSection.appendChild(pairList);
		detailsSection.appendChild(typeSection);
	}

	container.appendChild(detailsSection);
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
			DISTINGUISHABILITY_THRESHOLD,
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

// ============================================================================
// Boundary Validation
// ============================================================================

/**
 * ソートタブUIをレンダリングする
 *
 * @param container - レンダリング先のコンテナ要素
 * @param viewState - ビュー状態
 * @param onSortChange - ソートタイプ変更時のコールバック
 */
function renderSortTabs(
	container: HTMLElement,
	viewState: AccessibilityViewState,
	onSortChange: (sortType: SortType) => void,
): void {
	const tabsContainer = document.createElement("div");
	tabsContainer.className = "dads-a11y-sort-tabs dads-segmented-control";
	tabsContainer.setAttribute("role", "tablist");
	tabsContainer.setAttribute("aria-label", "並べ替え方法を選択");

	function setActiveTab(
		activeTab: HTMLButtonElement,
		sortType: SortType,
	): void {
		viewState.currentSortType = sortType;
		onSortChange(sortType);

		tabsContainer
			.querySelectorAll<HTMLButtonElement>(".dads-a11y-sort-tab")
			.forEach((t) => {
				t.setAttribute("aria-selected", "false");
				t.tabIndex = -1;
			});

		activeTab.setAttribute("aria-selected", "true");
		activeTab.tabIndex = 0;
	}

	const sortTypes = getAllSortTypes();
	for (const sortType of sortTypes) {
		const tab = document.createElement("button");
		tab.className = "dads-a11y-sort-tab dads-radio-label";
		tab.textContent = getSortTypeName(sortType);
		tab.setAttribute("role", "tab");
		tab.setAttribute("data-sort-type", sortType);
		tab.setAttribute(
			"aria-selected",
			sortType === viewState.currentSortType ? "true" : "false",
		);

		if (sortType === viewState.currentSortType) {
			tab.tabIndex = 0;
		} else {
			tab.tabIndex = -1;
		}

		tab.addEventListener("click", () => {
			setActiveTab(tab, sortType);
		});

		tabsContainer.appendChild(tab);
	}

	// キーボード操作（tablist）
	tabsContainer.addEventListener("keydown", (e) => {
		const target = e.target as HTMLElement | null;
		if (!target || target.getAttribute("role") !== "tab") return;

		const tabs = Array.from(
			tabsContainer.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
		);
		const currentIndex = tabs.indexOf(target as HTMLButtonElement);
		if (currentIndex < 0) return;

		let nextIndex = currentIndex;
		switch (e.key) {
			case "ArrowLeft":
				nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
				break;
			case "ArrowRight":
				nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
				break;
			case "Home":
				nextIndex = 0;
				break;
			case "End":
				nextIndex = tabs.length - 1;
				break;
			default:
				return;
		}

		const nextTab = tabs[nextIndex];
		if (!nextTab) return;

		e.preventDefault();
		nextTab.focus();

		const nextSortType = nextTab.getAttribute("data-sort-type") as SortType;
		setActiveTab(nextTab, nextSortType);
	});

	container.appendChild(tabsContainer);
}

/**
 * 単一CVDタイプの境界検証行をレンダリングする
 *
 * @param colors - 元の色リスト（シミュレーション前）
 * @param sortType - ソートタイプ
 * @param cvdType - CVDタイプ（"normal"の場合は通常色覚）
 * @returns 行のHTML要素
 */
function renderCvdBoundaryRow(
	colors: NamedColor[],
	sortType: SortType,
	cvdType: CVDType | "normal",
): HTMLElement {
	const simulatedColors: NamedColor[] =
		cvdType === "normal"
			? colors
			: colors.map((item) => ({
					name: item.name,
					color: simulateCVD(item.color, cvdType),
				}));

	const result = sortColorsWithValidation(simulatedColors, sortType);

	const row = document.createElement("div");
	row.className = "dads-a11y-cvd-boundary-row";
	row.setAttribute("data-cvd-type", cvdType);
	row.tabIndex = -1;

	const label = document.createElement("div");
	label.className = "dads-cvd-row__label";
	label.textContent =
		cvdType === "normal" ? "一般色覚 (Normal)" : getCVDTypeName(cvdType);
	row.appendChild(label);

	const contentContainer = document.createElement("div");
	contentContainer.className = "dads-a11y-cvd-boundary-content";

	const stripContainer = document.createElement("div");
	stripContainer.className = "dads-cvd-strip-container";

	const strip = document.createElement("div");
	strip.className = "dads-cvd-strip";

	for (const item of result.sortedColors) {
		strip.appendChild(createColorSwatch(item.color, item.name));
	}
	stripContainer.appendChild(strip);

	// Error boundary overlay
	const overlay = document.createElement("div");
	overlay.className = "dads-cvd-overlay";

	const segmentWidth = 100 / result.sortedColors.length;

	for (const validation of result.boundaryValidations) {
		if (!validation.isDistinguishable) {
			const markerPos = (validation.index + 1) * segmentWidth;
			const { line, icon } = createConflictIndicator(markerPos, false);
			line.setAttribute("data-boundary-index", String(validation.index));
			line.setAttribute("data-left-name", validation.leftName);
			line.setAttribute("data-right-name", validation.rightName);
			icon.setAttribute("data-boundary-index", String(validation.index));
			icon.setAttribute("data-left-name", validation.leftName);
			icon.setAttribute("data-right-name", validation.rightName);
			overlay.appendChild(line);
			overlay.appendChild(icon);
		}
	}

	stripContainer.appendChild(overlay);
	contentContainer.appendChild(stripContainer);

	// Boundary markers with deltaE values
	const boundaryMarkers = document.createElement("div");
	boundaryMarkers.className = "dads-a11y-boundary-markers";

	for (const validation of result.boundaryValidations) {
		const markerPos = (validation.index + 1) * segmentWidth;

		const marker = document.createElement("div");
		marker.className = "dads-a11y-boundary-marker";
		marker.style.left = `${markerPos}%`;

		const deltaEBadge = document.createElement("span");
		deltaEBadge.className = "dads-a11y-deltaE-badge";
		deltaEBadge.textContent = `ΔE ${validation.deltaE.toFixed(1)}`;
		deltaEBadge.setAttribute("data-boundary-index", String(validation.index));
		deltaEBadge.setAttribute("data-left-name", validation.leftName);
		deltaEBadge.setAttribute("data-right-name", validation.rightName);

		if (validation.isDistinguishable) {
			deltaEBadge.classList.add("dads-a11y-deltaE-badge--ok");
		} else {
			deltaEBadge.classList.add("dads-a11y-deltaE-badge--warning");
		}

		marker.appendChild(deltaEBadge);
		boundaryMarkers.appendChild(marker);
	}
	contentContainer.appendChild(boundaryMarkers);

	row.appendChild(contentContainer);

	return row;
}

/**
 * 全CVDタイプの境界検証をレンダリングする
 *
 * @param container - レンダリング先のコンテナ要素
 * @param colors - 色リスト
 * @param sortType - ソートタイプ
 */
function renderAllCvdBoundaryValidations(
	container: HTMLElement,
	colors: NamedColor[],
	sortType: SortType,
): void {
	container.innerHTML = "";

	const heading = document.createElement("h4");
	heading.className = "dads-a11y-boundary__heading";
	heading.textContent = `${getSortTypeName(sortType)}での隣接境界検証`;
	container.appendChild(heading);

	const listContainer = document.createElement("div");
	listContainer.className = "dads-a11y-cvd-boundary-list";

	listContainer.appendChild(renderCvdBoundaryRow(colors, sortType, "normal"));

	const cvdTypes = getAllCVDTypes();
	for (const cvdType of cvdTypes) {
		listContainer.appendChild(renderCvdBoundaryRow(colors, sortType, cvdType));
	}

	container.appendChild(listContainer);
}

/**
 * 境界検証結果を集計する
 *
 * @param colors - 色リスト
 * @param sortType - ソートタイプ
 * @returns 境界検証の集計結果
 */
function getBoundaryValidationSummary(
	colors: NamedColor[],
	sortType: SortType,
): BoundaryValidationSummary {
	const validationTypes: BoundaryValidationType[] = [
		"normal",
		...getAllCVDTypes(),
	];

	let totalIssues = 0;

	for (const validationType of validationTypes) {
		const simulatedColors: NamedColor[] =
			validationType === "normal"
				? colors
				: colors.map((item) => ({
						name: item.name,
						color: simulateCVD(item.color, validationType),
					}));

		const result = sortColorsWithValidation(simulatedColors, sortType);
		totalIssues += result.boundaryValidations.reduce(
			(count, validation) => count + (validation.isDistinguishable ? 0 : 1),
			0,
		);
	}

	return { totalIssues };
}

// ============================================================================
// Main Section Rendering
// ============================================================================

/**
 * 色覚シミュレーションセクションをレンダリングする
 *
 * @param container - レンダリング先のコンテナ要素
 * @param keyColorsMap - キーカラーのマップ
 * @param viewState - ビュー状態
 */
function renderSortingValidationSection(
	container: HTMLElement,
	keyColorsMap: Record<string, Color>,
	viewState: AccessibilityViewState,
): void {
	const section = document.createElement("section");
	section.className = "dads-a11y-sorting-section";

	const heading = document.createElement("h2");
	heading.textContent = "色覚シミュレーション (CVD Simulation)";
	heading.className = "dads-section__heading";
	section.appendChild(heading);

	const desc = document.createElement("p");
	desc.textContent =
		"キーカラーとセマンティックカラーを異なる基準で並べ替え、隣接する色同士の識別性を検証します。";
	desc.className = "dads-section__description";
	section.appendChild(desc);

	const namedColors: NamedColor[] = Object.entries(keyColorsMap).map(
		([name, color]) => ({ name, color }),
	);

	if (namedColors.length < 2) {
		const notice = document.createElement("p");
		notice.className = "dads-a11y-notice";
		notice.textContent = "色覚シミュレーションには2色以上が必要です。";
		section.appendChild(notice);
		container.appendChild(section);
		return;
	}

	const cvdConfusionPairs = detectCvdConfusionPairs(namedColors);

	const alertBox = document.createElement("div");
	alertBox.className = "dads-a11y-alert-box";

	function updateAlertBox(summary: BoundaryValidationSummary): void {
		const cvdConfusionCount = cvdConfusionPairs.length;
		const boundaryIssueCount = summary.totalIssues;

		if (boundaryIssueCount > 0 || cvdConfusionCount > 0) {
			alertBox.className = "dads-a11y-alert-box dads-a11y-alert-box--warning";
			const issueSummary = [
				boundaryIssueCount > 0 ? `隣接境界 ${boundaryIssueCount}件` : null,
				cvdConfusionCount > 0 ? `CVD混同 ${cvdConfusionCount}件` : null,
			]
				.filter(Boolean)
				.join(" / ");

			alertBox.innerHTML = `<span class="dads-a11y-alert-icon">⚠</span> <strong>識別困難なペア検出: ${issueSummary}</strong><br><span style="font-size: 0.9em; opacity: 0.9;">隣接境界とCVD混同の詳細は下記をご確認ください。</span>`;
		} else {
			alertBox.className = "dads-a11y-alert-box dads-a11y-alert-box--ok";
			alertBox.innerHTML =
				'<span class="dads-a11y-alert-icon">✓</span> 隣接境界・CVD混同ともに問題は検出されませんでした。';
		}
	}

	const boundaryContainer = document.createElement("div");
	boundaryContainer.className = "dads-a11y-boundary-container";
	boundaryContainer.setAttribute("data-testid", "boundary-container");

	function updateBoundaryValidation(): void {
		const summary = getBoundaryValidationSummary(
			namedColors,
			viewState.currentSortType,
		);
		updateAlertBox(summary);
		renderAllCvdBoundaryValidations(
			boundaryContainer,
			namedColors,
			viewState.currentSortType,
		);
	}

	renderSortTabs(section, viewState, () => {
		updateBoundaryValidation();
	});

	section.appendChild(alertBox);

	const cvdDetailsContainer = document.createElement("div");
	cvdDetailsContainer.className = "dads-a11y-cvd-details-container";
	renderCvdConfusionDetails(
		cvdDetailsContainer,
		namedColors,
		cvdConfusionPairs,
		(target) => {
			const desiredSortType = chooseBestSortTypeForAdjacency(
				namedColors,
				target,
			);

			if (desiredSortType !== viewState.currentSortType) {
				const tab = section.querySelector<HTMLButtonElement>(
					`.dads-a11y-sort-tab[data-sort-type="${desiredSortType}"]`,
				);
				tab?.click();
			}

			focusCvdComparisonIssue(
				boundaryContainer,
				namedColors,
				desiredSortType,
				target,
			);
		},
	);
	section.appendChild(cvdDetailsContainer);

	section.appendChild(boundaryContainer);

	updateBoundaryValidation();

	container.appendChild(section);
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
	container.className = "dads-section";

	// Requirements 5.2, 5.5: 画面間での背景色同期
	container.style.backgroundColor = state.lightBackgroundColor;

	if (state.palettes.length === 0) {
		renderEmptyState(container, "アクセシビリティ");
		return;
	}

	// Create view state (replaces module-level mutable state)
	const viewState = createViewState();

	// Explanation Section
	const explanationDisclosure = document.createElement("details");
	explanationDisclosure.className = "dads-a11y-explanation dads-disclosure";

	// 占有が大きくなりがちなため、デフォルトは閉じる
	explanationDisclosure.open = false;

	const explanationSummary = document.createElement("summary");
	explanationSummary.className =
		"dads-disclosure__summary dads-a11y-explanation__summary";
	explanationSummary.innerHTML = `
			<svg class="dads-disclosure__icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
				<circle cx="12" cy="12" r="11" fill="currentcolor"/>
				<circle class="dads-disclosure__icon-circle" cx="12" cy="12" r="8" fill="currentcolor"/>
				<path class="dads-disclosure__icon-triangle" d="M17 10H7L12 15L17 10Z" fill="Canvas"/>
			</svg>
			この機能について
		`;

	explanationDisclosure.appendChild(explanationSummary);

	const explanationContent = document.createElement("div");
	explanationContent.className =
		"dads-disclosure__content dads-a11y-explanation__content";
	explanationContent.innerHTML = `
		<p>
			この画面では、多様な色覚特性を持つユーザーが、あなたのカラーパレットをどのように知覚するかをシミュレーションし、
			<strong>識別困難な色の組み合わせがないか</strong>を確認できます。
		</p>

		<h3>確認すべきポイント</h3>
		<ul>
			<li><strong>色覚シミュレーション:</strong> 各色覚タイプ（P型/D型/T型/全色盲）での見え方をシミュレーションし、識別困難な色ペアを検出します。色相順・色差順・明度順での並べ替え表示にも対応しています。</li>
		</ul>

		<h3>判定ロジックと計算方法</h3>
		<ul>
			<li><strong>シミュレーション手法:</strong> Brettel (1997) および Viénot (1999) のアルゴリズムを使用し、P型（1型）、D型（2型）、T型（3型）、全色盲の知覚を再現しています。</li>
			<li><strong>色差計算 (ΔEOK):</strong> OKLab色空間におけるユークリッド距離（× 100スケール）を用いて、色の知覚的な差を計算しています。</li>
			<li><strong>警告基準:</strong> シミュレーション後の色差（DeltaE）が <strong>5.0未満</strong> の場合、色が識別困難であると判断し、<span class="dads-cvd-conflict-icon" style="display:inline-flex; position:static; transform:none; width:16px; height:16px; font-size:10px; margin:0 4px;">!</span>アイコンで警告を表示します。</li>
		</ul>
	`;
	explanationDisclosure.appendChild(explanationContent);
	container.appendChild(explanationDisclosure);

	// Collect key colors
	const keyColorsMap: Record<string, Color> = {};
	for (const p of state.palettes) {
		const keyColorInput = p.keyColors[0];
		if (keyColorInput) {
			const { color: hex } = parseKeyColor(keyColorInput);
			keyColorsMap[p.name] = new Color(hex);
		}
	}

	// helpers.applySimulation is retained for future dynamic simulation switching
	void helpers;

	// CVD Simulation Section
	renderSortingValidationSection(container, keyColorsMap, viewState);
}

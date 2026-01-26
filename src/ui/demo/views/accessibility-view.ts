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
import { Color } from "@/core/color";
import {
	getAllSortTypes,
	getSortTypeName,
	type NamedColor,
	type SortType,
	sortByDeltaE,
	sortByHue,
	sortByLightness,
	sortColorsWithValidation,
} from "@/ui/accessibility/color-sorting";
import {
	detectColorConflicts,
	detectCvdConfusionPairs,
} from "@/ui/accessibility/cvd-detection";
import { parseKeyColor, state } from "../state";
import type { Color as ColorType } from "../types";
import { formatCvdConfusionThreshold } from "../utils/cvd-confusion-threshold";
import {
	createColorSwatch,
	createConflictIndicator,
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
	issues: BoundaryValidationIssue[];
}

interface BoundaryValidationIssue {
	sortType: SortType;
	cvdType: BoundaryValidationType;
	index: number;
	leftName: string;
	rightName: string;
	deltaE: number;
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

function getPairKey(name1: string, name2: string): string {
	return name1 < name2 ? `${name1}\u0000${name2}` : `${name2}\u0000${name1}`;
}

function hashStringToIdSuffix(value: string): string {
	let hash = 5381;
	for (let i = 0; i < value.length; i++) {
		hash = (hash * 33) ^ value.charCodeAt(i);
	}
	return `${(hash >>> 0).toString(36)}-${value.length.toString(36)}`;
}

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

function createAccessibilityExplanationDisclosure(): HTMLDetailsElement {
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
	const thresholdLabel = formatCvdConfusionThreshold(
		state.cvdConfusionThreshold,
	);
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
			<li><strong>警告基準:</strong> シミュレーション後の色差（DeltaE）が <strong>${thresholdLabel}未満</strong> の場合、色が識別困難であると判断し、<span class="dads-cvd-conflict-icon" style="display:inline-flex; position:static; transform:none; width:16px; height:16px; font-size:10px; margin:0 4px;">!</span>アイコンで警告を表示します。</li>
		</ul>
	`;

	explanationDisclosure.appendChild(explanationContent);

	return explanationDisclosure;
}

function getBoundaryIssueAnchorId(
	sortType: SortType,
	cvdType: BoundaryValidationType,
	boundaryIndex: number,
): string {
	return `dads-a11y-boundary-${sortType}-${cvdType}-${boundaryIndex}`;
}

function getCvdConfusionPairAnchorId(
	cvdType: CVDType,
	index1: number,
	index2: number,
): string {
	const a = Math.min(index1, index2);
	const b = Math.max(index1, index2);
	return `dads-a11y-cvd-confusion-${cvdType}-${a}-${b}`;
}

function sortNamedColors(
	colors: NamedColor[],
	sortType: SortType,
): NamedColor[] {
	switch (sortType) {
		case "deltaE":
			return sortByDeltaE(colors);
		case "lightness":
			return sortByLightness(colors);
		case "hue":
		default:
			return sortByHue(colors);
	}
}

function getColorNameDistanceInSort(
	colors: NamedColor[],
	target: CvdConfusionFocusTarget,
	sortType: SortType,
): number | null {
	const simulatedColors = simulateNamedColorsForType(colors, target.cvdType);
	const names = sortNamedColors(simulatedColors, sortType).map((c) => c.name);
	const index1 = names.indexOf(target.colorName1);
	const index2 = names.indexOf(target.colorName2);
	if (index1 < 0 || index2 < 0) return null;
	return Math.abs(index1 - index2);
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

	let best: { sortType: SortType; distance: number } | null = null;
	for (const sortType of prioritizedSortTypes) {
		const distance = getColorNameDistanceInSort(colors, target, sortType);
		if (distance === null) continue;
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
	row.scrollIntoView({ block: "center" });

	const simulatedColors = simulateNamedColorsForType(colors, target.cvdType);
	const names = sortNamedColors(simulatedColors, sortType).map((c) => c.name);
	const index1 = names.indexOf(target.colorName1);
	const index2 = names.indexOf(target.colorName2);

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

	row.focus({ preventScroll: true });
}

function focusBoundaryIssue(
	boundaryContainer: HTMLElement,
	anchorId: string,
): void {
	clearCvdComparisonFocus(boundaryContainer);

	const badge = boundaryContainer.querySelector<HTMLElement>(`#${anchorId}`);
	if (!badge) return;

	const row = badge.closest<HTMLElement>(".dads-a11y-cvd-boundary-row");
	if (!row) return;

	row.classList.add("dads-a11y-focus-target");
	row.scrollIntoView({ block: "center" });

	badge.classList.add("dads-a11y-focus-boundary-badge");

	const boundaryIndexStr = badge.getAttribute("data-boundary-index");
	if (boundaryIndexStr) {
		const icon = row.querySelector<HTMLElement>(
			`.dads-cvd-conflict-icon[data-boundary-index="${boundaryIndexStr}"]`,
		);
		icon?.classList.add("dads-a11y-focus-boundary-indicator");

		const line = row.querySelector<HTMLElement>(
			`.dads-cvd-conflict-line[data-boundary-index="${boundaryIndexStr}"]`,
		);
		line?.classList.add("dads-a11y-focus-boundary-indicator");
	}

	row.focus({ preventScroll: true });
}

function selectBoundaryIssueForPair(
	issues: BoundaryValidationIssue[],
	preferredSortType: SortType,
): BoundaryValidationIssue | null {
	const inPreferredSort = issues.filter(
		(issue) => issue.sortType === preferredSortType,
	);
	const candidates = inPreferredSort.length > 0 ? inPreferredSort : issues;

	let best: BoundaryValidationIssue | null = null;
	for (const issue of candidates) {
		if (!best || issue.deltaE < best.deltaE) {
			best = issue;
		}
	}

	return best;
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

	const result = sortColorsWithValidation(simulatedColors, sortType, {
		threshold: state.cvdConfusionThreshold,
	});

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
			deltaEBadge.id = getBoundaryIssueAnchorId(
				sortType,
				cvdType,
				validation.index,
			);
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
	threshold: number,
): BoundaryValidationSummary {
	const validationTypes: BoundaryValidationType[] = [
		"normal",
		...getAllCVDTypes(),
	];
	const sortTypes = getAllSortTypes();
	const issues: BoundaryValidationIssue[] = [];

	for (const sortType of sortTypes) {
		for (const validationType of validationTypes) {
			const simulatedColors: NamedColor[] =
				validationType === "normal"
					? colors
					: colors.map((item) => ({
							name: item.name,
							color: simulateCVD(item.color, validationType),
						}));

			const result = sortColorsWithValidation(simulatedColors, sortType, {
				threshold,
			});
			for (const validation of result.boundaryValidations) {
				if (validation.isDistinguishable) continue;
				issues.push({
					sortType,
					cvdType: validationType,
					index: validation.index,
					leftName: validation.leftName,
					rightName: validation.rightName,
					deltaE: validation.deltaE,
				});
			}
		}
	}

	return { totalIssues: issues.length, issues };
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

	section.appendChild(createAccessibilityExplanationDisclosure());

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

	const cvdThresholdLabel = formatCvdConfusionThreshold(
		state.cvdConfusionThreshold,
	);
	const cvdConfusionPairs = detectCvdConfusionPairs(namedColors, {
		threshold: state.cvdConfusionThreshold,
	});
	const boundarySummary = getBoundaryValidationSummary(
		namedColors,
		state.cvdConfusionThreshold,
	);

	const boundaryIssuesByPair = new Map<string, BoundaryValidationIssue[]>();
	for (const issue of boundarySummary.issues) {
		const pairKey = getPairKey(issue.leftName, issue.rightName);
		const groupKey = `${issue.cvdType}\u0001${pairKey}`;
		const existing = boundaryIssuesByPair.get(groupKey) ?? [];
		existing.push(issue);
		boundaryIssuesByPair.set(groupKey, existing);
	}

	const confusionPairsByPair = new Map<
		string,
		{
			cvdType: CVDType;
			cvdDeltaE: number;
			index1: number;
			index2: number;
			colorName1: string;
			colorName2: string;
		}
	>();

	for (const pair of cvdConfusionPairs) {
		const color1 = namedColors[pair.index1];
		const color2 = namedColors[pair.index2];
		if (!color1 || !color2) continue;

		const pairKey = getPairKey(color1.name, color2.name);
		const groupKey = `${pair.cvdType}\u0001${pairKey}`;
		const existing = confusionPairsByPair.get(groupKey);
		if (!existing || pair.cvdDeltaE < existing.cvdDeltaE) {
			const [a, b] =
				color1.name < color2.name
					? [color1.name, color2.name]
					: [color2.name, color1.name];
			confusionPairsByPair.set(groupKey, {
				cvdType: pair.cvdType,
				cvdDeltaE: pair.cvdDeltaE,
				index1: pair.index1,
				index2: pair.index2,
				colorName1: a,
				colorName2: b,
			});
		}
	}

	const alertBox = document.createElement("div");
	alertBox.className = "dads-notification-banner dads-a11y-alert-banner";
	alertBox.setAttribute("data-style", "standard");

	function updateAlertBox(): void {
		const cvdConfusionCount = confusionPairsByPair.size;
		const boundaryIssueCount = boundaryIssuesByPair.size;
		const issueGroupCount = new Set([
			...boundaryIssuesByPair.keys(),
			...confusionPairsByPair.keys(),
		]).size;

		const hasIssues = issueGroupCount > 0;
		if (hasIssues) {
			alertBox.setAttribute("data-type", "warning");
			alertBox.setAttribute("role", "alert");
			alertBox.setAttribute("aria-live", "assertive");

			const issueLinksList = document.createElement("ul");
			issueLinksList.className = "dads-a11y-alert-links";

			const cvdTypeOrder: Record<string, number> = {
				normal: 0,
				protanopia: 1,
				deuteranopia: 2,
				tritanopia: 3,
				achromatopsia: 4,
			};

			const issueGroupKeys = Array.from(
				new Set([
					...boundaryIssuesByPair.keys(),
					...confusionPairsByPair.keys(),
				]),
			).sort((a, b) => {
				const [cvdTypeA = "", namePairA = ""] = a.split("\u0001");
				const [cvdTypeB = "", namePairB = ""] = b.split("\u0001");

				const orderA = cvdTypeOrder[cvdTypeA] ?? 999;
				const orderB = cvdTypeOrder[cvdTypeB] ?? 999;
				if (orderA !== orderB) return orderA - orderB;
				if (cvdTypeA !== cvdTypeB) return cvdTypeA.localeCompare(cvdTypeB);
				return namePairA.localeCompare(namePairB);
			});

			for (const groupKey of issueGroupKeys) {
				const [cvdTypeRaw = "", namePairRaw = ""] = groupKey.split("\u0001");
				const cvdType = cvdTypeRaw as BoundaryValidationType;
				const cvdLabel =
					cvdType === "normal"
						? "一般色覚"
						: getCVDTypeName(cvdType as CVDType);
				const [nameA = "", nameB = ""] = namePairRaw.split("\u0000");

				const boundaryIssues = boundaryIssuesByPair.get(groupKey) ?? [];
				const confusion = confusionPairsByPair.get(groupKey);

				const descriptors: string[] = [];
				let anchorId: string | null = null;
				let kind: "boundary" | "confusion" | null = null;

				if (boundaryIssues.length > 0) {
					const minDeltaE = boundaryIssues.reduce((min, issue) => {
						return issue.deltaE < min ? issue.deltaE : min;
					}, Number.POSITIVE_INFINITY);
					descriptors.push(`隣接境界 最小ΔE ${minDeltaE.toFixed(1)}`);
					anchorId = `dads-a11y-boundary-pair-${hashStringToIdSuffix(groupKey)}`;
					kind = "boundary";
				}

				if (confusion) {
					descriptors.push(`CVD混同 ΔE ${confusion.cvdDeltaE.toFixed(2)}`);
					if (!anchorId) {
						anchorId = getCvdConfusionPairAnchorId(
							confusion.cvdType,
							confusion.index1,
							confusion.index2,
						);
						kind = "confusion";
					}
				}

				if (!anchorId || !kind) continue;

				const li = document.createElement("li");
				const a = document.createElement("a");
				a.className = "dads-link";
				a.href = `#${anchorId}`;
				a.setAttribute("data-a11y-jump", "1");
				a.setAttribute("data-a11y-kind", kind);

				if (kind === "boundary") {
					a.setAttribute("data-pair-key", groupKey);
				} else if (confusion) {
					a.setAttribute("data-cvd-type", confusion.cvdType);
					a.setAttribute("data-color-name-1", confusion.colorName1);
					a.setAttribute("data-color-name-2", confusion.colorName2);
				}

				a.textContent = `${cvdLabel}: ${nameA} ↔ ${nameB}（${descriptors.join(" / ")}）`;

				li.appendChild(a);
				issueLinksList.appendChild(li);
			}

			const breakdown = [
				boundaryIssueCount > 0 ? `隣接境界 ${boundaryIssueCount}件` : null,
				cvdConfusionCount > 0
					? `CVD混同（ΔE<${cvdThresholdLabel}） ${cvdConfusionCount}件`
					: null,
			]
				.filter(Boolean)
				.join(" / ");

			const issueSummary = breakdown
				? `影響ペア ${issueGroupCount}件（${breakdown}）`
				: `影響ペア ${issueGroupCount}件`;

			const heading = document.createElement("h3");
			heading.className = "dads-notification-banner__heading";
			heading.innerHTML = `
				<svg class="dads-notification-banner__icon" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="警告">
					<path d="M1 21 12 2l11 19H1Z" fill="currentcolor" />
					<path d="M13 15h-2v-5h2v5Z" fill="Canvas" />
					<circle cx="12" cy="17" r="1" fill="Canvas" />
				</svg>
				<span class="dads-notification-banner__heading-text">識別困難なペア検出</span>
			`;

			const body = document.createElement("div");
			body.className = "dads-notification-banner__body";

			const summaryP = document.createElement("p");
			summaryP.textContent = issueSummary;
			body.appendChild(summaryP);

			if (issueLinksList.childElementCount > 0) {
				body.appendChild(issueLinksList);
			}

			alertBox.replaceChildren(heading, body);
		} else {
			alertBox.setAttribute("data-type", "success");
			alertBox.setAttribute("role", "status");
			alertBox.setAttribute("aria-live", "polite");
			alertBox.innerHTML = `
				<h3 class="dads-notification-banner__heading">
					<svg class="dads-notification-banner__icon" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="成功">
						<path fill="currentColor" d="M9.2 16.6 4.8 12.2a1 1 0 0 1 1.4-1.4l3 3 8.6-8.6a1 1 0 1 1 1.4 1.4l-10 10a1 1 0 0 1-1.4 0z"/>
					</svg>
					<span class="dads-notification-banner__heading-text">問題は検出されませんでした</span>
				</h3>
				<div class="dads-notification-banner__body">
					<p>隣接境界・CVD混同ともに問題は検出されませんでした。</p>
				</div>
			`;
		}
	}

	const boundaryContainer = document.createElement("div");
	boundaryContainer.className = "dads-a11y-boundary-container";
	boundaryContainer.id = "dads-a11y-boundary-container";
	boundaryContainer.setAttribute("data-testid", "boundary-container");

	function updateBoundaryValidation(): void {
		renderAllCvdBoundaryValidations(
			boundaryContainer,
			namedColors,
			viewState.currentSortType,
		);
	}

	updateAlertBox();

	alertBox.addEventListener("click", (event) => {
		const target = event.target as HTMLElement | null;
		const link = target?.closest<HTMLAnchorElement>('a[data-a11y-jump="1"]');
		if (!link) return;

		event.preventDefault();

		const href = link.getAttribute("href");
		const anchorId = href?.startsWith("#") ? href.slice(1) : null;

		const kind = link.getAttribute("data-a11y-kind");
		if (kind === "boundary") {
			const pairKey = link.getAttribute("data-pair-key");
			const issues = pairKey ? boundaryIssuesByPair.get(pairKey) : null;
			if (!issues) return;

			const selected = selectBoundaryIssueForPair(
				issues,
				viewState.currentSortType,
			);
			if (!selected) return;

			const sortType = selected.sortType;
			if (sortType !== viewState.currentSortType) {
				const tab = section.querySelector<HTMLButtonElement>(
					`.dads-a11y-sort-tab[data-sort-type="${sortType}"]`,
				);
				tab?.click();
			}

			const issueAnchorId = getBoundaryIssueAnchorId(
				selected.sortType,
				selected.cvdType,
				selected.index,
			);
			focusBoundaryIssue(boundaryContainer, issueAnchorId);

			if (anchorId) {
				history.replaceState(null, "", `#${anchorId}`);
			}
			return;
		}

		if (kind === "confusion") {
			const cvdType = link.getAttribute("data-cvd-type") as CVDType | null;
			const colorName1 = link.getAttribute("data-color-name-1");
			const colorName2 = link.getAttribute("data-color-name-2");
			if (!cvdType || !colorName1 || !colorName2) return;

			const targetInfo: CvdConfusionFocusTarget = {
				cvdType,
				colorName1,
				colorName2,
			};

			const currentSortType = viewState.currentSortType;
			const currentDistance = getColorNameDistanceInSort(
				namedColors,
				targetInfo,
				currentSortType,
			);

			let desiredSortType = currentSortType;
			if (currentDistance !== 1) {
				const bestSortType = chooseBestSortTypeForAdjacency(
					namedColors,
					targetInfo,
				);
				const bestDistance = getColorNameDistanceInSort(
					namedColors,
					targetInfo,
					bestSortType,
				);
				if (bestDistance === 1) {
					desiredSortType = bestSortType;
				}
			}

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
				targetInfo,
			);

			if (anchorId) {
				history.replaceState(null, "", `#${anchorId}`);
			}
		}
	});

	const boundaryAnchorTargets = document.createElement("div");
	boundaryAnchorTargets.setAttribute("aria-hidden", "true");

	for (const pairKey of boundaryIssuesByPair.keys()) {
		const anchor = document.createElement("div");
		anchor.id = `dads-a11y-boundary-pair-${hashStringToIdSuffix(pairKey)}`;
		boundaryAnchorTargets.appendChild(anchor);
	}

	const confusionAnchorTargets = document.createElement("div");
	confusionAnchorTargets.setAttribute("aria-hidden", "true");

	for (const pair of cvdConfusionPairs) {
		const anchor = document.createElement("div");
		anchor.id = getCvdConfusionPairAnchorId(
			pair.cvdType,
			pair.index1,
			pair.index2,
		);
		confusionAnchorTargets.appendChild(anchor);
	}

	renderSortTabs(section, viewState, () => {
		updateBoundaryValidation();
	});

	section.insertBefore(alertBox, section.querySelector(".dads-a11y-sort-tabs"));
	section.insertBefore(
		boundaryAnchorTargets,
		section.querySelector(".dads-a11y-sort-tabs"),
	);
	section.insertBefore(
		confusionAnchorTargets,
		section.querySelector(".dads-a11y-sort-tabs"),
	);

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

	// helpers.applySimulation is retained for future dynamic simulation switching
	void helpers;

	// CVD Simulation Section
	renderSortingValidationSection(container, keyColorsMap, viewState);
}

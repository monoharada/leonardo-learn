import { type CVDType, simulateCVD } from "@/accessibility/cvd-simulator";
import {
	getAllSortTypes,
	type NamedColor,
	type SortType,
	sortByDeltaE,
	sortByHue,
	sortByLightness,
} from "@/ui/accessibility/color-sorting";
import { state } from "../state";
import { formatCvdConfusionThreshold } from "../utils/cvd-confusion-threshold";

// ============================================================================
// Types
// ============================================================================

/**
 * 境界検証の対象タイプ
 */
export type BoundaryValidationType = CVDType | "normal";

/**
 * 境界検証の集計結果
 */
export interface BoundaryValidationSummary {
	totalIssues: number;
	issues: BoundaryValidationIssue[];
}

export interface BoundaryValidationIssue {
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
export interface AccessibilityViewState {
	currentSortType: SortType;
}

/**
 * CVD混同リスク一覧 → 該当箇所フォーカス用のパラメータ
 */
export interface CvdConfusionFocusTarget {
	cvdType: CVDType;
	colorName1: string;
	colorName2: string;
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

export function getPairKey(name1: string, name2: string): string {
	return name1 < name2 ? `${name1}\u0000${name2}` : `${name2}\u0000${name1}`;
}

export function hashStringToIdSuffix(value: string): string {
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

export function createAccessibilityExplanationDisclosure(): HTMLDetailsElement {
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

export function getBoundaryIssueAnchorId(
	sortType: SortType,
	cvdType: BoundaryValidationType,
	boundaryIndex: number,
): string {
	return `dads-a11y-boundary-${sortType}-${cvdType}-${boundaryIndex}`;
}

export function getCvdConfusionPairAnchorId(
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
		default:
			return sortByHue(colors);
	}
}

export function getColorNameDistanceInSort(
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

export function chooseBestSortTypeForAdjacency(
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

export function focusCvdComparisonIssue(
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

export function focusBoundaryIssue(
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

export function selectBoundaryIssueForPair(
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

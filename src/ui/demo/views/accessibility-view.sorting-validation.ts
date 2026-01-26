import {
	type CVDType,
	getAllCVDTypes,
	getCVDTypeName,
	simulateCVD,
} from "@/accessibility/cvd-simulator";
import type { Color } from "@/core/color";
import {
	getAllSortTypes,
	getSortTypeName,
	type NamedColor,
	type SortType,
	sortColorsWithValidation,
} from "@/ui/accessibility/color-sorting";
import { detectCvdConfusionPairs } from "@/ui/accessibility/cvd-detection";
import { state } from "../state";
import { formatCvdConfusionThreshold } from "../utils/cvd-confusion-threshold";
import {
	createColorSwatch,
	createConflictIndicator,
} from "../utils/dom-helpers";
import type {
	AccessibilityViewState,
	BoundaryValidationIssue,
	BoundaryValidationSummary,
	BoundaryValidationType,
	CvdConfusionFocusTarget,
} from "./accessibility-view.core";
import {
	chooseBestSortTypeForAdjacency,
	createAccessibilityExplanationDisclosure,
	focusBoundaryIssue,
	focusCvdComparisonIssue,
	getBoundaryIssueAnchorId,
	getColorNameDistanceInSort,
	getCvdConfusionPairAnchorId,
	getPairKey,
	hashStringToIdSuffix,
	selectBoundaryIssueForPair,
} from "./accessibility-view.core";

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
export function renderSortingValidationSection(
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

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
import { calculateSimpleDeltaE as calculateDeltaE } from "@/accessibility/distinguishability";
import { Color } from "@/core/color";
import {
	getAllSortTypes,
	getSortTypeName,
	type NamedColor,
	type SortType,
	sortColorsWithValidation,
} from "@/ui/accessibility/color-sorting";
import { parseKeyColor, state } from "../state";
import type { Color as ColorType } from "../types";

// ============================================================================
// DOM Helper Functions
// ============================================================================

/**
 * Create a color swatch element with optional label
 *
 * @param color - The color to display
 * @param name - Optional name for the swatch (displayed as text and in title)
 * @param showLabel - Whether to display the name as text inside the swatch
 * @returns The swatch div element
 */
function createColorSwatch(
	color: ColorType,
	name?: string,
	showLabel = true,
): HTMLDivElement {
	const swatch = document.createElement("div");
	swatch.className = "dads-cvd-strip__swatch";
	swatch.style.backgroundColor = color.toCss();

	if (name) {
		swatch.title = `${name} (${color.toHex()})`;
		if (showLabel) {
			swatch.style.color =
				color.contrast(new Color("white")) > 4.5 ? "white" : "black";
			swatch.textContent = name;
		}
	}

	return swatch;
}

/**
 * Create a small color swatch for pair display (no label, just background)
 *
 * @param color - The color to display
 * @returns The swatch span element
 */
function createPairSwatch(color: ColorType): HTMLSpanElement {
	const swatch = document.createElement("span");
	swatch.className = "dads-a11y-cvd-pair-swatch";
	swatch.style.backgroundColor = color.toHex();
	return swatch;
}

/**
 * Create conflict indicator elements (line and icon) for a given position
 *
 * @param position - The position percentage (0-100)
 * @param useCalc - Whether to use calc() for positioning (for pixel adjustments)
 * @returns Object containing line and icon elements
 */
function createConflictIndicator(
	position: number,
	useCalc = false,
): { line: HTMLDivElement; icon: HTMLDivElement } {
	const line = document.createElement("div");
	line.className = "dads-cvd-conflict-line";
	line.style.left = useCalc ? `calc(${position}% - 1px)` : `${position}%`;

	const icon = document.createElement("div");
	icon.className = "dads-cvd-conflict-icon";
	icon.textContent = "!";

	if (useCalc) {
		icon.style.left = `calc(${position}% - 10px)`;
	} else {
		icon.style.left = `${position}%`;
		icon.style.transform = "translate(-50%, -50%)";
	}

	return { line, icon };
}

/**
 * Detect conflicts between colors based on delta E threshold
 *
 * @param simulatedColors - Array of colors with names
 * @param adjacentOnly - If true, only check adjacent pairs; if false, check all pairs
 * @param threshold - Delta E threshold for conflict detection
 * @returns Array of conflict indices (positions between colors)
 */
function detectColorConflicts(
	simulatedColors: { name: string; color: ColorType }[],
	adjacentOnly: boolean,
	threshold: number,
): number[] {
	const conflicts: number[] = [];

	if (adjacentOnly) {
		// Check adjacent pairs only (for shades)
		for (let i = 0; i < simulatedColors.length - 1; i++) {
			const item1 = simulatedColors[i];
			const item2 = simulatedColors[i + 1];
			if (!item1 || !item2) continue;
			const deltaE = calculateDeltaE(item1.color, item2.color);
			if (deltaE < threshold) {
				conflicts.push(i);
			}
		}
	} else {
		// Check all pairs (for key colors)
		for (let i = 0; i < simulatedColors.length; i++) {
			for (let j = i + 1; j < simulatedColors.length; j++) {
				const item1 = simulatedColors[i];
				const item2 = simulatedColors[j];
				if (!item1 || !item2) continue;
				const deltaE = calculateDeltaE(item1.color, item2.color);
				if (deltaE < threshold) {
					// Record conflict position at the boundary
					if (!conflicts.includes(i)) conflicts.push(i);
					if (!conflicts.includes(j - 1) && j === i + 1) conflicts.push(j - 1);
				}
			}
		}
	}

	return conflicts;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * 識別困難と判定する色差の閾値（ΔEOK = OKLabユークリッド距離 × 100）
 * 境界検証とCVD混同検出で統一使用
 * GPT調査結果に基づき5.0を採用（「2色として認識しやすい」境界）
 */
const DISTINGUISHABILITY_THRESHOLD = 5.0;

/**
 * 一般色覚で十分に区別可能と判定する閾値（ΔEOK）
 * これ以上離れている色ペアのみCVD混同チェックを実施
 */
const NORMAL_DISTINGUISHABLE_THRESHOLD = 10.0;

/**
 * CVD混同リスクのペア情報
 */
interface CvdConfusionPair {
	/** ペアのインデックス（ソート後配列での位置） */
	index1: number;
	index2: number;
	/** CVDタイプ（全4タイプ対応） */
	cvdType: CVDType;
	/** シミュレーション後のdeltaE（OKLCH、100倍スケール） */
	cvdDeltaE: number;
}

/** CVDタイプの日本語名マッピング */
const cvdTypeLabelsJa: Record<CVDType, string> = {
	protanopia: "P型（1型2色覚）",
	deuteranopia: "D型（2型2色覚）",
	tritanopia: "T型（3型2色覚）",
	achromatopsia: "全色盲",
};

/**
 * CVDタイプを日本語名に変換
 */
function getCvdTypeLabelJa(cvdType: CVDType): string {
	return cvdTypeLabelsJa[cvdType];
}

/**
 * CVD混同リスクのあるペアを検出する
 * 全CVDタイプ（P型/D型/T型/全色盲）で識別困難なペアを検出
 * 境界検証と同じΔEOK（OKLabユークリッド距離 × 100）を使用して一貫性を確保
 *
 * @param colors 色リスト
 * @returns CVD混同リスクのあるペアのリスト
 */
function detectCvdConfusionPairs(colors: NamedColor[]): CvdConfusionPair[] {
	const pairs: CvdConfusionPair[] = [];

	for (let i = 0; i < colors.length; i++) {
		for (let j = i + 1; j < colors.length; j++) {
			const color1 = colors[i];
			const color2 = colors[j];
			if (!color1 || !color2) continue;

			// 一般色覚でのdeltaE（ΔEOK、100倍スケール）
			const normalDeltaE = calculateDeltaE(color1.color, color2.color);

			// 一般色覚で十分に区別可能な場合のみCVDチェック
			// （既に識別困難なペアはCVD関係なく問題）
			if (normalDeltaE >= NORMAL_DISTINGUISHABLE_THRESHOLD) {
				// 全CVDタイプでシミュレーション（P型/D型/T型/全色盲）
				for (const cvdType of getAllCVDTypes()) {
					const sim1 = simulateCVD(color1.color, cvdType);
					const sim2 = simulateCVD(color2.color, cvdType);
					const cvdDeltaE = calculateDeltaE(sim1, sim2);

					// 境界検証と同じ閾値を使用
					if (cvdDeltaE < DISTINGUISHABILITY_THRESHOLD) {
						pairs.push({
							index1: i,
							index2: j,
							cvdType,
							cvdDeltaE,
						});
					}
				}
			}
		}
	}

	return pairs;
}

/**
 * CVD混同リスク詳細をハイブリッド形式（2+3）でレンダリングする
 * - 誰に問題か（P型/D型）を明示
 * - どの色ペアかを具体的に表示
 * - 程度をΔE値で補足
 *
 * @param container レンダリング先のコンテナ要素
 * @param colors 色リスト
 * @param cvdConfusionPairs CVD混同リスクのあるペア
 */
function renderCvdConfusionDetails(
	container: HTMLElement,
	colors: NamedColor[],
	cvdConfusionPairs: CvdConfusionPair[],
): void {
	if (cvdConfusionPairs.length === 0) {
		return;
	}

	// CVDタイプでグループ化（全4タイプ対応）
	const groupedByType = new Map<CVDType, CvdConfusionPair[]>();
	for (const pair of cvdConfusionPairs) {
		const existing = groupedByType.get(pair.cvdType) ?? [];
		existing.push(pair);
		groupedByType.set(pair.cvdType, existing);
	}

	// 詳細セクションコンテナ
	const detailsSection = document.createElement("div");
	detailsSection.className = "dads-a11y-cvd-confusion-details";

	// 各CVDタイプごとにセクションを作成
	for (const [cvdType, pairs] of groupedByType) {
		const typeSection = document.createElement("div");
		typeSection.className = "dads-a11y-cvd-type-section";

		// ヘッダー: ⚠ P型（1型2色覚）で混同リスク: 2ペア
		const header = document.createElement("div");
		header.className = "dads-a11y-cvd-type-header";
		header.innerHTML = `<span class="dads-a11y-cvd-type-icon">⚠</span> <strong>${getCvdTypeLabelJa(cvdType)}</strong>で混同リスク: ${pairs.length}ペア`;
		typeSection.appendChild(header);

		// ペアリスト
		const pairList = document.createElement("ul");
		pairList.className = "dads-a11y-cvd-pair-list";

		for (const pair of pairs) {
			const color1 = colors[pair.index1];
			const color2 = colors[pair.index2];
			if (!color1 || !color2) continue;

			const li = document.createElement("li");
			li.className = "dads-a11y-cvd-pair-item";

			// Build pair item: [swatch1] name1 ↔ name2 [swatch2] (ΔE = x.xx)
			const swatch1 = createPairSwatch(color1.color);
			const swatch2 = createPairSwatch(color2.color);

			const text = document.createElement("span");
			text.className = "dads-a11y-cvd-pair-text";
			text.innerHTML = `${color1.name} <span class="dads-a11y-cvd-pair-arrow">↔</span> ${color2.name}`;

			const deltaE = document.createElement("span");
			deltaE.className = "dads-a11y-cvd-pair-deltaE";
			deltaE.textContent = `（ΔE = ${pair.cvdDeltaE.toFixed(2)}）`;

			li.appendChild(swatch1);
			li.appendChild(text);
			li.appendChild(swatch2);
			li.appendChild(deltaE);
			pairList.appendChild(li);
		}

		typeSection.appendChild(pairList);
		detailsSection.appendChild(typeSection);
	}

	container.appendChild(detailsSection);
}

/** 現在選択中のソートタイプ（モジュールレベルの状態） */
let currentSortType: SortType = "hue";

/**
 * アクセシビリティビューのヘルパー関数
 */
export interface AccessibilityViewHelpers {
	/** CVDシミュレーションを適用する関数（純粋関数として渡す） */
	applySimulation: (color: ColorType) => ColorType;
}

/**
 * 空状態のメッセージを表示する
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
 * 色の入力を統一形式（[name, color]のタプル配列）に正規化する
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
 * 識別性分析をレンダリングする
 *
 * 色のリストをCVDシミュレーションで表示し、識別困難な色ペアに警告を表示する。
 * シェードの場合は隣接ペアのみ、キーカラーの場合は全ペアを検証する。
 *
 * @param container レンダリング先のコンテナ要素
 * @param colorsInput 色のマップまたは配列
 * @param options オプション設定
 */
export function renderDistinguishabilityAnalysis(
	container: HTMLElement,
	colorsInput: Record<string, ColorType> | { name: string; color: ColorType }[],
	options: { adjacentOnly?: boolean } = {},
): void {
	const { adjacentOnly = true } = options;
	const cvdTypes = getAllCVDTypes();
	const colorEntries = normalizeColorInput(colorsInput);

	// 1. Normal View
	const normalRow = document.createElement("div");
	normalRow.className = "dads-cvd-row";

	const normalLabel = document.createElement("div");
	normalLabel.textContent = "一般色覚 (Normal Vision)";
	normalLabel.className = "dads-cvd-row__label";
	normalRow.appendChild(normalLabel);

	const normalStrip = document.createElement("div");
	normalStrip.className = "dads-cvd-strip";

	colorEntries.forEach(([name, color]) => {
		normalStrip.appendChild(createColorSwatch(color, name));
	});
	normalRow.appendChild(normalStrip);
	container.appendChild(normalRow);

	// 2. Simulations
	const simContainer = document.createElement("div");
	simContainer.className = "dads-cvd-simulations";

	cvdTypes.forEach((type: CVDType) => {
		const row = document.createElement("div");

		const label = document.createElement("div");
		label.textContent = getCVDTypeName(type);
		label.className = "dads-cvd-row__label";
		row.appendChild(label);

		const stripContainer = document.createElement("div");
		stripContainer.className = "dads-cvd-strip-container";

		const strip = document.createElement("div");
		strip.className = "dads-cvd-strip";

		// シミュレーション後の色を作成（表示用）
		const simulatedColors = colorEntries.map(([name, color]) => ({
			name,
			color: simulateCVD(color, type),
		}));

		// 衝突判定: Use extracted helper function
		const conflicts = detectColorConflicts(
			simulatedColors,
			adjacentOnly,
			DISTINGUISHABILITY_THRESHOLD,
		);

		// Create swatches for simulated colors (no label, title only)
		simulatedColors.forEach((item) => {
			const swatch = document.createElement("div");
			swatch.className = "dads-cvd-strip__swatch";
			swatch.style.backgroundColor = item.color.toCss();
			swatch.title = `${item.name} (Simulated)`;
			strip.appendChild(swatch);
		});
		stripContainer.appendChild(strip);

		// Draw conflict indicators using helper
		if (conflicts.length > 0) {
			const overlay = document.createElement("div");
			overlay.className = "dads-cvd-overlay";

			const segmentWidth = 100 / simulatedColors.length;

			conflicts.forEach((index) => {
				const leftPos = (index + 1) * segmentWidth;
				const { line, icon } = createConflictIndicator(leftPos, true);
				overlay.appendChild(line);
				overlay.appendChild(icon);
			});

			stripContainer.appendChild(overlay);
		}

		row.appendChild(stripContainer);
		simContainer.appendChild(row);
	});
	container.appendChild(simContainer);
}

/**
 * 隣接シェード分析をレンダリングする
 *
 * グラデーションのシェードリストで、識別困難なステップを検出して表示する。
 *
 * @param container レンダリング先のコンテナ要素
 * @param colorsInput 色のマップまたは配列
 */
export function renderAdjacentShadesAnalysis(
	container: HTMLElement,
	colorsInput: Record<string, ColorType> | { name: string; color: ColorType }[],
): void {
	// シェードは隣接ペアのみを検証
	renderDistinguishabilityAnalysis(container, colorsInput, {
		adjacentOnly: true,
	});
}

/**
 * ソートタイプ切り替えUIをレンダリングする
 *
 * @param container レンダリング先のコンテナ要素
 * @param onSortChange ソートタイプ変更時のコールバック
 */
function renderSortTabs(
	container: HTMLElement,
	onSortChange: (sortType: SortType) => void,
): void {
	const tabsContainer = document.createElement("div");
	tabsContainer.className = "dads-a11y-sort-tabs";
	tabsContainer.setAttribute("role", "tablist");
	tabsContainer.setAttribute("aria-label", "並べ替え方法を選択");

	const sortTypes = getAllSortTypes();
	sortTypes.forEach((sortType) => {
		const tab = document.createElement("button");
		tab.className = "dads-a11y-sort-tab";
		tab.textContent = getSortTypeName(sortType);
		tab.setAttribute("role", "tab");
		tab.setAttribute("data-sort-type", sortType);
		tab.setAttribute(
			"aria-selected",
			sortType === currentSortType ? "true" : "false",
		);

		if (sortType === currentSortType) {
			tab.classList.add("dads-a11y-sort-tab--active");
		}

		tab.addEventListener("click", () => {
			currentSortType = sortType;
			onSortChange(sortType);

			// タブのアクティブ状態を更新
			tabsContainer.querySelectorAll(".dads-a11y-sort-tab").forEach((t) => {
				t.classList.remove("dads-a11y-sort-tab--active");
				t.setAttribute("aria-selected", "false");
			});
			tab.classList.add("dads-a11y-sort-tab--active");
			tab.setAttribute("aria-selected", "true");
		});

		tabsContainer.appendChild(tab);
	});

	container.appendChild(tabsContainer);
}

/**
 * 単一CVDタイプの境界検証行をレンダリングする
 *
 * @param colors 元の色リスト（シミュレーション前）
 * @param sortType ソートタイプ
 * @param cvdType CVDタイプ（"normal"の場合は通常色覚）
 * @returns 行のHTML要素
 */
function renderCvdBoundaryRow(
	colors: NamedColor[],
	sortType: SortType,
	cvdType: CVDType | "normal",
): HTMLElement {
	// CVDシミュレーションを適用した色に変換
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

	// ラベル
	const label = document.createElement("div");
	label.className = "dads-cvd-row__label";
	label.textContent =
		cvdType === "normal" ? "一般色覚 (Normal)" : getCVDTypeName(cvdType);
	row.appendChild(label);

	// 色のストリップとΔE表示を含むコンテナ
	const contentContainer = document.createElement("div");
	contentContainer.className = "dads-a11y-cvd-boundary-content";

	// 色のストリップコンテナ（エラーインジケーター配置用）
	const stripContainer = document.createElement("div");
	stripContainer.className = "dads-cvd-strip-container";

	// 色のストリップ表示
	const strip = document.createElement("div");
	strip.className = "dads-cvd-strip";

	result.sortedColors.forEach((item) => {
		strip.appendChild(createColorSwatch(item.color, item.name));
	});
	stripContainer.appendChild(strip);

	// エラー境界にインジケーターを表示するオーバーレイ
	const overlay = document.createElement("div");
	overlay.className = "dads-cvd-overlay";

	const segmentWidth = 100 / result.sortedColors.length;

	result.boundaryValidations.forEach((validation) => {
		if (!validation.isDistinguishable) {
			const markerPos = (validation.index + 1) * segmentWidth;
			const { line, icon } = createConflictIndicator(markerPos, false);
			overlay.appendChild(line);
			overlay.appendChild(icon);
		}
	});

	stripContainer.appendChild(overlay);
	contentContainer.appendChild(stripContainer);

	// 境界マーカーとΔE値表示
	const boundaryMarkers = document.createElement("div");
	boundaryMarkers.className = "dads-a11y-boundary-markers";

	result.boundaryValidations.forEach((validation) => {
		const markerPos = (validation.index + 1) * segmentWidth;

		const marker = document.createElement("div");
		marker.className = "dads-a11y-boundary-marker";
		marker.style.left = `${markerPos}%`;

		const deltaEBadge = document.createElement("span");
		deltaEBadge.className = "dads-a11y-deltaE-badge";
		deltaEBadge.textContent = `ΔE ${validation.deltaE.toFixed(1)}`;

		if (validation.isDistinguishable) {
			deltaEBadge.classList.add("dads-a11y-deltaE-badge--ok");
		} else {
			deltaEBadge.classList.add("dads-a11y-deltaE-badge--warning");
		}

		marker.appendChild(deltaEBadge);
		boundaryMarkers.appendChild(marker);
	});
	contentContainer.appendChild(boundaryMarkers);

	// contentContainerをrowに追加（グリッドの2列目: 1fr）
	row.appendChild(contentContainer);

	return row;
}

/**
 * 全CVDタイプの境界検証をレンダリングする
 *
 * @param container レンダリング先のコンテナ要素
 * @param colors 色リスト
 * @param sortType ソートタイプ
 */
function renderAllCvdBoundaryValidations(
	container: HTMLElement,
	colors: NamedColor[],
	sortType: SortType,
): void {
	// コンテナをクリア
	container.innerHTML = "";

	// タイトル
	const heading = document.createElement("h4");
	heading.className = "dads-a11y-boundary__heading";
	heading.textContent = `${getSortTypeName(sortType)}での隣接境界検証`;
	container.appendChild(heading);

	// 全CVDタイプの一覧コンテナ
	const listContainer = document.createElement("div");
	listContainer.className = "dads-a11y-cvd-boundary-list";

	// 一般色覚
	listContainer.appendChild(renderCvdBoundaryRow(colors, sortType, "normal"));

	// 各CVDタイプ
	const cvdTypes = getAllCVDTypes();
	cvdTypes.forEach((cvdType) => {
		listContainer.appendChild(renderCvdBoundaryRow(colors, sortType, cvdType));
	});

	container.appendChild(listContainer);
	// Note: 下部サマリーは削除済み - alert boxに全ペア＋隣接ペアの情報を統合
}

/**
 * 色覚シミュレーションセクションをレンダリングする
 *
 * @param container レンダリング先のコンテナ要素
 * @param keyColorsMap キーカラーのマップ
 */
function renderSortingValidationSection(
	container: HTMLElement,
	keyColorsMap: Record<string, Color>,
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

	// キーカラーをNamedColor形式に変換
	const namedColors: NamedColor[] = Object.entries(keyColorsMap).map(
		([name, color]) => ({ name, color }),
	);

	// 色が2つ未満の場合は検証不要
	if (namedColors.length < 2) {
		const notice = document.createElement("p");
		notice.className = "dads-a11y-notice";
		notice.textContent = "色覚シミュレーションには2色以上が必要です。";
		section.appendChild(notice);
		container.appendChild(section);
		return;
	}

	// CVD混同リスクのあるペアを検出
	const cvdConfusionPairs = detectCvdConfusionPairs(namedColors);

	// 警告アラートボックス（tabs下に表示するため、後でappend）
	const alertBox = document.createElement("div");
	alertBox.className = "dads-a11y-alert-box";

	/**
	 * 警告アラートボックスを更新する
	 * 全CVDタイプでの混同リスク件数を表示
	 */
	const updateAlertBox = () => {
		// CVD混同リスク（全CVDタイプで混同するペア数）
		const cvdConfusionCount = cvdConfusionPairs.length;

		if (cvdConfusionCount > 0) {
			alertBox.className = "dads-a11y-alert-box dads-a11y-alert-box--warning";
			alertBox.innerHTML = `<span class="dads-a11y-alert-icon">⚠</span> <strong>識別困難なペア検出: ${cvdConfusionCount}件</strong><br><span style="font-size: 0.9em; opacity: 0.9;">一部の色覚タイプ（P型/D型/T型/全色盲）で、色ペアが混同される可能性があります。詳細は下記をご確認ください。</span>`;
		} else {
			alertBox.className = "dads-a11y-alert-box dads-a11y-alert-box--ok";
			alertBox.innerHTML =
				'<span class="dads-a11y-alert-icon">✓</span> すべてのペアが十分に区別できます。';
		}
	};

	// 境界検証コンテナ
	const boundaryContainer = document.createElement("div");
	boundaryContainer.className = "dads-a11y-boundary-container";
	boundaryContainer.setAttribute("data-testid", "boundary-container");

	// 更新関数
	const updateBoundaryValidation = () => {
		updateAlertBox();
		renderAllCvdBoundaryValidations(
			boundaryContainer,
			namedColors,
			currentSortType,
		);
	};

	// ソートタブ（先にappend）
	renderSortTabs(section, () => {
		updateBoundaryValidation();
	});

	// アラートボックス（tabs下にappend）
	section.appendChild(alertBox);

	// CVD混同リスク詳細をハイブリッド形式で表示（2+3アプローチ）
	// - 誰に問題か（P型/D型）を明示
	// - どの色ペアかを具体的に表示
	// - 程度をΔE値で補足
	const cvdDetailsContainer = document.createElement("div");
	cvdDetailsContainer.className = "dads-a11y-cvd-details-container";
	renderCvdConfusionDetails(
		cvdDetailsContainer,
		namedColors,
		cvdConfusionPairs,
	);
	section.appendChild(cvdDetailsContainer);

	// 初期表示時に警告アラートを更新
	updateAlertBox();

	section.appendChild(boundaryContainer);

	// 初期表示（全色覚特性を一覧で表示）
	updateBoundaryValidation();

	container.appendChild(section);
}

/**
 * アクセシビリティビューをレンダリングする
 *
 * CVDシミュレーションによる色の識別性確認とCVD混同リスク検出を表示する。
 * キーカラー＋セマンティックカラーのみを対象とする。
 *
 * @param container レンダリング先のコンテナ要素
 * @param helpers ヘルパー関数（applySimulationはコールバック経由で渡す）
 */
export function renderAccessibilityView(
	container: HTMLElement,
	helpers: AccessibilityViewHelpers,
): void {
	// コンテナをクリアして前のビューのDOMが残らないようにする
	container.innerHTML = "";
	container.className = "dads-section";

	// Requirements 5.2, 5.5: 画面間での背景色同期
	// DemoStateのライト背景色をコンテナに適用（パレット/シェードビューと同期）
	container.style.backgroundColor = state.lightBackgroundColor;

	// パレットが生成されていない場合
	if (state.palettes.length === 0) {
		renderEmptyState(container, "アクセシビリティ");
		return;
	}

	// 0. Explanation Section
	const explanationSection = document.createElement("section");
	explanationSection.className = "dads-a11y-explanation";

	const explanationHeading = document.createElement("h2");
	explanationHeading.textContent = "この機能について";
	explanationHeading.className = "dads-a11y-explanation__heading";
	explanationSection.appendChild(explanationHeading);

	const explanationContent = document.createElement("div");
	explanationContent.className = "dads-a11y-explanation__content";
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
	explanationSection.appendChild(explanationContent);
	container.appendChild(explanationSection);

	// 1. キーカラーを収集（色覚シミュレーションセクションで使用）
	// Note: UI Refinement - Key Colorsセクションは削除し、全ペア検証はalert boxに統合
	const keyColorsMap: Record<string, Color> = {};
	state.palettes.forEach((p) => {
		const keyColorInput = p.keyColors[0];
		if (keyColorInput) {
			const { color: hex } = parseKeyColor(keyColorInput);
			keyColorsMap[p.name] = new Color(hex);
		}
	});

	// helpers.applySimulationは将来の動的シミュレーション切り替え用に保持
	// （現在は使用していないが、API互換性のため引数は維持）
	void helpers;

	// 2. 色覚シミュレーションセクション
	renderSortingValidationSection(container, keyColorsMap);
}

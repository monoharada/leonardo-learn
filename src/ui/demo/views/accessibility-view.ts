/**
 * アクセシビリティビューモジュール
 *
 * アクセシビリティ分析画面のレンダリングを担当する。
 * CVDシミュレーションによる色の識別性確認と、CUDパレット検証を表示する。
 * キーカラー＋セマンティックカラーのみを対象とし、3種類の並べ替え検証を提供する。
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
import {
	calculateDeltaE,
	checkPaletteDistinguishability,
} from "@/accessibility/distinguishability";
import { Color } from "@/core/color";
import { validatePalette } from "@/core/cud/validator";
import {
	getAllSortTypes,
	getSortTypeName,
	type NamedColor,
	type SortType,
	sortColorsWithValidation,
} from "@/ui/accessibility/color-sorting";
import {
	type PaletteColor,
	showPaletteValidation,
	snapToCudColor,
} from "@/ui/cud-components";
import { parseKeyColor, state } from "../state";
import type { Color as ColorType } from "../types";

/** 識別困難と判定する色差の閾値 */
const DISTINGUISHABILITY_THRESHOLD = 3.0;

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

	let colorEntries: [string, ColorType][];
	if (Array.isArray(colorsInput)) {
		colorEntries = colorsInput.map((item) => [item.name, item.color]);
	} else {
		colorEntries = Object.entries(colorsInput);
	}

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
		const swatch = document.createElement("div");
		swatch.className = "dads-cvd-strip__swatch";
		swatch.style.backgroundColor = color.toCss();
		swatch.title = `${name} (${color.toHex()})`;
		swatch.style.color =
			color.contrast(new Color("white")) > 4.5 ? "white" : "black";
		swatch.textContent = name;
		normalStrip.appendChild(swatch);
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

		// 衝突判定: シミュレーション後の色同士の色差を直接計算（二重シミュレーションを回避）
		const conflicts: number[] = [];
		if (adjacentOnly) {
			// 隣接ペアのみ検証（シェード用）
			for (let i = 0; i < simulatedColors.length - 1; i++) {
				const item1 = simulatedColors[i];
				const item2 = simulatedColors[i + 1];
				if (!item1 || !item2) continue;
				const deltaE = calculateDeltaE(item1.color, item2.color);
				if (deltaE < DISTINGUISHABILITY_THRESHOLD) {
					conflicts.push(i);
				}
			}
		} else {
			// 全ペア検証（キーカラー用）
			for (let i = 0; i < simulatedColors.length; i++) {
				for (let j = i + 1; j < simulatedColors.length; j++) {
					const item1 = simulatedColors[i];
					const item2 = simulatedColors[j];
					if (!item1 || !item2) continue;
					const deltaE = calculateDeltaE(item1.color, item2.color);
					if (deltaE < DISTINGUISHABILITY_THRESHOLD) {
						// 全ペアモードでは隣接関係を示すためにi側のインデックスを記録
						// （複数の警告が同じ位置に表示される可能性あり）
						if (!conflicts.includes(i)) conflicts.push(i);
						if (!conflicts.includes(j - 1) && j === i + 1)
							conflicts.push(j - 1);
					}
				}
			}
		}

		simulatedColors.forEach((item) => {
			const swatch = document.createElement("div");
			swatch.className = "dads-cvd-strip__swatch";
			swatch.style.backgroundColor = item.color.toCss();
			swatch.title = `${item.name} (Simulated)`;
			strip.appendChild(swatch);
		});
		stripContainer.appendChild(strip);

		// Draw conflict lines
		if (conflicts.length > 0) {
			const overlay = document.createElement("div");
			overlay.className = "dads-cvd-overlay";

			const segmentWidth = 100 / simulatedColors.length;

			conflicts.forEach((index) => {
				const leftPos = (index + 1) * segmentWidth;

				const line = document.createElement("div");
				line.className = "dads-cvd-conflict-line";
				line.style.left = `calc(${leftPos}% - 1px)`;
				overlay.appendChild(line);

				const icon = document.createElement("div");
				icon.className = "dads-cvd-conflict-icon";
				icon.textContent = "!";
				icon.style.left = `calc(${leftPos}% - 10px)`;
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

	// 色のストリップ表示
	const strip = document.createElement("div");
	strip.className = "dads-cvd-strip";

	result.sortedColors.forEach((item) => {
		const swatch = document.createElement("div");
		swatch.className = "dads-cvd-strip__swatch";
		swatch.style.backgroundColor = item.color.toCss();
		swatch.title = `${item.name} (${item.color.toHex()})`;
		swatch.style.color =
			item.color.contrast(new Color("white")) > 4.5 ? "white" : "black";
		swatch.textContent = item.name;
		strip.appendChild(swatch);
	});
	contentContainer.appendChild(strip);

	// 境界マーカーとΔE値表示
	const boundaryMarkers = document.createElement("div");
	boundaryMarkers.className = "dads-a11y-boundary-markers";

	const segmentWidth = 100 / result.sortedColors.length;

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

	// 問題数カウントを表示
	const problemCount = result.boundaryValidations.filter(
		(v) => !v.isDistinguishable,
	).length;
	if (problemCount > 0) {
		const warning = document.createElement("span");
		warning.className = "dads-a11y-cvd-warning-badge";
		warning.textContent = `⚠️ ${problemCount}`;
		warning.title = `${problemCount}箇所の隣接ペアが識別困難`;
		row.appendChild(warning);
	}

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

	// 全体サマリー
	const allProblemCount = ["normal" as const, ...cvdTypes].reduce(
		(count, cvdType) => {
			const simulatedColors: NamedColor[] =
				cvdType === "normal"
					? colors
					: colors.map((item) => ({
							name: item.name,
							color: simulateCVD(item.color, cvdType),
						}));
			const result = sortColorsWithValidation(simulatedColors, sortType);
			return (
				count +
				result.boundaryValidations.filter((v) => !v.isDistinguishable).length
			);
		},
		0,
	);

	const summary = document.createElement("div");
	summary.className = "dads-a11y-boundary-summary";

	if (allProblemCount > 0) {
		summary.innerHTML = `<span class="dads-a11y-warning-icon">⚠️</span> 合計${allProblemCount}箇所で識別困難なペアがあります`;
		summary.classList.add("dads-a11y-boundary-summary--warning");
	} else {
		summary.innerHTML =
			'<span class="dads-a11y-ok-icon">✓</span> すべての色覚特性で隣接ペアが十分に区別できます';
		summary.classList.add("dads-a11y-boundary-summary--ok");
	}
	container.appendChild(summary);
}

/**
 * 並べ替え検証セクションをレンダリングする
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
	heading.textContent = "並べ替え検証 (Sorting Validation)";
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
		notice.textContent = "並べ替え検証には2色以上が必要です。";
		section.appendChild(notice);
		container.appendChild(section);
		return;
	}

	// 境界検証コンテナ
	const boundaryContainer = document.createElement("div");
	boundaryContainer.className = "dads-a11y-boundary-container";
	boundaryContainer.setAttribute("data-testid", "boundary-container");

	// 更新関数
	const updateBoundaryValidation = () => {
		renderAllCvdBoundaryValidations(
			boundaryContainer,
			namedColors,
			currentSortType,
		);
	};

	// ソートタブ
	renderSortTabs(section, () => {
		updateBoundaryValidation();
	});

	section.appendChild(boundaryContainer);

	// 初期表示（全色覚特性を一覧で表示）
	updateBoundaryValidation();

	container.appendChild(section);
}

/**
 * アクセシビリティビューをレンダリングする
 *
 * CVDシミュレーションによる色の識別性確認と、CUDパレット検証を表示する。
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
			<li><strong>キーカラー＋セマンティックカラーの識別性:</strong> 生成された各パレットのキーカラー同士が、色覚特性によって混同されないか確認します。</li>
			<li><strong>並べ替え検証:</strong> 色相順・色差順・明度順で並べ替え、隣接する色同士の識別性を確認します。</li>
		</ul>

		<h3>判定ロジックと計算方法</h3>
		<ul>
			<li><strong>シミュレーション手法:</strong> Brettel (1997) および Viénot (1999) のアルゴリズムを使用し、P型（1型）、D型（2型）、T型（3型）、全色盲の知覚を再現しています。</li>
			<li><strong>色差計算 (DeltaE):</strong> OKLCH色空間におけるユークリッド距離を用いて、色の知覚的な差を計算しています。</li>
			<li><strong>警告基準:</strong> シミュレーション後の色差（DeltaE）が <strong>3.0未満</strong> の場合、色が識別困難であると判断し、<span class="dads-cvd-conflict-icon" style="display:inline-flex; position:static; transform:none; width:16px; height:16px; font-size:10px; margin:0 4px;">!</span>アイコンで警告を表示します。</li>
		</ul>
	`;
	explanationSection.appendChild(explanationContent);
	container.appendChild(explanationSection);

	// 1. Key Colors Check Section (全ペア検証)
	const keyColorsSection = document.createElement("section");
	const keyColorsHeading = document.createElement("h2");
	keyColorsHeading.textContent = "キーカラー＋セマンティックカラーの識別性確認";
	keyColorsHeading.className = "dads-section__heading";
	keyColorsSection.appendChild(keyColorsHeading);

	const keyColorsDesc = document.createElement("p");
	keyColorsDesc.textContent =
		"生成された各パレットのキーカラー同士が、多様な色覚特性において区別できるかを確認します。";
	keyColorsDesc.className = "dads-section__description";
	keyColorsSection.appendChild(keyColorsDesc);

	// Gather key colors
	const keyColorsMap: Record<string, Color> = {};
	state.palettes.forEach((p) => {
		const keyColorInput = p.keyColors[0];
		if (keyColorInput) {
			const { color: hex } = parseKeyColor(keyColorInput);
			keyColorsMap[p.name] = new Color(hex);
		}
	});

	// Render Key Colors Analysis (全ペア検証)
	renderDistinguishabilityAnalysis(keyColorsSection, keyColorsMap, {
		adjacentOnly: false,
	});
	container.appendChild(keyColorsSection);

	// helpersを使用して詳細な全ペア検証結果を表示
	// （将来的にはhelpersのapplySimulationを活用して動的なシミュレーション切り替えが可能）
	const keyColorsList = Object.entries(keyColorsMap).map(([name, color]) => ({
		name,
		color: helpers.applySimulation(color),
	}));
	if (keyColorsList.length > 1) {
		// 全ペア検証の詳細結果をcheckPaletteDistinguishabilityで取得
		const fullResult = checkPaletteDistinguishability(keyColorsMap);
		if (fullResult.problematicPairs.length > 0) {
			const warningDiv = document.createElement("div");
			warningDiv.className = "dads-a11y-warning";
			warningDiv.style.cssText = `
				padding: 12px;
				background: #fff3cd;
				border-radius: 8px;
				border-left: 4px solid #ffc107;
				margin-top: 12px;
			`;
			warningDiv.innerHTML = `<strong>⚠️ 識別困難なペア検出:</strong> ${fullResult.problematicPairs.length}件のペアがCVD状態で混同される可能性があります。`;
			keyColorsSection.appendChild(warningDiv);
		}
	}

	// 2. 並べ替え検証セクション（新規追加）
	renderSortingValidationSection(container, keyColorsMap);

	// 3. CUDモードがoff以外の場合はCUD検証セクションを追加
	if (state.cudMode !== "off") {
		const cudSection = document.createElement("section");
		cudSection.className = "dads-a11y-cud-section";
		cudSection.style.marginTop = "32px";

		const cudHeading = document.createElement("h2");
		cudHeading.textContent =
			state.cudMode === "strict"
				? "CUD パレット検証（CUD互換モード：スナップ適用済み）"
				: "CUD パレット検証 (CVD 混同リスク分析)";
		cudHeading.className = "dads-section__heading";
		cudSection.appendChild(cudHeading);

		const cudDesc = document.createElement("p");
		cudDesc.className = "dads-section__description";
		cudDesc.textContent =
			state.cudMode === "strict"
				? "CUD互換モードでは、すべての色がCUD推奨色20色にスナップされます。"
				: "CUD推奨配色セットに基づいて、パレット内の色がCVD（色覚多様性）状態で混同されるリスクを検証します。";
		cudSection.appendChild(cudDesc);

		// パレットの色をPaletteColor形式に変換して検証
		// ColorRoleは "accent" | "base" | "text" | "background" | "neutral" のみ
		const paletteColors: PaletteColor[] = state.palettes.map((p) => {
			const keyColorInput = p.keyColors[0];
			let { color: hexColor } = parseKeyColor(keyColorInput || "#000000");

			// strictモードの場合はCUD推奨色にスナップ
			if (state.cudMode === "strict") {
				const snapResult = snapToCudColor(hexColor, { mode: "strict" });
				hexColor = snapResult.hex;
			}

			const name = p.name.toLowerCase();
			// セマンティック名をColorRoleにマッピング
			const role: "accent" | "base" | "text" | "background" | "neutral" =
				name.includes("primary")
					? "accent"
					: name.includes("secondary")
						? "accent"
						: name.includes("accent")
							? "accent"
							: name.includes("success")
								? "accent"
								: name.includes("error")
									? "accent"
									: name.includes("warning")
										? "accent"
										: name.includes("info")
											? "accent"
											: name.includes("neutral")
												? "neutral"
												: name.includes("background")
													? "background"
													: name.includes("text")
														? "text"
														: "base";
			return { hex: hexColor, role };
		});

		// CUD検証を実行
		const validationResult = validatePalette(paletteColors);

		// CVD混同リスクの問題を抽出
		const cvdIssues = validationResult.issues.filter(
			(issue) => issue.type === "cvd_confusion_risk",
		);

		if (cvdIssues.length > 0) {
			const issuesContainer = document.createElement("div");
			issuesContainer.className = "dads-a11y-cud-issues";
			issuesContainer.style.cssText = `
				padding: 16px;
				background: #fff3cd;
				border-radius: 8px;
				border-left: 4px solid #ffc107;
				margin-top: 12px;
			`;

			const issuesTitle = document.createElement("h4");
			issuesTitle.textContent = `⚠️ CVD混同リスク検出 (${cvdIssues.length}件)`;
			issuesTitle.style.cssText = "margin: 0 0 12px 0; color: #856404;";
			issuesContainer.appendChild(issuesTitle);

			const issuesList = document.createElement("ul");
			issuesList.style.cssText = "margin: 0; padding-left: 20px;";

			cvdIssues.forEach((issue) => {
				const item = document.createElement("li");
				item.style.marginBottom = "8px";
				item.innerHTML = `
					<strong>${issue.colors.join(" ↔ ")}</strong>: ${issue.message}
					${issue.details ? `<br><small style="color: #666;">詳細: 通常時 ΔE=${(issue.details.normalDeltaE as number)?.toFixed(3)}, CVD後 ΔE=${(issue.details.cvdDeltaE as number)?.toFixed(3)}</small>` : ""}
				`;
				issuesList.appendChild(item);
			});

			issuesContainer.appendChild(issuesList);
			cudSection.appendChild(issuesContainer);
		} else {
			const noIssues = document.createElement("div");
			noIssues.className = "dads-a11y-cud-ok";
			noIssues.style.cssText = `
				padding: 16px;
				background: #d4edda;
				border-radius: 8px;
				border-left: 4px solid #28a745;
				margin-top: 12px;
				color: #155724;
			`;
			noIssues.innerHTML =
				"✓ CVD混同リスクは検出されませんでした。パレット内の色はCVD状態でも十分に区別できます。";
			cudSection.appendChild(noIssues);
		}

		// 全体検証結果のサマリー
		const summaryContainer = document.createElement("div");
		summaryContainer.style.cssText = "margin-top: 16px;";

		const validationContainer = document.createElement("div");
		showPaletteValidation(paletteColors, validationContainer);
		summaryContainer.appendChild(validationContainer);
		cudSection.appendChild(summaryContainer);

		container.appendChild(cudSection);
	}
}

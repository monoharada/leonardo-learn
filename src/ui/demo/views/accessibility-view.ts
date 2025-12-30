/**
 * アクセシビリティビューモジュール
 *
 * アクセシビリティ分析画面のレンダリングを担当する。
 * CVDシミュレーションによる色の識別性確認と、CUDパレット検証を表示する。
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
import { findColorForContrast } from "@/core/solver";
import {
	type PaletteColor,
	showPaletteValidation,
	snapToCudColor,
} from "@/ui/cud-components";
import { getContrastRatios, STEP_NAMES } from "@/ui/style-constants";
import { parseKeyColor, state } from "../state";
import type { Color as ColorType } from "../types";

/** 識別困難と判定する色差の閾値 */
const DISTINGUISHABILITY_THRESHOLD = 3.0;

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
 * アクセシビリティビューをレンダリングする
 *
 * CVDシミュレーションによる色の識別性確認と、CUDパレット検証を表示する。
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
			<li><strong>キーカラー間の識別性:</strong> 生成された各パレット（Primary, Secondaryなど）のキーカラー同士が、色覚特性によって混同されないか確認します（全ペアを検証）。</li>
			<li><strong>階調の識別性:</strong> 各パレット内の隣接するステップ（例: 500と600）が、十分なコントラストを持って区別できるか確認します。</li>
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
	keyColorsHeading.textContent =
		"キーカラーの識別性確認 (Key Colors Harmony Check)";
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

	// 2. Per-Palette Step Check Section
	const palettesSection = document.createElement("section");
	const palettesHeading = document.createElement("h2");
	palettesHeading.textContent =
		"パレット階調の識別性確認 (Palette Steps Check)";
	palettesHeading.className = "dads-section__heading";
	palettesSection.appendChild(palettesHeading);

	const palettesDesc = document.createElement("p");
	palettesDesc.textContent =
		"各パレット内の隣接する階調（シェード）が、多様な色覚特性において区別できるかを確認します。";
	palettesDesc.className = "dads-section__description";
	palettesSection.appendChild(palettesDesc);

	state.palettes.forEach((p) => {
		const pContainer = document.createElement("div");
		pContainer.className = "dads-a11y-palette-card";

		const pTitle = document.createElement("h3");
		pTitle.textContent = p.name;
		pTitle.className = "dads-a11y-palette-card__title";
		pContainer.appendChild(pTitle);

		// Generate scale
		const keyColorInput = p.keyColors[0];
		if (!keyColorInput) return;
		const { color: hex } = parseKeyColor(keyColorInput);
		const keyColor = new Color(hex);

		const baseRatios = getContrastRatios(state.contrastIntensity);
		const bgColor = new Color("#ffffff");
		const keyContrastRatio = keyColor.contrast(bgColor);

		let keyColorIndex = -1;
		let minDiff = Infinity;
		for (let i = 0; i < baseRatios.length; i++) {
			const diff = Math.abs((baseRatios[i] ?? 0) - keyContrastRatio);
			if (diff < minDiff) {
				minDiff = diff;
				keyColorIndex = i;
			}
		}
		if (keyColorIndex >= 0) {
			baseRatios[keyColorIndex] = keyContrastRatio;
		}

		const colors: Color[] = baseRatios.map((ratio, i) => {
			if (i === keyColorIndex) return keyColor;
			const solved = findColorForContrast(keyColor, bgColor, ratio);
			return solved || keyColor;
		});
		colors.reverse();

		const shadesList: { name: string; color: Color }[] = [];
		colors.forEach((c, i) => {
			shadesList.push({ name: `${STEP_NAMES[i]}`, color: c });
		});

		// Render analysis for this palette (隣接ペアのみ)
		renderAdjacentShadesAnalysis(pContainer, shadesList);
		palettesSection.appendChild(pContainer);
	});

	container.appendChild(palettesSection);

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

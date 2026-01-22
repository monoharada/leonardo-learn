/**
 * マニュアル選択ビューモジュール
 *
 * マニュアル選択画面のレンダリングを担当する。
 * DADSカラーの各色相セクションとブランドカラーセクションを表示する。
 * カードクリック時はonColorClickコールバック経由でcolor-detail-modalと接続する。
 *
 * @module @/ui/demo/views/manual-view
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.5, 5.6, 6.3, 6.4
 */

import { simulateCVD } from "@/accessibility/cvd-simulator";
import { Color } from "@/core/color";
import { generateHarmonyPalette, HarmonyType } from "@/core/harmony";
import { calculateBoundaries } from "@/core/semantic-role/contrast-boundary-calculator";
import {
	createSemanticRoleMapper,
	type PaletteInfo,
	type SemanticRoleMapperService,
} from "@/core/semantic-role/role-mapper";
import type { SemanticRole } from "@/core/semantic-role/types";
import type { DadsColorScale } from "@/core/tokens/dads-data-provider";
import {
	findDadsColorByHex,
	getAllDadsChromatic,
	loadDadsTokens,
} from "@/core/tokens/dads-data-provider";
import type {
	DadsChromaScale,
	DadsColorHue,
	DadsToken,
} from "@/core/tokens/types";
import {
	getContrastTextColor,
	transformToCircle,
} from "@/ui/semantic-role/circular-swatch-transformer";
import { renderBoundaryPills } from "@/ui/semantic-role/contrast-boundary-indicator";
import { applyOverlay } from "@/ui/semantic-role/semantic-role-overlay";
import { DEBOUNCE_DELAY_MS, debounce } from "../background-color-selector";
import {
	DEFAULT_MANUAL_KEY_COLOR,
	DEFAULT_MANUAL_SECONDARY_COLOR,
	DEFAULT_MANUAL_TERTIARY_COLOR,
} from "../constants";
import { buildManualShareUrl } from "../manual-url-state";
import {
	getActivePalette,
	parseKeyColor,
	persistBackgroundColors,
	persistManualColorSelection,
	state,
	validateBackgroundColor,
} from "../state";
import type {
	ColorDetailModalOptions,
	CVDType,
	ManualApplyTarget,
	PaletteConfig,
} from "../types";
import { clampAccentCount } from "../utils/palette-utils";

/**
 * マニュアル選択ビューのコールバック
 */
export interface ManualViewCallbacks {
	/** 色クリック時のコールバック（モーダル表示用） */
	onColorClick: (options: ColorDetailModalOptions) => void;
}

/**
 * 現在選択されている適用先（モジュールスコープ変数）
 *
 * 注: この変数はモジュールスコープで管理されている。
 * テスト時には必ず resetApplyTargetState() または setSelectedApplyTarget(null) で
 * リセットすること。
 */
let selectedApplyTarget: ManualApplyTarget | null = null;

/**
 * Stored reference for document-level popover click handler cleanup (prevents memory leak)
 */
let manualViewClickHandler: ((e: MouseEvent) => void) | null = null;

/**
 * 選択されている適用先を取得する
 */
export function getSelectedApplyTarget(): ManualApplyTarget | null {
	return selectedApplyTarget;
}

/**
 * 選択されている適用先を設定する
 */
export function setSelectedApplyTarget(target: ManualApplyTarget | null): void {
	selectedApplyTarget = target;
}

/**
 * 適用先状態をリセットする（テスト用）
 *
 * テストのbeforeEach/afterEachで呼び出し、
 * テスト間の状態汚染を防ぐ。
 */
export function resetApplyTargetState(): void {
	selectedApplyTarget = null;
}

/**
 * マニュアル選択ツールバーに色を適用する
 * スタジオビューのパレットとも連動する
 *
 * @param target 適用先
 * @param hex 適用する色のHEX値
 * @param onUpdate 状態更新後のコールバック
 */
export function applyColorToManualSelection(
	target: ManualApplyTarget,
	hex: string,
	onUpdate?: () => void,
): void {
	const selection = state.manualColorSelection;

	switch (target) {
		case "key":
			selection.keyColor = hex;
			// スタジオビューのPrimaryパレットも更新
			syncToStudioPalette("Primary", hex);
			break;
		case "secondary":
			selection.secondaryColor = hex;
			// スタジオビューのSecondaryパレットも更新
			syncToStudioPalette("Secondary", hex);
			break;
		case "tertiary":
			selection.tertiaryColor = hex;
			// スタジオビューのTertiaryパレットも更新
			syncToStudioPalette("Tertiary", hex);
			break;
		case "accent-1":
		case "accent-2":
		case "accent-3":
		case "accent-4": {
			const index = parseInt(target.split("-")[1] ?? "1", 10) - 1;
			// 配列を必要な長さまで拡張
			while (selection.accentColors.length <= index) {
				selection.accentColors.push(null);
			}
			selection.accentColors[index] = hex;
			// スタジオビューのAccentパレットも更新
			syncToStudioPalette(`Accent ${index + 1}`, hex);
			break;
		}
	}

	// 永続化
	persistManualColorSelection(selection);

	// 更新コールバック
	if (onUpdate) {
		onUpdate();
	}
}

/**
 * マニュアル選択からアクセントカラーを削除する
 *
 * 指定されたインデックスのアクセントをnullに設定し、
 * 対応するパレットも削除する。
 *
 * @param index アクセントのインデックス（0-3）
 * @param onUpdate 状態更新後のコールバック
 */
export function deleteAccentFromManualSelection(
	index: number,
	onUpdate?: () => void,
): void {
	const selection = state.manualColorSelection;

	// インデックス範囲チェック
	if (index < 0 || index >= selection.accentColors.length) {
		return;
	}

	// スロットをクリア
	selection.accentColors[index] = null;

	// state.palettesからも削除
	const accentName = `Accent ${index + 1}`;
	const paletteIndex = state.palettes.findIndex(
		(p) => p.name.toLowerCase() === accentName.toLowerCase(),
	);
	if (paletteIndex >= 0) {
		state.palettes.splice(paletteIndex, 1);
	}

	// studioAccentCount も同期（残っているアクセントの数を計算）
	const remainingAccents = selection.accentColors.filter(
		(c) => c !== null,
	).length;
	state.studioAccentCount = clampAccentCount(remainingAccents);

	// 永続化
	persistManualColorSelection(selection);

	// 更新コールバック
	if (onUpdate) {
		onUpdate();
	}
}

/**
 * パレット挿入位置を計算する
 *
 * パレット順序を維持するための挿入位置を返す:
 * Primary → Secondary → Tertiary → Accent 1-4
 *
 * @param paletteName パレット名
 * @returns 挿入インデックス（-1の場合は末尾にpush）
 */
function calculatePaletteInsertIndex(paletteName: string): number {
	// Accentパレットは末尾に追加
	if (paletteName.startsWith("Accent")) {
		return -1;
	}

	// 優先度順に検索する基準パレット名を定義
	// 各パレットは、その前に来るべきパレットの後に挿入される
	const insertionRules: Record<string, string[]> = {
		Primary: [], // Primary は常に先頭
		Secondary: ["primary"], // Secondary は Primary の後
		Tertiary: ["secondary", "primary"], // Tertiary は Secondary の後、なければ Primary の後
	};

	const searchOrder = insertionRules[paletteName];
	if (!searchOrder) {
		return 0; // 未知のパレットは先頭に
	}

	// 優先順位の高い基準パレットから順に検索
	for (const prefix of searchOrder) {
		const refIndex = state.palettes.findIndex((p) =>
			p.name.toLowerCase().startsWith(prefix),
		);
		if (refIndex >= 0) {
			return refIndex + 1;
		}
	}

	// 基準パレットが見つからない場合は先頭に
	return 0;
}

/**
 * スタジオビューのパレットにキーカラーを同期する
 *
 * @param paletteName パレット名（"Primary", "Secondary", "Tertiary", "Accent 1"など）
 * @param hex 同期する色のHEX値
 */
function syncToStudioPalette(paletteName: string, hex: string): void {
	const existingPalette = state.palettes.find((p) =>
		p.name.toLowerCase().startsWith(paletteName.toLowerCase()),
	);

	if (existingPalette) {
		// 既存パレットのkeyColorsを更新
		existingPalette.keyColors = [hex];
		// 色が変わったのでbaseChromaName/stepをクリア（renderManualViewで再計算される）
		existingPalette.baseChromaName = undefined;
		existingPalette.step = undefined;
		return;
	}

	// 新しいパレットを作成
	const timestamp = Date.now();
	const newPalette: PaletteConfig = {
		id: `manual-${paletteName.toLowerCase().replace(/\s+/g, "-")}-${timestamp}`,
		name: paletteName,
		keyColors: [hex],
		ratios: [21, 15, 10, 7, 4.5, 3, 1],
		harmony: "none" as HarmonyType,
	};

	// 挿入位置を計算
	const insertIndex = calculatePaletteInsertIndex(paletteName);

	if (insertIndex === -1) {
		// Accentパレットは末尾に追加
		state.palettes.push(newPalette);

		// studioAccentCountも更新（アクセント番号が現在のカウントより大きい場合）
		const accentNumber = parseInt(paletteName.replace("Accent ", ""), 10);
		if (!Number.isNaN(accentNumber) && accentNumber > state.studioAccentCount) {
			state.studioAccentCount = Math.min(4, accentNumber) as 2 | 3 | 4;
		}
	} else {
		// 計算された位置に挿入
		state.palettes.splice(insertIndex, 0, newPalette);
	}
}

/**
 * パレット名プレフィックスからキーカラーHEXを取得
 */
function getPaletteKeyColorHex(namePrefix: string): string | null {
	const palette = state.palettes.find((p) =>
		p.name.toLowerCase().startsWith(namePrefix.toLowerCase()),
	);
	if (!palette?.keyColors[0]) return null;
	return parseKeyColor(palette.keyColors[0]).color;
}

/**
 * スタジオパレットからマニュアル選択状態に同期する
 *
 * state.palettes に存在する Primary/Secondary/Tertiary/Accent パレットの
 * keyColors[0] を manualColorSelection に反映する。
 * これにより、スタジオビューで生成されたパレットがマニュアルビューに反映される。
 */
export function syncFromStudioPalettes(): void {
	const selection = state.manualColorSelection;

	// 背景色と文字色を同期
	selection.backgroundColor = state.lightBackgroundColor;
	selection.textColor = state.darkBackgroundColor;

	// Primary/Secondary/Tertiary
	selection.keyColor = getPaletteKeyColorHex("primary");
	selection.secondaryColor = getPaletteKeyColorHex("secondary");
	selection.tertiaryColor = getPaletteKeyColorHex("tertiary");

	// Accents: studioAccentCount に従って制限（常に4要素の配列として維持、超過分はnull）
	const accentCount = state.studioAccentCount;
	selection.accentColors = [1, 2, 3, 4].map((i) =>
		i <= accentCount ? getPaletteKeyColorHex(`accent ${i}`) : null,
	);

	// 永続化
	persistManualColorSelection(selection);
}

/** Link icon SVG markup for share button */
const LINK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;

/**
 * 空状態のメッセージを表示する
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
 * CVDシミュレーションを適用する
 */
function applySimulation(color: Color): Color {
	if (state.cvdSimulation === "normal") {
		return color;
	}
	return simulateCVD(color, state.cvdSimulation as CVDType);
}

/**
 * キーカラー役割の定義
 * P/S/T の役割名、短縮ラベル、日本語名を定義
 */
const KEY_COLOR_ROLE_DEFINITIONS = [
	{ name: "Primary", shortLabel: "P", label: "プライマリ" },
	{ name: "Secondary", shortLabel: "S", label: "セカンダリ" },
	{ name: "Tertiary", shortLabel: "T", label: "ターシャリ" },
] as const;

/**
 * Primary/Secondary/Tertiary キーカラースウォッチをレンダリングする
 *
 * DADSトークンに含まれない独自色のみ表示する。
 * DADSに含まれるキーカラーはDADSスケール内で円形表示される。
 *
 * @param callbacks コールバック関数
 * @param dadsTokens DADSトークン配列（DADS含有判定用）
 * @returns キーカラーセクション要素（表示すべき独自色がない場合はnull）
 */
function renderKeyColorSwatches(
	callbacks: ManualViewCallbacks,
	dadsTokens: DadsToken[],
): HTMLElement | null {
	// DADSに含まれない独自色のみをフィルタリング
	const nonDadsColors: Array<{
		palette: PaletteConfig;
		shortLabel: string;
		label: string;
	}> = [];

	for (const role of KEY_COLOR_ROLE_DEFINITIONS) {
		const palette = state.palettes.find((p) => p.name === role.name);
		if (!palette) continue;

		const hex = parseKeyColor(palette.keyColors[0] ?? "").color;
		const dadsMatch = findDadsColorByHex(dadsTokens, hex);
		if (!dadsMatch) {
			nonDadsColors.push({
				palette,
				shortLabel: role.shortLabel,
				label: role.label,
			});
		}
	}

	// 表示すべき独自色がない場合はnullを返す
	if (nonDadsColors.length === 0) {
		return null;
	}

	const section = document.createElement("section");
	section.className = "dads-key-colors-section";

	// 見出し
	const header = document.createElement("h2");
	header.className = "dads-section__heading";
	header.innerHTML = `
		<span class="dads-section__heading-en">Key Colors</span>
		<span class="dads-section__heading-ja">(キーカラー)</span>
	`;
	section.appendChild(header);

	// スウォッチコンテナ
	const swatchContainer = document.createElement("div");
	swatchContainer.className = "dads-key-colors-container";

	// 全キーカラーのHEX値とラベルを取得（モーダルのカラーシェード表示用）
	const allKeyColorHexes = nonDadsColors.map(
		({ palette }) => parseKeyColor(palette.keyColors[0] ?? "").color,
	);
	const allKeyColorLabels = nonDadsColors.map(({ label }) => label);

	// 独自色のみスウォッチを作成
	for (const [i, item] of nonDadsColors.entries()) {
		const { palette, shortLabel, label } = item;
		const swatch = createKeyColorSwatch(
			palette,
			shortLabel,
			label,
			callbacks,
			allKeyColorHexes,
			allKeyColorLabels,
			i,
		);
		swatchContainer.appendChild(swatch);
	}

	section.appendChild(swatchContainer);
	return section;
}

/**
 * キーカラー円形スウォッチを作成する
 *
 * @param palette パレット設定
 * @param shortLabel 短縮ラベル（P/S/T）
 * @param label 日本語ラベル
 * @param callbacks コールバック関数
 * @param allKeyColorHexes 全キーカラーのHEX値配列（モーダル表示用）
 * @param allKeyColorLabels 全キーカラーのラベル配列（モーダル名前切替用）
 * @param currentIndex 現在のキーカラーのインデックス
 * @returns スウォッチ要素
 */
function createKeyColorSwatch(
	palette: PaletteConfig,
	shortLabel: string,
	label: string,
	callbacks: ManualViewCallbacks,
	allKeyColorHexes: string[],
	allKeyColorLabels: string[],
	currentIndex: number,
): HTMLElement {
	const keyColor = palette.keyColors[0];
	const hex = keyColor ? parseKeyColor(keyColor).color : "#000000";

	const swatch = document.createElement("button");
	swatch.type = "button";
	swatch.className = "dads-key-color-swatch";
	swatch.style.backgroundColor = hex;
	swatch.dataset.testid = `key-color-${shortLabel.toLowerCase()}`;

	// テキスト色を背景色に基づいて決定
	const textColor = getContrastTextColor(hex);

	// ラベル（役割名）
	const labelEl = document.createElement("span");
	labelEl.className = "dads-key-color-swatch__label";
	labelEl.textContent = label;
	labelEl.style.color = textColor;
	swatch.appendChild(labelEl);

	// HEX値
	const hexEl = document.createElement("span");
	hexEl.className = "dads-key-color-swatch__hex";
	hexEl.textContent = hex.toUpperCase();
	hexEl.style.color = textColor;
	swatch.appendChild(hexEl);

	// アクセシビリティ属性
	swatch.setAttribute("aria-label", `${label} ${hex} の詳細を表示`);
	swatch.setAttribute("title", `${label}: ${hex}`);

	// クリックイベント - モーダルを表示
	swatch.addEventListener("click", () => {
		const stepColor = new Color(hex);
		const keyColorObj = new Color(hex);

		// 全キーカラーをColorオブジェクトに変換
		const allKeyColors = allKeyColorHexes.map((h) => new Color(h));

		callbacks.onColorClick({
			stepColor,
			keyColor: keyColorObj,
			index: currentIndex,
			fixedScale: {
				colors: allKeyColors,
				keyIndex: currentIndex,
				hexValues: allKeyColorHexes,
				names: allKeyColorLabels, // カスタムキーカラーのラベル配列
			},
			paletteInfo: {
				name: label,
				// カスタムキーカラーにはDADSトークン情報がないので渡さない
			},
			readOnly: true,
			originalHex: hex,
		});
	});

	return swatch;
}

/**
 * シェードビューをレンダリングする
 *
 * Requirements: 1.1, 5.5, 5.6 - シェードビューに背景色セレクターを統合する
 *
 * @param container レンダリング先のコンテナ要素
 * @param callbacks コールバック関数
 */
export async function renderManualView(
	container: HTMLElement,
	callbacks: ManualViewCallbacks,
): Promise<void> {
	// Studio View パレットから Manual View の選択状態を同期
	// これにより、Studio View で生成されたパレットがツールバーに反映される
	// Bug 1 対応: URL から復元された場合は同期をスキップ（初回のみ）
	if (state.manualColorRestoredFromUrl) {
		// フラグをリセット（次回以降は通常の同期を行う）
		state.manualColorRestoredFromUrl = false;
	} else {
		syncFromStudioPalettes();
	}

	// コンテナをクリアして前のビューのDOMが残らないようにする
	container.innerHTML = "";
	container.className = "dads-section";

	// Cleanup orphaned popovers from previous render (prevents DOM accumulation)
	for (const orphan of document.querySelectorAll(
		'.studio-swatch-popover[data-manual-view="true"]',
	)) {
		orphan.remove();
	}

	// Requirements: 5.5, 5.6 - ライト背景色をコンテナに適用
	container.style.backgroundColor = state.lightBackgroundColor;

	// アクティブなポップオーバーを追跡
	let activePopover: HTMLElement | null = null;

	// ポップオーバーを閉じるヘルパー
	const closeActivePopover = () => {
		if (activePopover) {
			activePopover.dataset.open = "false";
			activePopover = null;
		}
	};

	// Remove previous click handler to prevent memory leak from accumulating listeners
	if (manualViewClickHandler) {
		document.removeEventListener("click", manualViewClickHandler);
	}

	// ドキュメントクリックでポップオーバーを閉じる
	manualViewClickHandler = (e: MouseEvent) => {
		if (activePopover && !activePopover.contains(e.target as Node)) {
			closeActivePopover();
		}
	};
	document.addEventListener("click", manualViewClickHandler);

	// 色変更ハンドラを作成
	const handleBackgroundColorChange = (hex: string) => {
		state.lightBackgroundColor = hex;
		persistBackgroundColors(
			state.lightBackgroundColor,
			state.darkBackgroundColor,
		);
		container.style.backgroundColor = hex;

		// Update parent #main-content as well
		const mainContentEl = document.getElementById("main-content");
		if (mainContentEl) {
			mainContentEl.style.backgroundColor = hex;
		}

		void renderManualView(container, callbacks).catch((err) => {
			console.error("Failed to re-render manual view:", err);
		});
	};

	const handleTextColorChange = (hex: string) => {
		state.darkBackgroundColor = hex;
		persistBackgroundColors(
			state.lightBackgroundColor,
			state.darkBackgroundColor,
		);
		void renderManualView(container, callbacks).catch((err) => {
			console.error("Failed to re-render manual view:", err);
		});
	};

	// キーカラー変更ハンドラ（セカンダリー・ターシャリーを自動生成）
	const handleKeyColorChange = (hex: string) => {
		const keyColor = new Color(hex);
		// TRIADICハーモニーでセカンダリー・ターシャリーを生成
		const palette = generateHarmonyPalette(keyColor, HarmonyType.TRIADIC);

		// パレットからセカンダリー・ターシャリー（Accent）を取得
		const secondary = palette.find((c) => c.name === "Secondary");
		const tertiary = palette.find((c) => c.name === "Accent");

		// マニュアル選択状態を更新
		const selection = state.manualColorSelection;
		selection.keyColor = hex;
		selection.secondaryColor = secondary?.keyColor.toHex() ?? null;
		selection.tertiaryColor = tertiary?.keyColor.toHex() ?? null;

		// パレット同期
		applyColorToManualSelection("key", hex);
		if (selection.secondaryColor) {
			applyColorToManualSelection("secondary", selection.secondaryColor);
		}
		if (selection.tertiaryColor) {
			applyColorToManualSelection("tertiary", selection.tertiaryColor);
		}

		// 永続化
		persistManualColorSelection(selection);

		// ビューを再描画
		void renderManualView(container, callbacks).catch((err) => {
			console.error("Failed to re-render manual view:", err);
		});
	};

	// ====================================
	// 上部ヘッダーセクション（ラベル付きスウォッチ）
	// ====================================
	const headerSection = document.createElement("section");
	headerSection.className = "manual-header-swatches";
	headerSection.setAttribute("role", "region");
	headerSection.setAttribute("aria-label", "選択カラースウォッチ");
	headerSection.style.backgroundColor = state.lightBackgroundColor;

	// ヘッダーセクションの見出しを追加
	const headerHeading = document.createElement("h2");
	headerHeading.className = "manual-header-swatches__heading";
	headerHeading.textContent = "選択中カラー";
	headerSection.appendChild(headerHeading);

	// スウォッチを配置するコンテナを作成
	const swatchesContainer = document.createElement("div");
	swatchesContainer.className = "manual-header-swatches__swatches-container";

	// ====================================
	// 下部ツールバー（小さいスウォッチ + コントロール）
	// ====================================
	const toolbar = document.createElement("section");
	toolbar.className = "studio-toolbar studio-toolbar--manual";
	toolbar.setAttribute("role", "region");
	toolbar.setAttribute("aria-label", "マニュアル選択ツールバー");

	// ツールバーのスウォッチコンテナ
	const swatches = document.createElement("div");
	swatches.className = "studio-toolbar__swatches";

	// アクティブ状態を更新するヘルパー
	const updateActiveState = (
		clickedWrapper: HTMLElement,
		target: ManualApplyTarget | null,
	) => {
		// 全スウォッチからアクティブ状態を解除（ヘッダーセクション内を検索）
		for (const el of headerSection.querySelectorAll(
			".studio-toolbar-swatch--active",
		)) {
			el.classList.remove("studio-toolbar-swatch--active");
		}
		// クリックされたスウォッチをアクティブに
		if (target) {
			clickedWrapper.classList.add("studio-toolbar-swatch--active");
			selectedApplyTarget = target;
		} else {
			selectedApplyTarget = null;
		}
	};

	// 背景色・テキスト色用ポップオーバー付きスウォッチを作成
	const createColorSwatchWithPopover = (
		label: string,
		hex: string,
		onColorChange: (newHex: string) => void,
		isZoneEnd = false,
	): HTMLElement => {
		// ラッパー（スウォッチ + ラベル）
		const outerWrapper = document.createElement("div");
		outerWrapper.className = "studio-toolbar-swatch-wrapper";
		if (isZoneEnd) {
			outerWrapper.classList.add("studio-toolbar-swatch-wrapper--zone-end");
		}

		const swatch = document.createElement("div");
		swatch.className = "studio-toolbar-swatch";
		swatch.setAttribute("role", "button");
		swatch.setAttribute("tabindex", "0");
		swatch.setAttribute(
			"aria-label",
			`${label}: ${hex.toUpperCase()} - クリックして編集`,
		);
		swatch.style.cursor = "pointer";

		const circle = document.createElement("span");
		circle.className = "studio-toolbar-swatch__circle";
		circle.style.backgroundColor = hex;
		swatch.appendChild(circle);

		// ポップオーバー
		const popover = document.createElement("div");
		popover.className = "studio-swatch-popover";
		popover.dataset.open = "false";
		popover.dataset.manualView = "true"; // Mark for cleanup on re-render

		// ロールラベル
		const roleLabel = document.createElement("div");
		roleLabel.className = "studio-swatch-popover__role";
		roleLabel.textContent = label;
		popover.appendChild(roleLabel);

		// カラーピッカー行
		const colorRow = document.createElement("div");
		colorRow.className = "studio-swatch-popover__color-row";

		const colorPicker = document.createElement("input");
		colorPicker.type = "color";
		colorPicker.value = hex;
		colorPicker.className = "studio-swatch-popover__color-picker";
		colorPicker.setAttribute("aria-label", `${label}の色を選択`);
		colorPicker.onclick = (e) => e.stopPropagation();

		const hexInput = document.createElement("input");
		hexInput.type = "text";
		hexInput.className = "studio-swatch-popover__hex-input";
		hexInput.value = hex.toUpperCase();
		hexInput.setAttribute("aria-label", `${label}のカラーコード`);
		hexInput.onclick = (e) => e.stopPropagation();

		// エラー表示
		const errorArea = document.createElement("div");
		errorArea.className = "studio-swatch-popover__error";
		errorArea.setAttribute("role", "alert");

		// デバウンス付きHEX入力ハンドラ
		const handleHexChange = (input: unknown) => {
			const inputStr = String(input);
			const result = validateBackgroundColor(inputStr);
			if (result.valid && result.hex) {
				circle.style.backgroundColor = result.hex;
				colorPicker.value = result.hex;
				hexInput.classList.remove("studio-swatch-popover__hex-input--invalid");
				errorArea.textContent = "";
				onColorChange(result.hex);
			} else if (result.error) {
				hexInput.classList.add("studio-swatch-popover__hex-input--invalid");
				errorArea.textContent = result.error;
			}
		};
		const debouncedHexInput = debounce(handleHexChange, DEBOUNCE_DELAY_MS);

		colorPicker.oninput = (e) => {
			e.stopPropagation();
			const newHex = colorPicker.value;
			circle.style.backgroundColor = newHex;
			hexInput.value = newHex.toUpperCase();
			hexInput.classList.remove("studio-swatch-popover__hex-input--invalid");
			errorArea.textContent = "";
			onColorChange(newHex);
		};

		hexInput.oninput = (e) => {
			e.stopPropagation();
			debouncedHexInput(hexInput.value.trim());
		};

		hexInput.onblur = () => {
			const result = validateBackgroundColor(hexInput.value.trim());
			if (result.valid && result.hex) {
				hexInput.value = result.hex.toUpperCase();
				hexInput.classList.remove("studio-swatch-popover__hex-input--invalid");
			}
		};

		colorRow.appendChild(colorPicker);
		colorRow.appendChild(hexInput);
		popover.appendChild(colorRow);
		popover.appendChild(errorArea);

		// ポップオーバーをbodyに追加（position: fixedのため）
		document.body.appendChild(popover);

		// スウォッチクリックでポップオーバー表示
		swatch.onclick = (e) => {
			e.stopPropagation();
			if (activePopover === popover) {
				closeActivePopover();
				return;
			}
			closeActivePopover();
			const rect = swatch.getBoundingClientRect();
			// 一旦表示してサイズを取得
			popover.dataset.open = "true";
			const popoverRect = popover.getBoundingClientRect();
			const popoverWidth = popoverRect.width || 180; // フォールバック幅

			// 中央配置を基本として、画面端でクリップしないように調整
			let leftPos = rect.left + rect.width / 2 - popoverWidth / 2;
			const rightEdge = leftPos + popoverWidth;
			const viewportWidth = window.innerWidth;

			// 左端がはみ出す場合
			if (leftPos < 8) {
				leftPos = 8;
			}
			// 右端がはみ出す場合
			if (rightEdge > viewportWidth - 8) {
				leftPos = viewportWidth - popoverWidth - 8;
			}

			popover.style.top = `${rect.bottom + 8}px`;
			popover.style.left = `${leftPos}px`;
			activePopover = popover;
		};

		outerWrapper.appendChild(swatch);

		// ラベル
		const labelEl = document.createElement("span");
		labelEl.className = "studio-toolbar-swatch__label";
		labelEl.textContent = label;
		outerWrapper.appendChild(labelEl);

		return outerWrapper;
	};

	// 選択済みスウォッチを作成（ラベル付き）
	const createFilledSwatch = (
		label: string,
		hex: string,
		isZoneEnd = false,
		target?: ManualApplyTarget,
		onDelete?: () => void,
	): HTMLElement => {
		// ラッパー（スウォッチ + ラベル）
		const outerWrapper = document.createElement("div");
		outerWrapper.className = "studio-toolbar-swatch-wrapper";
		if (isZoneEnd) {
			outerWrapper.classList.add("studio-toolbar-swatch-wrapper--zone-end");
		}

		const swatch = document.createElement("div");
		swatch.className = "studio-toolbar-swatch";

		// ターゲットがある場合はクリック可能に
		if (target) {
			swatch.setAttribute("role", "button");
			swatch.setAttribute("tabindex", "0");
			swatch.setAttribute(
				"aria-label",
				`${label}: ${hex.toUpperCase()} - クリックして適用先に設定`,
			);
			swatch.title = `${label}: ${hex.toUpperCase()} - クリックして適用先に設定`;
			swatch.style.cursor = "pointer";
			// クリックハンドラ
			swatch.addEventListener("click", (e) => {
				// 削除ボタンがクリックされた場合は無視
				if (
					(e.target as HTMLElement).closest(".studio-toolbar-swatch__delete")
				) {
					return;
				}
				if (selectedApplyTarget === target) {
					// 同じターゲットを再クリックで解除
					updateActiveState(swatch, null);
				} else {
					updateActiveState(swatch, target);
				}
			});
			// 初期アクティブ状態を設定
			if (selectedApplyTarget === target) {
				swatch.classList.add("studio-toolbar-swatch--active");
			}
		} else {
			swatch.setAttribute("role", "img");
			swatch.setAttribute("aria-label", `${label}: ${hex.toUpperCase()}`);
			swatch.title = `${label}: ${hex.toUpperCase()}`;
		}

		const circle = document.createElement("span");
		circle.className = "studio-toolbar-swatch__circle";
		circle.style.backgroundColor = hex;
		swatch.appendChild(circle);

		// 削除ボタンを追加（コールバックが提供されている場合）
		if (onDelete) {
			const deleteBtn = document.createElement("button");
			deleteBtn.type = "button";
			deleteBtn.className = "studio-toolbar-swatch__delete";
			deleteBtn.setAttribute("aria-label", `${label}を削除`);
			deleteBtn.onclick = (e) => {
				e.stopPropagation();
				onDelete();
			};
			swatch.appendChild(deleteBtn);
		}

		outerWrapper.appendChild(swatch);

		// ラベル
		const labelEl = document.createElement("span");
		labelEl.className = "studio-toolbar-swatch__label";
		labelEl.textContent = label;
		outerWrapper.appendChild(labelEl);

		return outerWrapper;
	};

	// 未選択プレースホルダーを作成（ラベル付き）
	const createPlaceholderSwatch = (
		label: string,
		isZoneEnd = false,
		target?: ManualApplyTarget,
		isDisabled = false,
	): HTMLElement => {
		// ラッパー（スウォッチ + ラベル）
		const outerWrapper = document.createElement("div");
		outerWrapper.className = "studio-toolbar-swatch-wrapper";
		if (isZoneEnd) {
			outerWrapper.classList.add("studio-toolbar-swatch-wrapper--zone-end");
		}

		const swatch = document.createElement("div");
		swatch.className =
			"studio-toolbar-swatch studio-toolbar-swatch--placeholder";
		if (isDisabled) {
			swatch.classList.add("studio-toolbar-swatch--disabled");
		}

		// 無効化時とそうでない場合で属性を分ける
		if (!isDisabled && target) {
			swatch.setAttribute("role", "button");
			swatch.setAttribute("tabindex", "0");
			swatch.setAttribute(
				"aria-label",
				`${label}（未選択）- クリックして適用先に設定`,
			);
			swatch.title = `${label}（未選択）- クリックして適用先に設定`;
			swatch.style.cursor = "pointer";

			// クリックハンドラ
			swatch.addEventListener("click", () => {
				if (selectedApplyTarget === target) {
					// 同じターゲットを再クリックで解除
					updateActiveState(swatch, null);
				} else {
					updateActiveState(swatch, target);
				}
			});
			// 初期アクティブ状態を設定
			if (selectedApplyTarget === target) {
				swatch.classList.add("studio-toolbar-swatch--active");
			}
		} else {
			// 無効化時はクリック不可
			swatch.setAttribute("role", "img");
			swatch.setAttribute(
				"aria-label",
				`${label}（選択不可 - 前のスロットを先に選択してください）`,
			);
			swatch.title = `${label}（前のスロットを先に選択してください）`;
		}

		outerWrapper.appendChild(swatch);

		// ラベル
		const labelEl = document.createElement("span");
		labelEl.className = "studio-toolbar-swatch__label";
		labelEl.textContent = label;
		outerWrapper.appendChild(labelEl);

		return outerWrapper;
	};

	// ====================================
	// ヘッダーセクションにラベル付きスウォッチを追加
	// ====================================

	// 背景色スウォッチ（ポップオーバー付き）
	swatchesContainer.appendChild(
		createColorSwatchWithPopover(
			"背景色",
			state.lightBackgroundColor || "#ffffff",
			handleBackgroundColorChange,
			false,
		),
	);

	// テキスト色スウォッチ（ポップオーバー付き、zone-end）
	swatchesContainer.appendChild(
		createColorSwatchWithPopover(
			"文字色",
			state.darkBackgroundColor || "#000000",
			handleTextColorChange,
			true,
		),
	);

	// キーカラースウォッチ（ポップオーバー付き、編集可能）
	// キーカラーがない場合はデフォルト色を使用
	const primaryHex =
		state.manualColorSelection.keyColor || DEFAULT_MANUAL_KEY_COLOR;
	swatchesContainer.appendChild(
		createColorSwatchWithPopover(
			"キーカラー",
			primaryHex,
			handleKeyColorChange,
			false,
		),
	);

	// セカンダリースウォッチ（表示のみ、キーカラーから自動生成）
	const secondaryHex =
		state.manualColorSelection.secondaryColor || DEFAULT_MANUAL_SECONDARY_COLOR;
	swatchesContainer.appendChild(
		createFilledSwatch("セカンダリ", secondaryHex, false),
	);

	// ターシャリースウォッチ（表示のみ、キーカラーから自動生成、zone-end）
	const tertiaryHex =
		state.manualColorSelection.tertiaryColor || DEFAULT_MANUAL_TERTIARY_COLOR;
	swatchesContainer.appendChild(
		createFilledSwatch("ターシャリ", tertiaryHex, true),
	);

	// Accent 1〜4 スウォッチ（選択済み or プレースホルダー）
	// 連続選択制約: 常に4スロット表示、最初の空きスロットのみクリック可能
	const firstEmptyAccentIndex =
		state.manualColorSelection.accentColors.indexOf(null);

	// 常に4スロット表示（Studio Viewと統一）
	// 削除可能条件の計算用: 埋まっているアクセントの数と最後のインデックス
	const filledAccentIndices = state.manualColorSelection.accentColors
		.map((c, idx) => (c !== null ? idx : -1))
		.filter((idx) => idx !== -1);
	const filledAccentCount = filledAccentIndices.length;
	const lastFilledIndex =
		filledAccentIndices.length > 0
			? filledAccentIndices[filledAccentIndices.length - 1]
			: -1;

	for (let i = 1; i <= 4; i++) {
		const accentTarget = `accent-${i}` as ManualApplyTarget;
		// state.manualColorSelectionを直接参照（パレットは遅延生成される場合があるため）
		const accentHex = state.manualColorSelection.accentColors[i - 1];
		if (accentHex) {
			// 削除可能条件: 最後の非nullアクセント かつ アクセント数 > 2
			// (Studio Viewと同じルール: アクセント1,2は削除不可)
			const isLastFilled = i - 1 === lastFilledIndex;
			const canDelete = isLastFilled && filledAccentCount > 2;

			// 削除ハンドラを作成（クロージャでindexをキャプチャ）
			const deleteHandler = canDelete
				? () => {
						deleteAccentFromManualSelection(i - 1, () => {
							void renderManualView(container, callbacks);
						});
					}
				: undefined;
			swatchesContainer.appendChild(
				createFilledSwatch(
					`Acc${i}`,
					accentHex,
					false,
					accentTarget,
					deleteHandler,
				),
			);
		} else {
			// 連続選択制約: 最初の空きスロットのみクリック可能、それ以降は無効化
			const isDisabled =
				firstEmptyAccentIndex !== -1 && i - 1 > firstEmptyAccentIndex;
			swatchesContainer.appendChild(
				createPlaceholderSwatch(
					`Acc${i}`,
					false,
					isDisabled ? undefined : accentTarget,
					isDisabled,
				),
			);
		}
	}

	// スウォッチコンテナをヘッダーセクションに追加
	headerSection.appendChild(swatchesContainer);

	// ====================================
	// ヘッダーセクションをコンテナに追加
	// ====================================
	container.appendChild(headerSection);

	// ====================================
	// ツールバーに小さいスウォッチを追加（インジケーター用）
	// ====================================

	// 小さいスウォッチ作成ヘルパー（ラベルなし）
	const createSmallSwatch = (hex: string | null, isPlaceholder = false) => {
		const swatch = document.createElement("div");
		swatch.className = `studio-toolbar-swatch${isPlaceholder ? " studio-toolbar-swatch--placeholder" : ""}`;
		swatch.setAttribute("role", "img");
		const circle = document.createElement("span");
		circle.className = "studio-toolbar-swatch__circle";
		if (hex) {
			circle.style.backgroundColor = hex;
		}
		swatch.appendChild(circle);
		return swatch;
	};

	// 背景色・文字色インジケーター
	swatches.appendChild(
		createSmallSwatch(state.lightBackgroundColor || "#ffffff"),
	);
	swatches.appendChild(
		createSmallSwatch(state.darkBackgroundColor || "#000000"),
	);

	// キーカラー・セカンダリ・ターシャリインジケーター
	swatches.appendChild(
		createSmallSwatch(
			state.manualColorSelection.keyColor,
			!state.manualColorSelection.keyColor,
		),
	);
	swatches.appendChild(
		createSmallSwatch(
			state.manualColorSelection.secondaryColor,
			!state.manualColorSelection.secondaryColor,
		),
	);
	swatches.appendChild(
		createSmallSwatch(
			state.manualColorSelection.tertiaryColor,
			!state.manualColorSelection.tertiaryColor,
		),
	);

	// アクセントインジケーター
	for (const accentHex of state.manualColorSelection.accentColors) {
		swatches.appendChild(createSmallSwatch(accentHex, !accentHex));
	}

	// スウォッチとコントロール間のスペーサー
	const swatchSpacer = document.createElement("div");
	swatchSpacer.className = "studio-toolbar__swatch-spacer";
	swatchSpacer.setAttribute("aria-hidden", "true");
	swatches.appendChild(swatchSpacer);

	const controls = document.createElement("div");
	controls.className = "studio-toolbar__controls";

	// 共有リンクボタン
	const shareBtn = document.createElement("button");
	shareBtn.type = "button";
	shareBtn.className = "studio-share-btn dads-button";
	shareBtn.dataset.size = "sm";
	shareBtn.dataset.type = "text";
	shareBtn.innerHTML = `${LINK_ICON_SVG}共有リンク`;
	shareBtn.onclick = async () => {
		// Manual Viewの状態をURLに含める
		const url = buildManualShareUrl(state.manualColorSelection);
		try {
			await navigator.clipboard.writeText(url);
			const originalHTML = shareBtn.innerHTML;
			shareBtn.textContent = "コピー完了";
			setTimeout(() => {
				shareBtn.innerHTML = originalHTML;
			}, 2000);
		} catch {
			shareBtn.textContent = "コピー失敗";
			setTimeout(() => {
				shareBtn.innerHTML = `${LINK_ICON_SVG}共有リンク`;
			}, 2000);
		}
	};

	// エクスポートボタン（Material Symbolアイコン付き）
	const exportBtn = document.createElement("button");
	exportBtn.type = "button";
	exportBtn.className = "studio-export-btn dads-button";
	exportBtn.dataset.size = "sm";
	exportBtn.dataset.type = "outline";
	exportBtn.innerHTML = `<span class="material-symbols-outlined btn-icon">ios_share</span>エクスポート`;
	exportBtn.onclick = () => {
		const exportDialog = document.getElementById(
			"export-dialog",
		) as HTMLDialogElement | null;
		if (exportDialog) exportDialog.showModal();
	};

	controls.appendChild(shareBtn);
	controls.appendChild(exportBtn);
	toolbar.appendChild(swatches);
	toolbar.appendChild(controls);
	container.appendChild(toolbar);

	const loadingEl = document.createElement("div");
	loadingEl.className = "dads-loading";
	loadingEl.textContent = "DADSカラーを読み込み中...";
	container.appendChild(loadingEl);

	try {
		const dadsTokens = await loadDadsTokens();
		const chromaticScales = getAllDadsChromatic(dadsTokens);
		// 再レンダー競合対策: loadingElが既に削除されている可能性があるため存在確認
		if (loadingEl.isConnected) {
			container.removeChild(loadingEl);
		}

		// Primary/Secondary/Tertiary キーカラースウォッチセクション
		// DADSに含まれない独自色のみ表示する
		const keyColorSection = renderKeyColorSwatches(callbacks, dadsTokens);
		if (keyColorSection) {
			container.appendChild(keyColorSection);
		}

		// Task 4.2: ロールマッピング生成
		// Manual Viewでは常にstate.palettesを使用
		// （applyColorToManualSelection()でsyncToStudioPalette()が呼ばれ、
		//  state.palettesに新しいパレットが追加されるため）
		// state.shadesPalettesはStudio View専用
		const palettesForRoleMapping = state.palettes;

		// baseChromaNameまたはstepが未設定のパレットを更新（Manual Viewで適用した色のため）
		// roleMapperはbaseChromaNameとstepの両方が必要（role-mapper.ts line 246）
		for (const palette of palettesForRoleMapping) {
			if (
				(!palette.baseChromaName || palette.step === undefined) &&
				palette.keyColors[0]
			) {
				const parsed = parseKeyColor(palette.keyColors[0]);
				const dadsMatch = findDadsColorByHex(dadsTokens, parsed.color);
				if (dadsMatch) {
					palette.baseChromaName = dadsMatch.hue;
					palette.step = dadsMatch.scale;
				}
			}
		}

		// PaletteInfo形式に変換（UI層→Core層の最小情報）
		const palettesInfo: PaletteInfo[] = palettesForRoleMapping.map((p) => ({
			name: p.name,
			baseChromaName: p.baseChromaName,
			step: p.step,
		}));

		// 現在のハーモニー種別を取得（アクティブパレットのharmony）
		const activePalette = getActivePalette();
		const harmonyType: HarmonyType | string = activePalette?.harmony ?? "dads";

		// SemanticRoleMapperを生成
		const roleMapper = createSemanticRoleMapper(palettesInfo, harmonyType);

		// ブランドカラーのDADSトークン含有判定
		let brandDadsMatch:
			| { hue: DadsColorHue; scale: DadsChromaScale; token: DadsToken }
			| undefined;
		let brandHex: string | undefined;

		if (activePalette?.keyColors[0]) {
			const parsed = parseKeyColor(activePalette.keyColors[0]);
			brandHex = parsed.color;
			brandDadsMatch = findDadsColorByHex(dadsTokens, brandHex);
		}

		// Note: Key Colorsセクションで非DADSキーカラーを表示するため、
		// renderPrimaryBrandSectionは呼び出さない（重複を避けるため）

		// プリミティブカラーセクションの見出しを追加
		const primitiveHeading = document.createElement("h2");
		primitiveHeading.className = "dads-section__heading";
		primitiveHeading.innerHTML = `
			<span class="dads-section__heading-en">Primitive Colors</span>
			<span class="dads-section__heading-ja">(プリミティブカラー)</span>
		`;
		container.appendChild(primitiveHeading);

		// 各色相のセクションを描画（Task 4.3: オーバーレイ適用のためにroleMapperを渡す）
		// brandDadsMatchがある場合は該当スウォッチを円形化
		for (const colorScale of chromaticScales) {
			renderDadsHueSection(
				container,
				colorScale,
				roleMapper,
				callbacks,
				brandDadsMatch,
			);
		}
	} catch (error) {
		console.error("Failed to load DADS tokens:", error);
		// loadingElが既にDOMから削除されている可能性があるため、存在確認してから削除
		if (loadingEl.isConnected) {
			container.removeChild(loadingEl);
		}
		renderEmptyState(container, "シェード（読み込みエラー）");
	}
}

/**
 * セマンティックロールから日本語表示名を生成する
 *
 * 現在サポートするカテゴリ: primary, accent, secondary
 * TODO: semantic, link等の追加カテゴリが必要になった場合は
 *       SemanticRoleCategory型に合わせて拡張する
 *
 * @param role - セマンティックロール
 * @returns 日本語表示名
 */
function getRoleDisplayName(role: SemanticRole): string {
	switch (role.category) {
		case "primary":
			return "プライマリーカラー";
		case "accent": {
			// アクセント番号を抽出（例: "Accent 2" → "2"）
			// 番号が見つからない場合は "1" をデフォルトとする
			// （単一アクセントの場合や番号なしロール名に対応）
			const match = role.name.match(/\d+/);
			const num = match ? match[0] : "1";
			return `アクセントカラー ${num}`;
		}
		case "secondary":
			return "セカンダリーカラー";
		default:
			// 未知のカテゴリはfullNameまたはnameをそのまま使用
			return role.fullName || role.name;
	}
}

/**
 * 色相セクションを描画
 *
 * @param container - 描画先コンテナ
 * @param colorScale - 色相スケール情報
 * @param roleMapper - セマンティックロールマッパー
 * @param callbacks - コールバック
 * @param brandDadsMatch - ブランドカラーがDADSに含まれる場合のマッチ情報（オプション）
 */
export function renderDadsHueSection(
	container: HTMLElement,
	colorScale: DadsColorScale,
	roleMapper: SemanticRoleMapperService | undefined,
	callbacks: ManualViewCallbacks,
	brandDadsMatch?: {
		hue: DadsColorHue;
		scale: DadsChromaScale;
		token: DadsToken;
	},
): void {
	const section = document.createElement("section");
	section.className = "dads-hue-section";

	const header = document.createElement("h2");
	header.className = "dads-section__heading";
	header.innerHTML = `
		<span class="dads-section__heading-en">${colorScale.hueName.en}</span>
		<span class="dads-section__heading-ja">(${colorScale.hueName.ja})</span>
	`;
	section.appendChild(header);

	const scaleContainer = document.createElement("div");
	scaleContainer.className = "dads-scale";

	// Task 10.4: コントラスト境界表示用のscale→スウォッチ要素マップ
	const scaleElements = new Map<number, HTMLElement>();

	for (const colorItem of colorScale.colors) {
		const swatch = document.createElement("button");
		swatch.type = "button";
		swatch.className = "dads-swatch dads-swatch--readonly";

		// Task 4.1: data属性とdata-testidを追加（E2Eテスト・オーバーレイ統合用）
		swatch.dataset.hue = colorScale.hue;
		swatch.dataset.scale = String(colorItem.scale);
		swatch.dataset.testid = `swatch-${colorScale.hue}-${colorItem.scale}`;

		const originalColor = new Color(colorItem.hex);
		const displayColor = applySimulation(originalColor);
		swatch.style.backgroundColor = displayColor.toCss();

		const textColor = getContrastTextColor(colorItem.hex);

		const scaleLabel = document.createElement("span");
		scaleLabel.className = "dads-swatch__scale";
		scaleLabel.style.color = textColor;
		scaleLabel.textContent = String(colorItem.scale);
		swatch.appendChild(scaleLabel);

		const hexLabel = document.createElement("span");
		hexLabel.className = "dads-swatch__hex";
		hexLabel.style.color = textColor;
		hexLabel.textContent = colorItem.hex.toUpperCase();
		swatch.appendChild(hexLabel);

		swatch.setAttribute(
			"aria-label",
			`${colorScale.hueName.en} ${colorItem.scale}: ${colorItem.hex}`,
		);
		swatch.setAttribute(
			"title",
			`${colorItem.hex} - ${colorItem.token.nameJa}`,
		);
		swatch.style.cursor = "pointer";
		swatch.onclick = () => {
			const stepColor = new Color(colorItem.hex);

			// colorScale.colorsは50→1200の順（明→暗）
			// STEP_NAMESは1200→50の順（暗→明）なので逆順にする
			const reversedColors = [...colorScale.colors].reverse();
			const scaleColors = reversedColors.map((c) => new Color(c.hex));
			const hexValues = reversedColors.map((c) => c.hex);

			// クリックされた色のインデックスを計算（reverse後）
			const originalIndex = colorScale.colors.findIndex(
				(c) => c.scale === colorItem.scale,
			);
			const index =
				originalIndex >= 0 ? colorScale.colors.length - 1 - originalIndex : 0;

			// 代表色としてステップ600を使用（なければクリックした色）
			const keyColorItem =
				colorScale.colors.find((c) => c.scale === 600) || colorItem;
			const keyColor = new Color(keyColorItem.hex);

			// Issue #41: 役割がある場合は役割名、ない場合はトークン名を表示
			let displayName = `${colorScale.hue}-${colorItem.scale}`;
			if (roleMapper) {
				const roles = roleMapper.lookupRoles(
					colorScale.hue as DadsColorHue,
					colorItem.scale,
				);
				// 防御的チェック: roles[0]の存在確認は型安全性のため
				// （lookupRolesが空配列以外でundefined要素を返す可能性に備える）
				if (roles.length > 0 && roles[0]) {
					displayName = getRoleDisplayName(roles[0]);
				}
			}

			callbacks.onColorClick({
				stepColor,
				keyColor,
				index,
				fixedScale: { colors: scaleColors, keyIndex: index, hexValues },
				originalHex: colorItem.hex,
				paletteInfo: {
					name: displayName,
					baseChromaName: colorScale.hueName.en,
				},
				readOnly: true,
				showApplySection: true,
				onApply: () => {
					// ツールバーを再描画して適用結果を反映
					void renderManualView(container, callbacks);
				},
				preSelectedTarget: selectedApplyTarget ?? undefined,
			});
		};

		// Task 4.3: セマンティックロールのオーバーレイを適用
		// colorScale.hueはDadsColorHue型として直接使用
		// lookupRolesはDADS+ブランド統合済みロールを返却（hue-scale特定可能なブランドロールを含む）
		// セマンティックロールのオーバーレイ適用とロール名表示
		if (roleMapper) {
			const roles = roleMapper.lookupRoles(
				colorScale.hue as DadsColorHue,
				colorItem.scale,
			);
			if (roles.length > 0) {
				applyOverlay(
					swatch,
					colorScale.hue as DadsColorHue,
					colorItem.scale,
					roles,
					false,
					colorItem.hex,
				);
			}
		}

		// Issue #39: DADSトークンに含まれるブランドカラーを円形化
		// 注: applyOverlayで既に円形化されている場合はスキップ（二重円形化防止）
		if (
			brandDadsMatch &&
			brandDadsMatch.hue === colorScale.hue &&
			brandDadsMatch.scale === colorItem.scale &&
			!swatch.classList.contains("dads-swatch--circular")
		) {
			const primaryRole: SemanticRole = {
				name: "Primary",
				category: "primary",
				fullName: "[プライマリー] Primary",
				shortLabel: "P",
			};
			transformToCircle(swatch, primaryRole, colorItem.hex);
			swatch.dataset.brandPrimary = "true";
		}

		scaleContainer.appendChild(swatch);

		// Task 10.4: スウォッチ要素をマップに追加（コントラスト境界表示用）
		scaleElements.set(colorItem.scale, swatch);
	}

	section.appendChild(scaleContainer);

	// sectionをDOMに追加（コントラスト境界ピルの位置計算のため先に追加が必要）
	container.appendChild(section);

	// Task 10.4: コントラスト境界表示を追加
	// 注: renderBoundaryPillsはgetBoundingClientRect()を使用するため、
	// sectionがDOMに追加された後に呼び出す必要がある
	const colorItems = colorScale.colors.map((item) => ({
		scale: item.scale,
		hex: item.hex,
	}));
	// ライト/ダーク背景色を渡してコントラスト境界を計算
	const boundaries = calculateBoundaries(
		colorItems,
		state.lightBackgroundColor,
		state.darkBackgroundColor,
	);
	const boundaryContainer = renderBoundaryPills(boundaries, scaleElements);
	section.appendChild(boundaryContainer);
}

/**
 * DADSトークンに含まれないブランドカラーのプライマリーセクションを描画
 *
 * Issue #39: シェード一覧の最上部に「プライマリー」見出しセクション追加
 * 単一スウォッチのみ表示（シェード不要）
 *
 * @param container - 描画先コンテナ
 * @param brandHex - ブランドカラーのHEX値
 * @param brandName - ブランド名
 * @param roleMapper - セマンティックロールマッパー
 * @param callbacks - コールバック
 */
export function renderPrimaryBrandSection(
	container: HTMLElement,
	brandHex: string,
	brandName: string,
	roleMapper: SemanticRoleMapperService | undefined,
	_callbacks: ManualViewCallbacks,
): void {
	const section = document.createElement("section");
	section.className = "dads-primary-section";

	const header = document.createElement("h2");
	header.className = "dads-section__heading";
	header.innerHTML = `
		<span class="dads-section__heading-en">Primary</span>
		<span class="dads-section__heading-ja">(プライマリー)</span>
	`;
	section.appendChild(header);

	const swatchContainer = document.createElement("div");
	swatchContainer.className = "dads-primary-swatch-container";

	const swatch = document.createElement("button");
	swatch.type = "button";
	swatch.className = "dads-swatch dads-swatch--circular dads-swatch--primary";

	// data-testidを追加（E2Eテスト用）
	swatch.dataset.testid = "swatch-primary";
	swatch.dataset.brandPrimary = "true";

	const originalColor = new Color(brandHex);
	const displayColor = applySimulation(originalColor);
	swatch.style.backgroundColor = displayColor.toCss();

	const textColor = getContrastTextColor(brandHex);

	// 「プライマリ」ラベルを追加
	const roleLabel = document.createElement("span");
	roleLabel.className = "dads-swatch__role-label";
	roleLabel.textContent = "プライマリ";
	roleLabel.style.color = textColor;
	swatch.appendChild(roleLabel);

	// HEX値ラベル
	const hexLabel = document.createElement("span");
	hexLabel.className = "dads-swatch__hex";
	hexLabel.style.color = textColor;
	hexLabel.textContent = brandHex.toUpperCase();
	swatch.appendChild(hexLabel);

	// title属性を設定（ツールチップ用）
	swatch.setAttribute("title", `${brandName}: ${brandHex.toUpperCase()}`);
	swatch.setAttribute(
		"aria-label",
		`プライマリーカラー ${brandName}: ${brandHex}`,
	);

	// 未解決ブランドロールのオーバーレイ適用
	if (roleMapper) {
		const brandRoles = roleMapper.lookupUnresolvedBrandRoles();
		if (brandRoles.length > 0) {
			applyOverlay(swatch, undefined, undefined, brandRoles, true, brandHex);
		}
	}

	swatchContainer.appendChild(swatch);
	section.appendChild(swatchContainer);

	container.appendChild(section);
}

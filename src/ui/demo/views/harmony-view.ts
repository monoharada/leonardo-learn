/**
 * ハーモニービューモジュール
 *
 * ハーモニー選択画面のレンダリングを担当する。
 * HARMONY_TYPES定数を使用してハーモニー選択UIを構築する。
 *
 * @module @/ui/demo/views/harmony-view
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { simulateCVD } from "@/accessibility/cvd-simulator";
import { Color } from "@/core/color";
import { generateSystemPalette, HarmonyType } from "@/core/harmony";
import {
	createCudBadge,
	createCudModeSelector,
	createCudRangeGuide,
	snapToCudColor,
} from "@/ui/cud-components";
import { HARMONY_TYPES } from "../constants";
import { state } from "../state";
import type {
	ColorDetailModalOptions,
	CVDType,
	HarmonyTypeConfig,
} from "../types";

/**
 * ハーモニービューのコールバック
 */
export interface HarmonyViewCallbacks {
	/** ハーモニー選択時のコールバック */
	onHarmonySelect: (config: HarmonyTypeConfig) => void;
	/** 色クリック時のコールバック（モーダル表示用、将来の拡張用） */
	onColorClick: (options: ColorDetailModalOptions) => void;
}

/**
 * ハーモニービューをレンダリングする
 *
 * @param container レンダリング先のコンテナ要素
 * @param keyColorHex キーカラーのHEX値
 * @param callbacks コールバック関数
 */
export function renderHarmonyView(
	container: HTMLElement,
	keyColorHex: string,
	callbacks: HarmonyViewCallbacks,
): void {
	const { onHarmonySelect } = callbacks;
	// onColorClickは将来の拡張用（スウォッチクリック時のモーダル表示等）
	// 現在のハーモニービューでは行クリックでハーモニー選択のみ

	// 入力カラーをパース（無効な場合はデフォルト色）
	const inputHex = /^#[0-9A-Fa-f]{6}$/.test(keyColorHex)
		? keyColorHex
		: "#3366cc";
	const primaryColor = new Color(inputHex);

	// ヘッダーセクション（Brand Color入力 + CUDモードセレクター）
	const header = createHeader(inputHex, container, callbacks);

	// 説明文
	const description = document.createElement("div");
	description.className = "dads-section__description";
	description.innerHTML =
		"<p>ハーモニースタイルを選択してください。見出しをクリックすると、そのスタイルでパレットを生成します。</p>";

	// CUDモードがoff以外の場合はガイドを表示
	let cudGuide: HTMLElement | null = null;
	if (state.cudMode !== "off") {
		cudGuide = createCudRangeGuide();
	}

	// ハーモニーリスト
	const harmonyList = createHarmonyList(primaryColor, onHarmonySelect);

	// コンテナに要素を追加
	container.innerHTML = "";
	container.appendChild(header);
	container.appendChild(description);
	if (cudGuide) {
		container.appendChild(cudGuide);
	}
	container.appendChild(harmonyList);
}

/**
 * ヘッダーセクションを作成する
 */
function createHeader(
	inputHex: string,
	container: HTMLElement,
	callbacks: HarmonyViewCallbacks,
): HTMLElement {
	const header = document.createElement("div");
	header.className = "dads-harmony-header";

	// Brand Color入力
	const colorInput = document.createElement("div");
	colorInput.className = "dads-harmony-header__input";

	const colorLabel = document.createElement("label");
	colorLabel.className = "dads-label";
	colorLabel.textContent = "Brand Color";
	colorLabel.htmlFor = "harmony-color-input";

	const inputRow = document.createElement("div");
	inputRow.className = "dads-form-row";

	// テキスト入力
	const colorText = document.createElement("input");
	colorText.type = "text";
	colorText.id = "harmony-color-input";
	colorText.className = "dads-input";
	colorText.value = inputHex;
	colorText.placeholder = "#3366cc";
	colorText.pattern = "^#[0-9A-Fa-f]{6}$";

	// カラーピッカー
	const colorPicker = document.createElement("input");
	colorPicker.type = "color";
	colorPicker.id = "harmony-color-picker";
	colorPicker.className = "dads-input dads-input--color";
	colorPicker.value = inputHex;

	// カラー入力の同期とカード更新
	const updateColor = (hex: string, source: "picker" | "text") => {
		if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;

		if (source === "picker") {
			colorText.value = hex;
		} else {
			colorPicker.value = hex;
		}

		// hidden inputも更新
		const keyColorsInput = document.getElementById(
			"keyColors",
		) as HTMLInputElement | null;
		if (keyColorsInput) {
			keyColorsInput.value = hex;
		}

		// ハーモニーカードを再レンダリング
		renderHarmonyView(container, hex, callbacks);
	};

	// カラーピッカーのイベント
	colorPicker.addEventListener("input", (e) => {
		e.stopPropagation();
		const hex = (e.target as HTMLInputElement).value;
		colorText.value = hex;
	});

	colorPicker.addEventListener("change", (e) => {
		e.stopPropagation();
		updateColor((e.target as HTMLInputElement).value, "picker");
	});

	colorPicker.addEventListener("click", (e) => {
		e.stopPropagation();
	});

	colorPicker.addEventListener("mousedown", (e) => {
		e.stopPropagation();
	});

	colorText.addEventListener("input", (e) => {
		const value = (e.target as HTMLInputElement).value;
		if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
			updateColor(value, "text");
		}
	});

	// 要素の組み立て
	inputRow.appendChild(colorText);
	inputRow.appendChild(colorPicker);
	colorInput.appendChild(colorLabel);
	colorInput.appendChild(inputRow);
	header.appendChild(colorInput);

	// CUDモードセレクター
	const cudModeSelector = createCudModeSelector((mode) => {
		state.cudMode = mode;
		renderHarmonyView(container, colorText.value, callbacks);
	}, state.cudMode);
	header.appendChild(cudModeSelector);

	return header;
}

/**
 * ハーモニーリストを作成する
 */
function createHarmonyList(
	primaryColor: Color,
	onHarmonySelect: (config: HarmonyTypeConfig) => void,
): HTMLElement {
	const harmonyList = document.createElement("div");
	harmonyList.className = "dads-harmony-list";

	for (const harmony of HARMONY_TYPES) {
		const section = createHarmonyRow(primaryColor, harmony, onHarmonySelect);
		harmonyList.appendChild(section);
	}

	return harmonyList;
}

/**
 * ハーモニー行を作成する
 */
function createHarmonyRow(
	primaryColor: Color,
	harmony: HarmonyTypeConfig,
	onHarmonySelect: (config: HarmonyTypeConfig) => void,
): HTMLElement {
	// 実際のハーモニーパレットを生成
	const palettes = generateSystemPalette(primaryColor, harmony.harmonyType);

	// 現在選択されているかどうか
	const isSelected = state.selectedHarmonyConfig?.id === harmony.id;

	// ハーモニーセクション（全体がクリック可能）
	const section = document.createElement("button");
	section.type = "button";
	section.className = "dads-harmony-row";
	if (isSelected) {
		section.dataset.selected = "true";
	}

	// 見出し
	const heading = createHarmonyHeading(harmony, palettes.length);

	// セクションクリックでハーモニー選択
	section.onclick = () => {
		state.selectedHarmonyConfig = harmony;

		const harmonyInput = document.getElementById("harmony") as HTMLInputElement;
		if (harmonyInput) {
			harmonyInput.value = harmony.harmonyType;
		}

		onHarmonySelect(harmony);
	};

	// スウォッチ
	const swatches = createSwatches(palettes, harmony.harmonyType);

	// カード構成
	section.appendChild(heading);
	section.appendChild(swatches);

	return section;
}

/**
 * ハーモニー見出しを作成する
 */
function createHarmonyHeading(
	harmony: HarmonyTypeConfig,
	paletteCount: number,
): HTMLElement {
	const heading = document.createElement("div");
	heading.className = "dads-harmony-row__heading";

	const headingMain = document.createElement("div");
	headingMain.className = "dads-harmony-row__heading-main";

	const headingText = document.createElement("span");
	headingText.className = "dads-harmony-row__name";
	headingText.textContent = harmony.name;

	const headingMeta = document.createElement("span");
	headingMeta.className = "dads-harmony-row__meta";
	headingMeta.textContent = `${harmony.description}（${paletteCount}色）`;

	headingMain.appendChild(headingText);
	headingMain.appendChild(headingMeta);

	const headingDetail = document.createElement("p");
	headingDetail.className = "dads-harmony-row__detail";
	headingDetail.textContent = harmony.detail;

	heading.appendChild(headingMain);
	heading.appendChild(headingDetail);

	return heading;
}

/**
 * スウォッチを作成する
 */
function createSwatches(
	palettes: { name: string; keyColor: Color }[],
	harmonyType: HarmonyType,
): HTMLElement {
	const swatches = document.createElement("div");
	swatches.className = "dads-harmony-row__swatches";

	// DADSの場合は主要なセマンティックカラーのみ表示
	let displayPalettes: typeof palettes;
	if (harmonyType === HarmonyType.DADS) {
		const semanticNames = [
			"primary",
			"secondary",
			"accent",
			"success",
			"error",
			"warning",
			"info",
		];
		displayPalettes = palettes
			.filter((p) => {
				const name = p.name.toLowerCase();
				return semanticNames.some(
					(s) => name === s || name.startsWith(`${s}-`),
				);
			})
			.filter((p, i, arr) => {
				// 各カテゴリから最初の1つだけ
				const name = p.name.toLowerCase().split("-")[0];
				return (
					arr.findIndex((x) => x.name.toLowerCase().split("-")[0] === name) ===
					i
				);
			});
	} else {
		const maxSwatches = 8;
		displayPalettes = palettes.slice(0, maxSwatches);
	}

	for (const palette of displayPalettes) {
		const swatchContainer = document.createElement("span");
		swatchContainer.className = "dads-harmony-row__swatch-container";
		swatchContainer.style.cssText =
			"display: inline-flex; flex-direction: column; align-items: center; gap: 2px;";

		const swatch = document.createElement("span");
		swatch.className = "dads-harmony-row__swatch";

		// strictモードの場合はCUD推奨色にスナップ
		let displayHex = palette.keyColor.toHex();
		if (state.cudMode === "strict") {
			const snapResult = snapToCudColor(displayHex, { mode: "strict" });
			displayHex = snapResult.hex;
		}

		// CVDシミュレーションを適用
		const displayColor =
			state.cvdSimulation === "normal"
				? new Color(displayHex)
				: simulateCVD(new Color(displayHex), state.cvdSimulation as CVDType);
		swatch.style.background = displayColor.toHex();
		swatch.title =
			state.cudMode === "strict"
				? `${palette.name}: ${displayHex} (スナップ済み、元: ${palette.keyColor.toHex()})`
				: `${palette.name}: ${palette.keyColor.toHex()}`;
		swatchContainer.appendChild(swatch);

		// CUDモードがoff以外の場合はバッジを追加
		if (state.cudMode !== "off") {
			const badge = createCudBadge(displayHex);
			badge.style.marginTop = "4px";
			swatchContainer.appendChild(badge);
		}

		swatches.appendChild(swatchContainer);
	}

	return swatches;
}

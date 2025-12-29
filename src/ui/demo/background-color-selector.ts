/**
 * 背景色セレクターコンポーネント
 *
 * カラーピッカーとHEX入力フィールドを提供し、
 * 背景色選択UIを集約するコンポーネント。
 *
 * @module @/ui/demo/background-color-selector
 * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 2.1, 2.2, 4.1, 4.2, 4.4
 */

import { validateBackgroundColor } from "./state";

/**
 * デバウンス遅延時間（ミリ秒）
 * Requirements: 4.2 - HEX入力時にデバウンス処理（150ms）を適用
 */
export const DEBOUNCE_DELAY_MS = 150;

/**
 * デバウンス関数
 *
 * 指定された遅延時間後に関数を実行する。
 * 遅延中に再度呼び出された場合、タイマーをリセットする。
 *
 * Requirements: 4.2, 4.4
 * @param fn 実行する関数
 * @param delay 遅延時間（ミリ秒）
 * @returns デバウンスされた関数
 */
export function debounce<T extends (...args: unknown[]) => void>(
	fn: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>): void => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => {
			fn(...args);
			timeoutId = null;
		}, delay);
	};
}

/**
 * 背景色セレクターのプロパティ
 * @see .kiro/specs/background-color-change/design.md BackgroundColorSelectorProps
 */
export interface BackgroundColorSelectorProps {
	/** 現在の背景色（HEX） */
	currentColor: string;
	/** 色変更時のコールバック */
	onColorChange: (hex: string) => void;
	/** 詳細モード表示フラグ */
	showAdvancedMode?: boolean;
}

/**
 * カラーモード型
 * @see .kiro/specs/background-color-change/design.md ColorMode
 */
export type ColorMode = "light" | "dark";

/**
 * プリセットカラー型
 * @see .kiro/specs/background-color-change/design.md PresetColor
 * Requirements: 2.1
 */
export interface PresetColor {
	/** プリセット名 */
	name: string;
	/** HEX値 */
	hex: string;
	/** 対応するモード */
	mode: ColorMode;
}

/**
 * プリセット背景色の定義
 * Requirements: 2.1, 2.2
 * @see .kiro/specs/background-color-change/design.md PRESET_COLORS
 */
export const PRESET_COLORS: PresetColor[] = [
	{ name: "White", hex: "#ffffff", mode: "light" },
	{ name: "Light Gray", hex: "#f8fafc", mode: "light" },
	{ name: "Dark Gray", hex: "#18181b", mode: "dark" },
	{ name: "Black", hex: "#000000", mode: "dark" },
];

/**
 * ユニークIDを生成するカウンター
 */
let idCounter = 0;

/**
 * 背景色セレクターコンポーネントを作成する
 *
 * @param props セレクターのプロパティ
 * @returns セレクターのDOM要素
 * @see Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 2.1, 2.2
 */
export function createBackgroundColorSelector(
	props: BackgroundColorSelectorProps,
): HTMLElement {
	const { currentColor, onColorChange, showAdvancedMode } = props;

	// 最後の有効な色を追跡（Requirement 1.5: 前の有効な値を維持）
	let lastValidColor = currentColor;

	// ユニークIDを生成
	const uniqueId = `bg-selector-${++idCounter}`;
	const errorId = `${uniqueId}-error`;

	// コンテナを作成
	const container = document.createElement("div");
	container.className = "background-color-selector";

	// ラベルを作成
	const label = document.createElement("label");
	label.className = "background-color-selector__label";
	label.textContent = "Background Color";
	container.appendChild(label);

	// 入力コンテナを作成
	const inputContainer = document.createElement("div");
	inputContainer.className = "background-color-selector__inputs";

	// カラーピッカーを作成
	const colorInput = document.createElement("input");
	colorInput.type = "color";
	colorInput.value = currentColor;
	colorInput.className = "background-color-selector__color-picker";
	colorInput.setAttribute("aria-label", "Pick background color");

	// HEX入力フィールドを作成
	const hexInput = document.createElement("input");
	hexInput.type = "text";
	hexInput.value = currentColor;
	hexInput.className = "background-color-selector__hex-input";
	hexInput.setAttribute("aria-label", "Enter background color in HEX format");
	hexInput.setAttribute("aria-describedby", errorId);
	hexInput.placeholder = "#ffffff";

	inputContainer.appendChild(colorInput);
	inputContainer.appendChild(hexInput);
	container.appendChild(inputContainer);

	// プレビューエリアを作成
	const preview = document.createElement("div");
	preview.className = "background-color-selector__preview";
	preview.style.backgroundColor = currentColor;
	preview.setAttribute("aria-hidden", "true");
	container.appendChild(preview);

	// エラーメッセージエリアを作成
	const errorArea = document.createElement("div");
	errorArea.className = "background-color-selector__error";
	errorArea.id = errorId;
	errorArea.setAttribute("role", "alert");
	errorArea.setAttribute("aria-live", "polite");
	container.appendChild(errorArea);

	// プリセットボタンコンテナを作成（Requirements 2.1, 2.2）
	const presetsContainer = document.createElement("div");
	presetsContainer.className = "background-color-selector__presets";

	// 各プリセットのボタンを作成
	for (const preset of PRESET_COLORS) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "background-color-selector__preset-button";
		button.style.backgroundColor = preset.hex;
		button.setAttribute("aria-label", `Select ${preset.name} background`);
		button.title = preset.name;

		// クリックで即座に背景色を適用（Requirement 2.2）
		button.addEventListener("click", () => {
			colorInput.value = preset.hex;
			hexInput.value = preset.hex;
			updatePreview(preset.hex);
			clearError();
			setOklchInputsInvalid(false); // OKLCH入力のエラー状態も解除
			lastValidColor = preset.hex;
			onColorChange(preset.hex);
		});

		presetsContainer.appendChild(button);
	}

	container.appendChild(presetsContainer);

	// 詳細モード（OKLCH入力）セクション（Requirement 1.3）
	let advancedModeEnabled = showAdvancedMode ?? false;

	// 詳細モード切替ボタン
	const advancedToggle = document.createElement("button");
	advancedToggle.type = "button";
	advancedToggle.className = "background-color-selector__advanced-toggle";
	advancedToggle.textContent = "Advanced Mode";
	advancedToggle.setAttribute("aria-expanded", String(advancedModeEnabled));
	advancedToggle.setAttribute("aria-controls", `${uniqueId}-oklch`);
	container.appendChild(advancedToggle);

	// OKLCH入力コンテナ
	const oklchContainer = document.createElement("div");
	oklchContainer.id = `${uniqueId}-oklch`;
	oklchContainer.className = "background-color-selector__oklch-inputs";
	oklchContainer.style.display = advancedModeEnabled ? "block" : "none";

	// L入力フィールド（Lightness: 0.0-1.0）
	const lInput = document.createElement("input");
	lInput.type = "number";
	lInput.step = "0.01";
	lInput.min = "0";
	lInput.max = "1";
	lInput.className = "background-color-selector__oklch-l";
	lInput.setAttribute("aria-label", "Lightness (0.0-1.0)");
	lInput.setAttribute("aria-describedby", errorId);
	lInput.placeholder = "L: 0.0-1.0";

	// C入力フィールド（Chroma: 0.0-0.4）
	const cInput = document.createElement("input");
	cInput.type = "number";
	cInput.step = "0.01";
	cInput.min = "0";
	cInput.max = "0.4";
	cInput.className = "background-color-selector__oklch-c";
	cInput.setAttribute("aria-label", "Chroma (0.0-0.4)");
	cInput.setAttribute("aria-describedby", errorId);
	cInput.placeholder = "C: 0.0-0.4";

	// H入力フィールド（Hue: 0-360）
	const hInput = document.createElement("input");
	hInput.type = "number";
	hInput.step = "1";
	hInput.min = "0";
	hInput.max = "360";
	hInput.className = "background-color-selector__oklch-h";
	hInput.setAttribute("aria-label", "Hue (0-360)");
	hInput.setAttribute("aria-describedby", errorId);
	hInput.placeholder = "H: 0-360";

	oklchContainer.appendChild(lInput);
	oklchContainer.appendChild(cInput);
	oklchContainer.appendChild(hInput);
	container.appendChild(oklchContainer);

	// 詳細モード切替ハンドラー
	advancedToggle.addEventListener("click", () => {
		advancedModeEnabled = !advancedModeEnabled;
		oklchContainer.style.display = advancedModeEnabled ? "block" : "none";
		advancedToggle.setAttribute("aria-expanded", String(advancedModeEnabled));
	});

	/**
	 * プレビューとエラーを更新するヘルパー
	 */
	function updatePreview(hex: string): void {
		preview.style.backgroundColor = hex;
	}

	function showError(message: string): void {
		errorArea.textContent = message;
	}

	function clearError(): void {
		errorArea.textContent = "";
	}

	/**
	 * OKLCH入力のaria-invalid状態を設定
	 */
	function setOklchInputsInvalid(invalid: boolean): void {
		const value = String(invalid);
		lInput.setAttribute("aria-invalid", value);
		cInput.setAttribute("aria-invalid", value);
		hInput.setAttribute("aria-invalid", value);
	}

	/**
	 * OKLCH入力からHEXに変換して更新
	 */
	function handleOklchInput(): void {
		const l = lInput.value;
		const c = cInput.value;
		const h = hInput.value;

		if (l === "" || c === "" || h === "") {
			return; // 全フィールドが入力されるまで待つ
		}

		const oklchString = `oklch(${l} ${c} ${h})`;
		const result = validateBackgroundColor(oklchString);

		if (result.valid && result.hex) {
			colorInput.value = result.hex;
			hexInput.value = result.hex;
			updatePreview(result.hex);
			clearError();
			setOklchInputsInvalid(false);
			lastValidColor = result.hex;
			onColorChange(result.hex);
		} else if (result.error) {
			showError(result.error);
			setOklchInputsInvalid(true);
			colorInput.value = lastValidColor;
			updatePreview(lastValidColor);
		}
	}

	// OKLCH入力のイベントハンドラー（デバウンス適用）
	// Requirements: 4.2, 4.4 - デバウンス処理でシームレスに動作
	const debouncedOklchInput = debounce(handleOklchInput, DEBOUNCE_DELAY_MS);
	lInput.addEventListener("input", debouncedOklchInput);
	cInput.addEventListener("input", debouncedOklchInput);
	hInput.addEventListener("input", debouncedOklchInput);

	// カラーピッカーのイベントハンドラー（リアルタイム更新、デバウンスなし）
	// Requirements: 4.1 - カラーピッカーでの色選択時にリアルタイムでプレビューを更新
	colorInput.addEventListener("input", () => {
		const hex = colorInput.value;
		hexInput.value = hex;
		updatePreview(hex);
		clearError();
		setOklchInputsInvalid(false); // OKLCH入力のエラー状態も解除
		lastValidColor = hex;
		onColorChange(hex);
	});

	// HEX入力のバリデーション処理
	function handleHexInput(): void {
		const input = hexInput.value;
		const result = validateBackgroundColor(input);

		if (result.valid && result.hex) {
			colorInput.value = result.hex;
			updatePreview(result.hex);
			clearError();
			setOklchInputsInvalid(false); // OKLCH入力のエラー状態も解除
			lastValidColor = result.hex;
			onColorChange(result.hex);
		} else if (result.error) {
			showError(result.error);
			// Requirement 1.5: 無効な入力時は前の有効な値を維持
			// 入力欄は編集可能なままにするが、プレビューとカラーピッカーは前の有効値を保持
			colorInput.value = lastValidColor;
			updatePreview(lastValidColor);
		}
	}

	// HEX入力のイベントハンドラー（デバウンス適用）
	// Requirements: 4.2 - HEX入力時にデバウンス処理（150ms）を適用し、入力完了後に更新
	const debouncedHexInput = debounce(handleHexInput, DEBOUNCE_DELAY_MS);
	hexInput.addEventListener("input", debouncedHexInput);

	return container;
}

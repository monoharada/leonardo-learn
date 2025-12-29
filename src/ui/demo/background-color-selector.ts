/**
 * 背景色セレクターコンポーネント
 *
 * カラーピッカーとHEX入力フィールドを提供し、
 * 背景色選択UIを集約するコンポーネント。
 *
 * @module @/ui/demo/background-color-selector
 * Requirements: 1.1, 1.2, 1.5, 1.6
 */

import { validateBackgroundColor } from "./state";

/**
 * 背景色セレクターのプロパティ
 * @see design.md BackgroundColorSelectorProps
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
 * ユニークIDを生成するカウンター
 */
let idCounter = 0;

/**
 * 背景色セレクターコンポーネントを作成する
 *
 * @param props セレクターのプロパティ
 * @returns セレクターのDOM要素
 * @see Requirements: 1.1, 1.2, 1.5, 1.6
 */
export function createBackgroundColorSelector(
	props: BackgroundColorSelectorProps,
): HTMLElement {
	const { currentColor, onColorChange } = props;

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

	// カラーピッカーのイベントハンドラー
	colorInput.addEventListener("input", () => {
		const hex = colorInput.value;
		hexInput.value = hex;
		updatePreview(hex);
		clearError();
		lastValidColor = hex;
		onColorChange(hex);
	});

	// HEX入力のイベントハンドラー
	hexInput.addEventListener("input", () => {
		const input = hexInput.value;
		const result = validateBackgroundColor(input);

		if (result.valid && result.hex) {
			colorInput.value = result.hex;
			updatePreview(result.hex);
			clearError();
			lastValidColor = result.hex;
			onColorChange(result.hex);
		} else if (result.error) {
			showError(result.error);
			// Requirement 1.5: 無効な入力時は前の有効な値を維持
			// 入力欄は編集可能なままにするが、プレビューとカラーピッカーは前の有効値を保持
			colorInput.value = lastValidColor;
			updatePreview(lastValidColor);
		}
	});

	return container;
}

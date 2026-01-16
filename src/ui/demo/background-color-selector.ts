/**
 * 背景色セレクターコンポーネント
 *
 * ライト背景色とテキスト色（state.darkBackgroundColor）の2色を管理する。
 * ライト背景色がメイン、テキスト色はデモUI全体の文字色として反映される。
 *
 * @module @/ui/demo/background-color-selector
 * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 4.1, 4.2, 4.4
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
 */
export interface BackgroundColorSelectorProps {
	/** ライト背景色（HEX） */
	lightColor: string;
	/** テキスト色（HEX） */
	darkColor: string;
	/** ライト背景色変更時のコールバック */
	onLightColorChange: (hex: string) => void;
	/** テキスト色変更時のコールバック */
	onDarkColorChange: (hex: string) => void;
}

/**
 * ユニークIDを生成するカウンター
 */
let idCounter = 0;

/**
 * 単色セクションを作成する
 */
function createColorSection(
	mode: "light" | "dark",
	currentColor: string,
	onColorChange: (hex: string) => void,
	uniqueId: string,
): HTMLElement {
	const section = document.createElement("div");
	section.className = `background-color-selector__section background-color-selector__section--${mode}`;

	// ラベル
	const label = document.createElement("label");
	label.className = "dads-label background-color-selector__label";
	label.textContent = mode === "light" ? "背景色" : "テキスト色";
	section.appendChild(label);

	// 入力コンテナ
	const inputContainer = document.createElement("div");
	inputContainer.className = "background-color-selector__inputs dads-form-row";

	// カラーピッカー
	const colorInput = document.createElement("input");
	colorInput.type = "color";
	colorInput.value = currentColor;
	colorInput.className =
		"background-color-selector__color-picker dads-input dads-input--color";
	colorInput.setAttribute(
		"aria-label",
		mode === "light" ? "背景色を選択" : "テキスト色を選択",
	);

	// HEX入力
	const errorId = `${uniqueId}-${mode}-error`;
	const hexInputId = `${uniqueId}-${mode}-hex`;
	const hexInput = document.createElement("input");
	hexInput.type = "text";
	hexInput.id = hexInputId;
	hexInput.value = currentColor;
	hexInput.className =
		"background-color-selector__hex-input dads-input dads-input--bg-color";
	hexInput.setAttribute(
		"aria-label",
		mode === "light"
			? "背景色をHEX（#RRGGBB）またはOKLCHで入力"
			: "テキスト色をHEX（#RRGGBB）またはOKLCHで入力",
	);
	hexInput.setAttribute("aria-describedby", errorId);
	hexInput.placeholder = mode === "light" ? "#ffffff" : "#000000";

	label.htmlFor = hexInputId;

	inputContainer.appendChild(colorInput);
	inputContainer.appendChild(hexInput);
	section.appendChild(inputContainer);

	// エラーエリア
	const errorArea = document.createElement("div");
	errorArea.className = "background-color-selector__error";
	errorArea.id = errorId;
	errorArea.setAttribute("role", "alert");
	errorArea.setAttribute("aria-live", "polite");
	section.appendChild(errorArea);

	let lastValidColor = currentColor;

	// カラーピッカーのイベント
	colorInput.addEventListener("input", () => {
		const hex = colorInput.value;
		hexInput.value = hex;
		lastValidColor = hex;
		errorArea.textContent = "";
		onColorChange(hex);
	});

	// HEX入力のイベント（デバウンス付き）
	function handleHexInput(): void {
		const input = hexInput.value;
		const result = validateBackgroundColor(input);

		if (result.valid && result.hex) {
			colorInput.value = result.hex;
			errorArea.textContent = "";
			lastValidColor = result.hex;
			onColorChange(result.hex);
		} else if (result.error) {
			errorArea.textContent = result.error;
			colorInput.value = lastValidColor;
		}
	}

	const debouncedHexInput = debounce(handleHexInput, DEBOUNCE_DELAY_MS);
	hexInput.addEventListener("input", debouncedHexInput);

	return section;
}

/**
 * 背景色セレクターコンポーネントを作成する
 *
 * @param props セレクターのプロパティ
 * @returns セレクターのDOM要素
 */
export function createBackgroundColorSelector(
	props: BackgroundColorSelectorProps,
): HTMLElement {
	const { lightColor, darkColor, onLightColorChange, onDarkColorChange } =
		props;

	const uniqueId = `bg-selector-${++idCounter}`;

	// メインコンテナ
	const container = document.createElement("div");
	container.className = "background-color-selector";

	// ライト背景セクション（メイン）
	const lightSection = createColorSection(
		"light",
		lightColor,
		onLightColorChange,
		uniqueId,
	);
	container.appendChild(lightSection);

	// テキスト色セクション（補助）
	const darkSection = createColorSection(
		"dark",
		darkColor,
		onDarkColorChange,
		uniqueId,
	);
	container.appendChild(darkSection);

	return container;
}

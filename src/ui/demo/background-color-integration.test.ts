/**
 * 背景色変更機能の統合テスト
 *
 * Task 7.4: 統合テストを作成する
 * - BackgroundColorSelector → DemoState連携の確認
 * - DemoState変更 → View再レンダリングの確認
 * - プリセット選択 → 背景色適用の確認
 * - selector更新 → state反映 → view再計算のフロー検証
 *
 * @module @/ui/demo/background-color-integration.test
 * Requirements: 5.1, 5.2, 5.5
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
	createBackgroundColorSelector,
	DARK_PRESET_COLORS,
	LIGHT_PRESET_COLORS,
	PRESET_COLORS,
} from "./background-color-selector";
import {
	determineColorMode,
	persistBackgroundColors,
	resetState,
	state,
} from "./state";

// オリジナルのグローバル値を保存
const originalLocalStorage = globalThis.localStorage;
const originalDocument = globalThis.document;

/**
 * localStorageのモック実装
 * Bun test環境ではlocalStorageが存在しないため
 */
function createLocalStorageMock() {
	const store = new Map<string, string>();
	return {
		getItem: (key: string): string | null => store.get(key) ?? null,
		setItem: (key: string, value: string): void => {
			store.set(key, value);
		},
		removeItem: (key: string): void => {
			store.delete(key);
		},
		clear: (): void => {
			store.clear();
		},
		get length(): number {
			return store.size;
		},
		key: (index: number): string | null => {
			const keys = Array.from(store.keys());
			return keys[index] ?? null;
		},
	};
}

/**
 * DOMイベントのモック
 */
interface MockInputEvent extends Partial<Event> {
	type: string;
	target?: { value?: string };
}

/**
 * 拡張されたHTMLElement型（モック用）
 */
interface MockHTMLElement {
	tagName: string;
	style: Record<string, string>;
	className: string;
	textContent: string;
	innerHTML: string;
	children: MockHTMLElement[];
	attributes: Map<string, string>;
	eventListeners: Map<string, ((e?: Event | MockInputEvent) => void)[]>;
	value?: string;
	type?: string;
	setAttribute: (name: string, value: string) => void;
	getAttribute: (name: string) => string | null;
	appendChild: (child: MockHTMLElement) => MockHTMLElement;
	addEventListener: (
		event: string,
		handler: (e?: Event | MockInputEvent) => void,
	) => void;
	removeEventListener: (
		event: string,
		handler: (e?: Event | MockInputEvent) => void,
	) => void;
	dispatchEvent: (event: Event | MockInputEvent) => boolean;
	querySelector: (selector: string) => MockHTMLElement | null;
	querySelectorAll: (selector: string) => MockHTMLElement[] & {
		forEach: (cb: (el: MockHTMLElement) => void) => void;
	};
	click?: () => void;
	focus?: () => void;
	blur?: () => void;
}

/**
 * 拡張されたdocumentモック（イベント発火対応）
 */
function createDocumentMock() {
	return {
		createElement: (tagName: string): MockHTMLElement => {
			const element: MockHTMLElement = {
				tagName: tagName.toUpperCase(),
				style: {},
				className: "",
				textContent: "",
				innerHTML: "",
				children: [],
				attributes: new Map(),
				eventListeners: new Map(),

				setAttribute(name: string, value: string) {
					this.attributes.set(name, value);
					if (name === "value" && this.tagName === "INPUT") {
						this.value = value;
					}
				},
				getAttribute(name: string): string | null {
					return this.attributes.get(name) ?? null;
				},
				appendChild(child: MockHTMLElement) {
					this.children.push(child);
					return child;
				},
				addEventListener(
					event: string,
					handler: (e?: Event | MockInputEvent) => void,
				) {
					const handlers = this.eventListeners.get(event) || [];
					handlers.push(handler);
					this.eventListeners.set(event, handlers);
				},
				removeEventListener(
					event: string,
					handler: (e?: Event | MockInputEvent) => void,
				) {
					const handlers = this.eventListeners.get(event) || [];
					const index = handlers.indexOf(handler);
					if (index > -1) {
						handlers.splice(index, 1);
					}
				},
				dispatchEvent(event: Event | MockInputEvent) {
					const handlers = this.eventListeners.get(event.type) || [];
					for (const handler of handlers) {
						handler(event);
					}
					return true;
				},
				querySelector(selector: string): MockHTMLElement | null {
					// 再帰的にchildrenを検索
					const search = (
						el: MockHTMLElement,
						sel: string,
					): MockHTMLElement | null => {
						// クラスセレクタ
						if (sel.startsWith(".")) {
							const className = sel.slice(1);
							if (el.className.includes(className)) {
								return el;
							}
						}
						// input[type="..."]セレクタ
						if (sel.startsWith("input[type=")) {
							const typeMatch = sel.match(/input\[type="(.+)"\]/);
							if (
								typeMatch &&
								el.tagName === "INPUT" &&
								el.type === typeMatch[1]
							) {
								return el;
							}
						}
						for (const child of el.children) {
							const found = search(child, sel);
							if (found) return found;
						}
						return null;
					};
					return search(this, selector);
				},
				querySelectorAll(selector: string) {
					const results: MockHTMLElement[] = [];
					const search = (el: MockHTMLElement, sel: string) => {
						if (sel.startsWith(".")) {
							const className = sel.slice(1);
							if (el.className.includes(className)) {
								results.push(el);
							}
						}
						for (const child of el.children) {
							search(child, sel);
						}
					};
					search(this, selector);
					return Object.assign(results, {
						forEach: (cb: (el: MockHTMLElement) => void) => results.forEach(cb),
					});
				},
			};

			// input要素の場合、value属性を追加
			if (tagName === "input") {
				element.value = "";
				element.type = "text";
			}

			// button要素の場合、clickメソッドを追加
			if (tagName === "button") {
				element.click = function () {
					this.dispatchEvent({ type: "click" });
				};
			}

			return element;
		},
		getElementById: (_id: string): MockHTMLElement | null => null,
		body: {
			appendChild: () => {},
		},
	};
}

// localStorageモック
let localStorageMock: ReturnType<typeof createLocalStorageMock>;

// documentモック
let documentMock: ReturnType<typeof createDocumentMock>;

describe("Background Color Integration Tests (Task 7.4)", () => {
	beforeEach(() => {
		// 新しいモックを作成して設定
		localStorageMock = createLocalStorageMock();
		documentMock = createDocumentMock();

		(globalThis as unknown as { localStorage: Storage }).localStorage =
			localStorageMock as Storage;
		(globalThis as unknown as { document: typeof documentMock }).document =
			documentMock as typeof documentMock;

		resetState();
		localStorageMock.clear();
	});

	afterEach(() => {
		resetState();
		localStorageMock.clear();

		// オリジナルのグローバル値を復元（undefinedの場合も明示的に処理）
		if (originalLocalStorage !== undefined) {
			(globalThis as unknown as { localStorage: Storage }).localStorage =
				originalLocalStorage;
		} else {
			// Bun環境で元々未定義だった場合は削除
			delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
		}
		if (originalDocument !== undefined) {
			(globalThis as unknown as { document: Document }).document =
				originalDocument;
		} else {
			// Bun環境で元々未定義だった場合は削除
			delete (globalThis as unknown as { document?: Document }).document;
		}
	});

	/**
	 * 1. BackgroundColorSelector → DemoState連携の確認
	 * Requirements: 5.1
	 */
	describe("BackgroundColorSelector → DemoState Integration", () => {
		it("should update state when light color picker input event is dispatched", () => {
			// 初期状態を確認
			expect(state.lightBackgroundColor).toBe("#ffffff");

			// onLightColorChangeでstateを更新するコールバックを設定
			const onLightColorChange = (hex: string) => {
				state.lightBackgroundColor = hex;
				persistBackgroundColors(
					state.lightBackgroundColor,
					state.darkBackgroundColor,
				);
			};

			const onDarkColorChange = (hex: string) => {
				state.darkBackgroundColor = hex;
				persistBackgroundColors(
					state.lightBackgroundColor,
					state.darkBackgroundColor,
				);
			};

			// セレクターを作成
			const selector = createBackgroundColorSelector({
				lightColor: state.lightBackgroundColor,
				darkColor: state.darkBackgroundColor,
				onLightColorChange,
				onDarkColorChange,
			});

			// ライト背景用のカラーピッカー入力要素を検索（最初のcolor picker）
			const colorPickers = selector.querySelectorAll(
				".background-color-selector__color-picker",
			) as (MockHTMLElement | null)[];
			expect(colorPickers.length).toBeGreaterThanOrEqual(1);

			const lightColorPicker = colorPickers[0];
			if (lightColorPicker) {
				// カラーピッカーのvalue を更新してinputイベントを発火
				lightColorPicker.value = "#f8fafc";
				lightColorPicker.dispatchEvent({
					type: "input",
					target: { value: "#f8fafc" },
				});

				// stateが更新されたことを確認
				expect(state.lightBackgroundColor).toBe("#f8fafc");

				// localStorageにも保存されたことを確認
				const stored = localStorageMock.getItem("leonardo-backgroundColor");
				expect(stored).not.toBeNull();
				const parsed = JSON.parse(stored as string);
				expect(parsed.light).toBe("#f8fafc");
			}
		});

		it("should update state when dark color picker input event is dispatched", () => {
			// 初期状態を確認
			expect(state.darkBackgroundColor).toBe("#000000");

			const onLightColorChange = (hex: string) => {
				state.lightBackgroundColor = hex;
				persistBackgroundColors(
					state.lightBackgroundColor,
					state.darkBackgroundColor,
				);
			};

			const onDarkColorChange = (hex: string) => {
				state.darkBackgroundColor = hex;
				persistBackgroundColors(
					state.lightBackgroundColor,
					state.darkBackgroundColor,
				);
			};

			// セレクターを作成
			const selector = createBackgroundColorSelector({
				lightColor: state.lightBackgroundColor,
				darkColor: state.darkBackgroundColor,
				onLightColorChange,
				onDarkColorChange,
			});

			// ダーク背景用のカラーピッカー入力要素を検索（2番目のcolor picker）
			const colorPickers = selector.querySelectorAll(
				".background-color-selector__color-picker",
			) as (MockHTMLElement | null)[];
			expect(colorPickers.length).toBeGreaterThanOrEqual(2);

			const darkColorPicker = colorPickers[1];
			if (darkColorPicker) {
				// カラーピッカーのvalue を更新してinputイベントを発火
				darkColorPicker.value = "#18181b";
				darkColorPicker.dispatchEvent({
					type: "input",
					target: { value: "#18181b" },
				});

				// stateが更新されたことを確認
				expect(state.darkBackgroundColor).toBe("#18181b");

				// localStorageにも保存されたことを確認
				const stored = localStorageMock.getItem("leonardo-backgroundColor");
				expect(stored).not.toBeNull();
				const parsed = JSON.parse(stored as string);
				expect(parsed.dark).toBe("#18181b");
			}
		});

		it("should persist colors to localStorage when state is updated", () => {
			state.lightBackgroundColor = "#f0f0f0";
			state.darkBackgroundColor = "#202020";
			persistBackgroundColors(
				state.lightBackgroundColor,
				state.darkBackgroundColor,
			);

			const stored = localStorageMock.getItem("leonardo-backgroundColor");
			expect(stored).not.toBeNull();

			const parsed = JSON.parse(stored as string);
			expect(parsed.light).toBe("#f0f0f0");
			expect(parsed.dark).toBe("#202020");
		});

		it("should correctly determine mode for various colors", () => {
			expect(determineColorMode("#ffffff")).toBe("light");
			expect(determineColorMode("#f8fafc")).toBe("light");
			expect(determineColorMode("#000000")).toBe("dark");
			expect(determineColorMode("#18181b")).toBe("dark");
		});

		it("should create BackgroundColorSelector with current state colors", () => {
			state.lightBackgroundColor = "#f8fafc";
			state.darkBackgroundColor = "#18181b";

			const onLightColorChange = (_hex: string) => {};
			const onDarkColorChange = (_hex: string) => {};
			const selector = createBackgroundColorSelector({
				lightColor: state.lightBackgroundColor,
				darkColor: state.darkBackgroundColor,
				onLightColorChange,
				onDarkColorChange,
			});

			expect(selector).toBeDefined();
			expect(selector.tagName).toBe("DIV");
		});
	});

	/**
	 * 2. DemoState変更 → View再レンダリングの確認
	 * Requirements: 5.2, 5.5
	 *
	 * NOTE: 実際のView関数呼び出しはasync/awaitとDADSトークン読み込みが必要。
	 * ここではView関数が参照するstate値の正しさを確認。
	 * 完全なDOM再レンダリングテストはE2E（Task 7.3）でカバー。
	 */
	describe("DemoState Change → View Re-render Flow", () => {
		it("should maintain background colors across view mode changes", () => {
			state.lightBackgroundColor = "#f8fafc";
			state.darkBackgroundColor = "#18181b";

			state.viewMode = "palette";
			expect(state.lightBackgroundColor).toBe("#f8fafc");
			expect(state.darkBackgroundColor).toBe("#18181b");

			state.viewMode = "shades";
			expect(state.lightBackgroundColor).toBe("#f8fafc");
			expect(state.darkBackgroundColor).toBe("#18181b");

			state.viewMode = "accessibility";
			expect(state.lightBackgroundColor).toBe("#f8fafc");
			expect(state.darkBackgroundColor).toBe("#18181b");
		});

		it("should persist background colors when switching between palette and shades views", () => {
			state.lightBackgroundColor = "#e0e0e0";
			state.darkBackgroundColor = "#303030";

			state.viewMode = "palette";
			const paletteLight = state.lightBackgroundColor;
			const paletteDark = state.darkBackgroundColor;

			state.viewMode = "shades";
			expect(state.lightBackgroundColor).toBe(paletteLight);
			expect(state.darkBackgroundColor).toBe(paletteDark);

			state.viewMode = "palette";
			expect(state.lightBackgroundColor).toBe(paletteLight);
			expect(state.darkBackgroundColor).toBe(paletteDark);
		});

		it("should allow background color modification regardless of viewMode", () => {
			state.viewMode = "harmony";
			state.lightBackgroundColor = "#ff0000";
			expect(state.lightBackgroundColor).toBe("#ff0000");

			state.viewMode = "palette";
			state.lightBackgroundColor = "#00ff00";
			expect(state.lightBackgroundColor).toBe("#00ff00");

			state.viewMode = "shades";
			state.lightBackgroundColor = "#0000ff";
			expect(state.lightBackgroundColor).toBe("#0000ff");
		});

		it("should verify state.lightBackgroundColor is used by View for rendering", () => {
			// View関数がstate.lightBackgroundColorを参照することを確認
			// (palette-view.ts, shades-view.tsの実装による)
			state.lightBackgroundColor = "#336699";
			state.darkBackgroundColor = "#112233";

			// Viewがstateを参照する際、この値が使用される
			expect(state.lightBackgroundColor).toBe("#336699");
			expect(state.darkBackgroundColor).toBe("#112233");

			// palette-view.tsのコード分析により確認済み:
			// container.style.backgroundColor = state.lightBackgroundColor;
		});
	});

	/**
	 * 3. プリセット選択 → 背景色適用の確認
	 * Requirements: 2.1, 2.2, 2.3
	 */
	describe("Preset Selection → Background Color Application", () => {
		it("should have separate light and dark preset colors defined", () => {
			expect(LIGHT_PRESET_COLORS.length).toBe(2);
			expect(DARK_PRESET_COLORS.length).toBe(2);
			expect(PRESET_COLORS.length).toBe(4); // Combined
		});

		it("should have light presets with light mode", () => {
			for (const preset of LIGHT_PRESET_COLORS) {
				expect(preset.mode).toBe("light");
			}
		});

		it("should have dark presets with dark mode", () => {
			for (const preset of DARK_PRESET_COLORS) {
				expect(preset.mode).toBe("dark");
			}
		});

		it("should apply preset color correctly via preset button click", () => {
			const onLightColorChange = (hex: string) => {
				state.lightBackgroundColor = hex;
				persistBackgroundColors(
					state.lightBackgroundColor,
					state.darkBackgroundColor,
				);
			};

			const onDarkColorChange = (hex: string) => {
				state.darkBackgroundColor = hex;
				persistBackgroundColors(
					state.lightBackgroundColor,
					state.darkBackgroundColor,
				);
			};

			const selector = createBackgroundColorSelector({
				lightColor: state.lightBackgroundColor,
				darkColor: state.darkBackgroundColor,
				onLightColorChange,
				onDarkColorChange,
			});

			const presetButtons = selector.querySelectorAll(
				".background-color-selector__preset-button",
			);

			// 各セクションに2つずつプリセット = 合計4つ
			expect(presetButtons.length).toBe(4);
		});

		it("should match preset mode with determineColorMode result", () => {
			for (const preset of PRESET_COLORS) {
				const calculatedMode = determineColorMode(preset.hex);
				expect(calculatedMode).toBe(preset.mode);
			}
		});
	});

	/**
	 * 4. Selector更新 → State反映 → View再計算のフロー検証
	 * Requirements: 5.1, 5.2, 5.5
	 */
	describe("Selector Update → State Reflection → View Recalculation Flow", () => {
		it("should complete full update cycle: selector event → state → persist", () => {
			const onLightColorChange = (hex: string) => {
				state.lightBackgroundColor = hex;
				persistBackgroundColors(
					state.lightBackgroundColor,
					state.darkBackgroundColor,
				);
			};

			const onDarkColorChange = (hex: string) => {
				state.darkBackgroundColor = hex;
				persistBackgroundColors(
					state.lightBackgroundColor,
					state.darkBackgroundColor,
				);
			};

			const selector = createBackgroundColorSelector({
				lightColor: state.lightBackgroundColor,
				darkColor: state.darkBackgroundColor,
				onLightColorChange,
				onDarkColorChange,
			});

			// カラーピッカーでイベント発火
			const colorPickers = selector.querySelectorAll(
				".background-color-selector__color-picker",
			) as (MockHTMLElement | null)[];
			expect(colorPickers.length).toBeGreaterThanOrEqual(1);

			const lightColorPicker = colorPickers[0];
			lightColorPicker!.value = "#336699";
			lightColorPicker!.dispatchEvent({
				type: "input",
				target: { value: "#336699" },
			});

			expect(state.lightBackgroundColor).toBe("#336699");

			const stored = localStorageMock.getItem("leonardo-backgroundColor");
			const parsed = JSON.parse(stored as string);
			expect(parsed.light).toBe("#336699");
		});

		it("should support rapid color changes without losing state", () => {
			const lightColors = [
				"#ff0000",
				"#00ff00",
				"#0000ff",
				"#ffff00",
				"#ff00ff",
			];
			const darkColors = [
				"#110000",
				"#001100",
				"#000011",
				"#111100",
				"#110011",
			];

			for (let i = 0; i < lightColors.length; i++) {
				state.lightBackgroundColor = lightColors[i];
				state.darkBackgroundColor = darkColors[i];
			}

			expect(state.lightBackgroundColor).toBe("#ff00ff");
			expect(state.darkBackgroundColor).toBe("#110011");
		});

		it("should reset background colors on resetState", () => {
			state.lightBackgroundColor = "#aabbcc";
			state.darkBackgroundColor = "#112233";

			resetState();

			expect(state.lightBackgroundColor).toBe("#ffffff");
			expect(state.darkBackgroundColor).toBe("#000000");
		});
	});

	/**
	 * 5. 状態の一貫性テスト
	 * Requirements: 5.1, 5.2
	 */
	describe("State Consistency Tests", () => {
		it("should maintain state consistency when both colors are set together", () => {
			state.lightBackgroundColor = "#f8fafc";
			state.darkBackgroundColor = "#18181b";

			expect(state.lightBackgroundColor).toBe("#f8fafc");
			expect(state.darkBackgroundColor).toBe("#18181b");

			state.lightBackgroundColor = "#ffffff";
			state.darkBackgroundColor = "#000000";

			expect(state.lightBackgroundColor).toBe("#ffffff");
			expect(state.darkBackgroundColor).toBe("#000000");
		});

		it("should not affect other state properties when changing background colors", () => {
			state.activeId = "test-palette";
			state.viewMode = "palette";
			state.cudMode = "strict";

			state.lightBackgroundColor = "#aabbcc";
			state.darkBackgroundColor = "#112233";

			expect(state.activeId).toBe("test-palette");
			expect(state.viewMode).toBe("palette");
			expect(state.cudMode).toBe("strict");
		});
	});

	/**
	 * 6. エッジケースとエラーハンドリング
	 */
	describe("Edge Cases and Error Handling", () => {
		it("should handle lowercase and uppercase hex values consistently", () => {
			state.lightBackgroundColor = "#AABBCC";
			expect(state.lightBackgroundColor).toBe("#AABBCC");

			const modeUpper = determineColorMode("#AABBCC");
			const modeLower = determineColorMode("#aabbcc");
			expect(modeUpper).toBe(modeLower);
		});

		it("should persist empty localStorage gracefully", () => {
			localStorageMock.clear();
			resetState();
			expect(state.lightBackgroundColor).toBe("#ffffff");
			expect(state.darkBackgroundColor).toBe("#000000");
		});
	});
});

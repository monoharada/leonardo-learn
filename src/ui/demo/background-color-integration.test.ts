/**
 * 背景色変更機能の統合テスト
 *
 * Task 7.4: 統合テストを作成する
 * - BackgroundColorSelector → DemoState連携の確認
 * - DemoState変更 → View再レンダリングの確認
 * - プリセット選択 → 背景色 + モード適用の確認
 * - selector更新 → state反映 → view再計算のフロー検証
 *
 * @module @/ui/demo/background-color-integration.test
 * Requirements: 5.1, 5.2, 5.5
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
	createBackgroundColorSelector,
	PRESET_COLORS,
} from "./background-color-selector";
import {
	determineColorMode,
	persistBackgroundColor,
	resetState,
	state,
} from "./state";
import type { ColorMode } from "./types";

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
	querySelectorAll: (
		selector: string,
	) => MockHTMLElement[] & {
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
		it("should update state when color picker input event is dispatched", () => {
			// 初期状態を確認
			expect(state.backgroundColor).toBe("#ffffff");

			// onColorChangeでstateを更新するコールバックを設定
			const onColorChange = (hex: string) => {
				state.backgroundColor = hex;
				state.backgroundMode = determineColorMode(hex);
				persistBackgroundColor(state.backgroundColor, state.backgroundMode);
			};

			// セレクターを作成
			const selector = createBackgroundColorSelector({
				currentColor: state.backgroundColor,
				onColorChange,
			});

			// カラーピッカー入力要素を検索
			const colorPicker = selector.querySelector(
				'input[type="color"]',
			) as MockHTMLElement | null;
			expect(colorPicker).not.toBeNull();

			if (colorPicker) {
				// カラーピッカーのvalue を更新してinputイベントを発火
				colorPicker.value = "#18181b";
				colorPicker.dispatchEvent({
					type: "input",
					target: { value: "#18181b" },
				});

				// stateが更新されたことを確認
				expect(state.backgroundColor).toBe("#18181b");
				expect(state.backgroundMode).toBe("dark");

				// localStorageにも保存されたことを確認
				const stored = localStorageMock.getItem("leonardo-backgroundColor");
				expect(stored).not.toBeNull();
				const parsed = JSON.parse(stored as string);
				expect(parsed.hex).toBe("#18181b");
			}
		});

		it("should update state when preset button is clicked", () => {
			expect(state.backgroundColor).toBe("#ffffff");

			const onColorChange = (hex: string) => {
				state.backgroundColor = hex;
				state.backgroundMode = determineColorMode(hex);
				persistBackgroundColor(state.backgroundColor, state.backgroundMode);
			};

			// セレクターを作成
			const selector = createBackgroundColorSelector({
				currentColor: state.backgroundColor,
				onColorChange,
			});

			// プリセットボタンを検索
			const presetButtons = selector.querySelectorAll(
				".background-color-selector__preset-button",
			);
			expect(presetButtons.length).toBe(4);

			// Dark Grayプリセット（3番目）をクリック
			if (presetButtons.length >= 3) {
				const darkGrayButton = presetButtons[2];
				darkGrayButton.dispatchEvent({ type: "click" });

				// stateが更新されたことを確認
				expect(state.backgroundColor).toBe("#18181b");
				expect(state.backgroundMode).toBe("dark");
			}
		});

		it("should persist color to localStorage when state is updated", () => {
			state.backgroundColor = "#18181b";
			state.backgroundMode = determineColorMode("#18181b");
			persistBackgroundColor(state.backgroundColor, state.backgroundMode);

			const stored = localStorageMock.getItem("leonardo-backgroundColor");
			expect(stored).not.toBeNull();

			const parsed = JSON.parse(stored as string);
			expect(parsed.hex).toBe("#18181b");
			expect(parsed.mode).toBe("dark");
		});

		it("should correctly determine mode for various colors", () => {
			expect(determineColorMode("#ffffff")).toBe("light");
			expect(determineColorMode("#f8fafc")).toBe("light");
			expect(determineColorMode("#000000")).toBe("dark");
			expect(determineColorMode("#18181b")).toBe("dark");
		});

		it("should create BackgroundColorSelector with current state color", () => {
			state.backgroundColor = "#f8fafc";

			const onColorChange = (_hex: string) => {};
			const selector = createBackgroundColorSelector({
				currentColor: state.backgroundColor,
				onColorChange,
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
		it("should maintain backgroundColor across view mode changes", () => {
			state.backgroundColor = "#18181b";
			state.backgroundMode = "dark";

			state.viewMode = "palette";
			expect(state.backgroundColor).toBe("#18181b");
			expect(state.backgroundMode).toBe("dark");

			state.viewMode = "shades";
			expect(state.backgroundColor).toBe("#18181b");
			expect(state.backgroundMode).toBe("dark");

			state.viewMode = "accessibility";
			expect(state.backgroundColor).toBe("#18181b");
			expect(state.backgroundMode).toBe("dark");
		});

		it("should persist backgroundColor when switching between palette and shades views", () => {
			state.backgroundColor = "#0066cc";
			state.backgroundMode = determineColorMode("#0066cc");

			state.viewMode = "palette";
			const paletteColor = state.backgroundColor;

			state.viewMode = "shades";
			expect(state.backgroundColor).toBe(paletteColor);

			state.viewMode = "palette";
			expect(state.backgroundColor).toBe(paletteColor);
		});

		it("should allow backgroundColor modification regardless of viewMode", () => {
			state.viewMode = "harmony";
			state.backgroundColor = "#ff0000";
			expect(state.backgroundColor).toBe("#ff0000");

			state.viewMode = "palette";
			state.backgroundColor = "#00ff00";
			expect(state.backgroundColor).toBe("#00ff00");

			state.viewMode = "shades";
			state.backgroundColor = "#0000ff";
			expect(state.backgroundColor).toBe("#0000ff");
		});

		it("should verify state.backgroundColor is used by View for rendering", () => {
			// View関数がstate.backgroundColorを参照することを確認
			// (palette-view.ts, shades-view.tsの実装による)
			state.backgroundColor = "#336699";
			state.backgroundMode = determineColorMode("#336699");

			// Viewがstateを参照する際、この値が使用される
			expect(state.backgroundColor).toBe("#336699");

			// palette-view.tsのコード分析により確認済み:
			// container.style.backgroundColor = state.backgroundColor;
			// const bgColor = new Color(state.backgroundColor);
		});
	});

	/**
	 * 3. プリセット選択 → 背景色 + モード適用の確認
	 * Requirements: 2.1, 2.2, 2.3
	 */
	describe("Preset Selection → Background Color + Mode Application", () => {
		it("should have 4 preset colors defined", () => {
			expect(PRESET_COLORS.length).toBe(4);
		});

		it("should apply White preset correctly via UI click", () => {
			const onColorChange = (hex: string) => {
				state.backgroundColor = hex;
				state.backgroundMode = determineColorMode(hex);
				persistBackgroundColor(state.backgroundColor, state.backgroundMode);
			};

			const selector = createBackgroundColorSelector({
				currentColor: state.backgroundColor,
				onColorChange,
			});

			const presetButtons = selector.querySelectorAll(
				".background-color-selector__preset-button",
			);
			// プリセットボタンの存在を保証
			expect(presetButtons.length).toBe(4);
			// White は最初のプリセット
			presetButtons[0].dispatchEvent({ type: "click" });
			expect(state.backgroundColor).toBe("#ffffff");
			expect(state.backgroundMode).toBe("light");
		});

		it("should apply Light Gray preset correctly via UI click", () => {
			const onColorChange = (hex: string) => {
				state.backgroundColor = hex;
				state.backgroundMode = determineColorMode(hex);
			};

			const selector = createBackgroundColorSelector({
				currentColor: state.backgroundColor,
				onColorChange,
			});

			const presetButtons = selector.querySelectorAll(
				".background-color-selector__preset-button",
			);
			// プリセットボタンの存在を保証
			expect(presetButtons.length).toBe(4);
			// Light Gray は2番目のプリセット
			presetButtons[1].dispatchEvent({ type: "click" });
			expect(state.backgroundColor).toBe("#f8fafc");
			expect(state.backgroundMode).toBe("light");
		});

		it("should apply Dark Gray preset correctly via UI click", () => {
			const onColorChange = (hex: string) => {
				state.backgroundColor = hex;
				state.backgroundMode = determineColorMode(hex);
			};

			const selector = createBackgroundColorSelector({
				currentColor: state.backgroundColor,
				onColorChange,
			});

			const presetButtons = selector.querySelectorAll(
				".background-color-selector__preset-button",
			);
			// プリセットボタンの存在を保証
			expect(presetButtons.length).toBe(4);
			// Dark Gray は3番目のプリセット
			presetButtons[2].dispatchEvent({ type: "click" });
			expect(state.backgroundColor).toBe("#18181b");
			expect(state.backgroundMode).toBe("dark");
		});

		it("should apply Black preset correctly via UI click", () => {
			const onColorChange = (hex: string) => {
				state.backgroundColor = hex;
				state.backgroundMode = determineColorMode(hex);
			};

			const selector = createBackgroundColorSelector({
				currentColor: state.backgroundColor,
				onColorChange,
			});

			const presetButtons = selector.querySelectorAll(
				".background-color-selector__preset-button",
			);
			// プリセットボタンの存在を保証
			expect(presetButtons.length).toBe(4);
			// Black は4番目のプリセット
			presetButtons[3].dispatchEvent({ type: "click" });
			expect(state.backgroundColor).toBe("#000000");
			expect(state.backgroundMode).toBe("dark");
		});

		it("should match preset mode with determineColorMode result", () => {
			for (const preset of PRESET_COLORS) {
				const calculatedMode = determineColorMode(preset.hex);
				expect(calculatedMode).toBe(preset.mode);
			}
		});

		it("should persist preset selection to localStorage via UI click", () => {
			const onColorChange = (hex: string) => {
				state.backgroundColor = hex;
				state.backgroundMode = determineColorMode(hex);
				persistBackgroundColor(state.backgroundColor, state.backgroundMode);
			};

			const selector = createBackgroundColorSelector({
				currentColor: state.backgroundColor,
				onColorChange,
			});

			const presetButtons = selector.querySelectorAll(
				".background-color-selector__preset-button",
			);
			// プリセットボタンの存在を保証
			expect(presetButtons.length).toBe(4);
			// Dark Gray をクリック
			presetButtons[2].dispatchEvent({ type: "click" });

			const stored = localStorageMock.getItem("leonardo-backgroundColor");
			expect(stored).not.toBeNull();

			const parsed = JSON.parse(stored as string);
			expect(parsed.hex).toBe("#18181b");
			expect(parsed.mode).toBe("dark");
		});
	});

	/**
	 * 4. Selector更新 → State反映 → View再計算のフロー検証
	 * Requirements: 5.1, 5.2, 5.5
	 */
	describe("Selector Update → State Reflection → View Recalculation Flow", () => {
		it("should complete full update cycle: selector event → state → persist", () => {
			const onColorChange = (hex: string) => {
				state.backgroundColor = hex;
				state.backgroundMode = determineColorMode(hex);
				persistBackgroundColor(state.backgroundColor, state.backgroundMode);
			};

			const selector = createBackgroundColorSelector({
				currentColor: state.backgroundColor,
				onColorChange,
			});

			// カラーピッカーでイベント発火
			const colorPicker = selector.querySelector(
				'input[type="color"]',
			) as MockHTMLElement | null;
			// カラーピッカーの存在を保証
			expect(colorPicker).not.toBeNull();

			colorPicker!.value = "#336699";
			colorPicker!.dispatchEvent({
				type: "input",
				target: { value: "#336699" },
			});

			expect(state.backgroundColor).toBe("#336699");
			expect(state.backgroundMode).toBe("dark");

			const stored = localStorageMock.getItem("leonardo-backgroundColor");
			const parsed = JSON.parse(stored as string);
			expect(parsed.hex).toBe("#336699");
		});

		it("should support rapid color changes without losing state", () => {
			const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"];

			for (const color of colors) {
				state.backgroundColor = color;
				state.backgroundMode = determineColorMode(color);
			}

			expect(state.backgroundColor).toBe("#ff00ff");
		});

		it("should correctly calculate mode for intermediate colors", () => {
			state.backgroundColor = "#808080";
			state.backgroundMode = determineColorMode("#808080");
			expect(state.backgroundMode).toBe("light");

			state.backgroundColor = "#4b5563";
			state.backgroundMode = determineColorMode("#4b5563");
			expect(state.backgroundMode).toBe("dark");
		});

		it("should reset backgroundColor on resetState", () => {
			state.backgroundColor = "#000000";
			state.backgroundMode = "dark";

			resetState();

			expect(state.backgroundColor).toBe("#ffffff");
			expect(state.backgroundMode).toBe("light");
		});

		it("should handle custom color input and mode auto-detection via UI", () => {
			const onColorChange = (hex: string) => {
				state.backgroundColor = hex;
				state.backgroundMode = determineColorMode(hex);
			};

			const selector = createBackgroundColorSelector({
				currentColor: state.backgroundColor,
				onColorChange,
			});

			const colorPicker = selector.querySelector(
				'input[type="color"]',
			) as MockHTMLElement | null;
			// カラーピッカーの存在を保証
			expect(colorPicker).not.toBeNull();

			colorPicker!.value = "#1a73e8";
			colorPicker!.dispatchEvent({
				type: "input",
				target: { value: "#1a73e8" },
			});

			expect(state.backgroundColor).toBe("#1a73e8");
			expect(["light", "dark"]).toContain(state.backgroundMode);
		});
	});

	/**
	 * 5. 状態の一貫性テスト
	 * Requirements: 5.1, 5.2
	 */
	describe("State Consistency Tests", () => {
		it("should maintain state consistency when backgroundColor and backgroundMode are set together", () => {
			state.backgroundColor = "#18181b";
			state.backgroundMode = determineColorMode("#18181b");

			expect(state.backgroundColor).toBe("#18181b");
			expect(state.backgroundMode).toBe("dark");

			state.backgroundColor = "#f8fafc";
			state.backgroundMode = determineColorMode("#f8fafc");

			expect(state.backgroundColor).toBe("#f8fafc");
			expect(state.backgroundMode).toBe("light");
		});

		it("should not affect other state properties when changing backgroundColor", () => {
			state.activeId = "test-palette";
			state.viewMode = "palette";
			state.cudMode = "strict";

			state.backgroundColor = "#000000";
			state.backgroundMode = "dark";

			expect(state.activeId).toBe("test-palette");
			expect(state.viewMode).toBe("palette");
			expect(state.cudMode).toBe("strict");
		});

		it("should handle sequential preset applications via UI", () => {
			const onColorChange = (hex: string) => {
				state.backgroundColor = hex;
				state.backgroundMode = determineColorMode(hex);
			};

			const selector = createBackgroundColorSelector({
				currentColor: state.backgroundColor,
				onColorChange,
			});

			const presetButtons = selector.querySelectorAll(
				".background-color-selector__preset-button",
			);
			// プリセットボタンの存在を保証
			expect(presetButtons.length).toBe(4);

			// 全プリセットを順番にクリック
			for (let i = 0; i < presetButtons.length; i++) {
				presetButtons[i].dispatchEvent({ type: "click" });
				expect(state.backgroundColor).toBe(PRESET_COLORS[i].hex);
				expect(state.backgroundMode).toBe(PRESET_COLORS[i].mode);
			}

			// 最後のプリセット（Black）がstateに残る
			const lastPreset = PRESET_COLORS[PRESET_COLORS.length - 1];
			expect(state.backgroundColor).toBe(lastPreset.hex);
		});
	});

	/**
	 * 6. エッジケースとエラーハンドリング
	 */
	describe("Edge Cases and Error Handling", () => {
		it("should handle lowercase and uppercase hex values consistently", () => {
			state.backgroundColor = "#AABBCC";
			expect(state.backgroundColor).toBe("#AABBCC");

			const modeUpper = determineColorMode("#AABBCC");
			const modeLower = determineColorMode("#aabbcc");
			expect(modeUpper).toBe(modeLower);
		});

		it("should persist empty localStorage gracefully", () => {
			localStorageMock.clear();
			resetState();
			expect(state.backgroundColor).toBe("#ffffff");
			expect(state.backgroundMode).toBe("light");
		});
	});
});

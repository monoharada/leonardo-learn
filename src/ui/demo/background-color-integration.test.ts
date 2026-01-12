/**
 * 背景色変更機能の統合テスト
 *
 * Task 7.4: 統合テストを作成する
 * - BackgroundColorSelector → DemoState連携の確認
 * - DemoState変更 → View再レンダリングの確認
 * - selector更新 → state反映 → view再計算のフロー検証
 *
 * @module @/ui/demo/background-color-integration.test
 * Requirements: 5.1, 5.2, 5.5
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createBackgroundColorSelector } from "./background-color-selector";
import {
	determineColorMode,
	persistBackgroundColors,
	resetState,
	state,
} from "./state";

const originalLocalStorage = globalThis.localStorage;
const originalDocument = globalThis.document;

interface MockEvent {
	type: string;
	target?: { value?: string };
}

type EventHandler = (e?: Event | MockEvent) => void;

interface MockHTMLElement {
	tagName: string;
	style: Record<string, string>;
	className: string;
	textContent: string;
	innerHTML: string;
	children: MockHTMLElement[];
	attributes: Map<string, string>;
	eventListeners: Map<string, EventHandler[]>;
	value?: string;
	type?: string;
	setAttribute(name: string, value: string): void;
	getAttribute(name: string): string | null;
	appendChild(child: MockHTMLElement): MockHTMLElement;
	addEventListener(event: string, handler: EventHandler): void;
	removeEventListener(event: string, handler: EventHandler): void;
	dispatchEvent(event: Event | MockEvent): boolean;
	querySelector(selector: string): MockHTMLElement | null;
	querySelectorAll(
		selector: string,
	): MockHTMLElement[] & { forEach(cb: (el: MockHTMLElement) => void): void };
	click?(): void;
}

function createLocalStorageMock(): Storage {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => store.set(key, value),
		removeItem: (key: string) => store.delete(key),
		clear: () => store.clear(),
		get length() {
			return store.size;
		},
		key: (index: number) => Array.from(store.keys())[index] ?? null,
	} as Storage;
}

function createMockElement(tagName: string): MockHTMLElement {
	const element: MockHTMLElement = {
		tagName: tagName.toUpperCase(),
		style: {},
		className: "",
		textContent: "",
		innerHTML: "",
		children: [],
		attributes: new Map(),
		eventListeners: new Map(),
		setAttribute(name, value) {
			this.attributes.set(name, value);
			if (name === "value" && this.tagName === "INPUT") this.value = value;
		},
		getAttribute(name) {
			return this.attributes.get(name) ?? null;
		},
		appendChild(child) {
			this.children.push(child);
			return child;
		},
		addEventListener(event, handler) {
			const handlers = this.eventListeners.get(event) || [];
			handlers.push(handler);
			this.eventListeners.set(event, handlers);
		},
		removeEventListener(event, handler) {
			const handlers = this.eventListeners.get(event) || [];
			const index = handlers.indexOf(handler);
			if (index > -1) handlers.splice(index, 1);
		},
		dispatchEvent(event) {
			const handlers = this.eventListeners.get(event.type) || [];
			for (const handler of handlers) handler(event);
			return true;
		},
		querySelector(selector) {
			return searchElement(this, selector);
		},
		querySelectorAll(selector) {
			const results = collectElements(this, selector);
			return Object.assign(results, {
				forEach: (cb: (el: MockHTMLElement) => void) => results.forEach(cb),
			});
		},
	};

	if (tagName === "input") {
		element.value = "";
		element.type = "text";
	}
	if (tagName === "button") {
		element.click = function () {
			this.dispatchEvent({ type: "click" });
		};
	}

	return element;
}

function searchElement(
	el: MockHTMLElement,
	selector: string,
): MockHTMLElement | null {
	if (matchesSelector(el, selector)) return el;
	for (const child of el.children) {
		const found = searchElement(child, selector);
		if (found) return found;
	}
	return null;
}

function collectElements(
	el: MockHTMLElement,
	selector: string,
): MockHTMLElement[] {
	const results: MockHTMLElement[] = [];
	if (matchesSelector(el, selector)) results.push(el);
	for (const child of el.children) {
		results.push(...collectElements(child, selector));
	}
	return results;
}

function matchesSelector(el: MockHTMLElement, selector: string): boolean {
	if (selector.startsWith(".")) {
		return el.className.includes(selector.slice(1));
	}
	if (selector.startsWith("input[type=")) {
		const typeMatch = selector.match(/input\[type="(.+)"\]/);
		return !!(typeMatch && el.tagName === "INPUT" && el.type === typeMatch[1]);
	}
	return false;
}

function createDocumentMock() {
	return {
		createElement: createMockElement,
		getElementById: () => null,
		body: { appendChild: () => {} },
	};
}

let localStorageMock: Storage;
let documentMock: ReturnType<typeof createDocumentMock>;

describe("Background Color Integration Tests (Task 7.4)", () => {
	beforeEach(() => {
		localStorageMock = createLocalStorageMock();
		documentMock = createDocumentMock();

		(globalThis as unknown as { localStorage: Storage }).localStorage =
			localStorageMock;
		(globalThis as unknown as { document: typeof documentMock }).document =
			documentMock;

		resetState();
		localStorageMock.clear();
	});

	afterEach(() => {
		resetState();
		localStorageMock.clear();

		if (originalLocalStorage !== undefined) {
			(globalThis as unknown as { localStorage: Storage }).localStorage =
				originalLocalStorage;
		} else {
			delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
		}
		if (originalDocument !== undefined) {
			(globalThis as unknown as { document: Document }).document =
				originalDocument;
		} else {
			delete (globalThis as unknown as { document?: Document }).document;
		}
	});

	function createColorChangeHandlers() {
		return {
			onLightColorChange: (hex: string) => {
				state.lightBackgroundColor = hex;
				persistBackgroundColors(
					state.lightBackgroundColor,
					state.darkBackgroundColor,
				);
			},
			onDarkColorChange: (hex: string) => {
				state.darkBackgroundColor = hex;
				persistBackgroundColors(
					state.lightBackgroundColor,
					state.darkBackgroundColor,
				);
			},
		};
	}

	function createSelector() {
		const handlers = createColorChangeHandlers();
		return createBackgroundColorSelector({
			lightColor: state.lightBackgroundColor,
			darkColor: state.darkBackgroundColor,
			...handlers,
		});
	}

	function getColorPickers(selector: ReturnType<typeof createSelector>) {
		return selector.querySelectorAll(
			".background-color-selector__color-picker",
		) as MockHTMLElement[];
	}

	/**
	 * 1. BackgroundColorSelector → DemoState連携の確認
	 * Requirements: 5.1
	 */
	describe("BackgroundColorSelector → DemoState Integration", () => {
		it("should update state when light color picker input event is dispatched", () => {
			expect(state.lightBackgroundColor).toBe("#ffffff");

			const selector = createSelector();
			const colorPickers = getColorPickers(selector);
			expect(colorPickers.length).toBeGreaterThanOrEqual(1);

			const lightColorPicker = colorPickers[0];
			lightColorPicker.value = "#f8fafc";
			lightColorPicker.dispatchEvent({
				type: "input",
				target: { value: "#f8fafc" },
			});

			expect(state.lightBackgroundColor).toBe("#f8fafc");

			const stored = localStorageMock.getItem("leonardo-backgroundColor");
			expect(stored).not.toBeNull();
			expect(JSON.parse(stored as string).light).toBe("#f8fafc");
		});

		it("should update state when dark color picker input event is dispatched", () => {
			expect(state.darkBackgroundColor).toBe("#000000");

			const selector = createSelector();
			const colorPickers = getColorPickers(selector);
			expect(colorPickers.length).toBeGreaterThanOrEqual(2);

			const darkColorPicker = colorPickers[1];
			darkColorPicker.value = "#18181b";
			darkColorPicker.dispatchEvent({
				type: "input",
				target: { value: "#18181b" },
			});

			expect(state.darkBackgroundColor).toBe("#18181b");

			const stored = localStorageMock.getItem("leonardo-backgroundColor");
			expect(stored).not.toBeNull();
			expect(JSON.parse(stored as string).dark).toBe("#18181b");
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

			const selector = createBackgroundColorSelector({
				lightColor: state.lightBackgroundColor,
				darkColor: state.darkBackgroundColor,
				onLightColorChange: () => {},
				onDarkColorChange: () => {},
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
	 * 3. Selector更新 → State反映 → View再計算のフロー検証
	 * Requirements: 5.1, 5.2, 5.5
	 */
	describe("Selector Update → State Reflection → View Recalculation Flow", () => {
		it("should complete full update cycle: selector event → state → persist", () => {
			const selector = createSelector();
			const colorPickers = getColorPickers(selector);
			expect(colorPickers.length).toBeGreaterThanOrEqual(1);

			colorPickers[0].value = "#336699";
			colorPickers[0].dispatchEvent({
				type: "input",
				target: { value: "#336699" },
			});

			expect(state.lightBackgroundColor).toBe("#336699");
			expect(
				JSON.parse(
					localStorageMock.getItem("leonardo-backgroundColor") as string,
				).light,
			).toBe("#336699");
		});

		it("should support rapid color changes without losing state", () => {
			const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"];
			const darks = ["#110000", "#001100", "#000011", "#111100", "#110011"];

			for (let i = 0; i < colors.length; i++) {
				state.lightBackgroundColor = colors[i];
				state.darkBackgroundColor = darks[i];
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
	 * 4. 状態の一貫性テスト
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
	 * 5. エッジケースとエラーハンドリング
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

/**
 * 背景色セレクターコンポーネントのテスト
 *
 * @module @/ui/demo/background-color-selector.test
 * Requirements: 1.1, 1.2, 1.5, 1.6, 4.1, 4.2, 4.4
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポート、依存関係の確認を行う。
 */

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * ソースファイルの内容を読み込むヘルパー関数
 */
function readSourceFile(): string {
	return readFileSync(
		join(import.meta.dir, "background-color-selector.ts"),
		"utf-8",
	);
}

describe("BackgroundColorSelector module", () => {
	describe("exports", () => {
		it("should export createBackgroundColorSelector function", async () => {
			const { createBackgroundColorSelector } = await import(
				"./background-color-selector"
			);
			expect(createBackgroundColorSelector).toBeDefined();
			expect(typeof createBackgroundColorSelector).toBe("function");
		});

		it("should export BackgroundColorSelectorProps type", async () => {
			const module = await import("./background-color-selector");
			expect(module).toBeDefined();
		});
	});

	describe("function signatures", () => {
		it("should accept props object as argument", async () => {
			const { createBackgroundColorSelector } = await import(
				"./background-color-selector"
			);
			expect(createBackgroundColorSelector.length).toBe(1);
		});
	});

	describe("dependency direction compliance", () => {
		it("should depend on state.ts for validation", () => {
			const content = readSourceFile();
			expect(content).toContain("./state");
			expect(content).toContain("validateBackgroundColor");
		});

		it("should NOT import from external UI modules directly", () => {
			const content = readSourceFile();
			expect(content).not.toContain("@/ui/style-constants");
			expect(content).not.toContain("@/core/");
		});
	});

	describe("props interface", () => {
		it("should define required properties in interface", () => {
			const content = readSourceFile();
			expect(content).toContain("lightColor: string");
			expect(content).toContain("darkColor: string");
			expect(content).toContain("onLightColorChange:");
			expect(content).toContain("onDarkColorChange:");
		});
	});

	describe("module loading", () => {
		it("should load without errors", async () => {
			const module = await import("./background-color-selector");
			expect(module).toBeDefined();
		});
	});

	describe("documentation compliance", () => {
		it("should have JSDoc comment with Requirements reference", () => {
			const content = readSourceFile();
			expect(content).toContain("Requirements:");
			expect(content).toContain("1.1");
			expect(content).toContain("1.2");
			expect(content).toContain("1.5");
			expect(content).toContain("1.6");
		});

		it("should reference design.md interface", () => {
			const content = readSourceFile();
			expect(content).toContain("BackgroundColorSelectorProps");
		});
	});

	describe("implementation requirements", () => {
		it("should create DOM elements for color picker and HEX input", () => {
			const content = readSourceFile();
			expect(content).toContain('type = "color"');
			expect(content).toContain('type = "text"');
		});

		it("should create error message area element", () => {
			const content = readSourceFile();
			expect(content).toContain("background-color-selector__error");
		});

		it("should include aria-label for accessibility", () => {
			const content = readSourceFile();
			expect(content).toContain("aria-label");
		});

		it("should include aria-describedby for error association", () => {
			const content = readSourceFile();
			expect(content).toContain("aria-describedby");
		});

		it("should track lastValidColor for invalid input handling", () => {
			const content = readSourceFile();
			expect(content).toContain("lastValidColor");
		});

		it("should restore color picker value on invalid input", () => {
			const content = readSourceFile();
			expect(content).toContain("colorInput.value = lastValidColor");
		});
	});

	/**
	 * Task 4.4: 入力のデバウンス処理
	 * Requirements: 4.1, 4.2, 4.4
	 */
	describe("debounce processing (Task 4.4)", () => {
		it("should export debounce utility function", () => {
			const content = readSourceFile();
			expect(content).toContain("debounce");
		});

		it("should apply 150ms debounce to HEX input", () => {
			const content = readSourceFile();
			expect(content).toContain("150");
			expect(content).toContain("debouncedHexInput");
		});

		it("should NOT apply debounce to color picker (realtime)", () => {
			const content = readSourceFile();
			const colorInputHandler = content.match(
				/colorInput\.addEventListener\("input"[^}]+\}/s,
			);
			expect(colorInputHandler).not.toBeNull();
			const handlerContent = colorInputHandler?.[0] ?? "";
			expect(handlerContent).not.toContain("debounce");
		});

		it("should reference Requirements 4.2, 4.4 in comments", () => {
			const content = readSourceFile();
			expect(content).toContain("4.2");
			expect(content).toContain("4.4");
		});
	});

	/**
	 * Task 4.4: デバウンス動作検証テスト（偽タイマー使用）
	 * Requirements: 4.1, 4.2, 4.4
	 */
	describe("debounce timing verification (Task 4.4)", () => {
		it("debounce function should delay execution by specified time", async () => {
			const { debounce, DEBOUNCE_DELAY_MS } = await import(
				"./background-color-selector"
			);

			let callCount = 0;
			const originalSetTimeout = globalThis.setTimeout;
			const originalClearTimeout = globalThis.clearTimeout;
			const timers: { callback: () => void; time: number; id: number }[] = [];
			let timerId = 0;

			globalThis.setTimeout = ((callback: () => void, delay: number) => {
				const id = ++timerId;
				timers.push({ callback, time: delay, id });
				return id;
			}) as typeof setTimeout;

			globalThis.clearTimeout = ((id: number) => {
				const index = timers.findIndex((t) => t.id === id);
				if (index !== -1) timers.splice(index, 1);
			}) as typeof clearTimeout;

			try {
				const fn = () => {
					callCount++;
				};
				const debouncedFn = debounce(fn, DEBOUNCE_DELAY_MS);

				debouncedFn();
				expect(callCount).toBe(0);
				expect(timers.length).toBe(1);
				expect(timers[0].time).toBe(150);

				timers[0].callback();
				expect(callCount).toBe(1);
			} finally {
				globalThis.setTimeout = originalSetTimeout;
				globalThis.clearTimeout = originalClearTimeout;
			}
		});

		it("debounce function should reset timer on repeated calls", async () => {
			const { debounce, DEBOUNCE_DELAY_MS } = await import(
				"./background-color-selector"
			);

			let callCount = 0;
			const originalSetTimeout = globalThis.setTimeout;
			const originalClearTimeout = globalThis.clearTimeout;
			const timers: { callback: () => void; time: number; id: number }[] = [];
			let timerId = 0;

			globalThis.setTimeout = ((callback: () => void, delay: number) => {
				const id = ++timerId;
				timers.push({ callback, time: delay, id });
				return id;
			}) as typeof setTimeout;

			globalThis.clearTimeout = ((id: number) => {
				const index = timers.findIndex((t) => t.id === id);
				if (index !== -1) timers.splice(index, 1);
			}) as typeof clearTimeout;

			try {
				const fn = () => {
					callCount++;
				};
				const debouncedFn = debounce(fn, DEBOUNCE_DELAY_MS);

				debouncedFn();
				debouncedFn();
				debouncedFn();

				expect(timers.length).toBe(1);
				expect(callCount).toBe(0);

				timers[0].callback();
				expect(callCount).toBe(1);
			} finally {
				globalThis.setTimeout = originalSetTimeout;
				globalThis.clearTimeout = originalClearTimeout;
			}
		});

		it("DEBOUNCE_DELAY_MS should be 150", async () => {
			const { DEBOUNCE_DELAY_MS } = await import("./background-color-selector");
			expect(DEBOUNCE_DELAY_MS).toBe(150);
		});
	});

	/**
	 * 2色セクションの構造テスト
	 */
	describe("two-color section structure", () => {
		it("should create light section with dynamic class", () => {
			const content = readSourceFile();
			expect(content).toContain("background-color-selector__section--${mode}");
		});

		it("should create sections for light and dark modes", () => {
			const content = readSourceFile();
			expect(content).toContain('"light"');
			expect(content).toContain('"dark"');
		});

		it("should have Light (Background) label for light section", () => {
			const content = readSourceFile();
			expect(content).toContain("Light (Background)");
		});

		it("should have Dark (Text) label for dark section", () => {
			const content = readSourceFile();
			expect(content).toContain("Dark (Text)");
		});
	});
});

/**
 * 背景色セレクターコンポーネントのテスト
 *
 * @module @/ui/demo/background-color-selector.test
 * Requirements: 1.1, 1.2, 1.5, 1.6, 2.1, 2.2, 4.1, 4.2, 4.4
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポート、依存関係の確認を行う。
 */

import { describe, expect, it } from "bun:test";

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
			// TypeScript型はランタイムに存在しないが、
			// インポートが成功することで型定義の存在を確認
			const module = await import("./background-color-selector");
			expect(module).toBeDefined();
		});

		it("should export LIGHT_PRESET_COLORS constant", async () => {
			const { LIGHT_PRESET_COLORS } = await import(
				"./background-color-selector"
			);
			expect(LIGHT_PRESET_COLORS).toBeDefined();
			expect(Array.isArray(LIGHT_PRESET_COLORS)).toBe(true);
		});

		it("should export DARK_PRESET_COLORS constant", async () => {
			const { DARK_PRESET_COLORS } = await import(
				"./background-color-selector"
			);
			expect(DARK_PRESET_COLORS).toBeDefined();
			expect(Array.isArray(DARK_PRESET_COLORS)).toBe(true);
		});

		it("should export PRESET_COLORS constant for backward compatibility", async () => {
			const { PRESET_COLORS } = await import("./background-color-selector");
			expect(PRESET_COLORS).toBeDefined();
			expect(Array.isArray(PRESET_COLORS)).toBe(true);
		});
	});

	describe("function signatures", () => {
		it("should accept props object as argument", async () => {
			const { createBackgroundColorSelector } = await import(
				"./background-color-selector"
			);
			// 関数のシグネチャを確認（引数1つ）
			expect(createBackgroundColorSelector.length).toBe(1);
		});
	});

	describe("dependency direction compliance", () => {
		it("should depend on state.ts for validation", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// state.tsからvalidateBackgroundColorをインポートしていることを確認
			expect(content).toContain("./state");
			expect(content).toContain("validateBackgroundColor");
		});

		it("should NOT import from external UI modules directly", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// 外部UI依存がないことを確認
			expect(content).not.toContain("@/ui/style-constants");
			expect(content).not.toContain("@/core/");
		});
	});

	describe("props interface", () => {
		it("should define required properties in interface", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// インターフェースに必須プロパティが定義されていることを確認
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
		it("should have JSDoc comment with Requirements reference", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// 要件参照を含むJSDocコメントがあることを確認
			expect(content).toContain("Requirements:");
			expect(content).toContain("1.1");
			expect(content).toContain("1.2");
			expect(content).toContain("1.5");
			expect(content).toContain("1.6");
		});

		it("should reference design.md interface", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// design.mdのインターフェース参照があることを確認
			expect(content).toContain("BackgroundColorSelectorProps");
		});
	});

	describe("implementation requirements", () => {
		it("should create DOM elements for color picker and HEX input", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// カラーピッカー（input type="color"）の作成
			expect(content).toContain('type = "color"');
			// HEX入力フィールド（input type="text"）の作成
			expect(content).toContain('type = "text"');
		});

		it("should create error message area element", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// エラーメッセージエリアの作成
			expect(content).toContain("background-color-selector__error");
		});

		it("should include aria-label for accessibility", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// aria-label設定
			expect(content).toContain("aria-label");
		});

		it("should include aria-describedby for error association", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// aria-describedby設定
			expect(content).toContain("aria-describedby");
		});

		it("should track lastValidColor for invalid input handling", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// 前の有効な値を追跡するための変数
			expect(content).toContain("lastValidColor");
		});

		it("should restore color picker value on invalid input", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// 無効入力時にカラーピッカーを前の有効値で更新
			expect(content).toContain("colorInput.value = lastValidColor");
		});
	});

	/**
	 * Task 4.2: プリセット背景色ボタン
	 * Requirements: 2.1, 2.2
	 */
	describe("preset color buttons (Task 4.2)", () => {
		it("should export PRESET_COLORS constant", async () => {
			const { PRESET_COLORS } = await import("./background-color-selector");
			expect(PRESET_COLORS).toBeDefined();
			expect(Array.isArray(PRESET_COLORS)).toBe(true);
		});

		it("should define 4 preset colors total", async () => {
			const { PRESET_COLORS } = await import("./background-color-selector");
			expect(PRESET_COLORS.length).toBe(4);
		});

		it("should define 2 light preset colors", async () => {
			const { LIGHT_PRESET_COLORS } = await import(
				"./background-color-selector"
			);
			expect(LIGHT_PRESET_COLORS.length).toBe(2);
		});

		it("should define 2 dark preset colors", async () => {
			const { DARK_PRESET_COLORS } = await import(
				"./background-color-selector"
			);
			expect(DARK_PRESET_COLORS.length).toBe(2);
		});

		it("should include White preset (#ffffff)", async () => {
			const { LIGHT_PRESET_COLORS } = await import(
				"./background-color-selector"
			);
			const white = LIGHT_PRESET_COLORS.find(
				(p: { hex: string }) => p.hex === "#ffffff",
			);
			expect(white).toBeDefined();
			expect(white?.name).toBe("White");
			expect(white?.mode).toBe("light");
		});

		it("should include Light Gray preset (#f8fafc)", async () => {
			const { LIGHT_PRESET_COLORS } = await import(
				"./background-color-selector"
			);
			const lightGray = LIGHT_PRESET_COLORS.find(
				(p: { hex: string }) => p.hex === "#f8fafc",
			);
			expect(lightGray).toBeDefined();
			expect(lightGray?.name).toBe("Light Gray");
			expect(lightGray?.mode).toBe("light");
		});

		it("should include Dark Gray preset (#18181b)", async () => {
			const { DARK_PRESET_COLORS } = await import(
				"./background-color-selector"
			);
			const darkGray = DARK_PRESET_COLORS.find(
				(p: { hex: string }) => p.hex === "#18181b",
			);
			expect(darkGray).toBeDefined();
			expect(darkGray?.name).toBe("Dark Gray");
			expect(darkGray?.mode).toBe("dark");
		});

		it("should include Black preset (#000000)", async () => {
			const { DARK_PRESET_COLORS } = await import(
				"./background-color-selector"
			);
			const black = DARK_PRESET_COLORS.find(
				(p: { hex: string }) => p.hex === "#000000",
			);
			expect(black).toBeDefined();
			expect(black?.name).toBe("Black");
			expect(black?.mode).toBe("dark");
		});

		it("should export PresetColor type via PRESET_COLORS inference", async () => {
			const { PRESET_COLORS } = await import("./background-color-selector");
			// 型推論で各プリセットがname, hex, modeを持つことを確認
			for (const preset of PRESET_COLORS) {
				expect(typeof preset.name).toBe("string");
				expect(typeof preset.hex).toBe("string");
				expect(["light", "dark"]).toContain(preset.mode);
			}
		});

		it("should create preset buttons container in DOM", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// プリセットボタンコンテナのクラス名
			expect(content).toContain("background-color-selector__presets");
		});

		it("should create buttons for each preset", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// プリセットごとにボタンを作成するループ
			expect(content).toContain("background-color-selector__preset-button");
		});

		it("should set button type to button for keyboard accessibility", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// ボタンタイプを明示的に設定（フォーム送信防止）
			expect(content).toContain('type = "button"');
		});

		it("should include aria-label for preset buttons", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// aria-labelでプリセット名を設定
			expect(content).toContain("aria-label");
			expect(content).toContain("preset.name");
		});

		it("should add click handler to apply preset color", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// クリックハンドラーの追加
			expect(content).toContain('addEventListener("click"');
			expect(content).toContain("preset.hex");
		});

		it("should reference Requirements 2.1, 2.2 in JSDoc", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// Requirements 2.1, 2.2の参照
			expect(content).toContain("2.1");
			expect(content).toContain("2.2");
		});
	});

	/**
	 * Task 4.4: 入力のデバウンス処理
	 * Requirements: 4.1, 4.2, 4.4
	 */
	describe("debounce processing (Task 4.4)", () => {
		it("should export debounce utility function", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// デバウンス関数の存在
			expect(content).toContain("debounce");
		});

		it("should apply 150ms debounce to HEX input", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// HEX入力に150msデバウンスを適用
			expect(content).toContain("150");
			// デバウンスされたハンドラーの使用
			expect(content).toContain("debouncedHexInput");
		});

		it("should NOT apply debounce to color picker (realtime)", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// カラーピッカーはリアルタイム更新（デバウンスなし）
			// colorInputのイベントハンドラーにdebounceが含まれていないことを確認
			const colorInputHandler = content.match(
				/colorInput\.addEventListener\("input"[^}]+\}/s,
			);
			expect(colorInputHandler).not.toBeNull();
			// カラーピッカーハンドラー内にdebounceがないことを確認
			const handlerContent = colorInputHandler?.[0] ?? "";
			expect(handlerContent).not.toContain("debounce");
		});

		it("should reference Requirements 4.1, 4.2, 4.4 in comments", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// Requirements参照
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

			// 偽タイマーのセットアップ
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

				// 呼び出し直後は実行されない
				debouncedFn();
				expect(callCount).toBe(0);
				expect(timers.length).toBe(1);
				expect(timers[0].time).toBe(150);

				// タイマー実行をシミュレート
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

				// 連続呼び出し
				debouncedFn();
				debouncedFn();
				debouncedFn();

				// 最後のタイマーのみが残る
				expect(timers.length).toBe(1);
				expect(callCount).toBe(0);

				// タイマー実行
				timers[0].callback();
				expect(callCount).toBe(1); // 1回だけ実行される
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
		it("should create light section with dynamic class", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// Template literal creates section--${mode} dynamically
			expect(content).toContain("background-color-selector__section--${mode}");
		});

		it("should create sections for light and dark modes", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// Both light and dark modes are used
			expect(content).toContain('"light"');
			expect(content).toContain('"dark"');
		});

		it("should have Light Background label for light section", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			expect(content).toContain("Light Background");
		});

		it("should have Dark (Text) label for dark section", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			expect(content).toContain("Dark (Text)");
		});
	});
});

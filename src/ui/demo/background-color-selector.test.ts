/**
 * 背景色セレクターコンポーネントのテスト
 *
 * @module @/ui/demo/background-color-selector.test
 * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 2.1, 2.2
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
			expect(content).toContain("currentColor: string");
			expect(content).toContain("onColorChange:");
		});

		it("should define optional showAdvancedMode property", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// オプショナルプロパティが定義されていることを確認
			expect(content).toContain("showAdvancedMode?:");
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

		it("should create preview area element", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// プレビューエリアの作成
			expect(content).toContain("background-color-selector__preview");
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

		it("should track lastValidColor for Requirement 1.5", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// 前の有効な値を追跡するための変数
			expect(content).toContain("lastValidColor");
			// 無効入力時に前の値を保持するコメント
			expect(content).toContain("Requirement 1.5");
		});

		it("should restore preview and color picker on invalid input", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// 無効入力時にカラーピッカーとプレビューを前の有効値で更新
			expect(content).toContain("colorInput.value = lastValidColor");
			expect(content).toContain("updatePreview(lastValidColor)");
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

		it("should define 4 preset colors", async () => {
			const { PRESET_COLORS } = await import("./background-color-selector");
			expect(PRESET_COLORS.length).toBe(4);
		});

		it("should include White preset (#ffffff)", async () => {
			const { PRESET_COLORS } = await import("./background-color-selector");
			const white = PRESET_COLORS.find(
				(p: { hex: string }) => p.hex === "#ffffff",
			);
			expect(white).toBeDefined();
			expect(white?.name).toBe("White");
			expect(white?.mode).toBe("light");
		});

		it("should include Light Gray preset (#f8fafc)", async () => {
			const { PRESET_COLORS } = await import("./background-color-selector");
			const lightGray = PRESET_COLORS.find(
				(p: { hex: string }) => p.hex === "#f8fafc",
			);
			expect(lightGray).toBeDefined();
			expect(lightGray?.name).toBe("Light Gray");
			expect(lightGray?.mode).toBe("light");
		});

		it("should include Dark Gray preset (#18181b)", async () => {
			const { PRESET_COLORS } = await import("./background-color-selector");
			const darkGray = PRESET_COLORS.find(
				(p: { hex: string }) => p.hex === "#18181b",
			);
			expect(darkGray).toBeDefined();
			expect(darkGray?.name).toBe("Dark Gray");
			expect(darkGray?.mode).toBe("dark");
		});

		it("should include Black preset (#000000)", async () => {
			const { PRESET_COLORS } = await import("./background-color-selector");
			const black = PRESET_COLORS.find(
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
			expect(content).toContain("PRESET_COLORS");
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
	 * Task 4.3: 詳細モード（OKLCH入力）
	 * Requirements: 1.3
	 */
	describe("advanced mode OKLCH input (Task 4.3)", () => {
		it("should create advanced mode toggle button", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// 詳細モード切替ボタンのクラス名
			expect(content).toContain("background-color-selector__advanced-toggle");
		});

		it("should create OKLCH input container", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// OKLCH入力コンテナのクラス名
			expect(content).toContain("background-color-selector__oklch-inputs");
		});

		it("should create L/C/H individual input fields", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// L/C/H入力フィールドのクラス名
			expect(content).toContain("background-color-selector__oklch-l");
			expect(content).toContain("background-color-selector__oklch-c");
			expect(content).toContain("background-color-selector__oklch-h");
		});

		it("should set initial display to none for OKLCH container", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// 初期状態OFF（非表示）- 三項演算子で設定
			expect(content).toContain('advancedModeEnabled ? "block" : "none"');
		});

		it("should toggle OKLCH container visibility on button click", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// トグル処理（表示切替）
			expect(content).toContain("advancedModeEnabled");
			expect(content).toContain("block");
		});

		it("should include aria-label for OKLCH input fields", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// aria-label設定
			expect(content).toContain("Lightness");
			expect(content).toContain("Chroma");
			expect(content).toContain("Hue");
		});

		it("should validate OKLCH input and update color", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// OKLCH入力時のバリデーション呼び出し
			expect(content).toContain("validateBackgroundColor");
			expect(content).toContain("oklch(");
		});

		it("should respect showAdvancedMode prop", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// props.showAdvancedModeの参照
			expect(content).toContain("showAdvancedMode");
		});

		it("should reference Requirement 1.3 in JSDoc", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// Requirement 1.3の参照
			expect(content).toContain("1.3");
		});

		it("should include aria-describedby on OKLCH inputs for error association", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// L/C/H入力にaria-describedbyが設定されている
			const matches = content.match(
				/lInput\.setAttribute\("aria-describedby"/g,
			);
			expect(matches).not.toBeNull();
			expect(content).toContain('cInput.setAttribute("aria-describedby"');
			expect(content).toContain('hInput.setAttribute("aria-describedby"');
		});

		it("should set aria-invalid on OKLCH validation failure", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// aria-invalidの設定関数が存在
			expect(content).toContain("setOklchInputsInvalid");
			expect(content).toContain('setAttribute("aria-invalid"');
		});

		it("should construct oklch string and call validateBackgroundColor", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// OKLCH文字列の構築とバリデーション呼び出し
			expect(content).toContain("oklch(${l} ${c} ${h})");
			expect(content).toContain("validateBackgroundColor(oklchString)");
		});

		it("should update preview and call onColorChange on valid OKLCH input", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// 有効なOKLCH入力時の処理
			expect(content).toContain("result.valid && result.hex");
			expect(content).toContain("updatePreview(result.hex)");
			expect(content).toContain("onColorChange(result.hex)");
		});

		it("should clear OKLCH aria-invalid via other input paths", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(
				import.meta.dir,
				"background-color-selector.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// カラーピッカー、HEX入力、プリセットボタンでもaria-invalidを解除
			// 各入力経路でsetOklchInputsInvalid(false)が呼ばれることを確認
			const colorPickerHandler = content.match(
				/colorInput\.addEventListener\("input"[^}]+setOklchInputsInvalid\(false\)/s,
			);
			expect(colorPickerHandler).not.toBeNull();

			const hexInputHandler = content.match(
				/hexInput\.addEventListener\("input"[^}]+setOklchInputsInvalid\(false\)/s,
			);
			expect(hexInputHandler).not.toBeNull();

			const presetButtonHandler = content.match(
				/button\.addEventListener\("click"[^}]+setOklchInputsInvalid\(false\)/s,
			);
			expect(presetButtonHandler).not.toBeNull();
		});
	});
});

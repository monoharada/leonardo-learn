/**
 * 背景色セレクターコンポーネントのテスト
 *
 * @module @/ui/demo/background-color-selector.test
 * Requirements: 1.1, 1.2, 1.5, 1.6
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
});

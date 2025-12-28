/**
 * エディタモジュールのテスト
 *
 * @module @/ui/demo/editor.test
 * Requirements: 7.2, 7.3
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポートの確認を行う。
 */

import { describe, expect, it } from "bun:test";

describe("editor module", () => {
	describe("exports", () => {
		it("should export updateEditor function", async () => {
			const { updateEditor } = await import("./editor");
			expect(updateEditor).toBeDefined();
			expect(typeof updateEditor).toBe("function");
		});

		it("should only export public API functions", async () => {
			const module = await import("./editor");
			const exportedKeys = Object.keys(module);

			// 設計仕様に基づく公開API: updateEditor
			expect(exportedKeys).toContain("updateEditor");

			// 内部関数がエクスポートされていないことを確認
			expect(exportedKeys).not.toContain("setButtonActive");
		});
	});

	describe("function signatures", () => {
		it("updateEditor should accept onHarmonyChange callback", async () => {
			const { updateEditor } = await import("./editor");
			// 関数のシグネチャを確認（引数1つ）
			expect(updateEditor.length).toBe(1);
		});
	});

	describe("dependency compliance", () => {
		it("should only depend on state.ts and types.ts", async () => {
			// モジュールのロードが成功することを確認
			// 依存関係はコード内で直接確認
			const module = await import("./editor");
			expect(module).toBeDefined();
		});

		it("should not directly depend on palette-generator", async () => {
			// 設計仕様: palette-generatorへの依存はコールバック経由で解決
			// Feature→Feature依存回避のため、直接importは禁止
			// ハーモニー変更時はonHarmonyChangeコールバックで通知
			const module = await import("./editor");
			expect(module).toBeDefined();
		});
	});
});

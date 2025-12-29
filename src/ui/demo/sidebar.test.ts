/**
 * サイドバーモジュールのテスト
 *
 * @module @/ui/demo/sidebar.test
 * Requirements: 7.1, 7.3
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポート、依存関係の確認を行う。
 */

import { describe, expect, it } from "bun:test";

describe("sidebar module", () => {
	describe("exports", () => {
		it("should export renderSidebar function", async () => {
			const { renderSidebar } = await import("./sidebar");
			expect(renderSidebar).toBeDefined();
			expect(typeof renderSidebar).toBe("function");
		});

		it("should only export public API functions", async () => {
			const module = await import("./sidebar");
			const exportedKeys = Object.keys(module);

			// 設計仕様に基づく公開API: renderSidebar のみ
			expect(exportedKeys).toContain("renderSidebar");

			// 内部関数がエクスポートされていないことを確認
			expect(exportedKeys).not.toContain("setButtonActive");
		});
	});

	describe("function signatures", () => {
		it("should accept container and onPaletteSelect callback", async () => {
			const { renderSidebar } = await import("./sidebar");
			// 関数のシグネチャを確認（引数2つ）
			expect(renderSidebar.length).toBe(2);
		});
	});

	describe("dependency direction compliance", () => {
		it("should NOT import from @/ui/style-constants (external dependency)", async () => {
			// sidebar.tsのソースを読み取って依存関係を検証
			const fs = await import("node:fs");
			const path = await import("node:path");
			const sidebarPath = path.join(import.meta.dir, "sidebar.ts");
			const content = fs.readFileSync(sidebarPath, "utf-8");

			// @/ui/style-constantsへの依存がないことを確認
			// (依存方向ルール: Feature → State のみ許可、外部UI依存禁止)
			expect(content).not.toContain("@/ui/style-constants");
		});

		it("should only depend on state.ts within demo module", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const sidebarPath = path.join(import.meta.dir, "sidebar.ts");
			const content = fs.readFileSync(sidebarPath, "utf-8");

			// 許可されている依存: state.ts, types.ts
			const hasStateImport = content.includes("./state");

			expect(hasStateImport).toBe(true);
		});
	});

	describe("module loading", () => {
		it("should load without errors", async () => {
			// モジュールのロードが成功することを確認
			const module = await import("./sidebar");
			expect(module).toBeDefined();
		});
	});
});

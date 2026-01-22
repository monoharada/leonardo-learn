/**
 * エントリポイント（index.ts）のテスト
 *
 * Task 5.1: runDemo関数のテスト
 * - エクスポートの確認
 * - 関数シグネチャの確認
 * - 依存関係の確認
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポートの確認を行う。
 *
 * @module @/ui/demo/index.test
 * Requirements: 2.4, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { describe, expect, it } from "bun:test";

describe("index.ts module", () => {
	describe("exports", () => {
		it("should export runDemo function", async () => {
			const { runDemo } = await import("./index");
			expect(runDemo).toBeDefined();
			expect(typeof runDemo).toBe("function");
		});

		it("should only export runDemo as public API", async () => {
			const module = await import("./index");
			const exportedKeys = Object.keys(module);

			// 設計仕様: runDemoのみが公開API
			expect(exportedKeys).toContain("runDemo");

			// 内部関数がエクスポートされていないことを確認
			expect(exportedKeys).not.toContain("renderMain");
			expect(exportedKeys).not.toContain("handlePaletteSelect");
			expect(exportedKeys).not.toContain("handleColorClick");
		});
	});

	describe("function signatures", () => {
		it("runDemo should accept no arguments", async () => {
			const { runDemo } = await import("./index");
			// runDemoは引数を取らない
			expect(runDemo.length).toBe(0);
		});
	});

	describe("dependency compliance", () => {
		it("should import from state module", async () => {
			// stateモジュールのインポートが成功することを確認
			const stateModule = await import("./state");
			expect(stateModule.state).toBeDefined();
			expect(stateModule.getActivePalette).toBeDefined();
			expect(stateModule.parseKeyColor).toBeDefined();
		});

		it("should import from navigation module", async () => {
			const navModule = await import("./navigation");
			expect(navModule.setupNavigation).toBeDefined();
			expect(navModule.updateViewButtons).toBeDefined();
		});

		it("should import from sidebar module", async () => {
			const sidebarModule = await import("./sidebar");
			expect(sidebarModule.renderSidebar).toBeDefined();
		});

		it("should import from editor module", async () => {
			const editorModule = await import("./editor");
			expect(editorModule.updateEditor).toBeDefined();
		});

		it("should import from palette-generator module", async () => {
			const paletteGenModule = await import("./palette-generator");
			expect(paletteGenModule.handleGenerate).toBeDefined();
		});

		it("should import from export-handlers module", async () => {
			const exportModule = await import("./export-handlers");
			expect(exportModule.setupExportHandlers).toBeDefined();
			expect(exportModule.setupDirectExportButtons).toBeDefined();
		});

		it("should import from cvd-controls module", async () => {
			const cvdModule = await import("./cvd-controls");
			expect(cvdModule.setupCVDControls).toBeDefined();
			expect(cvdModule.applySimulation).toBeDefined();
			expect(cvdModule.updateCVDScoreDisplay).toBeDefined();
		});

		it("should import from color-detail-modal module", async () => {
			const modalModule = await import("./color-detail-modal");
			expect(modalModule.openColorDetailModal).toBeDefined();
		});

		it("should import from views barrel", async () => {
			const viewsModule = await import("./views");
			expect(viewsModule.renderManualView).toBeDefined();
			expect(viewsModule.renderStudioView).toBeDefined();
			expect(viewsModule.renderAccessibilityView).toBeDefined();
		});
	});

	describe("architecture compliance", () => {
		it("index module can be imported without errors", async () => {
			// モジュールのロードが成功することを確認（循環依存チェック）
			const module = await import("./index");
			expect(module).toBeDefined();
		});

		it("all feature modules can be imported together", async () => {
			// 全Feature/Viewモジュールを同時にインポート（循環依存チェック）
			const [
				stateModule,
				navModule,
				sidebarModule,
				editorModule,
				paletteGenModule,
				exportModule,
				cvdModule,
				modalModule,
				viewsModule,
			] = await Promise.all([
				import("./state"),
				import("./navigation"),
				import("./sidebar"),
				import("./editor"),
				import("./palette-generator"),
				import("./export-handlers"),
				import("./cvd-controls"),
				import("./color-detail-modal"),
				import("./views"),
			]);

			expect(stateModule).toBeDefined();
			expect(navModule).toBeDefined();
			expect(sidebarModule).toBeDefined();
			expect(editorModule).toBeDefined();
			expect(paletteGenModule).toBeDefined();
			expect(exportModule).toBeDefined();
			expect(cvdModule).toBeDefined();
			expect(modalModule).toBeDefined();
			expect(viewsModule).toBeDefined();
		});
	});
});

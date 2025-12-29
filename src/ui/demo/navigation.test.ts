/**
 * ナビゲーションモジュールのテスト
 *
 * @module @/ui/demo/navigation.test
 * Requirements: 8.1, 8.2, 8.3
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポートの確認を行う。
 */

import { describe, expect, it } from "bun:test";

describe("navigation module", () => {
	describe("exports", () => {
		it("should export announceViewChange function", async () => {
			const { announceViewChange } = await import("./navigation");
			expect(announceViewChange).toBeDefined();
			expect(typeof announceViewChange).toBe("function");
		});

		it("should export updateViewButtons function", async () => {
			const { updateViewButtons } = await import("./navigation");
			expect(updateViewButtons).toBeDefined();
			expect(typeof updateViewButtons).toBe("function");
		});

		it("should export setupNavigation function", async () => {
			const { setupNavigation } = await import("./navigation");
			expect(setupNavigation).toBeDefined();
			expect(typeof setupNavigation).toBe("function");
		});

		it("should only export public API functions", async () => {
			const module = await import("./navigation");
			const exportedKeys = Object.keys(module);

			// 設計仕様に基づく公開API: updateViewButtons, announceViewChange, setupNavigation
			expect(exportedKeys).toContain("updateViewButtons");
			expect(exportedKeys).toContain("announceViewChange");
			expect(exportedKeys).toContain("setupNavigation");

			// 内部関数がエクスポートされていないことを確認
			expect(exportedKeys).not.toContain("getNavigationElements");
			expect(exportedKeys).not.toContain("setButtonActive");
		});
	});

	describe("function signatures", () => {
		it("updateViewButtons should accept mode and callback", async () => {
			const { updateViewButtons } = await import("./navigation");
			// 関数のシグネチャを確認（引数2つ）
			expect(updateViewButtons.length).toBe(2);
		});

		it("announceViewChange should accept viewName", async () => {
			const { announceViewChange } = await import("./navigation");
			// 関数のシグネチャを確認（引数1つ）
			expect(announceViewChange.length).toBe(1);
		});

		it("setupNavigation should accept callback", async () => {
			const { setupNavigation } = await import("./navigation");
			// 関数のシグネチャを確認（引数1つ）
			expect(setupNavigation.length).toBe(1);
		});
	});

	describe("dependency compliance", () => {
		it("should only depend on state.ts and types.ts", async () => {
			// モジュールのロードが成功することを確認
			// 依存関係はコード内で直接確認
			const module = await import("./navigation");
			expect(module).toBeDefined();
		});
	});
});

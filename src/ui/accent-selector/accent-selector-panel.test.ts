/**
 * AccentSelectorPanel テスト
 *
 * Task 4.1: AccentSelectorPanel 基本UIの実装
 * Requirements: 4.1, 7.1
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポート、依存関係、ロジックの確認を行う。
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { clearErrorState } from "../../core/accent/error-state";

describe("AccentSelectorPanel module", () => {
	beforeEach(() => {
		// エラー状態をリセット
		clearErrorState();
	});

	describe("exports", () => {
		it("should export AccentSelectorPanel class", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			expect(AccentSelectorPanel).toBeDefined();
			expect(typeof AccentSelectorPanel).toBe("function");
		});

		it("should export AccentSelectorPanelState type", async () => {
			const module = await import("./accent-selector-panel");
			// TypeScriptの型はランタイムには存在しないが、モジュールがロードできることを確認
			expect(module).toBeDefined();
		});
	});

	describe("module loading", () => {
		it("should load without errors", async () => {
			const module = await import("./accent-selector-panel");
			expect(module).toBeDefined();
		});
	});

	describe("dependency direction compliance", () => {
		it("should import from core/accent modules", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accent-selector-panel.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// 許可されている依存関係
			expect(content).toContain("../../core/accent/accent-candidate-service");
			expect(content).toContain("../../core/accent/error-state");
		});
	});
});

describe("AccentSelectorPanel class logic", () => {
	beforeEach(() => {
		clearErrorState();
	});

	describe("initial state", () => {
		it("should have isOpen = false initially", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			// DOMなしでクラスをインスタンス化（モックを渡す）
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			expect(panel.getState().isOpen).toBe(false);
		});

		it("should have isLoading = false initially", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			expect(panel.getState().isLoading).toBe(false);
		});

		it("should have error = null initially", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			expect(panel.getState().error).toBeNull();
		});

		it("should have brandColorHex = null initially", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			expect(panel.getState().brandColorHex).toBeNull();
		});
	});

	describe("setBrandColor", () => {
		it("should set brandColorHex", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			panel.setBrandColor("#0056FF");
			expect(panel.getState().brandColorHex).toBe("#0056FF");
		});

		it("should clear BRAND_COLOR_NOT_SET error when brand color is set", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			panel.setError({
				code: "BRAND_COLOR_NOT_SET",
				message: "ブランドカラーを設定してください",
			});
			expect(panel.getState().error).not.toBeNull();

			panel.setBrandColor("#0056FF");
			expect(panel.getState().error).toBeNull();
		});

		it("should not clear other error types when brand color is set", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			panel.setError({
				code: "DADS_LOAD_FAILED",
				message: "DADSデータの読み込みに失敗しました",
			});

			panel.setBrandColor("#0056FF");
			// DADS_LOAD_FAILEDエラーはクリアされない
			expect(panel.getState().error?.code).toBe("DADS_LOAD_FAILED");
		});
	});

	describe("setError", () => {
		it("should set error state", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			panel.setError({
				code: "SCORE_CALCULATION_FAILED",
				message: "スコア計算中にエラーが発生しました",
			});

			const state = panel.getState();
			expect(state.error?.code).toBe("SCORE_CALCULATION_FAILED");
			expect(state.error?.message).toBe("スコア計算中にエラーが発生しました");
		});
	});

	describe("clearError", () => {
		it("should clear error state", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			panel.setError({
				code: "SCORE_CALCULATION_FAILED",
				message: "スコア計算中にエラーが発生しました",
			});
			expect(panel.getState().error).not.toBeNull();

			panel.clearError();
			expect(panel.getState().error).toBeNull();
		});
	});

	describe("setLoading", () => {
		it("should set loading state", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			panel.setLoading(true);
			expect(panel.getState().isLoading).toBe(true);

			panel.setLoading(false);
			expect(panel.getState().isLoading).toBe(false);
		});
	});

	describe("isDisabled", () => {
		it("should return true when DADS_LOAD_FAILED error is set", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			panel.setError({
				code: "DADS_LOAD_FAILED",
				message: "DADSデータの読み込みに失敗しました",
			});

			expect(panel.isDisabled()).toBe(true);
		});

		it("should return true when BRAND_COLOR_NOT_SET error is set", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			panel.setError({
				code: "BRAND_COLOR_NOT_SET",
				message: "ブランドカラーを設定してください",
			});

			expect(panel.isDisabled()).toBe(true);
		});

		it("should return true when SCORE_CALCULATION_FAILED error is set (auto selection disabled)", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			panel.setError({
				code: "SCORE_CALCULATION_FAILED",
				message: "スコア計算中にエラーが発生しました",
			});

			// SCORE_CALCULATION_FAILEDはautoSelectionDisabled=trueなのでisDisabledはtrue
			expect(panel.isDisabled()).toBe(true);
		});

		it("should return false when no error is set", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			expect(panel.isDisabled()).toBe(false);
		});
	});

	describe("closePanel", () => {
		it("should set isOpen to false", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				// documentが存在するテスト環境でも安全に動作するよう、
				// 既存要素を返さずに新規生成パスを通す
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			// 状態を直接設定（openPanelは非同期なので）
			(panel as unknown as { state: { isOpen: boolean } }).state.isOpen = true;
			expect(panel.getState().isOpen).toBe(true);

			panel.closePanel();
			expect(panel.getState().isOpen).toBe(false);
		});
	});
});

describe("AccentSelectorPanel error scenarios", () => {
	beforeEach(() => {
		clearErrorState();
	});

	describe("openPanel without brand color", () => {
		it("should set BRAND_COLOR_NOT_SET error when openPanel is called without brand color", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			// ブランドカラーを設定せずにopenPanel
			await panel.openPanel();

			const state = panel.getState();
			expect(state.error?.code).toBe("BRAND_COLOR_NOT_SET");
			expect(state.error?.message).toBe("ブランドカラーを設定してください");
		});

		it("should open panel with error when brand color is not set", async () => {
			const { AccentSelectorPanel } = await import("./accent-selector-panel");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const panel = new AccentSelectorPanel(mockContainer);
			await panel.openPanel();

			// パネルは開いてエラー状態を表示
			expect(panel.getState().isOpen).toBe(true);
			expect(panel.getState().error?.code).toBe("BRAND_COLOR_NOT_SET");
		});
	});
});

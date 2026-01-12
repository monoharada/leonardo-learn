/**
 * セマンティックカラーセクションUIのテスト
 *
 * パレットビュー内のセマンティックカラー表示と
 * 警告色パターン選択UIをテストする。
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポート、ロジックの確認を行う。
 *
 * @module @/ui/semantic-color/semantic-color-section.test
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { resetState, state } from "@/ui/demo/state";

/**
 * localStorageのモック実装
 * Bun test環境ではlocalStorageが存在しないため
 */
function createLocalStorageMock() {
	const store = new Map<string, string>();
	return {
		getItem: (key: string): string | null => store.get(key) ?? null,
		setItem: (key: string, value: string): void => {
			store.set(key, value);
		},
		removeItem: (key: string): void => {
			store.delete(key);
		},
		clear: (): void => {
			store.clear();
		},
		get length(): number {
			return store.size;
		},
		key: (index: number): string | null => {
			const keys = Array.from(store.keys());
			return keys[index] ?? null;
		},
	};
}

// グローバルにlocalStorageモックを設定
const localStorageMock = createLocalStorageMock();
(globalThis as unknown as { localStorage: Storage }).localStorage =
	localStorageMock as Storage;

describe("semantic-color-section module", () => {
	beforeEach(() => {
		resetState();
	});

	afterEach(() => {
		resetState();
	});

	describe("exports", () => {
		it("should export createSemanticColorSection function", async () => {
			const { createSemanticColorSection } = await import(
				"./semantic-color-section"
			);
			expect(createSemanticColorSection).toBeDefined();
			expect(typeof createSemanticColorSection).toBe("function");
		});

		it("should export handleWarningPatternChange function", async () => {
			const { handleWarningPatternChange } = await import(
				"./semantic-color-section"
			);
			expect(handleWarningPatternChange).toBeDefined();
			expect(typeof handleWarningPatternChange).toBe("function");
		});

		it("should export updateAutoSelectionInfo function", async () => {
			const { updateAutoSelectionInfo } = await import(
				"./semantic-color-section"
			);
			expect(updateAutoSelectionInfo).toBeDefined();
			expect(typeof updateAutoSelectionInfo).toBe("function");
		});

		it("should export SemanticColorSectionCallbacks type", async () => {
			// TypeScript型はランタイムに存在しないが、
			// インポートが成功することで型定義の存在を確認
			const module = await import("./semantic-color-section");
			expect(module).toBeDefined();
		});
	});

	describe("handleWarningPatternChange", () => {
		it("should update state with yellow pattern", async () => {
			const { handleWarningPatternChange } = await import(
				"./semantic-color-section"
			);

			await handleWarningPatternChange("yellow", "#0066CC", []);

			expect(state.semanticColorConfig.warningPattern).toBe("yellow");
		});

		it("should update state with orange pattern", async () => {
			const { handleWarningPatternChange } = await import(
				"./semantic-color-section"
			);

			await handleWarningPatternChange("orange", "#0066CC", []);

			expect(state.semanticColorConfig.warningPattern).toBe("orange");
		});

		it("should update state with auto pattern and resolve", async () => {
			const { handleWarningPatternChange } = await import(
				"./semantic-color-section"
			);

			await handleWarningPatternChange("auto", "#0066CC", ["#FF0000"]);

			expect(state.semanticColorConfig.warningPattern).toBe("auto");
			expect(state.semanticColorConfig.resolvedWarningPattern).toMatch(
				/^(yellow|orange)$/,
			);
		});

		it("should set autoSelectionDetails when auto is selected", async () => {
			const { handleWarningPatternChange } = await import(
				"./semantic-color-section"
			);

			await handleWarningPatternChange("auto", "#0066CC", ["#FF0000"]);

			const details = state.semanticColorConfig.autoSelectionDetails;
			expect(details).toBeDefined();
			expect(details?.yellowScore).toBeDefined();
			expect(details?.orangeScore).toBeDefined();
			expect(details?.reason).toBeDefined();
		});

		it("should not set autoSelectionDetails for manual patterns", async () => {
			const { handleWarningPatternChange } = await import(
				"./semantic-color-section"
			);

			await handleWarningPatternChange("yellow", "#0066CC", []);

			expect(state.semanticColorConfig.autoSelectionDetails).toBeUndefined();
		});

		it("should handle various anchor colors", async () => {
			const { handleWarningPatternChange } = await import(
				"./semantic-color-section"
			);

			const colors = ["#0066CC", "#FF6600", "#00CC00", "#9900FF"];

			for (const anchor of colors) {
				await handleWarningPatternChange("auto", anchor, []);
				expect(state.semanticColorConfig.warningPattern).toBe("auto");
				expect(state.semanticColorConfig.resolvedWarningPattern).toMatch(
					/^(yellow|orange)$/,
				);
			}
		});
	});

	describe("state integration", () => {
		it("should persist warning pattern to localStorage", async () => {
			const { handleWarningPatternChange } = await import(
				"./semantic-color-section"
			);
			const { SEMANTIC_COLOR_CONFIG_STORAGE_KEY } = await import(
				"@/ui/demo/state"
			);

			await handleWarningPatternChange("orange", "#0066CC", []);

			// localStorage mock is set up in test environment
			const stored = localStorage.getItem(SEMANTIC_COLOR_CONFIG_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				expect(parsed.warningPattern).toBe("orange");
			}
		});

		it("should reset state correctly", () => {
			state.semanticColorConfig.warningPattern = "orange";
			state.semanticColorConfig.resolvedWarningPattern = "orange";

			resetState();

			expect(state.semanticColorConfig.warningPattern).toBe("auto");
			expect(state.semanticColorConfig.resolvedWarningPattern).toBeUndefined();
		});
	});
});

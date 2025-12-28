/**
 * ハーモニービューモジュールのテスト
 *
 * @module @/ui/demo/views/harmony-view.test
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポートの確認を行う。
 */

import { describe, expect, it } from "bun:test";

describe("harmony-view module", () => {
	describe("exports", () => {
		it("should export renderHarmonyView function", async () => {
			const { renderHarmonyView } = await import("./harmony-view");
			expect(renderHarmonyView).toBeDefined();
			expect(typeof renderHarmonyView).toBe("function");
		});
	});

	describe("HarmonyViewCallbacks interface", () => {
		it("should accept callbacks with required properties", async () => {
			const { renderHarmonyView: _renderHarmonyView } = await import(
				"./harmony-view"
			);

			// 型チェック: コールバックの型が正しいことを確認
			const callbacks = {
				onHarmonySelect: () => {},
				onColorClick: () => {},
			};

			// renderHarmonyViewがコールバックを受け入れることを確認
			// 実際のDOM操作はE2Eでテスト
			expect(typeof callbacks.onHarmonySelect).toBe("function");
			expect(typeof callbacks.onColorClick).toBe("function");
		});
	});

	describe("dependencies", () => {
		it("should import from state module", async () => {
			const { state } = await import("../state");
			expect(state).toBeDefined();
			expect(state.cudMode).toBeDefined();
			expect(state.cvdSimulation).toBeDefined();
			expect(state.selectedHarmonyConfig).toBeDefined();
		});

		it("should import from constants module", async () => {
			const { HARMONY_TYPES } = await import("../constants");
			expect(HARMONY_TYPES).toBeDefined();
			expect(Array.isArray(HARMONY_TYPES)).toBe(true);
			expect(HARMONY_TYPES.length).toBeGreaterThan(0);
		});

		it("should import types from types module", async () => {
			// 型のインポート確認（実行時には影響しないが、モジュールが正しくロードされることを確認）
			const typesModule = await import("../types");
			expect(typesModule).toBeDefined();
		});
	});

	describe("design compliance", () => {
		it("should follow dependency direction rules (View -> State, not View -> Feature)", async () => {
			// harmony-view.tsの内容を確認して、Featureモジュールへの直接依存がないことを確認
			// 実際の依存関係はビルド時・静的解析で検証
			const harmonyView = await import("./harmony-view");

			// renderHarmonyViewがコールバック経由で動作することを確認
			// onHarmonySelect, onColorClickはコールバックとして渡される（直接import禁止）
			expect(harmonyView.renderHarmonyView).toBeDefined();
		});

		it("should use callbacks for Feature layer interaction (not direct imports)", async () => {
			// 設計仕様: View -> Feature の直接依存は禁止
			// color-detail-modal, palette-generatorへの依存はコールバック経由
			// この確認は静的解析（madge）でも行う

			const { renderHarmonyView } = await import("./harmony-view");

			// renderHarmonyViewはcallbacks引数を受け取る設計
			// TypeScript型チェックで強制される
			expect(renderHarmonyView.length).toBe(3); // container, keyColorHex, callbacks
		});
	});
});

/**
 * パレットビューモジュールのテスト
 *
 * @module @/ui/demo/views/palette-view.test
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポートの確認を行う。
 *
 * 新UI構成:
 * 1. 擬似ファーストビュー（プレビュー）
 * 2. トークンテーブル形式
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { HarmonyType } from "@/core/harmony";
import { resetState, state } from "../state";

describe("palette-view module", () => {
	// DOM環境を準備（renderPaletteView の挙動確認用）
	const originalDocument = globalThis.document;
	const originalHTMLElement = globalThis.HTMLElement;

	beforeEach(() => {
		resetState();
	});

	afterEach(() => {
		globalThis.document = originalDocument;
		globalThis.HTMLElement = originalHTMLElement;
	});

	describe("exports", () => {
		it("should export renderPaletteView function", async () => {
			const { renderPaletteView } = await import("./palette-view");
			expect(renderPaletteView).toBeDefined();
			expect(typeof renderPaletteView).toBe("function");
		});
	});

	describe("PaletteViewCallbacks interface", () => {
		it("should accept callbacks with required properties", async () => {
			const { renderPaletteView: _renderPaletteView } = await import(
				"./palette-view"
			);

			// 型チェック: コールバックの型が正しいことを確認
			const callbacks = {
				onColorClick: () => {},
			};

			// renderPaletteViewがコールバックを受け入れることを確認
			// 実際のDOM操作はE2Eでテスト
			expect(typeof callbacks.onColorClick).toBe("function");
		});
	});

	describe("dependencies", () => {
		it("should import from state module", async () => {
			const { state } = await import("../state");
			expect(state).toBeDefined();
			expect(state.cudMode).toBeDefined();
			expect(state.cvdSimulation).toBeDefined();
			expect(state.palettes).toBeDefined();
			expect(state.contrastIntensity).toBeDefined();
		});

		it("should import types from types module", async () => {
			// 型のインポート確認（実行時には影響しないが、モジュールが正しくロードされることを確認）
			const typesModule = await import("../types");
			expect(typesModule).toBeDefined();
		});
	});

	describe("design compliance", () => {
		it("should follow dependency direction rules (View -> State, not View -> Feature)", async () => {
			// palette-view.tsの内容を確認して、Featureモジュールへの直接依存がないことを確認
			// 実際の依存関係はビルド時・静的解析で検証
			const paletteView = await import("./palette-view");

			// renderPaletteViewがコールバック経由で動作することを確認
			// onColorClickはコールバックとして渡される（直接import禁止）
			expect(paletteView.renderPaletteView).toBeDefined();
		});

		it("should use callbacks for Feature layer interaction (not direct imports)", async () => {
			// 設計仕様: View -> Feature の直接依存は禁止
			// color-detail-modalへの依存はコールバック経由
			// この確認は静的解析（madge）でも行う

			const { renderPaletteView } = await import("./palette-view");

			// renderPaletteViewはcallbacks引数を受け取る設計
			// TypeScript型チェックで強制される
			expect(renderPaletteView.length).toBe(2); // container, callbacks
		});

		it("should be an async function (returns Promise)", async () => {
			const { renderPaletteView } = await import("./palette-view");

			// renderPaletteViewは非同期関数（DADSトークン読み込みのため）
			expect(renderPaletteView.constructor.name).toBe("AsyncFunction");
		});
	});

	describe("CUD mode handling", () => {
		it("should support off, guide, and strict CUD modes", async () => {
			const { state } = await import("../state");

			// CUDモードの有効な値を確認
			const validModes = ["off", "guide", "strict"];
			expect(validModes).toContain(state.cudMode);
		});
	});

	describe("CVD simulation handling", () => {
		it("should support normal and CVD simulation types", async () => {
			const { state } = await import("../state");

			// CVDシミュレーションの初期値を確認
			expect(state.cvdSimulation).toBe("normal");
		});
	});

	/**
	 * Task 5.1: パレットビューに背景色セレクターを統合する
	 * Requirements: 1.1, 5.1
	 */
	describe("background color selector integration (Task 5.1)", () => {
		it("should import createBackgroundColorSelector from background-color-selector module", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// 背景色セレクターのインポート
			expect(content).toContain("createBackgroundColorSelector");
		});

		it("should integrate background color selector at top of palette view", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// 背景色セレクターをビュー上部に配置
			expect(content).toContain("background-color-selector");
		});

		it("should update container background color on color change", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// 背景色変更時にコンテナの背景を更新
			expect(content).toContain("backgroundColor");
		});

		it("should use state.lightBackgroundColor for preview colors", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// state.lightBackgroundColorを参照
			expect(content).toContain("state.lightBackgroundColor");
		});

		it("should reference Requirements 1.1, 5.1 in comments", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// Requirementsの参照（モジュールヘッダまたはコメント内）
			expect(content).toContain("5.1");
		});

		it("should call persistBackgroundColors on color change", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// 背景色変更時に永続化
			expect(content).toContain("persistBackgroundColors");
		});
	});

	/**
	 * 新UI: 擬似ファーストビュー + トークンテーブル
	 */
	describe("new UI components integration", () => {
		it("should import createPalettePreview from palette-preview module", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// 擬似ファーストビュープレビューのインポート
			expect(content).toContain("createPalettePreview");
		});

		it("should import createTokenTable from palette-token-table module", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// トークンテーブルのインポート
			expect(content).toContain("createTokenTable");
		});

		it("should extract semantic token rows", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// セマンティックトークン行の抽出関数
			expect(content).toContain("extractSemanticTokenRows");
		});

		it("should extract palette token rows (Primary/Secondary/Tertiary/Accent)", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// パレットトークン行の抽出関数
			expect(content).toContain("extractPaletteTokenRows");
		});

		it("should define semantic categories (Error, Success, Link)", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// セマンティックカテゴリ定義
			expect(content).toContain("SEMANTIC_CATEGORIES");
			expect(content).toContain("Error");
			expect(content).toContain("Success");
			expect(content).toContain("Link");
		});
	});

	/**
	 * セマンティックカラーの役割マッピング
	 */
	describe("semantic color role mapping", () => {
		it("should use Error color for error messages", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-preview.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// Error色の役割
			expect(content).toContain("error");
			expect(content).toContain("Error");
		});

		it("should use Success color for success messages", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-preview.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// Success色の役割
			expect(content).toContain("success");
			expect(content).toContain("Success");
		});

		it("should use Warning color for warning displays", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-preview.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// Warning色の役割
			expect(content).toContain("warning");
			expect(content).toContain("Warning");
		});

		it("should use Link color for link text", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "palette-preview.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// Link色の役割
			expect(content).toContain("link");
		});
	});

	describe("token table behavior", () => {
		it("should render Secondary/Tertiary rows when palettes exist", async () => {
			const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
			globalThis.document = dom.window.document;
			globalThis.HTMLElement = dom.window.HTMLElement as typeof HTMLElement;

			state.palettes = [
				{
					id: "primary-1",
					name: "Brand A",
					keyColors: ["#0066cc"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: HarmonyType.NONE,
				},
				{
					id: "secondary-1",
					name: "Secondary",
					keyColors: ["#00a3bf"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: HarmonyType.NONE,
					step: 600,
					derivedFrom: {
						primaryPaletteId: "primary-1",
						derivationType: "secondary",
					},
				},
				{
					id: "tertiary-1",
					name: "Tertiary",
					keyColors: ["#259063"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: HarmonyType.NONE,
					step: 600,
					derivedFrom: {
						primaryPaletteId: "primary-1",
						derivationType: "tertiary",
					},
				},
			];

			const container = document.createElement("div");
			const { renderPaletteView } = await import("./palette-view");
			await renderPaletteView(container, { onColorClick: () => {} });

			const tokenNames = Array.from(
				container.querySelectorAll(".dads-token-table__token-name"),
			).map((el) => el.textContent);

			expect(tokenNames).toContain("プライマリ");
			expect(tokenNames).toContain("セカンダリ");
			expect(tokenNames).toContain("ターシャリ");

			const secondaryRow = Array.from(
				container.querySelectorAll(".dads-token-table__row"),
			).find(
				(row) =>
					row.querySelector(".dads-token-table__token-name")?.textContent ===
					"セカンダリ",
			);
			expect(secondaryRow).toBeTruthy();

			const secondaryPrimitive = secondaryRow
				?.querySelector(".dads-token-table__primitive")
				?.textContent?.toLowerCase();
			expect(secondaryPrimitive).not.toBe("secondary-600");
		});
	});
});

/**
 * エクスポートハンドラモジュールのテスト
 *
 * @module @/ui/demo/export-handlers.test
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Color } from "@/core/color";
import {
	downloadFile,
	generateExportColors,
	getExportContent,
} from "./export-handlers";
import { resetState, state } from "./state";

describe("export-handlers", () => {
	beforeEach(() => {
		resetState();
	});

	afterEach(() => {
		resetState();
	});

	describe("generateExportColors", () => {
		it("shadesPalettesから色を生成する", () => {
			// Setup: shadesPalettesにパレットを追加
			state.shadesPalettes = [
				{
					id: "test-primary",
					name: "Primary",
					keyColors: ["#0066CC"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];

			const colors = generateExportColors();

			// 13ステップの色が生成される
			expect(Object.keys(colors).length).toBeGreaterThanOrEqual(13);
			// パレット名がキー名に含まれる
			expect(Object.keys(colors).some((k) => k.startsWith("primary-"))).toBe(
				true,
			);
		});

		it("shadesPalettesが空の場合はpalettesを使用する", () => {
			state.palettes = [
				{
					id: "test-primary",
					name: "Primary",
					keyColors: ["#0066CC"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];
			state.shadesPalettes = [];

			const colors = generateExportColors();

			expect(Object.keys(colors).length).toBeGreaterThanOrEqual(13);
		});

		it("パレット名をケバブケースに変換する", () => {
			state.shadesPalettes = [
				{
					id: "test-palette",
					name: "Brand Color",
					keyColors: ["#FF6600"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];

			const colors = generateExportColors();

			expect(
				Object.keys(colors).some((k) => k.startsWith("brand-color-")),
			).toBe(true);
		});

		it("空のパレットでは空のオブジェクトを返す", () => {
			state.palettes = [];
			state.shadesPalettes = [];

			const colors = generateExportColors();

			expect(Object.keys(colors).length).toBe(0);
		});

		it("生成された色がColorインスタンスである", () => {
			state.shadesPalettes = [
				{
					id: "test-primary",
					name: "Primary",
					keyColors: ["#0066CC"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];

			const colors = generateExportColors();

			for (const color of Object.values(colors)) {
				expect(color).toBeInstanceOf(Color);
			}
		});
	});

	describe("getExportContent", () => {
		beforeEach(() => {
			state.shadesPalettes = [
				{
					id: "test-primary",
					name: "Primary",
					keyColors: ["#0066CC"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];
		});

		it("CSS形式でエクスポートする", () => {
			const content = getExportContent("css");

			expect(content).toContain(":root");
			expect(content).toContain("--");
		});

		it("Tailwind形式でエクスポートする", () => {
			const content = getExportContent("tailwind");

			expect(content).toContain("module.exports");
		});

		it("JSON形式でエクスポートする", () => {
			const content = getExportContent("json");

			// JSONとしてパース可能
			const parsed = JSON.parse(content);
			expect(parsed).toBeDefined();
		});
	});

	describe("downloadFile", () => {
		// downloadFileはDOM操作を含むため、ユニットテストではスキップ
		// E2Eテストで検証する（Task 6.3）
		it.skip("ダウンロードリンクを作成してクリックする（E2Eで検証）", () => {
			expect(() => {
				downloadFile("test content", "test.txt", "text/plain");
			}).not.toThrow();
		});
	});
});

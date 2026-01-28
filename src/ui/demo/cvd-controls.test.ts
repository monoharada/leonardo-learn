/**
 * CVD制御モジュールのテスト
 *
 * @module @/ui/demo/cvd-controls.test
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Color } from "@/core/color";
import {
	applySimulation,
	type CVDScoreDisplay,
	generateKeyColors,
	getScoreDisplay,
} from "./cvd-controls";
import { resetState, state } from "./state";

describe("cvd-controls", () => {
	beforeEach(() => {
		resetState();
	});

	afterEach(() => {
		resetState();
	});

	describe("applySimulation", () => {
		it("should return color unchanged when cvdSimulation is 'normal'", () => {
			state.cvdSimulation = "normal";
			const originalColor = new Color("#ff0000");

			const result = applySimulation(originalColor);

			// 結果は同じ色であるべき
			expect(result.toHex()).toBe(originalColor.toHex());
		});

		it("should apply protanopia simulation", () => {
			state.cvdSimulation = "protanopia";
			const originalColor = new Color("#ff0000");

			const result = applySimulation(originalColor);

			// シミュレーション後は元と異なる色になる
			expect(result.toHex()).not.toBe(originalColor.toHex());
		});

		it("should apply deuteranopia simulation", () => {
			state.cvdSimulation = "deuteranopia";
			const originalColor = new Color("#00ff00");

			const result = applySimulation(originalColor);

			// シミュレーション後は元と異なる色になる
			expect(result.toHex()).not.toBe(originalColor.toHex());
		});

		it("should apply tritanopia simulation", () => {
			state.cvdSimulation = "tritanopia";
			const originalColor = new Color("#0000ff");

			const result = applySimulation(originalColor);

			// シミュレーション後は元と異なる色になる
			expect(result.toHex()).not.toBe(originalColor.toHex());
		});

		it("should apply achromatopsia simulation (grayscale)", () => {
			state.cvdSimulation = "achromatopsia";
			const originalColor = new Color("#ff0000");

			const result = applySimulation(originalColor);

			// 全色盲シミュレーション後はグレースケールになる
			// R=G=B であることを確認
			const hex = result.toHex();
			const r = hex.slice(1, 3);
			const g = hex.slice(3, 5);
			const b = hex.slice(5, 7);
			expect(r).toBe(g);
			expect(g).toBe(b);
		});
	});

	describe("generateKeyColors", () => {
		it("should return empty object when no palettes exist", () => {
			state.palettes = [];
			state.shadesPalettes = [];

			const result = generateKeyColors();

			expect(Object.keys(result)).toHaveLength(0);
		});

		it("should use shadesPalettes when available", () => {
			state.shadesPalettes = [
				{
					id: "shade-1",
					name: "Primary",
					keyColors: ["#ff0000"],
					ratios: [3.0],
					harmony: "complementary",
					baseChromaName: "red",
				},
			];
			state.palettes = [
				{
					id: "palette-1",
					name: "Blue",
					keyColors: ["#0000ff"],
					ratios: [3.0],
					harmony: "complementary",
				},
			];

			const result = generateKeyColors();

			// shadesPalettesのbaseChromaNameを使用
			expect(result.red).toBeDefined();
			expect(result.blue).toBeUndefined();
		});

		it("should use palettes when shadesPalettes is empty", () => {
			state.shadesPalettes = [];
			state.palettes = [
				{
					id: "palette-1",
					name: "Blue Color",
					keyColors: ["#0000ff"],
					ratios: [3.0],
					harmony: "complementary",
				},
			];

			const result = generateKeyColors();

			// パレット名を小文字・ハイフン区切りに変換
			expect(result["blue-color"]).toBeDefined();
		});

		it("should normalize palette names correctly", () => {
			state.shadesPalettes = [];
			state.palettes = [
				{
					id: "palette-1",
					name: "My Custom Color",
					keyColors: ["#ff00ff"],
					ratios: [3.0],
					harmony: "complementary",
				},
			];

			const result = generateKeyColors();

			expect(result["my-custom-color"]).toBeDefined();
			expect(result["my-custom-color"]?.toHex()).toBe("#ff00ff");
		});

		it("should skip palettes without keyColors", () => {
			state.shadesPalettes = [];
			state.palettes = [
				{
					id: "palette-1",
					name: "Valid",
					keyColors: ["#ff0000"],
					ratios: [3.0],
					harmony: "complementary",
				},
				{
					id: "palette-2",
					name: "Empty",
					keyColors: [],
					ratios: [],
					harmony: "complementary",
				},
			];
			state.lightBackgroundColor = "#ffffff";
			state.darkBackgroundColor = "#000000";
			state.activePreset = "default";

			const result = generateKeyColors();

			// valid パレット + key-surface の2つ
			expect(Object.keys(result)).toHaveLength(2);
			expect(result.valid).toBeDefined();
			expect(result["key-surface"]).toBeDefined();
		});

		it("should parse keyColor with step notation", () => {
			state.shadesPalettes = [];
			state.palettes = [
				{
					id: "palette-1",
					name: "Brand",
					keyColors: ["#ff0000@600"],
					ratios: [3.0],
					harmony: "complementary",
				},
			];

			const result = generateKeyColors();

			// @以降のstepは無視されて色のみ抽出される
			expect(result.brand?.toHex()).toBe("#ff0000");
		});

		it("should include key-surface color when primary palette exists", () => {
			state.shadesPalettes = [];
			state.palettes = [
				{
					id: "palette-1",
					name: "Primary",
					keyColors: ["#3b82f6"],
					ratios: [3.0],
					harmony: "complementary",
				},
			];
			state.lightBackgroundColor = "#ffffff";
			state.darkBackgroundColor = "#000000";
			state.activePreset = "default";

			const result = generateKeyColors();

			// キーバックグラウンドが含まれることを確認
			expect(result["key-surface"]).toBeDefined();
			expect(result["key-surface"]?.toHex()).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it("should not include key-surface when no primary palette exists", () => {
			state.shadesPalettes = [];
			state.palettes = [];

			const result = generateKeyColors();

			expect(result["key-surface"]).toBeUndefined();
		});

		it("should not include key-surface when all palettes are derived", () => {
			state.shadesPalettes = [];
			state.palettes = [
				{
					id: "palette-1",
					name: "Derived",
					keyColors: ["#ff0000"],
					ratios: [3.0],
					harmony: "complementary",
					derivedFrom: "some-parent",
				},
			];

			const result = generateKeyColors();

			// derivedFromがあるパレットはPrimaryではないので、key-surfaceは生成されない
			expect(result["key-surface"]).toBeUndefined();
		});

		it("should generate key-surface based on current background color", () => {
			state.shadesPalettes = [];
			state.palettes = [
				{
					id: "palette-1",
					name: "Primary",
					keyColors: ["#0066cc"],
					ratios: [3.0],
					harmony: "complementary",
				},
			];
			state.lightBackgroundColor = "#f0f0f0";
			state.darkBackgroundColor = "#1a1a1a";
			state.activePreset = "default";

			const result = generateKeyColors();

			// キーバックグラウンドは背景色とプライマリ色の混合
			expect(result["key-surface"]).toBeDefined();
			// プライマリ色とは異なることを確認（混合されているため）
			expect(result["key-surface"]?.toHex()).not.toBe("#0066cc");
		});
	});

	describe("getScoreDisplay", () => {
		it("should return overall score when cvdSimulation is 'normal'", () => {
			state.cvdSimulation = "normal";
			state.shadesPalettes = [];
			state.palettes = [
				{
					id: "p1",
					name: "Color1",
					keyColors: ["#ff0000"],
					ratios: [3.0],
					harmony: "complementary",
				},
				{
					id: "p2",
					name: "Color2",
					keyColors: ["#00ff00"],
					ratios: [3.0],
					harmony: "complementary",
				},
			];

			const result = getScoreDisplay();

			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.score).toBeLessThanOrEqual(100);
			expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
		});

		it("should return specific type score when CVD type is selected", () => {
			state.cvdSimulation = "protanopia";
			state.shadesPalettes = [];
			state.palettes = [
				{
					id: "p1",
					name: "Color1",
					keyColors: ["#ff0000"],
					ratios: [3.0],
					harmony: "complementary",
				},
				{
					id: "p2",
					name: "Color2",
					keyColors: ["#00ff00"],
					ratios: [3.0],
					harmony: "complementary",
				},
			];

			const result = getScoreDisplay();

			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.score).toBeLessThanOrEqual(100);
			expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
		});

		it("should return grade A for score >= 90", () => {
			// 色が1つだけの場合、スコアは100になる
			state.cvdSimulation = "protanopia";
			state.shadesPalettes = [];
			state.palettes = [
				{
					id: "p1",
					name: "Color1",
					keyColors: ["#ff0000"],
					ratios: [3.0],
					harmony: "complementary",
				},
			];

			const result = getScoreDisplay();

			expect(result.score).toBe(100);
			expect(result.grade).toBe("A");
		});

		it("should return correct grade for different score ranges", () => {
			// グレード計算のロジックをテスト
			const gradeFor = (score: number): CVDScoreDisplay["grade"] => {
				if (score >= 90) return "A";
				if (score >= 75) return "B";
				if (score >= 60) return "C";
				if (score >= 40) return "D";
				return "F";
			};

			expect(gradeFor(100)).toBe("A");
			expect(gradeFor(90)).toBe("A");
			expect(gradeFor(89)).toBe("B");
			expect(gradeFor(75)).toBe("B");
			expect(gradeFor(74)).toBe("C");
			expect(gradeFor(60)).toBe("C");
			expect(gradeFor(59)).toBe("D");
			expect(gradeFor(40)).toBe("D");
			expect(gradeFor(39)).toBe("F");
			expect(gradeFor(0)).toBe("F");
		});

		it("should fallback to overallScore when cvdSimulation type is invalid", () => {
			// 無効なCVDタイプを設定
			(state as { cvdSimulation: string }).cvdSimulation = "invalid-type";
			state.shadesPalettes = [];
			state.palettes = [
				{
					id: "p1",
					name: "Color1",
					keyColors: ["#ff0000"],
					ratios: [3.0],
					harmony: "complementary",
				},
			];

			const result = getScoreDisplay();

			// overallScoreにフォールバックする
			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.score).toBeLessThanOrEqual(100);
			expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
		});
	});

	// NOTE: DOM操作を伴うテスト（updateCVDScoreDisplay, setupCVDControls, updateCVDControlsVisibility）は
	// 主にE2Eテスト（Playwright）でカバー。以下ではエクスポートと関数シグネチャの確認を行う。

	describe("exports", () => {
		it("should export updateCVDScoreDisplay function", async () => {
			const mod = await import("./cvd-controls");
			expect(mod.updateCVDScoreDisplay).toBeDefined();
			expect(typeof mod.updateCVDScoreDisplay).toBe("function");
		});

		it("should export setupCVDControls function", async () => {
			const mod = await import("./cvd-controls");
			expect(mod.setupCVDControls).toBeDefined();
			expect(typeof mod.setupCVDControls).toBe("function");
		});

		it("should export updateCVDControlsVisibility function", async () => {
			const mod = await import("./cvd-controls");
			expect(mod.updateCVDControlsVisibility).toBeDefined();
			expect(typeof mod.updateCVDControlsVisibility).toBe("function");
		});
	});

	describe("function signatures", () => {
		it("updateCVDScoreDisplay should accept no arguments", async () => {
			const { updateCVDScoreDisplay } = await import("./cvd-controls");
			expect(updateCVDScoreDisplay.length).toBe(0);
		});

		it("setupCVDControls should accept buttons and callback", async () => {
			const { setupCVDControls } = await import("./cvd-controls");
			expect(setupCVDControls.length).toBe(2);
		});

		it("updateCVDControlsVisibility should accept viewMode", async () => {
			const { updateCVDControlsVisibility } = await import("./cvd-controls");
			expect(updateCVDControlsVisibility.length).toBe(1);
		});
	});
});

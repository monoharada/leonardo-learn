/**
 * types.ts のテスト
 *
 * TDD: RED phase - 型定義モジュールのテスト
 * Requirements: 6.1, 6.3
 */
import { describe, expect, it } from "bun:test";
import type {
	ColorDetailModalOptions,
	CVDSimulationType,
	DemoState,
	HarmonyTypeConfig,
	KeyColorWithStep,
	LightnessDistribution,
	PaletteConfig,
	ViewMode,
} from "./types";

describe("types.ts", () => {
	describe("KeyColorWithStep", () => {
		it("should allow color without step", () => {
			const keyColor: KeyColorWithStep = {
				color: "#ff0000",
			};
			expect(keyColor.color).toBe("#ff0000");
			expect(keyColor.step).toBeUndefined();
		});

		it("should allow color with step", () => {
			const keyColor: KeyColorWithStep = {
				color: "#ff0000",
				step: 600,
			};
			expect(keyColor.color).toBe("#ff0000");
			expect(keyColor.step).toBe(600);
		});
	});

	describe("PaletteConfig", () => {
		it("should have required properties", () => {
			const palette: PaletteConfig = {
				id: "test-id",
				name: "Test Palette",
				keyColors: ["#ff0000"],
				ratios: [1.5, 3.0, 4.5],
				harmony: "complementary",
			};
			expect(palette.id).toBe("test-id");
			expect(palette.name).toBe("Test Palette");
			expect(palette.keyColors).toEqual(["#ff0000"]);
			expect(palette.ratios).toEqual([1.5, 3.0, 4.5]);
			expect(palette.harmony).toBe("complementary");
		});

		it("should allow optional properties", () => {
			const palette: PaletteConfig = {
				id: "test-id",
				name: "Test Palette",
				keyColors: ["#ff0000"],
				ratios: [1.5],
				harmony: "dads",
				baseChromaName: "Red",
				step: 600,
			};
			expect(palette.baseChromaName).toBe("Red");
			expect(palette.step).toBe(600);
		});
	});

	describe("LightnessDistribution", () => {
		it("should accept valid values", () => {
			const distributions: LightnessDistribution[] = [
				"linear",
				"easeIn",
				"easeOut",
			];
			expect(distributions).toHaveLength(3);
		});
	});

	describe("ViewMode", () => {
		it("should accept valid view modes", () => {
			const modes: ViewMode[] = [
				"harmony",
				"palette",
				"shades",
				"accessibility",
			];
			expect(modes).toHaveLength(4);
		});
	});

	describe("HarmonyTypeConfig", () => {
		it("should have all required properties", () => {
			const config: HarmonyTypeConfig = {
				id: "complementary",
				name: "Complementary",
				description: "補色",
				harmonyType: "complementary",
				detail: "色相環で正反対に位置する色の組み合わせ。",
			};
			expect(config.id).toBe("complementary");
			expect(config.name).toBe("Complementary");
			expect(config.harmonyType).toBe("complementary");
		});
	});

	describe("CVDSimulationType", () => {
		it("should accept normal and CVD types", () => {
			const types: CVDSimulationType[] = [
				"normal",
				"protanopia",
				"deuteranopia",
				"tritanopia",
				"achromatopsia",
			];
			expect(types).toHaveLength(5);
		});
	});

	describe("DemoState", () => {
		it("should have all required properties", () => {
			const state: DemoState = {
				palettes: [],
				shadesPalettes: [],
				activeId: "",
				activeHarmonyIndex: 0,
				contrastIntensity: "moderate",
				lightnessDistribution: "linear",
				viewMode: "harmony",
				cvdSimulation: "normal",
				selectedHarmonyConfig: null,
				cudMode: "guide",
			};
			expect(state.palettes).toEqual([]);
			expect(state.activeId).toBe("");
			expect(state.viewMode).toBe("harmony");
			expect(state.cudMode).toBe("guide");
		});
	});

	describe("ColorDetailModalOptions", () => {
		it("should have all required properties for modal opening", () => {
			// Note: This test uses mock objects since Color is an external dependency
			const options: ColorDetailModalOptions = {
				stepColor: {} as ColorDetailModalOptions["stepColor"],
				keyColor: {} as ColorDetailModalOptions["keyColor"],
				index: 5,
				fixedScale: {
					colors: [],
					keyIndex: 0,
				},
				paletteInfo: {
					name: "Test Palette",
				},
			};
			expect(options.index).toBe(5);
			expect(options.paletteInfo.name).toBe("Test Palette");
			expect(options.readOnly).toBeUndefined();
		});

		it("should allow optional properties", () => {
			const options: ColorDetailModalOptions = {
				stepColor: {} as ColorDetailModalOptions["stepColor"],
				keyColor: {} as ColorDetailModalOptions["keyColor"],
				index: 3,
				fixedScale: {
					colors: [],
					keyIndex: 0,
					hexValues: ["#ff0000", "#00ff00"],
				},
				paletteInfo: {
					name: "Test",
					baseChromaName: "Red",
				},
				readOnly: true,
				originalHex: "#ff0000",
			};
			expect(options.readOnly).toBe(true);
			expect(options.originalHex).toBe("#ff0000");
			expect(options.fixedScale.hexValues).toEqual(["#ff0000", "#00ff00"]);
			expect(options.paletteInfo.baseChromaName).toBe("Red");
		});
	});
});

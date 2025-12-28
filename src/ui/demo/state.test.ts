/**
 * 状態管理モジュールのテスト
 *
 * @module @/ui/demo/state.test
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { afterEach, describe, expect, it } from "bun:test";
import { HarmonyType } from "@/core/harmony";
import { DEFAULT_STATE } from "./constants";
import { getActivePalette, parseKeyColor, resetState, state } from "./state";
import type { PaletteConfig } from "./types";

describe("state module", () => {
	afterEach(() => {
		resetState();
	});

	describe("state object", () => {
		it("should have default state structure", () => {
			expect(state.palettes).toBeArray();
			expect(state.shadesPalettes).toBeArray();
			expect(state.activeId).toBe("");
			expect(state.activeHarmonyIndex).toBe(0);
			expect(state.contrastIntensity).toBe("moderate");
			expect(state.lightnessDistribution).toBe("linear");
			expect(state.viewMode).toBe("harmony");
			expect(state.cvdSimulation).toBe("normal");
			expect(state.selectedHarmonyConfig).toBeNull();
			expect(state.cudMode).toBe("guide");
		});

		it("should allow mutation of state properties", () => {
			state.activeId = "test-id";
			expect(state.activeId).toBe("test-id");

			state.viewMode = "palette";
			expect(state.viewMode).toBe("palette");

			state.activeHarmonyIndex = 2;
			expect(state.activeHarmonyIndex).toBe(2);
		});
	});

	describe("resetState", () => {
		it("should reset state to default values", () => {
			// Modify state
			state.activeId = "modified";
			state.viewMode = "shades";
			state.palettes.push({
				id: "test",
				name: "Test",
				keyColors: ["#ff0000"],
				ratios: [4.5],
				harmony: HarmonyType.COMPLEMENTARY,
			});

			// Reset
			resetState();

			// Verify reset
			expect(state.activeId).toBe(DEFAULT_STATE.activeId);
			expect(state.viewMode).toBe(DEFAULT_STATE.viewMode);
			expect(state.palettes).toEqual([]);
		});
	});

	describe("getActivePalette", () => {
		it("should return undefined when palettes is empty", () => {
			expect(getActivePalette()).toBeUndefined();
		});

		it("should return first palette when activeId is empty", () => {
			const palette: PaletteConfig = {
				id: "first",
				name: "First",
				keyColors: ["#ff0000"],
				ratios: [4.5],
				harmony: HarmonyType.COMPLEMENTARY,
			};
			state.palettes.push(palette);
			state.activeId = "";

			expect(getActivePalette()).toEqual(palette);
		});

		it("should return first palette when activeId does not match", () => {
			const palette1: PaletteConfig = {
				id: "first",
				name: "First",
				keyColors: ["#ff0000"],
				ratios: [4.5],
				harmony: HarmonyType.COMPLEMENTARY,
			};
			const palette2: PaletteConfig = {
				id: "second",
				name: "Second",
				keyColors: ["#00ff00"],
				ratios: [4.5],
				harmony: HarmonyType.ANALOGOUS,
			};
			state.palettes.push(palette1, palette2);
			state.activeId = "non-existent";

			expect(getActivePalette()).toEqual(palette1);
		});

		it("should return matching palette when activeId matches", () => {
			const palette1: PaletteConfig = {
				id: "first",
				name: "First",
				keyColors: ["#ff0000"],
				ratios: [4.5],
				harmony: HarmonyType.COMPLEMENTARY,
			};
			const palette2: PaletteConfig = {
				id: "second",
				name: "Second",
				keyColors: ["#00ff00"],
				ratios: [4.5],
				harmony: HarmonyType.ANALOGOUS,
			};
			state.palettes.push(palette1, palette2);
			state.activeId = "second";

			expect(getActivePalette()).toEqual(palette2);
		});
	});

	describe("parseKeyColor", () => {
		it("should parse color without step", () => {
			const result = parseKeyColor("#ff0000");
			expect(result.color).toBe("#ff0000");
			expect(result.step).toBeUndefined();
		});

		it("should parse color with step", () => {
			const result = parseKeyColor("#b3e5fc@300");
			expect(result.color).toBe("#b3e5fc");
			expect(result.step).toBe(300);
		});

		it("should handle step 50", () => {
			const result = parseKeyColor("#ffffff@50");
			expect(result.color).toBe("#ffffff");
			expect(result.step).toBe(50);
		});

		it("should handle step 1200", () => {
			const result = parseKeyColor("#000000@1200");
			expect(result.color).toBe("#000000");
			expect(result.step).toBe(1200);
		});

		it("should handle empty input with default color", () => {
			const result = parseKeyColor("");
			expect(result.color).toBe("#000000");
			expect(result.step).toBeUndefined();
		});

		it("should handle @ without step number", () => {
			const result = parseKeyColor("#ff0000@");
			expect(result.color).toBe("#ff0000");
			// Empty string is falsy, so step should be undefined
			expect(result.step).toBeUndefined();
		});
	});
});

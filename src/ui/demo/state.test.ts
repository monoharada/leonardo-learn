/**
 * 状態管理モジュールのテスト
 *
 * @module @/ui/demo/state.test
 * Requirements: 1.1, 1.2, 1.3, 1.4, 5.3, 5.4
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { HarmonyType } from "@/core/harmony";
import { DEFAULT_STATE } from "./constants";
import {
	BACKGROUND_COLOR_STORAGE_KEY,
	getActivePalette,
	loadBackgroundColor,
	parseKeyColor,
	persistBackgroundColor,
	resetState,
	state,
} from "./state";
import type { ColorMode, PaletteConfig } from "./types";

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

describe("state module", () => {
	beforeEach(() => {
		resetState();
	});

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

		it("should have default backgroundColor as #ffffff", () => {
			expect(state.backgroundColor).toBe("#ffffff");
		});

		it("should have default backgroundMode as light", () => {
			expect(state.backgroundMode).toBe("light");
		});

		it("should allow mutation of state properties", () => {
			state.activeId = "test-id";
			expect(state.activeId).toBe("test-id");

			state.viewMode = "palette";
			expect(state.viewMode).toBe("palette");

			state.activeHarmonyIndex = 2;
			expect(state.activeHarmonyIndex).toBe(2);
		});

		it("should allow mutation of backgroundColor", () => {
			state.backgroundColor = "#000000";
			expect(state.backgroundColor).toBe("#000000");
		});

		it("should allow mutation of backgroundMode", () => {
			state.backgroundMode = "dark";
			expect(state.backgroundMode).toBe("dark");
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

		it("should reset backgroundColor and backgroundMode to default values", () => {
			// Modify background color state
			state.backgroundColor = "#18181b";
			state.backgroundMode = "dark";

			// Reset
			resetState();

			// Verify reset to default values
			expect(state.backgroundColor).toBe("#ffffff");
			expect(state.backgroundMode).toBe("light");
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

	describe("BACKGROUND_COLOR_STORAGE_KEY", () => {
		it("should be leonardo-backgroundColor", () => {
			expect(BACKGROUND_COLOR_STORAGE_KEY).toBe("leonardo-backgroundColor");
		});
	});

	describe("persistBackgroundColor", () => {
		beforeEach(() => {
			localStorage.clear();
		});

		afterEach(() => {
			localStorage.clear();
		});

		it("should save backgroundColor and mode to localStorage as JSON", () => {
			persistBackgroundColor("#18181b", "dark");

			const stored = localStorage.getItem(BACKGROUND_COLOR_STORAGE_KEY);
			expect(stored).not.toBeNull();

			const parsed = JSON.parse(stored!);
			expect(parsed.hex).toBe("#18181b");
			expect(parsed.mode).toBe("dark");
		});

		it("should save light mode correctly", () => {
			persistBackgroundColor("#ffffff", "light");

			const stored = localStorage.getItem(BACKGROUND_COLOR_STORAGE_KEY);
			const parsed = JSON.parse(stored!);
			expect(parsed.hex).toBe("#ffffff");
			expect(parsed.mode).toBe("light");
		});

		it("should overwrite previous value", () => {
			persistBackgroundColor("#ffffff", "light");
			persistBackgroundColor("#000000", "dark");

			const stored = localStorage.getItem(BACKGROUND_COLOR_STORAGE_KEY);
			const parsed = JSON.parse(stored!);
			expect(parsed.hex).toBe("#000000");
			expect(parsed.mode).toBe("dark");
		});
	});

	describe("loadBackgroundColor", () => {
		beforeEach(() => {
			localStorage.clear();
		});

		afterEach(() => {
			localStorage.clear();
		});

		it("should return default values when localStorage is empty", () => {
			const result = loadBackgroundColor();
			expect(result.hex).toBe("#ffffff");
			expect(result.mode).toBe("light");
		});

		it("should restore valid values from localStorage", () => {
			localStorage.setItem(
				BACKGROUND_COLOR_STORAGE_KEY,
				JSON.stringify({ hex: "#18181b", mode: "dark" }),
			);

			const result = loadBackgroundColor();
			expect(result.hex).toBe("#18181b");
			expect(result.mode).toBe("dark");
		});

		it("should return default values for invalid JSON", () => {
			localStorage.setItem(BACKGROUND_COLOR_STORAGE_KEY, "invalid-json");

			const result = loadBackgroundColor();
			expect(result.hex).toBe("#ffffff");
			expect(result.mode).toBe("light");
		});

		it("should return default values for invalid hex format", () => {
			localStorage.setItem(
				BACKGROUND_COLOR_STORAGE_KEY,
				JSON.stringify({ hex: "not-a-hex", mode: "light" }),
			);

			const result = loadBackgroundColor();
			expect(result.hex).toBe("#ffffff");
			expect(result.mode).toBe("light");
		});

		it("should return default values for missing hex property", () => {
			localStorage.setItem(
				BACKGROUND_COLOR_STORAGE_KEY,
				JSON.stringify({ mode: "dark" }),
			);

			const result = loadBackgroundColor();
			expect(result.hex).toBe("#ffffff");
			expect(result.mode).toBe("light");
		});

		it("should recalculate mode using determineColorMode when loading", () => {
			// Store a dark color but with incorrect mode
			localStorage.setItem(
				BACKGROUND_COLOR_STORAGE_KEY,
				JSON.stringify({ hex: "#000000", mode: "light" }),
			);

			const result = loadBackgroundColor();
			// Mode should be recalculated based on hex value
			expect(result.hex).toBe("#000000");
			expect(result.mode).toBe("dark");
		});

		it("should recalculate mode for light color correctly", () => {
			// Store a light color but with incorrect mode
			localStorage.setItem(
				BACKGROUND_COLOR_STORAGE_KEY,
				JSON.stringify({ hex: "#ffffff", mode: "dark" }),
			);

			const result = loadBackgroundColor();
			// Mode should be recalculated based on hex value
			expect(result.hex).toBe("#ffffff");
			expect(result.mode).toBe("light");
		});

		it("should handle 3-character hex format", () => {
			localStorage.setItem(
				BACKGROUND_COLOR_STORAGE_KEY,
				JSON.stringify({ hex: "#fff", mode: "light" }),
			);

			const result = loadBackgroundColor();
			// Should reject 3-char hex and return default
			expect(result.hex).toBe("#ffffff");
			expect(result.mode).toBe("light");
		});
	});
});

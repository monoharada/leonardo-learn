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
	determineColorMode,
	getActivePalette,
	loadBackgroundColor,
	parseKeyColor,
	persistBackgroundColor,
	resetState,
	state,
	validateBackgroundColor,
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

	describe("determineColorMode", () => {
		/**
		 * OKLCH L値ベースのカラーモード判定テスト
		 * design.mdの検証用サンプル色に基づく
		 * Requirements: 2.3, 2.4, 2.5
		 */

		describe("OKLCH L value boundary cases", () => {
			// L > 0.5 → light, L ≤ 0.5 → dark

			it("should return light for white (#ffffff, L≈1.000)", () => {
				expect(determineColorMode("#ffffff")).toBe("light");
			});

			it("should return light for light gray (#f8fafc, L≈0.977)", () => {
				expect(determineColorMode("#f8fafc")).toBe("light");
			});

			it("should return light for medium gray (#808080, L≈0.600)", () => {
				expect(determineColorMode("#808080")).toBe("light");
			});

			it("should return light for zinc-500 (#6b7280, L≈0.554)", () => {
				expect(determineColorMode("#6b7280")).toBe("light");
			});

			it("should return dark for zinc-600 (#4b5563, L≈0.446)", () => {
				expect(determineColorMode("#4b5563")).toBe("dark");
			});

			it("should return dark for dark gray (#18181b, L≈0.179)", () => {
				expect(determineColorMode("#18181b")).toBe("dark");
			});

			it("should return dark for black (#000000, L=0.000)", () => {
				expect(determineColorMode("#000000")).toBe("dark");
			});
		});

		describe("L value boundary precision (0.49, 0.50, 0.51)", () => {
			// L > 0.5 → light, L ≤ 0.5 → dark
			// These colors are chosen to be near L=0.5 boundary

			it("should return dark for color with L≈0.49", () => {
				// #5c5c5c has OKLCH L ≈ 0.49
				expect(determineColorMode("#5c5c5c")).toBe("dark");
			});

			it("should return dark for color with L≈0.50 (boundary)", () => {
				// #636363 has OKLCH L ≈ 0.50
				expect(determineColorMode("#636363")).toBe("dark");
			});

			it("should return light for color with L≈0.51", () => {
				// #6a6a6a has OKLCH L ≈ 0.51
				expect(determineColorMode("#6a6a6a")).toBe("light");
			});
		});

		describe("preset colors verification", () => {
			// PRESET_COLORS from design.md

			it("should return light for White preset (#ffffff)", () => {
				expect(determineColorMode("#ffffff")).toBe("light");
			});

			it("should return light for Light Gray preset (#f8fafc)", () => {
				expect(determineColorMode("#f8fafc")).toBe("light");
			});

			it("should return dark for Dark Gray preset (#18181b)", () => {
				expect(determineColorMode("#18181b")).toBe("dark");
			});

			it("should return dark for Black preset (#000000)", () => {
				expect(determineColorMode("#000000")).toBe("dark");
			});
		});

		describe("chromatic colors", () => {
			it("should return light for bright red (#ff0000)", () => {
				// Pure red has moderate L value
				expect(determineColorMode("#ff0000")).toBe("light");
			});

			it("should return light for bright green (#00ff00)", () => {
				// Pure green has high L value
				expect(determineColorMode("#00ff00")).toBe("light");
			});

			it("should return dark for bright blue (#0000ff)", () => {
				// Pure blue has OKLCH L ≈ 0.452, below 0.5 threshold
				expect(determineColorMode("#0000ff")).toBe("dark");
			});

			it("should return light for yellow (#ffff00)", () => {
				expect(determineColorMode("#ffff00")).toBe("light");
			});

			it("should return dark for dark blue (#000080)", () => {
				expect(determineColorMode("#000080")).toBe("dark");
			});

			it("should return dark for dark red (#800000)", () => {
				expect(determineColorMode("#800000")).toBe("dark");
			});
		});

		describe("edge cases", () => {
			it("should return light for invalid color (fallback)", () => {
				expect(determineColorMode("invalid")).toBe("light");
			});

			it("should return light for empty string (fallback)", () => {
				expect(determineColorMode("")).toBe("light");
			});

			it("should handle lowercase hex", () => {
				expect(determineColorMode("#ffffff")).toBe("light");
			});

			it("should handle uppercase hex", () => {
				expect(determineColorMode("#FFFFFF")).toBe("light");
			});

			it("should handle mixed case hex", () => {
				expect(determineColorMode("#FfFfFf")).toBe("light");
			});
		});
	});

	describe("validateBackgroundColor", () => {
		/**
		 * 背景色入力バリデーションテスト
		 * Requirements: 1.4, 1.5
		 */

		describe("HEX format validation", () => {
			it("should accept valid 6-digit lowercase hex", () => {
				const result = validateBackgroundColor("#ffffff");
				expect(result.valid).toBe(true);
				expect(result.hex).toBe("#ffffff");
				expect(result.error).toBeUndefined();
			});

			it("should accept valid 6-digit uppercase hex", () => {
				const result = validateBackgroundColor("#FFFFFF");
				expect(result.valid).toBe(true);
				expect(result.hex).toBe("#ffffff");
			});

			it("should accept valid 6-digit mixed case hex", () => {
				const result = validateBackgroundColor("#FfFfFf");
				expect(result.valid).toBe(true);
				expect(result.hex).toBe("#ffffff");
			});

			it("should reject 3-digit hex shorthand", () => {
				const result = validateBackgroundColor("#fff");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});

			it("should reject hex without hash", () => {
				const result = validateBackgroundColor("ffffff");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});

			it("should reject invalid hex characters", () => {
				const result = validateBackgroundColor("#gggggg");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});

			it("should reject hex with 7 digits", () => {
				const result = validateBackgroundColor("#fffffff");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});

			it("should reject hex with 5 digits", () => {
				const result = validateBackgroundColor("#fffff");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});

			it("should reject empty string", () => {
				const result = validateBackgroundColor("");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});
		});

		describe("OKLCH format validation", () => {
			it("should accept valid OKLCH format", () => {
				const result = validateBackgroundColor("oklch(0.5 0.2 180)");
				expect(result.valid).toBe(true);
				expect(result.hex).toBeDefined();
				// Should be converted to hex
				expect(result.hex).toMatch(/^#[0-9a-f]{6}$/);
			});

			it("should accept OKLCH with L=0.0 (minimum)", () => {
				const result = validateBackgroundColor("oklch(0 0 0)");
				expect(result.valid).toBe(true);
				expect(result.hex).toBeDefined();
			});

			it("should accept OKLCH with L=1.0 (maximum)", () => {
				const result = validateBackgroundColor("oklch(1 0 0)");
				expect(result.valid).toBe(true);
				expect(result.hex).toBeDefined();
			});

			it("should accept OKLCH with C=0.0 (minimum)", () => {
				const result = validateBackgroundColor("oklch(0.5 0 0)");
				expect(result.valid).toBe(true);
			});

			it("should accept OKLCH with C=0.4 (maximum)", () => {
				const result = validateBackgroundColor("oklch(0.5 0.4 180)");
				expect(result.valid).toBe(true);
			});

			it("should accept OKLCH with H=0 (minimum)", () => {
				const result = validateBackgroundColor("oklch(0.5 0.2 0)");
				expect(result.valid).toBe(true);
			});

			it("should accept OKLCH with H=360 (maximum)", () => {
				const result = validateBackgroundColor("oklch(0.5 0.2 360)");
				expect(result.valid).toBe(true);
			});

			it("should reject OKLCH with L < 0", () => {
				const result = validateBackgroundColor("oklch(-0.1 0.2 180)");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});

			it("should reject OKLCH with L > 1", () => {
				const result = validateBackgroundColor("oklch(1.1 0.2 180)");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});

			it("should reject OKLCH with C < 0", () => {
				const result = validateBackgroundColor("oklch(0.5 -0.1 180)");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});

			it("should reject OKLCH with C > 0.4", () => {
				const result = validateBackgroundColor("oklch(0.5 0.5 180)");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});

			it("should reject OKLCH with H < 0", () => {
				const result = validateBackgroundColor("oklch(0.5 0.2 -10)");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});

			it("should reject OKLCH with H > 360", () => {
				const result = validateBackgroundColor("oklch(0.5 0.2 370)");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});

			it("should reject OKLCH with NaN values", () => {
				const result = validateBackgroundColor("oklch(NaN 0.2 180)");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});

			it("should reject malformed OKLCH syntax", () => {
				const result = validateBackgroundColor("oklch(0.5, 0.2, 180)");
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});
		});

		describe("edge cases", () => {
			it("should reject null-like values", () => {
				const result = validateBackgroundColor("null");
				expect(result.valid).toBe(false);
			});

			it("should reject undefined-like values", () => {
				const result = validateBackgroundColor("undefined");
				expect(result.valid).toBe(false);
			});

			it("should reject random strings", () => {
				const result = validateBackgroundColor("not a color");
				expect(result.valid).toBe(false);
			});

			it("should normalize hex to lowercase", () => {
				const result = validateBackgroundColor("#AABBCC");
				expect(result.valid).toBe(true);
				expect(result.hex).toBe("#aabbcc");
			});
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

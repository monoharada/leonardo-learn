/**
 * スタイル定数モジュールのテスト
 *
 * TDD: RED → GREEN → REFACTOR
 *
 * @module @/ui/style-constants.test
 */

import { describe, expect, it } from "bun:test";
import {
	CONTRAST_RANGES,
	getContrastRatios,
	getSwatchTextMode,
	STEP_NAMES,
	setBadgeLevel,
	setButtonActive,
} from "./style-constants";

describe("style-constants", () => {
	describe("CONTRAST_RANGES", () => {
		it("should have 4 contrast intensity levels", () => {
			expect(Object.keys(CONTRAST_RANGES)).toHaveLength(4);
		});

		it("should have 13 steps for each intensity", () => {
			for (const key of Object.keys(CONTRAST_RANGES)) {
				expect(
					CONTRAST_RANGES[key as keyof typeof CONTRAST_RANGES],
				).toHaveLength(13);
			}
		});
	});

	describe("STEP_NAMES", () => {
		it("should have 13 step names", () => {
			expect(STEP_NAMES).toHaveLength(13);
		});

		it("should start with 1200 and end with 50", () => {
			expect(STEP_NAMES[0]).toBe(1200);
			expect(STEP_NAMES[12]).toBe(50);
		});
	});

	describe("getContrastRatios", () => {
		it("should return array for valid intensity", () => {
			const ratios = getContrastRatios("moderate");
			expect(ratios).toHaveLength(13);
		});

		it("should return a copy (not the original array)", () => {
			const ratios = getContrastRatios("moderate");
			ratios[0] = 999;
			expect(CONTRAST_RANGES.moderate[0]).not.toBe(999);
		});
	});

	describe("setButtonActive", () => {
		it("should set data-active attribute", () => {
			const btn = { dataset: {} } as unknown as HTMLElement;
			setButtonActive(btn, true);
			expect(btn.dataset.active).toBe("true");
		});
	});

	describe("setBadgeLevel", () => {
		it("should set AAA for ratio >= 7.0", () => {
			const badge = { dataset: {} } as unknown as HTMLElement;
			setBadgeLevel(badge, 7.0);
			expect(badge.textContent).toBe("AAA");
		});

		it("should set AA for ratio >= 4.5", () => {
			const badge = { dataset: {} } as unknown as HTMLElement;
			setBadgeLevel(badge, 4.5);
			expect(badge.textContent).toBe("AA");
		});
	});

	describe("getSwatchTextMode", () => {
		it("should return dark for lightness > 0.5", () => {
			expect(getSwatchTextMode(0.6)).toBe("dark");
		});

		it("should return light for lightness <= 0.5", () => {
			expect(getSwatchTextMode(0.5)).toBe("light");
		});
	});

	/**
	 * Task 6.1: テキスト色のモード切替を実装する
	 * Requirements: 6.1
	 */
	describe("getForegroundColor (Task 6.1)", () => {
		it("should be exported and callable", async () => {
			const { getForegroundColor } = await import("./style-constants");
			expect(typeof getForegroundColor).toBe("function");
		});

		it("should return black (#18181b) for light mode", async () => {
			const { getForegroundColor } = await import("./style-constants");
			expect(getForegroundColor("light")).toBe("#18181b");
		});

		it("should return white (#f4f4f5) for dark mode", async () => {
			const { getForegroundColor } = await import("./style-constants");
			expect(getForegroundColor("dark")).toBe("#f4f4f5");
		});
	});

	describe("FOREGROUND_COLORS constant (Task 6.1)", () => {
		it("should be exported as a constant", async () => {
			const { FOREGROUND_COLORS } = await import("./style-constants");
			expect(FOREGROUND_COLORS).toBeDefined();
		});

		it("should have light and dark keys", async () => {
			const { FOREGROUND_COLORS } = await import("./style-constants");
			expect(FOREGROUND_COLORS.light).toBe("#18181b");
			expect(FOREGROUND_COLORS.dark).toBe("#f4f4f5");
		});
	});

	describe("CSS_VARIABLES constant (Task 6.1)", () => {
		it("should export fg-primary CSS variable name", async () => {
			const { CSS_VARIABLES } = await import("./style-constants");
			expect(CSS_VARIABLES).toBeDefined();
			expect(CSS_VARIABLES.fgPrimary).toBe("--fg-primary");
		});
	});

	/**
	 * Task 6.1: applyForegroundColor - CSS変数をDOMに適用する関数
	 * Requirements: 6.1 - CSS変数（--fg-primary）を活用したテキスト色切替
	 */
	describe("applyForegroundColor (Task 6.1)", () => {
		it("should be exported and callable", async () => {
			const { applyForegroundColor } = await import("./style-constants");
			expect(typeof applyForegroundColor).toBe("function");
		});

		it("should set --fg-primary CSS variable on the provided element for light mode", async () => {
			const { applyForegroundColor, FOREGROUND_COLORS, CSS_VARIABLES } =
				await import("./style-constants");

			// Mock element with style.setProperty
			const setPropertyCalls: Array<{ property: string; value: string }> = [];
			const mockElement = {
				style: {
					setProperty: (property: string, value: string) => {
						setPropertyCalls.push({ property, value });
					},
				},
			} as unknown as HTMLElement;

			applyForegroundColor(mockElement, "light");

			expect(setPropertyCalls).toHaveLength(1);
			expect(setPropertyCalls[0].property).toBe(CSS_VARIABLES.fgPrimary);
			expect(setPropertyCalls[0].value).toBe(FOREGROUND_COLORS.light);
		});

		it("should set --fg-primary CSS variable on the provided element for dark mode", async () => {
			const { applyForegroundColor, FOREGROUND_COLORS, CSS_VARIABLES } =
				await import("./style-constants");

			// Mock element with style.setProperty
			const setPropertyCalls: Array<{ property: string; value: string }> = [];
			const mockElement = {
				style: {
					setProperty: (property: string, value: string) => {
						setPropertyCalls.push({ property, value });
					},
				},
			} as unknown as HTMLElement;

			applyForegroundColor(mockElement, "dark");

			expect(setPropertyCalls).toHaveLength(1);
			expect(setPropertyCalls[0].property).toBe(CSS_VARIABLES.fgPrimary);
			expect(setPropertyCalls[0].value).toBe(FOREGROUND_COLORS.dark);
		});
	});
});

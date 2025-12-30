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

	/**
	 * Task 6.2: コントラストバッジのモード対応を実装する
	 * Requirements: 6.2 - AAA/AA/L/failバッジの背景色・テキスト色・ボーダー色をモードに応じて切替
	 */
	describe("BADGE_COLORS constant (Task 6.2)", () => {
		it("should be exported as a constant", async () => {
			const { BADGE_COLORS } = await import("./style-constants");
			expect(BADGE_COLORS).toBeDefined();
		});

		it("should have AAA, AA, L, fail keys", async () => {
			const { BADGE_COLORS } = await import("./style-constants");
			expect(BADGE_COLORS.AAA).toBeDefined();
			expect(BADGE_COLORS.AA).toBeDefined();
			expect(BADGE_COLORS.L).toBeDefined();
			expect(BADGE_COLORS.fail).toBeDefined();
		});

		it("should have light and dark modes for each level", async () => {
			const { BADGE_COLORS } = await import("./style-constants");
			for (const level of ["AAA", "AA", "L", "fail"] as const) {
				expect(BADGE_COLORS[level].light).toBeDefined();
				expect(BADGE_COLORS[level].dark).toBeDefined();
			}
		});

		it("should have background, text, and border for each mode", async () => {
			const { BADGE_COLORS } = await import("./style-constants");
			for (const level of ["AAA", "AA", "L", "fail"] as const) {
				for (const mode of ["light", "dark"] as const) {
					expect(BADGE_COLORS[level][mode].background).toBeDefined();
					expect(BADGE_COLORS[level][mode].text).toBeDefined();
					expect(BADGE_COLORS[level][mode].border).toBeDefined();
				}
			}
		});

		it("should have correct AAA light mode colors per design.md", async () => {
			const { BADGE_COLORS } = await import("./style-constants");
			expect(BADGE_COLORS.AAA.light.background).toBe("#dcfce7");
			expect(BADGE_COLORS.AAA.light.text).toBe("#166534");
			expect(BADGE_COLORS.AAA.light.border).toBe("#86efac");
		});

		it("should have correct AAA dark mode colors per design.md", async () => {
			const { BADGE_COLORS } = await import("./style-constants");
			expect(BADGE_COLORS.AAA.dark.background).toBe("#14532d");
			expect(BADGE_COLORS.AAA.dark.text).toBe("#bbf7d0");
			expect(BADGE_COLORS.AAA.dark.border).toBe("#22c55e");
		});

		it("should have correct AA light mode colors per design.md", async () => {
			const { BADGE_COLORS } = await import("./style-constants");
			expect(BADGE_COLORS.AA.light.background).toBe("#dbeafe");
			expect(BADGE_COLORS.AA.light.text).toBe("#1e40af");
			expect(BADGE_COLORS.AA.light.border).toBe("#93c5fd");
		});

		it("should have correct AA dark mode colors per design.md", async () => {
			const { BADGE_COLORS } = await import("./style-constants");
			expect(BADGE_COLORS.AA.dark.background).toBe("#1e3a5f");
			expect(BADGE_COLORS.AA.dark.text).toBe("#bfdbfe");
			expect(BADGE_COLORS.AA.dark.border).toBe("#3b82f6");
		});

		it("should have correct L light mode colors per design.md", async () => {
			const { BADGE_COLORS } = await import("./style-constants");
			expect(BADGE_COLORS.L.light.background).toBe("#fef3c7");
			expect(BADGE_COLORS.L.light.text).toBe("#92400e");
			expect(BADGE_COLORS.L.light.border).toBe("#fcd34d");
		});

		it("should have correct L dark mode colors per design.md", async () => {
			const { BADGE_COLORS } = await import("./style-constants");
			expect(BADGE_COLORS.L.dark.background).toBe("#78350f");
			expect(BADGE_COLORS.L.dark.text).toBe("#fde68a");
			expect(BADGE_COLORS.L.dark.border).toBe("#f59e0b");
		});

		it("should have correct fail light mode colors per design.md", async () => {
			const { BADGE_COLORS } = await import("./style-constants");
			expect(BADGE_COLORS.fail.light.background).toBe("#fee2e2");
			expect(BADGE_COLORS.fail.light.text).toBe("#991b1b");
			expect(BADGE_COLORS.fail.light.border).toBe("#fca5a5");
		});

		it("should have correct fail dark mode colors per design.md", async () => {
			const { BADGE_COLORS } = await import("./style-constants");
			expect(BADGE_COLORS.fail.dark.background).toBe("#7f1d1d");
			expect(BADGE_COLORS.fail.dark.text).toBe("#fecaca");
			expect(BADGE_COLORS.fail.dark.border).toBe("#ef4444");
		});
	});

	describe("BadgeColorScheme type (Task 6.2)", () => {
		it("should export BadgeColorScheme type", async () => {
			// Type check - if this compiles, the type exists
			const { BADGE_COLORS } = await import("./style-constants");
			const scheme = BADGE_COLORS.AAA.light;
			const _bg: string = scheme.background;
			const _text: string = scheme.text;
			const _border: string = scheme.border;
			expect(_bg).toBeDefined();
			expect(_text).toBeDefined();
			expect(_border).toBeDefined();
		});
	});

	describe("ContrastLevel type (Task 6.2)", () => {
		it("should export ContrastLevel type covering AAA, AA, L, fail", async () => {
			const { BADGE_COLORS } = await import("./style-constants");
			// Type check - all ContrastLevel values should be valid keys
			const levels: Array<"AAA" | "AA" | "L" | "fail"> = [
				"AAA",
				"AA",
				"L",
				"fail",
			];
			for (const level of levels) {
				expect(BADGE_COLORS[level]).toBeDefined();
			}
		});
	});

	describe("getBadgeColors function (Task 6.2)", () => {
		it("should be exported and callable", async () => {
			const { getBadgeColors } = await import("./style-constants");
			expect(typeof getBadgeColors).toBe("function");
		});

		it("should return correct colors for AAA level in light mode", async () => {
			const { getBadgeColors, BADGE_COLORS } = await import(
				"./style-constants"
			);
			const colors = getBadgeColors("AAA", "light");
			expect(colors).toEqual(BADGE_COLORS.AAA.light);
		});

		it("should return correct colors for fail level in dark mode", async () => {
			const { getBadgeColors, BADGE_COLORS } = await import(
				"./style-constants"
			);
			const colors = getBadgeColors("fail", "dark");
			expect(colors).toEqual(BADGE_COLORS.fail.dark);
		});
	});

	describe("applyBadgeColors function (Task 6.2)", () => {
		it("should be exported and callable", async () => {
			const { applyBadgeColors } = await import("./style-constants");
			expect(typeof applyBadgeColors).toBe("function");
		});

		it("should apply background, text, and border colors to badge element", async () => {
			const { applyBadgeColors, BADGE_COLORS } = await import(
				"./style-constants"
			);

			const mockStyle: Record<string, string> = {};
			const mockElement = {
				style: {
					backgroundColor: "",
					color: "",
					borderColor: "",
				},
			} as unknown as HTMLElement;

			applyBadgeColors(mockElement, "AAA", "light");

			expect(mockElement.style.backgroundColor).toBe(
				BADGE_COLORS.AAA.light.background,
			);
			expect(mockElement.style.color).toBe(BADGE_COLORS.AAA.light.text);
			expect(mockElement.style.borderColor).toBe(BADGE_COLORS.AAA.light.border);
		});

		it("should apply dark mode colors correctly", async () => {
			const { applyBadgeColors, BADGE_COLORS } = await import(
				"./style-constants"
			);

			const mockElement = {
				style: {
					backgroundColor: "",
					color: "",
					borderColor: "",
				},
			} as unknown as HTMLElement;

			applyBadgeColors(mockElement, "fail", "dark");

			expect(mockElement.style.backgroundColor).toBe(
				BADGE_COLORS.fail.dark.background,
			);
			expect(mockElement.style.color).toBe(BADGE_COLORS.fail.dark.text);
			expect(mockElement.style.borderColor).toBe(BADGE_COLORS.fail.dark.border);
		});
	});

	/**
	 * Task 6.3: スウォッチボーダーのモード対応と低コントラスト強調を実装する
	 * Requirements: 6.3 - スウォッチボーダー色をモードに応じて調整
	 */
	describe("BORDER_COLORS constant (Task 6.3)", () => {
		it("should be exported as a constant", async () => {
			const { BORDER_COLORS } = await import("./style-constants");
			expect(BORDER_COLORS).toBeDefined();
		});

		it("should have light and dark mode colors", async () => {
			const { BORDER_COLORS } = await import("./style-constants");
			expect(BORDER_COLORS.light).toBeDefined();
			expect(BORDER_COLORS.dark).toBeDefined();
		});

		it("should have normal and emphasized border styles for each mode", async () => {
			const { BORDER_COLORS } = await import("./style-constants");
			for (const mode of ["light", "dark"] as const) {
				expect(BORDER_COLORS[mode].normal).toBeDefined();
				expect(BORDER_COLORS[mode].emphasized).toBeDefined();
			}
		});

		it("should have correct light mode normal border per design.md", async () => {
			const { BORDER_COLORS } = await import("./style-constants");
			expect(BORDER_COLORS.light.normal.border).toBe("1px solid #e4e4e7"); // zinc-200
		});

		it("should have correct dark mode normal border per design.md", async () => {
			const { BORDER_COLORS } = await import("./style-constants");
			expect(BORDER_COLORS.dark.normal.border).toBe("1px solid #3f3f46"); // zinc-700
		});

		it("should have correct light mode emphasized border per design.md", async () => {
			const { BORDER_COLORS } = await import("./style-constants");
			expect(BORDER_COLORS.light.emphasized.border).toBe("2px solid #71717a"); // zinc-500
			expect(BORDER_COLORS.light.emphasized.boxShadow).toBe(
				"0 0 0 1px rgba(0,0,0,0.1)",
			);
		});

		it("should have correct dark mode emphasized border per design.md", async () => {
			const { BORDER_COLORS } = await import("./style-constants");
			expect(BORDER_COLORS.dark.emphasized.border).toBe("2px solid #a1a1aa"); // zinc-400
			expect(BORDER_COLORS.dark.emphasized.boxShadow).toBe(
				"0 0 0 1px rgba(255,255,255,0.1)",
			);
		});
	});

	/**
	 * Task 6.3: SwatchBorderStyle型
	 * Requirements: 6.3, 6.4 - ボーダースタイルの型定義
	 */
	describe("SwatchBorderStyle type (Task 6.3)", () => {
		it("should export SwatchBorderStyle type with border and optional boxShadow", async () => {
			const { BORDER_COLORS } = await import("./style-constants");
			const normalStyle = BORDER_COLORS.light.normal;
			const emphasizedStyle = BORDER_COLORS.light.emphasized;

			// Type check - normal has border only
			const _border: string = normalStyle.border;
			expect(_border).toBeDefined();

			// Type check - emphasized has both border and boxShadow
			const _emphasizedBorder: string = emphasizedStyle.border;
			const _boxShadow: string = emphasizedStyle.boxShadow;
			expect(_emphasizedBorder).toBeDefined();
			expect(_boxShadow).toBeDefined();
		});
	});

	/**
	 * Task 6.3: LOW_CONTRAST_THRESHOLD定数
	 * Requirements: 6.4 - 低コントラスト閾値
	 */
	describe("LOW_CONTRAST_THRESHOLD constant (Task 6.3)", () => {
		it("should be exported as 1.5", async () => {
			const { LOW_CONTRAST_THRESHOLD } = await import("./style-constants");
			expect(LOW_CONTRAST_THRESHOLD).toBe(1.5);
		});
	});

	/**
	 * Task 6.3: getSwatchBorderStyle関数
	 * Requirements: 6.3, 6.4 - スウォッチボーダースタイルを取得
	 */
	describe("getSwatchBorderStyle function (Task 6.3)", () => {
		it("should be exported and callable", async () => {
			const { getSwatchBorderStyle } = await import("./style-constants");
			expect(typeof getSwatchBorderStyle).toBe("function");
		});

		it("should return normal border for high contrast in light mode", async () => {
			const { getSwatchBorderStyle, BORDER_COLORS } = await import(
				"./style-constants"
			);
			// 黒スウォッチ on 白背景 → 高コントラスト (21:1)
			const result = getSwatchBorderStyle("#000000", "#ffffff", "light");
			expect(result.border).toBe(BORDER_COLORS.light.normal.border);
			expect(result.boxShadow).toBeUndefined();
		});

		it("should return normal border for high contrast in dark mode", async () => {
			const { getSwatchBorderStyle, BORDER_COLORS } = await import(
				"./style-constants"
			);
			// 白スウォッチ on 黒背景 → 高コントラスト (21:1)
			const result = getSwatchBorderStyle("#ffffff", "#000000", "dark");
			expect(result.border).toBe(BORDER_COLORS.dark.normal.border);
			expect(result.boxShadow).toBeUndefined();
		});

		it("should return emphasized border for low contrast (<1.5) in light mode", async () => {
			const { getSwatchBorderStyle, BORDER_COLORS } = await import(
				"./style-constants"
			);
			// 白スウォッチ on 白背景 → 低コントラスト (1:1)
			const result = getSwatchBorderStyle("#ffffff", "#ffffff", "light");
			expect(result.border).toBe(BORDER_COLORS.light.emphasized.border);
			expect(result.boxShadow).toBe(BORDER_COLORS.light.emphasized.boxShadow);
		});

		it("should return emphasized border for low contrast (<1.5) in dark mode", async () => {
			const { getSwatchBorderStyle, BORDER_COLORS } = await import(
				"./style-constants"
			);
			// 黒スウォッチ on 黒背景 → 低コントラスト (1:1)
			const result = getSwatchBorderStyle("#000000", "#000000", "dark");
			expect(result.border).toBe(BORDER_COLORS.dark.emphasized.border);
			expect(result.boxShadow).toBe(BORDER_COLORS.dark.emphasized.boxShadow);
		});

		it("should return emphasized border for contrast exactly at threshold", async () => {
			const { getSwatchBorderStyle, BORDER_COLORS } = await import(
				"./style-constants"
			);
			// グレースウォッチ on 白背景 → 約1.4のコントラスト
			// #f5f5f5 vs #ffffff ≈ 1.08
			const result = getSwatchBorderStyle("#f5f5f5", "#ffffff", "light");
			expect(result.border).toBe(BORDER_COLORS.light.emphasized.border);
			expect(result.boxShadow).toBe(BORDER_COLORS.light.emphasized.boxShadow);
		});

		it("should return normal border for contrast above threshold", async () => {
			const { getSwatchBorderStyle, BORDER_COLORS } = await import(
				"./style-constants"
			);
			// 薄いグレー on 白背景でコントラスト比が1.5以上
			// #999999 vs #ffffff ≈ 2.85
			const result = getSwatchBorderStyle("#999999", "#ffffff", "light");
			expect(result.border).toBe(BORDER_COLORS.light.normal.border);
			expect(result.boxShadow).toBeUndefined();
		});
	});

	/**
	 * Task 6.3: applySwatchBorder関数
	 * Requirements: 6.3, 6.4 - スウォッチ要素にボーダースタイルを適用
	 */
	describe("applySwatchBorder function (Task 6.3)", () => {
		it("should be exported and callable", async () => {
			const { applySwatchBorder } = await import("./style-constants");
			expect(typeof applySwatchBorder).toBe("function");
		});

		it("should apply normal border style to element", async () => {
			const { applySwatchBorder } = await import("./style-constants");

			const mockElement = {
				style: {
					border: "",
					boxShadow: "",
				},
			} as unknown as HTMLElement;

			// 高コントラスト: 黒 on 白
			applySwatchBorder(mockElement, "#000000", "#ffffff", "light");

			expect(mockElement.style.border).toBe("1px solid #e4e4e7");
			// boxShadowは設定されないか空文字
		});

		it("should apply emphasized border style with boxShadow to element", async () => {
			const { applySwatchBorder } = await import("./style-constants");

			const mockElement = {
				style: {
					border: "",
					boxShadow: "",
				},
			} as unknown as HTMLElement;

			// 低コントラスト: 白 on 白
			applySwatchBorder(mockElement, "#ffffff", "#ffffff", "light");

			expect(mockElement.style.border).toBe("2px solid #71717a");
			expect(mockElement.style.boxShadow).toBe("0 0 0 1px rgba(0,0,0,0.1)");
		});

		it("should apply dark mode emphasized border correctly", async () => {
			const { applySwatchBorder } = await import("./style-constants");

			const mockElement = {
				style: {
					border: "",
					boxShadow: "",
				},
			} as unknown as HTMLElement;

			// 低コントラスト: 黒 on 黒
			applySwatchBorder(mockElement, "#000000", "#000000", "dark");

			expect(mockElement.style.border).toBe("2px solid #a1a1aa");
			expect(mockElement.style.boxShadow).toBe(
				"0 0 0 1px rgba(255,255,255,0.1)",
			);
		});
	});
});

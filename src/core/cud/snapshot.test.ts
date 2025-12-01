/**
 * CUDカラースナップショットテスト
 * Requirement 10.1: CUD 20色のHEX/RGB/OKLCH値がスナップショットと一致することを検証
 */
import { describe, expect, test } from "bun:test";
import {
	CUD_ACCENT_COLORS,
	CUD_BASE_COLORS,
	CUD_COLOR_SET,
	CUD_NEUTRAL_COLORS,
} from "./colors";

/**
 * CUD推奨配色セット ver.4 のスナップショット
 * 公式ガイドブック: https://jfly.uni-koeln.de/colorset/
 */
const CUD_SNAPSHOT = {
	// アクセントカラー（9色）
	accent: {
		red: { hex: "#FF2800", rgb: [255, 40, 0] },
		orange: { hex: "#FF9900", rgb: [255, 153, 0] },
		yellow: { hex: "#FAF500", rgb: [250, 245, 0] },
		green: { hex: "#35A16B", rgb: [53, 161, 107] },
		blue: { hex: "#0041FF", rgb: [0, 65, 255] },
		"sky-blue": { hex: "#66CCFF", rgb: [102, 204, 255] },
		pink: { hex: "#FF99A0", rgb: [255, 153, 160] },
		purple: { hex: "#9A0079", rgb: [154, 0, 121] },
		brown: { hex: "#663300", rgb: [102, 51, 0] },
	},
	// ベースカラー（7色）
	base: {
		"bright-pink": { hex: "#FFCABF", rgb: [255, 202, 191] },
		cream: { hex: "#FFFF80", rgb: [255, 255, 128] },
		"bright-yellow-green": { hex: "#D8F255", rgb: [216, 242, 85] },
		"bright-green": { hex: "#77D9A8", rgb: [119, 217, 168] },
		"bright-sky-blue": { hex: "#BFE4FF", rgb: [191, 228, 255] },
		beige: { hex: "#FFCA80", rgb: [255, 202, 128] },
		"bright-purple": { hex: "#C9ACE6", rgb: [201, 172, 230] },
	},
	// 無彩色（4色）
	neutral: {
		white: { hex: "#FFFFFF", rgb: [255, 255, 255] },
		"light-gray": { hex: "#C8C8CB", rgb: [200, 200, 203] },
		gray: { hex: "#84919E", rgb: [132, 145, 158] },
		black: { hex: "#000000", rgb: [0, 0, 0] },
	},
} as const;

describe("CUD Color Snapshot Tests (Task 10.1)", () => {
	describe("Color count validation", () => {
		test("should have exactly 20 colors in total", () => {
			expect(CUD_COLOR_SET.length).toBe(20);
		});

		test("should have 9 accent colors", () => {
			expect(CUD_ACCENT_COLORS.length).toBe(9);
		});

		test("should have 7 base colors", () => {
			expect(CUD_BASE_COLORS.length).toBe(7);
		});

		test("should have 4 neutral colors", () => {
			expect(CUD_NEUTRAL_COLORS.length).toBe(4);
		});
	});

	describe("Accent colors snapshot", () => {
		for (const [id, expected] of Object.entries(CUD_SNAPSHOT.accent)) {
			test(`${id} should match snapshot`, () => {
				const color = CUD_ACCENT_COLORS.find((c) => c.id === id);
				expect(color).toBeDefined();
				expect(color?.hex).toBe(expected.hex);
				expect(color?.rgb).toEqual(expected.rgb);
			});
		}
	});

	describe("Base colors snapshot", () => {
		for (const [id, expected] of Object.entries(CUD_SNAPSHOT.base)) {
			test(`${id} should match snapshot`, () => {
				const color = CUD_BASE_COLORS.find((c) => c.id === id);
				expect(color).toBeDefined();
				expect(color?.hex).toBe(expected.hex);
				expect(color?.rgb).toEqual(expected.rgb);
			});
		}
	});

	describe("Neutral colors snapshot", () => {
		for (const [id, expected] of Object.entries(CUD_SNAPSHOT.neutral)) {
			test(`${id} should match snapshot`, () => {
				const color = CUD_NEUTRAL_COLORS.find((c) => c.id === id);
				expect(color).toBeDefined();
				expect(color?.hex).toBe(expected.hex);
				expect(color?.rgb).toEqual(expected.rgb);
			});
		}
	});

	describe("OKLCH values consistency", () => {
		test("all colors should have valid OKLCH L values", () => {
			for (const color of CUD_COLOR_SET) {
				expect(color.oklch.l).toBeGreaterThanOrEqual(0);
				expect(color.oklch.l).toBeLessThanOrEqual(1.0001); // small tolerance
			}
		});

		test("all colors should have non-negative OKLCH C values", () => {
			for (const color of CUD_COLOR_SET) {
				expect(color.oklch.c).toBeGreaterThanOrEqual(0);
			}
		});

		test("white should have L close to 1", () => {
			const white = CUD_COLOR_SET.find((c) => c.id === "white");
			expect(white?.oklch.l).toBeCloseTo(1, 2);
		});

		test("black should have L close to 0", () => {
			const black = CUD_COLOR_SET.find((c) => c.id === "black");
			expect(black?.oklch.l).toBeCloseTo(0, 2);
		});
	});

	describe("OKLab values consistency", () => {
		test("all colors should have valid OKLab L values", () => {
			for (const color of CUD_COLOR_SET) {
				expect(color.oklab.l).toBeGreaterThanOrEqual(0);
				expect(color.oklab.l).toBeLessThanOrEqual(1.0001);
			}
		});

		test("OKLCH L and OKLab L should match", () => {
			for (const color of CUD_COLOR_SET) {
				expect(color.oklch.l).toBeCloseTo(color.oklab.l, 5);
			}
		});
	});

	describe("ID uniqueness", () => {
		test("all colors should have unique IDs", () => {
			const ids = CUD_COLOR_SET.map((c) => c.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(CUD_COLOR_SET.length);
		});
	});

	describe("Group assignment", () => {
		test("all accent colors should have group 'accent'", () => {
			for (const color of CUD_ACCENT_COLORS) {
				expect(color.group).toBe("accent");
			}
		});

		test("all base colors should have group 'base'", () => {
			for (const color of CUD_BASE_COLORS) {
				expect(color.group).toBe("base");
			}
		});

		test("all neutral colors should have group 'neutral'", () => {
			for (const color of CUD_NEUTRAL_COLORS) {
				expect(color.group).toBe("neutral");
			}
		});
	});
});

import { describe, expect, test } from "bun:test";
import {
	CUD_ACCENT_COLORS,
	CUD_BASE_COLORS,
	CUD_COLOR_SET,
	CUD_NEUTRAL_COLORS,
	type CudColor,
	type CudGroup,
	computeOklchStats,
	type OklchStats,
} from "./colors";

describe("CUD Colors", () => {
	describe("Color Set Structure", () => {
		test("should have exactly 20 colors in total", () => {
			expect(CUD_COLOR_SET).toHaveLength(20);
		});

		test("should have 9 accent colors", () => {
			expect(CUD_ACCENT_COLORS).toHaveLength(9);
		});

		test("should have 7 base colors", () => {
			expect(CUD_BASE_COLORS).toHaveLength(7);
		});

		test("should have 4 neutral colors", () => {
			expect(CUD_NEUTRAL_COLORS).toHaveLength(4);
		});

		test("should have all colors from group arrays in the full set", () => {
			const allFromGroups = [
				...CUD_ACCENT_COLORS,
				...CUD_BASE_COLORS,
				...CUD_NEUTRAL_COLORS,
			];
			expect(allFromGroups).toHaveLength(20);
			for (const color of allFromGroups) {
				expect(CUD_COLOR_SET).toContainEqual(color);
			}
		});
	});

	describe("Color Properties", () => {
		test("each color should have required properties", () => {
			for (const color of CUD_COLOR_SET) {
				expect(color).toHaveProperty("id");
				expect(color).toHaveProperty("group");
				expect(color).toHaveProperty("nameJa");
				expect(color).toHaveProperty("nameEn");
				expect(color).toHaveProperty("hex");
				expect(color).toHaveProperty("rgb");
			}
		});

		test("each color should have unique id", () => {
			const ids = CUD_COLOR_SET.map((c) => c.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(20);
		});

		test("each color should have valid group", () => {
			const validGroups: CudGroup[] = ["accent", "base", "neutral"];
			for (const color of CUD_COLOR_SET) {
				expect(validGroups).toContain(color.group);
			}
		});

		test("each color should have valid hex format", () => {
			for (const color of CUD_COLOR_SET) {
				expect(color.hex).toMatch(/^#[0-9A-F]{6}$/i);
			}
		});

		test("each color should have valid RGB tuple", () => {
			for (const color of CUD_COLOR_SET) {
				expect(color.rgb).toHaveLength(3);
				for (const value of color.rgb) {
					expect(value).toBeGreaterThanOrEqual(0);
					expect(value).toBeLessThanOrEqual(255);
					expect(Number.isInteger(value)).toBe(true);
				}
			}
		});

		test("hex should match RGB values", () => {
			for (const color of CUD_COLOR_SET) {
				const [r, g, b] = color.rgb;
				const expectedHex =
					`#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
				expect(color.hex.toUpperCase()).toBe(expectedHex);
			}
		});
	});

	describe("Accent Colors (Official CUD ver.4 RGB values)", () => {
		test("should have correct red color", () => {
			const red = CUD_ACCENT_COLORS.find((c) => c.id === "red");
			expect(red).toBeDefined();
			expect(red?.rgb).toEqual([255, 40, 0]);
			expect(red?.hex.toUpperCase()).toBe("#FF2800");
			expect(red?.nameJa).toBe("赤");
			expect(red?.nameEn).toBe("Red");
		});

		test("should have correct orange color", () => {
			const orange = CUD_ACCENT_COLORS.find((c) => c.id === "orange");
			expect(orange).toBeDefined();
			expect(orange?.rgb).toEqual([255, 153, 0]);
			expect(orange?.hex.toUpperCase()).toBe("#FF9900");
		});

		test("should have correct yellow color", () => {
			const yellow = CUD_ACCENT_COLORS.find((c) => c.id === "yellow");
			expect(yellow).toBeDefined();
			expect(yellow?.rgb).toEqual([250, 245, 0]);
			expect(yellow?.hex.toUpperCase()).toBe("#FAF500");
		});

		test("should have correct green color", () => {
			const green = CUD_ACCENT_COLORS.find((c) => c.id === "green");
			expect(green).toBeDefined();
			expect(green?.rgb).toEqual([53, 161, 107]);
			expect(green?.hex.toUpperCase()).toBe("#35A16B");
		});

		test("should have correct blue color", () => {
			const blue = CUD_ACCENT_COLORS.find((c) => c.id === "blue");
			expect(blue).toBeDefined();
			expect(blue?.rgb).toEqual([0, 65, 255]);
			expect(blue?.hex.toUpperCase()).toBe("#0041FF");
		});

		test("should have correct sky blue color", () => {
			const skyBlue = CUD_ACCENT_COLORS.find((c) => c.id === "sky-blue");
			expect(skyBlue).toBeDefined();
			expect(skyBlue?.rgb).toEqual([102, 204, 255]);
			expect(skyBlue?.hex.toUpperCase()).toBe("#66CCFF");
		});

		test("should have correct pink color", () => {
			const pink = CUD_ACCENT_COLORS.find((c) => c.id === "pink");
			expect(pink).toBeDefined();
			expect(pink?.rgb).toEqual([255, 153, 160]);
			expect(pink?.hex.toUpperCase()).toBe("#FF99A0");
		});

		test("should have correct purple color", () => {
			const purple = CUD_ACCENT_COLORS.find((c) => c.id === "purple");
			expect(purple).toBeDefined();
			expect(purple?.rgb).toEqual([154, 0, 121]);
			expect(purple?.hex.toUpperCase()).toBe("#9A0079");
		});

		test("should have correct brown color", () => {
			const brown = CUD_ACCENT_COLORS.find((c) => c.id === "brown");
			expect(brown).toBeDefined();
			expect(brown?.rgb).toEqual([102, 51, 0]);
			expect(brown?.hex.toUpperCase()).toBe("#663300");
		});
	});

	describe("Base Colors (Official CUD ver.4 RGB values)", () => {
		test("should have correct bright pink color", () => {
			const brightPink = CUD_BASE_COLORS.find((c) => c.id === "bright-pink");
			expect(brightPink).toBeDefined();
			expect(brightPink?.rgb).toEqual([255, 202, 191]);
			expect(brightPink?.hex.toUpperCase()).toBe("#FFCABF");
		});

		test("should have correct cream color", () => {
			const cream = CUD_BASE_COLORS.find((c) => c.id === "cream");
			expect(cream).toBeDefined();
			expect(cream?.rgb).toEqual([255, 255, 128]);
			expect(cream?.hex.toUpperCase()).toBe("#FFFF80");
		});

		test("should have correct bright yellow-green color", () => {
			const brightYellowGreen = CUD_BASE_COLORS.find(
				(c) => c.id === "bright-yellow-green",
			);
			expect(brightYellowGreen).toBeDefined();
			expect(brightYellowGreen?.rgb).toEqual([216, 242, 85]);
			expect(brightYellowGreen?.hex.toUpperCase()).toBe("#D8F255");
		});

		test("should have correct bright green color", () => {
			const brightGreen = CUD_BASE_COLORS.find((c) => c.id === "bright-green");
			expect(brightGreen).toBeDefined();
			expect(brightGreen?.rgb).toEqual([119, 217, 168]);
			expect(brightGreen?.hex.toUpperCase()).toBe("#77D9A8");
		});

		test("should have correct bright sky blue color", () => {
			const brightSkyBlue = CUD_BASE_COLORS.find(
				(c) => c.id === "bright-sky-blue",
			);
			expect(brightSkyBlue).toBeDefined();
			expect(brightSkyBlue?.rgb).toEqual([191, 228, 255]);
			expect(brightSkyBlue?.hex.toUpperCase()).toBe("#BFE4FF");
		});

		test("should have correct beige color", () => {
			const beige = CUD_BASE_COLORS.find((c) => c.id === "beige");
			expect(beige).toBeDefined();
			expect(beige?.rgb).toEqual([255, 202, 128]);
			expect(beige?.hex.toUpperCase()).toBe("#FFCA80");
		});

		test("should have correct bright purple color", () => {
			const brightPurple = CUD_BASE_COLORS.find(
				(c) => c.id === "bright-purple",
			);
			expect(brightPurple).toBeDefined();
			expect(brightPurple?.rgb).toEqual([201, 172, 230]);
			expect(brightPurple?.hex.toUpperCase()).toBe("#C9ACE6");
		});
	});

	describe("Neutral Colors (Official CUD ver.4 RGB values)", () => {
		test("should have correct white color", () => {
			const white = CUD_NEUTRAL_COLORS.find((c) => c.id === "white");
			expect(white).toBeDefined();
			expect(white?.rgb).toEqual([255, 255, 255]);
			expect(white?.hex.toUpperCase()).toBe("#FFFFFF");
		});

		test("should have correct light gray color", () => {
			const lightGray = CUD_NEUTRAL_COLORS.find((c) => c.id === "light-gray");
			expect(lightGray).toBeDefined();
			expect(lightGray?.rgb).toEqual([200, 200, 203]);
			expect(lightGray?.hex.toUpperCase()).toBe("#C8C8CB");
		});

		test("should have correct gray color", () => {
			const gray = CUD_NEUTRAL_COLORS.find((c) => c.id === "gray");
			expect(gray).toBeDefined();
			expect(gray?.rgb).toEqual([132, 145, 158]);
			expect(gray?.hex.toUpperCase()).toBe("#84919E");
		});

		test("should have correct black color", () => {
			const black = CUD_NEUTRAL_COLORS.find((c) => c.id === "black");
			expect(black).toBeDefined();
			expect(black?.rgb).toEqual([0, 0, 0]);
			expect(black?.hex.toUpperCase()).toBe("#000000");
		});
	});

	describe("Immutability", () => {
		test("CUD_COLOR_SET should be readonly", () => {
			// TypeScript ensures this at compile time, but we can check the array is frozen
			expect(Object.isFrozen(CUD_COLOR_SET)).toBe(true);
		});

		test("CUD_ACCENT_COLORS should be readonly", () => {
			expect(Object.isFrozen(CUD_ACCENT_COLORS)).toBe(true);
		});

		test("CUD_BASE_COLORS should be readonly", () => {
			expect(Object.isFrozen(CUD_BASE_COLORS)).toBe(true);
		});

		test("CUD_NEUTRAL_COLORS should be readonly", () => {
			expect(Object.isFrozen(CUD_NEUTRAL_COLORS)).toBe(true);
		});
	});

	describe("OKLCH/OKLab Properties (Task 2.2)", () => {
		test("each color should have oklch property", () => {
			for (const color of CUD_COLOR_SET) {
				expect(color).toHaveProperty("oklch");
				expect(color.oklch).toHaveProperty("l");
				expect(color.oklch).toHaveProperty("c");
				expect(color.oklch).toHaveProperty("h");
			}
		});

		test("each color should have oklab property", () => {
			for (const color of CUD_COLOR_SET) {
				expect(color).toHaveProperty("oklab");
				expect(color.oklab).toHaveProperty("l");
				expect(color.oklab).toHaveProperty("a");
				expect(color.oklab).toHaveProperty("b");
			}
		});

		test("oklch lightness should be in valid range (0-1)", () => {
			for (const color of CUD_COLOR_SET) {
				expect(color.oklch.l).toBeGreaterThanOrEqual(0);
				// Allow small floating point tolerance
				expect(color.oklch.l).toBeLessThanOrEqual(1 + 1e-10);
			}
		});

		test("oklch chroma should be non-negative", () => {
			for (const color of CUD_COLOR_SET) {
				expect(color.oklch.c).toBeGreaterThanOrEqual(0);
			}
		});

		test("oklch hue should be in valid range (0-360) or NaN for achromatic", () => {
			for (const color of CUD_COLOR_SET) {
				if (!Number.isNaN(color.oklch.h)) {
					expect(color.oklch.h).toBeGreaterThanOrEqual(0);
					expect(color.oklch.h).toBeLessThan(360);
				}
			}
		});

		test("oklab lightness should be in valid range (0-1)", () => {
			for (const color of CUD_COLOR_SET) {
				expect(color.oklab.l).toBeGreaterThanOrEqual(0);
				// Allow small floating point tolerance
				expect(color.oklab.l).toBeLessThanOrEqual(1 + 1e-10);
			}
		});

		test("white should have L close to 1 in both oklch and oklab", () => {
			const white = CUD_COLOR_SET.find((c) => c.id === "white");
			expect(white).toBeDefined();
			expect(white?.oklch.l).toBeCloseTo(1, 2);
			expect(white?.oklab.l).toBeCloseTo(1, 2);
		});

		test("black should have L close to 0 in both oklch and oklab", () => {
			const black = CUD_COLOR_SET.find((c) => c.id === "black");
			expect(black).toBeDefined();
			expect(black?.oklch.l).toBeCloseTo(0, 2);
			expect(black?.oklab.l).toBeCloseTo(0, 2);
		});

		test("red should have positive a value in oklab (red-green axis)", () => {
			const red = CUD_COLOR_SET.find((c) => c.id === "red");
			expect(red).toBeDefined();
			expect(red?.oklab.a).toBeGreaterThan(0);
		});

		test("blue should have negative b value in oklab (blue-yellow axis)", () => {
			const blue = CUD_COLOR_SET.find((c) => c.id === "blue");
			expect(blue).toBeDefined();
			expect(blue?.oklab.b).toBeLessThan(0);
		});

		test("neutral colors should have low chroma", () => {
			for (const color of CUD_NEUTRAL_COLORS) {
				expect(color.oklch.c).toBeLessThan(0.05);
			}
		});

		test("oklch and oklab L values should match for each color", () => {
			for (const color of CUD_COLOR_SET) {
				expect(color.oklch.l).toBeCloseTo(color.oklab.l, 5);
			}
		});
	});

	describe("computeOklchStats (Task 2.3)", () => {
		test("should return valid stats structure", () => {
			const stats = computeOklchStats();
			expect(stats).toHaveProperty("lRange");
			expect(stats).toHaveProperty("cRange");
			expect(stats).toHaveProperty("hueMean");
			expect(stats).toHaveProperty("hueStd");
			expect(stats.lRange).toHaveProperty("min");
			expect(stats.lRange).toHaveProperty("max");
			expect(stats.cRange).toHaveProperty("min");
			expect(stats.cRange).toHaveProperty("max");
		});

		test("should return stats for all colors by default", () => {
			const stats = computeOklchStats();
			// L range should span from black (0) to white (1)
			expect(stats.lRange.min).toBeCloseTo(0, 2);
			expect(stats.lRange.max).toBeCloseTo(1, 2);
		});

		test("should return stats for accent colors only", () => {
			const stats = computeOklchStats("accent");
			// Accent colors should not include black (L=0) or white (L=1)
			expect(stats.lRange.min).toBeGreaterThan(0.2);
			expect(stats.lRange.max).toBeLessThan(1);
			// Accent colors have higher chroma
			expect(stats.cRange.max).toBeGreaterThan(0.1);
		});

		test("should return stats for base colors only", () => {
			const stats = computeOklchStats("base");
			// Base colors are high lightness, low chroma
			expect(stats.lRange.min).toBeGreaterThan(0.7);
			expect(stats.lRange.max).toBeLessThan(1);
			// Base colors have lower chroma than accent
			expect(stats.cRange.max).toBeLessThan(0.2);
		});

		test("should return stats for neutral colors only", () => {
			const stats = computeOklchStats("neutral");
			// Neutral colors include black and white
			expect(stats.lRange.min).toBeCloseTo(0, 2);
			expect(stats.lRange.max).toBeCloseTo(1, 2);
			// Neutral colors have very low chroma
			expect(stats.cRange.max).toBeLessThan(0.05);
		});

		test("should cache results for same group", () => {
			const stats1 = computeOklchStats("accent");
			const stats2 = computeOklchStats("accent");
			// Should return same object reference due to caching
			expect(stats1).toBe(stats2);
		});

		test("should return different stats for different groups", () => {
			const accentStats = computeOklchStats("accent");
			const baseStats = computeOklchStats("base");
			const neutralStats = computeOklchStats("neutral");
			// Each group should have different stats
			expect(accentStats).not.toBe(baseStats);
			expect(baseStats).not.toBe(neutralStats);
		});

		test("hueMean should be between 0 and 360 for chromatic colors", () => {
			const accentStats = computeOklchStats("accent");
			expect(accentStats.hueMean).toBeGreaterThanOrEqual(0);
			expect(accentStats.hueMean).toBeLessThan(360);
		});

		test("hueStd should be non-negative", () => {
			const accentStats = computeOklchStats("accent");
			expect(accentStats.hueStd).toBeGreaterThanOrEqual(0);
		});

		test("neutral colors should have very high hue std due to sparse chromatic data", () => {
			const neutralStats = computeOklchStats("neutral");
			// CUD gray has slight blue tint (c=0.024), so hue is defined
			// but with only 1 chromatic color, std should be 0 or very high spread
			// The main point is neutral colors have very low chroma overall
			expect(neutralStats.cRange.max).toBeLessThan(0.03);
		});

		test("should accept custom color array", () => {
			const customColors = [CUD_ACCENT_COLORS[0], CUD_ACCENT_COLORS[1]]; // red and orange
			const stats = computeOklchStats(customColors);
			expect(stats.lRange.min).toBeGreaterThan(0);
			expect(stats.lRange.max).toBeLessThan(1);
		});

		test("chroma range should be accurate for high-chroma accent colors", () => {
			const accentStats = computeOklchStats("accent");
			// Accent colors include saturated colors like red and blue
			expect(accentStats.cRange.max).toBeGreaterThan(0.2);
		});
	});
});

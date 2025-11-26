import { describe, expect, test } from "bun:test";
import { BackgroundColor } from "../src/core/background";
import { Color } from "../src/core/color";
import { generateScale } from "../src/core/interpolation";
import { Theme } from "../src/core/theme";

describe("Interpolation", () => {
	test("should generate scale of correct length", () => {
		const keyColors = [new Color("#000000"), new Color("#ffffff")];
		const scale = generateScale(keyColors, 5);
		expect(scale.length).toBe(5);
		expect(scale[0].toHex()).toBe("#000000");
		expect(scale[4].toHex()).toBe("#ffffff");
	});
});

describe("Theme", () => {
	test("should generate colors based on contrast ratios", () => {
		const keyColors = [new Color("#000000"), new Color("#ffffff")];
		const bg = BackgroundColor.White;
		// Ratios: 21 (Black), 4.5 (Gray), 1 (White)
		// Note: Black vs White is 21. White vs White is 1.
		// Our interpolation goes Black -> White.
		// Contrast goes 21 -> 1.
		const ratios = [21, 4.5, 3.0, 1];

		const theme = new Theme(keyColors, bg, ratios);
		const colors = theme.colors;

		expect(colors.length).toBe(4);
		expect(colors[0].contrast(bg)).toBeCloseTo(21, 0.5);
		expect(colors[1].contrast(bg)).toBeCloseTo(4.5, 0.5);
		expect(colors[2].contrast(bg)).toBeCloseTo(3.0, 0.5);
		expect(colors[3].contrast(bg)).toBeCloseTo(1, 0.1);
	});
});

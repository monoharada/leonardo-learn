import { Color } from "../src/core/color";
import { findColorForContrast } from "../src/core/solver";

describe("Color Class", () => {
	test("should create color from hex", () => {
		const color = new Color("#ffffff");
		expect(color.toHex()).toBe("#ffffff");
		expect(color.oklch.l).toBeGreaterThan(0.99);
	});

	test("should create color from oklch object", () => {
		const color = new Color({ mode: "oklch", l: 0.5, c: 0.1, h: 180 });
		expect(color.oklch.l).toBe(0.5);
	});

	test("should calculate contrast correctly", () => {
		const white = new Color("#ffffff");
		const black = new Color("#000000");
		expect(white.contrast(black)).toBeCloseTo(21, 1);
	});
});

describe("Solver", () => {
	test("should find color with target contrast", () => {
		const bg = new Color("#ffffff");
		const fg = new Color("#000000"); // Start with black
		const target = 4.5; // AA

		const result = findColorForContrast(fg, bg, target);
		expect(result).not.toBeNull();
		if (result) {
			expect(result.contrast(bg)).toBeCloseTo(target, 1);
		}
	});

	test("should return null if impossible (e.g. too high contrast)", () => {
		const bg = new Color("#000000");
		const fg = new Color("#111111");
		const target = 22; // Impossible (max is 21)

		const result = findColorForContrast(fg, bg, target);
		// Actually, our solver might return the closest possible (white) if we don't strictly enforce tolerance in the final check?
		// Our code checks tolerance * 2.
		// Let's see.
		expect(result).toBeNull();
	});
});

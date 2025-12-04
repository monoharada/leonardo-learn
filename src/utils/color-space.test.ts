import { describe, expect, test } from "bun:test";
import {
	clampChroma,
	deltaEok,
	parseColor,
	toHex,
	toOklab,
	toOklch,
} from "./color-space";

describe("color-space", () => {
	describe("toOklab", () => {
		test("should convert HEX string to OKLab object", () => {
			const result = toOklab("#ff0000");

			expect(result).toBeDefined();
			expect(result).toHaveProperty("l");
			expect(result).toHaveProperty("a");
			expect(result).toHaveProperty("b");
			expect(result.mode).toBe("oklab");
		});

		test("should convert pure white correctly", () => {
			const result = toOklab("#ffffff");

			// White should have L close to 1, a and b close to 0
			expect(result.l).toBeCloseTo(1, 2);
			expect(result.a).toBeCloseTo(0, 2);
			expect(result.b).toBeCloseTo(0, 2);
		});

		test("should convert pure black correctly", () => {
			const result = toOklab("#000000");

			// Black should have L close to 0, a and b close to 0
			expect(result.l).toBeCloseTo(0, 2);
			expect(result.a).toBeCloseTo(0, 2);
			expect(result.b).toBeCloseTo(0, 2);
		});

		test("should convert red with positive a value", () => {
			const result = toOklab("#ff0000");

			// Red should have positive a (red-green axis)
			expect(result.a).toBeGreaterThan(0);
		});

		test("should convert blue with negative b value", () => {
			const result = toOklab("#0000ff");

			// Blue should have negative b (blue-yellow axis)
			expect(result.b).toBeLessThan(0);
		});

		test("should accept OKLCH object as input", () => {
			const oklch = toOklch("#ff5500");
			const result = toOklab(oklch);

			expect(result).toBeDefined();
			expect(result.mode).toBe("oklab");
		});

		test("should convert HEX without # prefix", () => {
			const result = toOklab("ff0000");

			expect(result).toBeDefined();
			expect(result.mode).toBe("oklab");
		});
	});

	describe("deltaEok", () => {
		test("should return 0 for identical colors", () => {
			const color1 = toOklab("#ff0000");
			const color2 = toOklab("#ff0000");

			const result = deltaEok(color1, color2);

			expect(result).toBe(0);
		});

		test("should return 0 for same color with different input formats", () => {
			const color1 = toOklab("#FF0000");
			const color2 = toOklab("ff0000");

			const result = deltaEok(color1, color2);

			expect(result).toBeCloseTo(0, 5);
		});

		test("should return positive value for different colors", () => {
			const red = toOklab("#ff0000");
			const blue = toOklab("#0000ff");

			const result = deltaEok(red, blue);

			expect(result).toBeGreaterThan(0);
		});

		test("should return symmetric result (deltaE(a,b) === deltaE(b,a))", () => {
			const color1 = toOklab("#ff5500");
			const color2 = toOklab("#0055ff");

			const result1 = deltaEok(color1, color2);
			const result2 = deltaEok(color2, color1);

			expect(result1).toBeCloseTo(result2, 10);
		});

		test("should calculate correct Euclidean distance in OKLab space", () => {
			// Create two colors with known OKLab difference
			const white = toOklab("#ffffff");
			const black = toOklab("#000000");

			const result = deltaEok(white, black);

			// White L=1, Black L=0, both a=0, b=0
			// deltaE should be approximately 1 (L difference only)
			expect(result).toBeCloseTo(1, 1);
		});

		test("should return small value for similar colors", () => {
			const color1 = toOklab("#ff0000");
			const color2 = toOklab("#fe0000");

			const result = deltaEok(color1, color2);

			// Very similar colors should have small deltaE
			expect(result).toBeLessThan(0.01);
		});

		test("should return large value for very different colors", () => {
			const white = toOklab("#ffffff");
			const black = toOklab("#000000");

			const result = deltaEok(white, black);

			// White and black are very different
			expect(result).toBeGreaterThan(0.5);
		});

		test("should handle achromatic colors", () => {
			const gray1 = toOklab("#808080");
			const gray2 = toOklab("#c0c0c0");

			const result = deltaEok(gray1, gray2);

			// Should be a reasonable positive number
			expect(result).toBeGreaterThan(0);
			expect(result).toBeLessThan(1);
		});

		test("should satisfy triangle inequality", () => {
			const colorA = toOklab("#ff0000");
			const colorB = toOklab("#00ff00");
			const colorC = toOklab("#0000ff");

			const ab = deltaEok(colorA, colorB);
			const bc = deltaEok(colorB, colorC);
			const ac = deltaEok(colorA, colorC);

			// Triangle inequality: ab + bc >= ac
			expect(ab + bc).toBeGreaterThanOrEqual(ac - 0.0001); // Small tolerance for floating point
		});
	});

	describe("existing functions", () => {
		test("toOklch should still work", () => {
			const result = toOklch("#ff0000");
			expect(result).toBeDefined();
			expect(result.mode).toBe("oklch");
		});

		test("toHex should still work", () => {
			const oklch = toOklch("#ff0000");
			const hex = toHex(oklch);
			expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
		});

		test("parseColor should still work", () => {
			const result = parseColor("#ff0000");
			expect(result).toBeDefined();
			expect(result?.mode).toBe("oklch");
		});

		test("clampChroma should still work", () => {
			const oklch = toOklch("#ff0000");
			const clamped = clampChroma(oklch);
			expect(clamped).toBeDefined();
			expect(clamped.mode).toBe("oklch");
		});
	});
});

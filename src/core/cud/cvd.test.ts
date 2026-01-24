import { describe, expect, test } from "bun:test";
import { CUD_ACCENT_COLORS } from "./colors";
import { simulateCvdWithFormats } from "./cvd";

describe("CVD Simulator Extension (Task 5.1)", () => {
	describe("simulateCvdWithFormats", () => {
		test("should return hex, oklab, and oklch formats", () => {
			const result = simulateCvdWithFormats("#FF2800", "protan");
			expect(result).toHaveProperty("hex");
			expect(result).toHaveProperty("oklab");
			expect(result).toHaveProperty("oklch");
		});

		test("hex should be valid format", () => {
			const result = simulateCvdWithFormats("#FF2800", "protan");
			expect(result.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
		});

		test("oklab should have l, a, b properties", () => {
			const result = simulateCvdWithFormats("#FF2800", "protan");
			expect(result.oklab).toHaveProperty("l");
			expect(result.oklab).toHaveProperty("a");
			expect(result.oklab).toHaveProperty("b");
		});

		test("oklch should have l, c, h properties", () => {
			const result = simulateCvdWithFormats("#FF2800", "protan");
			expect(result.oklch).toHaveProperty("l");
			expect(result.oklch).toHaveProperty("c");
			expect(result.oklch).toHaveProperty("h");
		});

		test("should simulate protan type", () => {
			const result = simulateCvdWithFormats("#FF2800", "protan");
			// Red should appear darker/more yellow for protan
			expect(result.hex).not.toBe("#FF2800");
			expect(result.oklab.l).toBeGreaterThan(0);
		});

		test("should simulate deutan type", () => {
			const result = simulateCvdWithFormats("#FF2800", "deutan");
			// Red should appear different for deutan
			expect(result.hex).not.toBe("#FF2800");
			expect(result.oklab.l).toBeGreaterThan(0);
		});

		test("should support tritan type (optional)", () => {
			const result = simulateCvdWithFormats("#0041FF", "tritan");
			// Blue should appear different for tritan
			expect(result.hex).not.toBe("#0041FF");
		});

		test("oklab L should be in valid range (0-1)", () => {
			const result = simulateCvdWithFormats("#FF2800", "protan");
			expect(result.oklab.l).toBeGreaterThanOrEqual(0);
			expect(result.oklab.l).toBeLessThanOrEqual(1);
		});

		test("oklch L should be in valid range (0-1)", () => {
			const result = simulateCvdWithFormats("#FF2800", "protan");
			expect(result.oklch.l).toBeGreaterThanOrEqual(0);
			expect(result.oklch.l).toBeLessThanOrEqual(1);
		});

		test("oklch C should be non-negative", () => {
			const result = simulateCvdWithFormats("#FF2800", "protan");
			expect(result.oklch.c).toBeGreaterThanOrEqual(0);
		});

		test("should accept lowercase hex", () => {
			const result = simulateCvdWithFormats("#ff2800", "protan");
			expect(result.hex).toBeDefined();
		});

		test("should accept hex without hash", () => {
			const result = simulateCvdWithFormats("FF2800", "protan");
			expect(result.hex).toBeDefined();
		});

		test("should work with white", () => {
			const result = simulateCvdWithFormats("#FFFFFF", "protan");
			// White should remain white (or very close)
			expect(result.oklab.l).toBeCloseTo(1, 1);
		});

		test("should work with black", () => {
			const result = simulateCvdWithFormats("#000000", "protan");
			// Black should remain black
			expect(result.oklab.l).toBeCloseTo(0, 2);
		});

		test("should work with all CUD accent colors", () => {
			for (const color of CUD_ACCENT_COLORS) {
				const protanResult = simulateCvdWithFormats(color.hex, "protan");
				const deutanResult = simulateCvdWithFormats(color.hex, "deutan");

				expect(protanResult.hex).toBeDefined();
				expect(deutanResult.hex).toBeDefined();
				expect(protanResult.oklab.l).toBeGreaterThanOrEqual(0);
				expect(deutanResult.oklab.l).toBeGreaterThanOrEqual(0);
			}
		});

		test("protan and deutan should produce different results for red", () => {
			const protanResult = simulateCvdWithFormats("#FF2800", "protan");
			const deutanResult = simulateCvdWithFormats("#FF2800", "deutan");
			// Different CVD types should produce different simulations
			expect(protanResult.hex).not.toBe(deutanResult.hex);
		});

		test("should preserve grayscale for neutral colors", () => {
			// Gray should appear gray in all CVD simulations
			const grayResult = simulateCvdWithFormats("#808080", "protan");
			// Chroma should be very low for simulated gray
			expect(grayResult.oklch.c).toBeLessThan(0.05);
		});
	});

	describe("Edge cases", () => {
		test("should handle pure green", () => {
			const result = simulateCvdWithFormats("#00FF00", "deutan");
			// Green is heavily affected by deuteranopia
			expect(result.hex).toBeDefined();
		});

		test("should handle pure blue", () => {
			const result = simulateCvdWithFormats("#0000FF", "tritan");
			// Blue is affected by tritanopia
			expect(result.hex).toBeDefined();
		});
	});
});

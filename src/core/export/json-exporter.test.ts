import { describe, expect, test } from "bun:test";
import { Color } from "../color";
import { generateM3ToneScale } from "../strategies/m3-generator";
import { generateNeutralScale } from "../system/neutral-scale";
import { exportToJSON, type JSONExportOptions } from "./json-exporter";

describe("JSONExporter", () => {
	describe("exportToJSON", () => {
		test("should export a single color to JSON", () => {
			const color = new Color("#3366cc");
			const result = exportToJSON({ primary: color });

			expect(result.colors.primary).toBeDefined();
			expect(result.colors.primary.oklch).toBeDefined();
			expect(result.colors.primary.srgb).toBeDefined();
		});

		test("should include OKLCH values", () => {
			const color = new Color("#3366cc");
			const result = exportToJSON({ primary: color });

			const oklch = result.colors.primary.oklch;
			expect(oklch.l).toBeDefined();
			expect(oklch.c).toBeDefined();
			expect(oklch.h).toBeDefined();
			expect(typeof oklch.l).toBe("number");
		});

		test("should include sRGB hex value", () => {
			const color = new Color("#3366cc");
			const result = exportToJSON({ primary: color });

			expect(result.colors.primary.srgb.hex).toMatch(/^#[0-9a-f]{6}$/i);
		});

		test("should include Display P3 values when supported", () => {
			const color = new Color("#3366cc");
			const result = exportToJSON({ primary: color });

			expect(result.colors.primary.p3).toBeDefined();
		});

		test("should include metadata", () => {
			const color = new Color("#3366cc");
			const result = exportToJSON({ primary: color });

			expect(result.metadata).toBeDefined();
			expect(result.metadata.version).toBeDefined();
			expect(result.metadata.generatedAt).toBeDefined();
			expect(result.metadata.colorSpace).toBe("oklch");
		});

		test("should export multiple colors", () => {
			const colors = {
				primary: new Color("#3366cc"),
				secondary: new Color("#66cc33"),
				error: new Color("#cc3366"),
			};
			const result = exportToJSON(colors);

			expect(result.colors.primary).toBeDefined();
			expect(result.colors.secondary).toBeDefined();
			expect(result.colors.error).toBeDefined();
		});

		describe("with tone scales", () => {
			test("should export M3 tone scale", () => {
				const scale = generateM3ToneScale("#3366cc");
				const colors: Record<string, Color> = {};

				// Convert tone scale to color record
				for (const [tone, color] of scale.tones) {
					colors[`primary-${tone}`] = color;
				}

				const result = exportToJSON(colors);

				expect(result.colors["primary-0"]).toBeDefined();
				expect(result.colors["primary-50"]).toBeDefined();
				expect(result.colors["primary-100"]).toBeDefined();
			});

			test("should export neutral scale", () => {
				const scale = generateNeutralScale("#3366cc");
				const colors: Record<string, Color> = {};

				// Convert neutral scale to color record
				for (const [shade, color] of Object.entries(scale.shades)) {
					colors[`neutral-${shade}`] = color;
				}

				const result = exportToJSON(colors);

				expect(result.colors["neutral-50"]).toBeDefined();
				expect(result.colors["neutral-500"]).toBeDefined();
				expect(result.colors["neutral-950"]).toBeDefined();
			});
		});

		describe("with options", () => {
			test("should use custom prefix", () => {
				const color = new Color("#3366cc");
				const options: JSONExportOptions = {
					prefix: "brand",
				};
				const result = exportToJSON({ primary: color }, options);

				expect(result.metadata.prefix).toBe("brand");
			});

			test("should include indent option in metadata", () => {
				const color = new Color("#3366cc");
				const options: JSONExportOptions = {
					indent: 4,
				};
				const result = exportToJSON({ primary: color }, options);

				expect(result.metadata.indent).toBe(4);
			});
		});

		describe("toString method", () => {
			test("should return valid JSON string", () => {
				const color = new Color("#3366cc");
				const result = exportToJSON({ primary: color });
				const jsonString = JSON.stringify(result, null, 2);

				expect(() => JSON.parse(jsonString)).not.toThrow();
			});

			test("should maintain precision in JSON output", () => {
				const color = new Color("#3366cc");
				const result = exportToJSON({ primary: color });
				const jsonString = JSON.stringify(result, null, 2);
				const parsed = JSON.parse(jsonString);

				expect(typeof parsed.colors.primary.oklch.l).toBe("number");
				expect(typeof parsed.colors.primary.oklch.c).toBe("number");
			});
		});

		describe("edge cases", () => {
			test("should handle pure white", () => {
				const color = new Color("#ffffff");
				const result = exportToJSON({ white: color });

				expect(result.colors.white.oklch.l).toBeCloseTo(1, 2);
				expect(result.colors.white.oklch.c).toBeCloseTo(0, 2);
			});

			test("should handle pure black", () => {
				const color = new Color("#000000");
				const result = exportToJSON({ black: color });

				expect(result.colors.black.oklch.l).toBeCloseTo(0, 2);
				expect(result.colors.black.oklch.c).toBeCloseTo(0, 2);
			});

			test("should handle achromatic colors (undefined hue)", () => {
				const color = new Color("#808080");
				const result = exportToJSON({ gray: color });

				// Gray should still have h defined (or as null in output)
				expect(result.colors.gray.oklch).toBeDefined();
			});
		});
	});
});

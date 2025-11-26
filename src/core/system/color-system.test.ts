import { describe, expect, test } from "bun:test";
import { ColorSystem, type GenerationOptions } from "./color-system";

describe("ColorSystem", () => {
	describe("constructor", () => {
		test("should create instance with default mode", () => {
			const system = new ColorSystem();
			expect(system).toBeDefined();
		});
	});

	describe("generate", () => {
		test("should generate color system from hex string", () => {
			const system = new ColorSystem();
			const result = system.generate("#3366cc");

			expect(result).toBeDefined();
			expect(result.scales).toBeDefined();
		});

		test("should generate scales for default roles", () => {
			const system = new ColorSystem();
			const result = system.generate("#3366cc");

			// Should have at least primary and neutral
			expect(result.scales.has("primary")).toBe(true);
			expect(result.scales.has("neutral")).toBe(true);
		});

		test("should include metadata in result", () => {
			const system = new ColorSystem();
			const result = system.generate("#3366cc");

			expect(result.metadata).toBeDefined();
			expect(result.metadata.sourceColor).toBeDefined();
			expect(result.metadata.mode).toBeDefined();
			expect(result.metadata.generatedAt).toBeDefined();
		});

		describe("with different modes", () => {
			test("should use default mode when not specified", () => {
				const system = new ColorSystem();
				const result = system.generate("#3366cc");

				expect(result.metadata.mode).toBe("default");
			});

			test("should use m3 mode when specified", () => {
				const system = new ColorSystem();
				const options: GenerationOptions = { mode: "m3" };
				const result = system.generate("#3366cc", options);

				expect(result.metadata.mode).toBe("m3");
			});

			test("should generate M3 tones in m3 mode", () => {
				const system = new ColorSystem();
				const options: GenerationOptions = { mode: "m3" };
				const result = system.generate("#3366cc", options);

				// M3 should have 13 tones per scale
				const primaryScale = result.scales.get("primary");
				expect(primaryScale).toBeDefined();
				expect(primaryScale?.tones.size).toBe(13);
			});
		});

		describe("with custom roles", () => {
			test("should generate only specified roles", () => {
				const system = new ColorSystem();
				const options: GenerationOptions = {
					roles: ["primary", "error"],
				};
				const result = system.generate("#3366cc", options);

				expect(result.scales.has("primary")).toBe(true);
				expect(result.scales.has("error")).toBe(true);
				expect(result.scales.has("secondary")).toBe(false);
			});
		});
	});

	describe("export", () => {
		test("should export to JSON format", () => {
			const system = new ColorSystem();
			const result = system.generate("#3366cc");
			const exported = system.export(result, "json");

			expect(exported).toBeDefined();
			expect(typeof exported).toBe("string");

			// Should be valid JSON
			expect(() => JSON.parse(exported)).not.toThrow();
		});

		test("should include all colors in export", () => {
			const system = new ColorSystem();
			const result = system.generate("#3366cc", { roles: ["primary"] });
			const exported = system.export(result, "json");
			const parsed = JSON.parse(exported);

			expect(parsed.colors).toBeDefined();
		});
	});

	describe("caching", () => {
		test("should cache results for same parameters", () => {
			const system = new ColorSystem();

			const result1 = system.generate("#3366cc");
			const result2 = system.generate("#3366cc");

			// Results should be the same (cached)
			expect(result1.metadata.generatedAt).toBe(result2.metadata.generatedAt);
		});

		test("should generate new result for different colors", () => {
			const system = new ColorSystem();

			const result1 = system.generate("#3366cc");
			const result2 = system.generate("#cc3366");

			// Results should be different (different source colors)
			expect(result1.metadata.sourceColor).not.toBe(
				result2.metadata.sourceColor,
			);
		});
	});

	describe("edge cases", () => {
		test("should handle pure white source", () => {
			const system = new ColorSystem();
			const result = system.generate("#ffffff");

			expect(result.scales).toBeDefined();
		});

		test("should handle pure black source", () => {
			const system = new ColorSystem();
			const result = system.generate("#000000");

			expect(result.scales).toBeDefined();
		});
	});
});

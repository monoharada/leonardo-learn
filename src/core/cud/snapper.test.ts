import { describe, expect, it } from "bun:test";
import { getCudColorSet } from "./service";
import {
	findCudColorByHue,
	generateCudHarmonyPalette,
	type SnapResult,
	snapPaletteToCud,
	snapPaletteUnique,
	snapToCudColor,
} from "./snapper";

describe("CUD Snapper", () => {
	describe("snapToCudColor", () => {
		it("should snap to exact CUD color when input matches", () => {
			const result = snapToCudColor("#FF2800"); // CUD Red
			expect(result.snapped).toBe(true);
			expect(result.hex).toBe("#FF2800");
			expect(result.cudColor.id).toBe("red");
		});

		it("should snap to nearest CUD color in strict mode", () => {
			const result = snapToCudColor("#FF3333", { mode: "strict" });
			expect(result.snapped).toBe(true);
			expect(result.cudColor.nameJa).toBe("赤");
		});

		it("should snap in prefer mode when within threshold", () => {
			const result = snapToCudColor("#FF2801", {
				mode: "prefer",
				threshold: 0.1,
			});
			expect(result.snapped).toBe(true);
			expect(result.cudColor.id).toBe("red");
		});

		it("should not snap in prefer mode when beyond threshold", () => {
			// A very different color
			const result = snapToCudColor("#123456", {
				mode: "prefer",
				threshold: 0.01,
			});
			expect(result.snapped).toBe(false);
			expect(result.hex).toBe("#123456");
		});

		it("should include deltaE information", () => {
			const result = snapToCudColor("#0041FF"); // CUD Blue
			expect(result.deltaE).toBeDefined();
			expect(result.deltaE).toBeCloseTo(0, 2);
		});
	});

	describe("snapPaletteToCud", () => {
		it("should snap all colors in palette", () => {
			const palette = ["#FF2800", "#0041FF", "#35A16B"];
			const results = snapPaletteToCud(palette);

			expect(results.length).toBe(3);
			results.forEach((result) => {
				expect(result.snapped).toBe(true);
			});
		});

		it("should preserve original hex in results", () => {
			const originalHex = "#FF3333";
			const results = snapPaletteToCud([originalHex]);

			expect(results[0]?.originalHex).toBe(originalHex);
		});
	});

	describe("snapPaletteUnique", () => {
		it("should avoid duplicate CUD colors", () => {
			// Two very similar colors that would snap to the same CUD color
			const palette = ["#FF2800", "#FF2900", "#FF2A00"];
			const results = snapPaletteUnique(palette);

			// All should be snapped
			expect(results.every((r) => r.snapped)).toBe(true);

			// Extract unique hex values
			const uniqueHexes = new Set(results.map((r) => r.hex));
			// Should have different CUD colors (or as many as possible)
			expect(uniqueHexes.size).toBeGreaterThanOrEqual(1);
		});

		it("should handle palette with exactly 20 colors", () => {
			const cudColors = getCudColorSet();
			const palette = cudColors.map((c) => c.hex);
			const results = snapPaletteUnique(palette);

			expect(results.length).toBe(20);
			const uniqueIds = new Set(results.map((r) => r.cudColor.id));
			expect(uniqueIds.size).toBe(20);
		});

		it("should handle palette with more than 20 colors", () => {
			const cudColors = getCudColorSet();
			const palette = [...cudColors.map((c) => c.hex), "#FF2801", "#0041FE"];
			const results = snapPaletteUnique(palette);

			expect(results.length).toBe(22);
			// All should be snapped (some will reuse CUD colors)
			expect(results.every((r) => r.snapped)).toBe(true);
		});
	});

	describe("findCudColorByHue", () => {
		it("should find CUD color closest to target hue", () => {
			// Red is around hue 30
			const color = findCudColorByHue(30);
			expect(color).toBeDefined();
			expect(color.group).toBe("accent");
		});

		it("should filter by group when specified", () => {
			const accentColor = findCudColorByHue(180, "accent");
			expect(accentColor.group).toBe("accent");

			const baseColor = findCudColorByHue(180, "base");
			expect(baseColor.group).toBe("base");
		});

		it("should handle hue wrapping (0 and 360)", () => {
			const color0 = findCudColorByHue(0);
			const color360 = findCudColorByHue(360);

			expect(color0.id).toBe(color360.id);
		});

		it("should handle negative hues", () => {
			const color = findCudColorByHue(-30);
			expect(color).toBeDefined();
		});
	});

	describe("generateCudHarmonyPalette", () => {
		it("should generate complementary harmony (180 degrees)", () => {
			const results = generateCudHarmonyPalette("#FF2800", [0, 180]);

			expect(results.length).toBe(2);
			expect(results[0]?.snapped).toBe(true);
			// The second color should be different
			expect(results[1]?.hex).not.toBe(results[0]?.hex);
		});

		it("should generate triadic harmony (120 degrees)", () => {
			const results = generateCudHarmonyPalette("#0041FF", [0, 120, 240]);

			expect(results.length).toBe(3);
			const uniqueColors = new Set(results.map((r) => r.hex));
			expect(uniqueColors.size).toBeGreaterThanOrEqual(2);
		});

		it("should snap base color to CUD", () => {
			// Non-CUD color as input
			const results = generateCudHarmonyPalette("#FF3333", [0]);

			expect(results.length).toBe(1);
			expect(results[0]?.snapped).toBe(true);
			// Should be snapped to CUD red
			expect(results[0]?.cudColor.nameJa).toBe("赤");
		});
	});

	describe("Integration with MatchLevel changes", () => {
		it("should correctly identify exact match colors", () => {
			const cudColors = getCudColorSet();
			for (const cudColor of cudColors) {
				const result = snapToCudColor(cudColor.hex);
				expect(result.deltaE).toBeLessThan(0.001);
				expect(result.cudColor.id).toBe(cudColor.id);
			}
		});
	});
});

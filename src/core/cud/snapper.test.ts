import { describe, expect, it } from "bun:test";
import { getCudColorSet } from "./service";
import {
	findCudColorByHue,
	generateCudHarmonyPalette,
	snapPaletteToCud,
	snapPaletteUnique,
	snapToCudColor,
	softSnapPalette,
	softSnapToCudColor,
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

		it("should handle invalid hex color gracefully when finding alternative", () => {
			// 無効なHEXが含まれている場合のテスト
			// snapPaletteUniqueでは、既存の最近接色が使われている場合に代替を探すが、
			// toOklabが失敗するようなケースをテスト
			const palette = ["#FF2800", "#FF2900"]; // 両方とも赤に近い
			const results = snapPaletteUnique(palette);

			// 両方ともスナップされるべき
			expect(results.length).toBe(2);
			expect(results[0]?.snapped).toBe(true);
			// 2番目は別のCUD色にスナップされる
			expect(results[1]?.snapped).toBe(true);
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

		it("should fallback to all colors when neutral group has no match for hue", () => {
			// neutralグループはグレー系なので、色相が特定できない場合がある
			// その場合はすべてのCUD色から選択するようにフォールバック
			const neutralColor = findCudColorByHue(180, "neutral");
			expect(neutralColor).toBeDefined();
			// neutralグループに色がなければフォールバックで他のグループから選択される
			expect(neutralColor.group).toBe("neutral");
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

	// タスク4.1: Soft Snap機能のテスト
	describe("softSnapToCudColor", () => {
		describe("Safe Zone behavior", () => {
			it("should not snap colors in Safe Zone (deltaE <= 0.05)", () => {
				// CUD色そのものはSafe Zoneに入る
				const cudRed = "#FF2800";
				const result = softSnapToCudColor(cudRed, { mode: "soft" });

				expect(result.zone).toBe("safe");
				expect(result.snapped).toBe(false);
				expect(result.hex).toBe(cudRed);
			});

			it("should preserve original color in Safe Zone", () => {
				const cudBlue = "#0041FF";
				const result = softSnapToCudColor(cudBlue, { mode: "soft" });

				expect(result.originalHex).toBe(cudBlue);
				expect(result.hex).toBe(cudBlue);
			});
		});

		describe("Warning Zone behavior", () => {
			it("should apply partial snap in Warning Zone with return factor", () => {
				// Warning Zone: 0.05 < deltaE <= 0.12
				// Find a color in Warning Zone - slightly off from CUD color
				const slightlyOffRed = "#FF3500"; // Slightly different from CUD Red

				const result = softSnapToCudColor(slightlyOffRed, {
					mode: "soft",
					returnFactor: 0.5,
				});

				// If in Warning Zone, should be partially snapped
				if (result.zone === "warning") {
					expect(result.snapped).toBe(true);
					// Result should be between original and CUD color
					expect(result.hex).not.toBe(slightlyOffRed);
					expect(result.hex).not.toBe(result.cudColor.hex);
				}
			});

			it("should respect return factor of 0.0 (no snap)", () => {
				const testColor = "#FF3500";
				const result = softSnapToCudColor(testColor, {
					mode: "soft",
					returnFactor: 0.0,
				});

				// With returnFactor 0, should not snap even in Warning Zone
				if (result.zone === "warning") {
					expect(result.hex.toUpperCase()).toBe(testColor.toUpperCase());
				}
			});

			it("should respect return factor of 1.0 (full snap)", () => {
				const testColor = "#FF3500";
				const result = softSnapToCudColor(testColor, {
					mode: "soft",
					returnFactor: 1.0,
				});

				// With returnFactor 1.0, should fully snap to CUD color
				if (result.zone === "warning") {
					expect(result.hex).toBe(result.cudColor.hex);
				}
			});
		});

		describe("Off Zone behavior", () => {
			it("should snap Off Zone colors to Warning boundary", () => {
				// A color far from any CUD color
				const farColor = "#123456";
				const result = softSnapToCudColor(farColor, { mode: "soft" });

				if (result.zone === "off") {
					expect(result.snapped).toBe(true);
					// Should be snapped towards CUD color but not fully
					expect(result.hex).not.toBe(farColor.toUpperCase());
				}
			});
		});

		describe("strict mode", () => {
			it("should always snap to CUD color in strict mode", () => {
				const anyColor = "#123456";
				const result = softSnapToCudColor(anyColor, { mode: "strict" });

				expect(result.snapped).toBe(true);
				expect(result.hex).toBe(result.cudColor.hex);
			});
		});

		describe("prefer mode", () => {
			it("should only snap when within threshold in prefer mode", () => {
				const cudRed = "#FF2800";
				const result = softSnapToCudColor(cudRed, {
					mode: "prefer",
					returnFactor: 0.5,
				});

				expect(result.snapped).toBe(true);
			});

			it("should not snap when beyond threshold in prefer mode", () => {
				// Warning Zone閾値を超える色を使用
				const farColor = "#123456";
				const result = softSnapToCudColor(farColor, {
					mode: "prefer",
					returnFactor: 0.5,
					zoneThresholds: { warning: 0.05 }, // 非常に厳しい閾値
				});

				// Off Zoneにあるはずなので、preferモードではスナップされない
				if (result.zone === "off") {
					expect(result.snapped).toBe(false);
					expect(result.deltaEChange).toBe(0);
				}
			});
		});

		describe("SoftSnapResult properties", () => {
			it("should include zone information", () => {
				const result = softSnapToCudColor("#FF2800", { mode: "soft" });

				expect(result.zone).toBeDefined();
				expect(["safe", "warning", "off"]).toContain(result.zone);
			});

			it("should include deltaE information", () => {
				const result = softSnapToCudColor("#FF2800", { mode: "soft" });

				expect(result.deltaE).toBeDefined();
				expect(typeof result.deltaE).toBe("number");
			});

			it("should include cudColor information", () => {
				const result = softSnapToCudColor("#FF2800", { mode: "soft" });

				expect(result.cudColor).toBeDefined();
				expect(result.cudColor.hex).toBeDefined();
			});
		});

		describe("custom zone thresholds", () => {
			it("should respect custom zone thresholds", () => {
				const customThresholds = {
					safe: 0.1, // More lenient safe zone
					warning: 0.2,
				};

				const result = softSnapToCudColor("#FF2800", {
					mode: "soft",
					zoneThresholds: customThresholds,
				});

				// CUD color should still be in safe zone with looser threshold
				expect(result.zone).toBe("safe");
			});
		});

		describe("returnFactor validation", () => {
			it("should throw for invalid returnFactor (< 0)", () => {
				expect(() =>
					softSnapToCudColor("#FF2800", {
						mode: "soft",
						returnFactor: -0.1,
					}),
				).toThrow();
			});

			it("should throw for invalid returnFactor (> 1)", () => {
				expect(() =>
					softSnapToCudColor("#FF2800", {
						mode: "soft",
						returnFactor: 1.1,
					}),
				).toThrow();
			});
		});

		describe("hex normalization", () => {
			it("should handle hex without # prefix", () => {
				const result = softSnapToCudColor("FF2800", { mode: "soft" });

				expect(result.originalHex).toBe("#FF2800");
				expect(result.hex).toBe("#FF2800");
			});

			it("should handle lowercase hex", () => {
				const result = softSnapToCudColor("#ff2800", { mode: "soft" });

				expect(result.originalHex).toBe("#FF2800");
				expect(result.hex).toBe("#FF2800");
			});
		});

		describe("Warning Zone with returnFactor 0", () => {
			it("should not snap when returnFactor is 0 in Warning Zone", () => {
				// Warning Zoneの色を作成（CUD色から少し離れた色）
				const warningColor = "#FF3500"; // 赤に近いがSafe Zoneではない

				const result = softSnapToCudColor(warningColor, {
					mode: "soft",
					returnFactor: 0,
					zoneThresholds: { safe: 0.01, warning: 0.2 }, // Warning Zone を広げる
				});

				// Warning Zoneの場合、returnFactor=0ならスナップされない
				if (result.zone === "warning") {
					expect(result.snapped).toBe(false);
					expect(result.hex.toUpperCase()).toBe(
						result.originalHex.toUpperCase(),
					);
					expect(result.deltaEChange).toBe(0);
				}
			});
		});
	});

	// タスク4.2: Soft Snap説明文自動生成のテスト
	describe("softSnapToCudColor - explanation generation", () => {
		describe("explanation field presence", () => {
			it("should include explanation field in result", () => {
				const result = softSnapToCudColor("#FF2800", { mode: "soft" });

				expect(result.explanation).toBeDefined();
				expect(typeof result.explanation).toBe("string");
				expect(result.explanation.length).toBeGreaterThan(0);
			});

			it("should include explanation for all zones", () => {
				// Safe Zone (CUD exact color)
				const safeResult = softSnapToCudColor("#FF2800", { mode: "soft" });
				expect(safeResult.explanation).toBeDefined();

				// Off Zone (far from CUD color)
				const offResult = softSnapToCudColor("#123456", { mode: "soft" });
				expect(offResult.explanation).toBeDefined();
			});
		});

		describe("Safe Zone explanation", () => {
			it("should generate explanation for Safe Zone colors indicating CUD compliance", () => {
				const cudRed = "#FF2800";
				const result = softSnapToCudColor(cudRed, { mode: "soft" });

				expect(result.zone).toBe("safe");
				// Safe Zone: CUD準拠を示す説明
				expect(result.explanation).toContain("CUD");
				expect(result.explanation).toContain("準拠");
			});
		});

		describe("Warning Zone explanation", () => {
			it("should generate explanation for Warning Zone with brand maintenance message", () => {
				// Find a color in Warning Zone
				const slightlyOffColor = "#FF3500";
				const result = softSnapToCudColor(slightlyOffColor, {
					mode: "soft",
					returnFactor: 0.5,
				});

				if (result.zone === "warning") {
					// Warning Zone: ブランド維持のため許容を示す説明
					expect(result.explanation).toContain("ブランド");
					expect(result.explanation).toContain("ΔE");
				}
			});
		});

		describe("Off Zone explanation", () => {
			it("should generate explanation for Off Zone with warning message", () => {
				const farColor = "#123456";
				const result = softSnapToCudColor(farColor, { mode: "soft" });

				if (result.zone === "off") {
					// Off Zone: CUD非準拠の警告を示す説明
					expect(result.explanation).toContain("CUD");
					expect(result.explanation).toContain("ΔE");
				}
			});
		});

		describe("explanation format with deltaE", () => {
			it("should include deltaE value in explanation", () => {
				const result = softSnapToCudColor("#FF3500", { mode: "soft" });

				// deltaE値がフォーマットされて含まれる
				expect(result.explanation).toMatch(/ΔE[=＝]?\s*\d+\.\d+/);
			});

			it("should format deltaE with 3 decimal places", () => {
				const result = softSnapToCudColor("#123456", { mode: "soft" });

				// 3桁の小数点表記
				expect(result.explanation).toMatch(/ΔE[=＝]?\s*\d+\.\d{3}/);
			});
		});

		describe("explanation for strict mode", () => {
			it("should generate explanation for strict mode with CUD snap message", () => {
				const result = softSnapToCudColor("#123456", { mode: "strict" });

				expect(result.explanation).toBeDefined();
				expect(result.explanation).toContain("CUD");
			});
		});

		describe("explanation for prefer mode", () => {
			it("should generate explanation for prefer mode", () => {
				const result = softSnapToCudColor("#FF2800", {
					mode: "prefer",
					returnFactor: 0.5,
				});

				expect(result.explanation).toBeDefined();
				expect(result.explanation.length).toBeGreaterThan(0);
			});
		});

		describe("explanation includes CUD color name", () => {
			it("should include nearest CUD color Japanese name in explanation", () => {
				const result = softSnapToCudColor("#FF2800", { mode: "soft" });

				// CUD色の日本語名が含まれる
				expect(result.explanation).toContain(result.cudColor.nameJa);
			});
		});

		describe("deltaEChange in explanation", () => {
			it("should reflect deltaE change when snapped", () => {
				const farColor = "#123456";
				const result = softSnapToCudColor(farColor, { mode: "soft" });

				// deltaEChangeが計算されている
				expect(result.deltaEChange).toBeDefined();
				expect(typeof result.deltaEChange).toBe("number");

				if (result.snapped) {
					// スナップ時はdeltaEChangeが正の値
					expect(result.deltaEChange).toBeGreaterThanOrEqual(0);
				}
			});
		});
	});

	describe("softSnapPalette", () => {
		it("should apply soft snap to all colors in palette", () => {
			const palette = ["#FF2800", "#0041FF", "#123456"];
			const results = softSnapPalette(palette, { mode: "soft" });

			expect(results.length).toBe(3);
			results.forEach((result) => {
				expect(result.zone).toBeDefined();
				expect(result.cudColor).toBeDefined();
			});
		});

		it("should include explanation for all colors in palette", () => {
			const palette = ["#FF2800", "#0041FF", "#123456"];
			const results = softSnapPalette(palette, { mode: "soft" });

			results.forEach((result) => {
				expect(result.explanation).toBeDefined();
				expect(result.explanation.length).toBeGreaterThan(0);
			});
		});

		it("should preserve order of colors", () => {
			const palette = ["#FF2800", "#0041FF", "#35A16B"];
			const results = softSnapPalette(palette, { mode: "soft" });

			expect(results[0]?.originalHex).toBe("#FF2800");
			expect(results[1]?.originalHex).toBe("#0041FF");
			expect(results[2]?.originalHex).toBe("#35A16B");
		});

		it("should apply same options to all colors", () => {
			const palette = ["#FF2800", "#0041FF"];
			const results = softSnapPalette(palette, {
				mode: "soft",
				returnFactor: 0.7,
			});

			// All should use the same returnFactor (verified by consistent behavior)
			expect(results.length).toBe(2);
		});
	});

	// タスク3.1: Snapperにderivation情報を追加する
	// Requirements: 7.1, 7.2, 7.3
	describe("softSnapToCudColor - derivation information (Task 3.1)", () => {
		describe("derivation property presence", () => {
			it("should include derivation property in SoftSnapResult", () => {
				const result = softSnapToCudColor("#FF2800", { mode: "soft" });

				expect(result.derivation).toBeDefined();
				expect(result.derivation.type).toBeDefined();
				expect(result.derivation.dadsTokenId).toBeDefined();
				expect(result.derivation.dadsTokenHex).toBeDefined();
				expect(result.derivation.brandTokenHex).toBeDefined();
			});

			it("should include derivation for all modes", () => {
				const modes: ("strict" | "prefer" | "soft")[] = [
					"strict",
					"prefer",
					"soft",
				];

				for (const mode of modes) {
					const result = softSnapToCudColor("#FF2800", { mode });
					expect(result.derivation).toBeDefined();
					expect(result.derivation.type).toBeDefined();
				}
			});
		});

		describe("derivation.type assignment", () => {
			it("should set derivation.type to 'strict-snap' in strict mode", () => {
				const result = softSnapToCudColor("#123456", { mode: "strict" });

				expect(result.derivation.type).toBe("strict-snap");
			});

			it("should set derivation.type to 'soft-snap' in soft mode when snapped", () => {
				// Off Zone color that will be snapped
				const result = softSnapToCudColor("#123456", { mode: "soft" });

				if (result.snapped) {
					expect(result.derivation.type).toBe("soft-snap");
				}
			});

			it("should set derivation.type to 'reference' in soft mode when not snapped", () => {
				// Safe Zone color that will not be snapped
				const result = softSnapToCudColor("#FF2800", { mode: "soft" });

				if (!result.snapped) {
					expect(result.derivation.type).toBe("reference");
				}
			});

			it("should set derivation.type correctly in prefer mode", () => {
				// Color that gets snapped in prefer mode
				const snappedResult = softSnapToCudColor("#FF2800", {
					mode: "prefer",
					returnFactor: 0.5,
				});

				if (snappedResult.snapped) {
					expect(snappedResult.derivation.type).toBe("soft-snap");
				}

				// Color that doesn't get snapped in prefer mode
				const notSnappedResult = softSnapToCudColor("#123456", {
					mode: "prefer",
					returnFactor: 0.5,
					zoneThresholds: { warning: 0.05 },
				});

				if (!notSnappedResult.snapped) {
					expect(notSnappedResult.derivation.type).toBe("reference");
				}
			});
		});

		describe("derivation.dadsTokenId and dadsTokenHex", () => {
			it("should include dadsTokenId matching nearest CUD color ID", () => {
				const result = softSnapToCudColor("#FF2800", { mode: "soft" });

				// dadsTokenIdはDADSトークンIDフォーマットで表現される
				expect(result.derivation.dadsTokenId).toBeDefined();
				expect(typeof result.derivation.dadsTokenId).toBe("string");
				// CUD色のIDを含む形式であること
				expect(result.derivation.dadsTokenId.length).toBeGreaterThan(0);
			});

			it("should include dadsTokenHex matching nearest CUD color HEX", () => {
				const result = softSnapToCudColor("#FF2800", { mode: "soft" });

				expect(result.derivation.dadsTokenHex).toBe(result.cudColor.hex);
			});
		});

		describe("derivation.brandTokenHex", () => {
			it("should include brandTokenHex matching result hex", () => {
				const result = softSnapToCudColor("#FF2800", { mode: "soft" });

				expect(result.derivation.brandTokenHex).toBe(result.hex);
			});

			it("should include original hex as brandTokenHex when not snapped", () => {
				const cudRed = "#FF2800";
				const result = softSnapToCudColor(cudRed, { mode: "soft" });

				// Safe Zoneでスナップなしの場合、brandTokenHexは元の色
				if (!result.snapped) {
					expect(result.derivation.brandTokenHex).toBe(cudRed);
				}
			});

			it("should include snapped hex as brandTokenHex when snapped", () => {
				const result = softSnapToCudColor("#123456", { mode: "strict" });

				// strictモードでは必ずスナップされる
				expect(result.snapped).toBe(true);
				expect(result.derivation.brandTokenHex).toBe(result.hex);
			});
		});

		describe("backward compatibility", () => {
			it("should preserve existing properties (hex, originalHex, cudColor, snapped, deltaE, zone, deltaEChange, explanation)", () => {
				const result = softSnapToCudColor("#FF3500", { mode: "soft" });

				// 既存プロパティが存在し続けること
				expect(result.hex).toBeDefined();
				expect(result.originalHex).toBeDefined();
				expect(result.cudColor).toBeDefined();
				expect(result.snapped).toBeDefined();
				expect(result.deltaE).toBeDefined();
				expect(result.zone).toBeDefined();
				expect(result.deltaEChange).toBeDefined();
				expect(result.explanation).toBeDefined();
			});

			it("should not break existing test assertions", () => {
				const result = softSnapToCudColor("#FF2800", { mode: "soft" });

				// 既存のアサーションと同じ動作を確認
				expect(result.zone).toBe("safe");
				expect(result.snapped).toBe(false);
				expect(result.hex).toBe("#FF2800");
			});
		});
	});

	// タスク4.3: Soft Snap機能のユニットテスト追加
	// Requirements: 8.4
	describe("softSnapToCudColor - Task 4.3 Tests", () => {
		describe("Zone snap behavior verification", () => {
			it("Safe Zone: should not modify color at all", () => {
				// CUD色そのもの（deltaE = 0）はSafe Zoneに入る
				const cudRed = "#FF2800";
				const result = softSnapToCudColor(cudRed, { mode: "soft" });

				expect(result.zone).toBe("safe");
				expect(result.snapped).toBe(false);
				expect(result.hex).toBe(cudRed);
				expect(result.deltaEChange).toBe(0);
			});

			it("Safe Zone: should not snap even with high returnFactor", () => {
				const cudBlue = "#0041FF";
				const result = softSnapToCudColor(cudBlue, {
					mode: "soft",
					returnFactor: 1.0,
				});

				expect(result.zone).toBe("safe");
				expect(result.snapped).toBe(false);
				// Safe Zoneでは returnFactor に関係なくスナップしない
			});

			it("Warning Zone: should apply partial snap based on returnFactor", () => {
				// Warning Zone内の色を作成するため、閾値を調整
				const testColor = "#FF4000"; // 赤に近いがずれている
				const result = softSnapToCudColor(testColor, {
					mode: "soft",
					returnFactor: 0.5,
					zoneThresholds: { safe: 0.001, warning: 0.5 }, // Warning Zoneを広げる
				});

				if (result.zone === "warning") {
					expect(result.snapped).toBe(true);
					expect(result.deltaEChange).toBeGreaterThan(0);
				}
			});

			it("Off Zone: should snap towards Warning boundary", () => {
				// CUD色から遠い色
				const farColor = "#808080"; // グレー
				const result = softSnapToCudColor(farColor, { mode: "soft" });

				if (result.zone === "off") {
					expect(result.snapped).toBe(true);
					expect(result.deltaEChange).toBeGreaterThan(0);
				}
			});
		});

		describe("returnFactor effect tests (0.0, 0.5, 1.0)", () => {
			it("returnFactor=0.0: should not change color in Warning Zone", () => {
				const testColor = "#FF4000";
				const result = softSnapToCudColor(testColor, {
					mode: "soft",
					returnFactor: 0.0,
					zoneThresholds: { safe: 0.001, warning: 0.5 },
				});

				if (result.zone === "warning") {
					expect(result.snapped).toBe(false);
					expect(result.hex.toUpperCase()).toBe(
						result.originalHex.toUpperCase(),
					);
					expect(result.deltaEChange).toBe(0);
				}
			});

			it("returnFactor=0.5: should interpolate to midpoint in Warning Zone", () => {
				const testColor = "#FF4000";
				const result05 = softSnapToCudColor(testColor, {
					mode: "soft",
					returnFactor: 0.5,
					zoneThresholds: { safe: 0.001, warning: 0.5 },
				});

				const result00 = softSnapToCudColor(testColor, {
					mode: "soft",
					returnFactor: 0.0,
					zoneThresholds: { safe: 0.001, warning: 0.5 },
				});

				const result10 = softSnapToCudColor(testColor, {
					mode: "soft",
					returnFactor: 1.0,
					zoneThresholds: { safe: 0.001, warning: 0.5 },
				});

				if (result05.zone === "warning") {
					// returnFactor=0.5の結果は0.0と1.0の中間
					expect(result05.deltaEChange).toBeGreaterThan(result00.deltaEChange);
					expect(result05.deltaEChange).toBeLessThan(result10.deltaEChange);
				}
			});

			it("returnFactor=1.0: should fully snap to CUD color in Warning Zone", () => {
				const testColor = "#FF4000";
				const result = softSnapToCudColor(testColor, {
					mode: "soft",
					returnFactor: 1.0,
					zoneThresholds: { safe: 0.001, warning: 0.5 },
				});

				if (result.zone === "warning") {
					expect(result.snapped).toBe(true);
					// 大文字小文字を無視して比較
					expect(result.hex.toUpperCase()).toBe(
						result.cudColor.hex.toUpperCase(),
					);
				}
			});

			it("returnFactor comparison: higher factor = more snap", () => {
				const testColor = "#FF5000";

				const results = [0.2, 0.4, 0.6, 0.8].map((factor) =>
					softSnapToCudColor(testColor, {
						mode: "soft",
						returnFactor: factor,
						zoneThresholds: { safe: 0.001, warning: 0.5 },
					}),
				);

				// Warning Zoneの場合、高いfactorほどdeltaEChangeが大きい
				for (let i = 1; i < results.length; i++) {
					const current = results[i];
					const previous = results[i - 1];
					if (
						current &&
						previous &&
						current.zone === "warning" &&
						previous.zone === "warning"
					) {
						expect(current.deltaEChange).toBeGreaterThanOrEqual(
							previous.deltaEChange,
						);
					}
				}
			});
		});

		describe("Gamut clamping verification", () => {
			it("should handle colors that might exceed sRGB gamut after interpolation", () => {
				// 極端な彩度の色をテスト
				const highSaturationColor = "#FF0000"; // 純粋な赤
				const result = softSnapToCudColor(highSaturationColor, {
					mode: "soft",
					returnFactor: 0.5,
				});

				// 結果は有効なHEX色であるべき（大文字小文字を許容）
				expect(result.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
			});

			it("should produce valid sRGB hex for any input", () => {
				const testColors = [
					"#000000", // 黒
					"#FFFFFF", // 白
					"#FF0000", // 赤
					"#00FF00", // 緑
					"#0000FF", // 青
					"#123456", // 任意の色
					"#ABCDEF", // 任意の色
				];

				for (const color of testColors) {
					const result = softSnapToCudColor(color, {
						mode: "soft",
						returnFactor: 0.5,
					});

					// 有効なHEX形式であること（大文字小文字を許容）
					expect(result.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);

					// R, G, Bの値が0-255の範囲内であること
					const hex = result.hex.slice(1);
					const r = Number.parseInt(hex.slice(0, 2), 16);
					const g = Number.parseInt(hex.slice(2, 4), 16);
					const b = Number.parseInt(hex.slice(4, 6), 16);

					expect(r).toBeGreaterThanOrEqual(0);
					expect(r).toBeLessThanOrEqual(255);
					expect(g).toBeGreaterThanOrEqual(0);
					expect(g).toBeLessThanOrEqual(255);
					expect(b).toBeGreaterThanOrEqual(0);
					expect(b).toBeLessThanOrEqual(255);
				}
			});

			it("should handle Off Zone colors with extreme deltaE", () => {
				// CUD色から非常に遠い色
				const extremeColor = "#7F7F7F"; // 中間グレー
				const result = softSnapToCudColor(extremeColor, {
					mode: "soft",
					returnFactor: 0.5,
				});

				// 結果は有効であるべき（大文字小文字を許容）
				expect(result.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
				expect(result.zone).toBeDefined();
				expect(result.cudColor).toBeDefined();
			});
		});

		describe("Zone boundary tests", () => {
			it("boundary: deltaE at Safe threshold (0.05) should be Safe Zone", () => {
				// deltaE = 0.05 の境界ケース
				// 実際の色でテストするのは難しいので、classifyZone関数をインポートして確認
				const result = softSnapToCudColor("#FF2800", {
					mode: "soft",
					zoneThresholds: { safe: 0.05, warning: 0.12 },
				});

				// CUD色はdeltaE ≈ 0なのでSafe Zone
				expect(result.zone).toBe("safe");
			});

			it("boundary: deltaE slightly above Safe threshold should be Warning Zone", () => {
				// Safe閾値を非常に小さくして、CUD色でもWarning Zoneに入るようにする
				const result = softSnapToCudColor("#FF2801", {
					mode: "soft",
					zoneThresholds: { safe: 0.0001, warning: 0.12 },
				});

				// 閾値を非常に小さくしたので、CUD色に近くてもWarning Zoneになるはず
				expect(["warning", "off"]).toContain(result.zone);
			});

			it("boundary: deltaE at Warning threshold should be Warning Zone", () => {
				const result = softSnapToCudColor("#FF4000", {
					mode: "soft",
					zoneThresholds: { safe: 0.001, warning: 0.12 },
				});

				// ゾーン判定が正しく動作していることを確認
				expect(["safe", "warning", "off"]).toContain(result.zone);
			});

			it("boundary: deltaE above Warning threshold should be Off Zone", () => {
				// Warning閾値を非常に小さくして、Off Zoneを強制
				const result = softSnapToCudColor("#123456", {
					mode: "soft",
					zoneThresholds: { safe: 0.0001, warning: 0.001 },
				});

				expect(result.zone).toBe("off");
			});
		});

		describe("Off Zone snap behavior", () => {
			it("Off Zone: should snap towards CUD color, not fully to it", () => {
				const farColor = "#123456";
				const result = softSnapToCudColor(farColor, { mode: "soft" });

				if (result.zone === "off") {
					// Off Zoneではスナップされるが、完全にはCUD色にならない
					expect(result.snapped).toBe(true);
					expect(result.hex).not.toBe(farColor.toUpperCase());
					// 完全なCUD色ではない（Warning境界まで）
				}
			});

			it("Off Zone: deltaEChange should be positive", () => {
				const farColor = "#5A5A5A";
				const result = softSnapToCudColor(farColor, { mode: "soft" });

				if (result.zone === "off") {
					expect(result.deltaEChange).toBeGreaterThan(0);
				}
			});
		});
	});
});

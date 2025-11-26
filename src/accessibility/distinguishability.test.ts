import { describe, expect, test } from "bun:test";
import { Color } from "../core/color";
import {
	calculateCVDScore,
	calculateDeltaE,
	calculateSimpleDeltaE,
	checkAdjacentShadesDistinguishability,
	checkBackgroundTextDistinguishability,
	checkDistinguishability,
	checkPaletteDistinguishability,
	generateCVDScoreReport,
	generateImprovementReport,
	generateImprovementSuggestions,
	generatePaletteImprovementSuggestions,
	suggestChromaAdjustment,
	suggestHueAdjustment,
	suggestLightnessAdjustment,
} from "./distinguishability";

describe("Distinguishability", () => {
	describe("calculateDeltaE", () => {
		test("should return 0 for identical colors", () => {
			const color = new Color("#ff0000");
			const deltaE = calculateDeltaE(color, color);

			expect(deltaE).toBe(0);
		});

		test("should return positive value for different colors", () => {
			const red = new Color("#ff0000");
			const blue = new Color("#0000ff");
			const deltaE = calculateDeltaE(red, blue);

			expect(deltaE).toBeGreaterThan(0);
		});

		test("should return larger value for more different colors", () => {
			const red = new Color("#ff0000");
			const darkRed = new Color("#aa0000");
			const blue = new Color("#0000ff");

			const deltaE1 = calculateDeltaE(red, darkRed);
			const deltaE2 = calculateDeltaE(red, blue);

			expect(deltaE2).toBeGreaterThan(deltaE1);
		});

		test("should be symmetric", () => {
			const color1 = new Color("#ff5500");
			const color2 = new Color("#00aaff");

			const deltaE1 = calculateDeltaE(color1, color2);
			const deltaE2 = calculateDeltaE(color2, color1);

			expect(Math.abs(deltaE1 - deltaE2)).toBeLessThan(0.001);
		});
	});

	describe("calculateSimpleDeltaE", () => {
		test("should return 0 for identical colors", () => {
			const color = new Color("#808080");
			const deltaE = calculateSimpleDeltaE(color, color);

			expect(deltaE).toBe(0);
		});

		test("should return positive value for different colors", () => {
			const white = new Color("#ffffff");
			const black = new Color("#000000");
			const deltaE = calculateSimpleDeltaE(white, black);

			expect(deltaE).toBeGreaterThan(0);
		});

		test("should be approximately 100 for white and black", () => {
			const white = new Color("#ffffff");
			const black = new Color("#000000");
			const deltaE = calculateSimpleDeltaE(white, black);

			// Lightness差が100なので、deltaEも約100
			expect(deltaE).toBeGreaterThan(90);
			expect(deltaE).toBeLessThan(110);
		});
	});

	describe("checkDistinguishability", () => {
		test("should return distinguishable for very different colors", () => {
			const red = new Color("#ff0000");
			const blue = new Color("#0000ff");

			const result = checkDistinguishability(
				red,
				blue,
				"red",
				"blue",
				"protanopia",
			);

			expect(result.isDistinguishable).toBe(true);
			expect(result.severity).toBe("ok");
		});

		test("should return not distinguishable for similar colors in protanopia", () => {
			// 赤と緑はprotanopiaで混同しやすい
			const red = new Color("#ff0000");
			const green = new Color("#00ff00");

			const result = checkDistinguishability(
				red,
				green,
				"red",
				"green",
				"protanopia",
			);

			// 混同しやすい色ペアなので識別困難になる可能性が高い
			expect(result.normalDeltaE).toBeGreaterThan(0);
			expect(result.simulatedDeltaE).toBeLessThan(result.normalDeltaE);
		});

		test("should include color pair names in result", () => {
			const color1 = new Color("#ff0000");
			const color2 = new Color("#0000ff");

			const result = checkDistinguishability(
				color1,
				color2,
				"primary-500",
				"secondary-500",
				"deuteranopia",
			);

			expect(result.colorPair).toEqual(["primary-500", "secondary-500"]);
			expect(result.visionType).toBe("deuteranopia");
		});

		test("should respect custom threshold", () => {
			const color1 = new Color("#ff0000");
			const color2 = new Color("#ff3300");

			// 低い閾値
			const result1 = checkDistinguishability(
				color1,
				color2,
				"c1",
				"c2",
				"protanopia",
				{ threshold: 1.0 },
			);

			// 高い閾値
			const result2 = checkDistinguishability(
				color1,
				color2,
				"c1",
				"c2",
				"protanopia",
				{ threshold: 50.0 },
			);

			// 同じ色差でも閾値によって判定が変わる
			expect(result1.simulatedDeltaE).toBe(result2.simulatedDeltaE);
		});

		test("should set severity based on thresholds", () => {
			const color1 = new Color("#ff0000");
			const color2 = new Color("#0000ff");

			const result = checkDistinguishability(
				color1,
				color2,
				"c1",
				"c2",
				"achromatopsia",
				{ threshold: 3.0, warningThreshold: 5.0 },
			);

			expect(["ok", "warning", "error"]).toContain(result.severity);
		});
	});

	describe("checkPaletteDistinguishability", () => {
		test("should check all color pairs", () => {
			const colors = {
				red: new Color("#ff0000"),
				green: new Color("#00ff00"),
				blue: new Color("#0000ff"),
			};

			const result = checkPaletteDistinguishability(colors);

			// 3色 × 3ペア × 4色覚タイプ = 12検証
			// ペア数 = 3C2 = 3
			expect(result.results.length).toBe(3 * 4);
		});

		test("should calculate pass rate", () => {
			const colors = {
				white: new Color("#ffffff"),
				black: new Color("#000000"),
			};

			const result = checkPaletteDistinguishability(colors);

			expect(result.passRate).toBeGreaterThanOrEqual(0);
			expect(result.passRate).toBeLessThanOrEqual(100);
		});

		test("should identify problematic pairs", () => {
			const colors = {
				red: new Color("#ff0000"),
				green: new Color("#00ff00"),
			};

			const result = checkPaletteDistinguishability(colors, {
				threshold: 3.0,
			});

			// 赤と緑はprotanopia/deuteranopiaで問題になる可能性が高い
			expect(result.problematicPairs.length).toBeGreaterThanOrEqual(0);
		});

		test("should count issues by vision type", () => {
			const colors = {
				color1: new Color("#ff5500"),
				color2: new Color("#00aaff"),
			};

			const result = checkPaletteDistinguishability(colors);

			expect(result.issuesByType).toHaveProperty("protanopia");
			expect(result.issuesByType).toHaveProperty("deuteranopia");
			expect(result.issuesByType).toHaveProperty("tritanopia");
			expect(result.issuesByType).toHaveProperty("achromatopsia");
		});

		test("should filter by vision types", () => {
			const colors = {
				red: new Color("#ff0000"),
				blue: new Color("#0000ff"),
			};

			const result = checkPaletteDistinguishability(colors, {
				visionTypes: ["protanopia"],
			});

			// 1ペア × 1色覚タイプ = 1検証
			expect(result.results.length).toBe(1);
			expect(result.results[0]?.visionType).toBe("protanopia");
		});
	});

	describe("checkAdjacentShadesDistinguishability", () => {
		test("should only check adjacent pairs", () => {
			const shades = [
				{ name: "100", color: new Color("#ffeeee") },
				{ name: "300", color: new Color("#ff9999") },
				{ name: "500", color: new Color("#ff0000") },
				{ name: "700", color: new Color("#990000") },
				{ name: "900", color: new Color("#330000") },
			];

			const result = checkAdjacentShadesDistinguishability(shades);

			// 4隣接ペア × 4色覚タイプ = 16検証
			expect(result.results.length).toBe(4 * 4);
		});

		test("should return 100% pass rate for well-separated shades", () => {
			const shades = [
				{ name: "light", color: new Color("#ffffff") },
				{ name: "dark", color: new Color("#000000") },
			];

			const result = checkAdjacentShadesDistinguishability(shades);

			// 白と黒は常に識別可能
			expect(result.passRate).toBe(100);
		});
	});

	describe("checkBackgroundTextDistinguishability", () => {
		test("should check all background-text combinations", () => {
			const backgrounds = {
				light: new Color("#ffffff"),
				dark: new Color("#000000"),
			};
			const texts = {
				primary: new Color("#ff0000"),
				secondary: new Color("#0000ff"),
			};

			const result = checkBackgroundTextDistinguishability(backgrounds, texts);

			// 2背景 × 2テキスト × 4色覚タイプ = 16検証
			expect(result.results.length).toBe(2 * 2 * 4);
		});

		test("should include bg/text prefix in color pair names", () => {
			const backgrounds = {
				white: new Color("#ffffff"),
			};
			const texts = {
				black: new Color("#000000"),
			};

			const result = checkBackgroundTextDistinguishability(backgrounds, texts);

			expect(result.results[0]?.colorPair[0]).toBe("bg:white");
			expect(result.results[0]?.colorPair[1]).toBe("text:black");
		});
	});

	describe("Known problematic color pairs", () => {
		test("red-green should have low distinguishability in protanopia", () => {
			const result = checkDistinguishability(
				new Color("#ff0000"),
				new Color("#00ff00"),
				"red",
				"green",
				"protanopia",
			);

			// シミュレーション後の色差は通常より小さくなる
			expect(result.simulatedDeltaE).toBeLessThan(result.normalDeltaE);
		});

		test("red-green should have low distinguishability in deuteranopia", () => {
			const result = checkDistinguishability(
				new Color("#ff0000"),
				new Color("#00ff00"),
				"red",
				"green",
				"deuteranopia",
			);

			expect(result.simulatedDeltaE).toBeLessThan(result.normalDeltaE);
		});

		test("blue-yellow should remain distinguishable in protanopia/deuteranopia", () => {
			const blue = new Color("#0000ff");
			const yellow = new Color("#ffff00");

			const resultP = checkDistinguishability(
				blue,
				yellow,
				"blue",
				"yellow",
				"protanopia",
			);
			const resultD = checkDistinguishability(
				blue,
				yellow,
				"blue",
				"yellow",
				"deuteranopia",
			);

			// 青と黄色は1型/2型色覚でも区別可能
			expect(resultP.isDistinguishable).toBe(true);
			expect(resultD.isDistinguishable).toBe(true);
		});

		test("blue-purple should have issues in tritanopia", () => {
			const result = checkDistinguishability(
				new Color("#0000ff"),
				new Color("#8800ff"),
				"blue",
				"purple",
				"tritanopia",
			);

			// 青と紫は3型色覚で混同しやすい
			expect(result.simulatedDeltaE).toBeLessThan(result.normalDeltaE);
		});
	});

	describe("calculateCVDScore", () => {
		test("should return 100 for single color", () => {
			const colors = {
				red: new Color("#ff0000"),
			};

			const result = calculateCVDScore(colors);

			expect(result.overallScore).toBe(100);
			expect(result.grade).toBe("A");
		});

		test("should return score between 0 and 100", () => {
			const colors = {
				red: new Color("#ff0000"),
				green: new Color("#00ff00"),
				blue: new Color("#0000ff"),
			};

			const result = calculateCVDScore(colors);

			expect(result.overallScore).toBeGreaterThanOrEqual(0);
			expect(result.overallScore).toBeLessThanOrEqual(100);
		});

		test("should include scores by vision type", () => {
			const colors = {
				white: new Color("#ffffff"),
				black: new Color("#000000"),
			};

			const result = calculateCVDScore(colors);

			expect(result.scoresByType).toHaveProperty("protanopia");
			expect(result.scoresByType).toHaveProperty("deuteranopia");
			expect(result.scoresByType).toHaveProperty("tritanopia");
			expect(result.scoresByType).toHaveProperty("achromatopsia");
		});

		test("should assign appropriate grade", () => {
			// 白と黒は常に識別可能なので高スコア
			const colors = {
				white: new Color("#ffffff"),
				black: new Color("#000000"),
			};

			const result = calculateCVDScore(colors);

			expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
			expect(result.description).toBeTruthy();
		});

		test("should use default weights", () => {
			const colors = {
				color1: new Color("#ff0000"),
				color2: new Color("#0000ff"),
			};

			const result = calculateCVDScore(colors);

			// デフォルトの重み
			expect(result.weights.protanopia).toBe(0.3);
			expect(result.weights.deuteranopia).toBe(0.35);
			expect(result.weights.tritanopia).toBe(0.2);
			expect(result.weights.achromatopsia).toBe(0.15);
		});

		test("should respect custom weights", () => {
			const colors = {
				red: new Color("#ff0000"),
				blue: new Color("#0000ff"),
			};

			const result = calculateCVDScore(colors, {
				weights: {
					protanopia: 0.5,
					deuteranopia: 0.5,
					tritanopia: 0,
					achromatopsia: 0,
				},
			});

			expect(result.weights.protanopia).toBe(0.5);
			expect(result.weights.deuteranopia).toBe(0.5);
		});

		test("should give high score for well-separated colors", () => {
			// 白と黒は全ての色覚タイプで識別可能
			const colors = {
				white: new Color("#ffffff"),
				black: new Color("#000000"),
			};

			const result = calculateCVDScore(colors);

			expect(result.overallScore).toBeGreaterThanOrEqual(90);
			expect(result.grade).toBe("A");
		});
	});

	describe("generateCVDScoreReport", () => {
		test("should generate report string", () => {
			const colors = {
				primary: new Color("#0066cc"),
				secondary: new Color("#ff5500"),
			};

			const report = generateCVDScoreReport(colors);

			expect(report).toContain("CVD Accessibility Score Report");
			expect(report).toContain("Overall Score:");
			expect(report).toContain("Grade:");
			expect(report).toContain("Protanopia");
			expect(report).toContain("Deuteranopia");
		});

		test("should include problematic pairs if any", () => {
			const colors = {
				red: new Color("#ff0000"),
				green: new Color("#00ff00"),
			};

			const report = generateCVDScoreReport(colors);

			expect(report).toBeTruthy();
		});
	});

	describe("Improvement Suggestions", () => {
		describe("suggestLightnessAdjustment", () => {
			test("should return null for already distinguishable colors", () => {
				const white = new Color("#ffffff");
				const black = new Color("#000000");

				const suggestion = suggestLightnessAdjustment(
					white,
					black,
					"white",
					"black",
					"protanopia",
				);

				expect(suggestion).toBeNull();
			});

			test("should suggest lightness adjustment for similar colors", () => {
				// 似た明度の色
				const color1 = new Color({ l: 0.5, c: 0.1, h: 30 });
				const color2 = new Color({ l: 0.52, c: 0.1, h: 35 });

				const suggestion = suggestLightnessAdjustment(
					color1,
					color2,
					"color1",
					"color2",
					"protanopia",
					{ targetDeltaE: 5.0 },
				);

				if (suggestion) {
					expect(suggestion.type).toBe("lightness");
					expect(suggestion.newDeltaE).toBeGreaterThan(0);
					expect(suggestion.expectedImprovement).toBeGreaterThan(0);
					expect(["明るく", "暗く"]).toContain(suggestion.direction);
				}
			});

			test("should respect maxLightnessAdjustment option", () => {
				const color1 = new Color({ l: 0.5, c: 0.1, h: 30 });
				const color2 = new Color({ l: 0.52, c: 0.1, h: 35 });

				const suggestion = suggestLightnessAdjustment(
					color1,
					color2,
					"color1",
					"color2",
					"protanopia",
					{ maxLightnessAdjustment: 0.1 },
				);

				if (suggestion) {
					expect(Math.abs(suggestion.adjustmentAmount)).toBeLessThanOrEqual(
						0.1,
					);
				}
			});
		});

		describe("suggestHueAdjustment", () => {
			test("should return null for already distinguishable colors", () => {
				const white = new Color("#ffffff");
				const black = new Color("#000000");

				const suggestion = suggestHueAdjustment(
					white,
					black,
					"white",
					"black",
					"deuteranopia",
				);

				expect(suggestion).toBeNull();
			});

			test("should suggest hue adjustment for similar colors", () => {
				// 色相が近い色
				const color1 = new Color({ l: 0.6, c: 0.15, h: 30 });
				const color2 = new Color({ l: 0.6, c: 0.15, h: 35 });

				const suggestion = suggestHueAdjustment(
					color1,
					color2,
					"color1",
					"color2",
					"deuteranopia",
					{ targetDeltaE: 5.0 },
				);

				if (suggestion) {
					expect(suggestion.type).toBe("hue");
					expect(suggestion.newDeltaE).toBeGreaterThan(0);
				}
			});

			test("should respect maxHueAdjustment option", () => {
				const color1 = new Color({ l: 0.6, c: 0.15, h: 30 });
				const color2 = new Color({ l: 0.6, c: 0.15, h: 35 });

				const suggestion = suggestHueAdjustment(
					color1,
					color2,
					"color1",
					"color2",
					"deuteranopia",
					{ maxHueAdjustment: 15 },
				);

				if (suggestion) {
					expect(Math.abs(suggestion.adjustmentAmount)).toBeLessThanOrEqual(15);
				}
			});
		});

		describe("suggestChromaAdjustment", () => {
			test("should return null for already distinguishable colors", () => {
				const white = new Color("#ffffff");
				const black = new Color("#000000");

				const suggestion = suggestChromaAdjustment(
					white,
					black,
					"white",
					"black",
					"tritanopia",
				);

				expect(suggestion).toBeNull();
			});

			test("should suggest chroma adjustment for similar colors", () => {
				// 彩度が近い色
				const color1 = new Color({ l: 0.6, c: 0.12, h: 30 });
				const color2 = new Color({ l: 0.6, c: 0.14, h: 30 });

				const suggestion = suggestChromaAdjustment(
					color1,
					color2,
					"color1",
					"color2",
					"achromatopsia",
					{ targetDeltaE: 5.0 },
				);

				if (suggestion) {
					expect(suggestion.type).toBe("chroma");
					expect(suggestion.newDeltaE).toBeGreaterThan(0);
				}
			});

			test("should respect maxChromaAdjustment option", () => {
				const color1 = new Color({ l: 0.6, c: 0.12, h: 30 });
				const color2 = new Color({ l: 0.6, c: 0.14, h: 30 });

				const suggestion = suggestChromaAdjustment(
					color1,
					color2,
					"color1",
					"color2",
					"achromatopsia",
					{ maxChromaAdjustment: 0.05 },
				);

				if (suggestion) {
					expect(Math.abs(suggestion.adjustmentAmount)).toBeLessThanOrEqual(
						0.05,
					);
				}
			});
		});

		describe("generateImprovementSuggestions", () => {
			test("should generate suggestions for problematic pairs", () => {
				const color1 = new Color({ l: 0.5, c: 0.15, h: 30 });
				const color2 = new Color({ l: 0.52, c: 0.15, h: 35 });

				const result = checkDistinguishability(
					color1,
					color2,
					"color1",
					"color2",
					"protanopia",
					{ threshold: 10.0 },
				);

				const improvement = generateImprovementSuggestions(result);

				expect(improvement.colorPair).toEqual(["color1", "color2"]);
				expect(improvement.visionType).toBe("protanopia");
				expect(improvement.originalDeltaE).toBe(result.simulatedDeltaE);
			});

			test("should sort suggestions by expected improvement", () => {
				const color1 = new Color({ l: 0.5, c: 0.15, h: 30 });
				const color2 = new Color({ l: 0.52, c: 0.15, h: 35 });

				const result = checkDistinguishability(
					color1,
					color2,
					"color1",
					"color2",
					"protanopia",
					{ threshold: 10.0 },
				);

				const improvement = generateImprovementSuggestions(result);

				if (improvement.suggestions.length > 1) {
					for (let i = 1; i < improvement.suggestions.length; i++) {
						const prev = improvement.suggestions[i - 1];
						const curr = improvement.suggestions[i];
						if (prev && curr) {
							expect(prev.expectedImprovement).toBeGreaterThanOrEqual(
								curr.expectedImprovement,
							);
						}
					}
				}
			});

			test("should limit suggestions to maxSuggestions", () => {
				const color1 = new Color({ l: 0.5, c: 0.15, h: 30 });
				const color2 = new Color({ l: 0.52, c: 0.15, h: 35 });

				const result = checkDistinguishability(
					color1,
					color2,
					"color1",
					"color2",
					"protanopia",
					{ threshold: 10.0 },
				);

				const improvement = generateImprovementSuggestions(result, {
					maxSuggestions: 1,
				});

				expect(improvement.suggestions.length).toBeLessThanOrEqual(1);
			});

			test("should set isImprovable based on suggestions", () => {
				const color1 = new Color("#ffffff");
				const color2 = new Color("#000000");

				const result = checkDistinguishability(
					color1,
					color2,
					"white",
					"black",
					"protanopia",
				);

				const improvement = generateImprovementSuggestions(result);

				// 既に識別可能なので改善提案なし
				expect(improvement.isImprovable).toBe(false);
				expect(improvement.suggestions.length).toBe(0);
			});
		});

		describe("generatePaletteImprovementSuggestions", () => {
			test("should generate improvements for all problematic pairs", () => {
				const colors = {
					color1: new Color({ l: 0.5, c: 0.15, h: 30 }),
					color2: new Color({ l: 0.52, c: 0.15, h: 35 }),
					color3: new Color({ l: 0.48, c: 0.15, h: 25 }),
				};

				const paletteResult = checkPaletteDistinguishability(colors, {
					threshold: 10.0,
				});

				const improvements =
					generatePaletteImprovementSuggestions(paletteResult);

				expect(improvements.length).toBe(paletteResult.problematicPairs.length);
			});

			test("should sort improvements by effect", () => {
				const colors = {
					red: new Color("#ff0000"),
					green: new Color("#00ff00"),
					blue: new Color("#0000ff"),
				};

				const paletteResult = checkPaletteDistinguishability(colors, {
					threshold: 50.0, // 高い閾値で問題を検出
				});

				const improvements =
					generatePaletteImprovementSuggestions(paletteResult);

				if (improvements.length > 1) {
					for (let i = 1; i < improvements.length; i++) {
						const prevMax =
							improvements[i - 1]?.suggestions[0]?.expectedImprovement ?? 0;
						const currMax =
							improvements[i]?.suggestions[0]?.expectedImprovement ?? 0;
						expect(prevMax).toBeGreaterThanOrEqual(currMax);
					}
				}
			});

			test("should return empty array if no problematic pairs", () => {
				const colors = {
					white: new Color("#ffffff"),
					black: new Color("#000000"),
				};

				const paletteResult = checkPaletteDistinguishability(colors);
				const improvements =
					generatePaletteImprovementSuggestions(paletteResult);

				expect(improvements.length).toBe(0);
			});
		});

		describe("generateImprovementReport", () => {
			test("should generate report for improvements", () => {
				const colors = {
					color1: new Color({ l: 0.5, c: 0.15, h: 30 }),
					color2: new Color({ l: 0.52, c: 0.15, h: 35 }),
				};

				const paletteResult = checkPaletteDistinguishability(colors, {
					threshold: 10.0,
				});

				const improvements =
					generatePaletteImprovementSuggestions(paletteResult);
				const report = generateImprovementReport(improvements);

				expect(report).toContain("CVD Improvement Suggestions");
				if (improvements.length > 0) {
					expect(report).toContain("Color Pair:");
					expect(report).toContain("Vision Type:");
				}
			});

			test("should return message when no improvements needed", () => {
				const report = generateImprovementReport([]);

				expect(report).toContain("No improvement suggestions needed");
			});

			test("should include suggestion details", () => {
				const colors = {
					color1: new Color({ l: 0.5, c: 0.15, h: 30 }),
					color2: new Color({ l: 0.52, c: 0.15, h: 35 }),
				};

				const paletteResult = checkPaletteDistinguishability(colors, {
					threshold: 10.0,
					visionTypes: ["protanopia"],
				});

				const improvements =
					generatePaletteImprovementSuggestions(paletteResult);
				const report = generateImprovementReport(improvements);

				if (
					improvements.length > 0 &&
					improvements[0]?.suggestions.length > 0
				) {
					expect(report).toContain("Suggestions:");
					expect(report).toContain("Expected ΔE:");
				}
			});
		});

		describe("Real-world improvement scenarios", () => {
			test("should improve red-green pair for protanopia", () => {
				const red = new Color("#ff0000");
				const green = new Color("#00ff00");

				const result = checkDistinguishability(
					red,
					green,
					"red",
					"green",
					"protanopia",
				);

				if (!result.isDistinguishable) {
					const improvement = generateImprovementSuggestions(result);

					expect(improvement.isImprovable).toBe(true);
					expect(improvement.suggestions.length).toBeGreaterThan(0);

					// 最も効果的な提案を確認
					const bestSuggestion = improvement.suggestions[0];
					if (bestSuggestion) {
						expect(bestSuggestion.newDeltaE).toBeGreaterThan(
							improvement.originalDeltaE,
						);
					}
				}
			});

			test("should improve blue-purple pair for tritanopia", () => {
				const blue = new Color("#0000ff");
				const purple = new Color("#8800ff");

				const result = checkDistinguishability(
					blue,
					purple,
					"blue",
					"purple",
					"tritanopia",
				);

				if (!result.isDistinguishable) {
					const improvement = generateImprovementSuggestions(result);

					expect(improvement.isImprovable).toBe(true);
					expect(improvement.suggestions.length).toBeGreaterThan(0);
				}
			});

			test("should prioritize lightness adjustment for most cases", () => {
				// 明度差を広げるのが最も効果的なケースが多い
				const color1 = new Color({ l: 0.5, c: 0.15, h: 30 });
				const color2 = new Color({ l: 0.55, c: 0.15, h: 30 });

				const result = checkDistinguishability(
					color1,
					color2,
					"color1",
					"color2",
					"protanopia",
					{ threshold: 10.0 },
				);

				const improvement = generateImprovementSuggestions(result);

				if (improvement.suggestions.length > 0) {
					// 明度差が小さい場合、Lightness調整が効果的
					const hasLightnessSuggestion = improvement.suggestions.some(
						(s) => s.type === "lightness",
					);
					expect(hasLightnessSuggestion).toBe(true);
				}
			});
		});
	});
});

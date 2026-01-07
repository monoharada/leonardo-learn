/**
 * step-selector.test.ts
 * TDD: Tests for DADS step selection functionality
 *
 * Selects appropriate scale steps (50-1200) based on role and preference
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { loadDadsTokens } from "../tokens/dads-data-provider";
import type { DadsToken } from "../tokens/types";
import {
	getTokensByHue,
	STEP_PREFERENCES,
	type StepSelectionContext,
	selectDadsStep,
	selectMultipleDadsSteps,
} from "./step-selector";

describe("step-selector", () => {
	let allTokens: DadsToken[];
	let blueTokens: DadsToken[];

	beforeAll(async () => {
		const tokens = await loadDadsTokens();
		allTokens = tokens.filter((t) => t.classification.category === "chromatic");
		blueTokens = allTokens.filter((t) => t.classification.hue === "blue");
	});

	describe("getTokensByHue", () => {
		test("returns all tokens for specified hue", () => {
			const blue = getTokensByHue(allTokens, "blue");
			expect(blue.length).toBe(13); // 13 scale steps per hue
			expect(blue.every((t) => t.classification.hue === "blue")).toBe(true);
		});

		test("returns empty array for non-existent hue", () => {
			const result = getTokensByHue(allTokens, "nonexistent" as never);
			expect(result).toEqual([]);
		});
	});

	describe("STEP_PREFERENCES", () => {
		test("defines mid-range steps for primary role", () => {
			expect(STEP_PREFERENCES.mid).toContain(600);
			expect(STEP_PREFERENCES.mid).toContain(500);
			expect(STEP_PREFERENCES.mid).toContain(700);
		});

		test("defines light steps for light preference", () => {
			expect(STEP_PREFERENCES.light).toContain(200);
			expect(STEP_PREFERENCES.light).toContain(300);
			expect(STEP_PREFERENCES.light).toContain(400);
		});

		test("defines dark steps for dark preference", () => {
			expect(STEP_PREFERENCES.dark).toContain(800);
			expect(STEP_PREFERENCES.dark).toContain(900);
			expect(STEP_PREFERENCES.dark).toContain(1000);
		});
	});

	describe("selectDadsStep", () => {
		describe("mid preference (primary/secondary)", () => {
			test("selects mid-range step (500-700) for primary role", () => {
				const context: StepSelectionContext = {
					role: "primary",
					lightPreference: "mid",
				};
				const result = selectDadsStep("blue", context, allTokens, new Set());

				expect(result).not.toBeNull();
				expect(result!.classification.hue).toBe("blue");
				expect(result!.classification.scale).toBeGreaterThanOrEqual(500);
				expect(result!.classification.scale).toBeLessThanOrEqual(700);
			});

			test("selects mid-range step for secondary role", () => {
				const context: StepSelectionContext = {
					role: "secondary",
					lightPreference: "mid",
				};
				const result = selectDadsStep("yellow", context, allTokens, new Set());

				expect(result).not.toBeNull();
				expect(result!.classification.hue).toBe("yellow");
				expect(result!.classification.scale).toBeGreaterThanOrEqual(500);
				expect(result!.classification.scale).toBeLessThanOrEqual(700);
			});
		});

		describe("light preference (accent light)", () => {
			test("selects light step (200-400) for accent light role", () => {
				const context: StepSelectionContext = {
					role: "accent",
					lightPreference: "light",
				};
				const result = selectDadsStep("red", context, allTokens, new Set());

				expect(result).not.toBeNull();
				expect(result!.classification.hue).toBe("red");
				expect(result!.classification.scale).toBeGreaterThanOrEqual(200);
				expect(result!.classification.scale).toBeLessThanOrEqual(400);
			});
		});

		describe("dark preference (accent dark)", () => {
			test("selects dark step (800-1000) for accent dark role", () => {
				const context: StepSelectionContext = {
					role: "accent",
					lightPreference: "dark",
				};
				const result = selectDadsStep("green", context, allTokens, new Set());

				expect(result).not.toBeNull();
				expect(result!.classification.hue).toBe("green");
				expect(result!.classification.scale).toBeGreaterThanOrEqual(800);
				expect(result!.classification.scale).toBeLessThanOrEqual(1000);
			});
		});

		describe("avoidance of used tokens", () => {
			test("avoids already-used token IDs", () => {
				const usedIds = new Set(["dads-blue-600"]);
				const context: StepSelectionContext = {
					role: "primary",
					lightPreference: "mid",
				};
				const result = selectDadsStep("blue", context, allTokens, usedIds);

				expect(result).not.toBeNull();
				expect(result!.id).not.toBe("dads-blue-600");
			});

			test("falls back to next preference when primary is used", () => {
				// Use all mid-range blue tokens
				const usedIds = new Set([
					"dads-blue-500",
					"dads-blue-600",
					"dads-blue-700",
				]);
				const context: StepSelectionContext = {
					role: "primary",
					lightPreference: "mid",
				};
				const result = selectDadsStep("blue", context, allTokens, usedIds);

				expect(result).not.toBeNull();
				// Should fall back to adjacent steps (400 or 800)
				expect([400, 800]).toContain(result!.classification.scale);
			});

			test("returns null when all tokens of hue are used", () => {
				const allBlueIds = new Set(blueTokens.map((t) => t.id));
				const context: StepSelectionContext = {
					role: "primary",
					lightPreference: "mid",
				};
				const result = selectDadsStep("blue", context, allTokens, allBlueIds);

				expect(result).toBeNull();
			});
		});

		describe("all DADS hues", () => {
			// Local name (DADS_CHROMAS) -> DADS token hue name mapping
			// DADS_CHROMAS uses different names than actual DADS tokens
			const hueMapping: Record<string, string> = {
				blue: "blue",
				cyan: "light-blue", // DADS_CHROMAS "cyan" -> DADS token "light-blue"
				teal: "cyan", // DADS_CHROMAS "teal" -> DADS token "cyan"
				green: "green",
				lime: "lime",
				yellow: "yellow",
				orange: "orange",
				red: "red",
				magenta: "magenta",
				purple: "purple",
			};

			const hues = Object.keys(hueMapping);

			for (const localHue of hues) {
				test(`can select token for hue: ${localHue}`, () => {
					const context: StepSelectionContext = {
						role: "secondary",
						lightPreference: "mid",
					};
					const result = selectDadsStep(
						localHue,
						context,
						allTokens,
						new Set(),
					);

					expect(result).not.toBeNull();
					// Result hue should be the DADS token's actual hue name
					expect(result!.classification.hue).toBe(hueMapping[localHue]);
				});
			}
		});

		describe("edge cases", () => {
			test("handles empty token array", () => {
				const context: StepSelectionContext = {
					role: "primary",
					lightPreference: "mid",
				};
				const result = selectDadsStep("blue", context, [], new Set());

				expect(result).toBeNull();
			});

			test("handles hue with no matching tokens", () => {
				const context: StepSelectionContext = {
					role: "primary",
					lightPreference: "mid",
				};
				// Only provide non-blue tokens
				const nonBlueTokens = allTokens.filter(
					(t) => t.classification.hue !== "blue",
				);
				const result = selectDadsStep(
					"blue",
					context,
					nonBlueTokens,
					new Set(),
				);

				expect(result).toBeNull();
			});
		});
	});

	describe("selectMultipleDadsSteps", () => {
		test("selects multiple tokens for different hues", () => {
			const selections = [
				{
					hueName: "blue" as const,
					context: {
						role: "primary" as const,
						lightPreference: "mid" as const,
					},
				},
				{
					hueName: "yellow" as const,
					context: {
						role: "secondary" as const,
						lightPreference: "mid" as const,
					},
				},
				{
					hueName: "red" as const,
					context: {
						role: "accent" as const,
						lightPreference: "dark" as const,
					},
				},
			];
			const results = selectMultipleDadsSteps(selections, allTokens);

			expect(results).toHaveLength(3);
			expect(results[0]).not.toBeNull();
			expect(results[1]).not.toBeNull();
			expect(results[2]).not.toBeNull();

			expect(results[0]!.classification.hue).toBe("blue");
			expect(results[1]!.classification.hue).toBe("yellow");
			expect(results[2]!.classification.hue).toBe("red");
		});

		test("avoids duplicate selections across palette", () => {
			// Select same hue twice - should get different steps
			const selections = [
				{
					hueName: "blue" as const,
					context: {
						role: "primary" as const,
						lightPreference: "mid" as const,
					},
				},
				{
					hueName: "blue" as const,
					context: {
						role: "secondary" as const,
						lightPreference: "mid" as const,
					},
				},
			];
			const results = selectMultipleDadsSteps(selections, allTokens);

			expect(results).toHaveLength(2);
			expect(results[0]).not.toBeNull();
			expect(results[1]).not.toBeNull();

			// Both should be blue, but different IDs
			expect(results[0]!.classification.hue).toBe("blue");
			expect(results[1]!.classification.hue).toBe("blue");
			expect(results[0]!.id).not.toBe(results[1]!.id);
		});

		test("returns null for selections when all tokens exhausted", () => {
			// Try to select more blue tokens than available (13)
			const selections = Array.from({ length: 15 }, () => ({
				hueName: "blue" as const,
				context: { role: "accent" as const, lightPreference: "mid" as const },
			}));
			const results = selectMultipleDadsSteps(selections, allTokens);

			expect(results).toHaveLength(15);
			// First 13 should succeed (13 blue tokens)
			const nonNullCount = results.filter((r) => r !== null).length;
			expect(nonNullCount).toBe(13);
			// Last 2 should be null
			expect(results[13]).toBeNull();
			expect(results[14]).toBeNull();
		});

		test("handles empty selections array", () => {
			const results = selectMultipleDadsSteps([], allTokens);
			expect(results).toEqual([]);
		});

		test("handles hue name mapping for multi-selection", () => {
			// Test that local hue names are mapped correctly
			const selections = [
				{
					hueName: "cyan" as const, // Maps to "light-blue" in DADS
					context: {
						role: "primary" as const,
						lightPreference: "mid" as const,
					},
				},
				{
					hueName: "teal" as const, // Maps to "cyan" in DADS
					context: {
						role: "secondary" as const,
						lightPreference: "mid" as const,
					},
				},
			];
			const results = selectMultipleDadsSteps(selections, allTokens);

			expect(results).toHaveLength(2);
			expect(results[0]).not.toBeNull();
			expect(results[1]).not.toBeNull();

			// Verify mapped hue names
			expect(results[0]!.classification.hue).toBe("light-blue");
			expect(results[1]!.classification.hue).toBe("cyan");
		});
	});
});

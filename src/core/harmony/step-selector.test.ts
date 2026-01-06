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
});

/**
 * step-selector.ts
 * Selects appropriate DADS scale steps based on role and preference
 *
 * DADS Scale Steps: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200
 */

import type { DadsChromaScale, DadsColorHue, DadsToken } from "../tokens/types";
import type { DadsColorHue as LocalDadsColorHue } from "./hue-mapper";

/**
 * Step selection context
 */
export interface StepSelectionContext {
	/** Color role in the palette */
	role: "primary" | "secondary" | "accent";
	/** Lightness preference */
	lightPreference: "light" | "dark" | "mid";
}

/**
 * Step preferences by lightness preference
 *
 * - mid: 600 is primary, then 500, 700 (balanced visibility)
 * - light: 300 is primary, then 200, 400 (lighter variants)
 * - dark: 900 is primary, then 800, 1000 (darker variants)
 */
export const STEP_PREFERENCES: Record<
	"light" | "mid" | "dark",
	DadsChromaScale[]
> = {
	light: [300, 200, 400, 100, 500],
	mid: [600, 500, 700, 400, 800],
	dark: [900, 800, 1000, 700, 1100],
};

/**
 * Fallback steps when primary preferences are exhausted
 */
const FALLBACK_STEPS: DadsChromaScale[] = [
	600, 500, 700, 400, 800, 300, 900, 200, 1000, 100, 1100, 50, 1200,
];

/**
 * Get tokens filtered by hue name
 *
 * @param tokens - All DADS tokens
 * @param hueName - Target hue name
 * @returns Tokens matching the hue
 */
export function getTokensByHue(
	tokens: DadsToken[],
	hueName: string,
): DadsToken[] {
	return tokens.filter((t) => t.classification.hue === hueName);
}

/**
 * Select a DADS token by hue and step preference
 *
 * Selection strategy:
 * 1. Filter tokens by hue
 * 2. Try preferred steps in order
 * 3. Skip already-used tokens
 * 4. Fall back to any available step if preferences exhausted
 *
 * @param hueName - Target DADS hue name
 * @param context - Selection context (role, lightPreference)
 * @param tokens - All available DADS tokens
 * @param usedTokenIds - Set of already-used token IDs to avoid
 * @returns Selected token or null if none available
 *
 * @example
 * ```ts
 * const token = selectDadsStep("blue", {
 *   role: "primary",
 *   lightPreference: "mid"
 * }, allTokens, new Set());
 * // Returns dads-blue-600 (or nearby step if used)
 * ```
 */
export function selectDadsStep(
	hueName: LocalDadsColorHue | DadsColorHue,
	context: StepSelectionContext,
	tokens: DadsToken[],
	usedTokenIds: Set<string>,
): DadsToken | null {
	// Map local hue names to DADS hue names if needed
	const dadsHueName = mapToDadsHueName(hueName);

	// Filter tokens by hue
	const hueTokens = getTokensByHue(tokens, dadsHueName);
	if (hueTokens.length === 0) {
		return null;
	}

	// Create a map of scale -> token for quick lookup
	const tokenByScale = new Map<DadsChromaScale, DadsToken>();
	for (const token of hueTokens) {
		if (token.classification.scale !== undefined) {
			tokenByScale.set(token.classification.scale as DadsChromaScale, token);
		}
	}

	// Get preferred steps based on lightPreference
	const preferredSteps = STEP_PREFERENCES[context.lightPreference];

	// Try preferred steps first
	for (const step of preferredSteps) {
		const token = tokenByScale.get(step);
		if (token && !usedTokenIds.has(token.id)) {
			return token;
		}
	}

	// Fall back to any available step
	for (const step of FALLBACK_STEPS) {
		const token = tokenByScale.get(step);
		if (token && !usedTokenIds.has(token.id)) {
			return token;
		}
	}

	// No available token found
	return null;
}

/**
 * Map local hue names to DADS hue names
 *
 * Handles the difference between:
 * - Local names (from hue-mapper): "cyan", "teal"
 * - DADS names: "light-blue", "cyan"
 */
function mapToDadsHueName(
	hueName: LocalDadsColorHue | DadsColorHue,
): DadsColorHue {
	// DADS uses different names for some hues
	const mapping: Partial<Record<LocalDadsColorHue, DadsColorHue>> = {
		// Local name -> DADS name
		cyan: "light-blue", // DADS_CHROMAS uses "cyan" for what DADS calls "light-blue"
		teal: "cyan", // DADS_CHROMAS uses "teal" for what DADS calls "cyan"
	};

	return mapping[hueName as LocalDadsColorHue] ?? (hueName as DadsColorHue);
}

/**
 * Select multiple tokens for a palette
 *
 * Ensures no duplicates are selected across the palette.
 *
 * @param selections - Array of {hueName, context} pairs
 * @param tokens - All available DADS tokens
 * @returns Array of selected tokens (may contain nulls for failed selections)
 */
export function selectMultipleDadsSteps(
	selections: Array<{
		hueName: LocalDadsColorHue | DadsColorHue;
		context: StepSelectionContext;
	}>,
	tokens: DadsToken[],
): Array<DadsToken | null> {
	const usedIds = new Set<string>();
	const results: Array<DadsToken | null> = [];

	for (const { hueName, context } of selections) {
		const token = selectDadsStep(hueName, context, tokens, usedIds);
		if (token) {
			usedIds.add(token.id);
		}
		results.push(token);
	}

	return results;
}

/**
 * hue-mapper.ts
 * Maps arbitrary hue values to nearest DADS 10 hues
 *
 * DADS 10 Hues:
 * - blue: 266, cyan: 251, teal: 216, green: 157, lime: 128
 * - yellow: 88, orange: 41, red: 27, magenta: 328, purple: 299
 */

import { DADS_CHROMAS } from "../base-chroma";

/**
 * DADS Color Hue type (10 chromatic hues)
 */
export type DadsColorHue =
	| "blue"
	| "cyan"
	| "teal"
	| "green"
	| "lime"
	| "yellow"
	| "orange"
	| "red"
	| "magenta"
	| "purple";

/**
 * Result of findNearestDadsHue
 */
export interface DadsHueMapping {
	/** DADS hue name */
	hueName: DadsColorHue;
	/** DADS hue value (0-360) */
	hue: number;
	/** Distance from input hue (circular) */
	distance: number;
}

/**
 * Normalize hue to 0-360 range
 *
 * @param hue - Input hue value (can be negative or > 360)
 * @returns Normalized hue (0-359)
 */
export function normalizeHue(hue: number): number {
	let normalized = hue % 360;
	if (normalized < 0) {
		normalized += 360;
	}
	// Handle JavaScript's -0 edge case
	return normalized === 0 ? 0 : normalized;
}

/**
 * Calculate circular distance between two hues (0-180)
 *
 * @param hue1 - First hue
 * @param hue2 - Second hue
 * @returns Shortest circular distance
 */
function calculateHueDistance(hue1: number, hue2: number): number {
	const normalizedHue1 = normalizeHue(hue1);
	const normalizedHue2 = normalizeHue(hue2);
	const diff = Math.abs(normalizedHue1 - normalizedHue2);
	return Math.min(diff, 360 - diff);
}

/**
 * Find the nearest DADS hue for a given hue value
 *
 * Uses circular distance calculation to find the closest
 * of the 10 DADS chromatic hues.
 *
 * @param targetHue - Target hue value (0-360, or will be normalized)
 * @returns Object with hueName, hue, and distance
 *
 * @example
 * ```ts
 * const result = findNearestDadsHue(270);
 * // { hueName: "blue", hue: 266, distance: 4 }
 *
 * // Complementary color mapping
 * const complement = findNearestDadsHue((266 + 180) % 360);
 * // { hueName: "yellow", hue: 88, distance: 2 }
 * ```
 */
export function findNearestDadsHue(targetHue: number): DadsHueMapping {
	const normalizedTarget = normalizeHue(targetHue);

	let nearest: DadsHueMapping | null = null;
	let minDistance = Number.POSITIVE_INFINITY;

	for (const chroma of DADS_CHROMAS) {
		const distance = calculateHueDistance(normalizedTarget, chroma.hue);

		if (distance < minDistance) {
			minDistance = distance;
			nearest = {
				hueName: chroma.name as DadsColorHue,
				hue: chroma.hue,
				distance,
			};
		}
	}

	if (!nearest) {
		// Fallback - should never happen with non-empty DADS_CHROMAS
		throw new Error("DADS_CHROMAS is empty");
	}

	return nearest;
}

/**
 * Get all DADS hue names
 */
export function getDadsHueNames(): DadsColorHue[] {
	return DADS_CHROMAS.map((c) => c.name as DadsColorHue);
}

/**
 * Get DADS hue value by name
 *
 * @param hueName - DADS hue name
 * @returns Hue value or undefined if not found
 */
export function getDadsHueValue(hueName: DadsColorHue): number | undefined {
	const chroma = DADS_CHROMAS.find((c) => c.name === hueName);
	return chroma?.hue;
}

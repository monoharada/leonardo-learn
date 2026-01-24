/**
 * dads-harmony-selector.ts
 * Generates harmony palettes using DADS token selection
 *
 * Combines hue-mapper and step-selector to create harmonious color palettes
 * from the 130 DADS chromatic tokens.
 */

import { oklch } from "culori";
import type { DadsToken } from "../tokens/types";
import { findNearestDadsHue, normalizeHue } from "./hue-mapper";
import { type StepSelectionContext, selectDadsStep } from "./step-selector";

/**
 * Single color in a harmony palette
 */
export interface HarmonyPaletteColor {
	/** The selected DADS token */
	token: DadsToken;
	/** Color role in the palette */
	role: "secondary" | "accent";
	/** Target hue offset from primary (degrees) */
	hueOffset: number;
	/** Actual hue of the selected token */
	actualHue: number;
}

/**
 * Result of harmony palette generation
 */
export interface HarmonyPaletteResult {
	/** Generated harmony colors */
	colors: HarmonyPaletteColor[];
	/** Primary color hue (from input) */
	primaryHue: number;
}

/**
 * Harmony type hue offsets
 */
const HARMONY_OFFSETS = {
	complementary: [180],
	triadic: [120, 240],
	analogous: [30, -30],
	splitComplementary: [150, 210],
	tetradic: [60, 180, 240],
	square: [90, 180, 270],
} as const;

/**
 * DADS Harmony Selector
 *
 * Generates harmony color palettes by selecting from DADS tokens
 * based on harmony theory (complementary, triadic, etc.)
 *
 * @example
 * ```ts
 * const tokens = await loadDadsTokens();
 * const chromaticTokens = tokens.filter(t => t.classification.category === "chromatic");
 * const selector = new DadsHarmonySelector(chromaticTokens);
 *
 * const result = selector.generateComplementary("#0056FF");
 * // Returns 1 color from complementary hue (yellow for blue input)
 * ```
 */
export class DadsHarmonySelector {
	private tokens: DadsToken[];

	/**
	 * Create a new DadsHarmonySelector
	 *
	 * @param tokens - DADS chromatic tokens (should be 130 tokens)
	 * @throws If no tokens provided
	 */
	constructor(tokens: DadsToken[]) {
		if (tokens.length === 0) {
			throw new Error("DadsHarmonySelector requires at least one token");
		}
		this.tokens = tokens;
	}

	/**
	 * Get the hue from a hex color
	 *
	 * @param hex - Hex color string
	 * @returns Hue in degrees (0-360) or 266 (blue) for grayscale
	 */
	private getHueFromHex(hex: string): number {
		const color = oklch(hex);
		// Default to blue (266) for grayscale or invalid colors
		return color?.h ?? 266;
	}

	/**
	 * Generate harmony colors based on hue offsets
	 *
	 * @param primaryHex - Primary color hex
	 * @param offsets - Array of hue offsets in degrees
	 * @param roles - Array of roles for each offset
	 * @returns Harmony palette result
	 */
	private generateHarmony(
		primaryHex: string,
		offsets: readonly number[],
		roles: Array<"secondary" | "accent">,
	): HarmonyPaletteResult {
		const primaryHue = this.getHueFromHex(primaryHex);
		const usedTokenIds = new Set<string>();
		const colors: HarmonyPaletteColor[] = [];

		for (const [index, offset] of offsets.entries()) {
			const role = roles[index] ?? "accent";

			// Calculate target hue
			const targetHue = normalizeHue(primaryHue + offset);

			// Find nearest DADS hue
			const nearestDads = findNearestDadsHue(targetHue);

			// Select step based on role
			const context: StepSelectionContext = {
				role,
				lightPreference: "mid",
			};

			const token = selectDadsStep(
				nearestDads.hueName,
				context,
				this.tokens,
				usedTokenIds,
			);

			if (token) {
				usedTokenIds.add(token.id);

				// Get actual hue of selected token
				const tokenOklch = oklch(token.hex);
				const actualHue = tokenOklch?.h ?? nearestDads.hue;

				colors.push({
					token,
					role,
					hueOffset: offset,
					actualHue,
				});
			}
		}

		return {
			colors,
			primaryHue,
		};
	}

	/**
	 * Generate complementary harmony (1 color, +180°)
	 *
	 * @param primaryHex - Primary color hex
	 * @returns Palette with 1 secondary color from opposite hue
	 */
	generateComplementary(primaryHex: string): HarmonyPaletteResult {
		return this.generateHarmony(primaryHex, HARMONY_OFFSETS.complementary, [
			"secondary",
		]);
	}

	/**
	 * Generate triadic harmony (2 colors, +120°, +240°)
	 *
	 * @param primaryHex - Primary color hex
	 * @returns Palette with secondary and accent colors
	 */
	generateTriadic(primaryHex: string): HarmonyPaletteResult {
		return this.generateHarmony(primaryHex, HARMONY_OFFSETS.triadic, [
			"secondary",
			"accent",
		]);
	}

	/**
	 * Generate analogous harmony (2 colors, +30°, -30°)
	 *
	 * @param primaryHex - Primary color hex
	 * @returns Palette with 2 colors from adjacent hues
	 */
	generateAnalogous(primaryHex: string): HarmonyPaletteResult {
		return this.generateHarmony(primaryHex, HARMONY_OFFSETS.analogous, [
			"secondary",
			"accent",
		]);
	}

	/**
	 * Generate split-complementary harmony (2 colors, +150°, +210°)
	 *
	 * @param primaryHex - Primary color hex
	 * @returns Palette with 2 colors around the complement
	 */
	generateSplitComplementary(primaryHex: string): HarmonyPaletteResult {
		return this.generateHarmony(
			primaryHex,
			HARMONY_OFFSETS.splitComplementary,
			["secondary", "accent"],
		);
	}

	/**
	 * Generate tetradic harmony (3 colors, +60°, +180°, +240°)
	 *
	 * @param primaryHex - Primary color hex
	 * @returns Palette with 1 secondary and 2 accent colors
	 */
	generateTetradic(primaryHex: string): HarmonyPaletteResult {
		return this.generateHarmony(primaryHex, HARMONY_OFFSETS.tetradic, [
			"secondary",
			"accent",
			"accent",
		]);
	}

	/**
	 * Generate square harmony (3 colors, +90°, +180°, +270°)
	 *
	 * @param primaryHex - Primary color hex
	 * @returns Palette with 1 secondary and 2 accent colors at 90° intervals
	 */
	generateSquare(primaryHex: string): HarmonyPaletteResult {
		return this.generateHarmony(primaryHex, HARMONY_OFFSETS.square, [
			"secondary",
			"accent",
			"accent",
		]);
	}
}

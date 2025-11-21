import { converter, formatHex, inGamut, type Oklch, parse } from "culori";

/**
 * Color object type definition (OKLCH)
 */
export type ColorObject = Oklch;

/**
 * Convert any color string to OKLCH object
 */
export const toOklch = converter("oklch");

/**
 * Convert OKLCH object to Hex string
 * Note: Color should already be clamped to sRGB gamut by clampChroma()
 */
export const toHex = (color: ColorObject): string => {
	// Direct conversion - clampChroma() already ensured gamut compliance
	return formatHex(color);
};

/**
 * Convert OKLCH object to RGB object
 */
export const toRgb = converter("rgb");

/**
 * Parse a color string into a ColorObject (OKLCH)
 * Returns undefined if invalid
 */
export const parseColor = (color: string): ColorObject | undefined => {
	const parsed = parse(color);
	if (!parsed) return undefined;
	return toOklch(parsed);
};

/**
 * Clamp chroma to displayable range (gamut mapping)
 * Strictly preserves hue and lightness, only reduces chroma to fit sRGB gamut
 * Uses binary search to find maximum displayable chroma
 */
export const clampChroma = (color: ColorObject): ColorObject => {
	// Check if color is already in gamut
	const isInGamutFn = inGamut("rgb");
	if (isInGamutFn(color)) {
		return color;
	}

	const { l, c, h } = color;
	if (c === undefined || c === 0) {
		return color; // Achromatic color, no clamping needed
	}

	// Binary search for maximum chroma that fits in gamut
	// IMPORTANT: Search up to theoretical maximum, not just input chroma
	// This allows us to find the highest possible chroma for this L/H combination
	let minC = 0;
	let maxC = 0.37; // Theoretical maximum chroma in OKLCH for sRGB
	let bestC = 0;
	const epsilon = 0.0005; // Precision for binary search

	// Quick check: if input is already in gamut and higher than we'd find, use it
	if (c <= maxC && isInGamutFn(color)) {
		return color;
	}

	while (maxC - minC > epsilon) {
		const midC = (minC + maxC) / 2;
		const testColor: ColorObject = {
			mode: "oklch",
			l,
			c: midC,
			h,
		};

		if (isInGamutFn(testColor)) {
			bestC = midC;
			minC = midC;
		} else {
			maxC = midC;
		}
	}

	return {
		mode: "oklch",
		l,
		c: bestC,
		h,
	};
};

import {
	converter,
	formatHex,
	inGamut,
	type Oklab,
	type Oklch,
	parse,
} from "culori";

/**
 * Clamp a value to the range [0, 1]
 */
export function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

/**
 * Color object type definition (OKLCH)
 */
export type ColorObject = Oklch;

/**
 * OKLab color object type definition
 */
export type OklabObject = Oklab;

/**
 * Convert any color string to OKLCH object
 */
export const toOklch = converter("oklch");

/**
 * Convert any color (string or color object) to OKLab object
 * Requirement 9.1, 9.2, 9.3: deltaEok計算のためのOKLab変換
 */
export const toOklab = converter("oklab");

/**
 * Calculate OKLab color difference (delta E) using Euclidean distance
 * Requirement 9.1: deltaEok(oklab1, oklab2)でOKLabユークリッド距離を計算
 * Formula: sqrt((L2-L1)² + (a2-a1)² + (b2-b1)²)
 *
 * @param oklab1 - First OKLab color object
 * @param oklab2 - Second OKLab color object
 * @returns deltaE value (0 or positive number)
 */
export const deltaEok = (oklab1: OklabObject, oklab2: OklabObject): number => {
	const dL = (oklab2.l ?? 0) - (oklab1.l ?? 0);
	const da = (oklab2.a ?? 0) - (oklab1.a ?? 0);
	const db = (oklab2.b ?? 0) - (oklab1.b ?? 0);

	return Math.sqrt(dL * dL + da * da + db * db);
};

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

import { converter, formatHex, type Oklch, parse } from "culori";

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
 */
export const toHex = (color: ColorObject): string => {
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
 * Simple clipping for now, can be improved later
 */
export const clampChroma = (color: ColorObject): ColorObject => {
	// culori handles gamut mapping when converting to RGB/Hex if needed,
	// but explicit clamping might be useful for logic.
	// For now, we rely on culori's default behavior or implement specific logic if needed.
	return color;
};

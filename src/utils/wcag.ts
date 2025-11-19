import { wcagContrast } from "culori";
import type { ColorObject } from "./color-space";

/**
 * WCAG 2.1 Contrast Ratio thresholds
 */
export const WCAG_RATIO_AA_LARGE = 3.0;
export const WCAG_RATIO_AA = 4.5;
export const WCAG_RATIO_AAA = 7.0;

/**
 * Calculate WCAG 2.1 contrast ratio between two colors
 * Returns a value between 1 and 21
 */
export const getContrast = (
	color1: ColorObject,
	color2: ColorObject,
): number => {
	return wcagContrast(color1, color2);
};

/**
 * Check if a contrast ratio meets a specific level
 */
export const meetsContrast = (
	contrast: number,
	level: "AA" | "AAA" | "AA_Large",
): boolean => {
	switch (level) {
		case "AA":
			return contrast >= WCAG_RATIO_AA;
		case "AAA":
			return contrast >= WCAG_RATIO_AAA;
		case "AA_Large":
			return contrast >= WCAG_RATIO_AA_LARGE;
		default:
			return false;
	}
};

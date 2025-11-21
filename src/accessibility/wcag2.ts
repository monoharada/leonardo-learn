import type { Color } from "../core/color";
import {
	WCAG_RATIO_AA,
	WCAG_RATIO_AA_LARGE,
	WCAG_RATIO_AAA,
} from "../utils/wcag";

export type WCAGStatus = "AAA" | "AA" | "AA Large" | "Fail";

/**
 * Get WCAG 2.1 compliance status for a given contrast ratio
 */
export const getWCAG2Status = (contrast: number): WCAGStatus => {
	if (contrast >= WCAG_RATIO_AAA) return "AAA";
	if (contrast >= WCAG_RATIO_AA) return "AA";
	if (contrast >= WCAG_RATIO_AA_LARGE) return "AA Large";
	return "Fail";
};

/**
 * Verify contrast compliance between two colors
 */
export const verifyContrast = (
	fg: Color,
	bg: Color,
	fontSize: "small" | "large" = "small",
): {
	contrast: number;
	status: WCAGStatus;
	isAA: boolean;
	isAAA: boolean;
} => {
	const contrast = fg.contrast(bg);
	const status = getWCAG2Status(contrast);

	let isAA = false;
	let isAAA = false;

	if (fontSize === "large") {
		isAA = contrast >= WCAG_RATIO_AA_LARGE;
		isAAA = contrast >= WCAG_RATIO_AA; // AAA Large is same as AA Small (4.5) usually?
		// Wait, WCAG 2.1:
		// AA Normal: 4.5
		// AA Large: 3.0
		// AAA Normal: 7.0
		// AAA Large: 4.5
		isAAA = contrast >= WCAG_RATIO_AA;
	} else {
		isAA = contrast >= WCAG_RATIO_AA;
		isAAA = contrast >= WCAG_RATIO_AAA;
	}

	return {
		contrast,
		status,
		isAA,
		isAAA,
	};
};

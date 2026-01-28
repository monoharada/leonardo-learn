import { formatHex, interpolate, parse, wcagContrast } from "culori";
import { calculateSimpleDeltaE } from "@/accessibility/distinguishability";
import { Color } from "@/core/color";
import {
	findDadsColorByHex,
	getDadsHueFromDisplayName,
} from "@/core/tokens/dads-data-provider";
import type { DadsColorHue, DadsToken } from "@/core/tokens/types";
import { clamp01 } from "@/utils/color-space";
import { parseKeyColor } from "../state";
import type { StudioPresetType } from "../types";
import {
	adjustLightnessForContrast,
	inferBaseChromaNameFromHex,
} from "./dads-snap";

export type KeyBackgroundTokenRef = {
	hue: DadsColorHue;
	step: number;
};

export type KeyBackgroundResult = {
	hex: string;
	tokenRef?: KeyBackgroundTokenRef;
};

const DEFAULT_KEY_BACKGROUND_MIN_TEXT_CONTRAST = 4.5;

function mixOklch(baseHex: string, tintHex: string, ratio: number): string {
	const base = parse(baseHex);
	const tint = parse(tintHex);
	if (!base || !tint) return tintHex;

	const mixer = interpolate([base, tint], "oklch");
	const mixed = mixer(clamp01(ratio));
	return formatHex(mixed) || tintHex;
}

function resolveMixRatio(
	preset: StudioPresetType,
	backgroundHex: string,
): number {
	const background = new Color(backgroundHex);
	const bgL = background.oklch?.l ?? 0.5;
	const isLight = bgL > 0.5;

	if (preset === "pastel") return isLight ? 0.22 : 0.18;
	if (preset === "high-contrast") return isLight ? 0.14 : 0.16;
	if (preset === "dark") return isLight ? 0.12 : 0.2;
	return isLight ? 0.16 : 0.18;
}

function resolvePrimaryHue(options: {
	dadsTokens: DadsToken[] | undefined;
	primaryHex: string;
	primaryBaseChromaName?: string;
}): DadsColorHue | undefined {
	const { dadsTokens, primaryHex, primaryBaseChromaName } = options;

	if (dadsTokens && dadsTokens.length > 0) {
		const dadsInfo = findDadsColorByHex(dadsTokens, primaryHex);
		if (dadsInfo?.hue) return dadsInfo.hue;
	}

	const baseName =
		primaryBaseChromaName || inferBaseChromaNameFromHex(primaryHex);
	return getDadsHueFromDisplayName(baseName);
}

function pickNearestSameHueToken(options: {
	dadsTokens: DadsToken[];
	hue: DadsColorHue;
	targetHex: string;
	textHex: string;
	minTextContrast: number;
}): { hex: string; step: number } | null {
	const { dadsTokens, hue, targetHex, textHex, minTextContrast } = options;

	const target = new Color(targetHex);
	let best: { hex: string; step: number } | null = null;
	let bestDeltaE = Number.POSITIVE_INFINITY;

	for (const token of dadsTokens) {
		const { classification, hex: tokenHex } = token;
		// Skip tokens without proper classification (e.g., mock data in tests)
		if (!classification) continue;
		if (classification.category !== "chromatic") continue;
		if (classification.hue !== hue) continue;
		if (!tokenHex?.startsWith("#")) continue;

		const step = classification.scale;
		if (step === undefined) continue;

		const contrast = wcagContrast(textHex, tokenHex) ?? 0;
		if (contrast < minTextContrast) continue;

		let deltaE = Number.POSITIVE_INFINITY;
		try {
			deltaE = calculateSimpleDeltaE(target, new Color(tokenHex));
		} catch {
			continue;
		}

		if (deltaE < bestDeltaE) {
			bestDeltaE = deltaE;
			best = { hex: tokenHex, step };
		}
	}

	return best;
}

export function resolveKeyBackgroundColor(options: {
	primaryHex: string;
	backgroundHex: string;
	textHex: string;
	preset: StudioPresetType;
	dadsTokens?: DadsToken[];
	primaryBaseChromaName?: string;
	minTextContrast?: number;
}): KeyBackgroundResult {
	const {
		primaryHex,
		backgroundHex,
		textHex,
		preset,
		dadsTokens,
		primaryBaseChromaName,
		minTextContrast = DEFAULT_KEY_BACKGROUND_MIN_TEXT_CONTRAST,
	} = options;

	const ratio = resolveMixRatio(preset, backgroundHex);
	const mixed = mixOklch(backgroundHex, primaryHex, ratio);

	// Ensure text remains readable on the key background.
	const contrastAdjusted = adjustLightnessForContrast(
		mixed,
		textHex,
		minTextContrast,
	);

	const hue = resolvePrimaryHue({
		dadsTokens,
		primaryHex,
		primaryBaseChromaName,
	});
	if (!hue || !dadsTokens || dadsTokens.length === 0) {
		return { hex: contrastAdjusted };
	}

	const picked = pickNearestSameHueToken({
		dadsTokens,
		hue,
		targetHex: contrastAdjusted,
		textHex,
		minTextContrast,
	});
	if (!picked) return { hex: contrastAdjusted };

	return {
		hex: picked.hex,
		tokenRef: { hue, step: picked.step },
	};
}

/**
 * Extract key-surface color from palette array.
 *
 * Finds the primary palette (non-derived with key colors) and generates
 * its corresponding key-surface color using resolveKeyBackgroundColor.
 *
 * @param options Configuration for key-surface extraction
 * @returns Color object for key-surface, or null if no primary palette found
 */
export function extractKeySurfaceColor(options: {
	palettes: Array<{ derivedFrom?: unknown; keyColors: string[] }>;
	backgroundHex: string;
	textHex: string;
	preset: StudioPresetType;
	dadsTokens?: DadsToken[];
}): Color | null {
	const { palettes, backgroundHex, textHex, preset, dadsTokens } = options;

	const primaryPalette = palettes.find((p) => !p.derivedFrom && p.keyColors[0]);
	if (!primaryPalette || !primaryPalette.keyColors[0]) return null;

	const { color: primaryHex } = parseKeyColor(primaryPalette.keyColors[0]);
	const keySurface = resolveKeyBackgroundColor({
		primaryHex,
		backgroundHex,
		textHex,
		preset,
		dadsTokens,
	});

	return new Color(keySurface.hex);
}

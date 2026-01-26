/**
 * Studio view runtime dependencies
 *
 * This indirection exists so tests can mock Studio dependencies without globally
 * mocking `./palette-preview` or `../utils/dads-snap`, which are also directly
 * tested in this repo.
 *
 * NOTE: Avoid `export { ... } from "./palette-preview"` here.
 * Bun can treat pure re-export modules as aliases, and mocking this module may end up
 * affecting the original module in other test files. Keeping an explicit wrapper
 * object makes the module boundary clear.
 */

import {
	adjustLightnessForContrast,
	findNearestDadsTokenCandidates,
	inferBaseChromaNameFromHex,
	matchesPreset,
	resolvePresetMinContrast,
	selectHueDistantColors,
	snapToNearestDadsToken,
} from "../utils/dads-snap";
import {
	createPalettePreview,
	createSeededRandom,
	mapPaletteToPreviewColors,
} from "./palette-preview";

export const studioViewDeps = {
	createPalettePreview,
	createSeededRandom,
	mapPaletteToPreviewColors,
	adjustLightnessForContrast,
	findNearestDadsTokenCandidates,
	inferBaseChromaNameFromHex,
	matchesPreset,
	resolvePresetMinContrast,
	selectHueDistantColors,
	snapToNearestDadsToken,
} as const;

/**
 * Studio view runtime dependencies
 *
 * This indirection exists so tests can mock Studio dependencies without globally
 * mocking `./palette-preview`, which is also directly tested in this repo.
 */

export {
	createPalettePreview,
	createSeededRandom,
	mapPaletteToPreviewColors,
} from "./palette-preview";

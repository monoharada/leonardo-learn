/**
 * パレットプレビュー（DADS HTML / 擬似サイト）
 *
 * @module @/ui/demo/views/palette-preview
 */

export { createSeededRandom } from "../utils/seeded-random";
export type { ColorMappingInput } from "./palette-preview.color-mapping";
export {
	getTextSafeColor,
	mapPaletteToPreviewColors,
} from "./palette-preview.color-mapping";
export {
	buildDadsPreviewMarkup,
	createPalettePreview,
} from "./palette-preview.render";
export type {
	PalettePreviewColors,
	PalettePreviewOptions,
	PreviewSection,
} from "./palette-preview.types";

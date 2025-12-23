/**
 * Tokens module
 * DADSトークンとブランドトークンの型定義およびID生成機能をエクスポート
 */

export {
	type EnrichWithCudMappingResult,
	enrichWithCudMapping,
} from "./cud-mapper";
export {
	clearTokenCache,
	type DadsColorScale,
	getAllDadsChromatic,
	getDadsColorsByHue,
	getDadsHueFromDisplayName,
	getHueOrder,
	getScaleOrder,
	loadDadsTokens,
} from "./dads-data-provider";
export {
	type DadsPrimitiveParseResult,
	parseDadsPrimitives,
} from "./dads-importer";
export {
	type BrandTokenIdOptions,
	generateBrandTokenId,
} from "./id-generator";

export {
	createTokenRegistry,
	resolveSemanticReference,
	type TokenRegistry,
} from "./semantic-resolver";
export {
	type BrandToken,
	type ColorToken,
	type DadsChromaScale,
	type DadsColorCategory,
	type DadsColorClassification,
	type DadsColorHue,
	type DadsNeutralScale,
	type DadsReference,
	type DadsToken,
	type DerivationType,
	isBrandToken,
	isDadsToken,
	type TokenSource,
} from "./types";

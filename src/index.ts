/**
 * leonardo-learn - OKLCH色空間を使用したカラーパレット生成ツール
 *
 * @packageDocumentation
 */

export * from "./accessibility/apca";
export * from "./accessibility/cvd-simulator";
export * from "./accessibility/distinguishability";
export * from "./accessibility/wcag2";
export * from "./core";
// CUD Components
export * from "./core/cud/anchor";
export * from "./core/cud/harmony-score";
export * from "./core/cud/optimizer";
export * from "./core/cud/service";
export * from "./core/cud/snapper";
export * from "./core/cud/zone";
export {
	type CSSExportOptions,
	type CSSExportResult,
	type CudCommentData,
	exportToCSS,
	formatCudComment,
} from "./core/export/css-exporter";
// Export Functions
export {
	type CudExportSummary,
	type CudMetadata,
	type CudValidationSummary,
	exportToJSON,
	generateCudValidationSummary,
	type JSONExportOptions,
	type JSONExportResult,
} from "./core/export/json-exporter";
// Harmony Types
export { HarmonyType } from "./core/harmony";
// Contrast Boundary (Task 11.4 E2E test support)
export {
	CONTRAST_THRESHOLD,
	type ColorItem,
	type ContrastBoundaryResult,
	calculateBoundaries,
} from "./core/semantic-role/contrast-boundary-calculator";
export type {
	PaletteInfo,
	SemanticRoleMapperService,
} from "./core/semantic-role/role-mapper";
// Semantic Role Components
export { createSemanticRoleMapper } from "./core/semantic-role/role-mapper";
export type { RoleCategory, SemanticRole } from "./core/semantic-role/types";
// DADS Tokens and Data Provider (for E2E test pages)
export {
	type DadsColorScale,
	getAllDadsChromatic,
	loadDadsTokens,
} from "./core/tokens/dads-data-provider";
export type { DadsToken } from "./core/tokens/types";
// UI Components
export { runColorSystemDemo } from "./ui/color-system-demo";
export {
	addCudBadgesToColors,
	type CancelButton,
	// Constants
	CUD_MODE_CONFIGS,
	CUD_MODE_DESCRIPTIONS,
	CUD_MODE_STORAGE_KEY,
	// Types
	type CudCompatibilityMode,
	type CudModeConfig,
	createCancelButton,
	// Functions - Badges
	createCudBadge,
	createCudModeSelector,
	createCudModeSelectorWithPersistence,
	createCudRangeGuide,
	createCudSubModeToggle,
	createDeltaEChangeBadge,
	createDiagnosticPanel,
	createModeBadge,
	// Functions - Progress UI
	createOptimizationController,
	createPaletteProcessor,
	createProgressIndicator,
	createProgressUI,
	createStrictComplianceBadge,
	createZoneBadge,
	getCudMatchInfo,
	// Functions - Mode Selector
	isCudCompatibilityMode,
	LONG_PROCESS_THRESHOLD_MS,
	loadCudMode,
	type ModeBadgeParams,
	type OptimizationController,
	type OptimizationProgress,
	type OptimizationProgressState,
	type PaletteProcessOptions,
	type PaletteProcessor,
	type PaletteProcessResult,
	type ProgressIndicator,
	type ProgressUI,
	// Functions - Palette Processing
	processPaletteWithCudMode,
	processPaletteWithMode,
	saveCudMode,
	showPaletteValidation,
	ZONE_BADGE_CONFIGS,
	type ZoneBadgeConfig,
	type ZoneInfo,
} from "./ui/cud-components";
export {
	type BoundaryPillConfig,
	createBoundaryPill,
	renderBoundaryPills,
} from "./ui/semantic-role/contrast-boundary-indicator";
// External Role Info Bar (Task 11.3 E2E test support)
export {
	createRoleBadge,
	createRoleInfoElement,
	ROLE_CATEGORY_COLORS,
	type RoleInfoItem,
	renderConnector,
	renderRoleInfoBar,
	renderUnresolvedRolesBar,
	type UnresolvedRoleItem,
} from "./ui/semantic-role/external-role-info-bar";
export {
	applyOverlay,
	mergeTooltipContent,
} from "./ui/semantic-role/semantic-role-overlay";
export * from "./utils";

// バージョン情報
export const VERSION = "0.1.0";

console.log(`leonardo-learn v${VERSION} - OKLCH Color Palette Generator`);

// Run demo if in browser environment
if (typeof document !== "undefined") {
	import("./ui/demo").then(({ runDemo }) => {
		runDemo();
	});
}

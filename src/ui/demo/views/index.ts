/**
 * ビューモジュールのre-export
 *
 * 全ビュー関数を一箇所からインポート可能にする。
 * 外部からのインポートを簡潔にするためのバレルファイル。
 *
 * @module @/ui/demo/views
 * Requirements: 2.1, 11.1
 */

export type { AccessibilityViewHelpers } from "./accessibility-view";
// accessibility-view
export {
	renderAccessibilityView,
	renderAdjacentShadesAnalysis,
	renderDistinguishabilityAnalysis,
} from "./accessibility-view";
export type { ManualViewCallbacks } from "./manual-view";
// manual-view (formerly shades-view)
export {
	renderDadsHueSection,
	renderManualView,
	renderPrimaryBrandSection,
} from "./manual-view";
export type { StudioViewCallbacks } from "./studio-view";
export { generateNewStudioPalette, renderStudioView } from "./studio-view";

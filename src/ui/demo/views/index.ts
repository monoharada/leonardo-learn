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
export type { HarmonyViewCallbacks } from "./harmony-view";
// harmony-view
export { renderHarmonyView } from "./harmony-view";
export type { PaletteViewCallbacks } from "./palette-view";
// palette-view
export { renderPaletteView } from "./palette-view";
export type { ShadesViewCallbacks } from "./shades-view";
// shades-view
export {
	renderBrandColorSection,
	renderDadsHueSection,
	renderShadesView,
} from "./shades-view";

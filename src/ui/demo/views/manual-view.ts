/**
 * マニュアル選択ビューモジュール
 *
 * Thin entrypoint that re-exports the manual view implementation.
 *
 * @module @/ui/demo/views/manual-view
 */

export {
	getSelectedApplyTarget,
	resetApplyTargetState,
	setSelectedApplyTarget,
} from "./manual-view.apply-target";
export type { ManualViewCallbacks } from "./manual-view.render";
export { renderManualView } from "./manual-view.render";
export {
	renderDadsHueSection,
	renderPrimaryBrandSection,
} from "./manual-view.sections";
export {
	applyColorToManualSelection,
	deleteAccentFromManualSelection,
	syncFromStudioPalettes,
} from "./manual-view.selection";

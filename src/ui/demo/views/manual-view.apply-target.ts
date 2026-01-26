import type { ManualApplyTarget } from "../types";

/**
 * 現在選択されている適用先（モジュールスコープ変数）
 *
 * 注: この変数はモジュールスコープで管理されている。
 * テスト時には必ず resetApplyTargetState() または setSelectedApplyTarget(null) で
 * リセットすること。
 */
let selectedApplyTarget: ManualApplyTarget | null = null;

/**
 * 選択されている適用先を取得する
 */
export function getSelectedApplyTarget(): ManualApplyTarget | null {
	return selectedApplyTarget;
}

/**
 * 選択されている適用先を設定する
 */
export function setSelectedApplyTarget(target: ManualApplyTarget | null): void {
	selectedApplyTarget = target;
}

/**
 * 適用先状態をリセットする（テスト用）
 *
 * テストのbeforeEach/afterEachで呼び出し、
 * テスト間の状態汚染を防ぐ。
 */
export function resetApplyTargetState(): void {
	selectedApplyTarget = null;
}

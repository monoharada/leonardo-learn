/**
 * 状態管理モジュール
 *
 * デモ機能のグローバル状態を管理するシングルトンモジュール。
 * 状態アクセス用のヘルパー関数を提供する。
 *
 * @module @/ui/demo/state
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { DEFAULT_STATE } from "./constants";
import type { DemoState, KeyColorWithStep, PaletteConfig } from "./types";

/**
 * デモ機能のグローバル状態（シングルトン）
 *
 * DEFAULT_STATEから初期化し、単一ソースを維持。
 * resetState()で同じDEFAULT_STATEにリセットされる。
 *
 * 既存のstate構造を完全に維持:
 * - palettes: パレット設定配列
 * - shadesPalettes: Shadesビュー用の全13色パレット
 * - activeId: 現在選択中のパレットID
 * - activeHarmonyIndex: 現在選択中のハーモニーインデックス（0 = Primary, 1+ = Derived）
 * - contrastIntensity: コントラスト強度
 * - lightnessDistribution: 明度分布
 * - viewMode: 現在のビューモード
 * - cvdSimulation: CVDシミュレーションタイプ
 * - selectedHarmonyConfig: 選択されたハーモニー設定
 * - cudMode: CUD対応モード
 */
export const state: DemoState = {
	palettes: [...DEFAULT_STATE.palettes],
	shadesPalettes: [...DEFAULT_STATE.shadesPalettes],
	activeId: DEFAULT_STATE.activeId,
	activeHarmonyIndex: DEFAULT_STATE.activeHarmonyIndex,
	contrastIntensity: DEFAULT_STATE.contrastIntensity,
	lightnessDistribution: DEFAULT_STATE.lightnessDistribution,
	viewMode: DEFAULT_STATE.viewMode,
	cvdSimulation: DEFAULT_STATE.cvdSimulation,
	selectedHarmonyConfig: DEFAULT_STATE.selectedHarmonyConfig,
	cudMode: DEFAULT_STATE.cudMode,
};

/**
 * 現在アクティブなパレットを取得する
 *
 * activeIdに一致するパレットを返す。
 * 一致するものがない場合は最初のパレットを返す。
 * パレットが空の場合はundefinedを返す。
 *
 * @returns アクティブなパレット、または最初のパレット、またはundefined
 */
export function getActivePalette(): PaletteConfig | undefined {
	const found = state.palettes.find((p) => p.id === state.activeId);
	return found || state.palettes[0];
}

/**
 * キーカラー入力をパースする
 *
 * 入力形式: "#hex" または "#hex@step" (例: "#b3e5fc@300")
 * ステップは50, 100, 200, ..., 1200のトークン番号
 *
 * @param input キーカラー入力文字列
 * @returns パース結果（color: HEX値, step?: ステップ番号）
 */
export function parseKeyColor(input: string): KeyColorWithStep {
	const parts = input.split("@");
	const color = parts[0] || "#000000";
	const stepStr = parts[1];
	const step = stepStr ? Number.parseInt(stepStr, 10) : undefined;
	return { color, step };
}

/**
 * 状態をデフォルト値にリセットする
 *
 * テスト間での状態リークを防止するために使用。
 * すべてのプロパティをDEFAULT_STATEの値にリセットする。
 */
export function resetState(): void {
	state.palettes = [...DEFAULT_STATE.palettes];
	state.shadesPalettes = [...DEFAULT_STATE.shadesPalettes];
	state.activeId = DEFAULT_STATE.activeId;
	state.activeHarmonyIndex = DEFAULT_STATE.activeHarmonyIndex;
	state.contrastIntensity = DEFAULT_STATE.contrastIntensity;
	state.lightnessDistribution = DEFAULT_STATE.lightnessDistribution;
	state.viewMode = DEFAULT_STATE.viewMode;
	state.cvdSimulation = DEFAULT_STATE.cvdSimulation;
	state.selectedHarmonyConfig = DEFAULT_STATE.selectedHarmonyConfig;
	state.cudMode = DEFAULT_STATE.cudMode;
}

/**
 * ハーモニー状態管理モジュール
 *
 * ハーモニー選択の状態管理を担当する。
 * - 選択中のハーモニータイプ
 * - ユーザーによる手動選択フラグ（セッション記憶）
 * - 全ハーモニーのプレビューデータ
 *
 * @module @/ui/demo/harmony-state-manager
 */

import type { HarmonyFilterType } from "@/core/accent/harmony-filter-calculator";

/**
 * 全8種類のハーモニータイプ
 */
export const ALL_HARMONY_TYPES: HarmonyFilterType[] = [
	"complementary",
	"triadic",
	"analogous",
	"split-complementary",
	"monochromatic",
	"shades",
	"compound",
	"square",
];

/**
 * ハーモニープレビューデータの型
 * 各ハーモニータイプに対応する色配列のマッピング
 */
export type HarmonyPreviewData = {
	[K in HarmonyFilterType]?: string[];
};

/**
 * ハーモニー状態管理インターフェース
 */
export interface HarmonyStateManager {
	/** 選択中のハーモニータイプを取得 */
	getSelectedHarmonyType(): HarmonyFilterType | null;

	/** ユーザーが手動選択したかどうか */
	hasUserSelectedHarmony(): boolean;

	/** ハーモニーを選択（ユーザーアクション） */
	selectHarmony(type: HarmonyFilterType): void;

	/** ハーモニーを取得（未選択時はランダム選択、ユーザー選択フラグは変更しない） */
	getOrSelectHarmony(): HarmonyFilterType;

	/** 全ハーモニーのプレビューデータを取得 */
	getHarmonyPreviews(): Map<HarmonyFilterType, string[]>;

	/** 全ハーモニーのプレビューデータを設定 */
	setHarmonyPreviews(data: HarmonyPreviewData): void;

	/** 特定ハーモニーのプレビュー色を取得 */
	getPreviewColors(type: HarmonyFilterType): string[] | undefined;

	/** 状態をリセット */
	reset(): void;
}

/**
 * ランダムにハーモニータイプを選択する
 *
 * @returns ランダムに選択されたハーモニータイプ
 */
export function getRandomHarmonyType(): HarmonyFilterType {
	const index = Math.floor(Math.random() * ALL_HARMONY_TYPES.length);
	const type = ALL_HARMONY_TYPES[index];
	if (!type) {
		return "complementary"; // フォールバック
	}
	return type;
}

/**
 * ハーモニー状態管理インスタンスを作成する
 *
 * @returns HarmonyStateManagerインスタンス
 */
export function createHarmonyStateManager(): HarmonyStateManager {
	// 内部状態
	let selectedHarmonyType: HarmonyFilterType | null = null;
	let userSelected = false;
	const harmonyPreviews = new Map<HarmonyFilterType, string[]>();

	return {
		getSelectedHarmonyType(): HarmonyFilterType | null {
			return selectedHarmonyType;
		},

		hasUserSelectedHarmony(): boolean {
			return userSelected;
		},

		selectHarmony(type: HarmonyFilterType): void {
			selectedHarmonyType = type;
			userSelected = true;
		},

		getOrSelectHarmony(): HarmonyFilterType {
			if (selectedHarmonyType !== null) {
				return selectedHarmonyType;
			}
			// 未選択時はランダム選択（ただしユーザー選択フラグは立てない）
			selectedHarmonyType = getRandomHarmonyType();
			return selectedHarmonyType;
		},

		getHarmonyPreviews(): Map<HarmonyFilterType, string[]> {
			return harmonyPreviews;
		},

		setHarmonyPreviews(data: HarmonyPreviewData): void {
			harmonyPreviews.clear();
			for (const type of ALL_HARMONY_TYPES) {
				const colors = data[type];
				if (colors !== undefined) {
					harmonyPreviews.set(type, colors);
				}
			}
		},

		getPreviewColors(type: HarmonyFilterType): string[] | undefined {
			return harmonyPreviews.get(type);
		},

		reset(): void {
			selectedHarmonyType = null;
			userSelected = false;
			harmonyPreviews.clear();
		},
	};
}

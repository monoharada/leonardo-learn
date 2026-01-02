/**
 * AccentSelectionErrorState
 * エラー時のUI状態管理
 *
 * Task 2.3: エラー時のUI状態管理
 * Requirements: 7.2
 *
 * エラー発生時の状態管理:
 * - BRAND_COLOR_NOT_SET: 自動選定・手動選択ともに無効化
 * - DADS_LOAD_FAILED: 自動選定・手動選択ともに無効化
 * - SCORE_CALCULATION_FAILED: 自動選定のみ無効化、手動選択は継続可能
 */

import type { AccentSelectionError } from "./accent-candidate-service";

/**
 * エラー状態データ
 */
export interface AccentErrorStateData {
	/** 自動選定が無効化されているか */
	autoSelectionDisabled: boolean;
	/** 手動選択が無効化されているか */
	manualSelectionDisabled: boolean;
	/** 現在のエラーコード */
	errorCode: AccentSelectionError["code"] | null;
	/** 現在のエラーメッセージ */
	errorMessage: string | null;
	/** スコア内訳を表示できるか */
	showScoreBreakdown: boolean;
}

/**
 * グローバルエラー状態（シングルトン）
 */
let globalErrorState: AccentErrorStateData = {
	autoSelectionDisabled: false,
	manualSelectionDisabled: false,
	errorCode: null,
	errorMessage: null,
	showScoreBreakdown: true,
};

/**
 * 初期状態を作成する
 */
export function createInitialErrorState(): AccentErrorStateData {
	return {
		autoSelectionDisabled: false,
		manualSelectionDisabled: false,
		errorCode: null,
		errorMessage: null,
		showScoreBreakdown: true,
	};
}

/**
 * エラー状態を設定する
 *
 * エラーコードに応じて無効化フラグを設定:
 * - BRAND_COLOR_NOT_SET: 両方無効化（スコア計算にブランドカラーが必須）
 * - DADS_LOAD_FAILED: 両方無効化（候補データが存在しない）
 * - SCORE_CALCULATION_FAILED: 自動選定のみ無効化（手動選択は可能だがスコア非表示）
 *
 * @param error エラー情報
 * @returns 更新後のエラー状態
 */
export function setErrorState(
	error: AccentSelectionError,
): AccentErrorStateData {
	switch (error.code) {
		case "BRAND_COLOR_NOT_SET":
		case "DADS_LOAD_FAILED":
			// 両方無効化
			globalErrorState = {
				autoSelectionDisabled: true,
				manualSelectionDisabled: true,
				errorCode: error.code,
				errorMessage: error.message,
				showScoreBreakdown: false,
			};
			break;

		case "SCORE_CALCULATION_FAILED":
			// 自動選定のみ無効化、手動選択は継続可能
			globalErrorState = {
				autoSelectionDisabled: true,
				manualSelectionDisabled: false,
				errorCode: error.code,
				errorMessage: error.message,
				showScoreBreakdown: false,
			};
			break;
	}

	return { ...globalErrorState };
}

/**
 * エラー状態をクリアする
 *
 * @returns クリア後の初期状態
 */
export function clearErrorState(): AccentErrorStateData {
	globalErrorState = createInitialErrorState();
	return { ...globalErrorState };
}

/**
 * 現在のエラー状態を取得する
 */
export function getErrorState(): AccentErrorStateData {
	return { ...globalErrorState };
}

/**
 * AccentSelectionErrorState クラス
 * エラー状態管理のオブジェクト指向インターフェース
 */
export class AccentSelectionErrorState {
	private state: AccentErrorStateData;

	constructor() {
		this.state = createInitialErrorState();
	}

	/**
	 * 現在の状態を取得
	 */
	getState(): AccentErrorStateData {
		return { ...this.state };
	}

	/**
	 * エラーを設定
	 */
	setError(error: AccentSelectionError): void {
		switch (error.code) {
			case "BRAND_COLOR_NOT_SET":
			case "DADS_LOAD_FAILED":
				this.state = {
					autoSelectionDisabled: true,
					manualSelectionDisabled: true,
					errorCode: error.code,
					errorMessage: error.message,
					showScoreBreakdown: false,
				};
				break;

			case "SCORE_CALCULATION_FAILED":
				this.state = {
					autoSelectionDisabled: true,
					manualSelectionDisabled: false,
					errorCode: error.code,
					errorMessage: error.message,
					showScoreBreakdown: false,
				};
				break;
		}
	}

	/**
	 * エラー状態をクリア
	 */
	clear(): void {
		this.state = createInitialErrorState();
	}

	/**
	 * 自動選定が無効かどうか
	 */
	isAutoSelectionDisabled(): boolean {
		return this.state.autoSelectionDisabled;
	}

	/**
	 * 手動選択が無効かどうか
	 */
	isManualSelectionDisabled(): boolean {
		return this.state.manualSelectionDisabled;
	}

	/**
	 * スコア内訳を表示できるか
	 */
	canShowScoreBreakdown(): boolean {
		return this.state.showScoreBreakdown;
	}

	/**
	 * エラーメッセージを取得
	 */
	getErrorMessage(): string | null {
		return this.state.errorMessage;
	}

	/**
	 * エラーコードを取得
	 */
	getErrorCode(): AccentSelectionError["code"] | null {
		return this.state.errorCode;
	}
}

/**
 * グローバルエラー状態マネージャー（シングルトン）
 */
export const globalAccentErrorState = new AccentSelectionErrorState();

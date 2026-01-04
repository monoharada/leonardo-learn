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
 *
 * 注: グローバル状態は単一ソースに統一。
 * 関数API（setErrorState等）とクラスAPI（AccentSelectionErrorState）は
 * 同じglobalErrorStateを参照する。
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
 * グローバルエラー状態（シングルトン - 単一ソース）
 *
 * 注意: このモジュール変数はシングルトンパターンとして機能します。
 * - 関数API（setErrorState等）とクラスAPI（AccentSelectionErrorState）が
 *   同一の状態を参照することで一貫性を保証
 * - アクセント選定機能は1回に1パレットのみを扱う前提
 * - テスト時は clearErrorState() でリセットしてください
 *
 * @internal
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
 * エラーコードに応じたエラー状態を計算する（内部ヘルパー）
 */
function computeErrorState(error: AccentSelectionError): AccentErrorStateData {
	switch (error.code) {
		case "BRAND_COLOR_NOT_SET":
		case "DADS_LOAD_FAILED":
			// 両方無効化
			return {
				autoSelectionDisabled: true,
				manualSelectionDisabled: true,
				errorCode: error.code,
				errorMessage: error.message,
				showScoreBreakdown: false,
			};

		case "SCORE_CALCULATION_FAILED":
			// 自動選定のみ無効化、手動選択は継続可能
			return {
				autoSelectionDisabled: true,
				manualSelectionDisabled: false,
				errorCode: error.code,
				errorMessage: error.message,
				showScoreBreakdown: false,
			};

		default:
			// 未知のエラーコードは両方無効化
			return {
				autoSelectionDisabled: true,
				manualSelectionDisabled: true,
				errorCode: error.code,
				errorMessage: error.message,
				showScoreBreakdown: false,
			};
	}
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
	globalErrorState = computeErrorState(error);
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
 *
 * 注: このクラスはグローバルglobalErrorStateを参照するため、
 * インスタンスを複数作成しても同じ状態を共有する。
 * これにより、関数APIとクラスAPIの状態不整合を防ぐ。
 */
export class AccentSelectionErrorState {
	/**
	 * 現在の状態を取得
	 * グローバル状態を参照
	 */
	getState(): AccentErrorStateData {
		return { ...globalErrorState };
	}

	/**
	 * エラーを設定
	 * グローバル状態を更新
	 */
	setError(error: AccentSelectionError): void {
		globalErrorState = computeErrorState(error);
	}

	/**
	 * エラー状態をクリア
	 * グローバル状態をリセット
	 */
	clear(): void {
		globalErrorState = createInitialErrorState();
	}

	/**
	 * 自動選定が無効かどうか
	 */
	isAutoSelectionDisabled(): boolean {
		return globalErrorState.autoSelectionDisabled;
	}

	/**
	 * 手動選択が無効かどうか
	 */
	isManualSelectionDisabled(): boolean {
		return globalErrorState.manualSelectionDisabled;
	}

	/**
	 * スコア内訳を表示できるか
	 */
	canShowScoreBreakdown(): boolean {
		return globalErrorState.showScoreBreakdown;
	}

	/**
	 * エラーメッセージを取得
	 */
	getErrorMessage(): string | null {
		return globalErrorState.errorMessage;
	}

	/**
	 * エラーコードを取得
	 */
	getErrorCode(): AccentSelectionError["code"] | null {
		return globalErrorState.errorCode;
	}
}

/**
 * グローバルエラー状態マネージャー（シングルトン）
 * 関数API（setErrorState等）と同じglobalErrorStateを参照
 */
export const globalAccentErrorState = new AccentSelectionErrorState();

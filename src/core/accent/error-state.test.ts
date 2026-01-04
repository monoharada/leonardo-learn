/**
 * AccentSelectionErrorState テスト
 * Task 2.3: エラー時のUI状態管理
 *
 * Requirements: 7.2
 */

import { beforeEach, describe, expect, it } from "bun:test";
import {
	AccentSelectionErrorState,
	clearErrorState,
	createInitialErrorState,
	getErrorState,
	globalAccentErrorState,
	setErrorState,
} from "./error-state";

describe("AccentSelectionErrorState (Task 2.3)", () => {
	beforeEach(() => {
		// エラー状態をリセット
		clearErrorState();
	});

	describe("createInitialErrorState", () => {
		it("初期状態を作成できる", () => {
			const state = createInitialErrorState();

			expect(state.autoSelectionDisabled).toBe(false);
			expect(state.manualSelectionDisabled).toBe(false);
			expect(state.errorCode).toBeNull();
			expect(state.errorMessage).toBeNull();
			expect(state.showScoreBreakdown).toBe(true);
		});
	});

	describe("setErrorState", () => {
		it("BRAND_COLOR_NOT_SET時に自動選定・手動選択を両方無効化", () => {
			const state = setErrorState({
				code: "BRAND_COLOR_NOT_SET",
				message: "ブランドカラーを設定してください",
			});

			expect(state.autoSelectionDisabled).toBe(true);
			expect(state.manualSelectionDisabled).toBe(true);
			expect(state.errorCode).toBe("BRAND_COLOR_NOT_SET");
			expect(state.errorMessage).toBe("ブランドカラーを設定してください");
			expect(state.showScoreBreakdown).toBe(false);
		});

		it("DADS_LOAD_FAILED時に自動選定・手動選択を両方無効化", () => {
			const state = setErrorState({
				code: "DADS_LOAD_FAILED",
				message: "DADSデータの読み込みに失敗しました",
			});

			expect(state.autoSelectionDisabled).toBe(true);
			expect(state.manualSelectionDisabled).toBe(true);
			expect(state.errorCode).toBe("DADS_LOAD_FAILED");
			expect(state.errorMessage).toBe("DADSデータの読み込みに失敗しました");
			expect(state.showScoreBreakdown).toBe(false);
		});

		it("SCORE_CALCULATION_FAILED時に自動選定のみ無効化、手動選択は継続可能", () => {
			const state = setErrorState({
				code: "SCORE_CALCULATION_FAILED",
				message: "スコア計算中にエラーが発生しました",
			});

			expect(state.autoSelectionDisabled).toBe(true);
			expect(state.manualSelectionDisabled).toBe(false);
			expect(state.errorCode).toBe("SCORE_CALCULATION_FAILED");
			expect(state.errorMessage).toBe("スコア計算中にエラーが発生しました");
			// 手動選択時はスコア表示なし
			expect(state.showScoreBreakdown).toBe(false);
		});
	});

	describe("clearErrorState", () => {
		it("エラー状態をクリアして初期状態に戻す", () => {
			// エラー状態を設定
			setErrorState({
				code: "BRAND_COLOR_NOT_SET",
				message: "テストエラー",
			});

			// クリア
			const state = clearErrorState();

			expect(state.autoSelectionDisabled).toBe(false);
			expect(state.manualSelectionDisabled).toBe(false);
			expect(state.errorCode).toBeNull();
			expect(state.errorMessage).toBeNull();
			expect(state.showScoreBreakdown).toBe(true);
		});
	});

	describe("AccentSelectionErrorState class", () => {
		it("getState()で現在の状態を取得できる", () => {
			const manager = new AccentSelectionErrorState();
			const state = manager.getState();

			expect(state.autoSelectionDisabled).toBe(false);
		});

		it("setError()でエラーを設定できる", () => {
			const manager = new AccentSelectionErrorState();
			manager.setError({
				code: "SCORE_CALCULATION_FAILED",
				message: "エラー",
			});

			const state = manager.getState();
			expect(state.autoSelectionDisabled).toBe(true);
			expect(state.manualSelectionDisabled).toBe(false);
		});

		it("clear()でエラーをクリアできる", () => {
			const manager = new AccentSelectionErrorState();
			manager.setError({
				code: "BRAND_COLOR_NOT_SET",
				message: "エラー",
			});
			manager.clear();

			const state = manager.getState();
			expect(state.autoSelectionDisabled).toBe(false);
		});

		it("isAutoSelectionDisabled()でautoSelectionDisabledを確認できる", () => {
			const manager = new AccentSelectionErrorState();
			expect(manager.isAutoSelectionDisabled()).toBe(false);

			manager.setError({
				code: "SCORE_CALCULATION_FAILED",
				message: "エラー",
			});
			expect(manager.isAutoSelectionDisabled()).toBe(true);
		});

		it("isManualSelectionDisabled()でmanualSelectionDisabledを確認できる", () => {
			const manager = new AccentSelectionErrorState();
			expect(manager.isManualSelectionDisabled()).toBe(false);

			// SCORE_CALCULATION_FAILEDでは手動選択は有効
			manager.setError({
				code: "SCORE_CALCULATION_FAILED",
				message: "エラー",
			});
			expect(manager.isManualSelectionDisabled()).toBe(false);

			// BRAND_COLOR_NOT_SETでは手動選択も無効
			manager.setError({
				code: "BRAND_COLOR_NOT_SET",
				message: "エラー",
			});
			expect(manager.isManualSelectionDisabled()).toBe(true);
		});

		it("canShowScoreBreakdown()でスコア表示可否を確認できる", () => {
			const manager = new AccentSelectionErrorState();
			expect(manager.canShowScoreBreakdown()).toBe(true);

			manager.setError({
				code: "SCORE_CALCULATION_FAILED",
				message: "エラー",
			});
			expect(manager.canShowScoreBreakdown()).toBe(false);
		});
	});

	describe("グローバル状態の統一 (Codex修正)", () => {
		it("関数APIとクラスAPIは同じグローバル状態を共有", () => {
			// 関数APIでエラーを設定
			setErrorState({
				code: "BRAND_COLOR_NOT_SET",
				message: "テスト",
			});

			// クラスAPIで状態を取得 - 同じ状態を参照
			const classState = globalAccentErrorState.getState();
			expect(classState.errorCode).toBe("BRAND_COLOR_NOT_SET");
			expect(classState.autoSelectionDisabled).toBe(true);

			// 関数APIで状態を取得
			const funcState = getErrorState();
			expect(funcState.errorCode).toBe("BRAND_COLOR_NOT_SET");

			// クリア
			clearErrorState();

			// 両方のAPIで状態がクリアされていることを確認
			expect(globalAccentErrorState.getState().errorCode).toBeNull();
			expect(getErrorState().errorCode).toBeNull();
		});

		it("クラスAPIで設定した状態は関数APIでも取得できる", () => {
			// クラスAPIでエラーを設定
			globalAccentErrorState.setError({
				code: "DADS_LOAD_FAILED",
				message: "テスト",
			});

			// 関数APIで取得
			const state = getErrorState();
			expect(state.errorCode).toBe("DADS_LOAD_FAILED");
			expect(state.manualSelectionDisabled).toBe(true);

			// クラスAPIでクリア
			globalAccentErrorState.clear();

			// 関数APIで確認
			expect(getErrorState().errorCode).toBeNull();
		});

		it("複数のクラスインスタンスは同じグローバル状態を共有", () => {
			const instance1 = new AccentSelectionErrorState();
			const instance2 = new AccentSelectionErrorState();

			// instance1でエラーを設定
			instance1.setError({
				code: "SCORE_CALCULATION_FAILED",
				message: "テスト",
			});

			// instance2でも同じ状態が見える
			expect(instance2.isAutoSelectionDisabled()).toBe(true);
			expect(instance2.getErrorCode()).toBe("SCORE_CALCULATION_FAILED");

			// instance2でクリア
			instance2.clear();

			// instance1でも状態がクリアされている
			expect(instance1.isAutoSelectionDisabled()).toBe(false);
		});
	});
});

/**
 * AccentSelectionErrorState テスト
 * Task 2.3: エラー時のUI状態管理
 *
 * Requirements: 7.2
 */

import { beforeEach, describe, expect, it } from "bun:test";
import {
	type AccentErrorStateData,
	AccentSelectionErrorState,
	clearErrorState,
	createInitialErrorState,
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
});

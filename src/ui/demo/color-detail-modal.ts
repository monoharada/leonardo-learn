/**
 * 色詳細モーダルモジュール
 *
 * 色詳細モーダルの表示とインタラクションを管理する。
 * AbortControllerによるイベントリスナーのクリーンアップ基盤を提供。
 *
 * Task 3.4a: 基本構造（モーダル開閉、AbortController基盤）
 * Task 3.4b: スクラバー機能
 * Task 3.4c: 色同期とreadOnlyモード（予定）
 *
 * @module @/ui/demo/color-detail-modal
 * Requirements: 4.1, 4.2, 4.3
 */

import {
	createAbortController,
	getLastAbortController,
} from "./color-detail-modal/abort-controller";
import { populateApplyTargetOptions } from "./color-detail-modal/apply-target-options";
import {
	calculateContrastInfo,
	calculateTokenInfo,
	createUpdateDetailHandler,
	setupPaletteNameEditing,
	syncPalette,
	updateContrastCard,
} from "./color-detail-modal/detail-sync";
import {
	calculateHandlePosition,
	calculateHueDifference,
	calculateHueFromPosition,
	calculateHueRange,
	createScrubberHandlers,
	drawScrubber,
	normalizeHue,
	resizeScrubber,
	setupScrubberEventListeners,
} from "./color-detail-modal/scrubber";
import { syncModalOpenState } from "./modal-scroll-lock";
import { state } from "./state";
import type { ColorDetailModalOptions, ManualApplyTarget } from "./types";
import { applyColorToManualSelection } from "./views/manual-view";

/**
 * 色詳細モーダルを開く
 *
 * @param options - モーダル表示オプション
 * @param onRenderMain - メインビュー再描画コールバック（オプション）
 */
export function openColorDetailModal(
	options: ColorDetailModalOptions,
	onRenderMain?: () => void,
): void {
	const {
		stepColor,
		keyColor,
		index,
		fixedScale,
		paletteInfo,
		readOnly = false,
		originalHex,
		showApplySection = false,
		onApply,
		preSelectedTarget,
	} = options;

	// ダイアログ要素を取得
	const dialog = document.getElementById(
		"color-detail-dialog",
	) as HTMLDialogElement;
	if (!dialog) return;

	// 適用セクションの表示/非表示を設定
	const applySection = document.getElementById("apply-section");
	const applySelect = document.getElementById(
		"apply-target-select",
	) as HTMLSelectElement | null;
	const applyBtn = document.getElementById(
		"apply-btn",
	) as HTMLButtonElement | null;

	if (applySection) {
		applySection.style.display = showApplySection ? "flex" : "none";
	}

	// プルダウンのオプションを動的に生成（連続選択制約を適用）
	if (applySelect) {
		populateApplyTargetOptions(
			applySelect,
			state.manualColorSelection,
			preSelectedTarget,
		);
	}

	// AbortControllerを作成（イベントリスナーのクリーンアップ用）
	// 注: cloneNodeパターンの代わりにAbortControllerを使用
	// ダイアログクローズ時にabort()が呼ばれ、全てのイベントリスナーが自動的に削除される
	const abortController = createAbortController();

	// Applyボタンの一時フィードバックはclose/連打で競合しないように管理する
	let applyFeedbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
	const resetApplyButtonFeedback = (): void => {
		if (!applyBtn) return;

		if (applyFeedbackTimeoutId !== null) {
			clearTimeout(applyFeedbackTimeoutId);
			applyFeedbackTimeoutId = null;
		}

		applyBtn.classList.remove("applied");
		const originalHtml = applyBtn.dataset.originalHtml ?? applyBtn.innerHTML;
		applyBtn.dataset.originalHtml = originalHtml;
		applyBtn.innerHTML = originalHtml;
	};

	resetApplyButtonFeedback();
	abortController.signal.addEventListener("abort", resetApplyButtonFeedback, {
		once: true,
	});

	// 適用ボタンのイベントハンドラを設定
	if (showApplySection && applyBtn && applySelect) {
		applyBtn.addEventListener(
			"click",
			() => {
				const target = applySelect.value as ManualApplyTarget | "";
				if (!target) {
					return; // 選択されていない場合は何もしない
				}

				// originalHexがあれば使用（DADS token hexとの完全一致を保証）
				// stepColor.toHex()は色空間変換で微妙に異なる値になる可能性がある
				const hex = originalHex ?? stepColor.toHex();
				applyColorToManualSelection(target, hex);

				// 成功フィードバックを表示
				resetApplyButtonFeedback();
				applyBtn.textContent = "適用完了";
				applyBtn.classList.add("applied");

				applyFeedbackTimeoutId = setTimeout(() => {
					if (abortController.signal.aborted) {
						return;
					}
					resetApplyButtonFeedback();
				}, 1500);

				// コールバックを呼び出してツールバーを再描画
				if (onApply) {
					onApply();
				}

				// ドロップダウンオプションを更新（状態が変わったので連続選択制約を再適用）
				populateApplyTargetOptions(
					applySelect,
					state.manualColorSelection,
					target, // 選択した値を維持
				);
			},
			{ signal: abortController.signal },
		);
	}

	// スクラバーキャンバスを取得
	const scrubberCanvas = document.getElementById(
		"tuner-scrubber",
	) as HTMLCanvasElement | null;

	// 現在の色を追跡
	let currentColor = stepColor;

	// ダイアログクローズ時にAbortControllerをabort
	dialog.addEventListener(
		"close",
		() => {
			abortController.abort();
			syncModalOpenState();
		},
		{ once: true },
	);

	// Task 3.4c: updateDetailハンドラを作成
	const updateDetailHandler = createUpdateDetailHandler({
		fixedScale,
		paletteInfo,
		readOnly,
		keyColor,
		drawScrubber: () => drawScrubber(scrubberCanvas, keyColor, currentColor),
		getCurrentColor: () => currentColor,
		setCurrentColor: (color) => {
			currentColor = color;
		},
		onRenderMain: onRenderMain ?? (() => {}),
	});

	// スクラバーハンドラを作成（Task 3.4c: updateDetail統合）
	const scrubberHandlers = createScrubberHandlers({
		keyColor,
		currentColor,
		readOnly,
		onColorChange: (newColor) => {
			currentColor = newColor;
			updateDetailHandler.updateDetail(newColor, -1);
		},
	});

	// スクラバーのイベントリスナーを設定
	if (scrubberCanvas) {
		setupScrubberEventListeners(
			scrubberCanvas,
			scrubberHandlers,
			keyColor,
			abortController.signal,
			() => () => drawScrubber(scrubberCanvas, keyColor, currentColor),
		);
	}

	// readOnlyモードの場合はスクラバーを非表示
	const scrubberContainer = scrubberCanvas?.parentElement;
	if (scrubberContainer && readOnly) {
		scrubberContainer.style.display = "none";
	} else if (scrubberContainer) {
		scrubberContainer.style.display = "";
	}

	// パレット名編集UIをセットアップ
	setupPaletteNameEditing(
		paletteInfo,
		onRenderMain ?? (() => {}),
		abortController.signal,
	);

	// モーダルを表示
	dialog.showModal();
	syncModalOpenState();

	// モーダル表示後に初期表示を設定
	requestAnimationFrame(() => {
		resizeScrubber(scrubberCanvas, keyColor, currentColor);
		// Task 3.4c: 初期選択インデックスを設定してからupdateDetailを呼び出す
		// これによりmini-scaleのハイライトが正しく表示される
		updateDetailHandler.setSelectedScaleIndex(index);
		updateDetailHandler.updateDetail(stepColor, index, originalHex);
	});
}

/**
 * テスト用ヘルパー
 * 内部状態へのアクセスを提供
 */
export const _testHelpers = {
	createAbortController,
	getLastAbortController,
	// Task 3.4b: スクラバー関連のテスト用ヘルパー
	drawScrubber,
	createScrubberHandlers,
	resizeScrubber,
	setupScrubberEventListeners,
	normalizeHue,
	calculateHueDifference,
	calculateHueRange,
	calculateHandlePosition,
	calculateHueFromPosition,
	// Task 3.4c: 色同期・詳細表示関連のテスト用ヘルパー
	calculateTokenInfo,
	calculateContrastInfo,
	syncPalette,
	createUpdateDetailHandler,
	updateContrastCard,
};

/**
 * ナビゲーションモジュール
 *
 * ビュー切替制御とナビゲーションボタン管理を担当する。
 * スクリーンリーダー通知（announceViewChange）機能を含む。
 *
 * @module @/ui/demo/navigation
 * Requirements: 8.1, 8.2, 8.3
 */

import { state } from "./state";
import type { ViewMode } from "./types";

/** ナビゲーション要素の型定義（モジュール内部用） */
interface NavigationElements {
	appEl: HTMLElement;
	viewManualBtn: HTMLElement | null;
	viewStudioBtn: HTMLElement | null;
}

/**
 * ビュー名のマッピング（日本語表示用）
 */
const VIEW_NAMES: Record<ViewMode, string> = {
	studio: "スタジオ",
	manual: "マニュアル選択",
};

/** ボタンのアクティブ状態を設定する */
function setButtonActive(btn: HTMLElement, isActive: boolean): void {
	btn.dataset.active = String(isActive);
	btn.setAttribute("aria-pressed", String(isActive));
}

/** DOM要素からナビゲーション要素を取得する。必須要素がない場合はnullを返す。 */
function getNavigationElements(): NavigationElements | null {
	const appEl = document.getElementById("app");
	if (!appEl) return null;

	return {
		appEl,
		viewManualBtn: document.getElementById("view-manual"),
		viewStudioBtn: document.getElementById("view-studio"),
	};
}

/** スクリーンリーダーにビュー変更を通知する */
export function announceViewChange(viewName: string): void {
	const liveRegionEl = document.getElementById("live-region");
	if (liveRegionEl) {
		liveRegionEl.textContent = `${viewName}ビューに切り替えました`;
	}
}

/**
 * ビューを切り替える
 *
 * 状態更新、表示切替、ナビゲーションボタン更新、
 * スクリーンリーダー通知、renderMainコールバック呼び出しを行う。
 */
export function updateViewButtons(
	mode: ViewMode,
	onRenderMain: () => void,
): void {
	const elements = getNavigationElements();
	if (!elements) return;

	state.viewMode = mode;

	// アプリコンテナを表示
	elements.appEl.hidden = false;

	// ナビゲーションボタンの状態を更新
	const buttonsByMode: Record<ViewMode, HTMLElement | null> = {
		studio: elements.viewStudioBtn,
		manual: elements.viewManualBtn,
	};

	for (const [viewMode, btn] of Object.entries(buttonsByMode)) {
		if (btn) setButtonActive(btn, viewMode === mode);
	}

	// スタジオ/マニュアルビューではヘッダーにフロストガラス効果を適用
	document.body.classList.toggle("is-studio-view", mode === "studio");
	document.body.classList.toggle("is-manual-view", mode === "manual");

	announceViewChange(VIEW_NAMES[mode]);
	onRenderMain();

	// ページトップにスクロール
	const mainContent = document.getElementById("main-content");
	if (mainContent) {
		mainContent.scrollTop = 0;
	}
	window.scrollTo({ top: 0, behavior: "instant" });
}

/** ナビゲーションを初期化する。各ボタンにクリックハンドラを設定。 */
export function setupNavigation(onRenderMain: () => void): void {
	const elements = getNavigationElements();
	if (!elements) return;

	const buttonsByMode: ReadonlyArray<[ViewMode, HTMLElement | null]> = [
		["studio", elements.viewStudioBtn],
		["manual", elements.viewManualBtn],
	];

	for (const [mode, button] of buttonsByMode) {
		if (button) button.onclick = () => updateViewButtons(mode, onRenderMain);
	}
}

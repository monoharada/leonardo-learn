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
import { cleanupHarmonyViewBackground } from "./views/harmony-view";

/**
 * ナビゲーション要素の型定義（モジュール内部用）
 */
interface NavigationElements {
	/** ハーモニービューコンテナ（必須） */
	harmonyViewEl: HTMLElement;
	/** メインアプリコンテナ（必須） */
	appEl: HTMLElement;
	/** ハーモニービューボタン */
	viewHarmonyBtn: HTMLElement | null;
	/** パレットビューボタン */
	viewPaletteBtn: HTMLElement | null;
	/** シェードビューボタン */
	viewShadesBtn: HTMLElement | null;
	/** アクセシビリティビューボタン */
	viewAccessibilityBtn: HTMLElement | null;
	/** スタジオビューボタン */
	viewStudioBtn: HTMLElement | null;
	/** スクリーンリーダー用ライブリージョン */
	liveRegionEl: HTMLElement | null;
}

/**
 * ビュー名のマッピング（日本語表示用）
 */
const VIEW_NAMES: Record<ViewMode, string> = {
	harmony: "ハーモニー",
	palette: "パレット",
	shades: "シェード",
	accessibility: "アクセシビリティ",
	studio: "スタジオ",
};

/**
 * ボタンのアクティブ状態を設定する（モジュール内部用）
 *
 * style-constantsへの依存を避けるための最小実装。
 * data-active属性とaria-pressed属性を更新する。
 *
 * @param btn 対象のボタン要素
 * @param isActive アクティブ状態
 */
function setButtonActive(btn: HTMLElement, isActive: boolean): void {
	btn.dataset.active = String(isActive);
	btn.setAttribute("aria-pressed", String(isActive));
}

/**
 * DOM要素からナビゲーション要素を取得する（モジュール内部用）
 *
 * 必須要素が存在しない場合はnullを返す。
 *
 * @returns ナビゲーション要素オブジェクト、または必須要素がない場合はnull
 */
function getNavigationElements(): NavigationElements | null {
	const harmonyViewEl = document.getElementById("harmony-view");
	const appEl = document.getElementById("app");

	// 必須要素のガード
	if (!harmonyViewEl || !appEl) {
		return null;
	}

	return {
		harmonyViewEl,
		appEl,
		viewHarmonyBtn: document.getElementById("view-harmony"),
		viewPaletteBtn: document.getElementById("view-palette"),
		viewShadesBtn: document.getElementById("view-shades"),
		viewAccessibilityBtn: document.getElementById("view-accessibility"),
		viewStudioBtn: document.getElementById("view-studio"),
		liveRegionEl: document.getElementById("live-region"),
	};
}

/**
 * スクリーンリーダーにビュー変更を通知する
 *
 * ライブリージョン要素（#live-region）のテキストを更新し、
 * スクリーンリーダーに変更を通知する。
 *
 * @param viewName 通知するビュー名（日本語）
 */
export function announceViewChange(viewName: string): void {
	const liveRegionEl = document.getElementById("live-region");
	if (liveRegionEl) {
		liveRegionEl.textContent = `${viewName}ビューに切り替えました`;
	}
}

/**
 * ビューを切り替える
 *
 * - state.viewModeを更新
 * - ハーモニービューと詳細ビューの表示切替
 * - ナビゲーションボタンのアクティブ状態を更新
 * - CVDコントロールの表示/非表示を制御
 * - スクリーンリーダーにビュー変更を通知
 * - renderMainコールバックを呼び出し
 * - ページトップにスクロール
 *
 * @param mode 切り替え先のビューモード
 * @param onRenderMain レンダリングコールバック（index.tsから渡される）
 */
export function updateViewButtons(
	mode: ViewMode,
	onRenderMain: () => void,
): void {
	// ナビゲーション要素を取得（必須要素のガード）
	const elements = getNavigationElements();
	if (!elements) {
		// 必須要素がない場合は処理を中断
		return;
	}

	// harmony-viewから離れる場合は背景色をリセット
	if (state.viewMode === "harmony" && mode !== "harmony") {
		cleanupHarmonyViewBackground();
	}

	// 状態を更新
	state.viewMode = mode;

	// ハーモニービューと詳細ビューの表示切替
	elements.harmonyViewEl.hidden = mode !== "harmony";
	elements.appEl.hidden = mode === "harmony";

	// すべてのナビゲーションボタンの状態をリセット
	const navButtons = [
		elements.viewHarmonyBtn,
		elements.viewStudioBtn,
		elements.viewPaletteBtn,
		elements.viewShadesBtn,
		elements.viewAccessibilityBtn,
	].filter((btn): btn is HTMLElement => btn !== null);

	for (const btn of navButtons) {
		setButtonActive(btn, false);
	}

	// アクティブなボタンを設定
	const activeBtnByMode: Record<ViewMode, HTMLElement | null> = {
		harmony: elements.viewHarmonyBtn,
		studio: elements.viewStudioBtn,
		palette: elements.viewPaletteBtn,
		shades: elements.viewShadesBtn,
		accessibility: elements.viewAccessibilityBtn,
	};
	const activeBtn = activeBtnByMode[mode];

	if (activeBtn) {
		setButtonActive(activeBtn, true);
	}

	// アクセシビリティ画面ではCVDコントロールを非表示
	// （画面内で色覚シミュレーションを行うため）
	const cvdControls = document.getElementById("cvd-controls");
	if (cvdControls) {
		cvdControls.style.display = mode === "accessibility" ? "none" : "flex";
	}

	// ビュー名の通知（スクリーンリーダー向け）
	announceViewChange(VIEW_NAMES[mode]);

	// renderMainコールバックを呼び出し
	onRenderMain();

	// ページトップにスクロール
	const mainContent = document.getElementById("main-content");
	if (mainContent) {
		mainContent.scrollTop = 0;
	}
	window.scrollTo({ top: 0, behavior: "instant" });
}

/**
 * ナビゲーションを初期化する
 *
 * ナビゲーションボタンのイベントハンドラを設定する。
 * 必須要素がない場合は何もしない。
 *
 * @param onRenderMain レンダリングコールバック（index.tsから渡される）
 */
export function setupNavigation(onRenderMain: () => void): void {
	const elements = getNavigationElements();
	if (!elements) {
		return;
	}

	const buttonsByMode: ReadonlyArray<[ViewMode, HTMLElement | null]> = [
		["harmony", elements.viewHarmonyBtn],
		["studio", elements.viewStudioBtn],
		["palette", elements.viewPaletteBtn],
		["shades", elements.viewShadesBtn],
		["accessibility", elements.viewAccessibilityBtn],
	];

	for (const [mode, button] of buttonsByMode) {
		if (!button) continue;
		button.onclick = () => updateViewButtons(mode, onRenderMain);
	}
}

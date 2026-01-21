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

/** ナビゲーション要素の型定義（モジュール内部用） */
interface NavigationElements {
	harmonyViewEl: HTMLElement;
	appEl: HTMLElement;
	viewHarmonyBtn: HTMLElement | null;
	viewPaletteBtn: HTMLElement | null;
	viewShadesBtn: HTMLElement | null;
	viewAccessibilityBtn: HTMLElement | null;
	viewStudioBtn: HTMLElement | null;
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

/** ボタンのアクティブ状態を設定する */
function setButtonActive(btn: HTMLElement, isActive: boolean): void {
	btn.dataset.active = String(isActive);
	btn.setAttribute("aria-pressed", String(isActive));
}

/** DOM要素からナビゲーション要素を取得する。必須要素がない場合はnullを返す。 */
function getNavigationElements(): NavigationElements | null {
	const harmonyViewEl = document.getElementById("harmony-view");
	const appEl = document.getElementById("app");
	if (!harmonyViewEl || !appEl) return null;

	return {
		harmonyViewEl,
		appEl,
		viewHarmonyBtn: document.getElementById("view-harmony"),
		viewPaletteBtn: document.getElementById("view-palette"),
		viewShadesBtn: document.getElementById("view-shades"),
		viewAccessibilityBtn: document.getElementById("view-accessibility"),
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

/** ヘッダーコントロールの表示/非表示を設定する */
function setHeaderControlVisibility(id: string, hidden: boolean): void {
	const control = document.getElementById(id);
	if (control) {
		control.style.display = hidden ? "none" : "flex";
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

	// harmony-viewから離れる場合は背景色をリセット
	if (state.viewMode === "harmony" && mode !== "harmony") {
		cleanupHarmonyViewBackground();
	}

	state.viewMode = mode;

	// ハーモニービューと詳細ビューの表示切替
	elements.harmonyViewEl.hidden = mode !== "harmony";
	elements.appEl.hidden = mode === "harmony";

	// ナビゲーションボタンの状態を更新
	const buttonsByMode: Record<ViewMode, HTMLElement | null> = {
		harmony: elements.viewHarmonyBtn,
		studio: elements.viewStudioBtn,
		palette: elements.viewPaletteBtn,
		shades: elements.viewShadesBtn,
		accessibility: elements.viewAccessibilityBtn,
	};

	for (const [viewMode, btn] of Object.entries(buttonsByMode)) {
		if (btn) setButtonActive(btn, viewMode === mode);
	}

	// アクセシビリティ画面ではCVDコントロールを非表示（画面内で色覚シミュレーションを行うため）
	setHeaderControlVisibility("cvd-controls", mode === "accessibility");

	// スタジオビューではヘッダーのエクスポートコントロールを非表示
	setHeaderControlVisibility("export-controls", mode === "studio");

	// スタジオビューではヘッダーにフロストガラス効果を適用
	document.body.classList.toggle("is-studio-view", mode === "studio");

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
		["harmony", elements.viewHarmonyBtn],
		["studio", elements.viewStudioBtn],
		["palette", elements.viewPaletteBtn],
		["shades", elements.viewShadesBtn],
		["accessibility", elements.viewAccessibilityBtn],
	];

	for (const [mode, button] of buttonsByMode) {
		if (button) button.onclick = () => updateViewButtons(mode, onRenderMain);
	}
}

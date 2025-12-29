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

import { getAPCA } from "@/accessibility/apca";
import { verifyContrast } from "@/accessibility/wcag2";
import { Color } from "@/core/color";
import { STEP_NAMES } from "@/ui/style-constants";
import { state } from "./state";
import type { ColorDetailModalOptions, PaletteConfig } from "./types";

/**
 * 最後に作成されたAbortController（テスト用）
 */
let lastAbortController: AbortController | null = null;

/**
 * AbortControllerを作成する
 * イベントリスナーのクリーンアップ用
 */
function createAbortController(): AbortController {
	const controller = new AbortController();
	lastAbortController = controller;
	return controller;
}

// ============================================================
// スクラバー関連の定数と計算ユーティリティ（Task 3.4b）
// ============================================================

/** スクラバーで表示する色相の範囲（度） */
const VISIBLE_RANGE = 30;

/** スクラバーのグラデーション表示用の明度 */
const DISPLAY_LIGHTNESS = 0.65;

/** スクラバーのグラデーション表示用の彩度 */
const DISPLAY_CHROMA = 0.3;

/**
 * 色相を0-360の範囲に正規化する
 */
function normalizeHue(hue: number): number {
	let normalized = hue % 360;
	if (normalized < 0) normalized += 360;
	return normalized;
}

/**
 * 色相の差を計算する（-180〜180度の範囲で返す）
 */
function calculateHueDifference(currentHue: number, centerHue: number): number {
	let diff = currentHue - centerHue;
	if (diff > 180) diff -= 360;
	if (diff < -180) diff += 360;
	return diff;
}

/**
 * 中心色相から表示される色相の範囲を計算する
 */
function calculateHueRange(centerHue: number): {
	visibleRange: number;
	minHue: number;
	maxHue: number;
} {
	return {
		visibleRange: VISIBLE_RANGE,
		minHue: centerHue - VISIBLE_RANGE / 2,
		maxHue: centerHue + VISIBLE_RANGE / 2,
	};
}

/**
 * 色相差からハンドル位置（X座標）を計算する
 */
function calculateHandlePosition(
	currentHue: number,
	centerHue: number,
	width: number,
	visibleRange: number,
): number {
	const pixelsPerDegree = width / visibleRange;
	const diff = calculateHueDifference(currentHue, centerHue);
	return width / 2 + diff * pixelsPerDegree;
}

/**
 * マウス位置（X座標）から色相を計算する
 */
function calculateHueFromPosition(
	x: number,
	width: number,
	centerHue: number,
	visibleRange: number,
): number {
	const pixelsPerDegree = width / visibleRange;
	const offsetPixels = x - width / 2;
	const offsetDegrees = offsetPixels / pixelsPerDegree;
	const newHue = centerHue + offsetDegrees;
	return normalizeHue(newHue);
}

// ============================================================
// スクラバー描画関数（Task 3.4b）
// ============================================================

/**
 * スクラバーを描画する
 *
 * @param canvas - 描画対象のキャンバス
 * @param keyColor - キー色（中心色相の基準）
 * @param currentColor - 現在の色（ハンドル位置の基準）
 */
function drawScrubber(
	canvas: HTMLCanvasElement | null,
	keyColor: Color,
	currentColor: Color,
): void {
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const width = canvas.width;
	const height = canvas.height;

	const centerHue = keyColor.oklch?.h ?? 0;
	const currentH = currentColor.oklch?.h ?? 0;

	ctx.clearRect(0, 0, width, height);

	const pixelsPerDegree = width / VISIBLE_RANGE;

	// グラデーション背景を描画
	for (let x = 0; x < width; x++) {
		const offsetPixels = x - width / 2;
		const offsetDegrees = offsetPixels / pixelsPerDegree;
		let hue = centerHue + offsetDegrees;
		hue = normalizeHue(hue);

		const color = new Color(
			`oklch(${DISPLAY_LIGHTNESS} ${DISPLAY_CHROMA} ${hue})`,
		);
		ctx.fillStyle = color.toCss();
		ctx.fillRect(x, 0, 1, height);
	}

	// ハンドル位置を計算
	const diff = calculateHueDifference(currentH, centerHue);
	const handleX = width / 2 + diff * pixelsPerDegree;

	// ハンドルを描画（表示範囲内の場合のみ）
	if (handleX >= 0 && handleX <= width) {
		// 中心線
		ctx.beginPath();
		ctx.moveTo(handleX, 0);
		ctx.lineTo(handleX, height);
		ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
		ctx.lineWidth = 2;
		ctx.stroke();

		// ハンドル本体（影付き）
		ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
		ctx.shadowBlur = 4;
		ctx.shadowOffsetY = 2;

		ctx.beginPath();
		ctx.roundRect(handleX - 6, 4, 12, height - 8, 6);
		ctx.fillStyle = "white";
		ctx.fill();

		// 影をリセット
		ctx.shadowColor = "transparent";
		ctx.shadowBlur = 0;
		ctx.shadowOffsetY = 0;

		// ハンドルのノブ（中央の線）
		const knobY = height / 2;
		ctx.fillStyle = "#ccc";
		ctx.fillRect(handleX - 1, knobY - 4, 2, 8);
	}
}

// ============================================================
// スクラバーイベントハンドラ（Task 3.4b）
// ============================================================

/**
 * スクラバーハンドラ設定
 */
interface ScrubberHandlerConfig {
	keyColor: Color;
	currentColor: Color;
	readOnly: boolean;
	onColorChange: (newColor: Color) => void;
}

/**
 * スクラバーハンドラのインターフェース
 */
interface ScrubberHandlers {
	handleStart: (e: MouseEvent | TouchEvent) => void;
	handleMove: (e: MouseEvent | TouchEvent) => void;
	handleEnd: () => void;
	isDragging: () => boolean;
	getCurrentColor: () => Color;
	setCurrentColor: (color: Color) => void;
}

/**
 * スクラバーのイベントハンドラを作成する
 */
function createScrubberHandlers(
	config: ScrubberHandlerConfig,
): ScrubberHandlers {
	let isDraggingState = false;
	let currentColorState = config.currentColor;

	const handleStart = (e: MouseEvent | TouchEvent) => {
		if (config.readOnly) return;
		isDraggingState = true;
		handleMove(e);
		if (e.type === "touchstart") {
			e.preventDefault();
		}
	};

	const handleMove = (e: MouseEvent | TouchEvent) => {
		if (!isDraggingState || config.readOnly) return;

		const touch =
			"touches" in e &&
			(e as TouchEvent).touches &&
			(e as TouchEvent).touches.length > 0
				? (e as TouchEvent).touches[0]
				: null;
		const clientX = touch ? touch.clientX : (e as MouseEvent).clientX;

		// キャンバス要素を取得
		const canvas = document.getElementById(
			"tuner-scrubber",
		) as HTMLCanvasElement | null;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const x = clientX - rect.left;
		const width = rect.width;

		const centerHue = config.keyColor.oklch?.h ?? 0;
		const newHue = calculateHueFromPosition(x, width, centerHue, VISIBLE_RANGE);

		const currentL = currentColorState.oklch?.l ?? 0;
		const currentC = currentColorState.oklch?.c ?? 0;
		const newColor = new Color(`oklch(${currentL} ${currentC} ${newHue})`);

		currentColorState = newColor;
		config.onColorChange(newColor);
	};

	const handleEnd = () => {
		isDraggingState = false;
	};

	return {
		handleStart,
		handleMove,
		handleEnd,
		isDragging: () => isDraggingState,
		getCurrentColor: () => currentColorState,
		setCurrentColor: (color: Color) => {
			currentColorState = color;
		},
	};
}

/**
 * スクラバーのリサイズ処理
 */
function resizeScrubber(
	canvas: HTMLCanvasElement | null,
	keyColor: Color,
	currentColor: Color,
): void {
	if (!canvas) return;
	const rect = canvas.parentElement?.getBoundingClientRect();
	if (rect && rect.width > 0) {
		canvas.width = rect.width;
		canvas.height = rect.height;
		drawScrubber(canvas, keyColor, currentColor);
	}
}

// ============================================================
// 色同期・詳細表示関連（Task 3.4c）
// ============================================================

/**
 * パレット情報
 */
interface PaletteInfo {
	name: string;
	baseChromaName?: string;
}

/**
 * トークン情報を計算する
 */
function calculateTokenInfo(
	_color: Color,
	selectedIndex: number,
	paletteInfo: PaletteInfo,
	keyIndex = 0,
): {
	tokenName: string;
	step: number;
	chromaDisplayName: string;
} {
	const tokenIndex = selectedIndex >= 0 ? selectedIndex : keyIndex;
	const step = STEP_NAMES[tokenIndex] ?? 600;
	const chromaNameLower = (
		paletteInfo.baseChromaName ||
		paletteInfo.name ||
		"color"
	)
		.toLowerCase()
		.replace(/\s+/g, "-");

	let chromaDisplayName: string;
	if (paletteInfo.baseChromaName && paletteInfo.name) {
		chromaDisplayName = `${paletteInfo.baseChromaName} | ${paletteInfo.name}`;
	} else if (paletteInfo.baseChromaName) {
		chromaDisplayName = paletteInfo.baseChromaName;
	} else {
		chromaDisplayName = paletteInfo.name;
	}

	return {
		tokenName: `${chromaNameLower}-${step}`,
		step,
		chromaDisplayName,
	};
}

/**
 * コントラスト情報を計算する
 */
function calculateContrastInfo(
	foreground: Color,
	background: Color,
): {
	ratio: number;
	apca: number;
	level: "success" | "warning" | "error";
	badgeText: string;
} {
	const wcag = verifyContrast(foreground, background);
	const apca = getAPCA(foreground, background);
	const ratio = Math.round(wcag.contrast * 100) / 100;
	const lc = Math.round(apca);

	let level: "success" | "warning" | "error";
	let badgeText: string;

	if (ratio >= 7.0) {
		level = "success";
		badgeText = "AAA";
	} else if (ratio >= 4.5) {
		level = "success";
		badgeText = "AA";
	} else if (ratio >= 3.0) {
		level = "warning";
		badgeText = "Large Text";
	} else {
		level = "error";
		badgeText = "Fail";
	}

	return {
		ratio,
		apca: lc,
		level,
		badgeText,
	};
}

/**
 * パレット配列内のマッチするパレットのkeyColorsを更新する
 */
function syncPalette(
	palettes: PaletteConfig[],
	newKeyColorHex: string,
	paletteInfo: PaletteInfo,
): void {
	const match = palettes.find((other) => {
		if (paletteInfo.baseChromaName && other.baseChromaName) {
			return paletteInfo.baseChromaName === other.baseChromaName;
		}
		return paletteInfo.name === other.name;
	});

	if (match) {
		match.keyColors = [newKeyColorHex];
	}
}

/**
 * updateDetailハンドラの設定
 */
interface UpdateDetailHandlerConfig {
	fixedScale: {
		colors: Color[];
		keyIndex: number;
		hexValues?: string[];
	};
	paletteInfo: PaletteInfo;
	readOnly: boolean;
	keyColor: Color;
	drawScrubber: () => void;
	getCurrentColor: () => Color;
	setCurrentColor: (color: Color) => void;
	onRenderMain: () => void;
}

/**
 * updateDetailハンドラのインターフェース
 */
interface UpdateDetailHandler {
	updateDetail: (
		color: Color,
		selectedIndex: number,
		hexOverride?: string,
	) => void;
	getSelectedScaleIndex: () => number;
	setSelectedScaleIndex: (index: number) => void;
	isReadOnly: () => boolean;
}

/**
 * updateDetailハンドラを作成する
 */
function createUpdateDetailHandler(
	config: UpdateDetailHandlerConfig,
): UpdateDetailHandler {
	let selectedScaleIndex = config.fixedScale.keyIndex;

	const updateDetail = (
		color: Color,
		selectedIndex: number,
		hexOverride?: string,
	): void => {
		config.setCurrentColor(color);
		const colorL = color.oklch.l as number;

		const detailSwatch = document.getElementById("detail-swatch");
		const detailTokenName = document.getElementById("detail-token-name");
		const detailHex = document.getElementById("detail-hex");
		const detailLightness = document.getElementById("detail-lightness");
		const detailChromaName = document.getElementById("detail-chroma-name");

		const { keyIndex, hexValues } = config.fixedScale;
		const tokenInfo = calculateTokenInfo(
			color,
			selectedIndex,
			config.paletteInfo,
			keyIndex,
		);

		if (detailSwatch) detailSwatch.style.backgroundColor = color.toCss();
		if (detailTokenName) detailTokenName.textContent = tokenInfo.tokenName;

		// 元のHEX値を優先して使用（変換誤差回避）
		const displayHex =
			hexOverride ??
			(hexValues && selectedIndex >= 0 ? hexValues[selectedIndex] : null) ??
			color.toHex();
		if (detailHex) detailHex.textContent = displayHex;
		if (detailLightness) {
			detailLightness.textContent = `${Math.round(colorL * 100)}% L`;
		}
		if (detailChromaName) {
			detailChromaName.textContent = tokenInfo.chromaDisplayName;
		}

		// "Set as key color" button
		const setKeyColorBtn = document.getElementById(
			"set-key-color-btn",
		) as HTMLButtonElement;
		if (setKeyColorBtn) {
			if (config.readOnly) {
				setKeyColorBtn.style.display = "none";
			} else {
				setKeyColorBtn.style.display = "";
				const paletteName =
					config.paletteInfo.name || config.paletteInfo.baseChromaName || "";
				setKeyColorBtn.textContent = `${color.toHex()} を ${paletteName} のパレットの色に指定`;
				setKeyColorBtn.onclick = () => {
					const newKeyColorHex = color.toHex();
					syncPalette(state.palettes, newKeyColorHex, config.paletteInfo);
					syncPalette(state.shadesPalettes, newKeyColorHex, config.paletteInfo);

					const dialog = document.getElementById(
						"color-detail-dialog",
					) as HTMLDialogElement;
					if (dialog) dialog.close();
					config.onRenderMain();
				};
			}
		}

		// Contrast cards
		updateContrastCard(color, "#ffffff", "white");
		updateContrastCard(color, "#000000", "black");

		// Preferred card highlighting
		const whiteContrastVal = verifyContrast(
			color,
			new Color("#ffffff"),
		).contrast;
		const blackContrastVal = verifyContrast(
			color,
			new Color("#000000"),
		).contrast;
		const whiteCard = document.getElementById("detail-white-card");
		const blackCard = document.getElementById("detail-black-card");

		if (whiteCard && blackCard) {
			if (whiteContrastVal >= blackContrastVal) {
				whiteCard.dataset.preferred = "true";
				delete blackCard.dataset.preferred;
			} else {
				blackCard.dataset.preferred = "true";
				delete whiteCard.dataset.preferred;
			}
		}

		// Redraw scrubber
		config.drawScrubber();

		// Mini scale
		const miniScale = document.getElementById("detail-mini-scale");
		if (miniScale) {
			miniScale.innerHTML = "";
			const { colors: scaleColors, keyIndex: originalKeyIndex } =
				config.fixedScale;
			const currentHighlightIndex =
				selectedScaleIndex >= 0 ? selectedScaleIndex : originalKeyIndex;

			scaleColors.forEach((c, i) => {
				const div = document.createElement("button");
				div.type = "button";
				div.className = "dads-mini-scale__item";
				div.style.backgroundColor = c.toCss();
				div.setAttribute("aria-label", `Color ${c.toHex()}`);

				div.onclick = () => {
					selectedScaleIndex = i;
					updateDetail(c, i);
				};

				if (i === currentHighlightIndex) {
					const check = document.createElement("div");
					check.className = "dads-mini-scale__check";
					check.textContent = "✓";
					check.style.color =
						c.contrast(new Color("#fff")) > 4.5 ? "white" : "black";
					div.appendChild(check);
				}

				miniScale.appendChild(div);
			});
		}
	};

	return {
		updateDetail,
		getSelectedScaleIndex: () => selectedScaleIndex,
		setSelectedScaleIndex: (index: number) => {
			selectedScaleIndex = index;
		},
		isReadOnly: () => config.readOnly,
	};
}

/**
 * コントラストカードを更新する
 */
function updateContrastCard(
	foreground: Color,
	bgHex: string,
	prefix: string,
): void {
	const bgColor = new Color(bgHex);
	const info = calculateContrastInfo(foreground, bgColor);

	const badge = document.getElementById(`detail-${prefix}-badge`);
	const ratioEl = document.getElementById(`detail-${prefix}-ratio`);
	const apcaEl = document.getElementById(`detail-${prefix}-apca`);
	const preview = document.getElementById(`detail-${prefix}-preview`);
	const previewLarge = document.getElementById(
		`detail-${prefix}-preview-large`,
	);
	const failIcon = document.getElementById(`detail-${prefix}-fail-icon`);

	if (ratioEl) ratioEl.textContent = `${info.ratio}`;
	if (apcaEl) apcaEl.textContent = `${info.apca}`;

	if (preview) {
		preview.style.backgroundColor = foreground.toCss();
		preview.style.color = bgHex;
	}
	if (previewLarge) {
		previewLarge.style.backgroundColor = foreground.toCss();
		previewLarge.style.color = bgHex;
	}

	if (badge) {
		badge.textContent = info.badgeText;
		badge.dataset.level = info.level;
		if (failIcon) {
			failIcon.style.display = info.level === "error" ? "block" : "none";
		}
	}
}

/**
 * スクラバーのイベントリスナーを設定する
 */
function setupScrubberEventListeners(
	canvas: HTMLCanvasElement | null,
	handlers: ScrubberHandlers,
	keyColor: Color,
	signal: AbortSignal,
	getRedrawCallback: () => () => void,
): void {
	if (!canvas) return;

	canvas.addEventListener("mousedown", handlers.handleStart, { signal });
	window.addEventListener("mousemove", handlers.handleMove, { signal });
	window.addEventListener("mouseup", handlers.handleEnd, { signal });

	canvas.addEventListener("touchstart", handlers.handleStart, {
		passive: false,
		signal,
	});
	window.addEventListener("touchmove", handlers.handleMove, {
		passive: false,
		signal,
	});
	window.addEventListener("touchend", handlers.handleEnd, { signal });

	window.addEventListener(
		"resize",
		() => {
			resizeScrubber(canvas, keyColor, handlers.getCurrentColor());
			const redraw = getRedrawCallback();
			redraw();
		},
		{ signal },
	);
}

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
	} = options;

	// ダイアログ要素を取得
	const dialog = document.getElementById(
		"color-detail-dialog",
	) as HTMLDialogElement;
	if (!dialog) return;

	// スクラバーキャンバスを取得
	let scrubberCanvas = document.getElementById(
		"tuner-scrubber",
	) as HTMLCanvasElement | null;

	// キャンバスを複製して古いイベントリスナーを削除
	if (scrubberCanvas) {
		const newCanvas = scrubberCanvas.cloneNode(true) as HTMLCanvasElement;
		scrubberCanvas.parentNode?.replaceChild(newCanvas, scrubberCanvas);
		scrubberCanvas = newCanvas;
	}

	// AbortControllerを作成（イベントリスナーのクリーンアップ用）
	const abortController = createAbortController();

	// 現在の色を追跡
	let currentColor = stepColor;

	// ダイアログクローズ時にAbortControllerをabort
	dialog.addEventListener(
		"close",
		() => {
			abortController.abort();
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
		setCurrentColor: (color: Color) => {
			currentColor = color;
		},
		onRenderMain: onRenderMain ?? (() => {}),
	});

	// スクラバーハンドラを作成（Task 3.4c: updateDetail統合）
	const scrubberHandlers = createScrubberHandlers({
		keyColor,
		currentColor,
		readOnly,
		onColorChange: (newColor: Color) => {
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

	// モーダルを表示
	dialog.showModal();

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
	getLastAbortController: (): AbortController | null => lastAbortController,
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

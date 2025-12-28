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

import { Color } from "@/core/color";
import type { ColorDetailModalOptions } from "./types";

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
 */
export function openColorDetailModal(options: ColorDetailModalOptions): void {
	const { stepColor, keyColor, readOnly = false } = options;

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

	// Task 3.4b: スクラバー機能の実装
	// スクラバーハンドラを作成
	const scrubberHandlers = createScrubberHandlers({
		keyColor,
		currentColor,
		readOnly,
		onColorChange: (newColor: Color) => {
			currentColor = newColor;
			// NOTE: updateDetailはTask 3.4cで実装予定
			// updateDetail(newColor, -1);
			drawScrubber(scrubberCanvas, keyColor, newColor);
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

	// TODO: Task 3.4c - 色同期とreadOnlyモードの実装
	// - updateDetail関数
	// - syncPalette関数
	// - readOnlyモードでの編集操作無効化

	// readOnlyモードの場合はスクラバーを非表示
	const scrubberContainer = scrubberCanvas?.parentElement;
	if (scrubberContainer && readOnly) {
		scrubberContainer.style.display = "none";
	} else if (scrubberContainer) {
		scrubberContainer.style.display = "";
	}

	// モーダルを表示
	dialog.showModal();

	// モーダル表示後にスクラバーをリサイズして描画
	requestAnimationFrame(() => {
		resizeScrubber(scrubberCanvas, keyColor, currentColor);
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
};

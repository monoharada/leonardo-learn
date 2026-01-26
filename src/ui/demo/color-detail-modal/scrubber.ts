import { Color } from "@/core/color";

/** スクラバーで表示する色相の範囲（度） */
const VISIBLE_RANGE = 30;

/** スクラバーのグラデーション表示用の明度 */
const DISPLAY_LIGHTNESS = 0.65;

/** スクラバーのグラデーション表示用の彩度 */
const DISPLAY_CHROMA = 0.3;

/**
 * 色相を0-360の範囲に正規化する
 */
export function normalizeHue(hue: number): number {
	const normalized = hue % 360;
	return normalized < 0 ? normalized + 360 : normalized;
}

/**
 * 色相の差を計算する（-180〜180度の範囲で返す）
 */
export function calculateHueDifference(
	currentHue: number,
	centerHue: number,
): number {
	const diff = currentHue - centerHue;
	if (diff > 180) return diff - 360;
	if (diff < -180) return diff + 360;
	return diff;
}

/**
 * 中心色相から表示される色相の範囲を計算する
 */
export function calculateHueRange(centerHue: number): {
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
export function calculateHandlePosition(
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
export function calculateHueFromPosition(
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

/**
 * スクラバーを描画する
 *
 * @param canvas - 描画対象のキャンバス
 * @param keyColor - キー色（中心色相の基準）
 * @param currentColor - 現在の色（ハンドル位置の基準）
 */
export function drawScrubber(
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
export interface ScrubberHandlers {
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
export function createScrubberHandlers(
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
export function resizeScrubber(
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
export function setupScrubberEventListeners(
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

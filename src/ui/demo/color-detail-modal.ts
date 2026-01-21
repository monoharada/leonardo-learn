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
import { syncModalOpenState } from "./modal-scroll-lock";
import { determineColorMode, state } from "./state";
import type {
	ColorDetailModalOptions,
	ManualApplyTarget,
	ManualColorSelection,
	PaletteConfig,
} from "./types";
import { applyColorToManualSelection } from "./views/manual-view";

// ============================================================
// ドロップダウンオプション生成ユーティリティ
// ============================================================

/** ドロップダウンオプションのラベルマッピング */
const APPLY_TARGET_LABELS: Record<ManualApplyTarget, string> = {
	key: "キーカラー",
	secondary: "セカンダリー",
	tertiary: "ターシャリー",
	"accent-1": "アクセント 1",
	"accent-2": "アクセント 2",
	"accent-3": "アクセント 3",
	"accent-4": "アクセント 4",
};

/**
 * 現在の選択状態に基づいて利用可能な適用先を取得する
 *
 * - キー/セカンダリ/ターシャリは常に選択可能
 * - アクセントは連続的に選択可能（accent-1が空ならaccent-2以降は選択不可）
 * - 既に埋まっているスロットは上書き可能
 *
 * @param selection 現在のマニュアル選択状態
 * @returns 利用可能な適用先の配列
 */
function getAvailableApplyTargets(
	selection: ManualColorSelection,
): ManualApplyTarget[] {
	const targets: ManualApplyTarget[] = ["key", "secondary", "tertiary"];

	// 埋まっているアクセントを追加（上書き可能）
	const filledAccents = selection.accentColors
		.map((c, i) =>
			c !== null ? (`accent-${i + 1}` as ManualApplyTarget) : null,
		)
		.filter((t): t is ManualApplyTarget => t !== null);

	targets.push(...filledAccents);

	// 次の空きスロットを追加（連続性を維持）
	const firstEmptyIndex = selection.accentColors.indexOf(null);
	if (firstEmptyIndex !== -1 && firstEmptyIndex < 4) {
		const nextTarget = `accent-${firstEmptyIndex + 1}` as ManualApplyTarget;
		if (!targets.includes(nextTarget)) {
			targets.push(nextTarget);
		}
	}

	return targets;
}

/**
 * ドロップダウンのオプションを動的に生成する
 *
 * @param select ドロップダウン要素
 * @param selection 現在のマニュアル選択状態
 * @param preSelectedTarget 事前選択された適用先
 */
function populateApplyTargetOptions(
	select: HTMLSelectElement,
	selection: ManualColorSelection,
	preSelectedTarget?: ManualApplyTarget,
): void {
	// 既存のオプションをクリア
	select.innerHTML = "";

	// デフォルトオプションを追加
	const defaultOption = document.createElement("option");
	defaultOption.value = "";
	defaultOption.textContent = "-- 選択してください --";
	select.appendChild(defaultOption);

	// 利用可能な適用先を取得
	const availableTargets = getAvailableApplyTargets(selection);

	// 基本カラー（key/secondary/tertiary）のオプションを追加
	const basicTargets: ManualApplyTarget[] = ["key", "secondary", "tertiary"];
	for (const target of basicTargets) {
		const option = document.createElement("option");
		option.value = target;
		option.textContent = APPLY_TARGET_LABELS[target];
		select.appendChild(option);
	}

	// アクセントカラーのオプションを追加（optgroup内）
	const accentTargets = availableTargets.filter((t) => t.startsWith("accent-"));
	if (accentTargets.length > 0) {
		const optgroup = document.createElement("optgroup");
		optgroup.label = "アクセント";

		for (const target of accentTargets) {
			const option = document.createElement("option");
			option.value = target;
			option.textContent = APPLY_TARGET_LABELS[target];
			optgroup.appendChild(option);
		}

		select.appendChild(optgroup);
	}

	// 事前選択を適用
	if (preSelectedTarget && availableTargets.includes(preSelectedTarget)) {
		select.value = preSelectedTarget;
	}
}

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
	/** パレットID（名前編集時に必要） */
	paletteId?: string;
}

/**
 * トークン情報を計算する
 *
 * @param _color 色
 * @param selectedIndex 選択されたインデックス
 * @param paletteInfo パレット情報
 * @param keyIndex キーインデックス
 * @param scaleNames カラーストリップの各色の名前配列（カスタムキーカラー用）
 */
function calculateTokenInfo(
	_color: Color,
	selectedIndex: number,
	paletteInfo: PaletteInfo,
	keyIndex = 0,
	scaleNames?: string[],
): {
	tokenName: string;
	step: number;
	chromaDisplayName: string;
} {
	const tokenIndex = selectedIndex >= 0 ? selectedIndex : keyIndex;
	const step = STEP_NAMES[tokenIndex] ?? 600;

	// カスタムキーカラー（names配列あり）の場合はトークン名を空にする
	if (scaleNames && scaleNames.length > 0) {
		// 選択されたインデックスに対応する名前を使用
		const nameIndex = selectedIndex >= 0 ? selectedIndex : keyIndex;
		const chromaDisplayName = scaleNames[nameIndex] ?? paletteInfo.name;
		return {
			tokenName: "", // カスタムキーカラーにはDADSトークン名がない
			step,
			chromaDisplayName,
		};
	}

	const chromaNameLower = (
		paletteInfo.baseChromaName ||
		paletteInfo.name ||
		"color"
	)
		.toLowerCase()
		.replace(/\s+/g, "-");

	// Issue #41: Display only the token name without baseChromaName
	// e.g., "アクセントカラー 1" instead of "Red | アクセント 1"
	const chromaDisplayName = paletteInfo.name;

	return {
		tokenName: `${chromaNameLower}-${step}`,
		step,
		chromaDisplayName,
	};
}

/** コントラストレベル判定の閾値テーブル */
const CONTRAST_GRADES: {
	minRatio: number;
	level: "success" | "warning" | "error";
	badgeText: string;
}[] = [
	{ minRatio: 7.0, level: "success", badgeText: "AAA" },
	{ minRatio: 4.5, level: "success", badgeText: "AA" },
	{ minRatio: 3.0, level: "warning", badgeText: "Large Text" },
	{ minRatio: 0, level: "error", badgeText: "Fail" },
];

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

	const grade =
		CONTRAST_GRADES.find((g) => ratio >= g.minRatio) ??
		CONTRAST_GRADES[CONTRAST_GRADES.length - 1];

	// 注: CONTRAST_GRADES は空配列ではないため、grade は必ず存在する
	// TypeScript の型推論のため、フォールバック値を提供
	const level = grade?.level ?? "error";
	const badgeText = grade?.badgeText ?? "Fail";

	return {
		ratio,
		apca: lc,
		level,
		badgeText,
	};
}

/**
 * コントラストカードの背景色とテキスト色を更新する
 *
 * @param prefix - 要素IDのプレフィックス（"white" または "black"）
 * @param bgHex - 背景色のHEX値
 */
function updateContrastCardStyling(prefix: string, bgHex: string): void {
	const cardEl = document.getElementById(`detail-${prefix}-card`);
	const labelEl = document.getElementById(`detail-${prefix}-label`);

	if (!cardEl) return;

	cardEl.style.backgroundColor = bgHex;

	const mode = determineColorMode(bgHex);
	cardEl.dataset.bg = "custom";
	cardEl.dataset.mode = mode;

	// テキスト色の決定
	const textColor = mode === "light" ? "#1a1a1a" : "#ffffff";
	const labelColor = mode === "light" ? "#666666" : "#aaaaaa";
	const unitColor = mode === "light" ? "#888888" : "#cccccc";
	const failColor = mode === "light" ? "#dc2626" : "#fca5a5";

	// ラベル色
	if (labelEl) {
		labelEl.style.color = labelColor;
	}

	// コントラスト比テキスト色
	const ratioEl = document.getElementById(`detail-${prefix}-ratio`);
	if (ratioEl) {
		ratioEl.style.color = textColor;
	}

	// 単位テキスト色
	const unitEl = cardEl.querySelector(".dads-contrast-card__unit");
	if (unitEl instanceof HTMLElement) {
		unitEl.style.color = unitColor;
	}

	// 失敗アイコン色
	const failEl = document.getElementById(`detail-${prefix}-fail-icon`);
	if (failEl) {
		failEl.style.color = failColor;
	}

	// ダーク背景のバッジ枠線色
	const badgeEl = document.getElementById(`detail-${prefix}-badge`);
	if (badgeEl) {
		badgeEl.style.borderColor =
			mode === "dark" ? "rgba(255, 255, 255, 0.3)" : "";
	}
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
 * パレット名編集UIをセットアップする
 *
 * @param paletteInfo パレット情報
 * @param onRenderMain 再描画コールバック
 * @param signal AbortSignal（イベントリスナーのクリーンアップ用）
 */
function setupPaletteNameEditing(
	paletteInfo: PaletteInfo,
	onRenderMain: () => void,
	signal: AbortSignal,
): void {
	const editBtn = document.getElementById("detail-name-edit-btn");
	const nameInput = document.getElementById(
		"detail-name-input",
	) as HTMLInputElement | null;
	const chromaName = document.getElementById("detail-chroma-name");

	// パレットIDがない場合は編集ボタンを非表示
	// NOTE: readOnlyはスクラバー（色相調整）用で、名前編集には影響しない
	if (!paletteInfo.paletteId) {
		if (editBtn) editBtn.style.display = "none";
		if (nameInput) nameInput.style.display = "none";
		return;
	}

	if (!editBtn || !nameInput || !chromaName) return;

	// 編集ボタンを表示
	editBtn.style.display = "";
	nameInput.style.display = "none";

	// 編集モードに入る
	const enterEditMode = () => {
		if (!chromaName || !nameInput) return;

		// パレットの現在の名前を取得（baseChromaNameは除く）
		const currentName = paletteInfo.name;
		nameInput.value = currentName;
		nameInput.style.display = "";
		chromaName.style.display = "none";
		editBtn.style.display = "none";
		nameInput.focus();
		nameInput.select();
	};

	// 編集モードを終了して保存
	const saveEdit = () => {
		if (!chromaName || !nameInput) return;

		const newName = nameInput.value.trim();
		if (newName && newName !== paletteInfo.name && paletteInfo.paletteId) {
			// パレットの名前を更新
			const palette = state.palettes.find(
				(p) => p.id === paletteInfo.paletteId,
			);
			if (palette) {
				palette.name = newName;
				paletteInfo.name = newName;
			}

			// シェードパレットも更新
			const shadesPalette = state.shadesPalettes.find(
				(p) => p.id === paletteInfo.paletteId,
			);
			if (shadesPalette) {
				shadesPalette.name = newName;
			}

			// 表示を更新
			chromaName.textContent =
				paletteInfo.baseChromaName && newName
					? `${paletteInfo.baseChromaName} | ${newName}`
					: paletteInfo.baseChromaName || newName;

			// メインビューを再描画
			onRenderMain();
		}

		// 編集モードを終了
		nameInput.style.display = "none";
		chromaName.style.display = "";
		editBtn.style.display = "";
	};

	// 編集をキャンセル
	const cancelEdit = () => {
		if (!chromaName || !nameInput) return;
		nameInput.style.display = "none";
		chromaName.style.display = "";
		editBtn.style.display = "";
	};

	// イベントリスナーを設定
	editBtn.addEventListener("click", enterEditMode, { signal });

	nameInput.addEventListener(
		"keydown",
		(e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				saveEdit();
			} else if (e.key === "Escape") {
				e.preventDefault();
				cancelEdit();
			}
		},
		{ signal },
	);

	nameInput.addEventListener("blur", saveEdit, { signal });
}

/**
 * updateDetailハンドラの設定
 */
interface UpdateDetailHandlerConfig {
	fixedScale: {
		colors: Color[];
		keyIndex: number;
		hexValues?: string[];
		/** 各色の表示名（カスタムキーカラー用） */
		names?: string[];
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

		const { keyIndex, hexValues, names } = config.fixedScale;
		const tokenInfo = calculateTokenInfo(
			color,
			selectedIndex,
			config.paletteInfo,
			keyIndex,
			names,
		);

		if (detailSwatch) detailSwatch.style.backgroundColor = color.toCss();
		// トークン名が空の場合は非表示にする（カスタムキーカラーの場合）
		if (detailTokenName) {
			detailTokenName.textContent = tokenInfo.tokenName;
			detailTokenName.style.display = tokenInfo.tokenName ? "" : "none";
		}

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

		// Contrast cards - use light/dark background colors from state
		updateContrastCard(color, state.lightBackgroundColor, "white");
		updateContrastCard(color, state.darkBackgroundColor, "black");

		// Update card labels to show actual background colors
		const whiteLabelEl = document.getElementById("detail-white-label");
		const blackLabelEl = document.getElementById("detail-black-label");
		if (whiteLabelEl) {
			whiteLabelEl.textContent = `${state.lightBackgroundColor.toUpperCase()} に対するコントラスト`;
		}
		if (blackLabelEl) {
			blackLabelEl.textContent = `${state.darkBackgroundColor.toUpperCase()} に対するコントラスト`;
		}

		// Update contrast card styling for both light and dark backgrounds
		updateContrastCardStyling("white", state.lightBackgroundColor);
		updateContrastCardStyling("black", state.darkBackgroundColor);

		// Preferred card highlighting - use actual background colors
		const whiteContrastVal = verifyContrast(
			color,
			new Color(state.lightBackgroundColor),
		).contrast;
		const blackContrastVal = verifyContrast(
			color,
			new Color(state.darkBackgroundColor),
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
	const applyBtn = document.getElementById("apply-btn");

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
				const originalText = applyBtn.textContent;
				applyBtn.textContent = "適用完了";
				applyBtn.classList.add("applied");

				setTimeout(() => {
					applyBtn.textContent = originalText;
					applyBtn.classList.remove("applied");
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

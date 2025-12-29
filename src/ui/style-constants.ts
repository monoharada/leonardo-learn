/**
 * スタイル関連の定数と型定義
 *
 * @module @/ui/style-constants
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { wcagContrast } from "culori";

/**
 * 背景色のモード（light/dark）
 * style-constants内でColorModeを使用するためローカル定義
 * （循環依存回避）
 */
type ColorMode = "light" | "dark";

export type ContrastIntensity = "subtle" | "moderate" | "strong" | "vivid";

/**
 * コントラスト強度ごとの比率配列
 * 13段階のステップに対応
 */
export const CONTRAST_RANGES: Record<ContrastIntensity, readonly number[]> = {
	subtle: [1.05, 1.1, 1.15, 1.2, 1.3, 1.5, 2.0, 3.0, 4.5, 6.0, 8.0, 10.0, 12.0],
	moderate: [
		1.05, 1.1, 1.2, 1.35, 1.7, 2.5, 3.5, 4.5, 6.0, 8.5, 11.0, 14.0, 17.0,
	],
	strong: [1.1, 1.2, 1.3, 1.5, 2.0, 3.0, 4.5, 6.0, 8.0, 11.0, 14.0, 17.0, 21.0],
	vivid: [
		1.15, 1.25, 1.4, 1.7, 2.5, 3.5, 5.0, 7.0, 9.0, 12.0, 15.0, 18.0, 21.0,
	],
} as const;

/**
 * ステップ名（トークン番号）
 * 暗い色から明るい色の順（1200が最も暗く、50が最も明るい）
 */
export const STEP_NAMES = [
	1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50,
] as const;

/**
 * コントラスト強度から比率配列を取得
 */
export function getContrastRatios(intensity: ContrastIntensity): number[] {
	return [...(CONTRAST_RANGES[intensity] || CONTRAST_RANGES.moderate)];
}

/**
 * ボタンのアクティブ状態を設定（data属性経由）
 */
export function setButtonActive(btn: HTMLElement, isActive: boolean): void {
	btn.dataset.active = String(isActive);
}

/**
 * バッジのレベルを設定（data属性経由）
 * WCAG 2.1 基準:
 * - AAA: 7.0以上
 * - AA: 4.5以上
 * - AA Large Text: 3.0以上
 * - Fail: 3.0未満
 */
export function setBadgeLevel(badge: HTMLElement, ratio: number): void {
	const level = ratio >= 4.5 ? "success" : ratio >= 3.0 ? "warning" : "error";
	badge.dataset.level = level;
	badge.textContent =
		ratio >= 7.0
			? "AAA"
			: ratio >= 4.5
				? "AA"
				: ratio >= 3.0
					? "AA Large"
					: "Fail";
}

/**
 * スウォッチのテキストカラーを判定（明度ベース）
 */
export function getSwatchTextMode(lightness: number): "light" | "dark" {
	return lightness > 0.5 ? "dark" : "light";
}

/**
 * Requirements 6.1: テキスト色のモード切替定数
 * lightモードでは黒テキスト（zinc-900）、darkモードでは白テキスト（zinc-100）
 */
export const FOREGROUND_COLORS: Record<ColorMode, string> = {
	light: "#18181b", // zinc-900
	dark: "#f4f4f5", // zinc-100
} as const;

/**
 * Requirements 6.1: CSS変数名の定義
 */
export const CSS_VARIABLES = {
	/** 前景色（テキスト色） */
	fgPrimary: "--fg-primary",
} as const;

/**
 * Requirements 6.1: 背景モードに応じたテキスト色を取得
 *
 * @param mode 背景色モード（light/dark）
 * @returns テキスト色（HEX形式）
 */
export function getForegroundColor(mode: ColorMode): string {
	return FOREGROUND_COLORS[mode];
}

/**
 * Requirements 6.1: CSS変数（--fg-primary）を要素に適用してテキスト色を切替
 *
 * @param element CSS変数を適用する対象のHTML要素
 * @param mode 背景色モード（light/dark）
 */
export function applyForegroundColor(
	element: HTMLElement,
	mode: ColorMode,
): void {
	const color = getForegroundColor(mode);
	element.style.setProperty(CSS_VARIABLES.fgPrimary, color);
}

/**
 * Requirements 6.2: コントラストレベルの型定義
 * AAA/AA/L/failの4段階
 */
export type ContrastLevel = "AAA" | "AA" | "L" | "fail";

/**
 * Requirements 6.2: バッジの配色スキーム
 */
export interface BadgeColorScheme {
	background: string;
	text: string;
	border: string;
}

/**
 * Requirements 6.2: コントラストバッジの配色定義
 * design.mdのBADGE_COLORS仕様に準拠
 */
export const BADGE_COLORS: Record<
	ContrastLevel,
	Record<ColorMode, BadgeColorScheme>
> = {
	AAA: {
		light: { background: "#dcfce7", text: "#166534", border: "#86efac" },
		dark: { background: "#14532d", text: "#bbf7d0", border: "#22c55e" },
	},
	AA: {
		light: { background: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
		dark: { background: "#1e3a5f", text: "#bfdbfe", border: "#3b82f6" },
	},
	L: {
		light: { background: "#fef3c7", text: "#92400e", border: "#fcd34d" },
		dark: { background: "#78350f", text: "#fde68a", border: "#f59e0b" },
	},
	fail: {
		light: { background: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
		dark: { background: "#7f1d1d", text: "#fecaca", border: "#ef4444" },
	},
} as const;

/**
 * Requirements 6.2: コントラストレベルとモードに応じたバッジ配色を取得
 *
 * @param level コントラストレベル（AAA/AA/L/fail）
 * @param mode 背景色モード（light/dark）
 * @returns バッジ配色スキーム
 */
export function getBadgeColors(
	level: ContrastLevel,
	mode: ColorMode,
): BadgeColorScheme {
	return BADGE_COLORS[level][mode];
}

/**
 * Requirements 6.2: バッジ要素にモード対応の配色を適用
 *
 * @param element バッジのHTML要素
 * @param level コントラストレベル（AAA/AA/L/fail）
 * @param mode 背景色モード（light/dark）
 */
export function applyBadgeColors(
	element: HTMLElement,
	level: ContrastLevel,
	mode: ColorMode,
): void {
	const colors = getBadgeColors(level, mode);
	element.style.backgroundColor = colors.background;
	element.style.color = colors.text;
	element.style.borderColor = colors.border;
}

/**
 * Requirements 6.3, 6.4: スウォッチボーダースタイルの型定義
 */
export interface SwatchBorderStyle {
	border: string;
	boxShadow?: string;
}

/**
 * Requirements 6.3: ボーダー配色スキームの型定義
 */
export interface BorderColorScheme {
	border: string;
}

/**
 * Requirements 6.3: ボーダー強調スタイルの型定義
 */
export interface BorderEmphasizedScheme extends BorderColorScheme {
	boxShadow: string;
}

/**
 * Requirements 6.4: 低コントラスト閾値
 * 背景色とスウォッチ色のコントラスト比がこの値未満の場合、強調ボーダーを適用
 */
export const LOW_CONTRAST_THRESHOLD = 1.5;

/**
 * Requirements 6.3, 6.4: スウォッチボーダーの配色定義
 * design.md仕様に準拠
 */
export const BORDER_COLORS: Record<
	ColorMode,
	{ normal: BorderColorScheme; emphasized: BorderEmphasizedScheme }
> = {
	light: {
		normal: {
			border: "1px solid #e4e4e7", // zinc-200
		},
		emphasized: {
			border: "2px solid #71717a", // zinc-500
			boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
		},
	},
	dark: {
		normal: {
			border: "1px solid #3f3f46", // zinc-700
		},
		emphasized: {
			border: "2px solid #a1a1aa", // zinc-400
			boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
		},
	},
} as const;

/**
 * Requirements 6.3, 6.4: スウォッチのボーダースタイルを取得
 * 背景色とのコントラスト比に応じて通常/強調ボーダーを返す
 *
 * @param swatchHex スウォッチの色（HEX形式）
 * @param backgroundHex 背景色（HEX形式）
 * @param mode 背景色モード（light/dark）
 * @returns ボーダースタイル（border, boxShadow?）
 */
export function getSwatchBorderStyle(
	swatchHex: string,
	backgroundHex: string,
	mode: ColorMode,
): SwatchBorderStyle {
	const contrast = wcagContrast(swatchHex, backgroundHex);

	if (contrast < LOW_CONTRAST_THRESHOLD) {
		// 低コントラスト時: 強調ボーダー + シャドウ
		return {
			border: BORDER_COLORS[mode].emphasized.border,
			boxShadow: BORDER_COLORS[mode].emphasized.boxShadow,
		};
	}

	// 通常時
	return {
		border: BORDER_COLORS[mode].normal.border,
	};
}

/**
 * Requirements 6.3, 6.4: スウォッチ要素にボーダースタイルを適用
 *
 * @param element スウォッチのHTML要素
 * @param swatchHex スウォッチの色（HEX形式）
 * @param backgroundHex 背景色（HEX形式）
 * @param mode 背景色モード（light/dark）
 */
export function applySwatchBorder(
	element: HTMLElement,
	swatchHex: string,
	backgroundHex: string,
	mode: ColorMode,
): void {
	const style = getSwatchBorderStyle(swatchHex, backgroundHex, mode);
	element.style.border = style.border;
	element.style.boxShadow = style.boxShadow ?? "";
}

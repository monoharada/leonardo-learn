/**
 * スタイル関連の定数と型定義
 *
 * @module @/ui/style-constants
 */

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

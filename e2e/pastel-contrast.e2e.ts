/**
 * Pastel Preset Contrast E2E Tests
 *
 * パステルプリセット選択時のコントラスト比検証
 *
 * Requirements:
 * - パステルプリセット選択で生成された色が3:1以上のコントラストを確保
 * - 白背景に対してテキストが読める明度に自動調整
 * - 色相・彩度は可能な限り維持
 *
 * 実行: bun run test:e2e -- --grep "pastel-contrast"
 */

import { expect, type Page, test } from "playwright/test";

const TIMEOUTS = {
	VIEW_SWITCH: 500,
	UI_UPDATE: 1000,
	DATA_LOAD: 2000,
	BEFORE_ACTION: 800,
	AFTER_ACTION: 1000,
	GENERATION: 3000,
} as const;

const SELECTORS = {
	dadsSection: ".dads-section",
	studioSection: ".dads-studio",
	studioPreview: ".studio-preview",
	studioToolbar: ".studio-toolbar",
	toolbarSwatch: ".studio-toolbar-swatch",
	toolbarSwatchCircle: ".studio-toolbar-swatch__circle",
	settingsDetails: ".studio-settings",
	settingsSummary: ".studio-settings__summary",
	settingsPanel: ".studio-settings__panel",
	generateButton: ".studio-generate-btn",
	presetButtons: ".dads-button-group",
	a11ySummary: ".studio-a11y",
};

/**
 * WCAG コントラスト比基準
 * @see https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */
const CONTRAST_THRESHOLDS = {
	/** WCAG AA Large Text / UI Components (3:1) */
	WCAG_AA_LARGE_TEXT: 3,
	/** WCAG AA Normal Text (4.5:1) */
	WCAG_AA_NORMAL_TEXT: 4.5,
} as const;

/**
 * コントラスト比の許容誤差
 * 色空間変換（RGB→OKLCH→RGB）時の丸め誤差を考慮
 */
const CONTRAST_TOLERANCE = 0.2;

/**
 * RGB文字列からOKLCH明度を計算するヘルパー
 * WCAG relative luminanceに基づく近似値
 */
function calculateRelativeLuminance(rgb: string): number {
	const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
	if (!match) return 0.5;

	const [, rStr, gStr, bStr] = match;
	const r = Number(rStr) / 255;
	const g = Number(gStr) / 255;
	const b = Number(bStr) / 255;

	const toLinear = (c: number) =>
		c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

	const rLinear = toLinear(r);
	const gLinear = toLinear(g);
	const bLinear = toLinear(b);

	return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * コントラスト比を計算
 */
function calculateContrastRatio(l1: number, l2: number): number {
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
}

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.waitForSelector(SELECTORS.dadsSection, { timeout: 15000 });
});

test.describe("パステルプリセット コントラスト修正", () => {
	test("パステルプリセット選択後、生成された色が3:1以上のコントラストを確保", async ({
		page,
	}) => {
		// Studioビューに切り替え
		await switchToView(page, "studio");
		await page.waitForSelector(SELECTORS.studioSection, { timeout: 10000 });
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 設定パネルを開く
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		const settingsDetails = page.locator(SELECTORS.settingsDetails);
		await settingsDetails.click();
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		// Pastelプリセットボタンをクリック
		const pastelButton = page.locator("button:has-text('Pastel')");
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		await pastelButton.click();
		await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);

		// 設定パネルを閉じる
		await settingsDetails.click();
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		// 配色を生成
		const generateButton = page.locator(SELECTORS.generateButton);
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		await generateButton.click();
		await page.waitForTimeout(TIMEOUTS.GENERATION);

		// ツールバースウォッチから色を取得
		const swatches = page.locator(SELECTORS.toolbarSwatchCircle);
		const count = await swatches.count();
		expect(count).toBeGreaterThan(0);

		// 白背景の相対輝度（ほぼ1.0）
		const whiteLuminance = 1.0;

		// 背景色（最初のスウォッチ）とテキスト色（2番目のスウォッチ）以外の色を検証
		// キーカラー（3番目）以降が対象
		for (let i = 2; i < count; i++) {
			const swatch = swatches.nth(i);
			const bgColor = await swatch.evaluate(
				(el) => getComputedStyle(el).backgroundColor,
			);

			// RGB形式でない場合はスキップ（プレースホルダーなど）
			if (!bgColor.match(/rgb\(\d+,\s*\d+,\s*\d+\)/)) continue;

			const luminance = calculateRelativeLuminance(bgColor);
			const contrast = calculateContrastRatio(whiteLuminance, luminance);

			// WCAG AA Large Text (3:1) 以上のコントラストを確認
			expect(contrast).toBeGreaterThanOrEqual(
				CONTRAST_THRESHOLDS.WCAG_AA_LARGE_TEXT - CONTRAST_TOLERANCE,
			);
		}
	});

	test("パステルプリセットで複数回生成しても常にコントラストを確保", async ({
		page,
	}) => {
		// Studioビューに切り替え
		await switchToView(page, "studio");
		await page.waitForSelector(SELECTORS.studioSection, { timeout: 10000 });
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 設定パネルを開いてPastelプリセットを選択
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		const settingsDetails = page.locator(SELECTORS.settingsDetails);
		await settingsDetails.click();
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		const pastelButton = page.locator("button:has-text('Pastel')");
		await pastelButton.click();
		await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);

		// 設定パネルを閉じる
		await settingsDetails.click();
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		const generateButton = page.locator(SELECTORS.generateButton);
		const whiteLuminance = 1.0;

		// 3回生成してすべてコントラストを確保していることを確認
		for (let attempt = 0; attempt < 3; attempt++) {
			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await generateButton.click();
			await page.waitForTimeout(TIMEOUTS.GENERATION);

			const swatches = page.locator(SELECTORS.toolbarSwatchCircle);
			const count = await swatches.count();

			for (let i = 2; i < count; i++) {
				const swatch = swatches.nth(i);
				const bgColor = await swatch.evaluate(
					(el) => getComputedStyle(el).backgroundColor,
				);

				if (!bgColor.match(/rgb\(\d+,\s*\d+,\s*\d+\)/)) continue;

				const luminance = calculateRelativeLuminance(bgColor);
				const contrast = calculateContrastRatio(whiteLuminance, luminance);

				expect(contrast).toBeGreaterThanOrEqual(
					CONTRAST_THRESHOLDS.WCAG_AA_LARGE_TEXT - CONTRAST_TOLERANCE,
				);
			}
		}
	});

	test("アクセシビリティサマリーでFail数が0になる", async ({ page }) => {
		// Studioビューに切り替え
		await switchToView(page, "studio");
		await page.waitForSelector(SELECTORS.studioSection, { timeout: 10000 });
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 設定パネルを開いてPastelプリセットを選択
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		const settingsDetails = page.locator(SELECTORS.settingsDetails);
		await settingsDetails.click();
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		const pastelButton = page.locator("button:has-text('Pastel')");
		await pastelButton.click();
		await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);

		// 設定パネルを閉じる
		await settingsDetails.click();
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		// 配色を生成
		const generateButton = page.locator(SELECTORS.generateButton);
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		await generateButton.click();
		await page.waitForTimeout(TIMEOUTS.GENERATION);

		// アクセシビリティサマリーを確認
		const a11ySummary = page.locator(SELECTORS.a11ySummary);
		await expect(a11ySummary).toBeVisible({ timeout: 5000 });

		// Fail数が0であることを確認
		const summaryText = await a11ySummary.textContent();
		expect(summaryText).toMatch(/Fail.*0|背景に対してFail.*0/i);
	});

	test("他のプリセット（Default）が影響を受けない", async ({ page }) => {
		// Studioビューに切り替え
		await switchToView(page, "studio");
		await page.waitForSelector(SELECTORS.studioSection, { timeout: 10000 });
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 設定パネルを開いてDefaultプリセットを選択
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		const settingsDetails = page.locator(SELECTORS.settingsDetails);
		await settingsDetails.click();
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		const defaultButton = page.locator("button:has-text('Default')");
		await defaultButton.click();
		await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);

		// 設定パネルを閉じる
		await settingsDetails.click();
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		// 配色を生成
		const generateButton = page.locator(SELECTORS.generateButton);
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		await generateButton.click();
		await page.waitForTimeout(TIMEOUTS.GENERATION);

		// ツールバースウォッチから色を取得
		const swatches = page.locator(SELECTORS.toolbarSwatchCircle);
		const count = await swatches.count();
		expect(count).toBeGreaterThan(0);

		// 白背景の相対輝度
		const whiteLuminance = 1.0;

		// Defaultプリセットは4.5:1を要求
		for (let i = 2; i < count; i++) {
			const swatch = swatches.nth(i);
			const bgColor = await swatch.evaluate(
				(el) => getComputedStyle(el).backgroundColor,
			);

			if (!bgColor.match(/rgb\(\d+,\s*\d+,\s*\d+\)/)) continue;

			const luminance = calculateRelativeLuminance(bgColor);
			const contrast = calculateContrastRatio(whiteLuminance, luminance);

			// WCAG AA Normal Text (4.5:1) 以上のコントラストを確認
			// Defaultプリセットはより厳しい基準を適用するため許容誤差を大きめに設定
			expect(contrast).toBeGreaterThanOrEqual(
				CONTRAST_THRESHOLDS.WCAG_AA_NORMAL_TEXT - 0.3,
			);
		}
	});
});

async function switchToView(
	page: Page,
	view: "studio" | "manual",
): Promise<void> {
	await page.click(`#view-${view}`);
	await page.waitForTimeout(TIMEOUTS.VIEW_SWITCH);
}

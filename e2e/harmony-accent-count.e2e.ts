/**
 * Harmony Accent Count (Segmented Control) E2E Tests
 *
 * 生成ビュー: パレット色数（4/5/6色）の切り替えが
 * - キーボードフォーカスで操作できる
 * - 左右矢印キーで連続して切り替えられる（再レンダリング後もフォーカス維持）
 *
 * 実行: bun run test:e2e -- --grep "harmony-accent-count"
 */

import { expect, type Page, test } from "playwright/test";

const TIMEOUTS = {
	VIEW_SWITCH: 500,
	UI_UPDATE: 1000,
} as const;

const SELECTORS = {
	dadsSection: ".dads-section",
	viewHarmonyBtn: "#view-harmony",

	// パレット色数（セグメント）
	accentCountGroup: '[data-testid="accent-count-radio-group"]',
	accentCount1: '[data-testid="accent-count-1"]', // 4色
	accentCount2: '[data-testid="accent-count-2"]', // 5色
	accentCount3: '[data-testid="accent-count-3"]', // 6色

	// Coolors メイン表示
	coolorsDisplay: ".coolors-display",
	coolorsColumn: ".coolors-column",
} as const;

async function switchToHarmonyView(page: Page) {
	await page.click(SELECTORS.viewHarmonyBtn);
	await page.waitForTimeout(TIMEOUTS.VIEW_SWITCH);
}

async function waitForCoolorsDisplay(page: Page) {
	await page.waitForSelector(SELECTORS.coolorsDisplay, { timeout: 15000 });
	await page.waitForTimeout(TIMEOUTS.UI_UPDATE);
}

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.waitForSelector(SELECTORS.dadsSection, { timeout: 15000 });
});

test.describe("harmony-accent-count", () => {
	test("パレット色数セグメントが表示される", async ({ page }) => {
		await switchToHarmonyView(page);
		await waitForCoolorsDisplay(page);
		await expect(page.locator(SELECTORS.accentCountGroup)).toBeVisible();
	});

	test("デフォルトは4色（accentCount=1）", async ({ page }) => {
		await switchToHarmonyView(page);
		await waitForCoolorsDisplay(page);

		await expect(page.locator(SELECTORS.accentCount1)).toBeChecked();
		await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(4, {
			timeout: 15000,
		});
	});

	test("左右矢印キーで4→5→6色に連続切り替えでき、フォーカスが維持される", async ({
		page,
	}) => {
		await switchToHarmonyView(page);
		await waitForCoolorsDisplay(page);

		// 4色（デフォルト）にフォーカス
		await page.locator(SELECTORS.accentCount1).focus();

		// → 5色
		await page.keyboard.press("ArrowRight");
		await expect(page.locator(SELECTORS.accentCount2)).toBeChecked();

		const active1 = await page.evaluate(
			() => (document.activeElement as HTMLElement | null)?.dataset.testid,
		);
		expect(active1).toBe("accent-count-2");

		// → 6色（連続で切り替えできること）
		await page.keyboard.press("ArrowRight");
		await expect(page.locator(SELECTORS.accentCount3)).toBeChecked();

		const active2 = await page.evaluate(
			() => (document.activeElement as HTMLElement | null)?.dataset.testid,
		);
		expect(active2).toBe("accent-count-3");

		// 生成結果（カラム数）も反映される
		await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(6, {
			timeout: 15000,
		});
	});
});

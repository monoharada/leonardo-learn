/**
 * アクセシビリティビュー 色の並べ替え機能 E2Eテスト
 *
 * Issue #40: アクセシビリティビューの改修
 * - パレットステップチェックセクションの削除
 * - 並べ替え機能（Hue/ΔE/Lightness）の追加
 * - 境界検証結果の視覚化
 */

import { expect, type Page, test } from "playwright/test";

const TIMEOUTS = {
	PAGE_LOAD: 15000,
	UI_UPDATE: 1000,
	BEFORE_ACTION: 500,
	AFTER_ACTION: 800,
};

const SELECTORS = {
	studioView: "#studio-view",
	accessibilityButton: "#view-accessibility",
	sortingSection: ".dads-a11y-sorting-section",
	sortTabs: ".dads-a11y-sort-tabs",
	sortTab: ".dads-a11y-sort-tab",
	sortTabSelected: '.dads-a11y-sort-tab[aria-selected="true"]',
	boundaryContainer: ".dads-a11y-boundary-container",
	paletteStepsCheck: ".dads-a11y-palette-grid",
};

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.waitForSelector(SELECTORS.studioView, {
		timeout: TIMEOUTS.PAGE_LOAD,
	});
	await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
});

async function switchToAccessibilityView(page: Page): Promise<void> {
	await page.locator(SELECTORS.accessibilityButton).click();
	await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
}

async function clickSortTab(page: Page, tabIndex: number): Promise<void> {
	await page.locator(SELECTORS.sortTab).nth(tabIndex).click();
	await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
}

// SKIP: #view-accessibility button no longer exists (accessibility is now in a drawer)
test.describe
	.skip("アクセシビリティビュー 色の並べ替え機能", () => {
		test("アクセシビリティビューに切り替えられる", async ({ page }) => {
			await switchToAccessibilityView(page);
			const content = await page.locator("#main-content").textContent();
			expect(content).toBeTruthy();
		});

		test("並べ替えセクションが表示される", async ({ page }) => {
			await switchToAccessibilityView(page);
			await expect(page.locator(SELECTORS.sortingSection)).toBeVisible({
				timeout: TIMEOUTS.UI_UPDATE,
			});
		});

		test("3種類のソートタブが表示される", async ({ page }) => {
			await switchToAccessibilityView(page);

			await expect(page.locator(SELECTORS.sortTabs)).toBeVisible({
				timeout: TIMEOUTS.UI_UPDATE,
			});

			const tabs = page.locator(SELECTORS.sortTab);
			expect(await tabs.count()).toBe(3);

			const tabTexts = await tabs.allTextContents();
			expect(tabTexts).toContain("色相順 (Hue)");
			expect(tabTexts).toContain("色差順 (ΔE)");
			expect(tabTexts).toContain("明度順 (Lightness)");
		});

		test("デフォルトでHueタブがアクティブ", async ({ page }) => {
			await switchToAccessibilityView(page);

			const activeTab = page.locator(SELECTORS.sortTabSelected);
			await expect(activeTab).toBeVisible({ timeout: TIMEOUTS.UI_UPDATE });
			expect(await activeTab.textContent()).toContain("色相順");
		});

		test("タブをクリックするとアクティブ状態が切り替わる", async ({ page }) => {
			await switchToAccessibilityView(page);

			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await clickSortTab(page, 1);
			expect(
				await page.locator(SELECTORS.sortTabSelected).textContent(),
			).toContain("色差順");

			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await clickSortTab(page, 2);
			expect(
				await page.locator(SELECTORS.sortTabSelected).textContent(),
			).toContain("明度順");
		});

		test("境界検証結果が表示される", async ({ page }) => {
			await switchToAccessibilityView(page);
			await expect(page.locator(SELECTORS.boundaryContainer)).toBeVisible({
				timeout: TIMEOUTS.UI_UPDATE,
			});
		});

		test("パレットステップチェックセクションが削除されている", async ({
			page,
		}) => {
			await switchToAccessibilityView(page);
			await expect(page.locator(SELECTORS.paletteStepsCheck)).not.toBeVisible();
		});
	});

// SKIP: #view-accessibility button no longer exists (accessibility is now in a drawer)
test.describe
	.skip("ソートタブ切り替えの操作確認", () => {
		test("全てのソートタブを順番にクリックして動作確認", async ({ page }) => {
			await switchToAccessibilityView(page);

			const tabs = page.locator(SELECTORS.sortTab);
			for (let i = 0; i < 3; i++) {
				await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
				await tabs.nth(i).click();
				await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
				await expect(page.locator(SELECTORS.sortTabSelected)).toBeVisible();
			}
		});

		test("左右矢印キーでソートタブが切り替わる", async ({ page }) => {
			await switchToAccessibilityView(page);

			const activeTab = page.locator(SELECTORS.sortTabSelected);
			await expect(activeTab).toBeVisible({ timeout: TIMEOUTS.UI_UPDATE });
			await activeTab.focus();

			await page.keyboard.press("ArrowRight");
			await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
			await expect(page.locator(SELECTORS.sortTabSelected)).toContainText(
				"色差順",
			);

			await page.keyboard.press("ArrowRight");
			await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
			await expect(page.locator(SELECTORS.sortTabSelected)).toContainText(
				"明度順",
			);

			await page.keyboard.press("ArrowLeft");
			await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
			await expect(page.locator(SELECTORS.sortTabSelected)).toContainText(
				"色差順",
			);
		});
	});

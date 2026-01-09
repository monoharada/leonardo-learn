/**
 * アクセシビリティビュー 色の並べ替え機能 E2Eテスト
 *
 * Issue #40: アクセシビリティビューの改修
 * - パレットステップチェックセクションの削除
 * - 並べ替え機能（Hue/ΔE/Lightness）の追加
 * - 境界検証結果の視覚化
 */

import { expect, type Page, test } from "playwright/test";

// ============================================================================
// Constants
// ============================================================================

const TIMEOUTS = {
	PAGE_LOAD: 15000,
	UI_UPDATE: 1000,
	BEFORE_ACTION: 500,
	AFTER_ACTION: 800,
};

const SELECTORS = {
	harmonyView: "#harmony-view",
	accessibilityButton: "#view-accessibility",
	sortingSection: ".dads-a11y-sorting-section",
	sortTabs: ".dads-a11y-sort-tabs",
	sortTab: ".dads-a11y-sort-tab",
	sortTabActive: ".dads-a11y-sort-tab--active",
	boundaryContainer: ".dads-a11y-boundary-container",
	boundaryMarker: ".dads-a11y-boundary-marker",
	deltaEBadge: ".dads-a11y-deltaE-badge",
	boundarySummary: ".dads-a11y-boundary-summary",
	paletteStepsCheck: ".dads-a11y-palette-grid", // 旧セクション（削除されたはず）
};

// ============================================================================
// Test Setup
// ============================================================================

test.beforeEach(async ({ page }) => {
	// Navigate to the main page
	await page.goto("/");

	// Wait for page to be fully loaded
	await page.waitForSelector(SELECTORS.harmonyView, {
		timeout: TIMEOUTS.PAGE_LOAD,
	});

	// 人間的な操作の可視化のため待機
	await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * アクセシビリティビューに切り替える
 */
async function switchToAccessibilityView(page: Page): Promise<void> {
	const accessibilityButton = page.locator(SELECTORS.accessibilityButton);
	await accessibilityButton.click();
	await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
}

/**
 * 指定されたソートタブをクリックする
 */
async function clickSortTab(page: Page, tabIndex: number): Promise<void> {
	const tabs = page.locator(SELECTORS.sortTab);
	const tab = tabs.nth(tabIndex);
	await tab.click();
	await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
}

// ============================================================================
// Tests: アクセシビリティビューの改修確認
// ============================================================================

test.describe("アクセシビリティビュー 色の並べ替え機能", () => {
	test("アクセシビリティビューに切り替えられる", async ({ page }) => {
		// アクセシビリティビューに切り替え
		await switchToAccessibilityView(page);

		// ビューが表示されていることを確認
		const content = await page.locator("#main-content").textContent();
		expect(content).toBeTruthy();
	});

	test("並べ替えセクションが表示される", async ({ page }) => {
		// アクセシビリティビューに切り替え
		await switchToAccessibilityView(page);

		// 並べ替えセクションが存在することを確認
		const sortingSection = page.locator(SELECTORS.sortingSection);
		await expect(sortingSection).toBeVisible({ timeout: TIMEOUTS.UI_UPDATE });
	});

	test("3種類のソートタブが表示される", async ({ page }) => {
		// アクセシビリティビューに切り替え
		await switchToAccessibilityView(page);

		// タブコンテナが表示されていることを確認
		const sortTabs = page.locator(SELECTORS.sortTabs);
		await expect(sortTabs).toBeVisible({ timeout: TIMEOUTS.UI_UPDATE });

		// 3つのタブが存在することを確認
		const tabs = page.locator(SELECTORS.sortTab);
		const tabCount = await tabs.count();
		expect(tabCount).toBe(3);

		// 各タブのラベルを確認
		const tabTexts = await tabs.allTextContents();
		expect(tabTexts).toContain("色相順 (Hue)");
		expect(tabTexts).toContain("色差順 (ΔE)");
		expect(tabTexts).toContain("明度順 (Lightness)");
	});

	test("デフォルトでHueタブがアクティブ", async ({ page }) => {
		// アクセシビリティビューに切り替え
		await switchToAccessibilityView(page);

		// Hueタブがアクティブであることを確認
		const activeTab = page.locator(SELECTORS.sortTabActive);
		await expect(activeTab).toBeVisible({ timeout: TIMEOUTS.UI_UPDATE });

		const activeTabText = await activeTab.textContent();
		expect(activeTabText).toContain("色相順");
	});

	test("タブをクリックするとアクティブ状態が切り替わる", async ({ page }) => {
		// アクセシビリティビューに切り替え
		await switchToAccessibilityView(page);

		// ΔEタブをクリック（2番目のタブ）
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		await clickSortTab(page, 1);

		// ΔEタブがアクティブになっていることを確認
		const activeTab = page.locator(SELECTORS.sortTabActive);
		const activeTabText = await activeTab.textContent();
		expect(activeTabText).toContain("色差順");

		// Lightnessタブをクリック（3番目のタブ）
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		await clickSortTab(page, 2);

		// Lightnessタブがアクティブになっていることを確認
		const newActiveTab = page.locator(SELECTORS.sortTabActive);
		const newActiveTabText = await newActiveTab.textContent();
		expect(newActiveTabText).toContain("明度順");
	});

	test("境界検証結果が表示される", async ({ page }) => {
		// アクセシビリティビューに切り替え
		await switchToAccessibilityView(page);

		// 境界コンテナが表示されていることを確認
		const boundaryContainer = page.locator(SELECTORS.boundaryContainer);
		await expect(boundaryContainer).toBeVisible({
			timeout: TIMEOUTS.UI_UPDATE,
		});
	});

	test("パレットステップチェックセクションが削除されている", async ({
		page,
	}) => {
		// アクセシビリティビューに切り替え
		await switchToAccessibilityView(page);

		// 旧パレットステップチェックセクションが存在しないことを確認
		const paletteStepsCheck = page.locator(SELECTORS.paletteStepsCheck);
		await expect(paletteStepsCheck).not.toBeVisible();
	});
});

test.describe("ソートタブ切り替えの操作確認", () => {
	test("全てのソートタブを順番にクリックして動作確認", async ({ page }) => {
		// アクセシビリティビューに切り替え
		await switchToAccessibilityView(page);

		// 動画エビデンス用に各タブを順番にクリック
		const tabs = page.locator(SELECTORS.sortTab);

		for (let i = 0; i < 3; i++) {
			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);

			const tab = tabs.nth(i);
			await tab.click();

			await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);

			// クリックしたタブがアクティブになっていることを確認
			const activeTab = page.locator(SELECTORS.sortTabActive);
			await expect(activeTab).toBeVisible();
		}
	});
});

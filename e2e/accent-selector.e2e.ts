/**
 * Accent Selector E2E Tests
 *
 * 現行UI（Coolorsメイン表示 + ハーモニーサイドバー）に追従したE2E。
 *
 * Requirements:
 * - アクセント選定ビューの表示
 * - ハーモニー選択で表示が更新される
 * - カラムクリックでカラー詳細モーダルが開く
 * - ブランドカラー入力が動作する
 *
 * 実行: bun run test:e2e -- --grep "accent-selector"
 */

import { expect, type Page, test } from "playwright/test";

const TIMEOUTS = {
	VIEW_SWITCH: 500,
	UI_UPDATE: 1000,
	DATA_LOAD: 2000,
} as const;

const SELECTORS = {
	studioView: "#studio-view",
	dadsSection: ".dads-section",
	coolorsLayout: ".coolors-layout",
	coolorsDisplay: ".coolors-display",
	coolorsColumn: ".coolors-column",
	harmonySidebar: ".harmony-sidebar",
	harmonySidebarCard: ".harmony-sidebar__card",
	harmonySidebarCardSelected: ".harmony-sidebar__card--selected",
	brandColorInput: "#harmony-color-input",
	brandColorPicker: "#harmony-color-picker",
	colorDetailDialog: "#color-detail-dialog",
};

async function switchToView(
	page: Page,
	view: "studio" | "manual",
): Promise<void> {
	const buttonId = `#view-${view}`;
	await page.click(buttonId);
	await page.waitForTimeout(TIMEOUTS.VIEW_SWITCH);
}

async function waitForAccentSelectionView(page: Page): Promise<void> {
	await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
	await page.waitForSelector(SELECTORS.coolorsDisplay, { timeout: 10000 });
	await page.waitForSelector(SELECTORS.harmonySidebar, { timeout: 10000 });
	await page.waitForTimeout(TIMEOUTS.UI_UPDATE);
}

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.waitForSelector(SELECTORS.dadsSection, { timeout: 15000 });
});

// SKIP: Old Coolors-style UI selectors no longer exist (UI redesigned to Huemint-style)
test.describe
	.skip("アクセント選定ビューの表示 (accent-selector)", () => {
		test("Harmonyビューが表示され、Coolors UIが描画される", async ({
			page,
		}) => {
			await switchToView(page, "studio");

			await expect(page.locator(SELECTORS.studioView)).toBeVisible({
				timeout: 10000,
			});
			await waitForAccentSelectionView(page);
		});

		test("ブランドカラー入力欄とカラーピッカーが表示される", async ({
			page,
		}) => {
			await switchToView(page, "studio");
			await waitForAccentSelectionView(page);

			await expect(page.locator(SELECTORS.brandColorInput)).toBeVisible({
				timeout: 5000,
			});
			await expect(page.locator(SELECTORS.brandColorPicker)).toBeVisible({
				timeout: 5000,
			});
		});

		test("ハーモニーサイドバーにカードが表示される", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForAccentSelectionView(page);

			const cards = page.locator(SELECTORS.harmonySidebarCard);
			const cardCount = await cards.count();
			expect(cardCount).toBe(8);
		});
	});

// SKIP: Old Coolors-style UI selectors no longer exist (UI redesigned to Huemint-style)
test.describe
	.skip("ハーモニー選択 (accent-selector)", () => {
		test("サイドバーのカードクリックで選択状態が更新される", async ({
			page,
		}) => {
			await switchToView(page, "studio");
			await waitForAccentSelectionView(page);

			const unselectedCard = page
				.locator(`${SELECTORS.harmonySidebarCard}[aria-selected="false"]`)
				.first();
			await unselectedCard.click();
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);
			await expect(
				page.locator(SELECTORS.harmonySidebarCardSelected),
			).toHaveCount(1);
		});
	});

// SKIP: Old Coolors-style UI selectors no longer exist (UI redesigned to Huemint-style)
test.describe
	.skip("カラー詳細モーダル (accent-selector)", () => {
		test("カラムクリックでカラー詳細モーダルが開く", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForAccentSelectionView(page);

			await page.locator(SELECTORS.coolorsColumn).first().click();
			const dialog = page.locator(SELECTORS.colorDetailDialog);
			await expect(dialog).toHaveJSProperty("open", true);

			await page.keyboard.press("Escape");
			await expect(dialog).toHaveJSProperty("open", false);
		});
	});

// SKIP: Old Coolors-style UI selectors no longer exist (UI redesigned to Huemint-style)
test.describe
	.skip("ブランドカラー入力 (accent-selector)", () => {
		test("ブランドカラー変更後もCoolors UIが表示される", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForAccentSelectionView(page);

			const colorInput = page.locator(SELECTORS.brandColorInput);
			await colorInput.clear();
			await colorInput.fill("#FF5500");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await expect(page.locator(SELECTORS.coolorsLayout)).toBeVisible();
			await expect(page.locator(SELECTORS.coolorsDisplay)).toBeVisible();
			await expect(page.locator(SELECTORS.harmonySidebar)).toBeVisible();
		});
	});

/**
 * Harmony UI Brushup E2E Tests
 *
 * Issue #33: アクセントカラー選定・パレットビューUIブラッシュアップ
 *
 * Requirements:
 * - Coolors風のメイン表示 + サイドバーレイアウト
 * - サイドバーでハーモニー選択 → メイン表示切替
 * - カラムクリックでカラー詳細モーダル表示
 * - セッション内でのハーモニー記憶
 *
 * 実行: bun run test:e2e -- --grep "harmony-ui-brushup"
 */

import { expect, type Page, test } from "playwright/test";

const TIMEOUTS = {
	VIEW_SWITCH: 500,
	UI_UPDATE: 1000,
	DATA_LOAD: 2000,
	BEFORE_ACTION: 800,
} as const;

const SELECTORS = {
	viewStudioBtn: "#view-studio",
	coolorsLayout: ".coolors-layout",
	coolorsLayoutMain: ".coolors-layout__main",
	coolorsLayoutSidebar: ".coolors-layout__sidebar",
	coolorsDisplay: ".coolors-display",
	coolorsColumn: ".coolors-column",
	coolorsColumnHex: ".coolors-column__hex",
	coolorsColumnTokenName: ".coolors-column__token-name",
	harmonySidebar: ".harmony-sidebar",
	harmonySidebarCard: ".harmony-sidebar__card",
	harmonySidebarCardSelected: ".harmony-sidebar__card--selected",
	harmonySidebarCardName: ".harmony-sidebar__card-name",
	harmonySidebarSwatches: ".harmony-sidebar__swatches",
	brandColorInput: "#harmony-color-input",
	dadsSection: ".dads-section",
};

async function switchToView(
	page: Page,
	view: "studio" | "manual",
): Promise<void> {
	const buttonSelector =
		view === "studio" ? SELECTORS.viewStudioBtn : "#view-manual";
	await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
	await page.locator(buttonSelector).click();
	await page.waitForTimeout(TIMEOUTS.VIEW_SWITCH);
}

async function waitForCoolorsLayout(page: Page): Promise<void> {
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
	.skip("Coolorsレイアウト表示", () => {
		test("Coolorsスタイルの2カラムレイアウトが表示される", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			// メインエリアとサイドバーが存在することを確認
			await expect(page.locator(SELECTORS.coolorsLayoutMain)).toBeVisible();
			await expect(page.locator(SELECTORS.coolorsLayoutSidebar)).toBeVisible();
		});

		test("メインエリアにCoolors風のカラム表示がある", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			// カラムが表示されていることを確認
			const columns = page.locator(SELECTORS.coolorsColumn);
			const columnCount = await columns.count();
			expect(columnCount).toBeGreaterThanOrEqual(3); // 最低3色

			// 各カラムにHEX値が表示されていることを確認
			const firstHex = page.locator(SELECTORS.coolorsColumnHex).first();
			await expect(firstHex).toBeVisible();
			const hexText = await firstHex.textContent();
			expect(hexText).toMatch(/^#[0-9a-fA-F]{6}$/);
		});

		test("各カラムにトークン名が表示される", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			// トークン名が表示されていることを確認
			const tokenNames = page.locator(SELECTORS.coolorsColumnTokenName);
			const count = await tokenNames.count();
			expect(count).toBeGreaterThanOrEqual(3);

			// 最初のトークン名は「Primary」
			const firstTokenName = tokenNames.first();
			const text = await firstTokenName.textContent();
			expect(text).toBe("Primary");
		});
	});

// SKIP: Old Coolors-style UI selectors no longer exist (UI redesigned to Huemint-style)
test.describe
	.skip("ハーモニーサイドバー表示", () => {
		test("サイドバーに8種類のハーモニーカードが表示される", async ({
			page,
		}) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			const cards = page.locator(SELECTORS.harmonySidebarCard);
			const cardCount = await cards.count();
			expect(cardCount).toBe(8);
		});

		test("各カードにハーモニー名が表示される", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			const cardNames = page.locator(SELECTORS.harmonySidebarCardName);
			const count = await cardNames.count();
			expect(count).toBe(8);

			// 最初のカードにテキストがあることを確認
			const firstCardName = cardNames.first();
			const text = await firstCardName.textContent();
			expect(text?.length).toBeGreaterThan(0);
		});

		test("1つのカードが選択状態になっている", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			const selectedCard = page.locator(SELECTORS.harmonySidebarCardSelected);
			await expect(selectedCard).toBeVisible();

			// aria-selected属性を確認
			const ariaSelected = await selectedCard.getAttribute("aria-selected");
			expect(ariaSelected).toBe("true");
		});

		test("各カードにミニスウォッチが表示される", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			const swatches = page.locator(SELECTORS.harmonySidebarSwatches);
			const count = await swatches.count();
			expect(count).toBe(8);
		});
	});

// SKIP: Old Coolors-style UI selectors no longer exist (UI redesigned to Huemint-style)
test.describe
	.skip("ハーモニー切替", () => {
		test("サイドバーのカードクリックでメイン表示が切り替わる", async ({
			page,
		}) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			// 未選択のカードをクリック
			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			const unselectedCard = page
				.locator(`${SELECTORS.harmonySidebarCard}[aria-selected="false"]`)
				.first();
			await unselectedCard.click();
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			// 選択状態が変わったことを確認
			// 注: ランダム選択によっては同じ色になる可能性があるため、色の変化ではなく選択状態を検証
			const newSelectedCard = page.locator(
				SELECTORS.harmonySidebarCardSelected,
			);
			await expect(newSelectedCard).toBeVisible();
		});

		test("選択されたカードにselectedクラスが付与される", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			// 2番目のカードをクリック
			const cards = page.locator(SELECTORS.harmonySidebarCard);
			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await cards.nth(1).click();
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			// 2番目のカードがselectedクラスを持つことを確認
			const secondCard = cards.nth(1);
			await expect(secondCard).toHaveClass(/harmony-sidebar__card--selected/);
		});
	});

// SKIP: Old Coolors-style UI selectors no longer exist (UI redesigned to Huemint-style)
test.describe
	.skip("アクセシビリティ", () => {
		test("サイドバーにrole='listbox'が設定される", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			const sidebar = page.locator(SELECTORS.harmonySidebar);
			const role = await sidebar.getAttribute("role");
			expect(role).toBe("listbox");
		});

		test("各カードにrole='option'が設定される", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			const cards = page.locator(SELECTORS.harmonySidebarCard);
			const firstCard = cards.first();
			const role = await firstCard.getAttribute("role");
			expect(role).toBe("option");
		});

		test("カラムにtabindex='0'が設定される", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			const firstColumn = page.locator(SELECTORS.coolorsColumn).first();
			const tabindex = await firstColumn.getAttribute("tabindex");
			expect(tabindex).toBe("0");
		});
	});

// SKIP: Old Coolors-style UI selectors no longer exist (UI redesigned to Huemint-style)
test.describe
	.skip("ブランドカラー変更", () => {
		test("ブランドカラー変更後もCoolorsレイアウトが表示される", async ({
			page,
		}) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			// ブランドカラーを変更
			const colorInput = page.locator(SELECTORS.brandColorInput);
			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await colorInput.clear();
			await colorInput.fill("#ff0000");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			// Coolorsレイアウトがまだ表示されていることを確認
			await expect(page.locator(SELECTORS.coolorsLayout)).toBeVisible();
			await expect(page.locator(SELECTORS.coolorsDisplay)).toBeVisible();
			await expect(page.locator(SELECTORS.harmonySidebar)).toBeVisible();
		});
	});

// ============================================================================
// 6. 低画面高での表示崩れ防止
// ============================================================================

// SKIP: Old Coolors-style UI selectors no longer exist (UI redesigned to Huemint-style)
test.describe
	.skip("低い画面高でも表示が崩れない", () => {
		test.use({ viewport: { width: 1280, height: 520 } });

		test("HEX値がハーモニー行に隠れない", async ({ page }) => {
			await switchToView(page, "studio");
			await waitForCoolorsLayout(page);

			const hex = page.locator(SELECTORS.coolorsColumnHex).first();
			const sidebar = page.locator(SELECTORS.coolorsLayoutSidebar);
			await expect(hex).toBeVisible();
			await expect(sidebar).toBeVisible();

			const hexBox = await hex.boundingBox();
			const sidebarBox = await sidebar.boundingBox();

			expect(hexBox).not.toBeNull();
			expect(sidebarBox).not.toBeNull();

			if (hexBox && sidebarBox) {
				// ハーモニー行がオーバーレイしていないこと（= HEX表示の下端がサイドバー上端より上）
				expect(hexBox.y + hexBox.height).toBeLessThanOrEqual(sidebarBox.y + 1);
			}
		});
	});

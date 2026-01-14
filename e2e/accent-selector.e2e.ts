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

/**
 * タイムアウト定数
 * E2Eテストで使用する待機時間
 */
const TIMEOUTS = {
	/** ビュー切り替えアニメーション完了待ち */
	VIEW_SWITCH: 500,
	/** UI更新完了待ち（レンダリング） */
	UI_UPDATE: 1000,
	/** データ読み込み・パレット生成完了待ち */
	DATA_LOAD: 2000,
} as const;

/**
 * セレクター定数
 */
const SELECTORS = {
	// ビュー切り替え
	harmonyView: "#harmony-view",
	dadsSection: ".dads-section",

	// Coolors UI
	coolorsLayout: ".coolors-layout",
	coolorsDisplay: ".coolors-display",
	coolorsColumn: ".coolors-column",

	// ハーモニーサイドバー
	harmonySidebar: ".harmony-sidebar",
	harmonySidebarCard: ".harmony-sidebar__card",
	harmonySidebarCardSelected: ".harmony-sidebar__card--selected",

	// ブランドカラー入力
	brandColorInput: "#harmony-color-input",
	brandColorPicker: "#harmony-color-picker",

	// カラー詳細モーダル
	colorDetailDialog: "#color-detail-dialog",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * ビューを切り替える
 */
async function switchToView(
	page: Page,
	view: "harmony" | "palette" | "shades" | "accessibility",
): Promise<void> {
	const buttonId = `#view-${view}`;
	await page.click(buttonId);
	await page.waitForTimeout(TIMEOUTS.VIEW_SWITCH);
}

/**
 * Harmony（アクセント選定）ビューが描画されるまで待機する
 */
async function waitForAccentSelectionView(page: Page): Promise<void> {
	await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
	await page.waitForSelector(SELECTORS.coolorsDisplay, { timeout: 10000 });
	await page.waitForSelector(SELECTORS.harmonySidebar, { timeout: 10000 });
	await page.waitForTimeout(TIMEOUTS.UI_UPDATE);
}

// ============================================================================
// Test Setup
// ============================================================================

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.waitForSelector(SELECTORS.dadsSection, { timeout: 15000 });
});

// ============================================================================
// 1. アクセント選定ビューの表示テスト
// ============================================================================

test.describe("アクセント選定ビューの表示 (accent-selector)", () => {
	test("Harmonyビューが表示され、Coolors UIが描画される", async ({ page }) => {
		await switchToView(page, "harmony");

		await expect(page.locator(SELECTORS.harmonyView)).toBeVisible({
			timeout: 10000,
		});
		await waitForAccentSelectionView(page);
	});

	test("ブランドカラー入力欄とカラーピッカーが表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await waitForAccentSelectionView(page);

		await expect(page.locator(SELECTORS.brandColorInput)).toBeVisible({
			timeout: 5000,
		});
		await expect(page.locator(SELECTORS.brandColorPicker)).toBeVisible({
			timeout: 5000,
		});
	});

	test("ハーモニーサイドバーにカードが表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await waitForAccentSelectionView(page);

		const cards = page.locator(SELECTORS.harmonySidebarCard);
		const cardCount = await cards.count();
		expect(cardCount).toBe(8);
	});
});

// ============================================================================
// 2. ハーモニー選択のテスト
// ============================================================================

test.describe("ハーモニー選択 (accent-selector)", () => {
	test("サイドバーのカードクリックで選択状態が更新される", async ({ page }) => {
		await switchToView(page, "harmony");
		await waitForAccentSelectionView(page);

		// 未選択のカードをクリック
		const unselectedCard = page
			.locator(`${SELECTORS.harmonySidebarCard}[aria-selected="false"]`)
			.first();
		await unselectedCard.click();
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 選択状態のカードが存在することを確認
		await expect(
			page.locator(SELECTORS.harmonySidebarCardSelected),
		).toHaveCount(1);
	});
});

// ============================================================================
// 3. カラー詳細モーダルのテスト
// ============================================================================

test.describe("カラー詳細モーダル (accent-selector)", () => {
	test("カラムクリックでカラー詳細モーダルが開く", async ({ page }) => {
		await switchToView(page, "harmony");
		await waitForAccentSelectionView(page);

		// 最初のカラムをクリック
		await page.locator(SELECTORS.coolorsColumn).first().click();

		const dialog = page.locator(SELECTORS.colorDetailDialog);
		await expect(dialog).toHaveJSProperty("open", true);

		// 閉じる（ESC）
		await page.keyboard.press("Escape");
		await expect(dialog).toHaveJSProperty("open", false);
	});
});

// ============================================================================
// 4. ブランドカラー入力のテスト
// ============================================================================

test.describe("ブランドカラー入力 (accent-selector)", () => {
	test("ブランドカラー変更後もCoolors UIが表示される", async ({ page }) => {
		await switchToView(page, "harmony");
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

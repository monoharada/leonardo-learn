/**
 * Background Color Change E2E Tests
 *
 * 現行の背景色セレクター（Light/Dark 2セクション）に追従したE2E。
 *
 * - カラーピッカー/HEX入力で背景色が更新されること
 * - localStorage 永続化とリロード復元
 * - ビュー切替後も値が維持されること
 *
 * 実行: bun run test:e2e -- --grep "background-color"
 */

import { expect, type Page, test } from "playwright/test";

/**
 * テスト用の背景色
 */
const TEST_COLORS = {
	white: "#ffffff",
	darkGray: "#18181b",
	customBlue: "#0066cc",
	customRed: "#cc3300",
};

type ViewType = "harmony" | "palette" | "shades" | "accessibility";

const STORAGE_KEY = "leonardo-backgroundColor";

const SELECTORS = {
	app: "#app",
	layout: ".dads-layout",
	lightColorPicker: 'input[aria-label="Pick light background color"]',
	darkColorPicker: 'input[aria-label="Pick dark text color"]',
	lightHexInput:
		'input[aria-label="Enter light background color in HEX format"]',
	darkHexInput: 'input[aria-label="Enter dark text color in HEX format"]',
};

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.waitForSelector(SELECTORS.layout, { timeout: 15000 });

	// localStorageをクリアしてから再ロード（初期化の読み込みを揃える）
	await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
	await page.reload();
	await page.waitForSelector(SELECTORS.layout, { timeout: 15000 });
});

// ============================================================================
// 1. 表示テスト
// ============================================================================

test.describe("背景色セレクター表示 (background-color)", () => {
	test("パレットビューでLight/Darkの入力が表示される", async ({ page }) => {
		await switchToView(page, "palette");

		await expect(page.locator(SELECTORS.lightColorPicker)).toBeVisible();
		await expect(page.locator(SELECTORS.darkColorPicker)).toBeVisible();
		await expect(page.locator(SELECTORS.lightHexInput)).toBeVisible();
		await expect(page.locator(SELECTORS.darkHexInput)).toBeVisible();
	});

	test("シェードビューでLight/Darkの入力が表示される", async ({ page }) => {
		await switchToView(page, "shades");

		await expect(page.locator(SELECTORS.lightColorPicker)).toBeVisible();
		await expect(page.locator(SELECTORS.darkColorPicker)).toBeVisible();
		await expect(page.locator(SELECTORS.lightHexInput)).toBeVisible();
		await expect(page.locator(SELECTORS.darkHexInput)).toBeVisible();
	});
});

// ============================================================================
// 2. ライト背景色の更新
// ============================================================================

test.describe("ライト背景色の変更 (background-color)", () => {
	test("カラーピッカーで変更すると#appの背景色が更新される", async ({
		page,
	}) => {
		await switchToView(page, "palette");

		const picker = page.locator(SELECTORS.lightColorPicker);
		await picker.fill(TEST_COLORS.darkGray);

		const value = await picker.inputValue();
		expect(value.toLowerCase()).toBe(TEST_COLORS.darkGray);

		const bg = await getAppBackgroundColor(page);
		expect(bg).toBe("rgb(24, 24, 27)");
	});

	test("HEX入力（デバウンス）で変更すると#appの背景色が更新される", async ({
		page,
	}) => {
		await switchToView(page, "palette");

		const input = page.locator(SELECTORS.lightHexInput);
		await input.clear();
		await input.fill(TEST_COLORS.customRed);

		// デバウンス（150ms）より長めに待機
		await page.waitForTimeout(250);

		const value = await input.inputValue();
		expect(value.toLowerCase()).toBe(TEST_COLORS.customRed);

		const bg = await getAppBackgroundColor(page);
		expect(bg).not.toBe("rgb(255, 255, 255)");
	});
});

// ============================================================================
// 3. 永続化（localStorage）
// ============================================================================

test.describe("localStorage永続化 (background-color)", () => {
	test("ライト背景色が保存され、リロード後に復元される", async ({ page }) => {
		await switchToView(page, "palette");

		await page.locator(SELECTORS.lightColorPicker).fill(TEST_COLORS.customBlue);
		await page.waitForTimeout(300);

		// localStorageに保存されていることを確認
		const stored = await page.evaluate(
			(key) => localStorage.getItem(key),
			STORAGE_KEY,
		);
		expect(stored).not.toBeNull();

		// リロードして復元確認
		await page.reload();
		await page.waitForSelector(SELECTORS.layout, { timeout: 15000 });

		await switchToView(page, "palette");
		const restoredValue = await page
			.locator(SELECTORS.lightColorPicker)
			.inputValue();
		expect(restoredValue.toLowerCase()).toBe(TEST_COLORS.customBlue);
	});

	test("ダーク（Text）色が保存され、リロード後に復元される", async ({
		page,
	}) => {
		await switchToView(page, "palette");

		await page.locator(SELECTORS.darkColorPicker).fill(TEST_COLORS.darkGray);
		await page.waitForTimeout(300);

		await page.reload();
		await page.waitForSelector(SELECTORS.layout, { timeout: 15000 });

		await switchToView(page, "palette");
		const restoredValue = await page
			.locator(SELECTORS.darkColorPicker)
			.inputValue();
		expect(restoredValue.toLowerCase()).toBe(TEST_COLORS.darkGray);
	});
});

// ============================================================================
// 4. ビュー切替での維持
// ============================================================================

test.describe("ビュー切替後も値が維持される (background-color)", () => {
	test("パレット→シェード→パレットでも維持される", async ({ page }) => {
		await switchToView(page, "palette");
		await page.locator(SELECTORS.lightColorPicker).fill(TEST_COLORS.customBlue);
		await page.waitForTimeout(300);

		await switchToView(page, "shades");
		const shadesValue = await page
			.locator(SELECTORS.lightColorPicker)
			.inputValue();
		expect(shadesValue.toLowerCase()).toBe(TEST_COLORS.customBlue);

		await switchToView(page, "palette");
		const paletteValue = await page
			.locator(SELECTORS.lightColorPicker)
			.inputValue();
		expect(paletteValue.toLowerCase()).toBe(TEST_COLORS.customBlue);
	});

	test("パレット→アクセシビリティ→ハーモニー→パレットでも維持される", async ({
		page,
	}) => {
		await switchToView(page, "palette");
		await page.locator(SELECTORS.lightColorPicker).fill(TEST_COLORS.customRed);
		await page.waitForTimeout(300);

		await switchToView(page, "accessibility");
		await page.waitForTimeout(300);

		await switchToView(page, "harmony");
		await page.waitForTimeout(300);

		await switchToView(page, "palette");
		const value = await page.locator(SELECTORS.lightColorPicker).inputValue();
		expect(value.toLowerCase()).toBe(TEST_COLORS.customRed);
	});
});

// ============================================================================
// Helper Functions
// ============================================================================

async function switchToView(page: Page, view: ViewType): Promise<void> {
	await page.click(`#view-${view}`);
	await page.waitForTimeout(800);

	// palette/shadesはセレクターが出るまで待機
	if (view === "palette" || view === "shades") {
		await page.waitForSelector(SELECTORS.lightColorPicker, { timeout: 15000 });
	}
}

async function getAppBackgroundColor(page: Page): Promise<string> {
	return page.locator(SELECTORS.app).evaluate((el) => {
		return window.getComputedStyle(el).backgroundColor;
	});
}

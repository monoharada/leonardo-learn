/**
 * Brand Color History E2E Tests
 *
 * ブランドカラー履歴機能のE2Eテスト
 *
 * Requirements:
 * - 履歴ドロップダウン表示確認
 * - ランダムボタンで履歴追加
 * - HEX入力で履歴追加
 * - 履歴選択で色復元
 * - 履歴選択時に再保存されないこと
 * - クリアボタン動作
 * - ページリロード後の永続化確認
 * - 10件制限確認
 *
 * 実行: bun run test:e2e -- --grep "brand-color-history"
 */

import { expect, type Page, test } from "playwright/test";

const TIMEOUTS = {
	VIEW_SWITCH: 500,
	UI_UPDATE: 1000,
	DATA_LOAD: 2000,
	BEFORE_ACTION: 800,
	AFTER_ACTION: 800,
	RANDOM_SELECTION: 3000,
} as const;

const SELECTORS = {
	randomButton: '[data-testid="random-color-button"]',
	brandColorInput: "#harmony-color-input",
	historySelect: '[data-testid="brand-color-history-select"]',
	historyClearButton: '[data-testid="brand-color-history-clear"]',
	dadsSection: ".dads-section",
	accentCount1: '[data-testid="accent-count-1"]',
	accentCount2: '[data-testid="accent-count-2"]',
	accentCount3: '[data-testid="accent-count-3"]',
};

const STORAGE_KEY = "leonardo-brandColorHistory";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
	await page.reload();
	await page.waitForSelector(SELECTORS.dadsSection, { timeout: 15000 });
});

test.afterEach(async ({ page }) => {
	await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
});

// SKIP: Brand color history UI elements no longer exist in current UI
test.describe
	.skip("履歴ドロップダウン表示", () => {
		test("履歴ドロップダウンが表示される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

			const historySelect = page.locator(SELECTORS.historySelect);
			await expect(historySelect).toBeVisible({ timeout: 5000 });
		});

		test("初期状態で履歴なしと表示される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

			const historySelect = page.locator(SELECTORS.historySelect);
			await expect(historySelect).toHaveText(/履歴なし/);
		});

		test("クリアボタンが表示される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

			const clearButton = page.locator(SELECTORS.historyClearButton);
			await expect(clearButton).toBeVisible({ timeout: 5000 });
		});

		test("初期状態で履歴ドロップダウンが無効", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

			const historySelect = page.locator(SELECTORS.historySelect);
			await expect(historySelect).toBeDisabled();
		});
	});

// SKIP: Brand color history UI elements no longer exist in current UI
test.describe
	.skip("ランダムボタンで履歴追加", () => {
		test("ランダムボタンクリックで履歴に追加される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const randomButton = page.locator(SELECTORS.randomButton);
			const historySelect = page.locator(SELECTORS.historySelect);

			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await randomButton.click();
			await page.waitForTimeout(TIMEOUTS.RANDOM_SELECTION);

			await expect(historySelect).toBeEnabled();
			await expect(historySelect).toHaveText(/履歴 \(1\)/);
		});

		test("複数回ランダムで複数履歴が追加される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const randomButton = page.locator(SELECTORS.randomButton);
			const historySelect = page.locator(SELECTORS.historySelect);

			for (let i = 0; i < 3; i++) {
				await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
				await randomButton.click();
				await page.waitForTimeout(TIMEOUTS.RANDOM_SELECTION);
			}

			const count = await historySelect
				.locator("option:not(:disabled)")
				.count();
			expect(count).toBeGreaterThanOrEqual(1);
			expect(count).toBeLessThanOrEqual(3);
		});
	});

// SKIP: Brand color history UI elements no longer exist in current UI
test.describe
	.skip("HEX入力で履歴追加", () => {
		test("HEX入力で履歴に追加される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const colorInput = page.locator(SELECTORS.brandColorInput);
			const historySelect = page.locator(SELECTORS.historySelect);

			await colorInput.fill("#ff5500");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await expect(historySelect).toBeEnabled();
			await expect(historySelect).toHaveText(/履歴 \(1\)/);
		});

		test("入力した色が履歴に表示される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const colorInput = page.locator(SELECTORS.brandColorInput);
			const historySelect = page.locator(SELECTORS.historySelect);

			await colorInput.fill("#aabbcc");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const historyOptions = await historySelect
				.locator("option")
				.allTextContents();
			expect(historyOptions.some((text) => text.includes("#AABBCC"))).toBe(
				true,
			);
		});
	});

// SKIP: Brand color history UI elements no longer exist in current UI
test.describe
	.skip("履歴選択で色復元", () => {
		test("履歴から選択すると色が復元される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const colorInput = page.locator(SELECTORS.brandColorInput);
			const historySelect = page.locator(SELECTORS.historySelect);

			await colorInput.fill("#ff0000");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);
			await colorInput.fill("#00ff00");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await historySelect.selectOption({ index: 2 });
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			expect((await colorInput.inputValue()).toLowerCase()).toBe("#ff0000");
		});

		test("履歴から選択するとアクセント数も復元される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const colorInput = page.locator(SELECTORS.brandColorInput);
			const historySelect = page.locator(SELECTORS.historySelect);

			await setAccentCount(page, 1);
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);
			await colorInput.fill("#ff0000");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await setAccentCount(page, 3);
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);
			await colorInput.fill("#0000ff");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await historySelect.selectOption({ index: 2 });
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await expect(page.locator(SELECTORS.accentCount1)).toBeChecked();
		});
	});

// SKIP: Brand color history UI elements no longer exist in current UI
test.describe
	.skip("履歴選択時に再保存されない", () => {
		test("履歴から選択しても履歴件数が増えない", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const colorInput = page.locator(SELECTORS.brandColorInput);
			const historySelect = page.locator(SELECTORS.historySelect);

			await colorInput.fill("#ff0000");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);
			await colorInput.fill("#00ff00");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await historySelect.selectOption({ index: 2 });
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await expect(historySelect).toHaveText(/履歴 \(2\)/);
		});
	});

// SKIP: Brand color history UI elements no longer exist in current UI
test.describe
	.skip("クリアボタン動作", () => {
		test("クリアボタンで履歴が削除される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const colorInput = page.locator(SELECTORS.brandColorInput);
			const historySelect = page.locator(SELECTORS.historySelect);
			const clearButton = page.locator(SELECTORS.historyClearButton);

			await colorInput.fill("#ff0000");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);
			await expect(historySelect).toBeEnabled();

			page.on("dialog", (dialog) => dialog.accept());
			await clearButton.click();
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

			await expect(historySelect).toBeDisabled();
			await expect(historySelect).toHaveText(/履歴なし/);
		});

		test("クリアボタンでlocalStorageも削除される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const colorInput = page.locator(SELECTORS.brandColorInput);
			const clearButton = page.locator(SELECTORS.historyClearButton);

			await colorInput.fill("#ff0000");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			page.on("dialog", (dialog) => dialog.accept());
			await clearButton.click();
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

			const storageValue = await page.evaluate(
				(key) => localStorage.getItem(key),
				STORAGE_KEY,
			);
			expect(storageValue).toBeNull();
		});
	});

// SKIP: Brand color history UI elements no longer exist in current UI
test.describe
	.skip("ページリロード後の永続化", () => {
		test("リロード後も履歴が保持される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await page.locator(SELECTORS.brandColorInput).fill("#ff0000");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await page.reload();
			await page.waitForSelector(SELECTORS.dadsSection, { timeout: 15000 });
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const historySelect = page.locator(SELECTORS.historySelect);
			await expect(historySelect).toBeEnabled();
			await expect(historySelect).toHaveText(/履歴 \(1\)/);
		});

		test("リロード後に履歴から色を復元できる", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await page.locator(SELECTORS.brandColorInput).fill("#aabbcc");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await page.reload();
			await page.waitForSelector(SELECTORS.dadsSection, { timeout: 15000 });
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await page.locator(SELECTORS.historySelect).selectOption({ index: 1 });
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const currentColor = await page
				.locator(SELECTORS.brandColorInput)
				.inputValue();
			expect(currentColor.toLowerCase()).toBe("#aabbcc");
		});
	});

// SKIP: Brand color history UI elements no longer exist in current UI
test.describe
	.skip("10件制限", () => {
		test("11件入力しても履歴は10件まで", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const colorInput = page.locator(SELECTORS.brandColorInput);
			const historySelect = page.locator(SELECTORS.historySelect);

			for (let i = 0; i < 11; i++) {
				const hex = `#${i.toString(16).padStart(2, "0")}${(i * 10).toString(16).padStart(2, "0")}${(i * 20).toString(16).padStart(2, "0")}`;
				await colorInput.fill(hex);
				await page.waitForTimeout(800);
			}

			await expect(historySelect).toHaveText(/履歴 \(10\)/);
			expect(await historySelect.locator("option").count()).toBe(11);
		});
	});

async function switchToView(
	page: Page,
	view: "studio" | "manual",
): Promise<void> {
	await page.click(`#view-${view}`);
	await page.waitForTimeout(TIMEOUTS.VIEW_SWITCH);
}

async function setAccentCount(page: Page, count: 1 | 2 | 3): Promise<void> {
	const testId = `accent-count-${count}`;
	const label = page.locator(`label:has([data-testid="${testId}"])`);
	await label.scrollIntoViewIfNeeded();
	await label.click();
	await expect(page.locator(`[data-testid="${testId}"]`)).toBeChecked();
}

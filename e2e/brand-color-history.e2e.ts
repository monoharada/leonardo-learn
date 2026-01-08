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

/**
 * タイムアウト定数
 */
const TIMEOUTS = {
	VIEW_SWITCH: 500,
	UI_UPDATE: 1000,
	DATA_LOAD: 2000,
	BEFORE_ACTION: 800,
	AFTER_ACTION: 800,
	RANDOM_SELECTION: 3000,
} as const;

/**
 * セレクター定数
 */
const SELECTORS = {
	randomButton: '[data-testid="random-color-button"]',
	brandColorInput: "#harmony-color-input",
	brandColorPicker: "#harmony-color-picker",
	historySelect: '[data-testid="brand-color-history-select"]',
	historyClearButton: '[data-testid="brand-color-history-clear"]',
	harmonyView: "#harmony-view",
	dadsSection: ".dads-section",
	accentCountSelect: '[data-testid="accent-count-select"]',
};

/**
 * localStorage キー
 */
const STORAGE_KEY = "leonardo-brandColorHistory";

// ============================================================================
// Test Setup
// ============================================================================

test.beforeEach(async ({ page }) => {
	// localStorageをクリア
	await page.goto("/");
	await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
	await page.reload();
	await page.waitForSelector(SELECTORS.dadsSection, { timeout: 15000 });
});

test.afterEach(async ({ page }) => {
	// テスト後にlocalStorageをクリア
	await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
});

// ============================================================================
// 1. 履歴ドロップダウン表示テスト
// ============================================================================

test.describe("履歴ドロップダウン表示", () => {
	test("履歴ドロップダウンが表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		const historySelect = page.locator(SELECTORS.historySelect);
		await expect(historySelect).toBeVisible({ timeout: 5000 });
	});

	test("初期状態で履歴なしと表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		const historySelect = page.locator(SELECTORS.historySelect);
		await expect(historySelect).toHaveText(/履歴なし/);
	});

	test("クリアボタンが表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		const clearButton = page.locator(SELECTORS.historyClearButton);
		await expect(clearButton).toBeVisible({ timeout: 5000 });
	});

	test("初期状態で履歴ドロップダウンが無効", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		const historySelect = page.locator(SELECTORS.historySelect);
		await expect(historySelect).toBeDisabled();
	});
});

// ============================================================================
// 2. ランダムボタンで履歴追加テスト
// ============================================================================

test.describe("ランダムボタンで履歴追加", () => {
	test("ランダムボタンクリックで履歴に追加される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		const randomButton = page.locator(SELECTORS.randomButton);
		const historySelect = page.locator(SELECTORS.historySelect);

		// ランダムボタンをクリック
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		await randomButton.click();
		await page.waitForTimeout(TIMEOUTS.RANDOM_SELECTION);

		// 履歴が追加され、ドロップダウンが有効になる
		await expect(historySelect).toBeEnabled();
		await expect(historySelect).toHaveText(/履歴 \(1\)/);
	});

	test("複数回ランダムで複数履歴が追加される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		const randomButton = page.locator(SELECTORS.randomButton);
		const historySelect = page.locator(SELECTORS.historySelect);

		// 3回クリック
		for (let i = 0; i < 3; i++) {
			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await randomButton.click();
			await page.waitForTimeout(TIMEOUTS.RANDOM_SELECTION);
		}

		// 3件以下の履歴が追加される（重複がある場合は少なくなる）
		const options = historySelect.locator("option:not(:disabled)");
		const count = await options.count();
		expect(count).toBeGreaterThanOrEqual(1);
		expect(count).toBeLessThanOrEqual(3);
	});
});

// ============================================================================
// 3. HEX入力で履歴追加テスト
// ============================================================================

test.describe("HEX入力で履歴追加", () => {
	test("HEX入力で履歴に追加される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		const colorInput = page.locator(SELECTORS.brandColorInput);
		const historySelect = page.locator(SELECTORS.historySelect);

		// HEX値を入力
		await colorInput.fill("#ff5500");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 履歴が追加される
		await expect(historySelect).toBeEnabled();
		await expect(historySelect).toHaveText(/履歴 \(1\)/);
	});

	test("入力した色が履歴に表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		const colorInput = page.locator(SELECTORS.brandColorInput);
		const historySelect = page.locator(SELECTORS.historySelect);

		// 特定のHEX値を入力
		await colorInput.fill("#aabbcc");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 履歴にその色が含まれることを確認
		const historyOptions = await historySelect
			.locator("option")
			.allTextContents();
		expect(historyOptions.some((text) => text.includes("#AABBCC"))).toBe(true);
	});
});

// ============================================================================
// 4. 履歴選択で色復元テスト
// ============================================================================

test.describe("履歴選択で色復元", () => {
	test("履歴から選択すると色が復元される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		const colorInput = page.locator(SELECTORS.brandColorInput);
		const historySelect = page.locator(SELECTORS.historySelect);

		// まず色を入力
		await colorInput.fill("#ff0000");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 別の色を入力
		await colorInput.fill("#00ff00");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 履歴から最初の色を選択
		// 履歴は新しい順なので、#00ff00が先頭、#ff0000が2番目
		await historySelect.selectOption({ index: 2 }); // 0はplaceholder, 1は#00ff00, 2は#ff0000
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 色が復元されることを確認
		const currentColor = await colorInput.inputValue();
		expect(currentColor.toLowerCase()).toBe("#ff0000");
	});

	test("履歴から選択するとアクセント数も復元される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		const colorInput = page.locator(SELECTORS.brandColorInput);
		const accentCountSelect = page.locator(SELECTORS.accentCountSelect);
		const historySelect = page.locator(SELECTORS.historySelect);

		// 3色パレット（アクセント2）で色を入力
		await accentCountSelect.selectOption("2");
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);
		await colorInput.fill("#ff0000");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 5色パレット（アクセント4）で別の色を入力
		await accentCountSelect.selectOption("4");
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);
		await colorInput.fill("#0000ff");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 履歴から最初の色（#ff0000 + 3色パレット）を選択
		await historySelect.selectOption({ index: 2 });
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// アクセント数も復元されることを確認
		const selectedAccentCount = await accentCountSelect.inputValue();
		expect(selectedAccentCount).toBe("2");
	});
});

// ============================================================================
// 5. 履歴選択時に再保存されないことのテスト
// ============================================================================

test.describe("履歴選択時に再保存されない", () => {
	test("履歴から選択しても履歴件数が増えない", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		const colorInput = page.locator(SELECTORS.brandColorInput);
		const historySelect = page.locator(SELECTORS.historySelect);

		// 2色入力
		await colorInput.fill("#ff0000");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);
		await colorInput.fill("#00ff00");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 履歴から選択
		await historySelect.selectOption({ index: 2 }); // #ff0000を選択
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 履歴件数が増えていないことを確認
		await expect(historySelect).toHaveText(/履歴 \(2\)/);
	});
});

// ============================================================================
// 6. クリアボタン動作テスト
// ============================================================================

test.describe("クリアボタン動作", () => {
	test("クリアボタンで履歴が削除される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		const colorInput = page.locator(SELECTORS.brandColorInput);
		const historySelect = page.locator(SELECTORS.historySelect);
		const clearButton = page.locator(SELECTORS.historyClearButton);

		// 色を入力
		await colorInput.fill("#ff0000");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 履歴があることを確認
		await expect(historySelect).toBeEnabled();

		// confirmダイアログをOKで処理
		page.on("dialog", (dialog) => dialog.accept());

		// クリアボタンをクリック
		await clearButton.click();
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		// 履歴がクリアされることを確認
		await expect(historySelect).toBeDisabled();
		await expect(historySelect).toHaveText(/履歴なし/);
	});

	test("クリアボタンでlocalStorageも削除される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		const colorInput = page.locator(SELECTORS.brandColorInput);
		const clearButton = page.locator(SELECTORS.historyClearButton);

		// 色を入力
		await colorInput.fill("#ff0000");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// confirmダイアログをOKで処理
		page.on("dialog", (dialog) => dialog.accept());

		// クリアボタンをクリック
		await clearButton.click();
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		// localStorageが削除されることを確認
		const storageValue = await page.evaluate(
			(key) => localStorage.getItem(key),
			STORAGE_KEY,
		);
		expect(storageValue).toBeNull();
	});
});

// ============================================================================
// 7. ページリロード後の永続化テスト
// ============================================================================

test.describe("ページリロード後の永続化", () => {
	test("リロード後も履歴が保持される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		const colorInput = page.locator(SELECTORS.brandColorInput);

		// 色を入力
		await colorInput.fill("#ff0000");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// ページをリロード
		await page.reload();
		await page.waitForSelector(SELECTORS.dadsSection, { timeout: 15000 });
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 履歴が保持されていることを確認
		const historySelect = page.locator(SELECTORS.historySelect);
		await expect(historySelect).toBeEnabled();
		await expect(historySelect).toHaveText(/履歴 \(1\)/);
	});

	test("リロード後に履歴から色を復元できる", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		const colorInput = page.locator(SELECTORS.brandColorInput);

		// 色を入力
		await colorInput.fill("#aabbcc");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// ページをリロード
		await page.reload();
		await page.waitForSelector(SELECTORS.dadsSection, { timeout: 15000 });
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 履歴から選択
		const historySelect = page.locator(SELECTORS.historySelect);
		await historySelect.selectOption({ index: 1 });
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 色が復元されることを確認
		const currentColor = await page
			.locator(SELECTORS.brandColorInput)
			.inputValue();
		expect(currentColor.toLowerCase()).toBe("#aabbcc");
	});
});

// ============================================================================
// 8. 10件制限テスト
// ============================================================================

test.describe("10件制限", () => {
	test("11件入力しても履歴は10件まで", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		const colorInput = page.locator(SELECTORS.brandColorInput);
		const historySelect = page.locator(SELECTORS.historySelect);

		// 11色入力
		for (let i = 0; i < 11; i++) {
			const hex = `#${i.toString(16).padStart(2, "0")}${(i * 10).toString(16).padStart(2, "0")}${(i * 20).toString(16).padStart(2, "0")}`;
			await colorInput.fill(hex);
			await page.waitForTimeout(800); // 短い待機時間
		}

		// 履歴が10件であることを確認
		await expect(historySelect).toHaveText(/履歴 \(10\)/);

		// オプション数も確認（placeholder + 10件 = 11）
		const options = historySelect.locator("option");
		const count = await options.count();
		expect(count).toBe(11);
	});
});

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

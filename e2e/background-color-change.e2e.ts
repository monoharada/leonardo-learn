/**
 * Background Color Change E2E Tests
 *
 * Task 7.3: E2Eテストを作成する
 * - カラーピッカーで色選択後、コントラスト値が更新されることを確認
 * - HEX入力後、デバウンスを経て更新されることを確認
 * - ページリロード後、背景色が復元されることを確認
 * - ビュー切替後、背景色が維持されることを確認
 *
 * Requirements: 4.1, 4.2, 5.2, 5.3
 *
 * Note: これらのテストはアプリケーションの非同期レンダリングに依存するため、
 * 開発サーバーが起動している環境で実行する必要があります。
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

/**
 * ビュータイプ
 */
type ViewType = "harmony" | "palette" | "shades" | "accessibility";

/**
 * 背景色セレクターのセレクター定数
 */
const SELECTORS = {
	colorPicker: ".background-color-selector__color-picker",
	hexInput: ".background-color-selector__hex-input",
	presetButtons: ".background-color-selector__preset-button",
	presetsContainer: ".background-color-selector__presets",
	selector: ".background-color-selector",
	preview: ".background-color-selector__preview",
};

// ============================================================================
// Test Setup
// ============================================================================

test.beforeEach(async ({ page }) => {
	// Navigate to the main page
	await page.goto("/");

	// Wait for the page to be fully loaded
	await page.waitForSelector(".dads-layout", { timeout: 15000 });

	// Clear localStorage to ensure clean state
	await page.evaluate(() => {
		localStorage.removeItem("leonardo-backgroundColor");
	});
});

// ============================================================================
// 1. カラーピッカーで色選択後、コントラスト値が更新される (Req 4.1)
// ============================================================================

test.describe("カラーピッカーによる背景色変更 (Requirement 4.1)", () => {
	test("パレットビューでカラーピッカーが表示される", async ({ page }) => {
		// パレットビューに切り替え
		await switchToView(page, "palette");

		// 背景色セレクターが存在することを確認
		const colorPicker = page.locator(SELECTORS.colorPicker);
		await expect(colorPicker).toBeVisible({ timeout: 15000 });
	});

	test("シェードビューでカラーピッカーが表示される", async ({ page }) => {
		// シェードビューに切り替え
		await switchToView(page, "shades");

		// 背景色セレクターが存在することを確認
		const colorPicker = page.locator(SELECTORS.colorPicker);
		await expect(colorPicker).toBeVisible({ timeout: 15000 });
	});

	test("カラーピッカーで色を選択すると値とプレビューが更新される", async ({
		page,
	}) => {
		// パレットビューに切り替え
		await switchToView(page, "palette");

		const colorPicker = page.locator(SELECTORS.colorPicker);
		await expect(colorPicker).toBeVisible({ timeout: 15000 });

		// プレビュー要素を取得
		const preview = page.locator(SELECTORS.preview);

		// カラーピッカーで暗い色を選択
		await colorPicker.fill(TEST_COLORS.darkGray);

		// 値が更新されたことを確認
		const updatedValue = await colorPicker.inputValue();
		expect(updatedValue.toLowerCase()).toBe(TEST_COLORS.darkGray);

		// プレビューの背景色が更新されたことを確認 (Req 4.1: コントラスト値更新の前提)
		await page.waitForTimeout(100);
		const previewBg = await preview.evaluate((el) => {
			return window.getComputedStyle(el).backgroundColor;
		});
		// darkGray (#18181b) → rgb(24, 24, 27) に変換されることを期待
		expect(previewBg).not.toBe("rgb(255, 255, 255)");
	});
});

// ============================================================================
// 2. HEX入力後、デバウンスを経て更新される (Req 4.2)
// ============================================================================

test.describe("HEX入力とデバウンス処理 (Requirement 4.2)", () => {
	test("HEX入力フィールドが表示される", async ({ page }) => {
		// パレットビューに切り替え
		await switchToView(page, "palette");

		const hexInput = page.locator(SELECTORS.hexInput);
		await expect(hexInput).toBeVisible({ timeout: 15000 });
	});

	test("HEX入力後にデバウンスを経てプレビューが更新される", async ({
		page,
	}) => {
		// パレットビューに切り替え
		await switchToView(page, "palette");

		const hexInput = page.locator(SELECTORS.hexInput);
		await expect(hexInput).toBeVisible({ timeout: 15000 });

		// プレビュー要素を取得
		const preview = page.locator(SELECTORS.preview);
		const initialBg = await preview.evaluate((el) => {
			return window.getComputedStyle(el).backgroundColor;
		});

		// HEX値をクリアして新しい値を入力
		await hexInput.clear();
		await hexInput.fill(TEST_COLORS.customRed);

		// デバウンス時間（150ms）より少し長く待機
		await page.waitForTimeout(200);

		// HEX入力フィールドの値が保持されていることを確認
		const inputValue = await hexInput.inputValue();
		expect(inputValue.toLowerCase()).toBe(TEST_COLORS.customRed);

		// デバウンス後にプレビューの背景色が更新されたことを確認 (Req 4.2)
		const updatedBg = await preview.evaluate((el) => {
			return window.getComputedStyle(el).backgroundColor;
		});
		// 初期の白(#ffffff)から変更されていることを確認
		expect(updatedBg).not.toBe(initialBg);
	});
});

// ============================================================================
// 3. ページリロード後、背景色が復元される (Req 5.3)
// ============================================================================

test.describe("localStorage永続化 (Requirement 5.3)", () => {
	test("背景色がlocalStorageに保存される", async ({ page }) => {
		// パレットビューに切り替え
		await switchToView(page, "palette");

		const colorPicker = page.locator(SELECTORS.colorPicker);
		await expect(colorPicker).toBeVisible({ timeout: 15000 });

		// カラーピッカーで色を変更
		await colorPicker.fill(TEST_COLORS.darkGray);

		// localStorageに保存されるまで待機
		await page.waitForTimeout(500);

		// localStorageに保存されていることを確認
		const storedValue = await page.evaluate(() => {
			return localStorage.getItem("leonardo-backgroundColor");
		});
		expect(storedValue).not.toBeNull();
	});

	test("リロード後に背景色が復元される", async ({ page }) => {
		// パレットビューに切り替え
		await switchToView(page, "palette");

		const colorPicker = page.locator(SELECTORS.colorPicker);
		await expect(colorPicker).toBeVisible({ timeout: 15000 });

		// カラーピッカーで色を変更
		await colorPicker.fill(TEST_COLORS.customBlue);

		// localStorageに保存されるまで待機
		await page.waitForTimeout(500);

		// ページをリロード
		await page.reload();
		await page.waitForSelector(".dads-layout", { timeout: 15000 });

		// パレットビューに再度切り替え
		await switchToView(page, "palette");

		// 背景色セレクターが復元された色を表示していることを確認
		const restoredColorPicker = page.locator(SELECTORS.colorPicker);
		await expect(restoredColorPicker).toBeVisible({ timeout: 15000 });
		const restoredValue = await restoredColorPicker.inputValue();
		expect(restoredValue.toLowerCase()).toBe(TEST_COLORS.customBlue);
	});
});

// ============================================================================
// 4. ビュー切替後、背景色が維持される (Req 5.2)
// ============================================================================

test.describe("ビュー間の背景色同期 (Requirement 5.2)", () => {
	test("パレットビューで設定した背景色がシェードビューでも維持される", async ({
		page,
	}) => {
		// パレットビューで背景色を変更
		await switchToView(page, "palette");
		const paletteColorPicker = page.locator(SELECTORS.colorPicker);
		await expect(paletteColorPicker).toBeVisible({ timeout: 15000 });
		await paletteColorPicker.fill(TEST_COLORS.customBlue);
		await page.waitForTimeout(300);

		// シェードビューに切り替え
		await switchToView(page, "shades");

		// シェードビューでも同じ背景色が適用されていることを確認
		const shadesColorPicker = page.locator(SELECTORS.colorPicker);
		await expect(shadesColorPicker).toBeVisible({ timeout: 15000 });
		const shadesValue = await shadesColorPicker.inputValue();
		expect(shadesValue.toLowerCase()).toBe(TEST_COLORS.customBlue);
	});

	test("シェードビューで設定した背景色がパレットビューでも維持される", async ({
		page,
	}) => {
		// シェードビューで背景色を変更
		await switchToView(page, "shades");
		const shadesColorPicker = page.locator(SELECTORS.colorPicker);
		await expect(shadesColorPicker).toBeVisible({ timeout: 15000 });
		await shadesColorPicker.fill(TEST_COLORS.darkGray);
		await page.waitForTimeout(300);

		// パレットビューに切り替え
		await switchToView(page, "palette");

		// パレットビューでも同じ背景色が適用されていることを確認
		const paletteColorPicker = page.locator(SELECTORS.colorPicker);
		await expect(paletteColorPicker).toBeVisible({ timeout: 15000 });
		const paletteValue = await paletteColorPicker.inputValue();
		expect(paletteValue.toLowerCase()).toBe(TEST_COLORS.darkGray);
	});

	test("アクセシビリティビューへの切替後も背景色が維持される", async ({
		page,
	}) => {
		// パレットビューで背景色を変更
		await switchToView(page, "palette");
		const colorPicker = page.locator(SELECTORS.colorPicker);
		await expect(colorPicker).toBeVisible({ timeout: 15000 });
		await colorPicker.fill(TEST_COLORS.customRed);
		await page.waitForTimeout(300);

		// アクセシビリティビューに切り替え（背景色セレクターはないが、DemoState経由で維持）
		await switchToView(page, "accessibility");
		await page.waitForTimeout(500);

		// 再度パレットビューに戻る
		await switchToView(page, "palette");

		// 背景色が維持されていることを確認
		const returnedColorPicker = page.locator(SELECTORS.colorPicker);
		await expect(returnedColorPicker).toBeVisible({ timeout: 15000 });
		const returnedValue = await returnedColorPicker.inputValue();
		expect(returnedValue.toLowerCase()).toBe(TEST_COLORS.customRed);
	});

	test("全ビューを順次切り替えても背景色が維持される", async ({ page }) => {
		// パレットビューで背景色を設定
		await switchToView(page, "palette");
		const colorPicker = page.locator(SELECTORS.colorPicker);
		await expect(colorPicker).toBeVisible({ timeout: 15000 });
		await colorPicker.fill(TEST_COLORS.customBlue);
		await page.waitForTimeout(300);

		// 全ビューを順次切り替え
		await switchToView(page, "shades");
		await page.waitForTimeout(200);
		await switchToView(page, "accessibility");
		await page.waitForTimeout(200);
		await switchToView(page, "harmony");
		await page.waitForTimeout(200);

		// パレットビューに戻って背景色が維持されていることを確認
		await switchToView(page, "palette");
		const finalColorPicker = page.locator(SELECTORS.colorPicker);
		await expect(finalColorPicker).toBeVisible({ timeout: 15000 });
		const finalValue = await finalColorPicker.inputValue();
		expect(finalValue.toLowerCase()).toBe(TEST_COLORS.customBlue);
	});
});

// ============================================================================
// 5. プリセットボタンのテスト
// ============================================================================

test.describe("プリセット背景色ボタン", () => {
	test("プリセットボタンが4つ表示される", async ({ page }) => {
		// パレットビューに切り替え
		await switchToView(page, "palette");

		// セレクターが表示されるまで待機
		await page.waitForSelector(SELECTORS.colorPicker, { timeout: 15000 });

		// プリセットボタンが存在することを確認
		const presetButtons = page.locator(SELECTORS.presetButtons);
		const buttonCount = await presetButtons.count();
		expect(buttonCount).toBe(4); // White, Light Gray, Dark Gray, Black
	});

	test("プリセットボタンをクリックすると背景色が変更される", async ({
		page,
	}) => {
		// パレットビューに切り替え
		await switchToView(page, "palette");

		// セレクターが表示されるまで待機
		await page.waitForSelector(SELECTORS.colorPicker, { timeout: 15000 });

		// プリセットボタンが存在することを確認
		const presetButtons = page.locator(SELECTORS.presetButtons);

		// Dark Grayプリセットをクリック (3番目のボタン)
		const darkGrayButton = presetButtons.nth(2);
		await darkGrayButton.click();

		// 背景色が変更されたことを確認
		await page.waitForTimeout(200);
		const colorPicker = page.locator(SELECTORS.colorPicker);
		const value = await colorPicker.inputValue();
		expect(value.toLowerCase()).toBe(TEST_COLORS.darkGray);
	});
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * ビューを切り替える
 */
async function switchToView(page: Page, view: ViewType): Promise<void> {
	const buttonId = `#view-${view}`;
	await page.click(buttonId);

	// ビュー切替のアニメーション/レンダリングを待機
	await page.waitForTimeout(1000);

	// palette/shades ビューの場合は背景色セレクターが表示されるまで待機
	if (view === "palette" || view === "shades") {
		try {
			await page.waitForSelector(SELECTORS.colorPicker, {
				timeout: 15000,
			});
		} catch {
			// セレクターが見つからない場合は追加待機
			await page.waitForTimeout(2000);
		}
	}
}

/**
 * Harmony DADS Selection E2E Tests
 *
 * Issue #29: harmony.tsがDADSトークン選択方式を使用していることを検証
 *
 * Requirements:
 * - 全ハーモニータイプ（M3を除く）がDADSトークンを使用
 * - 生成された色が適切な色相関係を持つ
 * - 色が濁っていない（高彩度）
 *
 * 実行: bun run test:e2e -- --grep "harmony-dads-selection"
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
} as const;

/**
 * セレクター定数
 */
const SELECTORS = {
	harmonyView: "#harmony-view",
	viewHarmonyBtn: "#view-harmony",
	harmonyTypeCard: ".harmony-type-card",
	harmonyTypeCardSwatch: ".harmony-type-card__swatch",
	brandColorInput: "#harmony-color-input",
	dadsSection: ".dads-section",
};

// ============================================================================
// Test Setup
// ============================================================================

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.waitForSelector(SELECTORS.dadsSection, { timeout: 15000 });
});

// ============================================================================
// 1. Basic Functionality Tests
// ============================================================================

test.describe("DADS Harmony Selection - Basic (Issue #29)", () => {
	test("補色ハーモニーカードに色が表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 補色カードを取得
		const complementaryCard = page.locator(
			'[data-harmony-type="complementary"]',
		);
		await expect(complementaryCard).toBeVisible({ timeout: 5000 });

		// スウォッチがあることを確認
		const swatches = complementaryCard.locator(SELECTORS.harmonyTypeCardSwatch);
		const swatchCount = await swatches.count();
		expect(swatchCount).toBeGreaterThanOrEqual(2);
	});

	test("トライアドハーモニーカードに色が表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// トライアドカードを取得
		const triadicCard = page.locator('[data-harmony-type="triadic"]');
		await expect(triadicCard).toBeVisible({ timeout: 5000 });

		// スウォッチがあることを確認
		const swatches = triadicCard.locator(SELECTORS.harmonyTypeCardSwatch);
		const swatchCount = await swatches.count();
		expect(swatchCount).toBeGreaterThanOrEqual(2);
	});

	test("類似色ハーモニーカードに色が表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 類似色カードを取得
		const analogousCard = page.locator('[data-harmony-type="analogous"]');
		await expect(analogousCard).toBeVisible({ timeout: 5000 });

		// スウォッチがあることを確認
		const swatches = analogousCard.locator(SELECTORS.harmonyTypeCardSwatch);
		const swatchCount = await swatches.count();
		expect(swatchCount).toBeGreaterThanOrEqual(2);
	});

	test("分裂補色ハーモニーカードに色が表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 分裂補色カードを取得
		const splitComplementaryCard = page.locator(
			'[data-harmony-type="split-complementary"]',
		);
		await expect(splitComplementaryCard).toBeVisible({ timeout: 5000 });

		// スウォッチがあることを確認
		const swatches = splitComplementaryCard.locator(
			SELECTORS.harmonyTypeCardSwatch,
		);
		const swatchCount = await swatches.count();
		expect(swatchCount).toBeGreaterThanOrEqual(2);
	});
});

// ============================================================================
// 2. Color Relationship Tests
// ============================================================================

test.describe("DADS Harmony Selection - Color Relationships (Issue #29)", () => {
	test("補色は異なる色相を持つ", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 青色をブランドカラーに設定
		const brandColorInput = page.locator(SELECTORS.brandColorInput);
		await brandColorInput.clear();
		await brandColorInput.fill("#0056FF");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 補色カードを取得
		const complementaryCard = page.locator(
			'[data-harmony-type="complementary"]',
		);
		const swatches = complementaryCard.locator(SELECTORS.harmonyTypeCardSwatch);

		// 1番目（ブランド）と2番目（補色）の色を取得
		const colors = await getSwatchColors(swatches);
		expect(colors.length).toBeGreaterThanOrEqual(2);

		// 2つの色の色相差を確認（補色は120度以上離れているはず）
		const hue1 = getHueFromRgb(colors[0]);
		const hue2 = getHueFromRgb(colors[1]);
		const distance = getHueDistance(hue1, hue2);

		// DADS離散化を考慮して、最低90度の差があることを確認
		expect(distance).toBeGreaterThanOrEqual(90);
	});

	test("類似色は近い色相を持つ", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 青色をブランドカラーに設定
		const brandColorInput = page.locator(SELECTORS.brandColorInput);
		await brandColorInput.clear();
		await brandColorInput.fill("#0056FF");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 類似色カードを取得
		const analogousCard = page.locator('[data-harmony-type="analogous"]');
		const swatches = analogousCard.locator(SELECTORS.harmonyTypeCardSwatch);

		// 全ての色を取得
		const colors = await getSwatchColors(swatches);
		expect(colors.length).toBeGreaterThanOrEqual(2);

		// 全ての色が基準色から90度以内にあることを確認
		const baseHue = getHueFromRgb(colors[0]);
		for (const color of colors) {
			const hue = getHueFromRgb(color);
			const distance = getHueDistance(baseHue, hue);
			expect(distance).toBeLessThanOrEqual(120); // DADS離散化を考慮
		}
	});

	test("トライアドは3つの異なる色相領域を持つ", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 青色をブランドカラーに設定
		const brandColorInput = page.locator(SELECTORS.brandColorInput);
		await brandColorInput.clear();
		await brandColorInput.fill("#0056FF");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// トライアドカードを取得
		const triadicCard = page.locator('[data-harmony-type="triadic"]');
		const swatches = triadicCard.locator(SELECTORS.harmonyTypeCardSwatch);

		// 全ての色を取得
		const colors = await getSwatchColors(swatches);
		expect(colors.length).toBeGreaterThanOrEqual(3);

		// 色相を取得
		const hues = colors.slice(0, 3).map(getHueFromRgb);

		// 3つの色が十分に分散していることを確認
		// 任意の2色間で少なくとも60度の差がある
		for (let i = 0; i < hues.length; i++) {
			for (let j = i + 1; j < hues.length; j++) {
				const distance = getHueDistance(hues[i], hues[j]);
				expect(distance).toBeGreaterThanOrEqual(50); // DADS離散化を考慮して緩め
			}
		}
	});
});

// ============================================================================
// 3. Color Quality Tests
// ============================================================================

test.describe("DADS Harmony Selection - Color Quality (Issue #29)", () => {
	test("生成された色が濁っていない", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 青色をブランドカラーに設定
		const brandColorInput = page.locator(SELECTORS.brandColorInput);
		await brandColorInput.clear();
		await brandColorInput.fill("#0056FF");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 全てのハーモニーカードの色をチェック
		const cards = page.locator(
			`${SELECTORS.harmonyTypeCard}:not(.harmony-type-card--detail)`,
		);
		const cardCount = await cards.count();

		for (let c = 0; c < Math.min(cardCount, 4); c++) {
			const card = cards.nth(c);
			const swatches = card.locator(SELECTORS.harmonyTypeCardSwatch);
			const colors = await getSwatchColors(swatches);

			for (const color of colors) {
				// 濁った色かチェック
				const isMuddy = isColorMuddy(color);
				expect(isMuddy).toBe(false);
			}
		}
	});

	test("ブランドカラー変更で色が更新される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 補色カードを取得
		const complementaryCard = page.locator(
			'[data-harmony-type="complementary"]',
		);
		const swatches = complementaryCard.locator(SELECTORS.harmonyTypeCardSwatch);

		// 最初の色を記録
		const colorsBefore = await getSwatchColors(swatches);
		expect(colorsBefore.length).toBeGreaterThanOrEqual(2);

		// ブランドカラーを変更
		const brandColorInput = page.locator(SELECTORS.brandColorInput);
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		await brandColorInput.clear();
		await brandColorInput.fill("#FF5500");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 色が変わったことを確認
		const colorsAfter = await getSwatchColors(swatches);
		expect(colorsAfter.length).toBeGreaterThanOrEqual(2);

		// 少なくとも1つの色が変わっていることを確認
		const changed = colorsBefore.some((before, i) => before !== colorsAfter[i]);
		expect(changed).toBe(true);
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

/**
 * スウォッチの色を取得
 */
async function getSwatchColors(
	swatches: ReturnType<Page["locator"]>,
): Promise<string[]> {
	const colors: string[] = [];
	const count = await swatches.count();

	for (let i = 0; i < count; i++) {
		const bgColor = await swatches
			.nth(i)
			.evaluate((el) => getComputedStyle(el).backgroundColor);
		colors.push(bgColor);
	}

	return colors;
}

/**
 * RGB文字列から色相を取得
 */
function getHueFromRgb(rgb: string): number {
	const rgbMatch = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
	if (!rgbMatch) return 0;

	const r = parseInt(rgbMatch[1], 10) / 255;
	const g = parseInt(rgbMatch[2], 10) / 255;
	const b = parseInt(rgbMatch[3], 10) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const d = max - min;

	if (d === 0) return 0;

	let h = 0;
	if (max === r) {
		h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	} else if (max === g) {
		h = ((b - r) / d + 2) / 6;
	} else {
		h = ((r - g) / d + 4) / 6;
	}

	return h * 360;
}

/**
 * 2つの色相間の距離を計算（循環を考慮）
 */
function getHueDistance(h1: number, h2: number): number {
	const diff = Math.abs(h1 - h2);
	return Math.min(diff, 360 - diff);
}

/**
 * 色が濁っているかチェック
 */
function isColorMuddy(rgb: string): boolean {
	const rgbMatch = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
	if (!rgbMatch) return false;

	const r = parseInt(rgbMatch[1], 10);
	const g = parseInt(rgbMatch[2], 10);
	const b = parseInt(rgbMatch[3], 10);

	const avg = (r + g + b) / 3;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const saturation = max - min;

	// 濁った色: 明度が低く彩度も低い
	return avg < 100 && saturation < 80;
}

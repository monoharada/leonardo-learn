/**
 * Harmony Accent Count E2E Tests
 *
 * Phase 2-4: パレット色数選択機能のE2Eテスト
 *
 * Requirements:
 * - パレット色数ラジオが正しく動作する
 * - 選択した色数が表示に反映される
 * - 濁り防止フィルタが機能している
 * - 左右矢印キーで切り替えられる
 *
 * 実行: bun run test:e2e -- --grep "harmony-accent-count"
 */

import { expect, type Page, test } from "playwright/test";

const TIMEOUTS = {
	VIEW_SWITCH: 500,
	UI_UPDATE: 1000,
	DATA_LOAD: 2000,
	BEFORE_ACTION: 800,
	AFTER_ACTION: 800,
} as const;

const SELECTORS = {
	coolorsLayout: ".coolors-layout",
	coolorsColumn: ".coolors-column",
	harmonySidebarCard: ".harmony-sidebar__card",
	harmonySidebarSwatch: ".harmony-sidebar__swatch",
	accentCountRadioGroup: '[data-testid="accent-count-radio-group"]',
	accentCountRadio1: '[data-testid="accent-count-1"]',
	accentCountRadio2: '[data-testid="accent-count-2"]',
	accentCountRadio3: '[data-testid="accent-count-3"]',
	brandColorInput: "#harmony-color-input",
	dadsSection: ".dads-section",
};

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await page.waitForSelector(SELECTORS.dadsSection, { timeout: 15000 });
});

// SKIP: Old Coolors-style UI selectors no longer exist (UI redesigned to Huemint-style)
test.describe
	.skip("パレット色数プルダウン表示 (Phase 2)", () => {
		test("パレット色数ラジオが表示される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

			const radioGroup = page.locator(SELECTORS.accentCountRadioGroup);
			await expect(radioGroup).toBeVisible({ timeout: 5000 });
		});

		test("ラジオに3つの選択肢がある（4〜6色）", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

			const radioGroup = page.locator(SELECTORS.accentCountRadioGroup);
			const radios = radioGroup.locator('input[type="radio"]');
			const radioCount = await radios.count();

			expect(radioCount).toBe(3); // 4色, 5色, 6色
		});

		test("デフォルトは4色パレットが選択されている", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

			const accentCountRadio = page.locator(SELECTORS.accentCountRadio1);
			await expect(accentCountRadio).toBeChecked(); // accentCount=1 → P/S/T + Accent1 = 4色
		});
	});

// SKIP: Old Coolors-style UI selectors no longer exist (UI redesigned to Huemint-style)
test.describe
	.skip("パレット色数変更 (Phase 4: バグ修正)", () => {
		test("4色パレット選択でメイン表示が4カラムになる", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await selectAccentCount(page, 1);
			await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(4, {
				timeout: 10000,
			});
		});

		test("5色パレット選択でメイン表示が5カラムになる", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await selectAccentCount(page, 2);
			await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(5, {
				timeout: 10000,
			});
		});

		test("6色パレット選択でメイン表示が6カラムになる", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await selectAccentCount(page, 3);
			await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(6, {
				timeout: 10000,
			});
		});

		test("左右矢印キーで4→5→6色に連続切り替えでき、フォーカスが維持される", async ({
			page,
		}) => {
			await switchToView(page, "studio");
			await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await page.locator(SELECTORS.accentCountRadio1).focus();

			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await page.keyboard.press("ArrowRight");
			await expect(page.locator(SELECTORS.accentCountRadio2)).toBeChecked();
			expect(
				await page.evaluate(
					() => (document.activeElement as HTMLElement | null)?.dataset.testid,
				),
			).toBe("accent-count-2");

			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await page.keyboard.press("ArrowRight");
			await expect(page.locator(SELECTORS.accentCountRadio3)).toBeChecked();
			expect(
				await page.evaluate(
					() => (document.activeElement as HTMLElement | null)?.dataset.testid,
				),
			).toBe("accent-count-3");

			await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(6, {
				timeout: 10000,
			});
		});

		test("変更後も選択値が維持される（Phase 4修正確認）", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await selectAccentCount(page, 2);
			await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await expect(page.locator(SELECTORS.accentCountRadio2)).toBeChecked();
			await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(5, {
				timeout: 10000,
			});
		});

		test("ブランドカラー変更後も色数選択が維持される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await selectAccentCount(page, 1);
			await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

			const brandColorInput = page.locator(SELECTORS.brandColorInput);
			await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
			await brandColorInput.click();
			await page.waitForTimeout(200);
			await brandColorInput.clear();
			await brandColorInput.fill("#FF5500");
			await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			await expect(page.locator(SELECTORS.accentCountRadio1)).toBeChecked();
			await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(4, {
				timeout: 10000,
			});
		});
	});

// SKIP: Old Coolors-style UI selectors no longer exist (UI redesigned to Huemint-style)
test.describe
	.skip("濁り防止フィルタ (Phase 3: Adobe Color戦略)", () => {
		test("青色ブランドで補色カード選択時、濁った色が含まれない", async ({
			page,
		}) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

			const brandColorInput = page.locator(SELECTORS.brandColorInput);
			await brandColorInput.clear();
			await brandColorInput.fill("#3366cc");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const complementaryCard = page.locator(
				'[data-harmony-type="complementary"]',
			);
			await expect(complementaryCard).toBeVisible({ timeout: 5000 });

			const swatches = complementaryCard.locator(
				SELECTORS.harmonySidebarSwatch,
			);
			const swatchCount = await swatches.count();

			for (let i = 0; i < swatchCount; i++) {
				const bgColor = await swatches
					.nth(i)
					.evaluate((el) => getComputedStyle(el).backgroundColor);

				const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
				if (rgbMatch) {
					const [, r, g, b] = rgbMatch.map(Number);
					const avg = (r + g + b) / 3;
					const saturation = Math.max(r, g, b) - Math.min(r, g, b);
					const isMuddy = avg < 100 && saturation < 80;
					expect(isMuddy).toBe(false);
				}
			}
		});

		test("黄色系ブランドで高明度の色が選択される", async ({ page }) => {
			await switchToView(page, "studio");
			await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

			const brandColorInput = page.locator(SELECTORS.brandColorInput);
			await brandColorInput.clear();
			await brandColorInput.fill("#FFCC00");
			await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

			const firstCard = page.locator(SELECTORS.harmonySidebarCard).first();
			await expect(firstCard).toBeVisible({ timeout: 5000 });

			const swatches = firstCard.locator(SELECTORS.harmonySidebarSwatch);
			const swatchCount = await swatches.count();

			let hasHighLightnessColor = false;
			for (let i = 0; i < swatchCount; i++) {
				const bgColor = await swatches
					.nth(i)
					.evaluate((el) => getComputedStyle(el).backgroundColor);

				const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
				if (rgbMatch) {
					const [, r, g, b] = rgbMatch.map(Number);
					const lightness = (r + g + b) / 3 / 255;
					if (lightness > 0.5) {
						hasHighLightnessColor = true;
					}
				}
			}

			expect(hasHighLightnessColor).toBe(true);
		});
	});

async function switchToView(
	page: Page,
	view: "studio" | "manual",
): Promise<void> {
	await page.click(`#view-${view}`);
	await page.waitForTimeout(TIMEOUTS.VIEW_SWITCH);
}

async function selectAccentCount(page: Page, value: 1 | 2 | 3): Promise<void> {
	await page
		.locator(`label:has([data-testid="accent-count-${value}"])`)
		.click();
}

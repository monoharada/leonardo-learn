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

/**
 * タイムアウト定数
 *
 * 人間的な操作の可視化: UIコンポーネント操作の前後に待機時間を挿入し、
 * 動画で操作が確認できるようにする (CLAUDE.md E2E Video Evidence Requirements)
 */
const TIMEOUTS = {
	/** ビュー切り替えアニメーション完了待ち */
	VIEW_SWITCH: 500,
	/** UI更新完了待ち（レンダリング） */
	UI_UPDATE: 1000,
	/** データ読み込み・パレット生成完了待ち */
	DATA_LOAD: 2000,
	/** 操作前の待機時間（動画で操作が見えるように） */
	BEFORE_ACTION: 800,
	/** 操作後の待機時間（動画で結果が見えるように） */
	AFTER_ACTION: 800,
} as const;

/**
 * セレクター定数
 */
const SELECTORS = {
	// ビュー切り替え
	harmonyView: "#harmony-view",
	viewHarmonyBtn: "#view-harmony",
	viewPaletteBtn: "#view-palette",

	// Coolors表示
	coolorsLayout: ".coolors-layout",
	coolorsColumn: ".coolors-column",

	// ハーモニーサイドバー（プレビュー）
	harmonySidebarCard: ".harmony-sidebar__card",
	harmonySidebarSwatch: ".harmony-sidebar__swatch",

	// パレット色数（CLAUDE.md準拠: data-testidを使用）
	accentCountRadioGroup: '[data-testid="accent-count-radio-group"]',
	accentCountRadio1: '[data-testid="accent-count-1"]',
	accentCountRadio2: '[data-testid="accent-count-2"]',
	accentCountRadio3: '[data-testid="accent-count-3"]',

	// ブランドカラー入力
	brandColorInput: "#harmony-color-input",

	// Demo Layout
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
// 1. パレット色数プルダウン表示テスト (Phase 2)
// ============================================================================

test.describe("パレット色数プルダウン表示 (Phase 2)", () => {
	test("パレット色数ラジオが表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		const radioGroup = page.locator(SELECTORS.accentCountRadioGroup);
		await expect(radioGroup).toBeVisible({ timeout: 5000 });
	});

	test("ラジオに3つの選択肢がある（4〜6色）", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		const radioGroup = page.locator(SELECTORS.accentCountRadioGroup);
		const radios = radioGroup.locator('input[type="radio"]');
		const radioCount = await radios.count();

		expect(radioCount).toBe(3); // 4色, 5色, 6色
	});

	test("デフォルトは4色パレットが選択されている", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		const accentCountRadio = page.locator(SELECTORS.accentCountRadio1);
		await expect(accentCountRadio).toBeChecked(); // accentCount=1 → P/S/T + Accent1 = 4色
	});
});

// ============================================================================
// 2. パレット色数変更テスト (Phase 4: バグ修正)
// ============================================================================

test.describe("パレット色数変更 (Phase 4: バグ修正)", () => {
	test("4色パレット選択でメイン表示が4カラムになる", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 4色パレットを選択
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION); // 操作前待機

		await selectAccentCount(page, 1); // 4色

		await page.waitForTimeout(TIMEOUTS.AFTER_ACTION); // 操作後待機
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(4, {
			timeout: 10000,
		});
	});

	test("5色パレット選択でメイン表示が5カラムになる", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 5色パレットを選択
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION); // 操作前待機

		await selectAccentCount(page, 2); // 5色

		await page.waitForTimeout(TIMEOUTS.AFTER_ACTION); // 操作後待機
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(5, {
			timeout: 10000,
		});
	});

	test("6色パレット選択でメイン表示が6カラムになる", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 6色パレットを選択
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION); // 操作前待機

		await selectAccentCount(page, 3); // 6色

		await page.waitForTimeout(TIMEOUTS.AFTER_ACTION); // 操作後待機
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(6, {
			timeout: 10000,
		});
	});

	test("左右矢印キーで4→5→6色に連続切り替えでき、フォーカスが維持される", async ({
		page,
	}) => {
		await switchToView(page, "harmony");
		await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 4色（デフォルト）にフォーカス
		await page.locator(SELECTORS.accentCountRadio1).focus();

		// → 5色
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		await page.keyboard.press("ArrowRight");
		await expect(page.locator(SELECTORS.accentCountRadio2)).toBeChecked();

		const active1 = await page.evaluate(
			() => (document.activeElement as HTMLElement | null)?.dataset.testid,
		);
		expect(active1).toBe("accent-count-2");

		// → 6色
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION);
		await page.keyboard.press("ArrowRight");
		await expect(page.locator(SELECTORS.accentCountRadio3)).toBeChecked();

		const active2 = await page.evaluate(
			() => (document.activeElement as HTMLElement | null)?.dataset.testid,
		);
		expect(active2).toBe("accent-count-3");

		// メイン表示のカラム数も6色に更新される
		await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(6, {
			timeout: 10000,
		});
	});

	test("変更後も選択値が維持される（Phase 4修正確認）", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 5色パレットを選択
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION); // 操作前待機

		await selectAccentCount(page, 2); // 5色

		await page.waitForTimeout(TIMEOUTS.AFTER_ACTION); // 操作後待機
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 選択値が維持されているか確認
		await expect(page.locator(SELECTORS.accentCountRadio2)).toBeChecked();

		// メイン表示のカラム数も5色であることを再確認
		await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(5, {
			timeout: 10000,
		});
	});

	test("ブランドカラー変更後も色数選択が維持される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForSelector(SELECTORS.coolorsLayout, { timeout: 10000 });
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// まず4色パレットを選択
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION); // 操作前待機

		await selectAccentCount(page, 1); // 4色

		await page.waitForTimeout(TIMEOUTS.AFTER_ACTION); // 操作後待機
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		// ブランドカラーを変更
		const brandColorInput = page.locator(SELECTORS.brandColorInput);
		await page.waitForTimeout(TIMEOUTS.BEFORE_ACTION); // 操作前待機
		await brandColorInput.click();
		await page.waitForTimeout(200);
		await brandColorInput.clear();
		await brandColorInput.fill("#FF5500");
		await page.waitForTimeout(TIMEOUTS.AFTER_ACTION); // 操作後待機
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 色数選択が4色のままであることを確認
		await expect(page.locator(SELECTORS.accentCountRadio1)).toBeChecked();

		// メイン表示のカラム数も4色であることを確認
		await expect(page.locator(SELECTORS.coolorsColumn)).toHaveCount(4, {
			timeout: 10000,
		});
	});
});

// ============================================================================
// 3. 濁り防止フィルタテスト (Phase 3)
// ============================================================================

test.describe("濁り防止フィルタ (Phase 3: Adobe Color戦略)", () => {
	test("青色ブランドで補色カード選択時、濁った色が含まれない", async ({
		page,
	}) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		// 青色をブランドカラーに設定
		const brandColorInput = page.locator(SELECTORS.brandColorInput);
		await brandColorInput.clear();
		await brandColorInput.fill("#3366cc");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// 補色カードのスウォッチ色を取得
		const complementaryCard = page.locator(
			'[data-harmony-type="complementary"]',
		);
		await expect(complementaryCard).toBeVisible({ timeout: 5000 });

		const swatches = complementaryCard.locator(SELECTORS.harmonySidebarSwatch);
		const swatchColors: string[] = [];

		const swatchCount = await swatches.count();
		for (let i = 0; i < swatchCount; i++) {
			const bgColor = await swatches
				.nth(i)
				.evaluate((el) => getComputedStyle(el).backgroundColor);
			swatchColors.push(bgColor);
		}

		// 濁った茶色/オリーブ色（#6e5600, #604b00など）が含まれていないことを確認
		// RGB変換時に濁った色の特徴: R > G > B かつ Gが低い
		for (const color of swatchColors) {
			const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
			if (rgbMatch) {
				const [, r, g, b] = rgbMatch.map(Number);
				// 濁った茶色/オリーブの特徴: 明度が低く、彩度も低い
				// (r + g + b) / 3 < 100 かつ max - min < 50 は濁った色
				const avg = (r + g + b) / 3;
				const max = Math.max(r, g, b);
				const min = Math.min(r, g, b);
				const saturation = max - min;

				// 明度が低く彩度も低い色は濁っている
				const isMuddy = avg < 100 && saturation < 80;
				expect(isMuddy).toBe(false);
			}
		}
	});

	test("黄色系ブランドで高明度の色が選択される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(TIMEOUTS.UI_UPDATE);

		// 黄色をブランドカラーに設定
		const brandColorInput = page.locator(SELECTORS.brandColorInput);
		await brandColorInput.clear();
		await brandColorInput.fill("#FFCC00");
		await page.waitForTimeout(TIMEOUTS.DATA_LOAD);

		// ハーモニーカードのスウォッチ色を取得
		const firstCard = page.locator(SELECTORS.harmonySidebarCard).first();
		await expect(firstCard).toBeVisible({ timeout: 5000 });

		const swatches = firstCard.locator(SELECTORS.harmonySidebarSwatch);
		const swatchCount = await swatches.count();

		// 各スウォッチの明度をチェック
		let hasHighLightnessColor = false;
		for (let i = 0; i < swatchCount; i++) {
			const bgColor = await swatches
				.nth(i)
				.evaluate((el) => getComputedStyle(el).backgroundColor);

			const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
			if (rgbMatch) {
				const [, r, g, b] = rgbMatch.map(Number);
				// 明度 = (R + G + B) / 3 / 255
				const lightness = (r + g + b) / 3 / 255;
				if (lightness > 0.5) {
					hasHighLightnessColor = true;
				}
			}
		}

		// 高明度の色が含まれていることを確認
		expect(hasHighLightnessColor).toBe(true);
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

async function selectAccentCount(page: Page, value: 1 | 2 | 3): Promise<void> {
	// input自体は視覚的に非表示のため、labelをクリックする
	await page
		.locator(`label:has([data-testid="accent-count-${value}"])`)
		.click();
}

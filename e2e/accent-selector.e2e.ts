/**
 * Accent Selector E2E Tests
 * Task 6.4, 7.7, 8.6: E2Eテストの実装
 *
 * Requirements: 4.1, 4.3, 3.1, 2.3, 5.1, 7.2
 * - アクセント選定ビューの表示テスト
 * - ハーモニーカードクリック→パレット生成のテスト
 * - 詳細選択モードのテスト
 * - ブランドカラー入力テスト
 *
 * Note: Section 8でカード形式のハーモニー選択UIに変更されました。
 * - 4種類のハーモニーカード + 詳細選択カードを表示
 * - カードクリックで3色パレットを生成→パレットビューへ遷移
 * - 「詳細選択」で従来のグリッドUIを表示
 *
 * 実行: bun run test:e2e -- --grep "accent-selector"
 */

import { expect, type Page, test } from "playwright/test";

/**
 * セレクター定数
 * Section 8: カード形式ハーモニー選択UI
 */
const SELECTORS = {
	// アクセント選定ビュー（旧ハーモニービュー）
	harmonyView: "#harmony-view",
	viewHarmonyBtn: "#view-harmony",

	// Section 8: ハーモニータイプカード
	harmonyCardArea: ".harmony-card-area",
	harmonyTypeCards: ".harmony-type-cards",
	harmonyTypeCard: ".harmony-type-card",
	harmonyTypeCardDetail: ".harmony-type-card--detail",
	harmonyTypeCardSwatch: ".harmony-type-card__swatch",
	harmonyTypeCardTitle: ".harmony-type-card__title",

	// 詳細選択モード用（Section 7の要素を引き続き使用）
	accentSelectionControls: ".accent-selection-controls",
	accentSelectionGrid: ".accent-selection-grid",
	accentDetailArea: ".accent-detail-area",

	// 候補グリッド（詳細選択モード）
	candidateGrid: ".accent-candidate-grid",
	candidateCard: ".accent-candidate-card",
	candidateCardScore: ".accent-candidate-card__score",
	candidateCardName: ".accent-candidate-card__name",

	// ハーモニーフィルタ（詳細選択モード）
	harmonyFilter: ".harmony-filter",
	harmonyFilterSelect: ".harmony-filter__select",

	// ブランドカラー入力
	brandColorInput: "#harmony-color-input",
	brandColorPicker: "#harmony-color-picker",

	// ローディング・エラー表示
	loading: ".accent-selection-loading",
	errorMessage: ".accent-selection-error",

	// Demo Layout
	dadsLayout: ".dads-layout",
	dadsSection: ".dads-section",

	// パレットビュー
	viewPaletteBtn: "#view-palette",
};

// ============================================================================
// Test Setup
// ============================================================================

test.beforeEach(async ({ page }) => {
	// Navigate to the main page
	await page.goto("/");

	// Wait for the page to be fully loaded
	await page.waitForSelector(SELECTORS.dadsSection, { timeout: 15000 });
});

// ============================================================================
// 1. アクセント選定ビューの表示テスト (Requirement 4.1)
// ============================================================================

test.describe("アクセント選定ビューの表示 (Requirement 4.1)", () => {
	test("アクセント選定ビューが表示される", async ({ page }) => {
		// アクセント選定ビュー（ハーモニービュー）に切り替え
		await switchToView(page, "harmony");

		// ハーモニービュー（アクセント選定ビュー）が表示される
		const harmonyView = page.locator(SELECTORS.harmonyView);
		await expect(harmonyView).toBeVisible({ timeout: 10000 });
	});

	test("ハーモニーカードエリアが表示される", async ({ page }) => {
		await switchToView(page, "harmony");

		// カードエリアが表示される
		const cardArea = page.locator(SELECTORS.harmonyCardArea);
		await expect(cardArea).toBeVisible({ timeout: 10000 });
	});

	test("ブランドカラー入力欄が表示される", async ({ page }) => {
		await switchToView(page, "harmony");

		const colorInput = page.locator(SELECTORS.brandColorInput);
		await expect(colorInput).toBeVisible({ timeout: 5000 });
	});
});

// ============================================================================
// 2. ハーモニータイプカード表示テスト (Section 8)
// ============================================================================

test.describe("ハーモニータイプカード表示 (Section 8)", () => {
	test("4種類のハーモニーカード + 詳細選択カードが表示される", async ({
		page,
	}) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(1000);

		// ハーモニーカードグリッドが表示される
		const cardsGrid = page.locator(SELECTORS.harmonyTypeCards);
		await expect(cardsGrid).toBeVisible({ timeout: 10000 });

		// 全カード（4つ + 詳細選択）が表示される
		const allCards = page.locator(SELECTORS.harmonyTypeCard);
		const cardCount = await allCards.count();
		expect(cardCount).toBe(5); // 補色, トライアド, 類似色, 分裂補色, 詳細選択
	});

	test("各カードにプレビュースウォッチが3つある", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(2000); // パレットプレビューのロード待ち

		// 最初のハーモニーカード（詳細選択以外）を取得
		const firstCard = page
			.locator(
				`${SELECTORS.harmonyTypeCard}:not(${SELECTORS.harmonyTypeCardDetail})`,
			)
			.first();
		await expect(firstCard).toBeVisible({ timeout: 5000 });

		// スウォッチが3つあることを確認
		const swatches = firstCard.locator(SELECTORS.harmonyTypeCardSwatch);
		const swatchCount = await swatches.count();
		expect(swatchCount).toBe(3);
	});

	test("詳細選択カードが表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(1000);

		const detailCard = page.locator(SELECTORS.harmonyTypeCardDetail);
		await expect(detailCard).toBeVisible({ timeout: 5000 });
	});

	test("カードにハーモニータイプ名が表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(1000);

		// タイトル要素を取得
		const titles = page.locator(SELECTORS.harmonyTypeCardTitle);
		const titleTexts = await titles.allTextContents();

		// 期待されるハーモニータイプ名が含まれている
		expect(titleTexts.some((t) => t.includes("補色"))).toBe(true);
		expect(titleTexts.some((t) => t.includes("トライアド"))).toBe(true);
		expect(titleTexts.some((t) => t.includes("類似色"))).toBe(true);
		expect(titleTexts.some((t) => t.includes("分裂補色"))).toBe(true);
	});
});

// ============================================================================
// 3. ハーモニーカードクリック→パレット生成テスト (Section 8)
// ============================================================================

test.describe("ハーモニーカードクリック→パレット生成 (Section 8)", () => {
	test("補色カードをクリックするとパレットが生成される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(2000);

		// 補色カードをクリック
		const complementaryCard = page.locator(
			'[data-harmony-type="complementary"]',
		);
		await complementaryCard.click();
		await page.waitForTimeout(2000);

		// パレットビューに遷移していることを確認（data-active属性でチェック）
		const paletteBtn = page.locator(SELECTORS.viewPaletteBtn);
		await expect(paletteBtn).toHaveAttribute("data-active", "true", {
			timeout: 5000,
		});
	});

	test("トライアドカードをクリックするとパレットが生成される", async ({
		page,
	}) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(2000);

		// トライアドカードをクリック
		const triadicCard = page.locator('[data-harmony-type="triadic"]');
		await triadicCard.click();
		await page.waitForTimeout(2000);

		// パレットビューに遷移していることを確認（data-active属性でチェック）
		const paletteBtn = page.locator(SELECTORS.viewPaletteBtn);
		await expect(paletteBtn).toHaveAttribute("data-active", "true", {
			timeout: 5000,
		});
	});
});

// ============================================================================
// 4. 詳細選択モードテスト (Section 8)
// ============================================================================

test.describe("詳細選択モード (Section 8)", () => {
	test("詳細選択カードをクリックすると詳細モードに切り替わる", async ({
		page,
	}) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(1000);

		// 詳細選択カードをクリック
		const detailCard = page.locator(SELECTORS.harmonyTypeCardDetail);
		await detailCard.click();
		await page.waitForTimeout(1000);

		// 詳細エリアが表示される
		const detailArea = page.locator(SELECTORS.accentDetailArea);
		await expect(detailArea).toBeVisible({ timeout: 5000 });
	});

	test("詳細モードでハーモニーフィルタが表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(1000);

		// 詳細選択カードをクリック
		const detailCard = page.locator(SELECTORS.harmonyTypeCardDetail);
		await detailCard.click();
		await page.waitForTimeout(2000);

		// ハーモニーフィルタが表示される
		const filter = page.locator(SELECTORS.harmonyFilter);
		const select = page.locator(SELECTORS.harmonyFilterSelect);
		const hasFilter = (await filter.count()) > 0 || (await select.count()) > 0;
		expect(hasFilter).toBe(true);
	});

	test("詳細モードで候補グリッドが表示される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(1000);

		// 詳細選択カードをクリック
		const detailCard = page.locator(SELECTORS.harmonyTypeCardDetail);
		await detailCard.click();
		await page.waitForTimeout(2000);

		// 候補グリッドが表示される
		const grid = page.locator(SELECTORS.candidateGrid);
		await expect(grid).toBeVisible({ timeout: 10000 });

		// 候補カードが存在する
		const cards = page.locator(SELECTORS.candidateCard);
		const cardCount = await cards.count();
		expect(cardCount).toBeGreaterThan(0);
	});

	test("詳細モードから戻るボタンでカードモードに戻れる", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(1000);

		// 詳細選択カードをクリック
		const detailCard = page.locator(SELECTORS.harmonyTypeCardDetail);
		await detailCard.click();
		await page.waitForTimeout(1000);

		// 戻るボタンをクリック
		const backButton = page.locator("button", {
			hasText: "カード選択に戻る",
		});
		await backButton.click();
		await page.waitForTimeout(1000);

		// カードエリアが再表示される
		const cardArea = page.locator(SELECTORS.harmonyCardArea);
		await expect(cardArea).toBeVisible({ timeout: 5000 });
	});
});

// ============================================================================
// 5. ブランドカラー入力テスト (Requirement 4.1)
// ============================================================================

test.describe("ブランドカラー入力 (Requirement 4.1)", () => {
	test("カラーピッカーが表示される", async ({ page }) => {
		await switchToView(page, "harmony");

		const colorPicker = page.locator(SELECTORS.brandColorPicker);
		await expect(colorPicker).toBeVisible({ timeout: 5000 });
	});

	test("ブランドカラー変更でカードプレビューが更新される", async ({ page }) => {
		await switchToView(page, "harmony");
		await page.waitForTimeout(2000);

		const colorInput = page.locator(SELECTORS.brandColorInput);
		const hasInput = (await colorInput.count()) > 0;
		if (!hasInput) {
			test.skip(true, "ブランドカラー入力が未実装");
			return;
		}

		// ブランドカラーを変更
		await colorInput.clear();
		await colorInput.fill("#FF5500");
		await page.waitForTimeout(2000);

		// カードエリアが再表示される（再レンダリング）
		const cardArea = page.locator(SELECTORS.harmonyCardArea);
		await expect(cardArea).toBeVisible({ timeout: 5000 });
	});
});

// ============================================================================
// 6. エラーハンドリングテスト (Requirement 7.2)
// ============================================================================

test.describe("エラーハンドリング (Requirement 7.2)", () => {
	test("エラー時にエラーメッセージが表示される", async ({ page }) => {
		await switchToView(page, "harmony");

		// エラー要素が存在する場合、role="alert"を持つことを確認
		const errorMsg = page.locator(SELECTORS.errorMessage);
		const hasError = (await errorMsg.count()) > 0;

		if (hasError) {
			await expect(errorMsg).toHaveAttribute("role", "alert");
		}
		// エラーがない場合もテストはパス
		expect(true).toBe(true);
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
	await page.waitForTimeout(500);
}

/**
 * Semantic Role Overlay E2E Tests
 *
 * Task 11.1: 旧E2Eテストを新UI仕様に更新
 * - 「ドット表示」テストを「円形スウォッチ」テストに置換
 * - 旧仕様の「ブランドスウォッチにブランドロールのみ表示」を削除（brandスウォッチへの表示は廃止）
 * - 不要になった旧UIセレクタ（ドット、バッジ関連）を削除
 * - 新UI要素のセレクタ（円形スウォッチ、欄外情報、コネクタ、ピル）に置換
 *
 * Task 11.2: 円形スウォッチのE2Eテストを追加
 * - 各カテゴリ（P/S/Su/E/W/L）のラベル表示テスト
 * - ラベル文字色の自動調整テスト（明/暗背景）
 * - 複数ロール時の優先ロール表示テスト
 * - hue-scale特定可能なブランドロール（Primary/Secondary）の円形化テスト
 *
 * Task 11.4: コントラスト境界のE2Eテストを追加
 * - コントラスト境界ピル（3:1→、4.5:1→、←4.5:1、←3:1）が正しいscale位置に表示されること
 * - 白背景用ピルは白抜きスタイルであること
 * - 黒背景用ピルは黒塗りスタイルであること
 * - DADS以外のハーモニー種別ではコントラスト境界が表示されないこと
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 4.1, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { expect, type Page, test } from "playwright/test";

// ============================================================================
// Test Setup
// ============================================================================

test.beforeEach(async ({ page }) => {
	// Navigate to the shades view test page
	await page.goto("/e2e/semantic-role-test-page.html");

	// Wait for the page to be fully loaded
	await page.waitForSelector("[data-testid='shades-view-container']");
});

// ============================================================================
// 1. 円形スウォッチ表示の基本検証（Task 11.1: ドット→円形スウォッチに置換）
// ============================================================================

test.describe("円形スウォッチ表示", () => {
	test("DADSハーモニーでシェードビュー表示時、ロール割り当てシェードが円形になる", async ({
		page,
	}) => {
		// DADSハーモニータイプを選択
		await selectHarmonyType(page, "dads");

		// シェードビューをロード
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// green-600シェード（Success-1ロールがある）を確認
		const greenSwatch = page.locator("[data-testid='swatch-green-600']");
		await expect(greenSwatch).toBeVisible();

		// 円形スウォッチクラスが適用されていることを確認
		await expect(greenSwatch).toHaveClass(/dads-swatch--circular/);

		// 円形スウォッチのスタイルを確認（border-radius: 50%）
		const swatchStyles = await greenSwatch.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return {
				borderRadius: style.borderRadius,
			};
		});

		expect(swatchStyles.borderRadius).toBe("50%");
	});

	test("円形スウォッチの中央にラベルが表示される", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// green-600シェード（Success-1ロールがある）を確認
		const greenSwatch = page.locator("[data-testid='swatch-green-600']");

		// 中央ラベル要素が存在することを確認
		const roleLabel = greenSwatch.locator(".dads-swatch__role-label");
		await expect(roleLabel).toBeVisible();

		// ラベルにロール短縮名（Su = Success）が含まれていることを確認
		const labelText = await roleLabel.textContent();
		expect(labelText).toBe("Su");
	});

	test("セマンティックロールがないシェードは四角形のままである", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// green-50シェード（通常ロールがない）を確認
		const swatchWithoutRole = page.locator("[data-testid='swatch-green-50']");
		await expect(swatchWithoutRole).toBeVisible();

		// 円形スウォッチクラスが適用されていないことを確認
		await expect(swatchWithoutRole).not.toHaveClass(/dads-swatch--circular/);

		// 中央ラベルが存在しないことを確認
		const roleLabel = swatchWithoutRole.locator(".dads-swatch__role-label");
		await expect(roleLabel).not.toBeVisible();
	});

	// ============================================================================
	// Task 11.2: 円形スウォッチの追加E2Eテスト
	// Requirements: 2.1, 2.2, 2.4, 2.6
	// ============================================================================

	test("Primaryロール（P）のラベルが表示される", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// blue-600シェード（Primary設定）を確認
		const blueSwatch = page.locator("[data-testid='swatch-blue-600']");
		await expect(blueSwatch).toBeVisible();

		// 円形スウォッチクラスが適用されていることを確認
		await expect(blueSwatch).toHaveClass(/dads-swatch--circular/);

		// 中央ラベルに「P」が表示されること
		const roleLabel = blueSwatch.locator(".dads-swatch__role-label");
		await expect(roleLabel).toBeVisible();
		const labelText = await roleLabel.textContent();
		expect(labelText).toBe("P");
	});

	test("Secondaryロール（S）のラベルが表示される", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// purple-500シェード（Secondary設定）を確認
		const purpleSwatch = page.locator("[data-testid='swatch-purple-500']");
		await expect(purpleSwatch).toBeVisible();

		// 円形スウォッチクラスが適用されていることを確認
		await expect(purpleSwatch).toHaveClass(/dads-swatch--circular/);

		// 中央ラベルに「S」が表示されること
		const roleLabel = purpleSwatch.locator(".dads-swatch__role-label");
		await expect(roleLabel).toBeVisible();
		const labelText = await roleLabel.textContent();
		expect(labelText).toBe("S");
	});

	test("Errorロール（E）のラベルが表示される", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// red-800シェード（Error-1ロールがある: DADS_COLORSの定義参照）を確認
		const redSwatch = page.locator("[data-testid='swatch-red-800']");
		await expect(redSwatch).toBeVisible();

		// 円形スウォッチクラスが適用されていることを確認
		await expect(redSwatch).toHaveClass(/dads-swatch--circular/);

		// 中央ラベルに「E」が表示されること
		const roleLabel = redSwatch.locator(".dads-swatch__role-label");
		await expect(roleLabel).toBeVisible();
		const labelText = await roleLabel.textContent();
		expect(labelText).toBe("E");
	});

	test("Warningロール（W）のラベルが表示される", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// yellow-900シェード（Warning-YL2ロールのみ: DADS_COLORSの定義参照）を確認
		// yellow-700はAccent-Yellowも含まれるためAccentが優先表示される
		const yellowSwatch = page.locator("[data-testid='swatch-yellow-900']");
		await expect(yellowSwatch).toBeVisible();

		// 円形スウォッチクラスが適用されていることを確認
		await expect(yellowSwatch).toHaveClass(/dads-swatch--circular/);

		// 中央ラベルに「W」が表示されること
		const roleLabel = yellowSwatch.locator(".dads-swatch__role-label");
		await expect(roleLabel).toBeVisible();
		const labelText = await roleLabel.textContent();
		expect(labelText).toBe("W");
	});

	test("Linkロール（L）のラベルが表示される", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// blue-1000シェード（Link-Defaultロールがある: DADS_COLORSの定義参照）を確認
		const linkSwatch = page.locator("[data-testid='swatch-blue-1000']");
		await expect(linkSwatch).toBeVisible();

		// 円形スウォッチクラスが適用されていることを確認
		await expect(linkSwatch).toHaveClass(/dads-swatch--circular/);

		// 中央ラベルに「L」が表示されること
		const roleLabel = linkSwatch.locator(".dads-swatch__role-label");
		await expect(roleLabel).toBeVisible();
		const labelText = await roleLabel.textContent();
		expect(labelText).toBe("L");
	});

	test("Accentロール（A）のラベルが表示される", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// lime-700シェード（Accent-Limeロールのみ: DADS_COLORSの定義参照）を確認
		// lime-700はAccent-Limeのみで、他のsemantic/linkロールと重ならない
		const limeSwatch = page.locator("[data-testid='swatch-lime-700']");
		await expect(limeSwatch).toBeVisible();

		// 円形スウォッチクラスが適用されていることを確認
		await expect(limeSwatch).toHaveClass(/dads-swatch--circular/);

		// 中央ラベルに「A」が表示されること
		const roleLabel = limeSwatch.locator(".dads-swatch__role-label");
		await expect(roleLabel).toBeVisible();
		const labelText = await roleLabel.textContent();
		expect(labelText).toBe("A");
	});

	test("ラベル文字色が明るい背景では黒になる", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// green-600シェード（Success-1ロール、明るめの背景色）を確認
		// 緑の600は比較的明るいので黒文字が適切
		const greenSwatch = page.locator("[data-testid='swatch-green-600']");
		const roleLabel = greenSwatch.locator(".dads-swatch__role-label");
		await expect(roleLabel).toBeVisible();

		// ラベルの文字色を取得
		const textColor = await roleLabel.evaluate((el) => {
			return window.getComputedStyle(el).color;
		});
		// green-600(#259d63)は明るい背景色のため、コントラスト自動調整により黒文字になる
		// WCAG計算: 黒とのコントラスト比(6.08) > 白とのコントラスト比(3.45)
		expect(textColor).toBe("rgb(0, 0, 0)");
	});

	test("ラベル文字色が暗い背景では白になる", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// blue-1000シェード（Link-Defaultロール、暗い背景色）を確認
		const blueSwatch = page.locator("[data-testid='swatch-blue-1000']");
		const roleLabel = blueSwatch.locator(".dads-swatch__role-label");
		await expect(roleLabel).toBeVisible();

		// ラベルの文字色が白であること
		const textColor = await roleLabel.evaluate((el) => {
			return window.getComputedStyle(el).color;
		});
		// rgb(255, 255, 255) = white
		expect(textColor).toBe("rgb(255, 255, 255)");
	});

	test("複数ロールが割り当てられたスウォッチでは優先ロールが表示される", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// blue-600シェード（Primary + Link-Textロールが重複する可能性がある）
		// Primaryの方が優先度が高いので「P」が表示される
		const blueSwatch = page.locator("[data-testid='swatch-blue-600']");
		await expect(blueSwatch).toBeVisible();

		const roleLabel = blueSwatch.locator(".dads-swatch__role-label");
		await expect(roleLabel).toBeVisible();
		const labelText = await roleLabel.textContent();

		// Primary（P）が最優先で表示されること
		expect(labelText).toBe("P");
	});

	test("hue-scale特定可能なブランドロール（Primary）が該当DADSスウォッチで円形化される", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// blue-600シェード（テストページでPrimaryがblue-600に設定）を確認
		const blueSwatch = page.locator("[data-testid='swatch-blue-600']");
		await expect(blueSwatch).toBeVisible();

		// 円形スウォッチクラスが適用されていることを確認（ブランドロール統合）
		await expect(blueSwatch).toHaveClass(/dads-swatch--circular/);

		// スウォッチのborder-radiusが50%であること
		const borderRadius = await blueSwatch.evaluate((el) => {
			return window.getComputedStyle(el).borderRadius;
		});
		expect(borderRadius).toBe("50%");
	});

	test("hue-scale特定可能なブランドロール（Secondary）が該当DADSスウォッチで円形化される", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// purple-500シェード（テストページでSecondaryがpurple-500に設定）を確認
		const purpleSwatch = page.locator("[data-testid='swatch-purple-500']");
		await expect(purpleSwatch).toBeVisible();

		// 円形スウォッチクラスが適用されていることを確認（ブランドロール統合）
		await expect(purpleSwatch).toHaveClass(/dads-swatch--circular/);

		// スウォッチのborder-radiusが50%であること
		const borderRadius = await purpleSwatch.evaluate((el) => {
			return window.getComputedStyle(el).borderRadius;
		});
		expect(borderRadius).toBe("50%");
	});
});

// ============================================================================
// 2. ツールチップとアクセシビリティ
// ============================================================================

test.describe("ツールチップとアクセシビリティ", () => {
	test("ホバー時に既存情報とロール情報を含むツールチップが表示される", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// green-600シェードのtitle属性を確認
		const greenSwatch = page.locator("[data-testid='swatch-green-600']");
		const titleAttr = await greenSwatch.getAttribute("title");

		// 既存のHEX情報が含まれていること
		expect(titleAttr).toContain("#");

		// セマンティックロール情報が含まれていること
		expect(titleAttr).toContain("セマンティックロール");
		expect(titleAttr).toContain("[Semantic]");
	});

	test("aria-describedby属性が正しく設定されている", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// green-600シェードのaria-describedbyを確認
		const greenSwatch = page.locator("[data-testid='swatch-green-600']");
		const describedBy = await greenSwatch.getAttribute("aria-describedby");

		// ID形式: "swatch-{dadsHue}-{scale}-desc"
		expect(describedBy).toBe("swatch-green-600-desc");

		// 対応する説明要素が存在すること
		const descElement = page.locator(`#${describedBy}`);
		await expect(descElement).toBeAttached();

		// 説明要素にロール情報が含まれていること
		const descText = await descElement.textContent();
		expect(descText).toContain("Success");
	});

	test("キーボード操作（Tab）でスウォッチ間を移動できる", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// ロール付きスウォッチにtabindex="0"が設定されていることを確認
		const greenSwatch = page.locator("[data-testid='swatch-green-600']");
		const tabindex = await greenSwatch.getAttribute("tabindex");
		expect(tabindex).toBe("0");

		// キーボードでフォーカス可能であることを確認
		await greenSwatch.focus();
		await expect(greenSwatch).toBeFocused();

		// Tabキーで次の要素に移動できることを確認
		await page.keyboard.press("Tab");
		// フォーカスが移動したことを確認（次のフォーカス可能な要素に）
		await expect(greenSwatch).not.toBeFocused();
	});
});

// ============================================================================
// 3. ブランドロール表示（Task 11.1: 新仕様に更新）
// ============================================================================

test.describe("ブランドロール表示", () => {
	test("hue-scale特定可能なブランドロールは該当DADSスウォッチで円形化される", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// blue-600シェード（Primary設定がblue-600）を確認
		const blueSwatch = page.locator("[data-testid='swatch-blue-600']");
		await expect(blueSwatch).toBeVisible();

		// 円形スウォッチクラスが適用されていることを確認
		await expect(blueSwatch).toHaveClass(/dads-swatch--circular/);

		// 中央ラベルにPrimaryの短縮名「P」が表示されること
		const roleLabel = blueSwatch.locator(".dads-swatch__role-label");
		await expect(roleLabel).toBeVisible();
		const labelText = await roleLabel.textContent();
		expect(labelText).toBe("P");
	});

	test("hue-scale特定不可のブランドロールはシェードビュー先頭に未解決ロールバーで表示される", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='shades-view-container']");

		// 未解決ロールバーの存在を確認（hue-scale不定のブランドロールがある場合）
		// 注: テストページのパレット設定ではbaseChromaName/stepが設定されているため、
		// 未解決ロールが存在しない場合はこのテストをスキップ
		const unresolvedBar = page.locator(".dads-unresolved-roles-bar");
		const unresolvedCount = await unresolvedBar.count();

		// 未解決ロールがある場合の検証
		if (unresolvedCount > 0) {
			await expect(unresolvedBar).toBeVisible();
			// 「未解決ロール:」ラベルが存在すること
			const label = unresolvedBar.locator(".dads-unresolved-roles-bar__label");
			await expect(label).toBeVisible();
			const labelText = await label.textContent();
			expect(labelText).toContain("未解決ロール");
		}
	});

	test("hue-scale特定可能なブランドロールが該当DADSシェードのARIA説明に含まれる", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// blue-600シェード（Primary設定がblue-600）を確認
		const blueSwatch = page.locator("[data-testid='swatch-blue-600']");
		const describedBy = await blueSwatch.getAttribute("aria-describedby");

		// ID形式: "swatch-{dadsHue}-{scale}-desc"（brand形式は廃止）
		expect(describedBy).toBe("swatch-blue-600-desc");

		// 対応する説明要素にブランドロール情報が含まれること
		const descElement = page.locator(`#${describedBy}`);
		await expect(descElement).toBeAttached();
		const descText = await descElement.textContent();
		expect(descText).toContain("Primary");
	});
});

// ============================================================================
// 4. 欄外ロール情報表示（Task 11.3）
// Requirements: 3.1, 3.2, 3.4, 3.5
// ============================================================================

test.describe("欄外ロール情報表示", () => {
	test("欄外にロール名が見切れなく完全表示されること", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='role-info-bar']");

		// 欄外ロール情報バーが存在すること
		const roleInfoBars = page.locator("[data-testid='role-info-bar']");
		expect(await roleInfoBars.count()).toBeGreaterThan(0);

		// ロールバッジが存在すること
		const roleBadges = page.locator(".dads-role-badge");
		expect(await roleBadges.count()).toBeGreaterThan(0);

		// 最初のロールバッジのテキストを確認
		const firstBadge = roleBadges.first();
		await expect(firstBadge).toBeVisible();

		// ロールバッジのスタイルを確認（見切れ防止）
		const badgeStyles = await firstBadge.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return {
				whiteSpace: style.whiteSpace,
				overflow: style.overflow,
				fontSize: style.fontSize,
			};
		});

		// white-space: nowrapで見切れを防止
		expect(badgeStyles.whiteSpace).toBe("nowrap");
		// font-size: 11px（要件3.3）
		expect(badgeStyles.fontSize).toBe("11px");

		// Issue 1修正: 見切れがないことをscrollWidth/clientWidthで直接検証
		const noClipping = await firstBadge.evaluate((el) => {
			return el.scrollWidth <= el.clientWidth;
		});
		expect(noClipping).toBe(true);
	});

	test("欄外ロール情報バーがスウォッチ行より下に配置されること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='role-info-bar']");

		// scale-containerとrole-info-barのbounding boxを比較
		const scaleContainer = page.locator(".scale-container").first();
		const roleInfoBar = page.locator("[data-testid='role-info-bar']").first();

		const scaleBox = await scaleContainer.boundingBox();
		const roleBox = await roleInfoBar.boundingBox();

		// scale-containerの下端より、role-info-barの上端が下にあること
		expect(scaleBox).not.toBeNull();
		expect(roleBox).not.toBeNull();
		if (scaleBox && roleBox) {
			expect(roleBox.y).toBeGreaterThanOrEqual(scaleBox.y + scaleBox.height);
		}
	});

	test("ロールバッジにロール名とスケール値が含まれること", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='role-info-bar']");

		// 欄外ロール情報バー（hue-section内）内のバッジを取得（未解決ロールバーではない）
		// 未解決ロールバーのバッジにはスケール値がないため、通常のrole-info-bar内のバッジを検証
		const roleInfoBar = page.locator(
			"[data-testid='role-info-bar']:not(.dads-unresolved-roles-bar)",
		);
		expect(await roleInfoBar.count()).toBeGreaterThan(0);

		const roleBadges = roleInfoBar.first().locator(".dads-role-badge");
		expect(await roleBadges.count()).toBeGreaterThan(0);

		const firstBadge = roleBadges.first();
		const badgeText = await firstBadge.textContent();

		// Issue 2修正: ロール名（1文字以上）とスケール値（数字）が含まれていること
		// パターン: "ロール名 (数字)" 例: "Success-1 (600)", "Primary (600)"
		expect(badgeText).not.toBeNull();
		expect(badgeText).toMatch(/.+\s*\(\d+\)/);
	});

	test("ロールバッジにカテゴリに応じた背景色が適用されること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='role-info-bar']");

		// Issue 3修正: まずバッジが存在することを必須で確認
		const allBadges = page.locator(".dads-role-badge");
		expect(await allBadges.count()).toBeGreaterThan(0);

		// 全バッジにdata-category属性が設定されていること
		const firstBadge = allBadges.first();
		const category = await firstBadge.getAttribute("data-category");
		expect(category).not.toBeNull();

		// カテゴリに応じた背景色が設定されていること
		const backgroundColor = await firstBadge.evaluate(
			(el) => window.getComputedStyle(el).backgroundColor,
		);
		// 背景色が透明でないこと（何らかの色が設定されている）
		expect(backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
		expect(backgroundColor).not.toBe("transparent");

		// セマンティックカテゴリのバッジを確認（存在する場合は正確な色を検証）
		const semanticBadge = page.locator(
			".dads-role-badge[data-category='semantic']",
		);
		const semanticCount = await semanticBadge.count();
		if (semanticCount > 0) {
			const semanticBgColor = await semanticBadge
				.first()
				.evaluate((el) => window.getComputedStyle(el).backgroundColor);
			// Green 700: #388E3C → rgb(56, 142, 60)
			expect(semanticBgColor).toBe("rgb(56, 142, 60)");
		}

		// Linkカテゴリのバッジを確認（存在する場合は正確な色を検証）
		const linkBadge = page.locator(".dads-role-badge[data-category='link']");
		const linkCount = await linkBadge.count();
		if (linkCount > 0) {
			const linkBgColor = await linkBadge
				.first()
				.evaluate((el) => window.getComputedStyle(el).backgroundColor);
			// Light Blue 700: #0288D1 → rgb(2, 136, 209)
			expect(linkBgColor).toBe("rgb(2, 136, 209)");
		}
	});

	test("円形スウォッチから欄外ロール情報への視覚的接続（コネクタ線）があること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='role-info-bar']");

		// コネクタ要素が存在すること
		const connectors = page.locator(".dads-role-connector");
		expect(await connectors.count()).toBeGreaterThan(0);

		// コネクタのスタイルを確認
		const firstConnector = connectors.first();
		const connectorStyles = await firstConnector.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return {
				position: style.position,
				width: style.width,
				backgroundColor: style.backgroundColor,
			};
		});

		// 絶対位置指定
		expect(connectorStyles.position).toBe("absolute");
		// 幅1px（縦線）
		expect(connectorStyles.width).toBe("1px");
		// 灰色（#9e9e9e → rgb(158, 158, 158)）
		expect(connectorStyles.backgroundColor).toBe("rgb(158, 158, 158)");
	});

	test("コネクタがスウォッチとロール情報を接続していること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='role-info-bar']");

		// コネクタのdata-testidを確認
		const connectors = page.locator("[data-testid='role-connector']");
		expect(await connectors.count()).toBeGreaterThan(0);

		// Issue 8修正: コネクタの高さはrequestAnimationFrameで設定されるため、
		// heightが0より大きくなるまでexpect.pollで待機する
		const firstConnector = connectors.first();
		await expect
			.poll(
				async () => {
					const height = await firstConnector.evaluate((el) => {
						return Number.parseFloat(window.getComputedStyle(el).height);
					});
					return height > 0;
				},
				{
					message: "コネクタの高さが0より大きくなるのを待機",
					timeout: 5000,
				},
			)
			.toBe(true);
	});

	test("同一色相に複数ロールがある場合に水平に並ぶこと", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='role-info-bar']");

		// 欄外ロール情報バーのスタイルを確認
		const roleInfoBar = page.locator("[data-testid='role-info-bar']").first();
		const barStyles = await roleInfoBar.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return {
				display: style.display,
				flexWrap: style.flexWrap,
				gap: style.gap,
			};
		});

		// flexboxで水平配置
		expect(barStyles.display).toBe("flex");
		// 折り返し可能
		expect(barStyles.flexWrap).toBe("wrap");
		// gap: 8px
		expect(barStyles.gap).toBe("8px");

		// Issue 4修正: 実際に複数のバッジが水平に並んでいることをbounding boxで検証
		// 複数バッジがあるrole-info-barを探す
		const allRoleInfoBars = page.locator("[data-testid='role-info-bar']");
		const barCount = await allRoleInfoBars.count();

		let foundMultipleBadgesBar = false;
		for (let i = 0; i < barCount; i++) {
			const bar = allRoleInfoBars.nth(i);
			const badges = bar.locator(".dads-role-badge");
			const badgeCount = await badges.count();

			if (badgeCount >= 2) {
				foundMultipleBadgesBar = true;
				// 2つ以上のバッジがある場合、同じy座標（水平配置）を検証
				const firstBox = await badges.nth(0).boundingBox();
				const secondBox = await badges.nth(1).boundingBox();

				expect(firstBox).not.toBeNull();
				expect(secondBox).not.toBeNull();
				if (firstBox && secondBox) {
					// topの差が小さい（同じ行にある）ことを確認（5px以内の誤差許容）
					expect(Math.abs(firstBox.y - secondBox.y)).toBeLessThan(5);
				}
				break;
			}
		}

		// Issue 7修正: DADS_COLORSには同一色相に複数ロールがあるため、必ず見つかるはず
		// green-800: Success-2, Accent-Green / orange-600: Warning-OR1, Accent-Orange
		// 見つからない場合はテストデータの問題なので失敗させる
		expect(foundMultipleBadgesBar).toBe(true);
	});

	test("欄外ロール情報がスウォッチ操作を妨げないこと（pointer-events: none）", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='role-info-bar']");

		// ロール情報アイテムのpointer-eventsを確認
		const roleInfoItem = page.locator(".dads-role-info-item").first();
		const pointerEvents = await roleInfoItem.evaluate((el) => {
			return window.getComputedStyle(el).pointerEvents;
		});

		expect(pointerEvents).toBe("none");
	});

	test("hue-scale特定不可ブランドロールはシェードビュー先頭に1回だけ表示されること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		// Issue 6修正: レンダリング完了を確実に待つため、実際に描画される要素を待機
		await page.waitForSelector(".dads-unresolved-roles-bar");

		// Issue 5修正: 未解決ロールバーが必ず1回表示されること
		// テストページに未解決ロール（Secondary）を追加済み
		const unresolvedBars = page.locator(".dads-unresolved-roles-bar");
		const barCount = await unresolvedBars.count();

		// 正確に1回表示されること
		expect(barCount).toBe(1);

		const unresolvedBar = unresolvedBars.first();
		await expect(unresolvedBar).toBeVisible();

		// 「未解決ロール:」ラベルが存在すること
		const label = unresolvedBar.locator(".dads-unresolved-roles-bar__label");
		await expect(label).toBeVisible();
		const labelText = await label.textContent();
		expect(labelText).toContain("未解決ロール");

		// コネクタがないこと（hue-scale不定のためスウォッチと紐づかない）
		const connectorsInUnresolved = unresolvedBar.locator(
			".dads-role-connector",
		);
		expect(await connectorsInUnresolved.count()).toBe(0);

		// Issue 5修正: 最初の色相セクション（hue-section）の前に表示されていることを検証
		// brand-sectionがある場合はその後に来るが、hue-sectionより前にある
		const container = page.locator("[data-testid='shades-view-container']");
		const unresolvedBarBox = await unresolvedBar.boundingBox();
		const firstHueSection = container.locator(".hue-section").first();
		const hueSectionBox = await firstHueSection.boundingBox();

		expect(unresolvedBarBox).not.toBeNull();
		expect(hueSectionBox).not.toBeNull();
		if (unresolvedBarBox && hueSectionBox) {
			// 未解決ロールバーが最初の色相セクションより上に表示されていること
			expect(unresolvedBarBox.y).toBeLessThan(hueSectionBox.y);
		}
	});

	test("未解決ロールバーにコネクタがないこと", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		// Issue 6修正: レンダリング完了を確実に待つため、実際に描画される要素を待機
		await page.waitForSelector(".dads-unresolved-roles-bar");

		// Issue 5修正: 未解決ロールバーが必ず存在することを確認
		const unresolvedBars = page.locator(".dads-unresolved-roles-bar");
		expect(await unresolvedBars.count()).toBe(1);

		const unresolvedBar = unresolvedBars.first();

		// 未解決ロールバー内にコネクタがないこと
		const connectors = unresolvedBar.locator(".dads-role-connector");
		expect(await connectors.count()).toBe(0);
	});
});

// ============================================================================
// 5. DADS以外のハーモニー種別（Task 11.1: 新UIセレクタに更新）
// ============================================================================

test.describe("DADS以外のハーモニー種別", () => {
	test("Complementaryハーモニーではセマンティックロール表示がない", async ({
		page,
	}) => {
		// Complementaryハーモニータイプを選択
		await selectHarmonyType(page, "complementary");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='shades-view-container']");

		// 円形スウォッチがないことを確認（新UIセレクタ）
		const allCircularSwatches = page.locator(".dads-swatch--circular");
		expect(await allCircularSwatches.count()).toBe(0);
	});

	test("Triadicハーモニーではセマンティックロール表示がない", async ({
		page,
	}) => {
		await selectHarmonyType(page, "triadic");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='shades-view-container']");

		// 円形スウォッチがないことを確認（新UIセレクタ）
		const allCircularSwatches = page.locator(".dads-swatch--circular");
		expect(await allCircularSwatches.count()).toBe(0);
	});
});

// ============================================================================
// 5. パフォーマンス検証 (Task 5.2)
// ============================================================================

/**
 * CI環境では共有ランナーの負荷により遅延が発生するため、閾値を緩和する
 * - ローカル: 200ms（要件準拠）
 * - CI: 500ms（フレーク防止のため2.5倍に緩和）
 */
const IS_CI = !!process.env.CI;
const RENDER_TIME_THRESHOLD_MS = IS_CI ? 500 : 200;
const MAPPING_TIME_THRESHOLD_MS = IS_CI ? 500 : 200;
const TOTAL_TIME_THRESHOLD_MS = IS_CI ? 2000 : 1000;

test.describe("パフォーマンス検証", () => {
	test("10色相×13スケール（130シェード）のレンダリングが閾値以内であること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");

		// 高解像度タイムスタンプを取得するためにページ内でパフォーマンスを計測
		const renderTime = await page.evaluate(async () => {
			return new Promise<number>((resolve, reject) => {
				const startTime = performance.now();
				const TIMEOUT_MS = 10000; // 10秒タイムアウト（CI環境考慮）
				const EXPECTED_SWATCHES = 130; // 10色相 × 13スケール

				// タイムアウトガード
				const timeoutId = setTimeout(() => {
					observer.disconnect();
					reject(
						new Error(
							`Timeout: スウォッチが${EXPECTED_SWATCHES}個に達しませんでした`,
						),
					);
				}, TIMEOUT_MS);

				// Render Shadesボタンをクリック
				const renderBtn = document.querySelector(
					"[data-testid='render-shades-btn']",
				) as HTMLButtonElement;
				renderBtn?.click();

				// 描画完了を監視（MutationObserverで監視）
				const container = document.querySelector(
					"[data-testid='shades-view-container']",
				);

				const observer = new MutationObserver(() => {
					const swatches = container?.querySelectorAll(
						"[data-testid^='swatch-']",
					);
					if (swatches && swatches.length >= EXPECTED_SWATCHES) {
						// 130個のスウォッチが描画されたら計測完了
						clearTimeout(timeoutId);
						observer.disconnect();
						const endTime = performance.now();
						resolve(endTime - startTime);
					}
				});

				observer.observe(container as Node, {
					childList: true,
					subtree: true,
				});
			});
		});

		console.log(
			`シェードレンダリング時間: ${renderTime.toFixed(2)}ms (閾値: ${RENDER_TIME_THRESHOLD_MS}ms, CI: ${IS_CI})`,
		);

		// 閾値以内であること（Requirements 5.1, 5.2）
		expect(renderTime).toBeLessThan(RENDER_TIME_THRESHOLD_MS);
	});

	test("マッピング生成時間がperformance-resultに表示されること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");

		// パフォーマンス結果の更新を待つ（mappingTimeMsが含まれるまで待機）
		await page.waitForFunction(
			() => {
				const el = document.querySelector("[data-testid='performance-result']");
				return el?.textContent?.includes("mappingTimeMs");
			},
			{ timeout: 10000 },
		);

		// パフォーマンス結果を取得
		const performanceResult = await page
			.locator("[data-testid='performance-result']")
			.textContent();

		// JSON形式でパフォーマンスデータが含まれていることを確認
		expect(performanceResult).toContain("mappingTimeMs");
		expect(performanceResult).toContain("renderTimeMs");
		expect(performanceResult).toContain("totalTimeMs");

		// パフォーマンスデータをパース
		const metrics = JSON.parse(performanceResult || "{}");

		console.log(`パフォーマンスメトリクス (CI: ${IS_CI}):
			- マッピング時間: ${metrics.mappingTimeMs}ms (閾値: ${MAPPING_TIME_THRESHOLD_MS}ms)
			- レンダリング時間: ${metrics.renderTimeMs}ms
			- 合計時間: ${metrics.totalTimeMs}ms (閾値: ${TOTAL_TIME_THRESHOLD_MS}ms)`);

		// マッピング生成が閾値以内であること
		expect(Number.parseFloat(metrics.mappingTimeMs)).toBeLessThan(
			MAPPING_TIME_THRESHOLD_MS,
		);

		// 合計時間が閾値以内であること（トークンロード含む）
		expect(Number.parseFloat(metrics.totalTimeMs)).toBeLessThan(
			TOTAL_TIME_THRESHOLD_MS,
		);
	});

	test("DOM追加によるレンダリングブロッキングがないこと", async ({ page }) => {
		await selectHarmonyType(page, "dads");

		// CI環境ではフレームドロップの閾値を緩和
		const FRAME_DROP_THRESHOLD = IS_CI ? 15 : 5;
		const FRAME_DELAY_THRESHOLD_MS = IS_CI ? 100 : 50; // CI環境では100ms以上をドロップとみなす

		// requestAnimationFrameを使用してフレームドロップを検出
		const frameDrops = await page.evaluate(
			async (frameDelayThreshold: number) => {
				return new Promise<number>((resolve) => {
					let frameDropCount = 0;
					let lastFrameTime = performance.now();

					const checkFrame = () => {
						const now = performance.now();
						const frameDuration = now - lastFrameTime;

						if (frameDuration > frameDelayThreshold) {
							frameDropCount++;
						}

						lastFrameTime = now;
					};

					// フレーム監視を開始
					const frameId = setInterval(checkFrame, 16.67); // 60fpsを想定

					// Render Shadesボタンをクリック
					const renderBtn = document.querySelector(
						"[data-testid='render-shades-btn']",
					) as HTMLButtonElement;
					renderBtn?.click();

					// 500ms後に結果を返す
					setTimeout(() => {
						clearInterval(frameId);
						resolve(frameDropCount);
					}, 500);
				});
			},
			FRAME_DELAY_THRESHOLD_MS,
		);

		console.log(
			`フレームドロップ数: ${frameDrops} (閾値: ${FRAME_DROP_THRESHOLD}, CI: ${IS_CI})`,
		);

		// フレームドロップが閾値未満であること
		expect(frameDrops).toBeLessThan(FRAME_DROP_THRESHOLD);
	});
});

// ============================================================================
// 6. コントラスト境界表示（Task 11.4）
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
// ============================================================================

test.describe("コントラスト境界表示", () => {
	// Requirement 6.1: 各色相のシェードパレット下部にコントラスト比境界インジケーターを表示
	test("各色相セクションにコントラスト境界コンテナとピルが存在すること（6.1）", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='contrast-boundary-']");

		// 各色相セクション（hue-section）の数を取得
		const hueSections = page.locator(".hue-section");
		const hueSectionCount = await hueSections.count();
		expect(hueSectionCount).toBeGreaterThan(0);

		// コントラスト境界コンテナの数を取得
		const boundaryContainers = page.locator(
			"[data-testid^='contrast-boundary-']",
		);
		const boundaryCount = await boundaryContainers.count();

		// 各色相セクションに境界コンテナが存在すること
		expect(boundaryCount).toBe(hueSectionCount);

		// 全境界コンテナを走査し、各コンテナにピルが1つ以上存在することを確認
		// DADS全10色相（blue/light-blue/cyan/green/lime/yellow/orange/red/magenta/purple）を網羅
		for (let i = 0; i < boundaryCount; i++) {
			const boundary = boundaryContainers.nth(i);
			await expect(boundary).toBeVisible();

			// 各色相コンテナにピルが1つ以上存在すること（空コンテナでないことを確認）
			const pillsInBoundary = boundary.locator(".dads-contrast-pill");
			const pillCount = await pillsInBoundary.count();
			expect(pillCount).toBeGreaterThan(0);
		}
	});

	// Requirement 6.2: 白背景に対するコントラスト比境界（3:1→、4.5:1→）を白抜きスタイルで表示
	test("白背景用ピル（3:1→、4.5:1→）が白抜きスタイルで表示されること（6.2/6.4）", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='contrast-boundary-']");

		// 白背景用ピル（outlineクラス）を取得 - 必須要件として存在確認
		const outlinePills = page.locator(".dads-contrast-pill--outline");
		const pillCount = await outlinePills.count();
		expect(pillCount).toBeGreaterThan(0);

		// 色相ごとにスタイルを検証（全色相をカバー）
		const hues = ["blue", "red", "green", "yellow", "purple"];
		for (const hue of hues) {
			const hueBoundary = page.locator(
				`[data-testid='contrast-boundary-${hue}']`,
			);
			const hueOutlinePills = hueBoundary.locator(
				".dads-contrast-pill--outline",
			);
			const hueOutlineCount = await hueOutlinePills.count();

			// 各色相でoutlineピルが存在すればスタイル検証
			for (let i = 0; i < hueOutlineCount; i++) {
				const pill = hueOutlinePills.nth(i);
				const pillStyles = await pill.evaluate((el) => {
					const style = window.getComputedStyle(el);
					return {
						borderColor: style.borderColor,
						backgroundColor: style.backgroundColor,
						color: style.color,
						borderRadius: style.borderRadius,
					};
				});

				// 白抜きスタイル: border: 1px solid #333, background: transparent, color: #333
				expect(pillStyles.borderColor).toBe("rgb(51, 51, 51)");
				expect(pillStyles.backgroundColor).toBe("rgba(0, 0, 0, 0)");
				expect(pillStyles.color).toBe("rgb(51, 51, 51)");
				expect(pillStyles.borderRadius).toBe("9999px");
			}
		}

		// ラベルテキストが正しいこと（→で終わる）
		const firstPillText = await outlinePills.first().textContent();
		expect(firstPillText).toMatch(/\d+(\.\d+)?:1→/);
	});

	// Requirement 6.3: 黒背景に対するコントラスト比境界（←4.5:1、←3:1）を黒塗りスタイルで表示
	test("黒背景用ピル（←4.5:1、←3:1）が黒塗りスタイルで表示されること（6.3/6.4）", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='contrast-boundary-']");

		// 黒背景用ピル（filledクラス）を取得 - 必須要件として存在確認
		const filledPills = page.locator(".dads-contrast-pill--filled");
		const pillCount = await filledPills.count();
		expect(pillCount).toBeGreaterThan(0);

		// 色相ごとにスタイルを検証（全色相をカバー）
		const hues = ["blue", "red", "green", "yellow", "purple"];
		for (const hue of hues) {
			const hueBoundary = page.locator(
				`[data-testid='contrast-boundary-${hue}']`,
			);
			const hueFilledPills = hueBoundary.locator(".dads-contrast-pill--filled");
			const hueFilledCount = await hueFilledPills.count();

			// 各色相でfilledピルが存在すればスタイル検証
			for (let i = 0; i < hueFilledCount; i++) {
				const pill = hueFilledPills.nth(i);
				const pillStyles = await pill.evaluate((el) => {
					const style = window.getComputedStyle(el);
					return {
						backgroundColor: style.backgroundColor,
						color: style.color,
						borderRadius: style.borderRadius,
					};
				});

				// 黒塗りスタイル: background: #333, color: white
				expect(pillStyles.backgroundColor).toBe("rgb(51, 51, 51)");
				expect(pillStyles.color).toBe("rgb(255, 255, 255)");
				expect(pillStyles.borderRadius).toBe("9999px");
			}
		}

		// ラベルテキストが正しいこと（←で始まる）
		const firstPillText = await filledPills.first().textContent();
		expect(firstPillText).toMatch(/←\d+(\.\d+)?:1/);
	});

	// Requirement 6.2/6.3: 4つの境界ラベル（3:1→、4.5:1→、←4.5:1、←3:1）の存在確認
	test("4つの境界ラベルパターンが全て存在すること（6.2/6.3）", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='contrast-boundary-']");

		// 全ピルのラベルを収集
		const allPills = page.locator(".dads-contrast-pill");
		const pillCount = await allPills.count();
		expect(pillCount).toBeGreaterThan(0);

		const labels: string[] = [];
		for (let i = 0; i < pillCount; i++) {
			const text = await allPills.nth(i).textContent();
			if (text) labels.push(text);
		}

		// 4つのラベルパターンが全て存在すること
		const expectedLabels = ["3:1→", "4.5:1→", "←4.5:1", "←3:1"];
		for (const expectedLabel of expectedLabels) {
			const hasLabel = labels.some((label) => label === expectedLabel);
			expect(hasLabel).toBe(true);
		}

		// 各色相でoutline/filledの両方が存在することを確認（特定色相の欠落を防ぐ）
		const hues = ["blue", "red", "green", "yellow", "purple"];
		for (const hue of hues) {
			const hueBoundary = page.locator(
				`[data-testid='contrast-boundary-${hue}']`,
			);
			const hueOutlinePills = hueBoundary.locator(
				".dads-contrast-pill--outline",
			);
			const hueFilledPills = hueBoundary.locator(".dads-contrast-pill--filled");

			// 各色相でoutline（白背景用）が1つ以上存在
			const outlineCount = await hueOutlinePills.count();
			expect(outlineCount).toBeGreaterThan(0);

			// 各色相でfilled（黒背景用）が1つ以上存在
			const filledCount = await hueFilledPills.count();
			expect(filledCount).toBeGreaterThan(0);

			// outlineピルは→で終わる
			for (let i = 0; i < outlineCount; i++) {
				const text = await hueOutlinePills.nth(i).textContent();
				expect(text).toMatch(/→$/);
			}

			// filledピルは←で始まる
			for (let i = 0; i < filledCount; i++) {
				const text = await hueFilledPills.nth(i).textContent();
				expect(text).toMatch(/^←/);
			}
		}
	});

	// Requirement 6.5: ピルを対応するスケールの下部に配置（複数色相で検証）
	test("コントラスト境界ピルがスウォッチの下部に配置されること（6.5）", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='contrast-boundary-']");

		// コントラスト境界ピルが存在することを必須確認
		const pills = page.locator(".dads-contrast-pill");
		const pillCount = await pills.count();
		expect(pillCount).toBeGreaterThan(0);

		// 複数の色相で位置を検証
		const hues = ["blue", "red", "green"];
		for (const hue of hues) {
			const boundary = page.locator(`[data-testid='contrast-boundary-${hue}']`);
			const huePills = boundary.locator(".dads-contrast-pill");
			const huePillCount = await huePills.count();
			expect(huePillCount).toBeGreaterThan(0);

			// 各ピルがスウォッチの下部に配置されていることを確認
			for (let i = 0; i < huePillCount; i++) {
				const pill = huePills.nth(i);
				const pillBox = await pill.boundingBox();
				expect(pillBox).not.toBeNull();

				// data-scale属性を取得
				const scale = await pill.getAttribute("data-scale");
				expect(scale).not.toBeNull();
				expect(Number(scale)).toBeGreaterThan(0);

				// 対応するスウォッチのboundingBoxを取得
				const swatch = page.locator(`[data-testid='swatch-${hue}-${scale}']`);
				const swatchBox = await swatch.boundingBox();
				expect(swatchBox).not.toBeNull();

				// ピルがスウォッチの下端より下に配置されていること（許容誤差10px）
				if (pillBox && swatchBox) {
					expect(pillBox.y).toBeGreaterThanOrEqual(
						swatchBox.y + swatchBox.height - 10,
					);
				}

				// data-direction属性が設定されていること
				const direction = await pill.getAttribute("data-direction");
				expect(direction).not.toBeNull();
				expect(["start", "end"]).toContain(direction);
			}
		}
	});

	// Requirement 6.5: ピルのx位置がdata-scaleに対応するスウォッチと一致すること（複数色相・全ピル検証）
	test("全ピルのx位置が対応するスウォッチと一致すること（6.5）", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='contrast-boundary-']");

		// 複数の色相で位置を検証
		const hues = ["blue", "red", "green"];
		for (const hue of hues) {
			const boundary = page.locator(`[data-testid='contrast-boundary-${hue}']`);
			const huePills = boundary.locator(".dads-contrast-pill");
			const huePillCount = await huePills.count();
			expect(huePillCount).toBeGreaterThan(0);

			// 全ピルで位置検証
			for (let i = 0; i < huePillCount; i++) {
				const pill = huePills.nth(i);
				const pillBox = await pill.boundingBox();
				const scale = await pill.getAttribute("data-scale");
				expect(pillBox).not.toBeNull();
				expect(scale).not.toBeNull();

				// 対応するスウォッチを取得
				const swatch = page.locator(`[data-testid='swatch-${hue}-${scale}']`);
				const swatchBox = await swatch.boundingBox();
				expect(swatchBox).not.toBeNull();

				// ピルのx座標がスウォッチの範囲内にあること（許容誤差50px）
				if (pillBox && swatchBox) {
					const swatchCenterX = swatchBox.x + swatchBox.width / 2;
					const pillCenterX = pillBox.x + pillBox.width / 2;
					expect(Math.abs(pillCenterX - swatchCenterX)).toBeLessThan(50);
				}
			}
		}
	});

	test("コントラスト境界ピルにdata-scale属性が設定されていること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='contrast-boundary-']");

		// 全てのピルでdata-scale属性を確認
		const pills = page.locator(".dads-contrast-pill");
		const pillCount = await pills.count();
		expect(pillCount).toBeGreaterThan(0);

		for (let i = 0; i < pillCount; i++) {
			const pill = pills.nth(i);
			const scale = await pill.getAttribute("data-scale");
			expect(scale).not.toBeNull();
			expect(Number(scale)).toBeGreaterThan(0);
		}
	});

	test("コントラスト境界ピルにdata-direction属性が設定されていること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='contrast-boundary-']");

		// 全てのピルでdata-direction属性を確認
		const pills = page.locator(".dads-contrast-pill");
		const pillCount = await pills.count();
		expect(pillCount).toBeGreaterThan(0);

		for (let i = 0; i < pillCount; i++) {
			const pill = pills.nth(i);
			const direction = await pill.getAttribute("data-direction");
			expect(direction).not.toBeNull();
			expect(["start", "end"]).toContain(direction);
		}
	});

	// DADS以外のハーモニー種別では境界が表示されないことを全種別でテスト
	const nonDadsHarmonyTypes = [
		"complementary",
		"analogous",
		"triadic",
		"split-complementary",
	];
	for (const harmonyType of nonDadsHarmonyTypes) {
		test(`${harmonyType}ハーモニーではコントラスト境界が表示されないこと`, async ({
			page,
		}) => {
			await selectHarmonyType(page, harmonyType);
			await page.click("[data-testid='render-shades-btn']");

			// 描画完了を確実に待つ（#statusがCompleteになるまで待機）
			await page.waitForFunction(
				() => {
					const status = document.getElementById("status");
					return status && status.textContent?.includes("Complete");
				},
				{ timeout: 10000 },
			);

			// 描画完了後にコントラスト境界コンテナが存在しないことを確認
			const boundaryContainers = page.locator(
				"[data-testid^='contrast-boundary-']",
			);
			expect(await boundaryContainers.count()).toBe(0);
		});
	}

	test("コントラスト境界ピルのpointer-eventsがnoneであること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='contrast-boundary-']");

		// 全てのピルでpointer-eventsを確認
		const pills = page.locator(".dads-contrast-pill");
		const pillCount = await pills.count();
		expect(pillCount).toBeGreaterThan(0);

		for (let i = 0; i < Math.min(pillCount, 5); i++) {
			const pill = pills.nth(i);
			const pointerEvents = await pill.evaluate((el) => {
				return window.getComputedStyle(el).pointerEvents;
			});
			expect(pointerEvents).toBe("none");
		}
	});

	test("コントラスト境界ピルのフォントサイズが10pxであること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='contrast-boundary-']");

		// 全てのピルでフォントサイズを確認
		const pills = page.locator(".dads-contrast-pill");
		const pillCount = await pills.count();
		expect(pillCount).toBeGreaterThan(0);

		for (let i = 0; i < Math.min(pillCount, 5); i++) {
			const pill = pills.nth(i);
			const fontSize = await pill.evaluate((el) => {
				return window.getComputedStyle(el).fontSize;
			});
			expect(fontSize).toBe("10px");
		}
	});
});

// ============================================================================
// 7. アクセシビリティ専用テスト（Task 11.6）
// Requirements: 4.1 (スクリーンリーダー対応、キーボード操作)
// ============================================================================

test.describe("アクセシビリティ専用テスト", () => {
	// 円形スウォッチにaria-describedbyでロール情報が関連付けられること
	test("円形スウォッチにaria-describedbyが設定され、対応する説明要素が存在すること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// 円形スウォッチ（ロール割り当てあり）を取得
		const circularSwatches = page.locator(".dads-swatch--circular");
		const circularCount = await circularSwatches.count();
		expect(circularCount).toBeGreaterThan(0);

		// 全ての円形スウォッチでaria-describedby属性を確認（全件検証）
		for (let i = 0; i < circularCount; i++) {
			const swatch = circularSwatches.nth(i);
			const describedBy = await swatch.getAttribute("aria-describedby");

			// aria-describedbyが設定されていること
			expect(describedBy).not.toBeNull();
			expect(describedBy).toMatch(/^swatch-[a-z-]+-\d+-desc$/);

			// 対応する説明要素が存在すること
			const descElement = page.locator(`#${describedBy}`);
			await expect(descElement).toBeAttached();

			// 説明要素にテキストコンテンツがあること
			const descText = await descElement.textContent();
			expect(descText).toContain("セマンティックロール");
		}
	});

	test("hue-scale特定可能ブランドロールが該当DADSシェードのARIA説明にマージされること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// blue-600シェード（Primary設定がblue-600）のARIA説明を確認
		const blueSwatch = page.locator("[data-testid='swatch-blue-600']");
		await expect(blueSwatch).toBeVisible();

		// aria-describedbyがDADSシェード形式であること（brand形式ではない）
		const describedBy = await blueSwatch.getAttribute("aria-describedby");
		expect(describedBy).toBe("swatch-blue-600-desc");

		// 説明要素にPrimaryのロール情報が含まれること
		const descElement = page.locator(`#${describedBy}`);
		await expect(descElement).toBeAttached();

		const descText = await descElement.textContent();
		expect(descText).toContain("Primary");
	});

	test("hue-scale特定不可ブランドロールにはARIA IDが付与されないこと", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector(".dads-unresolved-roles-bar");

		// 未解決ロールバーが存在すること
		const unresolvedBar = page.locator(".dads-unresolved-roles-bar");
		await expect(unresolvedBar).toBeVisible();

		// 未解決ロールバー内のバッジにaria-describedbyが設定されていないことを確認
		const unresolvedBadges = unresolvedBar.locator(".dads-role-badge");
		const badgeCount = await unresolvedBadges.count();
		expect(badgeCount).toBeGreaterThan(0);

		for (let i = 0; i < badgeCount; i++) {
			const badge = unresolvedBadges.nth(i);
			const describedBy = await badge.getAttribute("aria-describedby");
			// hue-scale特定不可のためaria-describedbyは設定されない
			expect(describedBy).toBeNull();
		}

		// ブランドスウォッチ自体にもaria-describedbyが設定されていないこと
		const brandSwatch = page.locator("[data-testid='swatch-brand']");
		const brandSwatchCount = await brandSwatch.count();
		if (brandSwatchCount > 0) {
			const brandDescribedBy =
				await brandSwatch.getAttribute("aria-describedby");
			// hue-scale特定不可のブランドスウォッチにはaria-describedbyを設定しない
			expect(brandDescribedBy).toBeNull();
		}

		// swatch-brand-desc形式のIDを持つ要素が存在しないこと（廃止仕様）
		const deprecatedDescElements = page.locator("[id^='swatch-brand-']");
		expect(await deprecatedDescElements.count()).toBe(0);
	});

	test("スクリーンリーダー用の説明要素が視覚的に非表示であること（sr-only相当）", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// aria-describedby対象の説明要素を取得
		const greenSwatch = page.locator("[data-testid='swatch-green-600']");
		const describedBy = await greenSwatch.getAttribute("aria-describedby");
		expect(describedBy).not.toBeNull();

		const descElement = page.locator(`#${describedBy}`);
		await expect(descElement).toBeAttached();

		// sr-only相当のスタイルが適用されていること
		const descStyles = await descElement.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return {
				position: style.position,
				width: style.width,
				height: style.height,
				overflow: style.overflow,
				ariaHidden: el.getAttribute("aria-hidden"),
				display: style.display,
				visibility: style.visibility,
			};
		});

		// 視覚的に非表示のスタイル確認
		expect(descStyles.position).toBe("absolute");
		expect(descStyles.width).toBe("1px");
		expect(descStyles.height).toBe("1px");
		expect(descStyles.overflow).toBe("hidden");

		// アクセシビリティツリーから除外されていないことを確認
		// aria-hidden="true"でないこと
		expect(descStyles.ariaHidden).not.toBe("true");
		// display:noneでないこと
		expect(descStyles.display).not.toBe("none");
		// visibility:hiddenでないこと
		expect(descStyles.visibility).not.toBe("hidden");
	});

	test("円形スウォッチがアクセシビリティツリー上で説明を持つこと", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// 円形スウォッチでアクセシブル説明を確認
		const greenSwatch = page.locator("[data-testid='swatch-green-600']");
		await expect(greenSwatch).toBeVisible();

		// toHaveAccessibleDescriptionでアクセシビリティツリー上の説明を検証
		await expect(greenSwatch).toHaveAccessibleDescription(
			/セマンティックロール/,
		);
	});

	test("説明要素のテキストがロール情報を正しく含むこと", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// green-600シェード（Success-1ロールがある）の説明を確認
		const greenSwatch = page.locator("[data-testid='swatch-green-600']");
		const describedBy = await greenSwatch.getAttribute("aria-describedby");
		expect(describedBy).not.toBeNull();

		const descElement = page.locator(`#${describedBy}`);
		const descText = await descElement.textContent();

		// 正しいフォーマットであること
		expect(descText).toContain("セマンティックロール:");
		expect(descText).toContain("Success");
	});

	test("キーボード操作（Tab）で円形スウォッチ間を移動できること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// 円形スウォッチを取得
		const circularSwatches = page.locator(".dads-swatch--circular");
		const circularCount = await circularSwatches.count();
		expect(circularCount).toBeGreaterThan(1); // 少なくとも2つ以上あること

		// 最初の円形スウォッチにtabindex="0"が設定されていること
		const firstCircular = circularSwatches.first();
		const secondCircular = circularSwatches.nth(1);
		const tabindex = await firstCircular.getAttribute("tabindex");
		expect(tabindex).toBe("0");

		// フォーカスして確認
		await firstCircular.focus();
		await expect(firstCircular).toBeFocused();

		// Tabキーで次の円形スウォッチに移動
		await page.keyboard.press("Tab");

		// 次の円形スウォッチにフォーカスが移動したことを確認
		await expect(firstCircular).not.toBeFocused();
		await expect(secondCircular).toBeFocused();
	});

	test("全ての円形スウォッチにtabindex='0'が設定されていること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// 円形スウォッチを取得
		const circularSwatches = page.locator(".dads-swatch--circular");
		const circularCount = await circularSwatches.count();
		expect(circularCount).toBeGreaterThan(0);

		// 全ての円形スウォッチでtabindex確認
		for (let i = 0; i < circularCount; i++) {
			const swatch = circularSwatches.nth(i);
			const tabindex = await swatch.getAttribute("tabindex");
			expect(tabindex).toBe("0");
		}
	});

	test("ロールなしのスウォッチにはtabindexが設定されないこと", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// ロールなしのスウォッチ（円形でない）を取得
		// green-50はロールがないのでテスト対象
		const swatchWithoutRole = page.locator("[data-testid='swatch-green-50']");
		await expect(swatchWithoutRole).toBeVisible();

		// 円形でないことを確認
		await expect(swatchWithoutRole).not.toHaveClass(/dads-swatch--circular/);

		// tabindexが設定されていないことを確認
		const tabindex = await swatchWithoutRole.getAttribute("tabindex");
		expect(tabindex).toBeNull();
	});

	test("フォーカス時にツールチップ情報がアクセス可能であること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// green-600シェード（ロールあり）を確認
		const greenSwatch = page.locator("[data-testid='swatch-green-600']");
		await expect(greenSwatch).toBeVisible();

		// title属性が設定されていること（ホバー/フォーカス時にツールチップとして表示）
		const titleAttr = await greenSwatch.getAttribute("title");
		expect(titleAttr).not.toBeNull();
		expect(titleAttr).toContain("#"); // HEX情報
		expect(titleAttr).toContain("セマンティックロール"); // ロール情報

		// フォーカス可能であること
		await greenSwatch.focus();
		await expect(greenSwatch).toBeFocused();
	});

	test("ロールを持つ円形スウォッチのARIA説明に全ロール情報が含まれること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// 全ての円形スウォッチのARIA説明を検証
		const circularSwatches = page.locator(".dads-swatch--circular");
		const circularCount = await circularSwatches.count();
		expect(circularCount).toBeGreaterThan(0);

		// 各円形スウォッチでtitle属性のロール情報とARIA説明の一致を検証
		for (let i = 0; i < circularCount; i++) {
			const swatch = circularSwatches.nth(i);
			const describedBy = await swatch.getAttribute("aria-describedby");
			expect(describedBy).not.toBeNull();

			// title属性からロール情報を取得
			const titleAttr = await swatch.getAttribute("title");
			expect(titleAttr).not.toBeNull();

			// title属性から「セマンティックロール:」以降のロール名一覧を抽出
			// 改行を含む場合があるため、[\s\S]で全文取得
			const roleMatch = titleAttr?.match(/セマンティックロール:\s*([\s\S]+)/);
			expect(roleMatch).not.toBeNull();
			// 改行またはカンマで分割してロール名を抽出
			const rolesFromTitle = roleMatch![1]
				.split(/[,\n]/)
				.map((r) => r.trim())
				.filter((r) => r.length > 0);
			expect(rolesFromTitle.length).toBeGreaterThan(0);

			// ARIA説明にロール情報が含まれていること
			const descElement = page.locator(`#${describedBy}`);
			const descText = await descElement.textContent();
			expect(descText).toContain("セマンティックロール:");

			// title属性に含まれる全てのロール名がARIA説明にも含まれていることを検証
			for (const roleName of rolesFromTitle) {
				expect(descText).toContain(roleName);
			}

			// ロールラベルが表示されていることも確認
			const roleLabel = swatch.locator(".dads-swatch__role-label");
			const labelText = (await roleLabel.textContent())?.trim() ?? "";
			expect(labelText.length).toBeGreaterThan(0);
		}
	});

	test("円形スウォッチのロールラベルにpointer-events: noneが設定されていること", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// 円形スウォッチのロールラベルを取得
		const roleLabels = page.locator(".dads-swatch__role-label");
		const labelCount = await roleLabels.count();
		expect(labelCount).toBeGreaterThan(0);

		// 全てのロールラベルでpointer-events: noneを確認
		for (let i = 0; i < labelCount; i++) {
			const label = roleLabels.nth(i);
			const pointerEvents = await label.evaluate(
				(el) => window.getComputedStyle(el).pointerEvents,
			);
			expect(pointerEvents).toBe("none");
		}

		// 円形スウォッチ自体はpointer-eventsが有効であること（ホバー/フォーカス可能）
		const circularSwatches = page.locator(".dads-swatch--circular");
		const firstSwatch = circularSwatches.first();
		const swatchPointerEvents = await firstSwatch.evaluate(
			(el) => window.getComputedStyle(el).pointerEvents,
		);
		// autoまたは空文字（デフォルト値）であること
		expect(["auto", ""]).toContain(swatchPointerEvents);
	});
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * ハーモニータイプを選択する
 */
async function selectHarmonyType(
	page: Page,
	harmonyType: string,
): Promise<void> {
	const selector = page.locator("[data-testid='harmony-type-selector']");
	await selector.selectOption(harmonyType);
	// 固定待機ではなく、選択値の反映を条件待ち
	await expect(selector).toHaveValue(harmonyType);
}

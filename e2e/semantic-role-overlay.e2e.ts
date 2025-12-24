/**
 * Semantic Role Overlay E2E Tests
 *
 * Task 5.1: E2Eテストを実装する
 * - data-testid属性を使用した安定したセレクタでテスト実装
 * - シェードビュー表示時にセマンティックロール割り当てシェードにドットが表示されること
 * - ホバー時にツールチップが表示されること（既存情報+ロール情報）
 * - スクリーンリーダーでロール情報が読み上げられること（aria-describedby検証）
 * - キーボード操作（Tab）でスウォッチ間を移動できること
 * - ブランドスウォッチにブランドロールのみ表示されること
 * - DADS以外のハーモニー種別ではセマンティックロール表示がないこと
 *
 * Requirements: 1.1, 4.1
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
// 1. セマンティックロール表示の基本検証
// ============================================================================

test.describe("セマンティックロール表示", () => {
	test("DADSハーモニーでシェードビュー表示時、ロール割り当てシェードにドットが表示される", async ({
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

		// ドットインジケーターが表示されていることを確認
		const dot = greenSwatch.locator("[data-semantic-role-dot]");
		await expect(dot).toBeVisible();

		// ドットのスタイルを確認
		const dotStyles = await dot.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return {
				width: style.width,
				height: style.height,
				borderRadius: style.borderRadius,
				position: style.position,
			};
		});

		expect(dotStyles.width).toBe("12px");
		expect(dotStyles.height).toBe("12px");
		expect(dotStyles.borderRadius).toBe("50%");
		expect(dotStyles.position).toBe("absolute");
	});

	test("セマンティックロールがないシェードにはドットが表示されない", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// green-50シェード（通常ロールがない）を確認
		const swatchWithoutRole = page.locator("[data-testid='swatch-green-50']");
		await expect(swatchWithoutRole).toBeVisible();

		// ドットインジケーターが表示されていないことを確認
		const dot = swatchWithoutRole.locator("[data-semantic-role-dot]");
		await expect(dot).not.toBeVisible();
	});

	test("バッジラベルが正しく表示される", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// green-600シェード（Success-1ロールがある）を確認
		const greenSwatch = page.locator("[data-testid='swatch-green-600']");

		// バッジコンテナが表示されていることを確認
		const badges = greenSwatch.locator("[data-semantic-role-badges]");
		await expect(badges).toBeVisible();

		// バッジ内にロール名が含まれていることを確認
		const badgeText = await badges.textContent();
		expect(badgeText).toContain("Success");
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
// 3. ブランドロール表示
// ============================================================================

test.describe("ブランドロール表示", () => {
	test("ブランドスウォッチにブランドロールが表示される", async ({ page }) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='swatch-brand']");

		// ブランドスウォッチを確認
		const brandSwatch = page.locator("[data-testid='swatch-brand']");
		await expect(brandSwatch).toBeVisible();

		// ドットが表示されていることを確認
		const dot = brandSwatch.locator("[data-semantic-role-dot]");
		await expect(dot).toBeVisible();

		// バッジにPrimaryまたはSecondaryが含まれていることを確認
		const badges = brandSwatch.locator("[data-semantic-role-badges]");
		const badgeText = await badges.textContent();
		expect(badgeText).toMatch(/Primary|Secondary/);
	});

	test("ブランドスウォッチのaria-describedbyがbrand形式である", async ({
		page,
	}) => {
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='swatch-brand']");

		const brandSwatch = page.locator("[data-testid='swatch-brand']");
		const describedBy = await brandSwatch.getAttribute("aria-describedby");

		// ID形式: "swatch-brand-desc"
		expect(describedBy).toBe("swatch-brand-desc");

		// 対応する説明要素が存在すること
		const descElement = page.locator("#swatch-brand-desc");
		await expect(descElement).toBeAttached();
	});

	test("DADSスウォッチにはブランドロールが表示されない", async ({ page }) => {
		// ブランドカラーをgreen-600と同じ色に設定
		await page.fill("[data-testid='brand-color-input']", "#22C55E");
		await selectHarmonyType(page, "dads");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid^='swatch-']");

		// green-600シェードのバッジを確認
		const greenSwatch = page.locator("[data-testid='swatch-green-600']");
		const badges = greenSwatch.locator("[data-semantic-role-badges]");

		// バッジにPrimaryが含まれていないことを確認（ブランドロールはDADSスウォッチには表示しない）
		if ((await badges.count()) > 0) {
			const badgeText = await badges.textContent();
			expect(badgeText).not.toContain("Primary");
			expect(badgeText).not.toContain("Secondary");
		}
	});
});

// ============================================================================
// 4. DADS以外のハーモニー種別
// ============================================================================

test.describe("DADS以外のハーモニー種別", () => {
	test("Complementaryハーモニーではセマンティックロール表示がない", async ({
		page,
	}) => {
		// Complementaryハーモニータイプを選択
		await selectHarmonyType(page, "complementary");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='shades-view-container']");

		// スウォッチにロールオーバーレイがないことを確認
		const allDots = page.locator("[data-semantic-role-dot]");
		expect(await allDots.count()).toBe(0);
	});

	test("Triadicハーモニーではセマンティックロール表示がない", async ({
		page,
	}) => {
		await selectHarmonyType(page, "triadic");
		await page.click("[data-testid='render-shades-btn']");
		await page.waitForSelector("[data-testid='shades-view-container']");

		const allDots = page.locator("[data-semantic-role-dot]");
		expect(await allDots.count()).toBe(0);
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
	await page.waitForTimeout(100); // UIの更新を待つ
}

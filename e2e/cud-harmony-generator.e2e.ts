/**
 * CUD-aware Harmony Generator E2E Tests
 *
 * Task 9.2: E2Eテストの実装
 * - 4モード全ての切替とプレビュー更新の検証
 * - ブランドカラー入力から最適化、エクスポートまでの一連フロー検証
 *
 * Requirements: 8.4
 */

import { expect, type Page, test } from "playwright/test";

/**
 * CUD推奨色のHEX値
 */
const CUD_COLORS = {
	red: "#FF2800",
	green: "#35A16B",
	blue: "#0041FF",
	orange: "#FF9900",
	yellow: "#FAF500",
};

/**
 * テスト用非CUD色
 */
const NON_CUD_COLORS = {
	customRed: "#FF0000",
	customBlue: "#0000FF",
	customGreen: "#00FF00",
	brandOrange: "#FF5500",
};

/**
 * CUDモード
 */
type CudMode = "off" | "guide" | "soft" | "strict";

/**
 * モード別の期待される動作
 */
const MODE_EXPECTATIONS: Record<
	CudMode,
	{
		label: string;
		icon: string;
		hasBadges: boolean;
		hasOptimizationResult: boolean;
	}
> = {
	off: {
		label: "通常モード",
		icon: "○",
		hasBadges: false,
		hasOptimizationResult: false,
	},
	guide: {
		label: "ガイドモード",
		icon: "◐",
		hasBadges: true,
		hasOptimizationResult: false,
	},
	soft: {
		label: "ソフトスナップ",
		icon: "◉",
		hasBadges: true,
		hasOptimizationResult: true,
	},
	strict: {
		label: "CUD互換",
		icon: "●",
		hasBadges: true,
		hasOptimizationResult: true,
	},
};

// ============================================================================
// Test Setup
// ============================================================================

test.beforeEach(async ({ page }) => {
	// Navigate to the test page
	await page.goto("/e2e/cud-test-page.html");

	// Wait for the page to be fully loaded
	await page.waitForSelector("#mode-selector-container .cud-mode-selector");
});

// ============================================================================
// 1. 4モード全ての切替とプレビュー更新の検証
// ============================================================================

test.describe("4モード切替とプレビュー更新", () => {
	test("全モードを順次切り替えできる", async ({ page }) => {
		const modes: CudMode[] = ["off", "guide", "soft", "strict"];

		for (const mode of modes) {
			// モードを選択
			await selectMode(page, mode);

			// モード表示が更新されていることを確認
			const currentModeText = await page.locator("#current-mode").textContent();
			expect(currentModeText).toContain(MODE_EXPECTATIONS[mode].label);

			// ステータスが完了になっていることを確認
			await page.waitForSelector('#mode-status[data-status="complete"]');
		}
	});

	test("Offモードでバッジが表示されない", async ({ page }) => {
		await selectMode(page, "off");

		// 最適化実行
		await page.click("#optimize-btn");

		// バッジコンテナが空であることを確認
		const badges = await page.locator("#badge-container > *").count();
		expect(badges).toBe(0);

		// 最適化結果にmodeがoffと表示されていることを確認
		const resultText = await page.locator("#optimization-result").textContent();
		expect(resultText).toContain('"mode": "off"');
	});

	test("Guideモードでゾーンバッジが表示される", async ({ page }) => {
		await selectMode(page, "guide");

		// 最適化実行
		await page.click("#optimize-btn");

		// ゾーンバッジが表示されていることを確認
		const badges = await page
			.locator("#badge-container .cud-zone-badge")
			.count();
		expect(badges).toBeGreaterThan(0);

		// 最適化結果にzoneInfosが含まれていることを確認
		const resultText = await page.locator("#optimization-result").textContent();
		expect(resultText).toContain('"zoneInfos"');
	});

	test("Softモードで最適化結果とΔEバッジが表示される", async ({ page }) => {
		// 非CUD色を含むパレットを設定
		await page.fill(
			"#palette-colors",
			`${NON_CUD_COLORS.brandOrange},${NON_CUD_COLORS.customBlue}`,
		);

		await selectMode(page, "soft");
		await page.click("#optimize-btn");

		// 最適化結果が表示されていることを確認
		const resultText = await page.locator("#optimization-result").textContent();
		expect(resultText).toContain('"cudComplianceRate"');
		expect(resultText).toContain('"harmonyScore"');
		expect(resultText).toContain('"objectiveValue"');

		// ΔEバッジが表示されていることを確認
		const badges = await page
			.locator("#badge-container .cud-delta-badge")
			.count();
		expect(badges).toBeGreaterThan(0);
	});

	test("Strictモードで全色がスナップされ緑チェックが表示される", async ({
		page,
	}) => {
		// 非CUD色を含むパレットを設定
		await page.fill(
			"#palette-colors",
			`${NON_CUD_COLORS.customRed},${NON_CUD_COLORS.customGreen}`,
		);

		await selectMode(page, "strict");
		await page.click("#optimize-btn");

		// 全色がスナップされていることを確認
		const resultText = await page.locator("#optimization-result").textContent();
		expect(resultText).toContain('"snapped": true');

		// 緑チェックバッジが表示されていることを確認
		const badges = await page
			.locator("#badge-container .cud-strict-badge")
			.count();
		expect(badges).toBeGreaterThan(0);
	});

	test("モード切替時にプレビューが即座に更新される", async ({ page }) => {
		// CUD色を含むパレットを設定
		await page.fill(
			"#palette-colors",
			`${CUD_COLORS.red},${CUD_COLORS.green},${NON_CUD_COLORS.brandOrange}`,
		);
		await page.click("#optimize-btn");

		// 各モードに切り替えて、プレビューが更新されることを確認
		for (const mode of ["off", "guide", "soft", "strict"] as CudMode[]) {
			await selectMode(page, mode);

			// プレビューのスウォッチが表示されていることを確認
			const swatches = await page
				.locator("#palette-preview .color-swatch")
				.count();
			expect(swatches).toBe(3);

			// ステータスが完了になるまで待機
			await page.waitForSelector('#mode-status[data-status="complete"]');
		}
	});

	test("モード設定がLocalStorageに保存される", async ({ page }) => {
		// Strictモードを選択
		await selectMode(page, "strict");

		// LocalStorageの値を確認
		const storedMode = await page.evaluate(() => {
			return localStorage.getItem("leonardo-cud-mode");
		});
		expect(storedMode).toBe("strict");

		// ページをリロード
		await page.reload();
		await page.waitForSelector("#mode-selector-container .cud-mode-selector");

		// 保存されたモードが復元されていることを確認
		const currentModeText = await page.locator("#current-mode").textContent();
		expect(currentModeText).toContain("CUD互換");
	});
});

// ============================================================================
// 2. ブランドカラー入力から最適化、エクスポートまでの一連フロー検証
// ============================================================================

test.describe("ブランドカラーからエクスポートまでの一連フロー", () => {
	test("ブランドカラー設定からJSON/CSSエクスポートまでの完全フロー", async ({
		page,
	}) => {
		// Step 1: ブランドカラーを設定
		const brandColor = NON_CUD_COLORS.brandOrange;
		await page.fill("#anchor-hex", brandColor);
		await page.click("#set-anchor-btn");

		// アンカー情報が更新されていることを確認
		await page.waitForFunction(
			() =>
				!document
					.querySelector("#anchor-info")
					?.textContent?.includes("未設定"),
		);
		const anchorInfo = await page.locator("#anchor-info").textContent();
		expect(anchorInfo).toContain('"originalHex"');
		expect(anchorInfo).toContain('"nearestCud"');

		// Step 2: パレットを設定
		const palette = [
			brandColor,
			CUD_COLORS.blue,
			CUD_COLORS.green,
			NON_CUD_COLORS.customRed,
		];
		await page.fill("#palette-colors", palette.join(","));

		// Step 3: Softモードで最適化
		await selectMode(page, "soft");
		await page.click("#optimize-btn");

		// 最適化結果を確認
		const resultText = await page.locator("#optimization-result").textContent();
		const result = JSON.parse(resultText || "{}");
		expect(result.mode).toBe("soft");
		expect(result.cudComplianceRate).toBeGreaterThanOrEqual(0);
		expect(result.harmonyScore).toBeDefined();
		expect(result.processingTimeMs).toBeLessThan(200); // パフォーマンス要件

		// Step 4: JSONエクスポート
		await page.click("#export-json-btn");
		const jsonOutput = await page.locator("#export-output").inputValue();
		const exportedJson = JSON.parse(jsonOutput);

		// CUDメタデータが含まれていることを確認
		expect(exportedJson.colors).toBeDefined();
		expect(Object.keys(exportedJson.colors).length).toBe(palette.length);

		for (const colorData of Object.values<{
			cudMetadata?: { zone?: string; deltaE?: number };
		}>(exportedJson.colors)) {
			expect(colorData.cudMetadata).toBeDefined();
			expect(colorData.cudMetadata?.zone).toMatch(/^(safe|warning|off)$/);
			expect(colorData.cudMetadata?.deltaE).toBeGreaterThanOrEqual(0);
		}

		// CUDサマリーが含まれていることを確認
		expect(exportedJson.cudSummary).toBeDefined();
		expect(exportedJson.cudSummary.mode).toBe("soft");
		expect(exportedJson.cudSummary.complianceRate).toBeGreaterThanOrEqual(0);

		// Step 5: 検証サマリーを確認
		const summaryText = await page.locator("#validation-summary").textContent();
		const summary = JSON.parse(summaryText || "{}");
		expect(summary.totalColors).toBe(palette.length);
		expect(summary.zoneDistribution).toBeDefined();

		// Step 6: CSSエクスポート
		await page.click("#export-css-btn");
		const cssOutput = await page.locator("#export-output").inputValue();

		// CSSカスタムプロパティが出力されていることを確認
		expect(cssOutput).toContain("--color");
		// CUDコメントが含まれていることを確認
		expect(cssOutput).toContain("CUD:");
	});

	test("Strictモードでの完全CUD準拠エクスポート", async ({ page }) => {
		// 非CUD色のみのパレット
		const palette = [
			NON_CUD_COLORS.customRed,
			NON_CUD_COLORS.customBlue,
			NON_CUD_COLORS.customGreen,
		];
		await page.fill("#palette-colors", palette.join(","));

		// Strictモードで最適化
		await selectMode(page, "strict");
		await page.click("#optimize-btn");

		// 全色がスナップされていることを確認
		const resultText = await page.locator("#optimization-result").textContent();
		const result = JSON.parse(resultText || "{}");

		for (const color of result.palette) {
			expect(color.snapped).toBe(true);
			expect(color.cudTarget).toBeDefined();
		}

		// JSONエクスポート
		await page.click("#export-json-btn");
		const jsonOutput = await page.locator("#export-output").inputValue();
		const exportedJson = JSON.parse(jsonOutput);

		// Strictモードが記録されていることを確認
		expect(exportedJson.cudSummary.mode).toBe("strict");
	});

	test("アンカーカラー変更による調和スコアの変化", async ({ page }) => {
		const palette = [
			CUD_COLORS.red,
			CUD_COLORS.blue,
			NON_CUD_COLORS.brandOrange,
		];
		await page.fill("#palette-colors", palette.join(","));
		await selectMode(page, "soft");

		// 赤をアンカーに設定して最適化
		await page.fill("#anchor-hex", CUD_COLORS.red);
		await page.click("#set-anchor-btn");
		await page.click("#optimize-btn");

		const resultRed = await page.locator("#optimization-result").textContent();
		const harmonyScoreRed = JSON.parse(resultRed || "{}").harmonyScore;

		// 青をアンカーに設定して最適化
		await page.fill("#anchor-hex", CUD_COLORS.blue);
		await page.click("#set-anchor-btn");
		await page.click("#optimize-btn");

		const resultBlue = await page.locator("#optimization-result").textContent();
		const harmonyScoreBlue = JSON.parse(resultBlue || "{}").harmonyScore;

		// 異なるアンカーで調和スコアが変わることを確認
		expect(harmonyScoreRed).not.toBe(harmonyScoreBlue);
	});

	test("空のパレットでもエラーが発生しない", async ({ page }) => {
		// 空のパレットを設定
		await page.fill("#palette-colors", "");
		await selectMode(page, "soft");
		await page.click("#optimize-btn");

		// エラーが発生せず、空の結果が返されることを確認
		const resultText = await page.locator("#optimization-result").textContent();
		expect(resultText).toBeDefined();
	});

	test("不正なカラーコードでもクラッシュしない", async ({ page }) => {
		// 不正なカラーコードを含むパレットを設定
		await page.fill("#palette-colors", `${CUD_COLORS.red},invalid,#GGG`);
		await selectMode(page, "soft");

		// エラーが発生しないことを確認（ページがクラッシュしない）
		await page.click("#optimize-btn");
		const pageTitle = await page.title();
		expect(pageTitle).toBe("CUD E2E Test Page");
	});
});

// ============================================================================
// 3. パフォーマンステスト
// ============================================================================

test.describe("パフォーマンス検証", () => {
	test("20色パレットの最適化が200ms以内に完了する", async ({ page }) => {
		// 20色のパレットを生成
		const palette = [
			CUD_COLORS.red,
			CUD_COLORS.green,
			CUD_COLORS.blue,
			CUD_COLORS.orange,
			CUD_COLORS.yellow,
			NON_CUD_COLORS.customRed,
			NON_CUD_COLORS.customBlue,
			NON_CUD_COLORS.customGreen,
			NON_CUD_COLORS.brandOrange,
			"#AABBCC",
			"#DDEEFF",
			"#112233",
			"#445566",
			"#778899",
			"#AABBDD",
			"#CCDDEE",
			"#FF8800",
			"#00FF88",
			"#8800FF",
			"#88FF00",
		];

		await page.fill("#palette-colors", palette.join(","));
		await selectMode(page, "soft");
		await page.click("#optimize-btn");

		// 処理時間を確認
		const resultText = await page.locator("#optimization-result").textContent();
		const result = JSON.parse(resultText || "{}");
		expect(result.processingTimeMs).toBeLessThan(200);
	});

	test("モード切替が100ms以内にレスポンスする", async ({ page }) => {
		await page.fill(
			"#palette-colors",
			`${CUD_COLORS.red},${CUD_COLORS.green},${CUD_COLORS.blue}`,
		);

		const modes: CudMode[] = ["off", "guide", "soft", "strict"];

		for (const mode of modes) {
			const startTime = Date.now();
			await selectMode(page, mode);
			await page.waitForSelector('#mode-status[data-status="complete"]');
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(100);
		}
	});
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * CUDモードを選択する
 */
async function selectMode(page: Page, mode: CudMode): Promise<void> {
	const selector = await page.locator("#mode-selector-container select");
	await selector.selectOption(mode);

	// モード変更が反映されるまで待機
	await page.waitForFunction((expectedLabel) => {
		const el = document.querySelector("#current-mode");
		return el?.textContent?.includes(expectedLabel);
	}, MODE_EXPECTATIONS[mode].label);
}

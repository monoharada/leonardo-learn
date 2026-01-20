#!/usr/bin/env bun

/**
 * Studio View Variation Screenshot Capture
 *
 * Captures studio view with different 3-color accent combinations
 */

import * as path from "node:path";
import type { Page } from "playwright";
import {
	closeBrowserSafely,
	createBrowserSession,
	DEFAULT_BASE_URL,
	DEFAULT_TIMEOUT,
	ensureOutputDir,
	setViewportForFullPage,
	waitForApp,
} from "./shared/playwright-utils.ts";

const OUTPUT_DIR = ".context/screenshots";

async function captureStudioVariation(
	page: Page,
	variationIndex: number,
): Promise<boolean> {
	try {
		console.log(`Capturing: Studio View Variation ${variationIndex + 1}/5...`);

		// Studio viewに移動
		await page.goto(DEFAULT_BASE_URL);
		await page.click("#view-studio");
		await waitForApp(page, DEFAULT_TIMEOUT);
		await page.waitForTimeout(1200);

		// アクセント色を3色に設定（ボタンをクリック）
		const accentCountButtons = await page
			.locator("[aria-label='アクセント数'] button")
			.all();
		if (accentCountButtons.length >= 3) {
			// 3番目のボタン（3色）をクリック
			await accentCountButtons[2].click();
			await page.waitForTimeout(800);
		}

		// Harmonyビューをもう一度クリックして戻す
		await page.click("#view-harmony");
		await page.waitForTimeout(500);

		// Studio viewに再度移動（色をシャッフル）
		await page.click("#view-studio");
		await waitForApp(page, DEFAULT_TIMEOUT);
		await page.waitForTimeout(1200);

		// アクセント色を3色に設定（再度）
		const accentCountButtons2 = await page
			.locator("[aria-label='アクセント数'] button")
			.all();
		if (accentCountButtons2.length >= 3) {
			await accentCountButtons2[2].click();
			await page.waitForTimeout(800);
		}

		const outputPath = path.join(
			OUTPUT_DIR,
			`studio-3color-shuffle-${String(variationIndex + 1).padStart(2, "0")}.png`,
		);

		// フルページキャプチャ用にビューポート高さを調整
		await setViewportForFullPage(page, 1440);

		await page.screenshot({
			path: outputPath,
			fullPage: true,
			animations: "disabled",
		});

		console.log(
			`  Saved: studio-3color-shuffle-${String(variationIndex + 1).padStart(2, "0")}.png`,
		);
		return true;
	} catch (error) {
		console.error(
			`  Failed: Studio View Variation ${variationIndex + 1} - ${(error as Error).message}`,
		);
		return false;
	}
}

async function main(): Promise<void> {
	console.log(
		"Starting studio view variation screenshot capture (5 variations)...\n",
	);

	ensureOutputDir(OUTPUT_DIR);

	const { browser, page } = await createBrowserSession();
	let successCount = 0;

	try {
		console.log("Launching Chromium...");

		// 5 variations
		for (let i = 0; i < 5; i++) {
			const success = await captureStudioVariation(page, i);
			if (success) successCount++;
			await page.waitForTimeout(300);
		}

		console.log(`\nCapture complete: ${successCount}/5 successful\n`);
	} catch (error) {
		console.error(`\nFatal error: ${(error as Error).message}`);
		process.exit(1);
	} finally {
		await closeBrowserSafely(browser);
	}

	if (successCount < 5) {
		console.log("\nSome captures failed.");
		process.exit(1);
	}
}

main();

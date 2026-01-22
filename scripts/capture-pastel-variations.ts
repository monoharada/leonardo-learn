#!/usr/bin/env bun

/**
 * Studio View Pastel Preset - 5 Variations Screenshot Capture
 *
 * Pastelプリセットで「生成」ボタンを押して5パターン撮影
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

const OUTPUT_DIR = ".context/screenshots/pastel";

async function openSettings(page: Page): Promise<void> {
	const settings = page.locator(".studio-settings");
	const isOpen = await settings.getAttribute("open");
	if (!isOpen) {
		await settings.locator("summary").click();
		await page.waitForTimeout(300);
	}
}

async function selectPastelPreset(page: Page): Promise<void> {
	await openSettings(page);
	const presetButtons = page.locator(
		'[aria-label="ジェネレートプリセット"] button',
	);
	const buttons = await presetButtons.all();

	for (const btn of buttons) {
		const text = await btn.textContent();
		if (text?.includes("Pastel")) {
			await btn.click();
			await page.waitForTimeout(800);
			break;
		}
	}
}

async function clickGenerateButton(page: Page): Promise<void> {
	const generateBtn = page.locator(".studio-generate-btn");
	await generateBtn.click();
	await page.waitForTimeout(1500);
}

async function closeSettings(page: Page): Promise<void> {
	const settings = page.locator(".studio-settings");
	const isOpen = await settings.getAttribute("open");
	if (isOpen !== null) {
		await settings.locator("summary").click();
		await page.waitForTimeout(300);
	}
}

async function captureFullscreen(
	page: Page,
	filename: string,
): Promise<boolean> {
	try {
		console.log(`Capturing: ${filename}...`);
		await setViewportForFullPage(page, 1440);
		const outputPath = path.join(OUTPUT_DIR, filename);
		await page.screenshot({
			path: outputPath,
			fullPage: true,
			animations: "disabled",
		});
		console.log(`  Saved: ${filename}`);
		return true;
	} catch (error) {
		console.error(`  Failed: ${(error as Error).message}`);
		return false;
	}
}

async function main(): Promise<void> {
	console.log("=== Studio View Pastel Preset - 5 Variations ===\n");

	ensureOutputDir(OUTPUT_DIR);
	const { browser, page } = await createBrowserSession();
	let successCount = 0;

	try {
		// Studio Viewに移動
		await page.goto(DEFAULT_BASE_URL);
		await page.click("#view-studio");
		await waitForApp(page, DEFAULT_TIMEOUT);
		await page.waitForTimeout(1000);

		// Pastelプリセットを選択
		await selectPastelPreset(page);

		// 設定パネルを閉じる
		await closeSettings(page);
		await page.waitForTimeout(500);

		// 5回撮影（生成ボタンで色を変更）
		for (let i = 1; i <= 5; i++) {
			const filename = `studio-pastel-${String(i).padStart(2, "0")}.png`;

			if (await captureFullscreen(page, filename)) {
				successCount++;
			}

			// 最後以外は生成ボタンをクリックして色を変更
			if (i < 5) {
				await clickGenerateButton(page);
			}
		}

		console.log(`\n=== Complete: ${successCount}/5 screenshots saved ===`);
		console.log(`Output: ${OUTPUT_DIR}/\n`);
	} catch (error) {
		console.error(`Error: ${(error as Error).message}`);
		process.exit(1);
	} finally {
		await closeBrowserSafely(browser);
	}
}

main();

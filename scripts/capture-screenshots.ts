#!/usr/bin/env bun

/**
 * Full-screen Screenshot Capture Script (Playwright)
 *
 * Captures all 6 views of leonardo-learn application with full-page screenshots
 * including scrollable content.
 */

import * as path from "node:path";
import type { Page } from "playwright";
import {
	closeBrowserSafely,
	closeDialogs,
	createBrowserSession,
	DEFAULT_BASE_URL,
	DEFAULT_TIMEOUT,
	ensureOutputDir,
	setViewportForFullPage,
	takeDebugScreenshot,
	validateScreenshot,
	waitForApp,
	waitForHarmonyView,
} from "./shared/playwright-utils.ts";

const OUTPUT_DIR = ".context/screenshots";

interface CaptureConfig {
	filename: string;
	description: string;
	setup: (page: Page) => Promise<void>;
	fullPage?: boolean;
	isModal?: boolean;
}

const CAPTURES: CaptureConfig[] = [
	{
		filename: "01-harmony-view.png",
		description: "Harmony View (initial)",
		setup: async (page) => {
			await page.goto(DEFAULT_BASE_URL);
			await waitForHarmonyView(page, DEFAULT_TIMEOUT);
			await page.waitForTimeout(1000);
		},
		fullPage: true,
	},
	{
		filename: "02-palette-view.png",
		description: "Palette View",
		setup: async (page) => {
			await page.click("#view-palette");
			await waitForApp(page, DEFAULT_TIMEOUT);
			await page.waitForTimeout(1500);
		},
		fullPage: true,
	},
	{
		filename: "03-shades-view.png",
		description: "Shades View",
		setup: async (page) => {
			await page.click("#view-shades");
			await waitForApp(page, DEFAULT_TIMEOUT);
			await page.waitForFunction(
				() =>
					document.querySelectorAll(
						"main [class*='shade'], main [class*='card']",
					).length > 0,
				{ timeout: DEFAULT_TIMEOUT },
			);
			await page.waitForTimeout(1500);
		},
		fullPage: true,
	},
	{
		filename: "04-accessibility-view.png",
		description: "Accessibility View",
		setup: async (page) => {
			await page.click("#view-accessibility");
			await waitForApp(page, DEFAULT_TIMEOUT);
			await page.waitForFunction(
				() =>
					document.querySelectorAll(
						"main [class*='cvd'], main [class*='comparison']",
					).length > 0,
				{ timeout: DEFAULT_TIMEOUT },
			);
			await page.waitForTimeout(1500);
		},
		fullPage: true,
	},
	{
		filename: "05-color-detail-modal.png",
		description: "Color Detail Modal",
		setup: async (page) => {
			// Navigate to palette view first
			await page.click("#view-palette");
			await waitForApp(page, DEFAULT_TIMEOUT);
			await page.waitForTimeout(1500);

			// Find and click a details button
			const buttons = await page.locator("button").all();
			let clicked = false;
			for (const btn of buttons) {
				const text = await btn.textContent();
				if (text?.includes("\u8a73")) {
					await btn.click();
					clicked = true;
					break;
				}
			}

			if (!clicked) {
				// Fallback: click any interactive color element
				await page.click("div[class*='color']");
			}

			// Wait for dialog to open
			await page.waitForFunction(
				() => {
					const dialog = document.querySelector("#color-detail-dialog");
					return dialog?.hasAttribute("open");
				},
				{ timeout: DEFAULT_TIMEOUT },
			);
			await page.waitForTimeout(800);
		},
		fullPage: true,
		isModal: true,
	},
	{
		filename: "06-export-dialog.png",
		description: "Export Dialog",
		setup: async (page) => {
			await page.click("#export-btn");
			await page.waitForSelector("#export-dialog[open]", {
				timeout: DEFAULT_TIMEOUT,
			});
			await page.waitForTimeout(800);
		},
		fullPage: false,
		isModal: true,
	},
];

async function captureScreenshot(
	page: Page,
	config: CaptureConfig,
): Promise<boolean> {
	try {
		console.log(`Capturing: ${config.description}...`);

		await config.setup(page);

		const outputPath = path.join(OUTPUT_DIR, config.filename);

		if (config.isModal) {
			const dialogSelector = config.filename.includes("color-detail")
				? "#color-detail-dialog"
				: "#export-dialog";

			const dialog = page.locator(dialogSelector);
			await dialog.screenshot({
				path: outputPath,
				animations: "disabled",
			});
		} else {
			if (config.fullPage) {
				await setViewportForFullPage(page);
			}

			await page.screenshot({
				path: outputPath,
				fullPage: config.fullPage ?? true,
				animations: "disabled",
			});
		}

		console.log(`  Saved: ${config.filename}`);
		return true;
	} catch (error) {
		console.error(
			`  Failed: ${config.description} - ${(error as Error).message}`,
		);
		await takeDebugScreenshot(page, OUTPUT_DIR, config.filename);
		return false;
	}
}

async function main(): Promise<void> {
	console.log("Starting full-screen screenshot capture...\n");

	ensureOutputDir(OUTPUT_DIR);

	const { browser, page } = await createBrowserSession();
	let successCount = 0;

	try {
		console.log("Launching Chromium...");

		for (const config of CAPTURES) {
			const success = await captureScreenshot(page, config);
			if (success) successCount++;
			await closeDialogs(page);
		}

		console.log(
			`\nCapture complete: ${successCount}/${CAPTURES.length} successful\n`,
		);

		console.log("Validating screenshots...\n");
		for (const config of CAPTURES) {
			const filepath = path.join(OUTPUT_DIR, config.filename);
			const result = validateScreenshot(filepath);

			if (result.exists) {
				console.log(`  ${config.filename}: ${result.sizeKB} KB`);
				if (result.isEmpty) {
					console.warn(`    WARNING: File is empty!`);
				}
			} else {
				console.log(`  Missing: ${config.filename}`);
			}
		}
	} catch (error) {
		console.error(`\nFatal error: ${(error as Error).message}`);
		process.exit(1);
	} finally {
		await closeBrowserSafely(browser);
	}

	// Allow success if at least 5 out of 6 captured (modal can be fallback)
	if (successCount < 5) {
		console.log("\nCritical failures detected.");
		process.exit(1);
	}

	if (successCount < CAPTURES.length) {
		console.log(
			`\nMain views captured successfully (${successCount}/${CAPTURES.length}).`,
		);
		console.log("   Note: Modal may use fallback version.");
	}
}

main();

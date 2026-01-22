#!/usr/bin/env bun

import * as path from "node:path";
import type { Page } from "playwright";
import {
	closeBrowserSafely,
	createBrowserSession,
	DEFAULT_BASE_URL,
	DEFAULT_TIMEOUT,
	setViewportForFullPage,
	waitForApp,
} from "./shared/playwright-utils.ts";

const OUTPUT_DIR = ".context/screenshots/fullscreen";

async function captureColorDetailModal(page: Page): Promise<boolean> {
	console.log("Attempting Color Detail Modal capture...");

	try {
		await page.goto(DEFAULT_BASE_URL);
		await page.click("#view-manual");
		await waitForApp(page, DEFAULT_TIMEOUT);
		await page.waitForTimeout(2000);

		console.log("Looking for clickable elements...");

		// Find all buttons - we found 130 color buttons earlier
		const allButtons = await page
			.locator("button[style*='background-color']")
			.all();
		console.log(`Found ${allButtons.length} potential color buttons`);

		if (allButtons.length > 0) {
			// Try clicking the first few buttons to see if modal opens
			for (let i = 0; i < Math.min(3, allButtons.length); i++) {
				console.log(`\nTrying button ${i + 1}...`);
				try {
					await allButtons[i].click();
					await page.waitForTimeout(1500);

					// Check for modal
					const modal = page.locator("#color-detail-dialog");
					if ((await modal.count()) > 0) {
						const isOpen = await modal.evaluate((el) =>
							el.hasAttribute("open"),
						);
						if (isOpen) {
							console.log("SUCCESS: Modal found and open!");
							await setViewportForFullPage(page, 1440);
							const outputPath = path.join(
								OUTPUT_DIR,
								"color-detail-modal.png",
							);
							await page.screenshot({
								path: outputPath,
								fullPage: true,
								animations: "disabled",
							});
							console.log("Screenshot saved!");
							return true;
						}
					}

					// Also try looking for any dialog/modal elements
					const anyDialog = await page
						.locator("[role='dialog'], dialog")
						.first();
					if ((await anyDialog.count()) > 0) {
						const isVisible = await anyDialog.isVisible();
						if (isVisible) {
							console.log("Found visible dialog element!");
							await setViewportForFullPage(page, 1440);
							const outputPath = path.join(
								OUTPUT_DIR,
								"color-detail-modal.png",
							);
							await page.screenshot({
								path: outputPath,
								fullPage: true,
								animations: "disabled",
							});
							console.log("Screenshot saved!");
							return true;
						}
					}
				} catch (e) {
					console.log(`Button ${i + 1} failed, trying next...`);
				}
			}
		}

		console.log("Could not open modal");
		return false;
	} catch (error) {
		console.error(`Error: ${(error as Error).message}`);
		return false;
	}
}

async function main(): Promise<void> {
	const { browser, page } = await createBrowserSession();

	try {
		const success = await captureColorDetailModal(page);
		console.log(`\nResult: ${success ? "SUCCESS" : "FAILED"}`);
	} finally {
		await closeBrowserSafely(browser);
	}
}

main();

#!/usr/bin/env bun

import type { Page } from "playwright";
import {
	closeBrowserSafely,
	createBrowserSession,
	DEFAULT_BASE_URL,
	DEFAULT_TIMEOUT,
	waitForApp,
} from "./shared/playwright-utils.ts";

async function debugModal(page: Page): Promise<void> {
	console.log("Navigating to Manual view...");
	await page.goto(DEFAULT_BASE_URL);
	await page.click("#view-manual");
	await waitForApp(page, DEFAULT_TIMEOUT);
	await page.waitForTimeout(2000);

	console.log("\nDebug: Checking for elements...");

	// Check for color slots
	const slots = await page.locator("[data-target]").all();
	console.log(`Found ${slots.length} data-target elements`);

	// Find all buttons with background colors
	const colorButtons = await page.locator("button[style*='background']").all();
	console.log(`Found ${colorButtons.length} color buttons`);

	if (slots.length > 0) {
		console.log("\nClicking first slot...");
		await slots[0].click();
		await page.waitForTimeout(1500);

		console.log("After clicking slot, looking for color picker buttons...");
		const pickButtons = await page
			.locator("button[style*='background-color']")
			.all();
		console.log(`Found ${pickButtons.length} color picker buttons`);

		if (pickButtons.length > 0) {
			console.log("\nClicking first color picker...");
			await pickButtons[0].click();
			await page.waitForTimeout(2000);

			console.log("\nChecking if modal appeared...");
			const modal = page.locator("#color-detail-dialog");
			const count = await modal.count();
			console.log(`Modal count: ${count}`);

			if (count > 0) {
				const isOpen = await modal.evaluate((el) => el.hasAttribute("open"));
				console.log(`Modal has open attribute: ${isOpen}`);

				if (isOpen) {
					console.log("SUCCESS: Modal is open!");
					await page.screenshot({
						path: ".context/screenshots/fullscreen/color-detail-modal-debug.png",
					});
					console.log("Screenshot saved!");
				}
			}
		}
	}
}

async function main(): Promise<void> {
	const { browser, page } = await createBrowserSession();

	try {
		await debugModal(page);
	} catch (error) {
		console.error(`Error: ${(error as Error).message}`);
	} finally {
		await closeBrowserSafely(browser);
	}
}

main();

#!/usr/bin/env bun

/**
 * Debug Accessibility View
 *
 * Captures console messages, page errors, and page state for debugging
 * accessibility view issues.
 */

import {
	closeBrowserSafely,
	createBrowserSession,
	DEFAULT_BASE_URL,
	ensureOutputDir,
} from "./shared/playwright-utils.ts";

const OUTPUT_DIR = ".context/screenshots";

async function debugAccessibilityView(): Promise<void> {
	const { browser, page } = await createBrowserSession({ headless: false });

	const consoleLogs: string[] = [];

	page.on("console", (msg) => {
		consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
	});

	page.on("pageerror", (err) => {
		consoleLogs.push(`[ERROR] ${err.message}`);
	});

	try {
		console.log("Navigating to application...");
		await page.goto(DEFAULT_BASE_URL);
		await page.waitForTimeout(2000);

		console.log("Clicking accessibility view...");
		await page.click("#view-accessibility");
		await page.waitForTimeout(3000);

		console.log("\nConsole Messages:");
		for (const log of consoleLogs) {
			console.log(log);
		}

		const pageState = await page.evaluate(() => {
			const appElement = document.querySelector("#app");
			const accessibilityView = document.querySelector(
				'[id="accessibility-view"]',
			);

			return {
				appDisplay: appElement
					? window.getComputedStyle(appElement).display
					: "not found",
				accessibilityViewVisible:
					!!accessibilityView && !accessibilityView.hasAttribute("hidden"),
				alertCount: document.querySelectorAll('[role="alert"]').length,
				alertTexts: Array.from(document.querySelectorAll('[role="alert"]')).map(
					(el) => ({
						text: el.textContent,
						ariaLevel: el.getAttribute("aria-live"),
					}),
				),
				styleSheets: document.styleSheets.length,
				bodyClass: document.body.className,
			};
		});

		console.log("\nPage State:");
		console.log(JSON.stringify(pageState, null, 2));

		const contentHeight = await page.evaluate(() => {
			const main = document.querySelector(".dads-main__content");
			return main ? main.scrollHeight : document.body.scrollHeight;
		});

		console.log("\nContent Dimensions:");
		console.log(`Content height: ${contentHeight}px`);

		ensureOutputDir(OUTPUT_DIR);
		await page.screenshot({
			path: `${OUTPUT_DIR}/debug-accessibility-view.png`,
		});
		console.log(
			`\nScreenshot saved to ${OUTPUT_DIR}/debug-accessibility-view.png`,
		);
	} catch (error) {
		console.error("Error:", error);
	} finally {
		await closeBrowserSafely(browser);
	}
}

debugAccessibilityView();

#!/usr/bin/env bun

/**
 * Capture Accessibility View with Error States
 *
 * Captures the accessibility view and ensures error alerts are visible
 * if they occur during CVD simulation loading.
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
	takeDebugScreenshot,
	takeFullPageScreenshot,
	validateScreenshot,
	waitForApp,
	waitForHarmonyView,
} from "./shared/playwright-utils.ts";

const OUTPUT_DIR = ".context/screenshots";

const COLOR_VARIATIONS = [
	{ hex: "#41048e", name: "default", description: "Default Color (Blue)" },
	{ hex: "#FF6B35", name: "coral", description: "Coral/Orange-Red" },
	{ hex: "#4CAF50", name: "green", description: "Green" },
	{ hex: "#E91E63", name: "pink", description: "Pink/Magenta" },
] as const;

interface ColorConfig {
	hex: string;
	name: string;
	description: string;
}

async function setColorInput(page: Page, hex: string): Promise<void> {
	const hexInputs = await page.locator('input[type="text"]').all();

	for (const input of hexInputs) {
		const placeholder = await input.getAttribute("placeholder");
		if (placeholder?.includes("HEX")) {
			await input.click();
			await input.press("Control+A");
			await input.fill(hex);
			await input.press("Enter");
			console.log(`  Color set to ${hex}`);
			return;
		}
	}

	// Fallback: use first text input
	if (hexInputs.length > 0) {
		await hexInputs[0].click();
		await hexInputs[0].press("Control+A");
		await hexInputs[0].fill(hex);
		await hexInputs[0].press("Enter");
		console.log(`  Color set to ${hex} (fallback)`);
	}
}

async function checkForErrorAlerts(page: Page): Promise<void> {
	const errorAlerts = await page.locator('[role="alert"]').all();
	if (errorAlerts.length > 0) {
		console.log(`  Found ${errorAlerts.length} error alert(s):`);
		for (const alert of errorAlerts) {
			const text = await alert.textContent();
			console.log(`     - ${text?.trim()}`);
		}
	} else {
		console.log("  No error alerts detected");
	}
}

async function captureAccessibilityView(
	page: Page,
	config: ColorConfig,
): Promise<boolean> {
	try {
		console.log(
			`Capturing accessibility view for ${config.description} (${config.hex})...`,
		);

		await page.goto(DEFAULT_BASE_URL);
		await waitForHarmonyView(page, DEFAULT_TIMEOUT);
		await page.waitForTimeout(1000);

		// Set custom color if not default
		if (config.hex !== "#41048e") {
			await setColorInput(page, config.hex);
			await page.waitForTimeout(1500);
		}

		// Navigate to accessibility view
		console.log("  Loading accessibility view...");
		await page.click("#view-accessibility");
		await waitForApp(page, DEFAULT_TIMEOUT);

		// Wait for CVD comparison to load
		console.log("  Waiting for CVD comparisons to render...");
		await page.waitForFunction(
			() => {
				const comparisons = document.querySelectorAll(
					"main [class*='cvd'], main [class*='comparison']",
				);
				return comparisons.length > 0;
			},
			{ timeout: DEFAULT_TIMEOUT },
		);

		// Wait extra time for any error alerts to appear
		await page.waitForTimeout(2000);

		await checkForErrorAlerts(page);

		const filename = `accessibility-${config.name}-${config.hex.replace("#", "")}.png`;
		const outputPath = path.join(OUTPUT_DIR, filename);

		await takeFullPageScreenshot(page, outputPath);
		console.log(`  Saved: ${filename}`);
		return true;
	} catch (error) {
		console.error(
			`  Failed: ${config.description} - ${(error as Error).message}`,
		);
		await takeDebugScreenshot(page, OUTPUT_DIR, `accessibility-${config.name}`);
		return false;
	}
}

async function main(): Promise<void> {
	console.log("Starting accessibility view capture...\n");

	ensureOutputDir(OUTPUT_DIR);

	const { browser, page } = await createBrowserSession();
	let successCount = 0;

	try {
		console.log("Launching Chromium...");

		for (const config of COLOR_VARIATIONS) {
			const success = await captureAccessibilityView(page, config);
			if (success) successCount++;
			await closeDialogs(page);
		}

		console.log(
			`\nCapture complete: ${successCount}/${COLOR_VARIATIONS.length} successful\n`,
		);

		console.log("Validating screenshots...\n");
		for (const config of COLOR_VARIATIONS) {
			const filename = `accessibility-${config.name}-${config.hex.replace("#", "")}.png`;
			const filepath = path.join(OUTPUT_DIR, filename);
			const result = validateScreenshot(filepath);

			if (result.exists) {
				console.log(`  ${filename}: ${result.sizeKB} KB`);
			} else {
				console.log(`  Missing: ${filename}`);
			}
		}

		console.log("");
	} catch (error) {
		console.error(`\nFatal error: ${(error as Error).message}`);
		process.exit(1);
	} finally {
		await closeBrowserSafely(browser);
	}

	if (successCount < COLOR_VARIATIONS.length) {
		console.log("\nSome captures failed.");
		process.exit(1);
	}

	console.log("All accessibility views captured successfully!");
}

main();

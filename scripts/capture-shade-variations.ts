#!/usr/bin/env bun

/**
 * Shade View Variations Capture Script
 *
 * Captures shade views for multiple custom brand colors
 * to showcase color variations in the shading system.
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

const OUTPUT_DIR = ".context/screenshots/variations";

const COLOR_VARIATIONS = [
	{ hex: "#FF6B35", name: "coral", description: "Coral/Orange-Red" },
	{ hex: "#4CAF50", name: "green", description: "Green" },
	{ hex: "#9C27B0", name: "purple", description: "Purple" },
	{ hex: "#E91E63", name: "pink", description: "Pink/Magenta" },
	{ hex: "#00BCD4", name: "cyan", description: "Cyan/Teal" },
] as const;

interface ColorConfig {
	hex: string;
	name: string;
	description: string;
}

async function setColorInput(page: Page, hex: string): Promise<boolean> {
	const hexInputs = await page.locator('input[type="text"]').all();

	for (const input of hexInputs) {
		const placeholder = await input.getAttribute("placeholder");
		if (placeholder?.includes("HEX")) {
			await input.click();
			await input.press("Control+A");
			await input.fill(hex);
			await input.press("Enter");
			console.log(`  Color set to ${hex}`);
			return true;
		}
	}

	// Fallback: use first text input
	if (hexInputs.length > 0) {
		await hexInputs[0].click();
		await hexInputs[0].press("Control+A");
		await hexInputs[0].fill(hex);
		await hexInputs[0].press("Enter");
		console.log(`  Color set to ${hex} (fallback)`);
		return true;
	}

	return false;
}

async function captureShadeVariation(
	page: Page,
	config: ColorConfig,
): Promise<boolean> {
	try {
		console.log(`Capturing shade for ${config.description} (${config.hex})...`);

		await page.goto(DEFAULT_BASE_URL);
		await waitForHarmonyView(page, DEFAULT_TIMEOUT);
		await page.waitForTimeout(1000);

		await setColorInput(page, config.hex);
		await page.waitForTimeout(1500);

		await page.click("#view-shades");
		await waitForApp(page, DEFAULT_TIMEOUT);
		await page.waitForFunction(
			() =>
				document.querySelectorAll("main [class*='shade'], main [class*='card']")
					.length > 0,
			{ timeout: DEFAULT_TIMEOUT },
		);
		await page.waitForTimeout(1500);

		const filename = `shade-${config.name}-${config.hex.replace("#", "")}.png`;
		const outputPath = path.join(OUTPUT_DIR, filename);

		await takeFullPageScreenshot(page, outputPath);
		console.log(`  Saved: ${filename}`);
		return true;
	} catch (error) {
		console.error(
			`  Failed: ${config.description} - ${(error as Error).message}`,
		);
		await takeDebugScreenshot(page, OUTPUT_DIR, `shade-${config.name}`);
		return false;
	}
}

async function main(): Promise<void> {
	console.log("Starting shade view variations capture...\n");

	ensureOutputDir(OUTPUT_DIR);

	const { browser, page } = await createBrowserSession();
	let successCount = 0;

	try {
		console.log("Launching Chromium...");

		for (const config of COLOR_VARIATIONS) {
			const success = await captureShadeVariation(page, config);
			if (success) successCount++;
			await closeDialogs(page);
		}

		console.log(
			`\nCapture complete: ${successCount}/${COLOR_VARIATIONS.length} successful\n`,
		);

		console.log("Validating screenshots...\n");
		for (const config of COLOR_VARIATIONS) {
			const filename = `shade-${config.name}-${config.hex.replace("#", "")}.png`;
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

	console.log("All shade variations captured successfully!");
}

main();

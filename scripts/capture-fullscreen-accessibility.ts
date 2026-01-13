#!/usr/bin/env bun

/**
 * Capture Fullscreen Accessibility View with CVD Simulation (Color Difference Sorted)
 *
 * Captures the accessibility view with:
 * - Primary Color: #c74700 (Monochromatic)
 * - CVD Simulation sorted by delta-E (color difference)
 * - Full page screenshot including error alerts
 */

import * as path from "node:path";
import type { Page } from "playwright";
import {
	closeBrowserSafely,
	closeDialogs,
	createBrowserSession,
	DEFAULT_BASE_URL,
	ensureOutputDir,
	takeDebugScreenshot,
	takeFullPageScreenshot,
	validateScreenshot,
	waitForHarmonyView,
} from "./shared/playwright-utils.ts";

const OUTPUT_DIR = ".context/screenshots";
const TIMEOUT = 8000;

interface CaptureConfig {
	hex: string;
	name: string;
	description: string;
	mode: "monochromatic" | "harmony";
}

async function selectMonochromaticHarmony(page: Page): Promise<boolean> {
	const harmonySelects = await page.locator("select").all();

	for (const select of harmonySelects) {
		const options = await select.locator("option").all();
		for (const option of options) {
			const text = await option.textContent();
			if (text?.toLowerCase().includes("monochromatic")) {
				await select.selectOption(text);
				console.log("  Monochromatic harmony selected");
				return true;
			}
		}
	}

	console.warn("  Could not find monochromatic harmony option");
	return false;
}

async function selectCVDDeltaESort(page: Page): Promise<void> {
	// Switch to CVD Simulation tab
	console.log("  Locating CVD Simulation tab...");
	const sortTabs = await page.locator(".dads-a11y-sort-tab").all();

	for (let i = 0; i < sortTabs.length; i++) {
		const tabText = await sortTabs[i].textContent();
		if (tabText?.includes("CVD")) {
			console.log(`  Found CVD Simulation tab at index ${i}`);
			await sortTabs[i].click();
			await page.waitForTimeout(800);
			break;
		}
	}

	// Select delta-E sorting
	console.log("  Switching to delta-E (color difference) sorting...");
	const sortingButtons = await page.locator(".dads-a11y-sort-tab").all();

	for (let i = 0; i < sortingButtons.length; i++) {
		const btnText = await sortingButtons[i].textContent();
		if (btnText?.includes("ΔE")) {
			console.log(`  Found delta-E sort button at index ${i}`);
			await sortingButtons[i].click();
			await page.waitForTimeout(800);
			break;
		}
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
	config: CaptureConfig,
): Promise<boolean> {
	try {
		console.log(
			`Capturing accessibility view: ${config.description} (${config.hex})...`,
		);

		// Navigate to initial page
		console.log("  Navigating to home page...");
		await page.goto(DEFAULT_BASE_URL, { waitUntil: "networkidle" });
		await waitForHarmonyView(page, TIMEOUT);
		await page.waitForTimeout(1000);

		// Wait for input elements to be ready
		await page.waitForFunction(
			() => document.getElementById("keyColors") !== null,
			{ timeout: TIMEOUT },
		);

		// Set custom color
		console.log(`  Setting primary color to ${config.hex}...`);
		const harmonyColorInput = page.locator("#harmony-color-input");
		await harmonyColorInput.fill(config.hex);
		await harmonyColorInput.press("Enter");
		await page.waitForTimeout(500);
		console.log(`  Primary color set to ${config.hex}`);
		await page.waitForTimeout(1500);

		// Select monochromatic harmony if needed
		if (config.mode === "monochromatic") {
			console.log("  Selecting monochromatic harmony...");
			await selectMonochromaticHarmony(page);
			await page.waitForTimeout(1000);
		}

		// Navigate to accessibility view
		console.log("  Navigating to accessibility view...");
		const accessibilityButton = page.locator("#view-accessibility");
		if (await accessibilityButton.isVisible()) {
			await accessibilityButton.click();
		} else {
			console.warn("  Accessibility button not found");
		}

		await page.waitForSelector("#app", { timeout: TIMEOUT });
		await page.waitForTimeout(500);

		await selectCVDDeltaESort(page);

		// Wait for CVD comparisons to load
		console.log("  Waiting for CVD comparisons to render...");
		await page.waitForFunction(
			() => {
				const comparisons = document.querySelectorAll(
					"[class*='cvd'], [class*='comparison'], .dads-a11y-boundary-container",
				);
				return comparisons.length > 0;
			},
			{ timeout: TIMEOUT },
		);

		// Wait extra time for animations and error alerts
		await page.waitForTimeout(2000);

		await checkForErrorAlerts(page);

		// Take screenshot
		const filename = `accessibility-fullscreen-${config.name}-${config.hex.replace("#", "")}-cvd-deltaE.png`;
		const outputPath = path.join(OUTPUT_DIR, filename);

		console.log("  Taking fullscreen screenshot...");
		await takeFullPageScreenshot(page, outputPath, 1200);

		const result = validateScreenshot(outputPath);
		console.log(`Saved: ${filename} (${result.sizeKB} KB)\n`);

		return true;
	} catch (error) {
		console.error(
			`Failed: ${config.description} - ${(error as Error).message}`,
		);
		await takeDebugScreenshot(page, OUTPUT_DIR, `accessibility-${config.name}`);
		return false;
	}
}

async function main(): Promise<void> {
	console.log("Fullscreen Accessibility View Capture\n");
	console.log("Configuration:");
	console.log("  Primary Color: #c74700 (Monochromatic)");
	console.log("  CVD Simulation: Sorted by delta-E (Color Difference)");
	console.log("  Output: Full-page screenshot with error alerts\n");

	ensureOutputDir(OUTPUT_DIR);

	const CAPTURE_CONFIGS: CaptureConfig[] = [
		{
			hex: "#c74700",
			name: "c74700-monochromatic",
			description: "Primary Color #c74700 (Monochromatic)",
			mode: "monochromatic",
		},
	];

	const { browser, page } = await createBrowserSession();
	let successCount = 0;

	try {
		console.log("Launching Chromium...\n");

		for (const config of CAPTURE_CONFIGS) {
			const success = await captureAccessibilityView(page, config);
			if (success) successCount++;
			await closeDialogs(page);
		}

		console.log(
			`Capture complete: ${successCount}/${CAPTURE_CONFIGS.length} successful\n`,
		);

		console.log("Validating screenshots...\n");
		for (const config of CAPTURE_CONFIGS) {
			const filename = `accessibility-fullscreen-${config.name}-${config.hex.replace("#", "")}-cvd-deltaE.png`;
			const filepath = path.join(OUTPUT_DIR, filename);
			const result = validateScreenshot(filepath);

			if (result.exists) {
				console.log(`  ${filename}`);
				console.log(`     Size: ${result.sizeKB} KB`);
			} else {
				console.log(`  Missing: ${filename}`);
			}
		}

		console.log(`\nScreenshot location: ${OUTPUT_DIR}/`);
		console.log("");
	} catch (error) {
		console.error(`\nFatal error: ${(error as Error).message}`);
		process.exit(1);
	} finally {
		await closeBrowserSafely(browser);
	}

	if (successCount < CAPTURE_CONFIGS.length) {
		console.log("\nSome captures failed.");
		process.exit(1);
	}

	console.log("Accessibility view captured successfully!");
}

main();

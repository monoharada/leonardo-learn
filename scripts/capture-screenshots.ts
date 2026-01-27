#!/usr/bin/env bun

/**
 * Full-screen Screenshot Capture Script (Playwright)
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
} from "./shared/playwright-utils.ts";

const OUTPUT_DIR = ".context/screenshots";

interface CaptureConfig {
	filename: string;
	description: string;
	setup: (page: Page) => Promise<void>;
	fullPage?: boolean;
	dialogSelector?: string;
	/** When true, capture must exist & be non-empty (defaults to true). */
	required?: boolean;
}

/** Common page initialization */
async function initPage(page: Page, view: "studio" | "manual" = "studio") {
	await page.goto(DEFAULT_BASE_URL, { waitUntil: "networkidle" });
	await page.waitForTimeout(2000);
	await page.click(`#view-${view}`);
	await page.waitForSelector(`#view-${view}[data-active="true"]`, {
		timeout: DEFAULT_TIMEOUT,
	});
	await waitForApp(page, DEFAULT_TIMEOUT);
}

/** Helper to select preset and theme, then generate */
async function selectPresetAndTheme(
	page: Page,
	preset: string,
	theme: string,
	generateCount = 2,
): Promise<void> {
	// Scroll to bottom to make toolbar visible and settings panel accessible
	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	await page.waitForTimeout(500);

	// Open settings panel (details element)
	const summary = page.locator(".studio-settings__summary");
	await summary.scrollIntoViewIfNeeded();
	await summary.click();
	await page.waitForSelector(".studio-settings[open]", { timeout: 5000 });
	await page.waitForTimeout(500);

	// Use JavaScript to click buttons (they may be in a popup above the viewport)
	const { presetClicked, themeClicked } = await page.evaluate(
		({ preset, theme }) => {
			let presetClicked = false;
			let themeClicked = false;

			// Find and click preset button
			const presetGroup = document.querySelector(
				'.dads-button-group[aria-label="ジェネレートプリセット"]',
			);
			if (presetGroup) {
				const presetBtn = Array.from(
					presetGroup.querySelectorAll("button"),
				).find((btn) => btn.textContent?.trim() === preset);
				if (presetBtn) {
					(presetBtn as HTMLButtonElement).click();
					presetClicked = true;
				}
			}

			// Find and click theme button
			const themeGroup = document.querySelector(
				'.dads-button-group[aria-label="テーマ"]',
			);
			if (themeGroup) {
				const themeBtn = Array.from(themeGroup.querySelectorAll("button")).find(
					(btn) => btn.textContent?.trim() === theme,
				);
				if (themeBtn) {
					(themeBtn as HTMLButtonElement).click();
					themeClicked = true;
				}
			}

			return { presetClicked, themeClicked };
		},
		{ preset, theme },
	);
	if (!presetClicked) {
		throw new Error(`Preset button not found: ${preset}`);
	}
	if (!themeClicked) {
		throw new Error(`Theme button not found: ${theme}`);
	}

	// Confirm that the selected state is applied (render is async)
	await page.waitForFunction(
		({ preset, theme }) => {
			const presetBtn = Array.from(
				document.querySelectorAll(
					'.dads-button-group[aria-label="ジェネレートプリセット"] button',
				),
			).find((btn) => btn.textContent?.trim() === preset);
			const themeBtn = Array.from(
				document.querySelectorAll(
					'.dads-button-group[aria-label="テーマ"] button',
				),
			).find((btn) => btn.textContent?.trim() === theme);

			return (
				presetBtn?.getAttribute("data-active") === "true" &&
				themeBtn?.getAttribute("data-active") === "true"
			);
		},
		{ preset, theme },
		{ timeout: DEFAULT_TIMEOUT },
	);
	await page.waitForTimeout(500);

	// Close settings panel
	await summary.click();
	await page.waitForTimeout(300);

	// Generate multiple times for variation
	const generateBtn = page.locator(".studio-generate-btn");
	for (let i = 0; i < generateCount; i++) {
		await generateBtn.click();
		await page.waitForTimeout(800);
	}

	// Scroll back to top for screenshot
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.waitForTimeout(500);
}

const CAPTURES: CaptureConfig[] = [
	{
		filename: "00-studio-view.png",
		description: "Studio View",
		setup: async (page) => {
			await initPage(page, "studio");
			await page.waitForTimeout(1500);
		},
		fullPage: true,
	},
	{
		filename: "01-manual-view.png",
		description: "Manual View",
		setup: async (page) => {
			await initPage(page, "manual");
			await page.waitForTimeout(1500);
		},
		fullPage: true,
	},
	{
		filename: "02-cvd-protanopia.png",
		description: "CVD Simulation (Protanopia)",
		setup: async (page) => {
			await initPage(page, "studio");
			await page.click('button[data-cvd="protanopia"]');
			await page.waitForTimeout(1000);
		},
		fullPage: true,
	},
	{
		filename: "03-a11y-drawer.png",
		description: "Accessibility Drawer",
		setup: async (page) => {
			await initPage(page, "studio");
			await page.click("#a11y-drawer-trigger");
			await page.waitForSelector("#a11y-drawer[open]", {
				timeout: DEFAULT_TIMEOUT,
			});
			await page.waitForTimeout(500);
		},
		fullPage: true,
		dialogSelector: "#a11y-drawer",
	},
	{
		filename: "04-swatch-popover.png",
		description: "Swatch Popover",
		setup: async (page) => {
			await initPage(page, "studio");
			await page.waitForTimeout(1000);
			await page
				.locator(
					".studio-toolbar-swatch:not(.studio-toolbar-swatch--placeholder)",
				)
				.first()
				.click();
			await page.waitForSelector('.studio-swatch-popover[data-open="true"]', {
				timeout: DEFAULT_TIMEOUT,
			});
			await page.waitForTimeout(500);
		},
		fullPage: true,
	},
	{
		filename: "05-export-dialog.png",
		description: "Export Dialog",
		setup: async (page) => {
			await initPage(page, "studio");
			await page.waitForTimeout(1000);
			await page.locator(".studio-export-btn").first().click();
			await page.waitForSelector("#export-dialog[open]", {
				timeout: DEFAULT_TIMEOUT,
			});
			await page.waitForTimeout(500);
		},
		fullPage: false,
		dialogSelector: "#export-dialog",
	},
	// Variation captures: Preset × Theme combinations
	{
		filename: "10-pastel-hero.png",
		description: "Pastel + ヒーローエリア",
		setup: async (page) => {
			await initPage(page, "studio");
			await selectPresetAndTheme(page, "Pastel", "ヒーローエリア");
		},
		fullPage: true,
	},
	{
		filename: "11-pastel-branding.png",
		description: "Pastel + ブランディング",
		setup: async (page) => {
			await initPage(page, "studio");
			await selectPresetAndTheme(page, "Pastel", "ブランディング");
		},
		fullPage: true,
	},
	{
		filename: "12-vibrant-hero.png",
		description: "Vibrant + ヒーローエリア",
		setup: async (page) => {
			await initPage(page, "studio");
			await selectPresetAndTheme(page, "Vibrant", "ヒーローエリア");
		},
		fullPage: true,
	},
	{
		filename: "13-vibrant-branding.png",
		description: "Vibrant + ブランディング",
		setup: async (page) => {
			await initPage(page, "studio");
			await selectPresetAndTheme(page, "Vibrant", "ブランディング");
		},
		fullPage: true,
	},
	{
		filename: "14-dark-hero.png",
		description: "Dark + ヒーローエリア",
		setup: async (page) => {
			await initPage(page, "studio");
			await selectPresetAndTheme(page, "Dark", "ヒーローエリア");
		},
		fullPage: true,
	},
	{
		filename: "15-dark-branding.png",
		description: "Dark + ブランディング",
		setup: async (page) => {
			await initPage(page, "studio");
			await selectPresetAndTheme(page, "Dark", "ブランディング");
		},
		fullPage: true,
	},
	{
		filename: "16-highcontrast-hero.png",
		description: "High Contrast + ヒーローエリア",
		setup: async (page) => {
			await initPage(page, "studio");
			await selectPresetAndTheme(page, "High Contrast", "ヒーローエリア");
		},
		fullPage: true,
	},
	{
		filename: "17-default-pinpoint.png",
		description: "Default + ピンポイント",
		setup: async (page) => {
			await initPage(page, "studio");
			await selectPresetAndTheme(page, "Default", "ピンポイント");
		},
		fullPage: true,
	},
	{
		filename: "18-default-branding.png",
		description: "Default + ブランディング",
		setup: async (page) => {
			await initPage(page, "studio");
			await selectPresetAndTheme(page, "Default", "ブランディング");
		},
		fullPage: true,
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

		if (config.dialogSelector) {
			await page.locator(config.dialogSelector).screenshot({
				path: outputPath,
				animations: "disabled",
			});
		} else {
			if (config.fullPage) await setViewportForFullPage(page);
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
	console.log("Starting screenshot capture...\n");
	ensureOutputDir(OUTPUT_DIR);

	const { browser, page } = await createBrowserSession();
	let successCount = 0;
	const requiredFailures: string[] = [];

	try {
		for (const config of CAPTURES) {
			if (await captureScreenshot(page, config)) successCount++;
			await closeDialogs(page);
		}

		console.log(
			`\nCapture complete: ${successCount}/${CAPTURES.length} successful\n`,
		);

		for (const config of CAPTURES) {
			const result = validateScreenshot(path.join(OUTPUT_DIR, config.filename));
			const isRequired = config.required !== false;
			if (isRequired && (!result.exists || result.isEmpty)) {
				requiredFailures.push(config.filename);
			}
			console.log(
				result.exists
					? `  ${config.filename}: ${result.sizeKB} KB`
					: `  Missing: ${config.filename}`,
			);
		}
	} finally {
		await closeBrowserSafely(browser);
	}

	if (requiredFailures.length > 0) {
		console.error(
			`\nMissing required screenshots (${requiredFailures.length}): ${requiredFailures.join(
				", ",
			)}\n`,
		);
		process.exit(1);
	}
}

main();

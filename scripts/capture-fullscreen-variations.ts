#!/usr/bin/env bun

/**
 * Full-screen Screenshot Capture for Studio/Manual View Variations
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

const OUTPUT_DIR = ".context/screenshots/fullscreen";

// テーマ定義
const THEMES = ["pinpoint", "hero", "branding"] as const;
const THEME_LABELS: Record<string, string> = {
	pinpoint: "ピンポイント",
	hero: "ヒーローエリア",
	branding: "ブランディング",
};

// プリセット定義
const PRESETS = [
	"default",
	"high-contrast",
	"pastel",
	"vibrant",
	"dark",
] as const;
const PRESET_LABELS: Record<string, string> = {
	default: "Default",
	"high-contrast": "High Contrast",
	pastel: "Pastel",
	vibrant: "Vibrant",
	dark: "Dark",
};

async function openSettings(page: Page): Promise<void> {
	const settings = page.locator(".studio-settings");
	const isOpen = await settings.getAttribute("open");
	if (!isOpen) {
		await settings.locator("summary").click();
		await page.waitForTimeout(300);
	}
}

async function selectTheme(page: Page, theme: string): Promise<void> {
	await openSettings(page);
	const themeButtons = page.locator('[aria-label="テーマ"] button');
	const buttons = await themeButtons.all();

	for (const btn of buttons) {
		const text = await btn.textContent();
		if (text?.includes(THEME_LABELS[theme] ?? theme)) {
			await btn.click();
			await page.waitForTimeout(800);
			break;
		}
	}
}

async function selectPreset(page: Page, preset: string): Promise<void> {
	await openSettings(page);
	const presetButtons = page.locator(
		'[aria-label="ジェネレートプリセット"] button',
	);
	const buttons = await presetButtons.all();

	for (const btn of buttons) {
		const text = await btn.textContent();
		if (text?.includes(PRESET_LABELS[preset] ?? preset)) {
			await btn.click();
			await page.waitForTimeout(800);
			break;
		}
	}
}

async function regeneratePalette(page: Page): Promise<void> {
	const generateBtn = page.locator(".studio-generate-btn");
	await generateBtn.click();
	await page.waitForTimeout(1200);
}

async function captureFullscreen(
	page: Page,
	filename: string,
	description: string,
): Promise<boolean> {
	try {
		console.log(`Capturing: ${description}...`);
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
		console.error(`  Failed: ${description} - ${(error as Error).message}`);
		return false;
	}
}

async function captureStudioThemes(page: Page): Promise<number> {
	console.log("\n=== Studio View - Theme Variations (5 patterns) ===\n");
	let successCount = 0;

	const themePlan = [
		{
			theme: "pinpoint",
			regenerate: false,
			filename: "studio-theme-01-pinpoint.png",
		},
		{ theme: "hero", regenerate: false, filename: "studio-theme-02-hero.png" },
		{
			theme: "branding",
			regenerate: false,
			filename: "studio-theme-03-branding.png",
		},
		{
			theme: "pinpoint",
			regenerate: true,
			filename: "studio-theme-04-pinpoint-v2.png",
		},
		{
			theme: "hero",
			regenerate: true,
			filename: "studio-theme-05-hero-v2.png",
		},
	];

	for (const plan of themePlan) {
		await page.goto(DEFAULT_BASE_URL);
		await page.click("#view-studio");
		await waitForApp(page, DEFAULT_TIMEOUT);
		await page.waitForTimeout(1000);

		if (plan.regenerate) {
			await regeneratePalette(page);
		}

		await selectTheme(page, plan.theme);
		await page.waitForTimeout(800);

		const settings = page.locator(".studio-settings");
		const isOpen = await settings.getAttribute("open");
		if (isOpen !== null) {
			await settings.locator("summary").click();
			await page.waitForTimeout(300);
		}

		const success = await captureFullscreen(
			page,
			plan.filename,
			`Studio Theme: ${plan.theme}${plan.regenerate ? " (regenerated)" : ""}`,
		);
		if (success) successCount++;
	}

	return successCount;
}

async function captureStudioPresets(page: Page): Promise<number> {
	console.log("\n=== Studio View - Preset Variations (5 patterns) ===\n");
	let successCount = 0;

	for (const preset of PRESETS) {
		await page.goto(DEFAULT_BASE_URL);
		await page.click("#view-studio");
		await waitForApp(page, DEFAULT_TIMEOUT);
		await page.waitForTimeout(1000);

		await selectPreset(page, preset);
		await page.waitForTimeout(800);

		const settings = page.locator(".studio-settings");
		const isOpen = await settings.getAttribute("open");
		if (isOpen !== null) {
			await settings.locator("summary").click();
			await page.waitForTimeout(300);
		}

		const filename = `studio-preset-${preset}.png`;
		const success = await captureFullscreen(
			page,
			filename,
			`Studio Preset: ${preset}`,
		);
		if (success) successCount++;
	}

	return successCount;
}

async function captureColorDetailModal(page: Page): Promise<boolean> {
	console.log("\n=== Color Detail Modal ===\n");

	try {
		await page.goto(DEFAULT_BASE_URL);
		await page.click("#view-manual");
		await waitForApp(page, DEFAULT_TIMEOUT);
		await page.waitForTimeout(1500);

		const keySlot = page.locator('[data-target="key"]').first();
		if ((await keySlot.count()) > 0) {
			await keySlot.click();
			await page.waitForTimeout(1000);

			const colorCard = page
				.locator("button[style*='background-color']")
				.first();
			if ((await colorCard.count()) > 0) {
				await colorCard.click();
				await page.waitForTimeout(1000);
			}
		}

		await page.waitForFunction(
			() => {
				const dialog = document.querySelector("#color-detail-dialog");
				return dialog?.hasAttribute("open");
			},
			{ timeout: 5000 },
		);
		await page.waitForTimeout(800);

		const outputPath = path.join(OUTPUT_DIR, "color-detail-modal.png");
		await setViewportForFullPage(page, 1440);
		await page.screenshot({
			path: outputPath,
			fullPage: true,
			animations: "disabled",
		});

		console.log("  Saved: color-detail-modal.png");
		return true;
	} catch (error) {
		console.error(`  Failed: Color Detail Modal - ${(error as Error).message}`);
		return false;
	}
}

async function captureManualFlow(page: Page): Promise<number> {
	console.log("\n=== Manual View - User Flow (4 steps) ===\n");
	let successCount = 0;

	await page.goto(DEFAULT_BASE_URL);
	await page.click("#view-manual");
	await waitForApp(page, DEFAULT_TIMEOUT);
	await page.waitForTimeout(1500);

	let success = await captureFullscreen(
		page,
		"manual-01-initial.png",
		"Manual: Initial State",
	);
	if (success) successCount++;

	const keySlot = page
		.locator('[data-target="key"], .manual-toolbar__slot')
		.first();
	if ((await keySlot.count()) > 0) {
		await keySlot.click();
		await page.waitForTimeout(500);
	}

	const blueCard = page
		.locator('[data-hue="blue"] .dads-color-card, [class*="blue"]')
		.first();
	if ((await blueCard.count()) > 0) {
		await blueCard.click();
		await page.waitForTimeout(800);
	}

	success = await captureFullscreen(
		page,
		"manual-02-key-color.png",
		"Manual: Key Color Selected",
	);
	if (success) successCount++;

	const secondarySlot = page.locator('[data-target="secondary"]').first();
	if ((await secondarySlot.count()) > 0) {
		await secondarySlot.click();
		await page.waitForTimeout(500);
	}

	const orangeCard = page
		.locator('[data-hue="orange"] .dads-color-card, [class*="orange"]')
		.first();
	if ((await orangeCard.count()) > 0) {
		await orangeCard.click();
		await page.waitForTimeout(800);
	}

	success = await captureFullscreen(
		page,
		"manual-03-secondary.png",
		"Manual: Secondary Color Added",
	);
	if (success) successCount++;

	const accentSlot = page.locator('[data-target="accent-1"]').first();
	if ((await accentSlot.count()) > 0) {
		await accentSlot.click();
		await page.waitForTimeout(500);
	}

	const greenCard = page
		.locator('[data-hue="green"] .dads-color-card, [class*="green"]')
		.first();
	if ((await greenCard.count()) > 0) {
		await greenCard.click();
		await page.waitForTimeout(800);
	}

	success = await captureFullscreen(
		page,
		"manual-04-full-palette.png",
		"Manual: Full Palette",
	);
	if (success) successCount++;

	return successCount;
}

async function main(): Promise<void> {
	console.log("===========================================");
	console.log("Full-screen Screenshot Capture");
	console.log("===========================================\n");

	ensureOutputDir(OUTPUT_DIR);

	const { browser, page } = await createBrowserSession();

	let totalSuccess = 0;
	const totalExpected = 15;

	try {
		totalSuccess += await captureStudioThemes(page);
		totalSuccess += await captureStudioPresets(page);
		if (await captureColorDetailModal(page)) totalSuccess++;
		totalSuccess += await captureManualFlow(page);

		console.log("\n===========================================");
		console.log(
			`Capture complete: ${totalSuccess}/${totalExpected} successful`,
		);
		console.log(`Output: ${OUTPUT_DIR}/`);
		console.log("===========================================\n");
	} catch (error) {
		console.error(`\nFatal error: ${(error as Error).message}`);
		process.exit(1);
	} finally {
		await closeBrowserSafely(browser);
	}

	if (totalSuccess < totalExpected * 0.8) {
		console.log("\nCritical failures detected.");
		process.exit(1);
	}
}

main();

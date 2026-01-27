/**
 * Shared Playwright utilities for screenshot capture scripts
 *
 * Consolidates common patterns across capture scripts to reduce duplication
 * and ensure consistent behavior.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { type Browser, chromium, type Page } from "playwright";

// Common configuration constants
export const DEFAULT_BASE_URL = process.env.BASE_URL || "http://localhost:3000";
export const DEFAULT_OUTPUT_DIR = ".context/screenshots";
export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_VIEWPORT = { width: 1440, height: 900 };

export interface BrowserSessionOptions {
	headless?: boolean;
	viewport?: { width: number; height: number };
}

export interface CaptureResult {
	success: boolean;
	filename?: string;
	sizeKB?: string;
	error?: string;
}

/**
 * Ensures the output directory exists, creating it if necessary.
 */
export function ensureOutputDir(outputDir: string): void {
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}
}

/**
 * Gets file size in KB as a formatted string.
 */
export function getFileSizeKB(filepath: string): string {
	const stats = fs.statSync(filepath);
	return (stats.size / 1024).toFixed(1);
}

/**
 * Validates that a screenshot file exists and is not empty.
 */
export function validateScreenshot(filepath: string): {
	exists: boolean;
	sizeKB: string;
	isEmpty: boolean;
} {
	if (!fs.existsSync(filepath)) {
		return { exists: false, sizeKB: "0", isEmpty: true };
	}

	const stats = fs.statSync(filepath);
	const sizeKB = (stats.size / 1024).toFixed(1);

	return {
		exists: true,
		sizeKB,
		isEmpty: stats.size === 0,
	};
}

/**
 * Creates a browser session with standard configuration.
 */
export async function createBrowserSession(
	options: BrowserSessionOptions = {},
): Promise<{ browser: Browser; page: Page }> {
	const { headless = true, viewport = DEFAULT_VIEWPORT } = options;

	const browser = await chromium.launch({ headless });
	const page = await browser.newPage({ viewport });

	return { browser, page };
}

/**
 * Closes browser safely, ignoring errors.
 */
export async function closeBrowserSafely(
	browser: Browser | null,
): Promise<void> {
	if (browser) {
		await browser.close();
	}
}

/**
 * Takes a debug screenshot when an error occurs.
 */
export async function takeDebugScreenshot(
	page: Page,
	outputDir: string,
	name: string,
): Promise<void> {
	try {
		const debugFilename = `debug-${name}.png`;
		const debugPath = path.join(outputDir, debugFilename);
		await page.screenshot({ path: debugPath });
		console.log(`  Debug screenshot saved: ${debugFilename}`);
	} catch {
		// Ignore debug screenshot errors
	}
}

/**
 * Waits for the harmony view to be visible (initial page load).
 */
export async function waitForHarmonyView(
	page: Page,
	timeout: number = DEFAULT_TIMEOUT,
): Promise<void> {
	await page.waitForSelector("#harmony-view:not([hidden])", { timeout });
}

/**
 * Waits for the app element to have content rendered.
 */
export async function waitForApp(
	page: Page,
	timeout: number = DEFAULT_TIMEOUT,
): Promise<void> {
	// Wait for #app to have children (content loaded)
	await page.waitForFunction(
		() => {
			const app = document.querySelector("#app");
			return app && app.children.length > 0;
		},
		{ timeout },
	);
}

/**
 * Gets the content height for full-page captures.
 */
export async function getContentHeight(page: Page): Promise<number> {
	return page.evaluate(() => {
		const main = document.querySelector(".dads-main__content");
		return main ? main.scrollHeight : document.body.scrollHeight;
	});
}

/**
 * Sets viewport to match content height for full-page screenshots.
 */
export async function setViewportForFullPage(
	page: Page,
	minHeight: number = 900,
): Promise<void> {
	const contentHeight = await getContentHeight(page);
	const viewportHeight = Math.max(contentHeight, minHeight);
	await page.setViewportSize({ width: 1440, height: viewportHeight });
	await page.waitForTimeout(500);
}

/**
 * Takes a full-page screenshot with proper viewport adjustment.
 */
export async function takeFullPageScreenshot(
	page: Page,
	outputPath: string,
	minHeight: number = 900,
): Promise<void> {
	await setViewportForFullPage(page, minHeight);
	await page.screenshot({
		path: outputPath,
		fullPage: true,
		animations: "disabled",
	});
}

/**
 * Closes any open dialogs by pressing Escape.
 */
export async function closeDialogs(page: Page): Promise<void> {
	await page.keyboard.press("Escape");
	await page.waitForTimeout(300);
}

/**
 * Logs capture results in a consistent format.
 */
export function logCaptureResult(
	description: string,
	success: boolean,
	filename?: string,
	error?: string,
): void {
	if (success && filename) {
		console.log(`  Saved: ${filename}`);
	} else if (error) {
		console.error(`  Failed: ${description} - ${error}`);
	}
}

/**
 * Runs a capture session with standard setup/teardown.
 */
export async function runCaptureSession<T>(
	outputDir: string,
	captureFunction: (page: Page) => Promise<T>,
	options: BrowserSessionOptions = {},
): Promise<T> {
	ensureOutputDir(outputDir);

	const { browser, page } = await createBrowserSession(options);

	try {
		return await captureFunction(page);
	} finally {
		await closeBrowserSafely(browser);
	}
}

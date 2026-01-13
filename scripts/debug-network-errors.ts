#!/usr/bin/env bun

/**
 * Debug Network Errors
 *
 * Monitors network requests and console messages to identify
 * failed requests and JavaScript errors.
 */

import {
	closeBrowserSafely,
	createBrowserSession,
	DEFAULT_BASE_URL,
} from "./shared/playwright-utils.ts";

interface FailedRequest {
	url: string;
	status: number;
}

async function debugNetworkErrors(): Promise<void> {
	const { browser, page } = await createBrowserSession({ headless: true });

	const failedRequests: FailedRequest[] = [];
	const successfulRequests: string[] = [];
	const consoleLogs: string[] = [];

	page.on("response", (response) => {
		const status = response.status();
		if (status >= 400) {
			failedRequests.push({ url: response.url(), status });
		} else {
			successfulRequests.push(response.url());
		}
	});

	page.on("console", (msg) => {
		consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
	});

	page.on("pageerror", (err) => {
		consoleLogs.push(`[ERROR] ${err.message}`);
	});

	try {
		console.log("Loading application...");
		await page.goto(DEFAULT_BASE_URL);
		await page.waitForLoadState("networkidle");
		console.log("Initial page loaded\n");

		console.log("Failed Network Requests:");
		if (failedRequests.length === 0) {
			console.log("No failed requests on initial load\n");
		} else {
			for (const req of failedRequests) {
				console.log(`  ${req.status} - ${req.url}`);
			}
			console.log();
		}

		console.log("Clicking accessibility view...");
		await page.click("#view-accessibility");
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(1000);
		console.log("Accessibility view loaded\n");

		console.log("Failed Network Requests After Navigation:");
		const newFailures = failedRequests.filter(
			(req) => !successfulRequests.includes(req.url),
		);
		if (newFailures.length === 0) {
			console.log("No new failed requests\n");
		} else {
			for (const req of newFailures) {
				console.log(`  ${req.status} - ${req.url}`);
			}
			console.log();
		}

		console.log("All Console Messages:");
		for (const log of consoleLogs) {
			const isError = log.includes("error") || log.includes("Error");
			console.log(`${isError ? "[!]" : "   "} ${log}`);
		}

		const alerts = await page.locator('[role="alert"]').all();
		console.log(`\nAlert Elements Found: ${alerts.length}`);
		for (const alert of alerts) {
			const text = await alert.textContent();
			console.log(`   - ${text?.trim()}`);
		}
	} catch (error) {
		console.error("Error:", error);
	} finally {
		await closeBrowserSafely(browser);
	}
}

debugNetworkErrors();

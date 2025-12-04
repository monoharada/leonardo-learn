/**
 * Playwright E2E Test Configuration
 *
 * Task 9.2: E2Eテストの実装
 * - 4モード全ての切替とプレビュー更新の検証
 * - ブランドカラー入力から最適化、エクスポートまでの一連フロー検証
 */

import { defineConfig, devices } from "playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "bun run build && bunx serve -p 3000",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
});

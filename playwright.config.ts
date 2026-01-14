/**
 * Playwright E2E Test Configuration
 *
 * Task 9.2: E2Eテストの実装
 * - 4モード全ての切替とプレビュー更新の検証
 * - ブランドカラー入力から最適化、エクスポートまでの一連フロー検証
 */

import { defineConfig, devices } from "playwright/test";

const PORT = Number(process.env.PW_PORT ?? "3000");
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
	testDir: "./e2e",
	testMatch: /.*\.e2e\.ts/,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: BASE_URL,
		// CI環境ではストレージ節約のため失敗時のみtrace、ローカルでは常時記録
		trace: process.env.CI ? "on-first-retry" : "on",
		video: "on",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: `bun run build && npx serve . -l ${PORT}`,
		url: BASE_URL,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
});

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const PROJECT_ROOT = process.cwd();
const DEFAULT_BASE_URL = "http://localhost:3000";

const SLIDES_HTML_PATH = path.resolve(
	PROJECT_ROOT,
	"docs/view-capabilities-ja-slides.html",
);
const ASSETS_DIR = path.resolve(
	PROJECT_ROOT,
	"docs/view-capabilities-ja-slides-assets",
);
const PDF_OUT_PATH = path.resolve(
	PROJECT_ROOT,
	"docs/view-capabilities-ja-slides.pdf",
);

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pathExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function runCommand(cmd, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, {
			cwd: PROJECT_ROOT,
			stdio: "inherit",
			...options,
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) return resolve();
			reject(new Error(`${cmd} ${args.join(" ")} failed with exit code ${code}`));
		});
	});
}

async function waitForServer(url, timeoutMs = 30_000) {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		try {
			const res = await fetch(url, { method: "GET" });
			if (res.ok) return;
		} catch {
			// ignore
		}
		await sleep(250);
	}
	throw new Error(`Timed out waiting for server: ${url}`);
}

async function isServerReady(url) {
	try {
		const res = await fetch(url, { method: "GET" });
		return res.ok;
	} catch {
		return false;
	}
}

function startBunServer() {
	const child = spawn("bun", ["server.ts"], {
		cwd: PROJECT_ROOT,
		stdio: "inherit",
	});
	return child;
}

async function captureViewScreenshots(baseURL) {
	await fs.mkdir(ASSETS_DIR, { recursive: true });

	const browser = await chromium.launch();
	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
		});
		await context.addInitScript(() => {
			const style = document.createElement("style");
			style.textContent =
				"* { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; }";
			(document.head || document.documentElement).appendChild(style);
		});
		const page = await context.newPage();

		await page.goto(baseURL, { waitUntil: "domcontentloaded" });

		// 生成（ハーモニー）: Coolors表示が出るまで待つ
		await page.waitForSelector(".coolors-display", { timeout: 60_000 });
		await page.screenshot({
			path: path.join(ASSETS_DIR, "harmony.png"),
			fullPage: false,
		});

		// パレット
		await page.click("#view-palette");
		await page.waitForSelector('text="カラープレビュー"', { timeout: 60_000 });
		await page.screenshot({
			path: path.join(ASSETS_DIR, "palette.png"),
			fullPage: false,
		});

		// シェード
		await page.click("#view-shades");
		await page.waitForSelector(".dads-hue-section", { timeout: 60_000 });
		await page.screenshot({
			path: path.join(ASSETS_DIR, "shades.png"),
			fullPage: false,
		});

		// アクセシビリティ
		await page.click("#view-accessibility");
		await page.waitForSelector('text="この機能について"', { timeout: 60_000 });
		await page.screenshot({
			path: path.join(ASSETS_DIR, "accessibility.png"),
			fullPage: false,
		});
	} finally {
		await browser.close();
	}
}

async function renderSlidesPdf() {
	const htmlUrl = pathToFileURL(SLIDES_HTML_PATH).toString();

	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({
			viewport: { width: 1280, height: 720 },
		});
		await page.goto(htmlUrl, { waitUntil: "networkidle" });
		await page.pdf({
			path: PDF_OUT_PATH,
			printBackground: true,
			preferCSSPageSize: true,
		});
	} finally {
		await browser.close();
	}
}

async function main() {
	// Ensure dist exists (server is static)
	const distEntry = path.resolve(PROJECT_ROOT, "dist/index.js");
	if (!(await pathExists(distEntry))) {
		await runCommand("bun", ["run", "build"]);
	}

	// Ensure slide source exists
	if (!(await pathExists(SLIDES_HTML_PATH))) {
		throw new Error(`Missing slide source HTML: ${SLIDES_HTML_PATH}`);
	}

	const baseURL = process.env.BASE_URL || DEFAULT_BASE_URL;

	let server = null;
	try {
		// If something is already running (e.g., Playwright webServer), reuse it.
		const alreadyRunning = await isServerReady(baseURL);
		if (!alreadyRunning) {
			server = startBunServer();
			await waitForServer(baseURL);
		}

		await captureViewScreenshots(baseURL);
	} finally {
		server?.kill("SIGTERM");
	}

	await renderSlidesPdf();

	// biome-ignore lint/suspicious/noConsoleLog -- CLI output for generated artifacts
	console.log("Deck generated:");
	// biome-ignore lint/suspicious/noConsoleLog -- CLI output for generated artifacts
	console.log(`- PDF: ${PDF_OUT_PATH}`);
	// biome-ignore lint/suspicious/noConsoleLog -- CLI output for generated artifacts
	console.log(`- Assets: ${ASSETS_DIR}`);
}

main().catch((error) => {
	// biome-ignore lint/suspicious/noConsoleLog -- CLI error output
	console.error(error);
	process.exitCode = 1;
});

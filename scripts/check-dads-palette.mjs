import { chromium } from "playwright";

(async () => {
	const browser = await chromium.launch({ headless: false });
	const context = await browser.newContext();
	const page = await context.newPage();

	try {
		console.log("Opening http://localhost:8081...");
		await page.goto("http://localhost:8081", { waitUntil: "networkidle" });

		console.log("Page loaded. Waiting for interface...");
		await page.waitForSelector("#view-palette", { timeout: 10000 });

		console.log("Taking initial screenshot (Harmony view)...");
		await page.screenshot({
			path: "/Users/reiharada/dev/leonardo-learn/scripts/step0-initial-harmony.png",
			fullPage: true,
		});

		// Look for harmony style cards
		console.log("Looking for harmony style cards...");
		const harmonyCards = await page.evaluate(() => {
			const cards = Array.from(
				document.querySelectorAll('.dads-card, [class*="harmony"]'),
			);
			return cards.map((card) => ({
				text: card.textContent?.substring(0, 100),
				classes: card.className,
			}));
		});

		console.log("Found harmony cards:");
		console.log(JSON.stringify(harmonyCards, null, 2));

		// Try to click on a harmony card to select it (use first one)
		console.log("Clicking first harmony card to generate palette...");
		const clicked = await page.evaluate(() => {
			const cards = document.querySelectorAll(".dads-card");
			if (cards.length > 0) {
				cards[0].click();
				return true;
			}
			return false;
		});

		if (clicked) {
			console.log("Harmony card clicked, waiting for palette generation...");
			await page.waitForTimeout(2000);

			console.log("Taking screenshot after harmony selection...");
			await page.screenshot({
				path: "/Users/reiharada/dev/leonardo-learn/scripts/step1-harmony-selected.png",
				fullPage: true,
			});
		}

		console.log("Switching to Palette tab (パレット)...");
		await page.click("#view-palette");
		await page.waitForTimeout(1000);

		console.log("Taking screenshot of palette view...");
		await page.screenshot({
			path: "/Users/reiharada/dev/leonardo-learn/scripts/step2-palette-view.png",
			fullPage: true,
		});

		console.log("Looking for harmony type selector in palette view...");
		// Get all select element information
		const selectInfo = await page.evaluate(() => {
			const selects = Array.from(document.querySelectorAll("select"));
			return selects.map((select) => ({
				id: select.id,
				name: select.name,
				value: select.value,
				options: Array.from(select.options).map((opt) => ({
					value: opt.value,
					text: opt.text,
					selected: opt.selected,
				})),
			}));
		});

		console.log("Select elements found:");
		console.log(JSON.stringify(selectInfo, null, 2));

		// Try to find and select DADS option
		const dadsSelected = await page.evaluate(() => {
			const selects = Array.from(document.querySelectorAll("select"));
			for (const select of selects) {
				const options = Array.from(select.options);
				const dadsOption = options.find((opt) => opt.text.includes("DADS"));
				if (dadsOption) {
					select.value = dadsOption.value;
					select.dispatchEvent(new Event("change", { bubbles: true }));
					return true;
				}
			}
			return false;
		});

		if (dadsSelected) {
			console.log("DADS option selected!");
			await page.waitForTimeout(1500);

			console.log("Taking screenshot with DADS selected...");
			await page.screenshot({
				path: "/Users/reiharada/dev/leonardo-learn/scripts/step3-dads-selected.png",
				fullPage: true,
			});
		} else {
			console.log("Could not find DADS option");
		}

		// Get palette information
		console.log("\nExtracting semantic color information...");
		const semanticColors = await page.evaluate(() => {
			const results = [];

			// Try multiple selectors for color elements
			const selectors = [
				"[data-color-name]",
				".color-token",
				".semantic-color",
				'[class*="color"]',
				'[class*="Color"]',
			];

			for (const selector of selectors) {
				const elements = document.querySelectorAll(selector);
				elements.forEach((el) => {
					const name =
						el.getAttribute("data-color-name") ||
						el.getAttribute("data-name") ||
						el.textContent?.trim();
					const token =
						el.getAttribute("data-token") ||
						el.getAttribute("data-token-number");
					const color =
						el.style.backgroundColor || getComputedStyle(el).backgroundColor;

					if (
						name &&
						(name.includes("Success") ||
							name.includes("Error") ||
							name.includes("Warning") ||
							name.includes("green") ||
							name.includes("red"))
					) {
						results.push({
							name,
							token,
							color,
							selector,
							className: el.className,
						});
					}
				});
			}

			return results;
		});

		console.log("\nSemantic Colors Found:");
		console.log(JSON.stringify(semanticColors, null, 2));

		console.log("\nScreenshots saved successfully!");
		console.log(
			"- /Users/reiharada/dev/leonardo-learn/scripts/step1-after-generate.png",
		);
		console.log(
			"- /Users/reiharada/dev/leonardo-learn/scripts/step2-dads-selected.png",
		);

		// Keep browser open for manual inspection
		console.log(
			"\nBrowser will remain open for manual inspection. Press Ctrl+C to close.",
		);
		await page.waitForTimeout(60000);
	} catch (error) {
		console.error("Error:", error);
		await page.screenshot({
			path: "/Users/reiharada/dev/leonardo-learn/scripts/error-screenshot.png",
			fullPage: true,
		});
	} finally {
		await browser.close();
	}
})();

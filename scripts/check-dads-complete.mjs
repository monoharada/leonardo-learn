import { chromium } from "playwright";

(async () => {
	const browser = await chromium.launch({
		headless: false,
		slowMo: 300,
	});
	const context = await browser.newContext({
		viewport: { width: 1920, height: 1080 },
	});
	const page = await context.newPage();

	try {
		console.log("Opening http://localhost:8081...");
		await page.goto("http://localhost:8081", { waitUntil: "networkidle" });
		await page.waitForTimeout(1000);

		console.log("\n=== Step 1: Click Complementary harmony ===");
		await page.click('.dads-harmony-row:has-text("Complementary")');
		await page.waitForTimeout(2000);

		console.log("\n=== Step 2: Switch to Palette view ===");
		await page.click("#view-palette");
		await page.waitForTimeout(1500);

		await page.screenshot({
			path: "/Users/reiharada/dev/leonardo-learn/scripts/palette-top.png",
			fullPage: false,
		});
		console.log("Screenshot: palette-top.png");

		console.log("\n=== Step 3: Scroll down to see more colors ===");
		await page.evaluate(() => window.scrollTo(0, 800));
		await page.waitForTimeout(500);

		await page.screenshot({
			path: "/Users/reiharada/dev/leonardo-learn/scripts/palette-middle.png",
			fullPage: false,
		});

		await page.evaluate(() => window.scrollTo(0, 1600));
		await page.waitForTimeout(500);

		await page.screenshot({
			path: "/Users/reiharada/dev/leonardo-learn/scripts/palette-bottom.png",
			fullPage: false,
		});

		console.log("\n=== Step 4: Get full page info ===");
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.waitForTimeout(500);

		const pageInfo = await page.evaluate(() => {
			const info = {
				allHeadings: [],
				colorTokens: [],
				buttons: [],
				inputs: [],
			};

			// Get all headings that might indicate sections
			document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
				info.allHeadings.push(h.textContent.trim());
			});

			// Get all elements that look like color tokens
			document
				.querySelectorAll(
					'[class*="color"], [class*="token"], [class*="swatch"]',
				)
				.forEach((el) => {
					const text = el.textContent?.trim();
					if (text && text.length < 100) {
						info.colorTokens.push({
							text,
							className: el.className,
						});
					}
				});

			// Get all button text
			document.querySelectorAll("button").forEach((btn) => {
				const text = btn.textContent?.trim();
				if (text) {
					info.buttons.push(text);
				}
			});

			// Get all select-like elements
			document
				.querySelectorAll('select, [role="combobox"], [role="listbox"]')
				.forEach((el) => {
					info.inputs.push({
						tag: el.tagName,
						role: el.getAttribute("role"),
						id: el.id,
						className: el.className,
					});
				});

			return info;
		});

		console.log("\n=== Page Structure ===");
		console.log("Headings:", pageInfo.allHeadings.slice(0, 20));
		console.log("\nButtons (first 30):", pageInfo.buttons.slice(0, 30));
		console.log("\nInputs:", JSON.stringify(pageInfo.inputs, null, 2));
		console.log('\nColor tokens containing "Success", "Error", "Warning":');
		const semanticTokens = pageInfo.colorTokens.filter(
			(t) =>
				t.text.includes("Success") ||
				t.text.includes("Error") ||
				t.text.includes("Warning") ||
				t.text.includes("green-") ||
				t.text.includes("red-"),
		);
		console.log(JSON.stringify(semanticTokens, null, 2));

		console.log("\n=== Step 5: Take full page screenshot ===");
		await page.screenshot({
			path: "/Users/reiharada/dev/leonardo-learn/scripts/palette-full.png",
			fullPage: true,
		});
		console.log("Screenshot: palette-full.png");

		console.log("\n=== Step 6: Look for DADS option ===");
		// Search for any text containing "DADS" or "ハーモニー" in buttons
		const dadsButtonFound = await page.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll("button"));
			for (const btn of buttons) {
				if (btn.textContent?.includes("DADS")) {
					btn.click();
					return { found: true, text: btn.textContent };
				}
			}
			return { found: false };
		});

		console.log("DADS button search:", dadsButtonFound);

		if (dadsButtonFound.found) {
			await page.waitForTimeout(2000);
			await page.screenshot({
				path: "/Users/reiharada/dev/leonardo-learn/scripts/after-dads-click.png",
				fullPage: true,
			});
			console.log("Screenshot: after-dads-click.png");
		}

		// Check if there's a harmony type indicator in the palette view
		const harmonyInfo = await page.evaluate(() => {
			const harmonyElements = [];
			document.querySelectorAll("*").forEach((el) => {
				const text = el.textContent;
				if (
					text &&
					(text.includes("Complementary") ||
						text.includes("補色") ||
						text.includes("DADS") ||
						text.includes("Analogous") ||
						text.includes("類似色"))
				) {
					if (el.textContent.length < 200) {
						harmonyElements.push({
							text: el.textContent.trim(),
							tag: el.tagName,
							className: el.className,
						});
					}
				}
			});
			return harmonyElements.slice(0, 10);
		});

		console.log("\n=== Harmony-related elements ===");
		console.log(JSON.stringify(harmonyInfo, null, 2));

		console.log("\n=== All screenshots saved ===");
		console.log("Check scripts/ directory for:");
		console.log("- palette-top.png");
		console.log("- palette-middle.png");
		console.log("- palette-bottom.png");
		console.log("- palette-full.png");

		console.log(
			"\nBrowser stays open for 2 minutes. Press Ctrl+C to close early.",
		);
		await page.waitForTimeout(120000);
	} catch (error) {
		console.error("Error:", error);
		await page.screenshot({
			path: "/Users/reiharada/dev/leonardo-learn/scripts/error.png",
			fullPage: true,
		});
	} finally {
		await browser.close();
	}
})();

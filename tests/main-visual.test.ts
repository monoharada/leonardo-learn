import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function readUtf8(url: URL): string {
	return readFileSync(fileURLToPath(url), "utf8");
}

describe("Main visual SVG", () => {
	test("bundled SVG contains fixed male skin color", () => {
		const svg = readUtf8(
			new URL("../src/ui/demo/assets/main-visual.svg", import.meta.url),
		);

		const hasFixedSkinFill =
			/fill=(["'])#ffb695\1/i.test(svg) || /fill\s*:\s*#ffb695/i.test(svg);
		expect(hasFixedSkinFill).toBe(true);

		expect(svg).not.toMatch(/var\(--mv-bg,\s*#ffb695\)/i);
		expect(svg).not.toMatch(/fill\s*:\s*var\(--mv-bg,\s*#ffb695\)/i);
	});

	test("dist asset matches bundled SVG", () => {
		const distUrl = new URL("../dist/assets/main-visual.svg", import.meta.url);
		const distPath = fileURLToPath(distUrl);
		if (!existsSync(distPath)) return;

		const bundled = readUtf8(
			new URL("../src/ui/demo/assets/main-visual.svg", import.meta.url),
		);
		const dist = readFileSync(distPath, "utf8");

		expect(dist).toBe(bundled);
	});
});

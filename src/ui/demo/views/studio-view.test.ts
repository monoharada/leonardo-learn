/**
 * スタジオビューモジュールのテスト
 *
 * NOTE: DOM操作を伴う詳細な検証はE2Eでカバー。
 * このファイルでは、Studio内の配色変更で識別性スコア表示が更新されることを最小限確認する。
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import { resetState, state } from "../state";
import type { PaletteConfig } from "../types";

let onScoreUpdate: (() => void) | null = null;
const mockUpdateCVDScoreDisplay = mock(() => {
	onScoreUpdate?.();
});

// Mock heavy dependencies; only behavior we care about is updateCVDScoreDisplay being invoked.
mock.module("../cvd-controls", () => ({
	getDisplayHex: (hex: string) => hex,
	updateCVDScoreDisplay: mockUpdateCVDScoreDisplay,
}));

mock.module("../palette-generator", () => ({
	createDerivedPalettes: () => [],
}));

mock.module("./palette-preview", () => ({
	createPalettePreview: () => document.createElement("div"),
	createSeededRandom: () => () => 0.5,
	mapPaletteToPreviewColors: () => ({}),
}));

mock.module("@/core/tokens/dads-data-provider", () => ({
	loadDadsTokens: async () => [{ dummy: true }],
	findDadsColorByHex: () => ({ scale: 600 }),
	getDadsColorsByHue: () => ({
		colors: [
			{ scale: 800, hex: "#FF2800" }, // error
			{ scale: 600, hex: "#35A16B" }, // success
			{ scale: 700, hex: "#D7C447" }, // warning
			{ scale: 600, hex: "#FF9900" }, // fallback
		],
	}),
}));

mock.module("@/ui/accessibility/cvd-detection", () => ({
	detectCvdConfusionPairs: () => [],
}));

import { renderStudioView } from "./studio-view";

describe("studio-view module", () => {
	const originalDocument = globalThis.document;
	const originalHTMLElement = globalThis.HTMLElement;

	beforeEach(() => {
		resetState();
		onScoreUpdate = null;
		mockUpdateCVDScoreDisplay.mockClear();
	});

	afterEach(() => {
		globalThis.document = originalDocument;
		globalThis.HTMLElement = originalHTMLElement;
	});

	it("should update CVD score display when primary color changes", async () => {
		const dom = new JSDOM(
			'<!doctype html><html><body><div id="root"></div><input type="hidden" id="keyColors" value="#3366cc" /></body></html>',
		);
		globalThis.document = dom.window.document;
		globalThis.HTMLElement = dom.window.HTMLElement;

		// Arrange: minimal initial palette so Studio can render.
		const palettes: PaletteConfig[] = [
			{
				id: "primary-1",
				name: "Primary",
				keyColors: ["#3366cc"],
				ratios: [21, 15, 10, 7, 4.5, 3, 1],
				harmony: "none" as any,
			},
		];
		state.palettes = palettes;

		expect(typeof renderStudioView).toBe("function");

		const container = document.getElementById("root");
		expect(container).toBeTruthy();
		await renderStudioView(container as unknown as HTMLElement, {
			onColorClick: () => {},
		});

		const input = (container as HTMLElement).querySelector<HTMLInputElement>(
			'input[data-studio-primary-input="1"]',
		);
		expect(input).toBeTruthy();

		const scoreUpdated = new Promise<void>((resolve) => {
			onScoreUpdate = resolve;
		});

		input.value = "#112233";
		input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

		// Wait for async applyPrimary -> rebuildStudioPalettes
		await Promise.race([
			scoreUpdated,
			new Promise<void>((_, reject) =>
				setTimeout(() => reject(new Error("timeout")), 1000),
			),
		]);

		expect(mockUpdateCVDScoreDisplay).toHaveBeenCalled();
	});
});

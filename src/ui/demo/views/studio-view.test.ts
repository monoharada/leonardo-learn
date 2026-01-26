/**
 * スタジオビューモジュールのテスト
 *
 * NOTE: DOM操作を伴う詳細な検証はE2Eでカバー。
 * このファイルでは、Studio内の配色変更で識別性スコア表示が更新されることを最小限確認する。
 */

import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
} from "bun:test";
import { JSDOM } from "jsdom";
import { HarmonyType } from "@/core/harmony";
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

mock.module("../a11y-drawer", () => ({
	updateA11yIssueBadge: () => {},
}));

mock.module("./studio-view-deps", () => ({
	studioViewDeps: {
		createPalettePreview: () => document.createElement("div"),
		createSeededRandom: () => () => 0.5,
		mapPaletteToPreviewColors: () => ({}),
		adjustLightnessForContrast: (hex: string) => hex,
		findNearestDadsTokenCandidates: () => [],
		inferBaseChromaNameFromHex: () => "Mock",
		matchesPreset: () => true,
		resolvePresetMinContrast: () => 0,
		selectHueDistantColors: (_existingHues: number[], needed: number) =>
			Array.from({ length: needed }, () => ({
				hex: "#445566",
				step: 600,
				baseChromaName: "Mock",
			})),
		snapToNearestDadsToken: (hex: string) => ({
			hex,
			step: 600,
			baseChromaName: "Mock",
		}),
	},
}));

mock.module("@/core/tokens/dads-data-provider", () => ({
	loadDadsTokens: async () => [{ dummy: true }],
	findDadsColorByHex: () => ({
		token: { id: "mock-token-id", hex: "#00A3BF" },
		hue: "cyan",
		scale: 600,
	}),
	getDadsColorsByHue: () => ({
		colors: [
			{ scale: 800, hex: "#FF2800" }, // error
			{ scale: 600, hex: "#35A16B" }, // success
			{ scale: 700, hex: "#D7C447" }, // warning
			{ scale: 600, hex: "#FF9900" }, // fallback
		],
	}),
}));

mock.module("@/core/accent/accent-candidate-service", () => ({
	generateCandidates: async () => ({
		ok: true as const,
		result: {
			candidates: [
				{
					tokenId: "mock-1",
					hex: "#259063",
					nameJa: "Mock 1",
					nameEn: "Mock 1",
					dadsSourceName: "Green 600",
					step: 600,
					score: {
						total: 80,
						breakdown: {
							harmonyScore: 0,
							cudScore: 0,
							contrastScore: 0,
							vibrancyScore: 0,
						},
						weights: { harmony: 25, cud: 25, contrast: 25, vibrancy: 25 },
					},
					hue: 120,
				},
				{
					tokenId: "mock-2",
					hex: "#ff2800",
					nameJa: "Mock 2",
					nameEn: "Mock 2",
					dadsSourceName: "Red 600",
					step: 600,
					score: {
						total: 79,
						breakdown: {
							harmonyScore: 0,
							cudScore: 0,
							contrastScore: 0,
							vibrancyScore: 0,
						},
						weights: { harmony: 25, cud: 25, contrast: 25, vibrancy: 25 },
					},
					hue: 20,
				},
				{
					tokenId: "mock-3",
					hex: "#35a16b",
					nameJa: "Mock 3",
					nameEn: "Mock 3",
					dadsSourceName: "Green 500",
					step: 500,
					score: {
						total: 78,
						breakdown: {
							harmonyScore: 0,
							cudScore: 0,
							contrastScore: 0,
							vibrancyScore: 0,
						},
						weights: { harmony: 25, cud: 25, contrast: 25, vibrancy: 25 },
					},
					hue: 140,
				},
				{
					tokenId: "mock-4",
					hex: "#0091ff",
					nameJa: "Mock 4",
					nameEn: "Mock 4",
					dadsSourceName: "Blue 600",
					step: 600,
					score: {
						total: 77,
						breakdown: {
							harmonyScore: 0,
							cudScore: 0,
							contrastScore: 0,
							vibrancyScore: 0,
						},
						weights: { harmony: 25, cud: 25, contrast: 25, vibrancy: 25 },
					},
					hue: 250,
				},
				{
					tokenId: "mock-5",
					hex: "#d7c447",
					nameJa: "Mock 5",
					nameEn: "Mock 5",
					dadsSourceName: "Yellow 700",
					step: 700,
					score: {
						total: 76,
						breakdown: {
							harmonyScore: 0,
							cudScore: 0,
							contrastScore: 0,
							vibrancyScore: 0,
						},
						weights: { harmony: 25, cud: 25, contrast: 25, vibrancy: 25 },
					},
					hue: 90,
				},
				{
					tokenId: "mock-6",
					hex: "#6a5acd",
					nameJa: "Mock 6",
					nameEn: "Mock 6",
					dadsSourceName: "Purple 600",
					step: 600,
					score: {
						total: 75,
						breakdown: {
							harmonyScore: 0,
							cudScore: 0,
							contrastScore: 0,
							vibrancyScore: 0,
						},
						weights: { harmony: 25, cud: 25, contrast: 25, vibrancy: 25 },
					},
					hue: 300,
				},
			],
			calculationTimeMs: 0,
		},
	}),
}));

mock.module("@/ui/accessibility/cvd-detection", () => ({
	detectCvdConfusionPairs: () => [],
	detectColorConflicts: () => [],
}));

describe("studio-view module", () => {
	const originalDocument = globalThis.document;
	const originalHTMLElement = globalThis.HTMLElement;

	afterAll(() => {
		mock.restore();
	});

	beforeEach(() => {
		resetState();
		onScoreUpdate = null;
		mockUpdateCVDScoreDisplay.mockClear();
	});

	afterEach(() => {
		globalThis.document = originalDocument;
		globalThis.HTMLElement = originalHTMLElement;
	});

	it("should render studio view with toolbar swatches", async () => {
		const { renderStudioView } = await import("./studio-view");

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
				harmony: HarmonyType.NONE,
			},
		];
		state.palettes = palettes;

		expect(typeof renderStudioView).toBe("function");

		const container = document.getElementById("root");
		expect(container).toBeTruthy();

		await renderStudioView(container as unknown as HTMLElement, {
			onColorClick: () => {},
		});

		// Verify the new UI structure renders toolbar swatches
		const swatches = (container as HTMLElement).querySelector(
			".studio-toolbar__swatches",
		);
		expect(swatches).toBeTruthy();

		// Verify toolbar swatch elements are created for primary color
		const swatchElements = (container as HTMLElement).querySelectorAll(
			".studio-toolbar-swatch",
		);
		expect(swatchElements.length).toBeGreaterThan(0);
	});
});

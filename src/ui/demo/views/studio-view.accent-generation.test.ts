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
import type { DadsToken } from "@/core/tokens/types";
import { resetState, state } from "../state";
import type { PaletteConfig } from "../types";

let rndValue = 0.5;
let snapHexQueue: string[] = [];
let hueDistantQueue: string[] = [];
let nearestCandidatesQueue: Array<
	Array<{ hex: string; step: number; baseChromaName: string; deltaE: number }>
> = [];
let derivedPalettesQueue: PaletteConfig[] = [];
let adjustLightnessFn: (
	hex: string,
	backgroundHex: string,
	targetContrast: number,
) => string = (hex) => hex;
let detectCvdConfusionPairsCalls = 0;
let lastDetectCvdConfusionThreshold: number | undefined;

mock.module("./palette-preview", () => ({
	createPalettePreview: () => document.createElement("div"),
	createSeededRandom: () => () => rndValue,
	mapPaletteToPreviewColors: () => ({}),
}));

mock.module("../cvd-controls", () => ({
	getDisplayHex: (hex: string) => hex,
	updateCVDScoreDisplay: () => {},
}));

mock.module("../a11y-drawer", () => ({
	updateA11yIssueBadge: () => {},
}));

mock.module("../palette-generator", () => ({
	createDerivedPalettes: () => derivedPalettesQueue,
}));

mock.module("@/core/tokens/dads-data-provider", () => ({
	findDadsColorByHex: () => ({
		token: { id: "mock-token-id", hex: "#3366cc" },
		hue: "blue",
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
	loadDadsTokens: async () => [],
}));

mock.module("@/core/accent/accent-candidate-service", () => ({
	generateCandidates: async () => ({
		ok: true as const,
		result: { candidates: [], calculationTimeMs: 0 },
	}),
}));

mock.module("@/ui/accessibility/cvd-detection", () => ({
	detectCvdConfusionPairs: (
		_colors: unknown,
		options?: { threshold?: number },
	) => {
		detectCvdConfusionPairsCalls++;
		lastDetectCvdConfusionThreshold = options?.threshold;
		return [];
	},
}));

mock.module("@/core/harmony", () => {
	const HarmonyType = {
		NONE: "none",
		COMPLEMENTARY: "complementary",
		TRIADIC: "triadic",
		ANALOGOUS: "analogous",
		SPLIT_COMPLEMENTARY: "split-complementary",
		TETRADIC: "tetradic",
		SQUARE: "square",
		M3: "m3",
		DADS: "dads",
	} as const;

	const generateHarmonyPalette = (_keyColor: unknown, harmonyType: string) => {
		if (harmonyType === HarmonyType.TETRADIC) {
			return [
				{
					name: "Primary",
					role: "primary",
					baseChromaName: "Blue",
					keyColor: { toHex: () => "#3366cc" },
				},
				{
					name: "Secondary",
					role: "secondary",
					baseChromaName: "Mock",
					keyColor: { toHex: () => "#111111" },
				},
				{
					name: "Accent 1",
					role: "accent",
					baseChromaName: "Mock",
					keyColor: { toHex: () => "#222222" },
				},
				{
					name: "Accent 2",
					role: "accent",
					baseChromaName: "Mock",
					keyColor: { toHex: () => "#333333" },
				},
			];
		}

		// Default: two candidates (Secondary + Accent)
		return [
			{
				name: "Primary",
				role: "primary",
				baseChromaName: "Blue",
				keyColor: { toHex: () => "#3366cc" },
			},
			{
				name: "Secondary",
				role: "secondary",
				baseChromaName: "Mock",
				keyColor: { toHex: () => "#111111" },
			},
			{
				name: "Accent",
				role: "accent",
				baseChromaName: "Mock",
				keyColor: { toHex: () => "#222222" },
			},
		];
	};

	return {
		HarmonyType,
		generateHarmonyPalette,
		initializeHarmonyDads: async () => {},
	};
});

mock.module("../utils/dads-snap", () => ({
	adjustLightnessForContrast: (
		hex: string,
		backgroundHex: string,
		targetContrast: number,
	) => adjustLightnessFn(hex, backgroundHex, targetContrast),
	findNearestDadsTokenCandidates: () => nearestCandidatesQueue.shift() ?? [],
	inferBaseChromaNameFromHex: () => "Mock",
	matchesPreset: () => true,
	resolvePresetMinContrast: () => 0,
	selectHueDistantColors: (_existingHues: number[], needed: number) => {
		const results: Array<{
			hex: string;
			step: number;
			baseChromaName: string;
		}> = [];
		for (let i = 0; i < needed; i++) {
			const hex = hueDistantQueue.shift() ?? "#445566";
			results.push({ hex, step: 600, baseChromaName: "Mock" });
		}
		return results;
	},
	snapToNearestDadsToken: () => {
		const hex = snapHexQueue.shift() ?? "#112233";
		return { hex, step: 600, baseChromaName: "Mock" };
	},
}));

describe("studio-view accent generation", () => {
	const originalDocument = globalThis.document;
	const originalHTMLElement = globalThis.HTMLElement;

	afterAll(() => {
		mock.restore();
	});

	beforeEach(() => {
		resetState();
		rndValue = 0.5;
		snapHexQueue = [];
		hueDistantQueue = [];
		nearestCandidatesQueue = [];
		derivedPalettesQueue = [];
		adjustLightnessFn = (hex) => hex;
		detectCvdConfusionPairsCalls = 0;
		lastDetectCvdConfusionThreshold = undefined;

		const dom = new JSDOM(
			'<!doctype html><html><body><input type="hidden" id="keyColors" value="#3366cc" /></body></html>',
		);
		globalThis.document = dom.window.document;
		globalThis.HTMLElement = dom.window.HTMLElement;
	});

	afterEach(() => {
		globalThis.document = originalDocument;
		globalThis.HTMLElement = originalHTMLElement;
	});

	const getAccentHexes = (): string[] => {
		return state.palettes
			.filter((p) => p.name.startsWith("Accent"))
			.map((p) => (p.keyColors[0] ?? "").split("@")[0] ?? "")
			.filter(Boolean);
	};

	it("should clamp tetradic accents to studioAccentCount", async () => {
		// STUDIO_HARMONY_TYPES length=7; index 5 -> tetradic
		rndValue = 0.8;
		snapHexQueue = ["#111111", "#222222", "#333333"];

		state.studioAccentCount = 2;
		state.studioSeed = 12345;
		state.activePreset = "default";
		state.lockedColors.primary = true;
		state.lockedColors.accent = false;

		state.palettes = [
			{
				id: "primary-1",
				name: "Primary",
				keyColors: ["#3366cc"],
				ratios: [21, 15, 10, 7, 4.5, 3, 1],
				harmony: "none",
			} satisfies PaletteConfig,
		];
		state.activeId = "primary-1";

		const { generateNewStudioPalette } = await import("./studio-view");
		await generateNewStudioPalette([]);

		expect(getAccentHexes().length).toBe(2);
	});

	it("should de-duplicate complementary snapped accents and fill to requested count", async () => {
		// index 1 -> complementary
		rndValue = 0.2;

		// complementary拡張（+180/+210）が同じDADSトークンにスナップされるケースを再現
		snapHexQueue = ["#112233", "#112233"];
		hueDistantQueue = ["#445566"];

		state.studioAccentCount = 2;
		state.studioSeed = 12345;
		state.activePreset = "default";
		state.lockedColors.primary = true;
		state.lockedColors.accent = false;

		state.palettes = [
			{
				id: "primary-1",
				name: "Primary",
				keyColors: ["#3366cc"],
				ratios: [21, 15, 10, 7, 4.5, 3, 1],
				harmony: "none",
			} satisfies PaletteConfig,
		];
		state.activeId = "primary-1";

		const { generateNewStudioPalette } = await import("./studio-view");
		await generateNewStudioPalette([]);

		const accentHexes = getAccentHexes();
		expect(accentHexes.length).toBe(2);
		expect(new Set(accentHexes.map((h) => h.toLowerCase())).size).toBe(2);
	});

	it("should use a fixed CVD threshold for generation scoring (independent from state.cvdConfusionThreshold)", async () => {
		// complementary
		rndValue = 0.2;
		state.cvdConfusionThreshold = 3.5;

		// Force candidate-scoring path (non-empty DADS tokens + non-empty candidate lists)
		const dadsTokens: DadsToken[] = [
			{
				id: "dads-blue-600",
				hex: "#112233",
				nameJa: "dummy",
				nameEn: "dummy",
				classification: { category: "chromatic", hue: "blue", scale: 600 },
				source: "dads",
			},
		];
		nearestCandidatesQueue = [
			[{ hex: "#112233", step: 600, baseChromaName: "Mock", deltaE: 0.1 }],
			[{ hex: "#445566", step: 600, baseChromaName: "Mock", deltaE: 0.2 }],
		];

		state.studioAccentCount = 2;
		state.studioSeed = 12345;
		state.activePreset = "default";
		state.lockedColors.primary = true;
		state.lockedColors.accent = false;

		state.palettes = [
			{
				id: "primary-1",
				name: "Primary",
				keyColors: ["#3366cc"],
				ratios: [21, 15, 10, 7, 4.5, 3, 1],
				harmony: "none",
			} satisfies PaletteConfig,
		];
		state.activeId = "primary-1";

		const { generateNewStudioPalette } = await import("./studio-view");
		await generateNewStudioPalette(dadsTokens);

		expect(detectCvdConfusionPairsCalls).toBe(1);
		expect(lastDetectCvdConfusionThreshold).toBe(5.0);
	});

	it("should not overwrite DADS-derived Secondary/Tertiary hex when @step suffix is present", async () => {
		derivedPalettesQueue = [
			{
				id: "derived-secondary",
				name: "Secondary",
				keyColors: ["#bb87ff@400"],
				ratios: [21, 15, 10, 7, 4.5, 3, 1],
				harmony: "none",
			} satisfies PaletteConfig,
			{
				id: "derived-tertiary",
				name: "Tertiary",
				keyColors: ["#ddc2ff@200"],
				ratios: [21, 15, 10, 7, 4.5, 3, 1],
				harmony: "none",
			} satisfies PaletteConfig,
		];
		adjustLightnessFn = (hex) => {
			if (hex.toLowerCase() === "#bb87ff") return "#915cd0";
			if (hex.toLowerCase() === "#ddc2ff") return "#856ba3";
			return hex;
		};

		state.activePreset = "default";
		state.studioAccentCount = 2;
		state.studioSeed = 12345;
		state.lockedColors.primary = true;
		state.lockedColors.accent = false;

		state.palettes = [
			{
				id: "primary-1",
				name: "Primary",
				keyColors: ["#3366cc"],
				ratios: [21, 15, 10, 7, 4.5, 3, 1],
				harmony: "none",
			} satisfies PaletteConfig,
		];
		state.activeId = "primary-1";

		const { generateNewStudioPalette } = await import("./studio-view");
		await generateNewStudioPalette([]);

		const secondary = state.palettes.find((p) => p.name === "Secondary");
		const tertiary = state.palettes.find((p) => p.name === "Tertiary");

		expect(secondary?.keyColors[0]).toBe("#bb87ff@400");
		expect(tertiary?.keyColors[0]).toBe("#ddc2ff@200");
	});
});

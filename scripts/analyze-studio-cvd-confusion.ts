/**
 * Studio ランダム生成の CVD混同（色覚特性エラー）分析スクリプト
 *
 * 目的:
 * - Studio要約の「CVD混同リスク N件」と、右ドロワーのバッジ（state.palettes基準）の
 *   件数が増える要因を、生成経路（HarmonyType.NONE vs harmony系）で比較する。
 * - harmony系では `snapToNearestDadsToken()` による DADSスナップ（=丸め）が入るため、
 *   それが混同件数・重複・近接を増やすかを定量化する。
 *
 * 実行例:
 * - bun run scripts/analyze-studio-cvd-confusion.ts --iterations 200 --route mixed
 * - bun run scripts/analyze-studio-cvd-confusion.ts --iterations 200 --route none
 * - bun run scripts/analyze-studio-cvd-confusion.ts --iterations 200 --route triadic
 */

import { wcagContrast } from "culori";
import {
	calculateSimpleDeltaE,
	DISTINGUISHABILITY_THRESHOLD,
} from "../src/accessibility/distinguishability";
import { generateCandidates } from "../src/core/accent/accent-candidate-service";
import { Color } from "../src/core/color";
import {
	generateHarmonyPalette,
	HarmonyType,
	initializeHarmonyDads,
} from "../src/core/harmony";
import {
	getDadsColorsByHue,
	loadDadsTokens,
} from "../src/core/tokens/dads-data-provider";
import type { DadsToken } from "../src/core/tokens/types";
import { detectCvdConfusionPairs } from "../src/ui/accessibility/cvd-detection";
import { HUE_DISPLAY_NAMES } from "../src/ui/demo/constants";
import { createDerivedPalettes } from "../src/ui/demo/palette-generator";
import { parseKeyColor } from "../src/ui/demo/state";
import type {
	PaletteConfig,
	SemanticColorConfig,
	StudioPresetType,
} from "../src/ui/demo/types";
import {
	adjustLightnessForContrast,
	type DadsSnapCandidate,
	type DadsSnapResult,
	findNearestDadsTokenCandidates,
	inferBaseChromaNameFromHex,
	matchesPreset,
	resolvePresetMinContrast,
	selectHueDistantColors,
	snapToNearestDadsToken,
} from "../src/ui/demo/utils/dads-snap";
import { resolveWarningPattern } from "../src/ui/demo/utils/palette-utils";
import { createSeededRandom } from "../src/ui/demo/views/palette-preview";

const BACKGROUND_HEX = "#ffffff";

const STUDIO_HARMONY_TYPES: HarmonyType[] = [
	HarmonyType.NONE,
	HarmonyType.COMPLEMENTARY,
	HarmonyType.TRIADIC,
	HarmonyType.ANALOGOUS,
	HarmonyType.SPLIT_COMPLEMENTARY,
	HarmonyType.TETRADIC,
	HarmonyType.SQUARE,
];

type Route =
	| "mixed"
	| "none"
	| "complementary"
	| "triadic"
	| "analogous"
	| "split-complementary"
	| "tetradic"
	| "square";

const ROUTE_TO_HARMONY: Record<Exclude<Route, "mixed">, HarmonyType> = {
	none: HarmonyType.NONE,
	complementary: HarmonyType.COMPLEMENTARY,
	triadic: HarmonyType.TRIADIC,
	analogous: HarmonyType.ANALOGOUS,
	"split-complementary": HarmonyType.SPLIT_COMPLEMENTARY,
	tetradic: HarmonyType.TETRADIC,
	square: HarmonyType.SQUARE,
};

function parseArgs(argv: string[]): Record<string, string> {
	const args: Record<string, string> = {};
	for (let i = 0; i < argv.length; i++) {
		const part = argv[i];
		if (!part) continue;
		if (!part.startsWith("--")) continue;

		const eq = part.indexOf("=");
		if (eq >= 0) {
			const key = part.slice(2, eq);
			const value = part.slice(eq + 1);
			if (key) args[key] = value;
			continue;
		}

		const key = part.slice(2);
		const next = argv[i + 1];
		if (next && !next.startsWith("--")) {
			args[key] = next;
			i++;
		} else {
			args[key] = "true";
		}
	}
	return args;
}

function pickRandom<T>(items: readonly T[], rnd: () => number): T | null {
	if (items.length === 0) return null;
	const index = Math.floor(rnd() * items.length);
	return items[index] ?? null;
}

function pickUniqueBy<T>(
	items: T[],
	count: number,
	getKey: (item: T) => string,
	rnd: () => number,
): T[] {
	const pool = items.slice();
	const selected: T[] = [];
	const seen = new Set<string>();

	while (pool.length > 0 && selected.length < count) {
		const pick = pickRandom(pool, rnd);
		if (!pick) break;
		const key = getKey(pick);
		// remove picked from pool
		const idx = pool.findIndex((x) => getKey(x) === key);
		if (idx >= 0) pool.splice(idx, 1);

		if (seen.has(key)) continue;
		seen.add(key);
		selected.push(pick);
	}

	return selected;
}

function isValidHex6(hex: string): boolean {
	return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

function getDadsSemanticHex(
	dadsTokens: DadsToken[],
	hue: Parameters<typeof getDadsColorsByHue>[1],
	step: number,
	fallback: string,
): string {
	const colors = getDadsColorsByHue(dadsTokens, hue).colors;
	return colors.find((c) => c.scale === step)?.hex ?? fallback;
}

async function selectRandomPrimaryFromDads(
	dadsTokens: DadsToken[],
	preset: StudioPresetType,
	backgroundHex: string,
	rnd: () => number,
): Promise<{ hex: string; step?: number; baseChromaName: string }> {
	const chromatic = dadsTokens.filter(
		(t) => t.classification.category === "chromatic" && t.hex.startsWith("#"),
	);
	const presetFiltered = chromatic.filter((t) => matchesPreset(t.hex, preset));
	const baseList = presetFiltered.length > 0 ? presetFiltered : chromatic;

	const minContrast = resolvePresetMinContrast(preset);
	const contrastFiltered = baseList.filter((t) => {
		const ratio = wcagContrast(backgroundHex, t.hex) ?? 0;
		return ratio >= minContrast;
	});

	let finalList: DadsToken[];
	let needsAdjustment = false;
	if (contrastFiltered.length > 0) {
		finalList = contrastFiltered;
	} else {
		finalList = baseList;
		needsAdjustment = true;
	}

	const selected = pickRandom(finalList, rnd) ?? pickRandom(chromatic, rnd);
	if (!selected) {
		return { hex: "#00A3BF", baseChromaName: "Cyan" };
	}

	const step = selected.classification.scale;
	const dadsHue = selected.classification.hue;
	const baseChromaName =
		(dadsHue ? HUE_DISPLAY_NAMES[dadsHue] : undefined) ||
		inferBaseChromaNameFromHex(selected.hex) ||
		"Blue";

	const finalHex = needsAdjustment
		? adjustLightnessForContrast(selected.hex, backgroundHex, minContrast)
		: selected.hex;

	return { hex: finalHex, step, baseChromaName };
}

async function selectRandomAccentCandidates(
	brandHex: string,
	preset: StudioPresetType,
	backgroundHex: string,
	count: number,
	rnd: () => number,
): Promise<DadsSnapResult[]> {
	const response = await generateCandidates(brandHex, {
		backgroundHex,
		limit: Math.max(60, count * 30),
	});
	if (!response.ok) return [];

	const minContrast = resolvePresetMinContrast(preset);
	const allCandidates = response.result.candidates;
	const presetFiltered = allCandidates.filter((c) =>
		matchesPreset(c.hex, preset),
	);
	const base = presetFiltered.length > 0 ? presetFiltered : allCandidates;

	const contrastFiltered = base.filter(
		(c) => (wcagContrast(backgroundHex, c.hex) ?? 0) >= minContrast,
	);

	let candidates: typeof base;
	if (contrastFiltered.length > 0) {
		candidates = contrastFiltered;
	} else {
		candidates = base.map((c) => ({
			...c,
			hex: adjustLightnessForContrast(c.hex, backgroundHex, minContrast),
		}));
	}

	const top = candidates.slice(0, Math.max(30, count * 20));
	const picked = pickUniqueBy(
		top.length > 0 ? top : candidates,
		count,
		(c) => c.hex,
		rnd,
	);

	return picked.map((p) => ({
		hex: p.hex,
		step: p.step,
		baseChromaName: p.dadsSourceName.replace(/\s+\d+$/, ""),
	}));
}

type StudioSemanticColors = {
	error: string;
	success: string;
	warning: string;
};

function computeStudioSemanticColors(options: {
	dadsTokens: DadsToken[];
	preset: StudioPresetType;
	backgroundHex: string;
	semanticConfig: SemanticColorConfig;
}): StudioSemanticColors {
	const warningPattern = resolveWarningPattern(options.semanticConfig);
	const warningHue = warningPattern === "orange" ? "orange" : "yellow";
	const warningStep = warningPattern === "orange" ? 600 : 700;

	const errorHex = getDadsSemanticHex(
		options.dadsTokens,
		"red",
		800,
		"#FF2800",
	);
	const successHex = getDadsSemanticHex(
		options.dadsTokens,
		"green",
		600,
		"#35A16B",
	);
	const warningHex = getDadsSemanticHex(
		options.dadsTokens,
		warningHue,
		warningStep,
		"#D7C447",
	);

	const minContrast = resolvePresetMinContrast(options.preset);

	return {
		error: adjustLightnessForContrast(
			errorHex,
			options.backgroundHex,
			minContrast,
		),
		success: adjustLightnessForContrast(
			successHex,
			options.backgroundHex,
			minContrast,
		),
		warning: adjustLightnessForContrast(
			warningHex,
			options.backgroundHex,
			minContrast,
		),
	};
}

const HARMONY_DADS_SNAP_CANDIDATES = 8;
const MIN_OKLCH_LIGHTNESS_DISTANCE = 0.12;

function normalizeHexKey(hex: string): string {
	return hex.trim().toLowerCase();
}

function uniqueCandidatesByHex(
	candidates: DadsSnapCandidate[],
): DadsSnapCandidate[] {
	const seen = new Set<string>();
	const result: DadsSnapCandidate[] = [];
	for (const candidate of candidates) {
		const key = normalizeHexKey(candidate.hex);
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(candidate);
	}
	return result;
}

function selectHarmonySnappedCandidates(options: {
	primaryHex: string;
	targetHexes: string[];
	targetCount: number;
	dadsTokens: DadsToken[];
	preset: StudioPresetType;
	backgroundHex: string;
	semantic: StudioSemanticColors;
}): DadsSnapResult[] {
	const { targetHexes, dadsTokens, preset, backgroundHex, semantic } = options;
	if (targetHexes.length === 0) return [];

	if (dadsTokens.length === 0) {
		const results: DadsSnapResult[] = [];
		for (const hex of targetHexes) {
			const snapped = snapToNearestDadsToken(hex, dadsTokens, preset);
			if (snapped) results.push(snapped);
		}
		return results;
	}

	const candidateLists: DadsSnapCandidate[][] = targetHexes.map((hex) =>
		findNearestDadsTokenCandidates(
			hex,
			dadsTokens,
			preset,
			HARMONY_DADS_SNAP_CANDIDATES,
		),
	);

	if (candidateLists.some((list) => list.length === 0)) {
		const results: DadsSnapResult[] = [];
		for (const hex of targetHexes) {
			const snapped = snapToNearestDadsToken(hex, dadsTokens, preset);
			if (snapped) results.push(snapped);
		}
		return results;
	}

	const minContrast = resolvePresetMinContrast(preset);
	const toEffectiveHex = (hex: string): string => {
		const ratio = wcagContrast(backgroundHex, hex) ?? 0;
		if (ratio >= minContrast) return hex;
		return adjustLightnessForContrast(hex, backgroundHex, minContrast);
	};

	const primaryColor = new Color(options.primaryHex);
	const semanticSuccess = new Color(semantic.success);
	const semanticWarning = new Color(semantic.warning);
	const semanticError = new Color(semantic.error);

	const expectedUnique = Math.min(options.targetCount, targetHexes.length);

	let bestCombo: DadsSnapCandidate[] | null = null;
	let bestScore = Number.POSITIVE_INFINITY;

	const evaluateCombo = (combo: DadsSnapCandidate[]): void => {
		const normalized = uniqueCandidatesByHex(combo).slice(
			0,
			options.targetCount,
		);
		const missingPenalty = Math.max(0, expectedUnique - normalized.length);

		const accentHexes = normalized.map((c) => toEffectiveHex(c.hex));
		const accentColors = accentHexes.map((hex) => new Color(hex));

		const allColors: Color[] = [
			primaryColor,
			...accentColors,
			semanticSuccess,
			semanticWarning,
			semanticError,
		];
		const isAccentIndex = (index: number): boolean =>
			index >= 1 && index < 1 + accentColors.length;

		let normalTooCloseCount = 0;
		let lightnessPenalty = 0;
		for (let i = 0; i < allColors.length; i++) {
			for (let j = i + 1; j < allColors.length; j++) {
				if (!isAccentIndex(i) && !isAccentIndex(j)) continue;
				const a = allColors[i];
				const b = allColors[j];
				if (!a || !b) continue;
				const dE = calculateSimpleDeltaE(a, b);
				if (dE < DISTINGUISHABILITY_THRESHOLD) normalTooCloseCount++;

				const dL = Math.abs(a.oklch.l - b.oklch.l);
				if (dL < MIN_OKLCH_LIGHTNESS_DISTANCE) {
					lightnessPenalty +=
						(MIN_OKLCH_LIGHTNESS_DISTANCE - dL) / MIN_OKLCH_LIGHTNESS_DISTANCE;
				}
			}
		}

		const namedColors = [
			{ name: "Primary", color: primaryColor },
			...accentColors.map((color, index) => ({
				name: `Accent ${index + 1}`,
				color,
			})),
			{ name: "Success", color: semanticSuccess },
			{ name: "Warning", color: semanticWarning },
			{ name: "Error", color: semanticError },
		];
		const cvdPairs = detectCvdConfusionPairs(namedColors);

		const sumDeltaE = normalized.reduce((sum, c) => sum + c.deltaE, 0);
		const score =
			missingPenalty * 100_000 +
			normalTooCloseCount * 10_000 +
			lightnessPenalty * 10_000 +
			cvdPairs.length * 1_000 +
			sumDeltaE;

		if (score < bestScore) {
			bestScore = score;
			bestCombo = combo.slice();
		}
	};

	const dfs = (index: number, combo: DadsSnapCandidate[]): void => {
		if (index >= candidateLists.length) {
			evaluateCombo(combo);
			return;
		}
		const list = candidateLists[index] ?? [];
		for (const candidate of list) {
			combo.push(candidate);
			dfs(index + 1, combo);
			combo.pop();
		}
	};

	dfs(0, []);

	const picked = bestCombo ?? [];
	return picked.map((c) => ({
		hex: c.hex,
		step: c.step,
		baseChromaName: c.baseChromaName || inferBaseChromaNameFromHex(c.hex),
	}));
}

async function selectHarmonyAccentCandidates(
	primaryHex: string,
	harmonyType: HarmonyType,
	dadsTokens: DadsToken[],
	preset: StudioPresetType,
	backgroundHex: string,
	rnd: () => number,
	targetCount: number,
	semanticConfig: SemanticColorConfig,
): Promise<DadsSnapResult[]> {
	await initializeHarmonyDads();

	const primaryColor = new Color(primaryHex);
	const minContrast = resolvePresetMinContrast(preset);
	const semantic = computeStudioSemanticColors({
		dadsTokens,
		preset,
		backgroundHex,
		semanticConfig,
	});

	let harmonyAccents: DadsSnapResult[] = [];
	if (harmonyType === HarmonyType.COMPLEMENTARY) {
		const primaryOklch = primaryColor.oklch;
		const hue = primaryOklch?.h ?? 0;
		const lightness = primaryOklch?.l ?? 0.5;
		const chroma = primaryOklch?.c ?? 0.1;

		const complementHue = (hue + 180) % 360;
		const splitHue = (hue + 210) % 360;

		const accent1Calculated = new Color({
			mode: "oklch",
			l: lightness,
			c: chroma,
			h: complementHue,
		}).toHex();
		const accent2Calculated = new Color({
			mode: "oklch",
			l: lightness,
			c: chroma,
			h: splitHue,
		}).toHex();

		harmonyAccents = selectHarmonySnappedCandidates({
			primaryHex,
			targetHexes: [accent1Calculated, accent2Calculated],
			targetCount,
			dadsTokens,
			preset,
			backgroundHex,
			semantic,
		});
	} else {
		const harmonyPalette = generateHarmonyPalette(primaryColor, harmonyType);
		const accentColors = harmonyPalette.filter(
			(sc) => sc.role === "secondary" || sc.role === "accent",
		);
		const targetHexes = accentColors.map((sc) => sc.keyColor.toHex());
		harmonyAccents = selectHarmonySnappedCandidates({
			primaryHex,
			targetHexes,
			targetCount,
			dadsTokens,
			preset,
			backgroundHex,
			semantic,
		});
	}

	const uniqueByHex = (accents: DadsSnapResult[]): DadsSnapResult[] => {
		const seen = new Set<string>();
		const result: DadsSnapResult[] = [];
		for (const accent of accents) {
			const key = accent.hex.trim().toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);
			result.push(accent);
		}
		return result;
	};

	harmonyAccents = uniqueByHex(harmonyAccents);
	if (harmonyAccents.length > targetCount) {
		harmonyAccents = harmonyAccents.slice(0, targetCount);
	}

	if (harmonyAccents.length < targetCount) {
		const primaryOklch = primaryColor.oklch;
		const existingHues = [
			primaryOklch?.h ?? 0,
			...harmonyAccents.map((a) => new Color(a.hex).oklch?.h ?? 0),
		];
		const needed = targetCount - harmonyAccents.length;
		const complementary = selectHueDistantColors(
			existingHues,
			needed,
			dadsTokens,
			preset,
			backgroundHex,
			rnd,
		);
		harmonyAccents = [...harmonyAccents, ...complementary];
	}

	harmonyAccents = uniqueByHex(harmonyAccents).slice(0, targetCount);

	return harmonyAccents.map((accent) => {
		const currentContrast = wcagContrast(backgroundHex, accent.hex) ?? 0;
		if (currentContrast >= minContrast) return accent;
		return {
			...accent,
			hex: adjustLightnessForContrast(accent.hex, backgroundHex, minContrast),
		};
	});
}

function buildStudioPalettes(options: {
	dadsTokens: DadsToken[];
	primaryHex: string;
	primaryStep?: number;
	primaryBaseChromaName?: string;
	accentCandidates: DadsSnapResult[];
	preset: StudioPresetType;
}): PaletteConfig[] {
	const timestamp = Date.now();
	const backgroundColor = BACKGROUND_HEX;

	const primaryKeyColor =
		options.primaryStep && isValidHex6(options.primaryHex)
			? `${options.primaryHex}@${options.primaryStep}`
			: options.primaryHex;

	const primaryPalette: PaletteConfig = {
		id: `studio-primary-${timestamp}`,
		name: "Primary",
		keyColors: [primaryKeyColor],
		ratios: [21, 15, 10, 7, 4.5, 3, 1],
		harmony: HarmonyType.NONE,
		baseChromaName:
			options.primaryBaseChromaName ||
			inferBaseChromaNameFromHex(options.primaryHex),
		step: options.primaryStep,
	};

	const derived = createDerivedPalettes(
		primaryPalette,
		backgroundColor,
		options.dadsTokens,
	);

	const minContrast = resolvePresetMinContrast(options.preset);
	const adjustedDerived = derived.map((palette) => {
		const keyColor = palette.keyColors[0];
		if (!keyColor) return palette;

		const [hex, step] = keyColor.split("@");
		if (!hex) return palette;
		if (step) return palette;

		const adjustedHex = adjustLightnessForContrast(
			hex,
			backgroundColor,
			minContrast,
		);
		if (adjustedHex === hex) return palette;

		return {
			...palette,
			keyColors: [adjustedHex],
		};
	});

	const palettes: PaletteConfig[] = [primaryPalette, ...adjustedDerived];

	for (let i = 0; i < options.accentCandidates.length; i++) {
		const candidate = options.accentCandidates[i];
		if (!candidate) continue;

		const accentKeyColor =
			candidate.step && isValidHex6(candidate.hex)
				? `${candidate.hex}@${candidate.step}`
				: candidate.hex;

		palettes.push({
			id: `studio-accent-${timestamp}-${i + 1}`,
			name: `Accent ${i + 1}`,
			keyColors: [accentKeyColor],
			ratios: [21, 15, 10, 7, 4.5, 3, 1],
			harmony: HarmonyType.NONE,
			baseChromaName: candidate.baseChromaName,
			step: candidate.step,
		});
	}

	return palettes;
}

function calculateBadgePairs(palettes: PaletteConfig[]): number {
	const namedColors = palettes
		.map((p) => {
			const keyColorInput = p.keyColors[0];
			if (!keyColorInput) return null;
			const { color: hex } = parseKeyColor(keyColorInput);
			return { name: p.name, color: new Color(hex) };
		})
		.filter((c): c is { name: string; color: Color } => c !== null);

	return detectCvdConfusionPairs(namedColors).length;
}

function calculateStudioSummaryPairs(options: {
	dadsTokens: DadsToken[];
	primaryHex: string;
	accentHexes: string[];
	preset: StudioPresetType;
	backgroundHex: string;
	semanticConfig: SemanticColorConfig;
}): number {
	const warningPattern = resolveWarningPattern(options.semanticConfig);
	const warningHue = warningPattern === "orange" ? "orange" : "yellow";
	const warningStep = warningPattern === "orange" ? 600 : 700;

	const errorHex = getDadsSemanticHex(
		options.dadsTokens,
		"red",
		800,
		"#FF2800",
	);
	const successHex = getDadsSemanticHex(
		options.dadsTokens,
		"green",
		600,
		"#35A16B",
	);
	const warningHex = getDadsSemanticHex(
		options.dadsTokens,
		warningHue,
		warningStep,
		"#D7C447",
	);

	const minContrast = resolvePresetMinContrast(options.preset);
	const semantic = {
		error: adjustLightnessForContrast(
			errorHex,
			options.backgroundHex,
			minContrast,
		),
		success: adjustLightnessForContrast(
			successHex,
			options.backgroundHex,
			minContrast,
		),
		warning: adjustLightnessForContrast(
			warningHex,
			options.backgroundHex,
			minContrast,
		),
	};

	const namedColors = [
		{ name: "Primary", color: new Color(options.primaryHex) },
		...options.accentHexes.map((hex, index) => ({
			name: `Accent ${index + 1}`,
			color: new Color(hex),
		})),
		{ name: "Success", color: new Color(semantic.success) },
		{ name: "Warning", color: new Color(semantic.warning) },
		{ name: "Error", color: new Color(semantic.error) },
	];

	return detectCvdConfusionPairs(namedColors).length;
}

function calcStats(values: number[]): {
	min: number;
	p50: number;
	p90: number;
	p95: number;
	avg: number;
	max: number;
} {
	const sorted = [...values].sort((a, b) => a - b);
	const pick = (p: number) => {
		if (sorted.length === 0) return 0;
		const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
		return sorted[idx] ?? 0;
	};
	const sum = values.reduce((acc, v) => acc + v, 0);
	return {
		min: sorted[0] ?? 0,
		p50: pick(0.5),
		p90: pick(0.9),
		p95: pick(0.95),
		avg: values.length > 0 ? sum / values.length : 0,
		max: sorted[sorted.length - 1] ?? 0,
	};
}

function formatStatsLine(label: string, values: number[]): string {
	const s = calcStats(values);
	return `${label}: n=${values.length} min=${s.min} p50=${s.p50} p90=${s.p90} p95=${s.p95} avg=${s.avg.toFixed(2)} max=${s.max}`;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	const iterations = Number.parseInt(args.iterations ?? "200", 10);
	const accentCount = Number.parseInt(args.accent ?? "2", 10);
	const seedBase = Number.parseInt(args.seedBase ?? "12345", 10);
	const preset = (args.preset ?? "default") as StudioPresetType;
	const route = (args.route ?? "mixed") as Route;

	if (!Number.isFinite(iterations) || iterations <= 0) {
		throw new Error(`Invalid --iterations: ${args.iterations}`);
	}
	if (![2, 3, 4].includes(accentCount)) {
		throw new Error(`Invalid --accent: ${args.accent} (expected 2|3|4)`);
	}
	if (
		!["default", "high-contrast", "pastel", "vibrant", "dark"].includes(preset)
	) {
		throw new Error(`Invalid --preset: ${args.preset}`);
	}
	if (!(route in ROUTE_TO_HARMONY) && route !== "mixed") {
		throw new Error(`Invalid --route: ${args.route}`);
	}

	console.log("=".repeat(72));
	console.log("Studio: CVD混同（要約/バッジ）分析");
	console.log("=".repeat(72));
	console.log(
		`preset=${preset} accent=${accentCount} iterations=${iterations} seedBase=${seedBase} route=${route}`,
	);
	console.log(`background=${BACKGROUND_HEX}`);
	console.log();

	const dadsTokens = await loadDadsTokens();
	await initializeHarmonyDads();

	const semanticConfig: SemanticColorConfig = { warningPattern: "auto" };

	type Group = {
		summaryPairs: number[];
		badgePairs: number[];
		accentDupes: number[];
		accentCounts: number[];
	};

	const groups = new Map<string, Group>();
	const ensure = (key: string): Group => {
		const existing = groups.get(key);
		if (existing) return existing;
		const next: Group = {
			summaryPairs: [],
			badgePairs: [],
			accentDupes: [],
			accentCounts: [],
		};
		groups.set(key, next);
		return next;
	};

	let failures = 0;

	for (let i = 0; i < iterations; i++) {
		const seed = seedBase + i;
		const rnd = createSeededRandom(seed);

		const harmonyType =
			route === "mixed"
				? (pickRandom(STUDIO_HARMONY_TYPES, rnd) ?? HarmonyType.NONE)
				: ROUTE_TO_HARMONY[route];

		const primary = await selectRandomPrimaryFromDads(
			dadsTokens,
			preset,
			BACKGROUND_HEX,
			rnd,
		);

		let accents: DadsSnapResult[] = [];
		if (harmonyType === HarmonyType.NONE) {
			accents = await selectRandomAccentCandidates(
				primary.hex,
				preset,
				BACKGROUND_HEX,
				accentCount,
				rnd,
			);
		} else {
			accents = await selectHarmonyAccentCandidates(
				primary.hex,
				harmonyType,
				dadsTokens,
				preset,
				BACKGROUND_HEX,
				rnd,
				accentCount,
				semanticConfig,
			);
		}

		if (accents.length === 0) {
			failures++;
			continue;
		}

		const accentHexes = accents.map((a) => a.hex);
		const dupeCount =
			accentHexes.length -
			new Set(accentHexes.map((h) => h.toLowerCase())).size;

		const palettes = buildStudioPalettes({
			dadsTokens,
			primaryHex: primary.hex,
			primaryStep: primary.step,
			primaryBaseChromaName: primary.baseChromaName,
			accentCandidates: accents,
			preset,
		});

		const summaryPairs = calculateStudioSummaryPairs({
			dadsTokens,
			primaryHex: primary.hex,
			accentHexes,
			preset,
			backgroundHex: BACKGROUND_HEX,
			semanticConfig,
		});
		const badgePairs = calculateBadgePairs(palettes);

		const key = harmonyType;
		const g = ensure(key);
		g.summaryPairs.push(summaryPairs);
		g.badgePairs.push(badgePairs);
		g.accentDupes.push(dupeCount);
		g.accentCounts.push(accentHexes.length);
	}

	console.log(`completed=${iterations - failures} failed=${failures}`);
	console.log();

	const order = [
		HarmonyType.NONE,
		HarmonyType.COMPLEMENTARY,
		HarmonyType.SPLIT_COMPLEMENTARY,
		HarmonyType.ANALOGOUS,
		HarmonyType.TRIADIC,
		HarmonyType.TETRADIC,
		HarmonyType.SQUARE,
	];

	for (const key of order) {
		const g = groups.get(key);
		if (!g) continue;

		const dupeRuns = g.accentDupes.filter((n) => n > 0).length;
		const dupeRate =
			g.accentDupes.length > 0 ? (dupeRuns / g.accentDupes.length) * 100 : 0;

		console.log("-".repeat(72));
		console.log(`HarmonyType: ${key}`);
		console.log(formatStatsLine("Studio要約 CVD混同件数", g.summaryPairs));
		console.log(formatStatsLine("右ドロワー バッジ件数", g.badgePairs));
		console.log(
			`Accent重複: n=${g.accentDupes.length} runsWithDupes=${dupeRuns} (${dupeRate.toFixed(1)}%) avgDupes=${(g.accentDupes.reduce((a, b) => a + b, 0) / g.accentDupes.length).toFixed(2)}`,
		);
	}

	console.log("-".repeat(72));
	console.log("Note:");
	console.log(
		"- Studio要約は Primary+Accent+Semantic(Success/Warning/Error) を対象",
	);
	console.log(
		"- バッジは state.palettes 相当（Primary/Secondary/Tertiary/Accent...）を対象",
	);
	console.log("- CVD混同件数は「色ペア×CVDタイプ」の件数");
	console.log();
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

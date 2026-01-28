import { wcagContrast } from "culori";
import { HarmonyType } from "@/core/harmony";
import {
	findDadsColorByHex,
	getDadsColorsByHue,
	loadDadsTokens,
} from "@/core/tokens/dads-data-provider";
import type { DadsToken } from "@/core/tokens/types";
import { HUE_DISPLAY_NAMES } from "../constants";
import { parseKeyColor, state } from "../state";
import type {
	LockedColorsState,
	PaletteConfig,
	StudioPresetType,
	StudioTheme,
} from "../types";
import { stripStepSuffix } from "../types";
import {
	resolveAccentSourcePalette,
	resolveWarningPattern,
} from "../utils/palette-utils";
import type { PalettePreviewColors } from "./palette-preview";
import { studioViewDeps } from "./studio-view-deps";

type ContrastBadgeGrade = "AAA" | "AA" | "AA Large" | "Fail";

/** HEX6 color pattern for validation */
const HEX6_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const isValidHex6 = (hex: string): boolean => HEX6_PATTERN.test(hex);

/** Studio view default background color (white) */
export const DEFAULT_STUDIO_BACKGROUND = "#ffffff";

/** コントラストグレード判定テーブル（降順） */
const CONTRAST_GRADE_TABLE: { minRatio: number; grade: ContrastBadgeGrade }[] =
	[
		{ minRatio: 7, grade: "AAA" },
		{ minRatio: 4.5, grade: "AA" },
		{ minRatio: 3, grade: "AA Large" },
		{ minRatio: 0, grade: "Fail" },
	];

export const STUDIO_PRESET_LABELS: Record<StudioPresetType, string> = {
	default: "Default",
	"high-contrast": "High Contrast",
	pastel: "Pastel",
	vibrant: "Vibrant",
	dark: "Dark",
};

export const STUDIO_THEME_LABELS: Record<StudioTheme, string> = {
	pinpoint: "ピンポイント",
	hero: "ヒーローエリア",
	branding: "ブランディング",
};

/** Studioでランダム選択対象のハーモニータイプ */
export const STUDIO_HARMONY_TYPES: HarmonyType[] = [
	HarmonyType.NONE,
	HarmonyType.COMPLEMENTARY,
	HarmonyType.TRIADIC,
	HarmonyType.ANALOGOUS,
	HarmonyType.SPLIT_COMPLEMENTARY,
	HarmonyType.TETRADIC,
	HarmonyType.SQUARE,
];

export function gradeContrast(ratio: number): ContrastBadgeGrade {
	return CONTRAST_GRADE_TABLE.find((g) => ratio >= g.minRatio)?.grade ?? "Fail";
}

export function pickRandom<T>(
	items: readonly T[],
	rnd: () => number,
): T | null {
	if (items.length === 0) return null;
	const index = Math.floor(rnd() * items.length);
	return items[index] ?? null;
}

export function getPrimaryPalette(): PaletteConfig | undefined {
	return (
		state.palettes.find((p) => p.name.startsWith("Primary")) ??
		state.palettes[0]
	);
}

function parseAccentIndex(name: string): number | null {
	const match = name.match(/^Accent\s+(\d+)/i);
	if (!match?.[1]) return null;
	const value = Number.parseInt(match[1], 10);
	return Number.isFinite(value) ? value : null;
}

function getAccentPalettes(palettes: PaletteConfig[]): PaletteConfig[] {
	return palettes
		.filter((p) => p.name.startsWith("Accent"))
		.sort((a, b) => {
			const ai = parseAccentIndex(a.name) ?? 999;
			const bi = parseAccentIndex(b.name) ?? 999;
			return ai - bi;
		});
}

function getAccentHexes(palettes: PaletteConfig[]): string[] {
	const fromAccents = getAccentPalettes(palettes)
		.map((p) => stripStepSuffix(p.keyColors[0] ?? ""))
		.filter((hex) => isValidHex6(hex));

	if (fromAccents.length > 0) return fromAccents;

	const fallback = stripStepSuffix(
		resolveAccentSourcePalette(palettes)?.keyColors[0] ?? "",
	);
	return isValidHex6(fallback) ? [fallback] : [];
}

function getDerivedPaletteHex(
	palettes: PaletteConfig[],
	name: string,
	derivationType: "secondary" | "tertiary",
): string | undefined {
	const palette = palettes.find(
		(p) => p.name === name || p.derivedFrom?.derivationType === derivationType,
	);
	if (!palette) return undefined;
	const hex = stripStepSuffix(palette.keyColors[0] ?? "");
	return isValidHex6(hex) ? hex : undefined;
}

function getSecondaryHex(palettes: PaletteConfig[]): string | undefined {
	return getDerivedPaletteHex(palettes, "Secondary", "secondary");
}

function getTertiaryHex(palettes: PaletteConfig[]): string | undefined {
	return getDerivedPaletteHex(palettes, "Tertiary", "tertiary");
}

let dadsTokensPromise: Promise<DadsToken[]> | null = null;
export async function getDadsTokens(): Promise<DadsToken[]> {
	if (!dadsTokensPromise) {
		dadsTokensPromise = loadDadsTokens().catch((error) => {
			dadsTokensPromise = null;
			throw error;
		});
	}
	return dadsTokensPromise;
}

export function getDadsSemanticHex(
	dadsTokens: DadsToken[],
	hue: Parameters<typeof getDadsColorsByHue>[1],
	step: number,
	fallback: string,
): string {
	const colors = getDadsColorsByHue(dadsTokens, hue).colors;
	return colors.find((c) => c.scale === step)?.hex ?? fallback;
}

/** Lookup DADS info and derive base chroma name from hex */
export function getDadsInfoWithChromaName(
	dadsTokens: DadsToken[],
	hex: string,
): {
	dadsInfo: ReturnType<typeof findDadsColorByHex> | undefined;
	baseChromaName: string;
} {
	const dadsInfo =
		dadsTokens.length > 0 ? findDadsColorByHex(dadsTokens, hex) : undefined;
	const baseChromaName = dadsInfo?.hue
		? (HUE_DISPLAY_NAMES[dadsInfo.hue] ??
			studioViewDeps.inferBaseChromaNameFromHex(hex))
		: studioViewDeps.inferBaseChromaNameFromHex(hex);
	return { dadsInfo, baseChromaName };
}

export type StudioPaletteColors = {
	primaryHex: string;
	primaryStep?: number;
	secondaryHex?: string;
	tertiaryHex?: string;
	accentHex: string;
	accentHexes: string[];
	semantic: { error: string; success: string; warning: string };
};

export function computePaletteColors(
	dadsTokens: DadsToken[],
	preset: StudioPresetType,
): StudioPaletteColors {
	const primaryPalette = getPrimaryPalette();
	const primaryInput = primaryPalette?.keyColors[0] ?? "#00A3BF";
	const { color: primaryHexRaw } = parseKeyColor(primaryInput);
	const primaryHex = stripStepSuffix(primaryHexRaw) || "#00A3BF";

	const dadsInfo = findDadsColorByHex(dadsTokens, primaryHex);
	const primaryStep = dadsInfo?.scale;

	const secondaryHex = getSecondaryHex(state.palettes);
	const tertiaryHex = getTertiaryHex(state.palettes);

	const accentHexes = getAccentHexes(state.palettes);
	const accentHex = accentHexes[0] || "#259063";

	const warningPattern = resolveWarningPattern(state.semanticColorConfig);
	const warningHue = warningPattern === "orange" ? "orange" : "yellow";
	const warningStep = warningPattern === "orange" ? 600 : 700;

	// Get raw semantic colors
	const errorHex = getDadsSemanticHex(dadsTokens, "red", 800, "#FF2800");
	const successHex = getDadsSemanticHex(dadsTokens, "green", 600, "#35A16B");
	const warningHex = getDadsSemanticHex(
		dadsTokens,
		warningHue,
		warningStep,
		"#D7C447",
	);

	// Apply contrast adjustment for semantic colors when needed
	const bgHex = state.lightBackgroundColor || DEFAULT_STUDIO_BACKGROUND;
	const minContrast = studioViewDeps.resolvePresetMinContrast(preset);

	return {
		primaryHex,
		primaryStep,
		secondaryHex,
		tertiaryHex,
		accentHex,
		accentHexes,
		semantic: {
			error: studioViewDeps.adjustLightnessForContrast(
				errorHex,
				bgHex,
				minContrast,
			),
			success: studioViewDeps.adjustLightnessForContrast(
				successHex,
				bgHex,
				minContrast,
			),
			warning: studioViewDeps.adjustLightnessForContrast(
				warningHex,
				bgHex,
				minContrast,
			),
		},
	};
}

export function buildPreviewColors(
	input: StudioPaletteColors,
	backgroundHex: string,
	preset: StudioPresetType,
): PalettePreviewColors {
	return studioViewDeps.mapPaletteToPreviewColors({
		primaryHex: input.primaryHex,
		accentHex: input.accentHex,
		semanticColors: {
			error: input.semantic.error,
			success: input.semantic.success,
			warning: input.semantic.warning,
			// プレビュー側ではリンク色は使用しないが、型上必要なため固定値で供給
			link: "#0091FF",
		},
		backgroundColor: backgroundHex,
		preset,
	});
}

export async function selectRandomPrimaryFromDads(
	dadsTokens: DadsToken[],
	preset: StudioPresetType,
	backgroundHex: string,
	rnd: () => number,
): Promise<{ hex: string; step?: number; baseChromaName: string }> {
	const chromatic = dadsTokens.filter(
		(t) => t.classification.category === "chromatic",
	);
	const presetFiltered = chromatic.filter((t) =>
		studioViewDeps.matchesPreset(t.hex, preset),
	);
	const baseList = presetFiltered.length > 0 ? presetFiltered : chromatic;

	const minContrast = studioViewDeps.resolvePresetMinContrast(preset);
	const contrastFiltered = baseList.filter((t) => {
		const ratio = wcagContrast(backgroundHex, t.hex);
		return ratio >= minContrast;
	});

	// コントラストを満たす候補がない場合は、プリセット制約を緩めてDADSトークン範囲で再探索する。
	// （DADS token と `@step` の整合性を保つため、hex の明度調整フォールバックは行わない）
	const fallbackContrastFiltered =
		contrastFiltered.length > 0
			? contrastFiltered
			: chromatic.filter((t) => {
					const ratio = wcagContrast(backgroundHex, t.hex);
					return ratio >= minContrast;
				});

	const finalList =
		fallbackContrastFiltered.length > 0 ? fallbackContrastFiltered : baseList;

	const selected = pickRandom(finalList, rnd) ?? pickRandom(chromatic, rnd);
	if (!selected) {
		return { hex: "#00A3BF", baseChromaName: "Cyan" };
	}

	const step = selected.classification.scale;
	// Use DADS token's actual hue classification instead of inferring from hex
	// This ensures proper matching with getDadsHueFromDisplayName in deriver.ts
	const dadsHue = selected.classification.hue;
	const baseChromaName =
		(dadsHue ? HUE_DISPLAY_NAMES[dadsHue] : undefined) ||
		studioViewDeps.inferBaseChromaNameFromHex(selected.hex) ||
		"Blue";

	return { hex: selected.hex, step, baseChromaName };
}

export function setLockedColors(patch: Partial<LockedColorsState>): void {
	state.lockedColors = { ...state.lockedColors, ...patch };
}

export function pickUniqueBy<T>(
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

import { wcagContrast } from "culori";
import {
	calculateSimpleDeltaE,
	DISTINGUISHABILITY_THRESHOLD,
} from "@/accessibility/distinguishability";
import { generateCandidates } from "@/core/accent/accent-candidate-service";
import { Color } from "@/core/color";
import {
	generateHarmonyPalette,
	HarmonyType,
	initializeHarmonyDads,
} from "@/core/harmony";
import { findDadsColorByHex } from "@/core/tokens/dads-data-provider";
import type { DadsToken } from "@/core/tokens/types";
import { detectCvdConfusionPairs } from "@/ui/accessibility/cvd-detection";
import { updateA11yIssueBadge } from "../a11y-drawer";
import { updateCVDScoreDisplay } from "../cvd-controls";
import { createDerivedPalettes } from "../palette-generator";
import { state } from "../state";
import type { PaletteConfig, StudioPresetType } from "../types";
import type { DadsSnapCandidate, DadsSnapResult } from "../utils/dads-snap";
import { resolveWarningPattern } from "../utils/palette-utils";
import {
	computePaletteColors,
	DEFAULT_STUDIO_BACKGROUND,
	getDadsInfoWithChromaName,
	getDadsSemanticHex,
	isValidHex6,
	pickRandom,
	pickUniqueBy,
	STUDIO_HARMONY_TYPES,
	selectRandomPrimaryFromDads,
} from "./studio-view.core";
import { studioViewDeps } from "./studio-view-deps";

export async function selectRandomAccentCandidates(
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

	const minContrast = studioViewDeps.resolvePresetMinContrast(preset);
	const allCandidates = response.result.candidates;
	const presetFiltered = allCandidates.filter((c) =>
		studioViewDeps.matchesPreset(c.hex, preset),
	);
	const base = presetFiltered.length > 0 ? presetFiltered : allCandidates;

	const contrastFiltered = base.filter(
		(c) => wcagContrast(backgroundHex, c.hex) >= minContrast,
	);

	// コントラスト条件を満たす候補がない場合は、プリセット制約を緩めてDADSトークン範囲で再探索する。
	// （DADS token と `@step` の整合性を保つため、hex の明度調整フォールバックは行わない）
	const fallbackContrastFiltered =
		contrastFiltered.length > 0
			? contrastFiltered
			: allCandidates.filter(
					(c) => wcagContrast(backgroundHex, c.hex) >= minContrast,
				);

	const candidates =
		fallbackContrastFiltered.length > 0 ? fallbackContrastFiltered : base;

	// Prefer higher-ranked candidates while still allowing variety.
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

function computeStudioSemanticColors(
	dadsTokens: DadsToken[],
	preset: StudioPresetType,
	backgroundHex: string,
): StudioSemanticColors {
	const warningPattern = resolveWarningPattern(state.semanticColorConfig);
	const warningHue = warningPattern === "orange" ? "orange" : "yellow";
	const warningStep = warningPattern === "orange" ? 600 : 700;

	const errorHex = getDadsSemanticHex(dadsTokens, "red", 800, "#FF2800");
	const successHex = getDadsSemanticHex(dadsTokens, "green", 600, "#35A16B");
	const warningHex = getDadsSemanticHex(
		dadsTokens,
		warningHue,
		warningStep,
		"#D7C447",
	);

	const minContrast = studioViewDeps.resolvePresetMinContrast(preset);

	return {
		error: studioViewDeps.adjustLightnessForContrast(
			errorHex,
			backgroundHex,
			minContrast,
		),
		success: studioViewDeps.adjustLightnessForContrast(
			successHex,
			backgroundHex,
			minContrast,
		),
		warning: studioViewDeps.adjustLightnessForContrast(
			warningHex,
			backgroundHex,
			minContrast,
		),
	};
}

const HARMONY_DADS_SNAP_CANDIDATES = 8;

// 色覚多様性対策: 色相差がCVDで潰れても区別できるよう、明度差も確保する
const MIN_OKLCH_LIGHTNESS_DISTANCE = 0.12;

// NOTE: Keep generation scoring independent from the UI toggle (`state.cvdConfusionThreshold`).
// The toggle is for display (summary/badge/a11y view), while generation should remain stable
// for a given seed/preset.
const GENERATION_CVD_CONFUSION_THRESHOLD = DISTINGUISHABILITY_THRESHOLD;

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

	// Tests may pass empty DADS tokens; keep a fallback path compatible with mocking.
	if (dadsTokens.length === 0) {
		const results: DadsSnapResult[] = [];
		for (const hex of targetHexes) {
			const snapped = studioViewDeps.snapToNearestDadsToken(
				hex,
				dadsTokens,
				preset,
			);
			if (snapped) results.push(snapped);
		}
		return results;
	}

	const candidateLists: DadsSnapCandidate[][] = targetHexes.map((hex) =>
		studioViewDeps.findNearestDadsTokenCandidates(
			hex,
			dadsTokens,
			preset,
			HARMONY_DADS_SNAP_CANDIDATES,
		),
	);

	// Defensive fallback: keep previous behavior if candidates could not be built.
	if (candidateLists.some((list) => list.length === 0)) {
		const results: DadsSnapResult[] = [];
		for (const hex of targetHexes) {
			const snapped = studioViewDeps.snapToNearestDadsToken(
				hex,
				dadsTokens,
				preset,
			);
			if (snapped) results.push(snapped);
		}
		return results;
	}

	const minContrast = studioViewDeps.resolvePresetMinContrast(preset);
	const toEffectiveHex = (hex: string): string => {
		const ratio = wcagContrast(backgroundHex, hex) ?? 0;
		if (ratio >= minContrast) return hex;
		return studioViewDeps.adjustLightnessForContrast(
			hex,
			backgroundHex,
			minContrast,
		);
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

		// Contrast adjustments happen after selection; evaluate against the effective hexes.
		const accentHexes = normalized.map((c) => toEffectiveHex(c.hex));
		const accentColors = accentHexes.map((hex) => new Color(hex));

		// Penalize colors that become indistinguishable in normal vision (prevents "cheating").
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

		const sumDeltaE = normalized.reduce((sum, c) => sum + c.deltaE, 0);
		const baseScore =
			missingPenalty * 100_000 +
			normalTooCloseCount * 10_000 +
			lightnessPenalty * 10_000 +
			sumDeltaE;

		// `cvdPairs.length` is always non-negative, so the final score is never lower than
		// `baseScore`. If we're already worse than the best score, skip the expensive CVD check.
		if (baseScore >= bestScore) return;

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
		const cvdPairs = detectCvdConfusionPairs(namedColors, {
			threshold: GENERATION_CVD_CONFUSION_THRESHOLD,
		});

		const score = baseScore + cvdPairs.length * 1_000;

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

	const picked: DadsSnapCandidate[] = bestCombo ?? [];
	return picked.map((c) => ({
		hex: c.hex,
		step: c.step,
		baseChromaName:
			c.baseChromaName || studioViewDeps.inferBaseChromaNameFromHex(c.hex),
	}));
}

/**
 * ハーモニーに基づいてアクセントカラーを生成
 * targetCountに満たない場合は色相が離れた色で補完
 */
async function selectHarmonyAccentCandidates(
	primaryHex: string,
	harmonyType: HarmonyType,
	dadsTokens: DadsToken[],
	preset: StudioPresetType,
	backgroundHex: string,
	rnd: () => number,
	targetCount: number,
): Promise<DadsSnapResult[]> {
	await initializeHarmonyDads();

	const primaryColor = new Color(primaryHex);
	const minContrast = studioViewDeps.resolvePresetMinContrast(preset);
	const semantic = computeStudioSemanticColors(
		dadsTokens,
		preset,
		backgroundHex,
	);

	// ハーモニーベースの色を生成
	let harmonyAccents: DadsSnapResult[];

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

	// 正規化: 重複を排除し、要求数を超える場合はクランプする
	// - complementary拡張（+180/+210）で同じDADSトークンにスナップされるケースがある
	// - tetradic/square は候補が3色出るため、UIのアクセント数（2-4）と一致させる
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

	// 不足分を補完
	if (harmonyAccents.length < targetCount) {
		const primaryOklch = primaryColor.oklch;
		const existingHues = [
			primaryOklch?.h ?? 0,
			...harmonyAccents.map((a) => new Color(a.hex).oklch?.h ?? 0),
		];

		const needed = targetCount - harmonyAccents.length;
		const complementary = studioViewDeps.selectHueDistantColors(
			existingHues,
			needed,
			dadsTokens,
			preset,
			backgroundHex,
			rnd,
		);

		harmonyAccents = [...harmonyAccents, ...complementary];
	}

	// 最終クランプ（補完後も含めて targetCount に揃える）
	harmonyAccents = uniqueByHex(harmonyAccents).slice(0, targetCount);

	// コントラスト不足のアクセントは、同一色相のDADSトークン内で step を寄せて解決する。
	// （DADS token と `@step` の整合性を保つため、hex の明度調整フォールバックは行わない）
	const usedHexes = new Set<string>();
	const ensured: DadsSnapResult[] = [];

	for (const accent of harmonyAccents) {
		const currentContrast = wcagContrast(backgroundHex, accent.hex) ?? 0;
		const accentKey = accent.hex.trim().toLowerCase();
		if (currentContrast >= minContrast && !usedHexes.has(accentKey)) {
			ensured.push(accent);
			usedHexes.add(accentKey);
			continue;
		}

		const dadsInfo = findDadsColorByHex(dadsTokens, accent.hex);
		if (!dadsInfo) {
			ensured.push(accent);
			usedHexes.add(accentKey);
			continue;
		}

		const hue = dadsInfo.hue;
		const originalScale = dadsInfo.scale;
		const candidates = dadsTokens
			.filter(
				(t) =>
					t.classification.category === "chromatic" &&
					t.classification.hue === hue,
			)
			.map((t) => {
				const step = t.classification.scale;
				return {
					hex: t.hex,
					step: typeof step === "number" ? step : undefined,
					contrast: wcagContrast(backgroundHex, t.hex) ?? 0,
				};
			})
			.filter(
				(
					c,
				): c is {
					hex: string;
					step: NonNullable<DadsToken["classification"]["scale"]>;
					contrast: number;
				} => typeof c.step === "number" && c.contrast >= minContrast,
			)
			.sort(
				(a, b) =>
					Math.abs(a.step - originalScale) - Math.abs(b.step - originalScale),
			);

		let replaced = accent;
		for (const candidate of candidates) {
			const candidateKey = candidate.hex.trim().toLowerCase();
			if (usedHexes.has(candidateKey)) continue;
			const { baseChromaName } = getDadsInfoWithChromaName(
				dadsTokens,
				candidate.hex,
			);
			replaced = {
				...accent,
				hex: candidate.hex,
				step: candidate.step,
				baseChromaName,
			};
			break;
		}

		ensured.push(replaced);
		usedHexes.add(replaced.hex.trim().toLowerCase());
	}

	return ensured;
}

export async function rebuildStudioPalettes(options: {
	dadsTokens: DadsToken[];
	primaryHex: string;
	primaryStep?: number;
	primaryBaseChromaName?: string;
	accentCandidates?: DadsSnapResult[];
}): Promise<void> {
	const timestamp = Date.now();
	const backgroundColor = DEFAULT_STUDIO_BACKGROUND;
	const minContrast = studioViewDeps.resolvePresetMinContrast(
		state.activePreset,
	);

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
			studioViewDeps.inferBaseChromaNameFromHex(options.primaryHex),
		step: options.primaryStep,
	};

	const derived = createDerivedPalettes(
		primaryPalette,
		backgroundColor,
		options.dadsTokens,
		{ secondaryUiContrast: minContrast, tertiaryContrast: minContrast },
	);

	// Apply contrast adjustment to derived palettes (Secondary/Tertiary) based on preset.
	// If a derived palette is backed by a DADS token (`@step` suffix), keep the exact token hex.
	// (Adjusting would create non-DADS colors while still showing a DADS step.)
	const adjustedDerived = derived.map((palette) => {
		const keyColor = palette.keyColors[0];
		if (!keyColor) return palette;

		// Extract HEX and optional step from keyColor (format: "#hex" or "#hex@step")
		const [hex, step] = keyColor.split("@");
		if (!hex) return palette;
		if (step) return palette;

		const adjustedHex = studioViewDeps.adjustLightnessForContrast(
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

	if (options.accentCandidates && options.accentCandidates.length > 0) {
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
	}

	state.palettes = palettes;
	state.activeId = primaryPalette.id;

	// 他ビューとの整合のため hidden input も同期
	const keyColorsInput = document.getElementById(
		"keyColors",
	) as HTMLInputElement | null;
	if (keyColorsInput) {
		keyColorsInput.value = options.primaryHex;
	}

	// Studio内の配色更新で識別性スコア表示も追従させる
	updateCVDScoreDisplay();
	updateA11yIssueBadge();
}

export async function generateNewStudioPalette(
	dadsTokens: DadsToken[],
): Promise<void> {
	const studioSeed = state.studioSeed || 0;
	const rnd = studioViewDeps.createSeededRandom(studioSeed);

	// Studioの背景は白固定（ニュートラルはカード/ボックス等の要素に使用）
	const backgroundHex = DEFAULT_STUDIO_BACKGROUND;

	let primaryHex: string | null = null;
	let primaryStep: number | undefined;
	let primaryBaseChromaName: string | undefined;

	const currentPrimary = computePaletteColors(dadsTokens, state.activePreset);
	if (state.lockedColors.primary) {
		primaryHex = currentPrimary.primaryHex;
		primaryStep = currentPrimary.primaryStep;
		const { baseChromaName } = getDadsInfoWithChromaName(
			dadsTokens,
			currentPrimary.primaryHex,
		);
		primaryBaseChromaName = baseChromaName;
	} else {
		const selected = await selectRandomPrimaryFromDads(
			dadsTokens,
			state.activePreset,
			backgroundHex,
			rnd,
		);
		primaryHex = selected.hex;
		primaryStep = selected.step;
		primaryBaseChromaName = selected.baseChromaName;
	}

	// ハーモニータイプをランダム選択
	const harmonyType = pickRandom(STUDIO_HARMONY_TYPES, rnd) ?? HarmonyType.NONE;

	const targetAccentCount = Math.max(2, Math.min(4, state.studioAccentCount));
	let accentCandidates: DadsSnapResult[] = [];

	if (state.lockedColors.accent) {
		// アクセントがロックされている場合は既存の色を維持
		const current = currentPrimary.accentHexes.slice(0, targetAccentCount);
		accentCandidates = current.map((hex) => {
			const dadsInfo = findDadsColorByHex(dadsTokens, hex);
			return { hex, step: dadsInfo?.scale };
		});
	} else if (harmonyType === HarmonyType.NONE) {
		// NONE: 従来のランダム候補生成
		accentCandidates = await selectRandomAccentCandidates(
			primaryHex,
			state.activePreset,
			backgroundHex,
			targetAccentCount,
			rnd,
		);
	} else {
		// ハーモニーに基づくアクセント生成
		accentCandidates = await selectHarmonyAccentCandidates(
			primaryHex,
			harmonyType,
			dadsTokens,
			state.activePreset,
			backgroundHex,
			rnd,
			targetAccentCount,
		);
	}

	await rebuildStudioPalettes({
		dadsTokens,
		primaryHex,
		primaryStep,
		primaryBaseChromaName,
		accentCandidates,
	});
}

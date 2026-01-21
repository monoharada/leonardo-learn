/**
 * スタジオビューモジュール（Huemint風）
 *
 * プレビューを中心に、Random（DADSトークン）→ ロック → Export の体験を提供する。
 * 生成AI機能は実装せず、DADSトークンと既存機能の組み合わせで構成する。
 *
 * 制約:
 * - DADSに存在しない色の生成は行わない（Primaryの手入力のみ例外として許可）
 *
 * @module @/ui/demo/views/studio-view
 */

import { wcagContrast } from "culori";
import { generateCandidates } from "@/core/accent/accent-candidate-service";
import { findNearestChroma } from "@/core/base-chroma";
import { Color } from "@/core/color";
import { HarmonyType } from "@/core/harmony";
import {
	findDadsColorByHex,
	getDadsColorsByHue,
	loadDadsTokens,
} from "@/core/tokens/dads-data-provider";
import type { DadsToken } from "@/core/tokens/types";
import { detectCvdConfusionPairs } from "@/ui/accessibility/cvd-detection";
import { getDisplayHex, updateCVDScoreDisplay } from "../cvd-controls";
import { createDerivedPalettes } from "../palette-generator";
import { parseKeyColor, state, validateBackgroundColor } from "../state";
import { createStudioUrlHash } from "../studio-url-state";
import type {
	ColorDetailModalOptions,
	LockedColorsState,
	PaletteConfig,
	PreviewKvState,
	StudioPresetType,
} from "../types";
import { stripStepSuffix } from "../types";
import { copyTextToClipboard } from "../utils/clipboard";
import {
	resolveAccentSourcePalette,
	resolveWarningPattern,
} from "../utils/palette-utils";
import {
	createPalettePreview,
	createSeededRandom,
	mapPaletteToPreviewColors,
	type PalettePreviewColors,
} from "./palette-preview";

export interface StudioViewCallbacks {
	onColorClick: (options: ColorDetailModalOptions) => void;
}

type ContrastBadgeGrade = "AAA" | "AA" | "AA Large" | "Fail";

const CONTRAST_THRESHOLDS: Record<
	Exclude<ContrastBadgeGrade, "Fail">,
	number
> = {
	AAA: 7,
	AA: 4.5,
	"AA Large": 3,
};

const STUDIO_PRESET_LABELS: Record<StudioPresetType, string> = {
	default: "Default",
	"high-contrast": "High Contrast",
	pastel: "Pastel",
	vibrant: "Vibrant",
	dark: "Dark",
};

function gradeContrast(ratio: number): ContrastBadgeGrade {
	if (ratio >= CONTRAST_THRESHOLDS.AAA) return "AAA";
	if (ratio >= CONTRAST_THRESHOLDS.AA) return "AA";
	if (ratio >= CONTRAST_THRESHOLDS["AA Large"]) return "AA Large";
	return "Fail";
}

function resolvePresetMinContrast(preset: StudioPresetType): number {
	switch (preset) {
		case "high-contrast":
			return 7;
		case "pastel":
			return 3;
		default:
			return 4.5;
	}
}

function matchesPreset(hex: string, preset: StudioPresetType): boolean {
	const oklch = new Color(hex).oklch;
	if (!oklch) return true;

	const l = oklch.l ?? 0.5;
	const c = oklch.c ?? 0;

	switch (preset) {
		case "pastel":
			return l >= 0.75 && c <= 0.1;
		case "vibrant":
			return c >= 0.12 && l >= 0.35 && l <= 0.85;
		case "dark":
			return l <= 0.4;
		case "high-contrast":
		case "default":
			return true;
	}
}

function pickRandom<T>(items: readonly T[], rnd: () => number): T | null {
	if (items.length === 0) return null;
	const index = Math.floor(rnd() * items.length);
	return items[index] ?? null;
}

function inferBaseChromaNameFromHex(hex: string): string {
	const parsed = new Color(hex).oklch;
	const hue = parsed?.h ?? 0;
	return findNearestChroma(hue).displayName;
}

function getPrimaryPalette(): PaletteConfig | undefined {
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
		.filter((hex) => /^#[0-9A-Fa-f]{6}$/.test(hex));

	if (fromAccents.length > 0) return fromAccents;

	const fallback = stripStepSuffix(
		resolveAccentSourcePalette(palettes)?.keyColors[0] ?? "",
	);
	return /^#[0-9A-Fa-f]{6}$/.test(fallback) ? [fallback] : [];
}

const studioButtonTextResetTimers = new WeakMap<
	HTMLButtonElement,
	ReturnType<typeof setTimeout>
>();

function setTemporaryButtonText(
	btn: HTMLButtonElement,
	text: string,
	options?: { durationMs?: number; resetText?: string; resetHTML?: string },
): void {
	const durationMs = options?.durationMs ?? 2000;
	const resetHTML = options?.resetHTML;
	const resetText = options?.resetText ?? btn.textContent ?? "";

	btn.textContent = text;

	const existing = studioButtonTextResetTimers.get(btn);
	if (existing) globalThis.clearTimeout(existing);

	const timer = globalThis.setTimeout(() => {
		if (!btn.isConnected) return;
		if (resetHTML) {
			btn.innerHTML = resetHTML;
		} else {
			btn.textContent = resetText;
		}
	}, durationMs);
	studioButtonTextResetTimers.set(btn, timer);
}

let dadsTokensPromise: Promise<DadsToken[]> | null = null;
async function getDadsTokens(): Promise<DadsToken[]> {
	if (!dadsTokensPromise) {
		dadsTokensPromise = loadDadsTokens().catch((error) => {
			dadsTokensPromise = null;
			throw error;
		});
	}
	return dadsTokensPromise;
}

function getDadsSemanticHex(
	dadsTokens: DadsToken[],
	hue: Parameters<typeof getDadsColorsByHue>[1],
	step: number,
	fallback: string,
): string {
	return (
		getDadsColorsByHue(dadsTokens, hue).colors.find((c) => c.scale === step)
			?.hex ?? fallback
	);
}

function computePaletteColors(dadsTokens: DadsToken[]): {
	primaryHex: string;
	primaryStep?: number;
	accentHex: string;
	accentHexes: string[];
	semantic: { error: string; success: string; warning: string };
} {
	const primaryPalette = getPrimaryPalette();
	const primaryInput = primaryPalette?.keyColors[0] ?? "#00A3BF";
	const { color: primaryHexRaw } = parseKeyColor(primaryInput);
	const primaryHex = stripStepSuffix(primaryHexRaw) || "#00A3BF";

	const dadsInfo = findDadsColorByHex(dadsTokens, primaryHex);
	const primaryStep = dadsInfo?.scale;

	const accentHexes = getAccentHexes(state.palettes);
	const accentHex = accentHexes[0] || "#259063";

	const warningPattern = resolveWarningPattern(state.semanticColorConfig);
	const warningHue = warningPattern === "orange" ? "orange" : "yellow";
	const warningStep = warningPattern === "orange" ? 600 : 700;

	return {
		primaryHex,
		primaryStep,
		accentHex,
		accentHexes,
		semantic: {
			error: getDadsSemanticHex(dadsTokens, "red", 800, "#FF2800"),
			success: getDadsSemanticHex(dadsTokens, "green", 600, "#35A16B"),
			warning: getDadsSemanticHex(
				dadsTokens,
				warningHue,
				warningStep,
				"#D7C447",
			),
		},
	};
}

function buildPreviewColors(
	input: ReturnType<typeof computePaletteColors>,
	backgroundHex: string,
): PalettePreviewColors {
	return mapPaletteToPreviewColors({
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
	});
}

async function selectRandomPrimaryFromDads(
	dadsTokens: DadsToken[],
	preset: StudioPresetType,
	backgroundHex: string,
	rnd: () => number,
): Promise<{ hex: string; step?: number; baseChromaName: string }> {
	const chromatic = dadsTokens.filter(
		(t) => t.classification.category === "chromatic",
	);
	const presetFiltered = chromatic.filter((t) => matchesPreset(t.hex, preset));
	const baseList = presetFiltered.length > 0 ? presetFiltered : chromatic;

	const minContrast = resolvePresetMinContrast(preset);
	const contrastFiltered = baseList.filter((t) => {
		const ratio = wcagContrast(backgroundHex, t.hex);
		return ratio >= minContrast;
	});
	const finalList = contrastFiltered.length > 0 ? contrastFiltered : baseList;

	const selected = pickRandom(finalList, rnd) ?? pickRandom(chromatic, rnd);
	if (!selected) {
		return { hex: "#00A3BF", baseChromaName: "Blue" };
	}

	const step = selected.classification.scale;
	const baseChromaName = inferBaseChromaNameFromHex(selected.hex) || "Blue";

	return { hex: selected.hex, step, baseChromaName };
}

function setLockedColors(patch: Partial<LockedColorsState>): void {
	state.lockedColors = { ...state.lockedColors, ...patch };
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

async function selectRandomAccentCandidates(
	brandHex: string,
	preset: StudioPresetType,
	backgroundHex: string,
	count: number,
	rnd: () => number,
): Promise<Array<{ hex: string; step?: number; baseChromaName?: string }>> {
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
		(c) => wcagContrast(backgroundHex, c.hex) >= minContrast,
	);
	const candidates = contrastFiltered.length > 0 ? contrastFiltered : base;

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

async function rebuildStudioPalettes(options: {
	dadsTokens: DadsToken[];
	primaryHex: string;
	primaryStep?: number;
	primaryBaseChromaName?: string;
	accentCandidates?: Array<{
		hex: string;
		step?: number;
		baseChromaName?: string;
	}>;
}): Promise<void> {
	const timestamp = Date.now();
	const backgroundColor = "#ffffff";

	const primaryKeyColor =
		options.primaryStep && /^#[0-9A-Fa-f]{6}$/.test(options.primaryHex)
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

	const palettes: PaletteConfig[] = [primaryPalette, ...derived];

	if (options.accentCandidates && options.accentCandidates.length > 0) {
		for (let i = 0; i < options.accentCandidates.length; i++) {
			const candidate = options.accentCandidates[i];
			if (!candidate) continue;

			const accentKeyColor =
				candidate.step && /^#[0-9A-Fa-f]{6}$/.test(candidate.hex)
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
}

async function generateNewStudioPalette(
	dadsTokens: DadsToken[],
): Promise<void> {
	const studioSeed = state.studioSeed || 0;
	const rnd = createSeededRandom(studioSeed);

	// Studioの背景は白固定（ニュートラルはカード/ボックス等の要素に使用）
	const backgroundHex = "#ffffff";

	let primaryHex: string | null = null;
	let primaryStep: number | undefined;
	let primaryBaseChromaName: string | undefined;

	const currentPrimary = computePaletteColors(dadsTokens);
	if (state.lockedColors.primary) {
		primaryHex = currentPrimary.primaryHex;
		primaryStep = currentPrimary.primaryStep;
		primaryBaseChromaName = inferBaseChromaNameFromHex(
			currentPrimary.primaryHex,
		);
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

	const targetAccentCount = Math.max(2, Math.min(4, state.studioAccentCount));
	let accentCandidates: Array<{
		hex: string;
		step?: number;
		baseChromaName?: string;
	}> = [];

	if (state.lockedColors.accent) {
		const current = currentPrimary.accentHexes.slice(0, targetAccentCount);
		accentCandidates = current.map((hex) => {
			const dadsInfo = findDadsColorByHex(dadsTokens, hex);
			return { hex, step: dadsInfo?.scale };
		});
	} else {
		accentCandidates = await selectRandomAccentCandidates(
			primaryHex,
			state.activePreset,
			backgroundHex,
			targetAccentCount,
			rnd,
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

function renderEmptyState(container: HTMLElement): void {
	const empty = document.createElement("div");
	empty.className = "dads-empty-state";
	empty.innerHTML = `
		<p>スタジオが生成されていません</p>
		<p>「配色シャッフル」でDADSトークンから配色を作成できます。</p>
	`;
	container.appendChild(empty);
}

const studioRenderGeneration = new WeakMap<HTMLElement, number>();

type StudioUndoSnapshot = {
	palettes: PaletteConfig[];
	activeId: string;
	studioSeed: number;
	studioAccentCount: 2 | 3 | 4;
	lockedColors: LockedColorsState;
	activePreset: StudioPresetType;
	previewKv: PreviewKvState;
};

const studioUndoHistory: StudioUndoSnapshot[] = [];
const MAX_UNDO_HISTORY_SIZE = 20;

// Stored reference for document-level popover click handler cleanup (prevents memory leak)
let popoverClickHandler: ((e: MouseEvent) => void) | null = null;

// Check structuredClone availability once at module load time
const hasStructuredClone = typeof globalThis.structuredClone === "function";

function cloneValue<T>(value: T): T {
	if (hasStructuredClone) {
		return globalThis.structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
}

function createUndoSnapshot(): StudioUndoSnapshot {
	return {
		palettes: cloneValue(state.palettes),
		activeId: state.activeId,
		studioSeed: state.studioSeed,
		studioAccentCount: state.studioAccentCount,
		lockedColors: cloneValue(state.lockedColors),
		activePreset: state.activePreset,
		previewKv: cloneValue(state.previewKv),
	};
}

function pushUndoSnapshot(): void {
	studioUndoHistory.push(createUndoSnapshot());
	// Limit history size to prevent unbounded memory growth
	if (studioUndoHistory.length > MAX_UNDO_HISTORY_SIZE) {
		studioUndoHistory.shift();
	}
}

function buildShareUrl(dadsTokens: DadsToken[]): string {
	const colors = computePaletteColors(dadsTokens);
	const accentHexes = colors.accentHexes.slice(
		0,
		Math.max(2, Math.min(4, state.studioAccentCount)),
	);
	const accents = accentHexes.length > 0 ? accentHexes : [colors.accentHex];

	const shareState = {
		v: 2 as const,
		primary: colors.primaryHex,
		accents,
		accentCount: state.studioAccentCount,
		preset: state.activePreset,
		locks: {
			primary: state.lockedColors.primary,
			accent: state.lockedColors.accent,
		},
		kv: state.previewKv,
		studioSeed: state.studioSeed,
	};

	const url = new URL(window.location.href);
	url.hash = createStudioUrlHash(shareState);
	return url.toString();
}

function getLockStateForType(
	lockType: "background" | "text" | "primary" | "accent" | null,
): boolean {
	switch (lockType) {
		case "background":
			return state.lockedColors.background;
		case "text":
			return state.lockedColors.text;
		case "primary":
			return state.lockedColors.primary;
		case "accent":
			return state.lockedColors.accent;
		default:
			return false;
	}
}

export async function renderStudioView(
	container: HTMLElement,
	callbacks: StudioViewCallbacks,
): Promise<void> {
	const renderGeneration = (studioRenderGeneration.get(container) ?? 0) + 1;
	studioRenderGeneration.set(container, renderGeneration);
	const isCurrentRender = () =>
		studioRenderGeneration.get(container) === renderGeneration;

	let dadsTokens: DadsToken[];
	try {
		dadsTokens = await getDadsTokens();
	} catch (error) {
		console.error("Failed to load DADS tokens for studio view:", error);
		dadsTokens = [];
	}

	if (!isCurrentRender()) return;

	container.className = "dads-section dads-studio";
	container.innerHTML = "";
	container.style.backgroundColor = "#ffffff";

	const toolbar = document.createElement("section");
	toolbar.className = "studio-toolbar";
	toolbar.setAttribute("role", "region");
	toolbar.setAttribute("aria-label", "スタジオツールバー");

	const swatches = document.createElement("div");
	swatches.className = "studio-toolbar__swatches";

	const controls = document.createElement("div");
	controls.className = "studio-toolbar__controls";

	const settingsDetails = document.createElement("details");
	settingsDetails.className = "studio-settings";

	const settingsSummary = document.createElement("summary");
	settingsSummary.className = "studio-settings__summary dads-button";
	settingsSummary.dataset.size = "sm";
	settingsSummary.dataset.type = "text";
	settingsSummary.textContent = "設定";
	settingsDetails.style.marginLeft = "16px";

	const settingsPanel = document.createElement("div");
	settingsPanel.className = "studio-settings__panel";

	const createSettingGroup = (
		labelText: string,
		content: HTMLElement,
	): HTMLElement => {
		const row = document.createElement("div");
		row.className = "studio-settings__row";

		const label = document.createElement("span");
		label.className = "dads-label";
		label.textContent = labelText;

		row.appendChild(label);
		row.appendChild(content);
		return row;
	};

	const accentCountButtons = document.createElement("div");
	accentCountButtons.className = "dads-button-group";
	accentCountButtons.setAttribute("aria-label", "アクセント色数");

	([2, 3, 4] as const).forEach((count) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "dads-button";
		btn.dataset.size = "sm";
		btn.dataset.type = "text";
		btn.dataset.active = String(state.studioAccentCount === count);
		btn.textContent = String(count);
		btn.onclick = async () => {
			state.studioAccentCount = count;
			try {
				// 既存Primaryを維持しつつ、アクセントだけ再生成（必要な場合のみ）
				if (state.palettes.length > 0) {
					const current = computePaletteColors(dadsTokens);
					const backgroundHex = "#ffffff";
					const existing = current.accentHexes;
					const desired = Math.max(2, Math.min(4, state.studioAccentCount));

					const keep = existing.slice(0, desired);
					const missing = desired - keep.length;

					let extra: Array<{
						hex: string;
						step?: number;
						baseChromaName?: string;
					}> = [];
					if (missing > 0) {
						const seed = (state.studioSeed || 0) ^ desired;
						const rnd = createSeededRandom(seed);
						const picked = await selectRandomAccentCandidates(
							current.primaryHex,
							state.activePreset,
							backgroundHex,
							desired,
							rnd,
						);
						const keepSet = new Set(keep.map((h) => h.toLowerCase()));
						extra = picked
							.filter((p) => !keepSet.has(p.hex.toLowerCase()))
							.slice(0, missing);
					}

					const accentCandidates = [
						...keep.map((hex) => {
							const dadsInfo = findDadsColorByHex(dadsTokens, hex);
							return { hex, step: dadsInfo?.scale };
						}),
						...extra,
					].slice(0, desired);

					await rebuildStudioPalettes({
						dadsTokens,
						primaryHex: current.primaryHex,
						primaryStep: current.primaryStep,
						primaryBaseChromaName: inferBaseChromaNameFromHex(
							current.primaryHex,
						),
						accentCandidates,
					});
				}
			} finally {
				void renderStudioView(container, callbacks);
			}
		};
		accentCountButtons.appendChild(btn);
	});

	const presetButtons = document.createElement("div");
	presetButtons.className = "dads-button-group";
	presetButtons.setAttribute("aria-label", "ジェネレートプリセット");

	(Object.keys(STUDIO_PRESET_LABELS) as StudioPresetType[]).forEach(
		(preset) => {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "dads-button";
			btn.dataset.size = "sm";
			btn.dataset.type = "text";
			btn.dataset.active = String(state.activePreset === preset);
			btn.textContent = STUDIO_PRESET_LABELS[preset];
			btn.onclick = () => {
				state.activePreset = preset;
				void renderStudioView(container, callbacks);
			};
			presetButtons.appendChild(btn);
		},
	);

	settingsPanel.appendChild(
		createSettingGroup("アクセント色数", accentCountButtons),
	);
	settingsPanel.appendChild(createSettingGroup("プリセット", presetButtons));

	settingsDetails.onkeydown = (event) => {
		if (event.key !== "Escape") return;
		event.preventDefault();
		settingsDetails.open = false;
		settingsSummary.focus();
	};

	settingsDetails.appendChild(settingsSummary);
	settingsDetails.appendChild(settingsPanel);

	const toast = document.createElement("div");
	toast.className = "studio-toast";
	toast.setAttribute("role", "status");
	toast.setAttribute("aria-live", "polite");
	toast.textContent = "これ以上履歴はありません";

	let toastTimeout: ReturnType<typeof setTimeout> | null = null;
	const showToast = () => {
		if (toastTimeout) clearTimeout(toastTimeout);
		toast.dataset.visible = "true";
		toastTimeout = setTimeout(() => {
			toast.dataset.visible = "false";
		}, 2000);
	};

	const undoBtn = document.createElement("button");
	undoBtn.type = "button";
	undoBtn.className = "studio-undo-btn dads-button";
	undoBtn.dataset.size = "sm";
	undoBtn.dataset.type = "outline";
	undoBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 2px;"><polyline points="15 18 9 12 15 6"></polyline></svg>戻る`;
	undoBtn.onclick = () => {
		if (studioUndoHistory.length === 0) {
			showToast();
			return;
		}

		const snapshot = studioUndoHistory.pop();
		if (!snapshot) return;

		state.palettes = cloneValue(snapshot.palettes);
		state.activeId = snapshot.activeId;
		state.lockedColors = cloneValue(snapshot.lockedColors);
		state.activePreset = snapshot.activePreset;
		state.previewKv = cloneValue(snapshot.previewKv);
		state.studioSeed = snapshot.studioSeed;
		state.studioAccentCount = snapshot.studioAccentCount;

		const restored = computePaletteColors(dadsTokens);
		const keyColorsInput = document.getElementById(
			"keyColors",
		) as HTMLInputElement | null;
		if (keyColorsInput) keyColorsInput.value = restored.primaryHex;

		updateCVDScoreDisplay();
		void renderStudioView(container, callbacks);
	};

	const generateBtn = document.createElement("button");
	generateBtn.type = "button";
	generateBtn.className = "studio-generate-btn dads-button";
	generateBtn.dataset.size = "sm";
	generateBtn.dataset.type = "solid-fill";
	generateBtn.innerHTML = `生成<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-left: 2px;"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
	generateBtn.onclick = async () => {
		try {
			pushUndoSnapshot();
			state.studioSeed = Date.now();
			await generateNewStudioPalette(dadsTokens);
			await renderStudioView(container, callbacks);
		} catch (error) {
			console.error("Failed to generate palette:", error);
		}
	};

	// Share button (moved from header to toolbar)
	const shareBtn = document.createElement("button");
	shareBtn.type = "button";
	shareBtn.className = "studio-share-btn dads-button";
	shareBtn.dataset.size = "sm";
	shareBtn.dataset.type = "text";
	shareBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>共有リンク`;
	shareBtn.classList.add("studio-toolbar__share-btn");
	shareBtn.onclick = async () => {
		if (state.palettes.length === 0) return;

		const url = buildShareUrl(dadsTokens);
		const originalHTML = shareBtn.innerHTML;
		const ok = await copyTextToClipboard(url);
		setTemporaryButtonText(shareBtn, ok ? "コピー完了" : "コピー失敗", {
			resetHTML: originalHTML,
		});
	};

	// UX最適化されたボタン配置:
	// [swatches] | [戻る | 生成] [設定] | [共有リンク]
	controls.appendChild(undoBtn);
	controls.appendChild(generateBtn);
	controls.appendChild(settingsDetails);
	controls.appendChild(shareBtn);

	toolbar.appendChild(swatches);
	toolbar.appendChild(controls);
	container.appendChild(toolbar);
	container.appendChild(toast);

	// Set up header copy link button handler
	const headerCopyLinkBtn = document.getElementById(
		"copy-link-btn",
	) as HTMLButtonElement | null;
	if (headerCopyLinkBtn) {
		headerCopyLinkBtn.onclick = async () => {
			if (state.palettes.length === 0) return;

			const url = buildShareUrl(dadsTokens);
			const originalText = headerCopyLinkBtn.textContent ?? "リンクをコピー";
			const ok = await copyTextToClipboard(url);
			setTemporaryButtonText(
				headerCopyLinkBtn,
				ok ? "コピー完了" : "コピー失敗",
				{
					resetText: originalText,
				},
			);
		};
	}

	if (state.palettes.length === 0 || dadsTokens.length === 0) {
		renderEmptyState(container);
		return;
	}

	const paletteColors = computePaletteColors(dadsTokens);
	const bgHex = state.lightBackgroundColor || "#ffffff";

	const desiredAccentCount = Math.max(2, Math.min(4, state.studioAccentCount));
	const accentHexes = paletteColors.accentHexes.slice(0, desiredAccentCount);
	const resolvedAccentHexes =
		accentHexes.length > 0 ? accentHexes : [paletteColors.accentHex];

	// Close any open popover when clicking outside
	let activePopover: HTMLElement | null = null;
	const closeActivePopover = () => {
		if (activePopover) {
			activePopover.dataset.open = "false";
			activePopover.remove();
			activePopover = null;
		}
	};

	// Remove previous handler to prevent memory leak from accumulating listeners
	if (popoverClickHandler) {
		document.removeEventListener("click", popoverClickHandler);
	}

	popoverClickHandler = (e: MouseEvent) => {
		if (activePopover) {
			const target = e.target as Node;
			// Check if click is inside the popover or any swatch
			const isInsidePopover = activePopover.contains(target);
			const isInsideSwatch = (target as Element).closest?.(
				".studio-toolbar-swatch",
			);
			if (!isInsidePopover && !isInsideSwatch) {
				closeActivePopover();
			}
		}
	};

	document.addEventListener("click", popoverClickHandler);

	const createColorPickerRow = (
		label: string,
		hex: string,
		circle: HTMLSpanElement,
		onColorChange: (newHex: string) => void,
	): HTMLElement => {
		const colorRow = document.createElement("div");
		colorRow.className = "studio-swatch-popover__color-row";

		const colorPicker = document.createElement("input");
		colorPicker.type = "color";
		colorPicker.value = hex;
		colorPicker.className = "studio-swatch-popover__color-picker";
		colorPicker.setAttribute("aria-label", `${label}の色を選択`);
		colorPicker.onclick = (e) => e.stopPropagation();

		const hexInput = document.createElement("input");
		hexInput.type = "text";
		hexInput.className = "studio-swatch-popover__hex-input";
		hexInput.value = hex.toUpperCase();
		hexInput.setAttribute("aria-label", `${label}のカラーコード`);
		hexInput.onclick = (e) => e.stopPropagation();

		colorPicker.oninput = (e) => {
			e.stopPropagation();
			const newHex = colorPicker.value;
			circle.style.backgroundColor = getDisplayHex(newHex);
			hexInput.value = newHex.toUpperCase();
			hexInput.classList.remove("studio-swatch-popover__hex-input--invalid");
			onColorChange(newHex);
		};

		hexInput.oninput = (e) => {
			e.stopPropagation();
			const input = hexInput.value.trim();
			const result = validateBackgroundColor(input);
			if (result.valid && result.hex) {
				circle.style.backgroundColor = getDisplayHex(result.hex);
				colorPicker.value = result.hex;
				hexInput.classList.remove("studio-swatch-popover__hex-input--invalid");
				onColorChange(result.hex);
			} else {
				hexInput.classList.add("studio-swatch-popover__hex-input--invalid");
			}
		};

		hexInput.onblur = () => {
			const input = hexInput.value.trim();
			const result = validateBackgroundColor(input);
			if (result.valid && result.hex) {
				hexInput.value = result.hex.toUpperCase();
				hexInput.classList.remove("studio-swatch-popover__hex-input--invalid");
			}
		};

		colorRow.appendChild(colorPicker);
		colorRow.appendChild(hexInput);
		return colorRow;
	};

	const createLockToggleRow = (
		lockType: "background" | "text" | "primary" | "accent",
		isLocked: boolean,
		wrapper: HTMLElement,
	): HTMLElement => {
		const lockRow = document.createElement("div");
		lockRow.className = "studio-swatch-popover__lock";

		const lockLabel = document.createElement("span");
		lockLabel.className = "studio-swatch-popover__lock-label";
		lockLabel.innerHTML = `<span>🔒</span><span>ロック</span>`;

		const toggle = document.createElement("button");
		toggle.type = "button";
		toggle.className = "studio-swatch-popover__toggle";
		toggle.dataset.checked = String(isLocked);
		toggle.setAttribute("aria-pressed", String(isLocked));
		toggle.setAttribute("aria-label", "ロック切り替え");
		toggle.onclick = (e) => {
			e.stopPropagation();
			const newLocked = toggle.dataset.checked !== "true";
			setLockedColors({ [lockType]: newLocked });
			toggle.dataset.checked = String(newLocked);
			toggle.setAttribute("aria-pressed", String(newLocked));
			const existingIndicator = wrapper.querySelector(
				".studio-toolbar-swatch__lock-indicator",
			);
			if (newLocked && !existingIndicator) {
				const lockIndicator = document.createElement("span");
				lockIndicator.className = "studio-toolbar-swatch__lock-indicator";
				lockIndicator.textContent = "🔒";
				wrapper.appendChild(lockIndicator);
			} else if (!newLocked && existingIndicator) {
				existingIndicator.remove();
			}
		};

		lockRow.appendChild(lockLabel);
		lockRow.appendChild(toggle);
		return lockRow;
	};

	const createToolbarSwatchWithPopover = (
		label: string,
		hex: string,
		lockType: "background" | "text" | "primary" | "accent" | null,
		onDelete?: () => void,
		onColorChange?: (newHex: string) => void,
	): HTMLElement => {
		const wrapper = document.createElement("div");
		wrapper.className = "studio-toolbar-swatch";
		wrapper.style.position = "relative";
		wrapper.setAttribute("role", "button");
		wrapper.setAttribute("tabindex", "0");
		wrapper.setAttribute("aria-label", `${label}: ${hex.toUpperCase()}`);

		const circle = document.createElement("span");
		circle.className = "studio-toolbar-swatch__circle";
		circle.style.backgroundColor = getDisplayHex(hex);
		wrapper.appendChild(circle);

		// Delete button for accent colors (not primary)
		if (onDelete) {
			const deleteBtn = document.createElement("button");
			deleteBtn.type = "button";
			deleteBtn.className = "studio-toolbar-swatch__delete";
			deleteBtn.setAttribute("aria-label", `${label}を削除`);
			deleteBtn.onclick = (e) => {
				e.stopPropagation();
				closeActivePopover();
				onDelete();
			};
			wrapper.appendChild(deleteBtn);
		}

		// Lock indicator
		const isLocked = getLockStateForType(lockType);
		if (isLocked) {
			const lockIndicator = document.createElement("span");
			lockIndicator.className = "studio-toolbar-swatch__lock-indicator";
			lockIndicator.textContent = "🔒";
			wrapper.appendChild(lockIndicator);
		}

		// Popover
		const popover = document.createElement("div");
		popover.className = "studio-swatch-popover";
		popover.dataset.open = "false";

		// Color role label
		const roleLabel = document.createElement("div");
		roleLabel.className = "studio-swatch-popover__role";
		roleLabel.textContent = label;
		popover.appendChild(roleLabel);

		// Color picker row (for background, text, primary)
		if (onColorChange) {
			popover.appendChild(
				createColorPickerRow(label, hex, circle, onColorChange),
			);
		}

		// Hex code button (copy to clipboard)
		const hexBtn = document.createElement("button");
		hexBtn.type = "button";
		hexBtn.className = "studio-swatch-popover__hex";
		hexBtn.innerHTML = `
			<span>コピー</span>
			<svg class="studio-swatch-popover__hex-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
				<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
			</svg>
		`;
		hexBtn.onclick = async (e) => {
			e.stopPropagation();
			const currentHex = onColorChange ? circle.style.backgroundColor : hex;
			const hexToCopy = currentHex.startsWith("#")
				? currentHex.toUpperCase()
				: hex.toUpperCase();
			const ok = await copyTextToClipboard(hexToCopy);
			const originalHtml = hexBtn.innerHTML;
			hexBtn.innerHTML = `<span>${ok ? "コピー完了" : "失敗"}</span>`;
			setTimeout(() => {
				hexBtn.innerHTML = originalHtml;
			}, 1500);
		};
		popover.appendChild(hexBtn);

		// Lock toggle (for background, text, primary, accent)
		if (lockType) {
			popover.appendChild(createLockToggleRow(lockType, isLocked, wrapper));
		}

		// Popover is appended to body to avoid transform issues
		// (toolbar has transform which creates new containing block for fixed elements)

		// Click to toggle popover
		wrapper.onclick = (e) => {
			e.stopPropagation();
			if (activePopover && activePopover !== popover) {
				closeActivePopover();
			}
			const isOpen = popover.dataset.open === "true";
			if (!isOpen) {
				// Append to body to escape toolbar's transform context
				document.body.appendChild(popover);
				// Position the popover above the swatch using fixed positioning
				// CSS transform: translateX(-50%) handles horizontal centering
				const rect = wrapper.getBoundingClientRect();
				popover.style.left = `${rect.left + rect.width / 2}px`;
				popover.style.bottom = `${window.innerHeight - rect.top + 8}px`;
				popover.dataset.open = "true";
				activePopover = popover;
			} else {
				popover.dataset.open = "false";
				popover.remove();
				activePopover = null;
			}
		};

		// Keyboard support
		wrapper.onkeydown = (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				wrapper.click();
			} else if (e.key === "Escape") {
				closeActivePopover();
			}
		};

		return wrapper;
	};

	swatches.innerHTML = "";

	// Background color swatch (before Primary)
	const handleBackgroundColorChange = (newHex: string) => {
		if (!/^#[0-9A-Fa-f]{6}$/i.test(newHex)) return;
		state.lightBackgroundColor = newHex;
		// Update preview
		void renderStudioView(container, callbacks);
	};
	swatches.appendChild(
		createToolbarSwatchWithPopover(
			"背景色",
			state.lightBackgroundColor || "#ffffff",
			"background",
			undefined,
			handleBackgroundColorChange,
		),
	);

	// Text color swatch (before Primary)
	const handleTextColorChange = (newHex: string) => {
		if (!/^#[0-9A-Fa-f]{6}$/i.test(newHex)) return;
		state.darkBackgroundColor = newHex;
		// Update preview
		void renderStudioView(container, callbacks);
	};
	const textSwatch = createToolbarSwatchWithPopover(
		"テキスト色",
		state.darkBackgroundColor || "#000000",
		"text",
		undefined,
		handleTextColorChange,
	);
	textSwatch.classList.add("studio-toolbar-swatch--zone-end");
	swatches.appendChild(textSwatch);

	// Primary color swatch (with color picker)
	const handlePrimaryColorChange = async (newHex: string) => {
		if (!/^#[0-9A-Fa-f]{6}$/i.test(newHex)) return;
		const baseChromaName = inferBaseChromaNameFromHex(newHex);
		const dadsInfo =
			dadsTokens.length > 0 ? findDadsColorByHex(dadsTokens, newHex) : null;
		const primaryStep = dadsInfo?.scale;
		await rebuildStudioPalettes({
			dadsTokens,
			primaryHex: newHex,
			primaryStep,
			primaryBaseChromaName: baseChromaName,
			accentCandidates: paletteColors.accentHexes.map((hex) => {
				const info = findDadsColorByHex(dadsTokens, hex);
				return { hex, step: info?.scale };
			}),
		});
		void renderStudioView(container, callbacks);
	};
	const primarySwatch = createToolbarSwatchWithPopover(
		"キーカラー",
		paletteColors.primaryHex,
		"primary",
		undefined,
		handlePrimaryColorChange,
	);
	primarySwatch.classList.add("studio-toolbar-swatch--zone-end");
	swatches.appendChild(primarySwatch);

	// Helper to decrease accent count (for delete button)
	const handleDeleteAccent = async () => {
		if (state.studioAccentCount <= 2) return;
		pushUndoSnapshot();
		state.studioAccentCount = Math.max(2, state.studioAccentCount - 1) as
			| 2
			| 3
			| 4;
		await renderStudioView(container, callbacks);
	};

	for (let i = 0; i < resolvedAccentHexes.length; i++) {
		const hex = resolvedAccentHexes[i];
		if (!hex) continue;
		// Only first accent can be locked (same as before)
		const lockType = i === 0 ? "accent" : null;
		// Delete button only on the LAST accent, and only if count > 2 (minimum required)
		const isLastAccent = i === resolvedAccentHexes.length - 1;
		const canDelete = isLastAccent && state.studioAccentCount > 2;
		swatches.appendChild(
			createToolbarSwatchWithPopover(
				`Accent ${i + 1}`,
				hex,
				lockType as "accent" | null,
				canDelete ? handleDeleteAccent : undefined,
			),
		);
	}

	// Add placeholder swatches for empty accent slots (max 4 accents)
	// When clicking any placeholder, fill ALL placeholders up to and including that one
	const maxAccents = 4;
	const placeholderCount = maxAccents - resolvedAccentHexes.length;
	const placeholders: HTMLDivElement[] = [];

	// Helper to add multiple accents at once
	const handleAddMultipleAccents = async (countToAdd: number) => {
		if (state.studioAccentCount >= 4) return;
		const actualCountToAdd = Math.min(countToAdd, 4 - state.studioAccentCount);
		if (actualCountToAdd <= 0) return;

		const oldAccentCount = state.studioAccentCount;
		pushUndoSnapshot();

		const newCount = Math.min(4, state.studioAccentCount + actualCountToAdd) as
			| 2
			| 3
			| 4;
		state.studioAccentCount = newCount;

		// Generate new accent colors
		const current = computePaletteColors(dadsTokens);
		const backgroundHex = state.lightBackgroundColor || "#ffffff";
		const existing = current.accentHexes.slice(0, oldAccentCount);

		const seed = (state.studioSeed || 0) ^ newCount ^ Date.now();
		const rnd = createSeededRandom(seed);
		// Request more candidates to ensure enough unique colors after filtering
		const picked = await selectRandomAccentCandidates(
			current.primaryHex,
			state.activePreset,
			backgroundHex,
			newCount + existing.length + 10,
			rnd,
		);

		const keepSet = new Set(existing.map((h) => h.toLowerCase()));
		const newAccents = picked
			.filter((p) => !keepSet.has(p.hex.toLowerCase()))
			.slice(0, actualCountToAdd);

		const accentCandidates = [
			...existing.map((hex) => {
				const dadsInfo = findDadsColorByHex(dadsTokens, hex);
				return { hex, step: dadsInfo?.scale };
			}),
			...newAccents,
		].slice(0, newCount);

		await rebuildStudioPalettes({
			dadsTokens,
			primaryHex: current.primaryHex,
			primaryStep: current.primaryStep,
			primaryBaseChromaName: inferBaseChromaNameFromHex(current.primaryHex),
			accentCandidates,
		});

		await renderStudioView(container, callbacks);
	};

	for (let i = 0; i < placeholderCount; i++) {
		const placeholder = document.createElement("div");
		placeholder.className =
			"studio-toolbar-swatch studio-toolbar-swatch--placeholder";
		placeholder.setAttribute("role", "button");
		placeholder.setAttribute("tabindex", "0");
		placeholder.setAttribute(
			"aria-label",
			`${i + 1}個のアクセントカラーを追加`,
		);
		placeholder.dataset.placeholderIndex = String(i);

		// Hover: highlight all placeholders up to and including this one
		placeholder.onmouseenter = () => {
			for (let j = 0; j <= i; j++) {
				placeholders[j]?.classList.add("studio-toolbar-swatch--will-fill");
			}
		};
		placeholder.onmouseleave = () => {
			for (const ph of placeholders) {
				ph.classList.remove("studio-toolbar-swatch--will-fill");
			}
		};

		// Click: add colors for all placeholders up to and including this one
		placeholder.onclick = () => handleAddMultipleAccents(i + 1);
		placeholder.onkeydown = (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleAddMultipleAccents(i + 1);
			}
		};

		placeholders.push(placeholder);
		swatches.appendChild(placeholder);
	}

	// Add spacer between swatches and controls (one swatch width)
	const swatchSpacer = document.createElement("div");
	swatchSpacer.className = "studio-toolbar__swatch-spacer";
	swatchSpacer.setAttribute("aria-hidden", "true");
	swatches.appendChild(swatchSpacer);

	const previewSection = document.createElement("section");
	previewSection.className = "studio-preview";

	const previewColors = buildPreviewColors(paletteColors, bgHex);
	const preview = createPalettePreview(previewColors, {
		getDisplayHex,
		kv: state.previewKv,
		accentHexes: resolvedAccentHexes,
	});
	previewSection.appendChild(preview);
	container.appendChild(previewSection);

	const a11y = document.createElement("section");
	a11y.className = "studio-a11y";

	const accentNamedColors = resolvedAccentHexes.map((hex, index) => ({
		name: `Accent ${index + 1}`,
		color: new Color(hex),
	}));
	const namedColors = [
		{ name: "Primary", color: new Color(paletteColors.primaryHex) },
		...accentNamedColors,
		{ name: "Success", color: new Color(paletteColors.semantic.success) },
		{ name: "Warning", color: new Color(paletteColors.semantic.warning) },
		{ name: "Error", color: new Color(paletteColors.semantic.error) },
	];
	const cvdPairs = detectCvdConfusionPairs(namedColors);

	const failCount = [
		paletteColors.primaryHex,
		...resolvedAccentHexes,
		paletteColors.semantic.success,
		paletteColors.semantic.warning,
		paletteColors.semantic.error,
	].filter((hex) => gradeContrast(wcagContrast(bgHex, hex)) === "Fail").length;

	a11y.innerHTML = `
		<div class="studio-a11y__title">アクセシビリティ（要約）</div>
		<ul class="studio-a11y__list">
			<li>背景に対してFailの色: <strong>${failCount}</strong></li>
			<li>CVD混同リスク（${namedColors.length}色のペア）: <strong>${cvdPairs.length}</strong></li>
		</ul>
		<button type="button" class="studio-a11y__open dads-button" data-size="sm">詳細（アクセシビリティ）</button>
	`;

	const openA11yBtn =
		a11y.querySelector<HTMLButtonElement>(".studio-a11y__open");
	if (openA11yBtn) {
		openA11yBtn.onclick = () => {
			const btn = document.getElementById(
				"view-accessibility",
			) as HTMLButtonElement | null;
			btn?.click();
		};
	}

	container.appendChild(a11y);
}

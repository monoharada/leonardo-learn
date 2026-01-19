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
import { getDisplayHex } from "../cvd-controls";
import { createDerivedPalettes } from "../palette-generator";
import { parseKeyColor, state } from "../state";
import type {
	ColorDetailModalOptions,
	LockedColorsState,
	PaletteConfig,
	StudioPresetType,
} from "../types";
import { stripStepSuffix } from "../types";
import {
	resolveAccentSourcePalette,
	resolveWarningPattern,
} from "../utils/palette-utils";
import {
	createPalettePreview,
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

function pickRandom<T>(items: T[]): T | null {
	if (items.length === 0) return null;
	const index = Math.floor(Math.random() * items.length);
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
		.slice()
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

function createContrastBadge(ratio: number): HTMLElement {
	const grade = gradeContrast(ratio);
	const el = document.createElement("span");
	el.className = `studio-contrast-badge studio-contrast-badge--${grade
		.toLowerCase()
		.replace(/\s+/g, "-")}`;
	el.textContent = grade;
	el.title = `WCAG contrast: ${ratio.toFixed(2)}:1`;
	return el;
}

function createLockButton(
	locked: boolean,
	onToggle: () => void,
): HTMLButtonElement {
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "studio-lock-btn";
	btn.setAttribute("aria-pressed", String(locked));
	btn.title = locked ? "ロック解除" : "ロック";
	btn.textContent = locked ? "🔒" : "🔓";
	btn.onclick = onToggle;
	return btn;
}

function createSwatchButton(
	label: string,
	displayHex: string,
	onClick: () => void,
): HTMLButtonElement {
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "studio-swatch";
	btn.setAttribute("aria-label", `${label} を表示`);
	btn.onclick = onClick;

	const circle = document.createElement("span");
	circle.className = "studio-swatch__circle";
	circle.style.backgroundColor = displayHex;

	const text = document.createElement("span");
	text.className = "studio-swatch__label";
	text.textContent = label;

	btn.appendChild(circle);
	btn.appendChild(text);
	return btn;
}

let dadsTokensPromise: Promise<DadsToken[]> | null = null;
async function getDadsTokens(): Promise<DadsToken[]> {
	if (!dadsTokensPromise) {
		dadsTokensPromise = loadDadsTokens();
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
		// Studioの背景は白固定
		backgroundColor: "#FFFFFF",
	});
}

async function selectRandomPrimaryFromDads(
	dadsTokens: DadsToken[],
	preset: StudioPresetType,
	backgroundHex: string,
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

	const selected = pickRandom(finalList) ?? pickRandom(chromatic);
	if (!selected) {
		return { hex: "#00A3BF", baseChromaName: "Blue" };
	}

	const step = selected.classification.scale;
	const baseChromaName =
		(selected.classification.hue
			? inferBaseChromaNameFromHex(selected.hex)
			: inferBaseChromaNameFromHex(selected.hex)) || "Blue";

	return { hex: selected.hex, step, baseChromaName };
}

function setLockedColors(patch: Partial<LockedColorsState>): void {
	state.lockedColors = { ...state.lockedColors, ...patch };
}

function pickUniqueBy<T>(
	items: T[],
	count: number,
	getKey: (item: T) => string,
): T[] {
	const pool = items.slice();
	const selected: T[] = [];
	const seen = new Set<string>();

	while (pool.length > 0 && selected.length < count) {
		const pick = pickRandom(pool);
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
}

async function generateNewStudioPalette(
	dadsTokens: DadsToken[],
): Promise<void> {
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
		);
		primaryHex = selected.hex;
		primaryStep = selected.step;
		primaryBaseChromaName = selected.baseChromaName;
	}

	const targetAccentCount = Math.max(1, Math.min(3, state.accentCount));
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
		<p>「Generate」でDADSトークンから配色を作成できます。</p>
	`;
	container.appendChild(empty);
}

export async function renderStudioView(
	container: HTMLElement,
	callbacks: StudioViewCallbacks,
): Promise<void> {
	container.className = "dads-section dads-studio";
	container.innerHTML = "";
	container.style.backgroundColor = "#ffffff";

	let dadsTokens: DadsToken[];
	try {
		dadsTokens = await getDadsTokens();
	} catch (error) {
		console.error("Failed to load DADS tokens for studio view:", error);
		dadsTokens = [];
	}

	const toolbar = document.createElement("section");
	toolbar.className = "studio-toolbar";

	const swatches = document.createElement("div");
	swatches.className = "studio-toolbar__swatches";

	const controls = document.createElement("div");
	controls.className = "studio-toolbar__controls";

	const presetSelect = document.createElement("select");
	presetSelect.className = "studio-preset-select";
	presetSelect.setAttribute("aria-label", "プリセット");
	presetSelect.innerHTML = `
		<option value="default">Default</option>
		<option value="high-contrast">High Contrast</option>
		<option value="pastel">Pastel</option>
		<option value="vibrant">Vibrant</option>
		<option value="dark">Dark</option>
	`;
	presetSelect.value = state.activePreset;
	presetSelect.onchange = () => {
		state.activePreset = presetSelect.value as StudioPresetType;
		void renderStudioView(container, callbacks);
	};

	const accentCountLabel = document.createElement("span");
	accentCountLabel.className = "dads-label";
	accentCountLabel.textContent = "アクセント数";

	const accentCountButtons = document.createElement("div");
	accentCountButtons.className = "dads-button-group";
	accentCountButtons.setAttribute("aria-label", "アクセント数");

	([1, 2, 3] as const).forEach((count) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "dads-button";
		btn.dataset.size = "sm";
		btn.dataset.type = "text";
		btn.dataset.active = String(state.accentCount === count);
		btn.textContent = String(count);
		btn.onclick = async () => {
			state.accentCount = count;
			try {
				// 既存Primaryを維持しつつ、アクセントだけ再生成（必要な場合のみ）
				if (state.palettes.length > 0) {
					const current = computePaletteColors(dadsTokens);
					const backgroundHex = "#ffffff";
					const existing = current.accentHexes;
					const desired = Math.max(1, Math.min(3, state.accentCount));

					const keep = existing.slice(0, desired);
					const missing = desired - keep.length;

					let extra: Array<{
						hex: string;
						step?: number;
						baseChromaName?: string;
					}> = [];
					if (missing > 0) {
						const picked = await selectRandomAccentCandidates(
							current.primaryHex,
							state.activePreset,
							backgroundHex,
							desired,
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

	const kvShuffleBtn = document.createElement("button");
	kvShuffleBtn.type = "button";
	kvShuffleBtn.className = "dads-button";
	kvShuffleBtn.dataset.size = "sm";
	kvShuffleBtn.dataset.type = "outline";
	kvShuffleBtn.textContent = "Shuffle";
	kvShuffleBtn.title = "キービジュアル（装飾）を別パターンにします";
	kvShuffleBtn.onclick = () => {
		state.previewKv = { locked: true, seed: Date.now() };
		void renderStudioView(container, callbacks);
	};

	const kvLockBtn = document.createElement("button");
	kvLockBtn.type = "button";
	kvLockBtn.className = "dads-button";
	kvLockBtn.dataset.size = "sm";
	kvLockBtn.dataset.type = "text";
	kvLockBtn.setAttribute("aria-pressed", String(state.previewKv.locked));
	kvLockBtn.textContent = state.previewKv.locked ? "KV固定" : "KV自動";
	kvLockBtn.title = state.previewKv.locked
		? "固定を解除（配色に応じて自動で変化）"
		: "固定（配色変更でもKVを維持）";
	kvLockBtn.onclick = () => {
		state.previewKv = { ...state.previewKv, locked: !state.previewKv.locked };
		void renderStudioView(container, callbacks);
	};

	const generateBtn = document.createElement("button");
	generateBtn.type = "button";
	generateBtn.className = "studio-generate-btn dads-button";
	generateBtn.dataset.size = "sm";
	generateBtn.textContent = "Generate";
	generateBtn.onclick = async () => {
		try {
			await generateNewStudioPalette(dadsTokens);
			await renderStudioView(container, callbacks);
		} catch (error) {
			console.error("Failed to generate palette:", error);
		}
	};

	const exportBtn = document.createElement("button");
	exportBtn.type = "button";
	exportBtn.className = "studio-export-btn dads-button";
	exportBtn.dataset.size = "sm";
	exportBtn.textContent = "エクスポート";
	exportBtn.onclick = () => {
		(
			document.getElementById("export-btn") as HTMLButtonElement | null
		)?.click();
	};

	controls.appendChild(presetSelect);
	controls.appendChild(accentCountLabel);
	controls.appendChild(accentCountButtons);
	controls.appendChild(kvShuffleBtn);
	controls.appendChild(kvLockBtn);
	controls.appendChild(generateBtn);
	controls.appendChild(exportBtn);

	toolbar.appendChild(swatches);
	toolbar.appendChild(controls);
	container.appendChild(toolbar);

	if (state.palettes.length === 0 || dadsTokens.length === 0) {
		renderEmptyState(container);
		return;
	}

	const paletteColors = computePaletteColors(dadsTokens);
	const bgHex = "#ffffff";

	const renderSwatchRow = (
		label: string,
		hex: string,
		options: { allowCustom?: boolean; lockId?: keyof LockedColorsState },
	): void => {
		const row = document.createElement("div");
		row.className = "studio-swatch-row";

		const ratio = wcagContrast(bgHex, hex);
		const swatch = createSwatchButton(label, getDisplayHex(hex), () => {
			// Primaryのみカスタムを許可。その他はread-onlyとして扱う（DADS外へ出さない）。
			if (options.allowCustom) {
				// 既存モーダルの利用は将来拡張（現状は入力で調整）
				const editor = container.querySelector<HTMLInputElement>(
					`input[data-studio-primary-input="1"]`,
				);
				editor?.focus();
				return;
			}

			// 非Primaryは現状read-only表示のみ（将来的にDADSトークン選択UIへ拡張）
			const stepColor = new Color(hex);
			callbacks.onColorClick({
				stepColor,
				keyColor: stepColor,
				index: 0,
				fixedScale: { colors: [stepColor], keyIndex: 0, hexValues: [hex] },
				paletteInfo: { name: label },
				readOnly: true,
				originalHex: hex,
			});
		});

		const badge = createContrastBadge(ratio);

		row.appendChild(swatch);
		if (options.lockId) {
			const lockId = options.lockId;
			const lockBtn = createLockButton(state.lockedColors[lockId], () => {
				setLockedColors({
					[lockId]: !state.lockedColors[lockId],
				} as Partial<LockedColorsState>);
				void renderStudioView(container, callbacks);
			});
			row.appendChild(lockBtn);
		}
		row.appendChild(badge);
		swatches.appendChild(row);
	};

	swatches.innerHTML = "";
	renderSwatchRow("Primary", paletteColors.primaryHex, {
		allowCustom: true,
		lockId: "primary",
	});

	const accentHexes = paletteColors.accentHexes.slice(
		0,
		Math.max(1, Math.min(3, state.accentCount)),
	);
	if (accentHexes.length > 0) {
		for (let i = 0; i < accentHexes.length; i++) {
			const hex = accentHexes[i];
			if (!hex) continue;
			renderSwatchRow(`Accent ${i + 1}`, hex, {
				lockId: i === 0 ? "accent" : undefined,
			});
		}
	} else {
		renderSwatchRow("Accent", paletteColors.accentHex, { lockId: "accent" });
	}

	// セマンティック（固定のためロックは表示しない）
	renderSwatchRow("Success", paletteColors.semantic.success, {});
	renderSwatchRow("Warning", paletteColors.semantic.warning, {});
	renderSwatchRow("Error", paletteColors.semantic.error, {});

	const primaryEditor = document.createElement("section");
	primaryEditor.className = "studio-primary-editor";
	primaryEditor.innerHTML = `
		<div class="studio-primary-editor__title">キーカラー（Primary）</div>
	`;

	const primaryInput = document.createElement("input");
	primaryInput.className =
		"studio-primary-editor__input dads-input dads-input--bg-color";
	primaryInput.setAttribute("data-studio-primary-input", "1");
	primaryInput.value = paletteColors.primaryHex;
	primaryInput.inputMode = "text";
	primaryInput.placeholder = "#RRGGBB";

	const primaryColorPicker = document.createElement("input");
	primaryColorPicker.type = "color";
	primaryColorPicker.className = "studio-primary-editor__picker";
	primaryColorPicker.value = paletteColors.primaryHex;

	const applyPrimary = async (hex: string): Promise<void> => {
		if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
		const baseChromaName = inferBaseChromaNameFromHex(hex);
		const dadsInfo =
			dadsTokens.length > 0 ? findDadsColorByHex(dadsTokens, hex) : null;
		const primaryStep = dadsInfo?.scale;

		const desired = Math.max(1, Math.min(3, state.accentCount));
		const currentAccentHexes = getAccentHexes(state.palettes);
		const baseAccentHexes =
			currentAccentHexes.length > 0
				? currentAccentHexes.slice(0, desired)
				: [paletteColors.accentHex];
		const accentCandidates = baseAccentHexes
			.map((accentHex) => {
				const info = findDadsColorByHex(dadsTokens, accentHex);
				return { hex: accentHex, step: info?.scale };
			})
			.slice(0, desired);

		await rebuildStudioPalettes({
			dadsTokens,
			primaryHex: hex,
			primaryStep,
			primaryBaseChromaName: baseChromaName,
			accentCandidates,
		});

		await renderStudioView(container, callbacks);
	};

	primaryInput.onchange = () => void applyPrimary(primaryInput.value.trim());
	primaryColorPicker.oninput = () =>
		void applyPrimary(primaryColorPicker.value);

	primaryEditor.appendChild(primaryInput);
	primaryEditor.appendChild(primaryColorPicker);
	container.appendChild(primaryEditor);

	const previewSection = document.createElement("section");
	previewSection.className = "studio-preview";

	const previewColors = buildPreviewColors(paletteColors);
	const preview = createPalettePreview(previewColors, {
		getDisplayHex,
		kv: state.previewKv,
		accentHexes,
	});
	previewSection.appendChild(preview);
	container.appendChild(previewSection);

	const a11y = document.createElement("section");
	a11y.className = "studio-a11y";

	const accentNamedColors = accentHexes.map((hex, index) => ({
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
		...accentHexes,
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

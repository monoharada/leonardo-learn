import { wcagContrast } from "culori";
import { Color } from "@/core/color";
import { findDadsColorByHex } from "@/core/tokens/dads-data-provider";
import type { DadsToken } from "@/core/tokens/types";
import { detectCvdConfusionPairs } from "@/ui/accessibility/cvd-detection";
import { getDisplayHex } from "../cvd-controls";
import { state } from "../state";
import { formatCvdConfusionThreshold } from "../utils/cvd-confusion-threshold";
import {
	buildPreviewColors,
	computePaletteColors,
	DEFAULT_STUDIO_BACKGROUND,
	getDadsInfoWithChromaName,
	gradeContrast,
	type StudioPaletteColors,
} from "./studio-view.core";
import {
	rebuildStudioPalettes,
	selectRandomAccentCandidates,
} from "./studio-view.generation";
import { pushUndoSnapshot } from "./studio-view.render-utils";
import { studioViewDeps } from "./studio-view-deps";

export function appendAccentPlaceholders(options: {
	swatches: HTMLElement;
	resolvedAccentHexes: string[];
	dadsTokens: DadsToken[];
	rerender: () => Promise<void>;
}): void {
	const { swatches, resolvedAccentHexes, dadsTokens, rerender } = options;

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
		const current = computePaletteColors(dadsTokens, state.activePreset);
		const backgroundHex =
			state.lightBackgroundColor || DEFAULT_STUDIO_BACKGROUND;
		const existing = current.accentHexes.slice(0, oldAccentCount);

		const seed = (state.studioSeed || 0) ^ newCount ^ Date.now();
		const rnd = studioViewDeps.createSeededRandom(seed);
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

		const { baseChromaName: primaryBaseChromaName } = getDadsInfoWithChromaName(
			dadsTokens,
			current.primaryHex,
		);
		await rebuildStudioPalettes({
			dadsTokens,
			primaryHex: current.primaryHex,
			primaryStep: current.primaryStep,
			primaryBaseChromaName,
			accentCandidates,
		});

		await rerender();
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
}

export function appendPreviewAndA11ySummary(options: {
	container: HTMLElement;
	paletteColors: StudioPaletteColors;
	resolvedAccentHexes: string[];
	bgHex: string;
	keySurfaceHex: string;
}): void {
	const {
		container,
		paletteColors,
		resolvedAccentHexes,
		bgHex,
		keySurfaceHex,
	} = options;

	const previewSection = document.createElement("section");
	previewSection.className = "studio-preview";

	const previewColors = buildPreviewColors(
		paletteColors,
		bgHex,
		state.activePreset,
	);
	const preview = studioViewDeps.createPalettePreview(previewColors, {
		getDisplayHex,
		kv: state.previewKv,
		accentHexes: resolvedAccentHexes,
		tertiaryHex: paletteColors.tertiaryHex,
		keySurfaceHex,
		theme: state.studioTheme,
		preset: state.activePreset,
	});
	previewSection.appendChild(preview);
	container.appendChild(previewSection);

	const a11y = document.createElement("section");
	a11y.className = "studio-a11y";

	const a11yItems = [
		{ name: "Primary", hex: paletteColors.primaryHex },
		...resolvedAccentHexes.map((hex, index) => ({
			name: `Accent ${index + 1}`,
			hex,
		})),
		{ name: "Success", hex: paletteColors.semantic.success },
		{ name: "Warning", hex: paletteColors.semantic.warning },
		{ name: "Error", hex: paletteColors.semantic.error },
	];

	const namedColors = a11yItems.map(({ name, hex }) => ({
		name,
		color: new Color(hex),
	}));
	const thresholdLabel = formatCvdConfusionThreshold(
		state.cvdConfusionThreshold,
	);
	const cvdPairs = detectCvdConfusionPairs(namedColors, {
		threshold: state.cvdConfusionThreshold,
	});

	const failCount = a11yItems.filter(
		({ hex }) => gradeContrast(wcagContrast(bgHex, hex)) === "Fail",
	).length;

	a11y.innerHTML = `
		<h2 class="studio-a11y__title">アクセシビリティ（要約）</h2>
		<ul class="studio-a11y__list">
			<li>背景に対してFailの色: <strong>${failCount}</strong></li>
			<li>CVD混同リスク（ΔE&lt;${thresholdLabel}）: <strong>${cvdPairs.length}</strong></li>
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

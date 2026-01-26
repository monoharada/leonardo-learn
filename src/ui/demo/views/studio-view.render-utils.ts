import type { DadsToken } from "@/core/tokens/types";
import { state } from "../state";
import { createStudioUrlHash } from "../studio-url-state";
import type {
	LockedColorsState,
	PaletteConfig,
	PreviewKvState,
	StudioPresetType,
} from "../types";
import { computePaletteColors } from "./studio-view.core";

export function renderEmptyState(container: HTMLElement): void {
	const empty = document.createElement("div");
	empty.className = "dads-empty-state";
	empty.innerHTML = `
		<p>スタジオが生成されていません</p>
		<p>「配色シャッフル」でDADSトークンから配色を作成できます。</p>
	`;
	container.appendChild(empty);
}

export type StudioUndoSnapshot = {
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

// Check structuredClone availability once at module load time
const hasStructuredClone = typeof globalThis.structuredClone === "function";

export function cloneValue<T>(value: T): T {
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

export function pushUndoSnapshot(): void {
	studioUndoHistory.push(createUndoSnapshot());
	// Limit history size to prevent unbounded memory growth
	if (studioUndoHistory.length > MAX_UNDO_HISTORY_SIZE) {
		studioUndoHistory.shift();
	}
}

export function hasUndoSnapshot(): boolean {
	return studioUndoHistory.length > 0;
}

export function popUndoSnapshot(): StudioUndoSnapshot | null {
	return studioUndoHistory.pop() ?? null;
}

export function buildShareUrl(dadsTokens: DadsToken[]): string {
	const colors = computePaletteColors(dadsTokens, state.activePreset);
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
		theme: state.studioTheme,
	};

	const url = new URL(window.location.href);
	url.hash = createStudioUrlHash(shareState);
	return url.toString();
}

export function getLockStateForType(
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

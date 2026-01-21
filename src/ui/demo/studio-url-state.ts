/**
 * Studio URL state (hash) utilities
 *
 * Format: #studio=<base64url(json)>
 *
 * - Must be resilient: invalid/unknown payloads return null (no throw)
 * - Encodes concrete color values (Primary + up to 3 Accent hexes)
 *
 * @module @/ui/demo/studio-url-state
 */

import type { PreviewKvState, StudioPresetType, StudioTheme } from "./types";
import {
	fromBase64Url,
	isHex6,
	isRecord,
	toBase64Url,
	toLowerHex,
} from "./url-state-utils";

/** Common fields shared by all StudioUrlState versions */
interface StudioUrlStateBase {
	primary: string;
	accents: string[];
	preset: StudioPresetType;
	locks: { primary: boolean; accent: boolean };
	kv: PreviewKvState;
	studioSeed: number;
	theme?: StudioTheme;
}

export interface StudioUrlStateV1 extends StudioUrlStateBase {
	v: 1;
	accentCount: 1 | 2 | 3;
}

export interface StudioUrlStateV2 extends StudioUrlStateBase {
	v: 2;
	accentCount: 2 | 3 | 4;
}

export type StudioUrlState = StudioUrlStateV1 | StudioUrlStateV2;

const STUDIO_HASH_PREFIX = "#studio=" as const;

const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";

const isNumber = (v: unknown): v is number =>
	typeof v === "number" && Number.isFinite(v);

const STUDIO_PRESETS: ReadonlySet<StudioPresetType> = new Set([
	"default",
	"high-contrast",
	"pastel",
	"vibrant",
	"dark",
]);

const isStudioPreset = (v: unknown): v is StudioPresetType =>
	typeof v === "string" && STUDIO_PRESETS.has(v as StudioPresetType);

const STUDIO_THEMES: ReadonlySet<StudioTheme> = new Set([
	"pinpoint",
	"hero",
	"branding",
]);

const isStudioTheme = (v: unknown): v is StudioTheme =>
	typeof v === "string" && STUDIO_THEMES.has(v as StudioTheme);

export function createStudioUrlHash(state: StudioUrlState): string {
	return `${STUDIO_HASH_PREFIX}${encodeStudioUrlState(state)}`;
}

export function parseStudioUrlHash(hash: string): StudioUrlState | null {
	if (!hash.startsWith(STUDIO_HASH_PREFIX)) return null;
	const payload = hash.slice(STUDIO_HASH_PREFIX.length);
	return decodeStudioUrlState(payload);
}

export function encodeStudioUrlState(state: StudioUrlState): string {
	const json = JSON.stringify(state);
	return toBase64Url(json);
}

/** Validates and extracts common fields from parsed URL state */
function parseCommonFields(
	parsed: Record<string, unknown>,
): Omit<StudioUrlStateBase, "accentCount"> | null {
	const presetRaw = parsed.preset;
	if (!isStudioPreset(presetRaw)) return null;

	const locksRaw = parsed.locks;
	if (!isRecord(locksRaw)) return null;
	if (!isBoolean(locksRaw.primary) || !isBoolean(locksRaw.accent)) return null;

	const kvRaw = parsed.kv;
	if (!isRecord(kvRaw)) return null;
	if (!isBoolean(kvRaw.locked) || !isNumber(kvRaw.seed)) return null;

	const studioSeedRaw = parsed.studioSeed;
	if (!isNumber(studioSeedRaw)) return null;

	const primaryRaw = parsed.primary;
	if (!isHex6(primaryRaw)) return null;

	const accentsRaw = parsed.accents;
	if (!Array.isArray(accentsRaw)) return null;

	// テーマはオプショナル（後方互換性のため）、デフォルトは"hero"
	const themeRaw = parsed.theme;
	const theme: StudioTheme = isStudioTheme(themeRaw) ? themeRaw : "hero";

	return {
		primary: toLowerHex(primaryRaw),
		accents: accentsRaw.filter(isHex6).map(toLowerHex),
		preset: presetRaw,
		locks: { primary: locksRaw.primary, accent: locksRaw.accent },
		kv: { locked: kvRaw.locked, seed: kvRaw.seed },
		studioSeed: studioSeedRaw,
		theme,
	};
}

export function decodeStudioUrlState(payload: string): StudioUrlState | null {
	try {
		const json = fromBase64Url(payload);
		const parsed: unknown = JSON.parse(json);
		if (!isRecord(parsed)) return null;

		const v = parsed.v;
		if (v !== 1 && v !== 2) return null;

		const common = parseCommonFields(parsed);
		if (!common) return null;

		const accents = common.accents.slice(0, v === 2 ? 6 : 3);
		if (accents.length === 0) return null;
		// V2は2〜4色のアクセントをサポート（UIのstudioAccentCountは2|3|4型）
		if (v === 2 && accents.length < 2) return null;

		const accentCountRaw = parsed.accentCount;

		if (v === 1) {
			if (accentCountRaw !== 1 && accentCountRaw !== 2 && accentCountRaw !== 3)
				return null;
			const maxCount: 1 | 2 | 3 =
				accents.length >= 3 ? 3 : accents.length === 2 ? 2 : 1;
			const safeCount: 1 | 2 | 3 =
				accentCountRaw > maxCount ? maxCount : accentCountRaw;
			return { v: 1, ...common, accents, accentCount: safeCount };
		}

		if (accentCountRaw !== 2 && accentCountRaw !== 3 && accentCountRaw !== 4)
			return null;
		const maxCount: 2 | 3 | 4 =
			accents.length >= 4 ? 4 : accents.length === 3 ? 3 : 2;
		const safeCount: 2 | 3 | 4 =
			accentCountRaw > maxCount ? maxCount : accentCountRaw;
		return { v: 2, ...common, accents, accentCount: safeCount };
	} catch {
		return null;
	}
}

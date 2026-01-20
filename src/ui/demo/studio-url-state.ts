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

import type { PreviewKvState, StudioPresetType } from "./types";

export type StudioUrlStateVersion = 1 | 2;

export interface StudioUrlStateV1 {
	v: 1;
	primary: string;
	accents: string[];
	accentCount: 1 | 2 | 3;
	preset: StudioPresetType;
	locks: { primary: boolean; accent: boolean };
	kv: PreviewKvState;
	studioSeed: number;
}

export interface StudioUrlStateV2 {
	v: 2;
	primary: string;
	accents: string[];
	accentCount: 3 | 4 | 5 | 6;
	preset: StudioPresetType;
	locks: { primary: boolean; accent: boolean };
	kv: PreviewKvState;
	studioSeed: number;
}

export type StudioUrlState = StudioUrlStateV1 | StudioUrlStateV2;

const STUDIO_HASH_PREFIX = "#studio=" as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isBoolean(value: unknown): value is boolean {
	return typeof value === "boolean";
}

function isNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function isHex6(value: unknown): value is string {
	return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

const STUDIO_PRESETS: ReadonlySet<StudioPresetType> = new Set([
	"default",
	"high-contrast",
	"pastel",
	"vibrant",
	"dark",
]);

function isStudioPreset(value: unknown): value is StudioPresetType {
	return (
		typeof value === "string" && STUDIO_PRESETS.has(value as StudioPresetType)
	);
}

function toLowerHex(value: string): string {
	return value.trim().toLowerCase();
}

function base64Encode(value: string): string {
	if (typeof globalThis.btoa === "function") {
		return globalThis.btoa(value);
	}
	// Bun/Node fallback (not used in browser builds)
	const buf = (globalThis as any).Buffer?.from?.(value, "utf8");
	if (!buf) throw new Error("No base64 encoder available");
	return buf.toString("base64");
}

function base64Decode(value: string): string {
	if (typeof globalThis.atob === "function") {
		return globalThis.atob(value);
	}
	// Bun/Node fallback (not used in browser builds)
	const buf = (globalThis as any).Buffer?.from?.(value, "base64");
	if (!buf) throw new Error("No base64 decoder available");
	return buf.toString("utf8");
}

function toBase64Url(value: string): string {
	const base64 = base64Encode(value);
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(base64url: string): string {
	const normalized = base64url.replace(/-/g, "+").replace(/_/g, "/");
	const padLen = (4 - (normalized.length % 4)) % 4;
	const padded = normalized + "=".repeat(padLen);
	return base64Decode(padded);
}

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

export function decodeStudioUrlState(payload: string): StudioUrlState | null {
	try {
		const json = fromBase64Url(payload);
		const parsed: unknown = JSON.parse(json);
		if (!isRecord(parsed)) return null;

		const v = parsed.v;
		if (v !== 1 && v !== 2) return null;

		const primaryRaw = parsed.primary;
		if (!isHex6(primaryRaw)) return null;
		const primary = toLowerHex(primaryRaw);

		const accentsRaw = parsed.accents;
		if (!Array.isArray(accentsRaw)) return null;
		const accents = accentsRaw
			.filter(isHex6)
			.map(toLowerHex)
			.slice(0, v === 2 ? 6 : 3);
		if (accents.length === 0) return null;
		if (v === 2 && accents.length < 3) return null;

		const accentCountRaw = parsed.accentCount;
		if (v === 1) {
			const accentCount =
				accentCountRaw === 1 || accentCountRaw === 2 || accentCountRaw === 3
					? accentCountRaw
					: null;
			if (!accentCount) return null;
			const maxAccentCount: 1 | 2 | 3 =
				accents.length >= 3 ? 3 : accents.length === 2 ? 2 : 1;
			const safeAccentCount: 1 | 2 | 3 =
				accentCount > maxAccentCount ? maxAccentCount : accentCount;

			const presetRaw = parsed.preset;
			if (!isStudioPreset(presetRaw)) return null;

			const locksRaw = parsed.locks;
			if (!isRecord(locksRaw)) return null;
			if (!isBoolean(locksRaw.primary) || !isBoolean(locksRaw.accent))
				return null;

			const kvRaw = parsed.kv;
			if (!isRecord(kvRaw)) return null;
			if (!isBoolean(kvRaw.locked) || !isNumber(kvRaw.seed)) return null;
			const kv: PreviewKvState = { locked: kvRaw.locked, seed: kvRaw.seed };

			const studioSeedRaw = parsed.studioSeed;
			if (!isNumber(studioSeedRaw)) return null;

			return {
				v: 1,
				primary,
				accents,
				accentCount: safeAccentCount,
				preset: presetRaw,
				locks: { primary: locksRaw.primary, accent: locksRaw.accent },
				kv,
				studioSeed: studioSeedRaw,
			};
		}

		const accentCount =
			accentCountRaw === 3 ||
			accentCountRaw === 4 ||
			accentCountRaw === 5 ||
			accentCountRaw === 6
				? accentCountRaw
				: null;
		if (!accentCount) return null;
		const maxAccentCount: 3 | 4 | 5 | 6 =
			accents.length >= 6
				? 6
				: accents.length === 5
					? 5
					: accents.length === 4
						? 4
						: 3;
		const safeAccentCount: 3 | 4 | 5 | 6 =
			accentCount > maxAccentCount ? maxAccentCount : accentCount;

		const presetRaw = parsed.preset;
		if (!isStudioPreset(presetRaw)) return null;

		const locksRaw = parsed.locks;
		if (!isRecord(locksRaw)) return null;
		if (!isBoolean(locksRaw.primary) || !isBoolean(locksRaw.accent))
			return null;

		const kvRaw = parsed.kv;
		if (!isRecord(kvRaw)) return null;
		if (!isBoolean(kvRaw.locked) || !isNumber(kvRaw.seed)) return null;
		const kv: PreviewKvState = { locked: kvRaw.locked, seed: kvRaw.seed };

		const studioSeedRaw = parsed.studioSeed;
		if (!isNumber(studioSeedRaw)) return null;

		return {
			v: 2,
			primary,
			accents,
			accentCount: safeAccentCount,
			preset: presetRaw,
			locks: { primary: locksRaw.primary, accent: locksRaw.accent },
			kv,
			studioSeed: studioSeedRaw,
		};
	} catch {
		return null;
	}
}

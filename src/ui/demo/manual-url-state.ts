/**
 * Manual View URL state (hash) utilities
 *
 * Format: #manual=<base64url(json)>
 *
 * - Must be resilient: invalid/unknown payloads return null (no throw)
 * - Encodes Manual View color selection state
 *
 * @module @/ui/demo/manual-url-state
 */

import type { ManualColorSelection } from "./types";
import {
	fromBase64Url,
	isHex6,
	isRecord,
	toBase64Url,
	toLowerHex,
} from "./url-state-utils";

/** URL state version for Manual View */
export interface ManualUrlState {
	v: 1;
	/** Background color (HEX) */
	bg: string;
	/** Text color (HEX) */
	text: string;
	/** Key color (HEX or null) */
	key: string | null;
	/** Secondary color (HEX or null) */
	secondary: string | null;
	/** Tertiary color (HEX or null) */
	tertiary: string | null;
	/** Accent colors array (HEX or null, max 4) */
	accents: (string | null)[];
}

const MANUAL_HASH_PREFIX = "#manual=" as const;

const isHex6OrNull = (v: unknown): v is string | null =>
	v === null || isHex6(v);

const toLowerHexOrNull = (value: string | null): string | null =>
	value === null ? null : toLowerHex(value);

/**
 * Convert ManualColorSelection to ManualUrlState
 */
export function toManualUrlState(
	selection: ManualColorSelection,
): ManualUrlState {
	return {
		v: 1,
		bg: selection.backgroundColor,
		text: selection.textColor,
		key: selection.keyColor,
		secondary: selection.secondaryColor,
		tertiary: selection.tertiaryColor,
		accents: selection.accentColors.slice(0, 4),
	};
}

/**
 * Convert ManualUrlState back to ManualColorSelection
 */
export function fromManualUrlState(
	state: ManualUrlState,
): ManualColorSelection {
	// Ensure accents array has exactly 4 elements
	const accents: (string | null)[] = [null, null, null, null];
	for (let i = 0; i < Math.min(state.accents.length, 4); i++) {
		accents[i] = state.accents[i] ?? null;
	}

	return {
		backgroundColor: state.bg,
		textColor: state.text,
		keyColor: state.key,
		secondaryColor: state.secondary,
		tertiaryColor: state.tertiary,
		accentColors: accents,
	};
}

/**
 * Create URL hash string from ManualUrlState
 */
export function createManualUrlHash(state: ManualUrlState): string {
	return `${MANUAL_HASH_PREFIX}${encodeManualUrlState(state)}`;
}

/**
 * Parse URL hash and return ManualUrlState if valid
 */
export function parseManualUrlHash(hash: string): ManualUrlState | null {
	if (!hash.startsWith(MANUAL_HASH_PREFIX)) return null;
	const payload = hash.slice(MANUAL_HASH_PREFIX.length);
	return decodeManualUrlState(payload);
}

/**
 * Encode ManualUrlState to base64url string
 */
export function encodeManualUrlState(state: ManualUrlState): string {
	const json = JSON.stringify(state);
	return toBase64Url(json);
}

/**
 * Decode base64url string to ManualUrlState
 */
export function decodeManualUrlState(payload: string): ManualUrlState | null {
	try {
		const json = fromBase64Url(payload);
		const parsed: unknown = JSON.parse(json);
		if (!isRecord(parsed)) return null;

		// Version check
		const v = parsed.v;
		if (v !== 1) return null;

		// Validate required HEX fields
		const bgRaw = parsed.bg;
		if (!isHex6(bgRaw)) return null;

		const textRaw = parsed.text;
		if (!isHex6(textRaw)) return null;

		// Validate optional HEX fields (can be null)
		const keyRaw = parsed.key;
		if (!isHex6OrNull(keyRaw)) return null;

		const secondaryRaw = parsed.secondary;
		if (!isHex6OrNull(secondaryRaw)) return null;

		const tertiaryRaw = parsed.tertiary;
		if (!isHex6OrNull(tertiaryRaw)) return null;

		// Validate accents array
		const accentsRaw = parsed.accents;
		if (!Array.isArray(accentsRaw)) return null;

		// Filter and validate accent colors
		const validAccents: (string | null)[] = [];
		for (let i = 0; i < Math.min(accentsRaw.length, 4); i++) {
			const accent = accentsRaw[i];
			if (isHex6OrNull(accent)) {
				validAccents.push(accent === null ? null : toLowerHex(accent));
			} else {
				validAccents.push(null); // Invalid values become null
			}
		}

		// Pad to 4 elements if needed
		while (validAccents.length < 4) {
			validAccents.push(null);
		}

		return {
			v: 1,
			bg: toLowerHex(bgRaw),
			text: toLowerHex(textRaw),
			key: toLowerHexOrNull(keyRaw),
			secondary: toLowerHexOrNull(secondaryRaw),
			tertiary: toLowerHexOrNull(tertiaryRaw),
			accents: validAccents,
		};
	} catch {
		return null;
	}
}

/**
 * Build full share URL for Manual View from current selection
 */
export function buildManualShareUrl(
	selection: ManualColorSelection,
	baseUrl?: string,
): string {
	const state = toManualUrlState(selection);
	const hash = createManualUrlHash(state);
	const base = baseUrl ?? window.location.origin + window.location.pathname;
	return base + hash;
}

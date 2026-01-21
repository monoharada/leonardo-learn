/**
 * Shared URL state utilities for base64url encoding/decoding
 *
 * Used by both manual-url-state.ts and studio-url-state.ts
 *
 * @module @/ui/demo/url-state-utils
 */

/** Node.js/Bun Buffer type for base64 encoding/decoding fallback */
interface NodeBuffer {
	from(value: string, encoding: string): { toString(encoding: string): string };
}

function base64Encode(value: string): string {
	if (typeof globalThis.btoa === "function") {
		return globalThis.btoa(value);
	}
	// Bun/Node fallback (not used in browser builds)
	const Buffer = (globalThis as { Buffer?: NodeBuffer }).Buffer;
	if (!Buffer) throw new Error("No base64 encoder available");
	return Buffer.from(value, "utf8").toString("base64");
}

function base64Decode(value: string): string {
	if (typeof globalThis.atob === "function") {
		return globalThis.atob(value);
	}
	// Bun/Node fallback (not used in browser builds)
	const Buffer = (globalThis as { Buffer?: NodeBuffer }).Buffer;
	if (!Buffer) throw new Error("No base64 decoder available");
	return Buffer.from(value, "base64").toString("utf8");
}

/**
 * Encode string to base64url (URL-safe base64)
 */
export function toBase64Url(value: string): string {
	const base64 = base64Encode(value);
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Decode base64url string back to original string
 */
export function fromBase64Url(base64url: string): string {
	const normalized = base64url.replace(/-/g, "+").replace(/_/g, "/");
	const padLen = (4 - (normalized.length % 4)) % 4;
	const padded = normalized + "=".repeat(padLen);
	return base64Decode(padded);
}

/**
 * Check if value is a plain object (Record)
 */
export function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null;
}

/**
 * HEX color pattern for #RRGGBB format
 */
export const HEX6_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * Check if value is a valid 6-digit HEX color
 */
export function isHex6(v: unknown): v is string {
	return typeof v === "string" && HEX6_PATTERN.test(v.trim());
}

/**
 * Normalize HEX color to lowercase
 */
export function toLowerHex(value: string): string {
	return value.trim().toLowerCase();
}

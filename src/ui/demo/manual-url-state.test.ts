/**
 * Manual URL state utilities tests
 *
 * @module @/ui/demo/manual-url-state.test
 */

import { describe, expect, it } from "bun:test";
import {
	buildManualShareUrl,
	createManualUrlHash,
	decodeManualUrlState,
	encodeManualUrlState,
	fromManualUrlState,
	parseManualUrlHash,
	toManualUrlState,
} from "./manual-url-state";
import type { ManualColorSelection } from "./types";

describe("manual-url-state", () => {
	const fullSelection: ManualColorSelection = {
		backgroundColor: "#ffffff",
		textColor: "#333333",
		keyColor: "#ff5454",
		secondaryColor: "#d2a400",
		tertiaryColor: "#259d63",
		accentColors: ["#0091ff", "#9c27b0", null, null],
	};

	const minimalSelection: ManualColorSelection = {
		backgroundColor: "#f5f5f5",
		textColor: "#1a1a1a",
		keyColor: null,
		secondaryColor: null,
		tertiaryColor: null,
		accentColors: [null, null, null, null],
	};

	describe("toManualUrlState / fromManualUrlState", () => {
		it("should convert ManualColorSelection to ManualUrlState", () => {
			const state = toManualUrlState(fullSelection);

			expect(state.v).toBe(1);
			expect(state.bg).toBe("#ffffff");
			expect(state.text).toBe("#333333");
			expect(state.key).toBe("#ff5454");
			expect(state.secondary).toBe("#d2a400");
			expect(state.tertiary).toBe("#259d63");
			expect(state.accents).toHaveLength(4);
			expect(state.accents[0]).toBe("#0091ff");
			expect(state.accents[1]).toBe("#9c27b0");
			expect(state.accents[2]).toBeNull();
			expect(state.accents[3]).toBeNull();
		});

		it("should convert ManualUrlState back to ManualColorSelection", () => {
			const state = toManualUrlState(fullSelection);
			const selection = fromManualUrlState(state);

			expect(selection).toEqual(fullSelection);
		});

		it("should handle minimal selection with all nulls", () => {
			const state = toManualUrlState(minimalSelection);
			const selection = fromManualUrlState(state);

			expect(selection).toEqual(minimalSelection);
		});

		it("should pad accents array to 4 elements", () => {
			const state = {
				v: 1 as const,
				bg: "#ffffff",
				text: "#000000",
				key: null,
				secondary: null,
				tertiary: null,
				accents: ["#ff0000"], // Only 1 accent
			};

			const selection = fromManualUrlState(state);
			expect(selection.accentColors).toHaveLength(4);
			expect(selection.accentColors[0]).toBe("#ff0000");
			expect(selection.accentColors[1]).toBeNull();
			expect(selection.accentColors[2]).toBeNull();
			expect(selection.accentColors[3]).toBeNull();
		});
	});

	describe("encode / decode", () => {
		it("should roundtrip encode/decode full selection", () => {
			const state = toManualUrlState(fullSelection);
			const payload = encodeManualUrlState(state);
			const decoded = decodeManualUrlState(payload);

			expect(decoded).not.toBeNull();
			expect(decoded?.bg).toBe("#ffffff");
			expect(decoded?.text).toBe("#333333");
			expect(decoded?.key).toBe("#ff5454");
			expect(decoded?.secondary).toBe("#d2a400");
			expect(decoded?.tertiary).toBe("#259d63");
		});

		it("should roundtrip encode/decode minimal selection", () => {
			const state = toManualUrlState(minimalSelection);
			const payload = encodeManualUrlState(state);
			const decoded = decodeManualUrlState(payload);

			expect(decoded).not.toBeNull();
			expect(decoded?.key).toBeNull();
			expect(decoded?.secondary).toBeNull();
			expect(decoded?.tertiary).toBeNull();
		});

		it("should normalize hex colors to lowercase", () => {
			const state = {
				v: 1 as const,
				bg: "#FFFFFF",
				text: "#333333",
				key: "#FF5454",
				secondary: null,
				tertiary: null,
				accents: ["#0091FF", null, null, null],
			};

			const payload = encodeManualUrlState(state);
			const decoded = decodeManualUrlState(payload);

			expect(decoded?.bg).toBe("#ffffff");
			expect(decoded?.key).toBe("#ff5454");
			expect(decoded?.accents[0]).toBe("#0091ff");
		});

		it("should return null for invalid payload", () => {
			expect(decodeManualUrlState("not-base64")).toBeNull();
		});

		it("should return null for invalid version", () => {
			const invalidPayload = btoa(
				JSON.stringify({
					v: 2, // Invalid version
					bg: "#ffffff",
					text: "#000000",
					key: null,
					secondary: null,
					tertiary: null,
					accents: [],
				}),
			);

			expect(decodeManualUrlState(invalidPayload)).toBeNull();
		});

		it("should return null for missing required fields", () => {
			const missingBg = btoa(
				JSON.stringify({
					v: 1,
					text: "#000000",
					key: null,
					secondary: null,
					tertiary: null,
					accents: [],
				}),
			);

			expect(decodeManualUrlState(missingBg)).toBeNull();
		});

		it("should return null for invalid hex format", () => {
			const invalidHex = btoa(
				JSON.stringify({
					v: 1,
					bg: "not-a-hex",
					text: "#000000",
					key: null,
					secondary: null,
					tertiary: null,
					accents: [],
				}),
			);

			expect(decodeManualUrlState(invalidHex)).toBeNull();
		});

		it("should handle invalid accents gracefully (convert to null)", () => {
			const invalidAccents = btoa(
				JSON.stringify({
					v: 1,
					bg: "#ffffff",
					text: "#000000",
					key: null,
					secondary: null,
					tertiary: null,
					accents: ["#ff0000", "invalid", "#00ff00", 123],
				}),
			);

			const decoded = decodeManualUrlState(invalidAccents);
			expect(decoded).not.toBeNull();
			expect(decoded?.accents[0]).toBe("#ff0000");
			expect(decoded?.accents[1]).toBeNull(); // Invalid becomes null
			expect(decoded?.accents[2]).toBe("#00ff00");
			expect(decoded?.accents[3]).toBeNull(); // Invalid becomes null
		});
	});

	describe("createManualUrlHash / parseManualUrlHash", () => {
		it("should create and parse #manual hash", () => {
			const state = toManualUrlState(fullSelection);
			const hash = createManualUrlHash(state);

			expect(hash.startsWith("#manual=")).toBe(true);

			const parsed = parseManualUrlHash(hash);
			expect(parsed).not.toBeNull();
			expect(parsed?.bg).toBe("#ffffff");
			expect(parsed?.key).toBe("#ff5454");
		});

		it("should return null for non-manual hash", () => {
			expect(parseManualUrlHash("#studio=abc")).toBeNull();
			expect(parseManualUrlHash("#foo=bar")).toBeNull();
			expect(parseManualUrlHash("")).toBeNull();
		});
	});

	describe("buildManualShareUrl", () => {
		it("should build complete share URL", () => {
			const url = buildManualShareUrl(fullSelection, "https://example.com/app");

			expect(url.startsWith("https://example.com/app#manual=")).toBe(true);

			// Extract hash and parse
			const hash = url.slice(url.indexOf("#"));
			const parsed = parseManualUrlHash(hash);

			expect(parsed).not.toBeNull();
			expect(parsed?.bg).toBe("#ffffff");
			expect(parsed?.key).toBe("#ff5454");
		});

		it("should handle minimal selection", () => {
			const url = buildManualShareUrl(minimalSelection, "https://test.com/");

			const hash = url.slice(url.indexOf("#"));
			const parsed = parseManualUrlHash(hash);

			expect(parsed).not.toBeNull();
			expect(parsed?.key).toBeNull();
			expect(parsed?.accents.every((a) => a === null)).toBe(true);
		});
	});

	describe("full roundtrip", () => {
		it("should roundtrip full selection through URL hash", () => {
			const url = buildManualShareUrl(fullSelection, "https://example.com/");
			const hash = url.slice(url.indexOf("#"));
			const parsed = parseManualUrlHash(hash);

			expect(parsed).not.toBeNull();
			if (parsed) {
				const restored = fromManualUrlState(parsed);
				expect(restored).toEqual(fullSelection);
			}
		});

		it("should roundtrip minimal selection through URL hash", () => {
			const url = buildManualShareUrl(minimalSelection, "https://example.com/");
			const hash = url.slice(url.indexOf("#"));
			const parsed = parseManualUrlHash(hash);

			expect(parsed).not.toBeNull();
			if (parsed) {
				const restored = fromManualUrlState(parsed);
				expect(restored).toEqual(minimalSelection);
			}
		});
	});
});

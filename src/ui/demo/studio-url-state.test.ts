/**
 * Studio URL state utilities tests
 *
 * @module @/ui/demo/studio-url-state.test
 */

import { describe, expect, it } from "bun:test";
import {
	createStudioUrlHash,
	decodeStudioUrlState,
	encodeStudioUrlState,
	parseStudioUrlHash,
} from "./studio-url-state";

describe("studio-url-state", () => {
	it("should roundtrip encode/decode", () => {
		const input = {
			v: 1 as const,
			primary: "#3366cc",
			accents: ["#259063", "#ff2800", "#35a16b"],
			accentCount: 3 as const,
			preset: "vibrant" as const,
			locks: { primary: true, accent: false },
			kv: { locked: true, seed: 12345 },
			studioSeed: 67890,
		};

		const payload = encodeStudioUrlState(input);
		const decoded = decodeStudioUrlState(payload);

		expect(decoded).toEqual(input);
	});

	it("should parse #studio hash", () => {
		const input = {
			v: 1 as const,
			primary: "#00a3bf",
			accents: ["#259063"],
			accentCount: 1 as const,
			preset: "default" as const,
			locks: { primary: false, accent: true },
			kv: { locked: false, seed: 0 },
			studioSeed: 0,
		};

		const hash = createStudioUrlHash(input);
		const parsed = parseStudioUrlHash(hash);
		expect(parsed).toEqual(input);
	});

	it("should return null for non-studio hash", () => {
		expect(parseStudioUrlHash("#foo=bar")).toBeNull();
		expect(parseStudioUrlHash("")).toBeNull();
	});

	it("should clamp accentCount to valid accents length", () => {
		const payload = encodeStudioUrlState({
			v: 1 as const,
			primary: "#00a3bf",
			accents: ["#259063", "not-hex", "#12345g"],
			accentCount: 3 as const,
			preset: "default" as const,
			locks: { primary: false, accent: false },
			kv: { locked: false, seed: 0 },
			studioSeed: 0,
		});

		const decoded = decodeStudioUrlState(payload);
		expect(decoded).toEqual({
			v: 1,
			primary: "#00a3bf",
			accents: ["#259063"],
			accentCount: 1,
			preset: "default",
			locks: { primary: false, accent: false },
			kv: { locked: false, seed: 0 },
			studioSeed: 0,
		});
	});

	it("should return null for invalid payload", () => {
		expect(decodeStudioUrlState("not-base64")).toBeNull();
	});
});

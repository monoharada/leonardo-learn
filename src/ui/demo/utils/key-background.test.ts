import { describe, expect, it } from "bun:test";
import { wcagContrast } from "culori";
import type { DadsToken } from "@/core/tokens/types";
import { resolveKeyBackgroundColor } from "./key-background";

const createMockDadsToken = (
	hex: string,
	hue: string,
	scale: number,
): DadsToken => ({
	id: `dads-${hue}-${scale}`,
	hex,
	nameJa: `${hue} ${scale}`,
	nameEn: `${hue} ${scale}`,
	classification: {
		category: "chromatic",
		hue: hue as DadsToken["classification"]["hue"],
		scale: scale as DadsToken["classification"]["scale"],
	},
	source: "dads",
});

describe("resolveKeyBackgroundColor", () => {
	it("returns a computed key background when DADS tokens are not provided", () => {
		const result = resolveKeyBackgroundColor({
			primaryHex: "#0066cc",
			backgroundHex: "#ffffff",
			textHex: "#000000",
			preset: "default",
		});

		expect(result.tokenRef).toBeUndefined();
		expect(wcagContrast("#000000", result.hex)).toBeGreaterThanOrEqual(4.5);
	});

	it("prefers same-hue DADS tokens when available (light background)", () => {
		const dadsTokens: DadsToken[] = [
			createMockDadsToken("#e6f2ff", "blue", 50),
			createMockDadsToken("#cce5ff", "blue", 100),
			createMockDadsToken("#99ccff", "blue", 200),
			createMockDadsToken("#0066cc", "blue", 600),
			createMockDadsToken("#35a16b", "green", 600),
		];

		const result = resolveKeyBackgroundColor({
			primaryHex: "#0066cc",
			backgroundHex: "#ffffff",
			textHex: "#000000",
			preset: "default",
			dadsTokens,
		});

		expect(result.tokenRef?.hue).toBe("blue");
		expect([50, 100, 200, 600]).toContain(result.tokenRef?.step);
		expect(wcagContrast("#000000", result.hex)).toBeGreaterThanOrEqual(4.5);
	});

	it("uses primaryBaseChromaName as hue hint when primary is not an exact DADS token", () => {
		const dadsTokens: DadsToken[] = [
			createMockDadsToken("#e6f2ff", "blue", 50),
			createMockDadsToken("#cce5ff", "blue", 100),
			createMockDadsToken("#99ccff", "blue", 200),
		];

		const result = resolveKeyBackgroundColor({
			primaryHex: "#1234ff",
			backgroundHex: "#ffffff",
			textHex: "#000000",
			preset: "default",
			dadsTokens,
			primaryBaseChromaName: "Blue",
		});

		expect(result.tokenRef?.hue).toBe("blue");
		expect(wcagContrast("#000000", result.hex)).toBeGreaterThanOrEqual(4.5);
	});

	it("maintains text contrast on dark backgrounds (prefers same-hue DADS tokens)", () => {
		const dadsTokens: DadsToken[] = [
			createMockDadsToken("#003366", "blue", 900),
			createMockDadsToken("#004488", "blue", 800),
			createMockDadsToken("#0066cc", "blue", 600),
		];

		const result = resolveKeyBackgroundColor({
			primaryHex: "#0066cc",
			backgroundHex: "#111111",
			textHex: "#ffffff",
			preset: "default",
			dadsTokens,
		});

		expect(result.tokenRef?.hue).toBe("blue");
		expect(wcagContrast("#ffffff", result.hex)).toBeGreaterThanOrEqual(4.5);
	});
});

/**
 * HueNameNormalizer関数群のテスト
 *
 * Requirements: 1.2
 * - DADS_CHROMAS.displayNameからDadsColorHueへの正規化
 * - DADS_CHROMAS.name（chromaName）からDadsColorHueへの変換
 */

import { describe, expect, it } from "bun:test";
import { chromaNameToDadsHue, normalizeToDadsHue } from "./hue-name-normalizer";

describe("HueNameNormalizer", () => {
	describe("normalizeToDadsHue", () => {
		const displayNameCases: [string, string][] = [
			["Blue", "blue"],
			["Light Blue", "light-blue"],
			["Cyan", "cyan"],
			["Green", "green"],
			["Lime", "lime"],
			["Yellow", "yellow"],
			["Orange", "orange"],
			["Red", "red"],
			["Magenta", "magenta"],
			["Purple", "purple"],
		];

		it.each(
			displayNameCases,
		)("should convert '%s' to '%s'", (input, expected) => {
			expect(normalizeToDadsHue(input)).toBe(expected);
		});

		it("should return undefined for unknown display names", () => {
			expect(normalizeToDadsHue("Unknown")).toBeUndefined();
			expect(normalizeToDadsHue("")).toBeUndefined();
			expect(normalizeToDadsHue("pink")).toBeUndefined();
		});

		const validHues = [
			"blue",
			"light-blue",
			"cyan",
			"green",
			"lime",
			"yellow",
			"orange",
			"red",
			"magenta",
			"purple",
		];

		it.each(
			validHues,
		)("should accept DadsColorHue format '%s' and return as-is", (hue) => {
			expect(normalizeToDadsHue(hue)).toBe(hue);
		});
	});

	describe("chromaNameToDadsHue", () => {
		const chromaNameCases: [string, string][] = [
			["blue", "blue"],
			["cyan", "light-blue"], // DADS_CHROMAS: { name: "cyan", displayName: "Light Blue" }
			["teal", "cyan"], // DADS_CHROMAS: { name: "teal", displayName: "Cyan" }
			["green", "green"],
			["lime", "lime"],
			["yellow", "yellow"],
			["orange", "orange"],
			["red", "red"],
			["magenta", "magenta"],
			["purple", "purple"],
		];

		it.each(
			chromaNameCases,
		)("should convert '%s' chroma name to '%s' DadsColorHue", (input, expected) => {
			expect(chromaNameToDadsHue(input)).toBe(expected);
		});

		it("should return undefined for unknown chroma names", () => {
			expect(chromaNameToDadsHue("unknown")).toBeUndefined();
			expect(chromaNameToDadsHue("")).toBeUndefined();
			expect(chromaNameToDadsHue("indigo")).toBeUndefined();
		});
	});
});

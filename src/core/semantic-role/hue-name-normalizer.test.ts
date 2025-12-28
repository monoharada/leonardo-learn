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
		it("should convert 'Blue' to 'blue'", () => {
			expect(normalizeToDadsHue("Blue")).toBe("blue");
		});

		it("should convert 'Light Blue' to 'light-blue'", () => {
			expect(normalizeToDadsHue("Light Blue")).toBe("light-blue");
		});

		it("should convert 'Cyan' to 'cyan'", () => {
			expect(normalizeToDadsHue("Cyan")).toBe("cyan");
		});

		it("should convert 'Green' to 'green'", () => {
			expect(normalizeToDadsHue("Green")).toBe("green");
		});

		it("should convert 'Lime' to 'lime'", () => {
			expect(normalizeToDadsHue("Lime")).toBe("lime");
		});

		it("should convert 'Yellow' to 'yellow'", () => {
			expect(normalizeToDadsHue("Yellow")).toBe("yellow");
		});

		it("should convert 'Orange' to 'orange'", () => {
			expect(normalizeToDadsHue("Orange")).toBe("orange");
		});

		it("should convert 'Red' to 'red'", () => {
			expect(normalizeToDadsHue("Red")).toBe("red");
		});

		it("should convert 'Magenta' to 'magenta'", () => {
			expect(normalizeToDadsHue("Magenta")).toBe("magenta");
		});

		it("should convert 'Purple' to 'purple'", () => {
			expect(normalizeToDadsHue("Purple")).toBe("purple");
		});

		it("should return undefined for unknown display names", () => {
			expect(normalizeToDadsHue("Unknown")).toBeUndefined();
			expect(normalizeToDadsHue("")).toBeUndefined();
			expect(normalizeToDadsHue("pink")).toBeUndefined();
		});
	});

	describe("chromaNameToDadsHue", () => {
		it("should convert 'blue' chroma name to 'blue' DadsColorHue", () => {
			expect(chromaNameToDadsHue("blue")).toBe("blue");
		});

		it("should convert 'cyan' chroma name to 'light-blue' DadsColorHue", () => {
			// DADS_CHROMAS: { name: "cyan", displayName: "Light Blue" }
			expect(chromaNameToDadsHue("cyan")).toBe("light-blue");
		});

		it("should convert 'teal' chroma name to 'cyan' DadsColorHue", () => {
			// DADS_CHROMAS: { name: "teal", displayName: "Cyan" }
			expect(chromaNameToDadsHue("teal")).toBe("cyan");
		});

		it("should convert 'green' chroma name to 'green' DadsColorHue", () => {
			expect(chromaNameToDadsHue("green")).toBe("green");
		});

		it("should convert 'lime' chroma name to 'lime' DadsColorHue", () => {
			expect(chromaNameToDadsHue("lime")).toBe("lime");
		});

		it("should convert 'yellow' chroma name to 'yellow' DadsColorHue", () => {
			expect(chromaNameToDadsHue("yellow")).toBe("yellow");
		});

		it("should convert 'orange' chroma name to 'orange' DadsColorHue", () => {
			expect(chromaNameToDadsHue("orange")).toBe("orange");
		});

		it("should convert 'red' chroma name to 'red' DadsColorHue", () => {
			expect(chromaNameToDadsHue("red")).toBe("red");
		});

		it("should convert 'magenta' chroma name to 'magenta' DadsColorHue", () => {
			expect(chromaNameToDadsHue("magenta")).toBe("magenta");
		});

		it("should convert 'purple' chroma name to 'purple' DadsColorHue", () => {
			expect(chromaNameToDadsHue("purple")).toBe("purple");
		});

		it("should return undefined for unknown chroma names", () => {
			expect(chromaNameToDadsHue("unknown")).toBeUndefined();
			expect(chromaNameToDadsHue("")).toBeUndefined();
			expect(chromaNameToDadsHue("indigo")).toBeUndefined();
		});
	});
});

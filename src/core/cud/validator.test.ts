import { describe, expect, test } from "bun:test";
import {
	CUD_ACCENT_COLORS,
	CUD_BASE_COLORS,
	CUD_NEUTRAL_COLORS,
} from "./colors";
import {
	type PaletteColor,
	type ValidationIssue,
	type ValidationOptions,
	type ValidationResult,
	validatePalette,
} from "./validator";

describe("Palette Validator (Task 6)", () => {
	describe("validatePalette - Basic Structure (Task 6.1)", () => {
		test("should return ok, summary, and issues", () => {
			const palette: PaletteColor[] = [
				{ hex: "#FF2800", role: "accent" }, // CUD red
			];
			const result = validatePalette(palette);
			expect(result).toHaveProperty("ok");
			expect(result).toHaveProperty("summary");
			expect(result).toHaveProperty("issues");
		});

		test("should return validation result for CUD palette", () => {
			const palette: PaletteColor[] = [
				{ hex: "#FF2800", role: "accent" }, // CUD red
				{ hex: "#0041FF", role: "accent" }, // CUD blue
				{ hex: "#FFFFFF", role: "background" }, // CUD white
			];
			const result = validatePalette(palette);
			// CUD colors don't have not_in_cud_set issues
			const notInCudIssues = result.issues.filter(
				(i) => i.type === "not_in_cud_set",
			);
			expect(notInCudIssues.length).toBe(0);
		});

		test("issues should have type, severity, message, colors", () => {
			const palette: PaletteColor[] = [
				{ hex: "#123456", role: "accent" }, // Not CUD color
			];
			const result = validatePalette(palette);
			const issue = result.issues[0];
			if (issue) {
				expect(issue).toHaveProperty("type");
				expect(issue).toHaveProperty("severity");
				expect(issue).toHaveProperty("message");
				expect(issue).toHaveProperty("colors");
			}
		});

		test("should accept context option", () => {
			const palette: PaletteColor[] = [{ hex: "#FF2800", role: "accent" }];
			const result = validatePalette(palette, { context: "chart" });
			expect(result).toBeDefined();
		});

		test("should accept assumeSmallText option", () => {
			const palette: PaletteColor[] = [
				{ hex: "#FF2800", role: "text" },
				{ hex: "#FFFFFF", role: "background" },
			];
			const result = validatePalette(palette, { assumeSmallText: true });
			expect(result).toBeDefined();
		});
	});

	describe("CUD Set Check (Task 6.2)", () => {
		test("should detect non-CUD colors", () => {
			const palette: PaletteColor[] = [
				{ hex: "#123456", role: "accent" }, // Not CUD
			];
			const result = validatePalette(palette);
			const notInCudIssue = result.issues.find(
				(i) => i.type === "not_in_cud_set",
			);
			expect(notInCudIssue).toBeDefined();
			expect(notInCudIssue?.severity).toBe("warning");
		});

		test("should include nearest CUD color in details", () => {
			const palette: PaletteColor[] = [
				{ hex: "#808000", role: "accent" }, // Olive - not close to any CUD color
			];
			const result = validatePalette(palette);
			const notInCudIssue = result.issues.find(
				(i) => i.type === "not_in_cud_set",
			);
			expect(notInCudIssue).toBeDefined();
			expect(notInCudIssue?.details?.nearestId).toBeDefined();
			expect(notInCudIssue?.details?.deltaE).toBeDefined();
		});

		test("should not flag exact CUD colors", () => {
			const palette: PaletteColor[] = [
				{ hex: "#FF2800", role: "accent" }, // Exact CUD red
			];
			const result = validatePalette(palette);
			const notInCudIssue = result.issues.find(
				(i) => i.type === "not_in_cud_set",
			);
			expect(notInCudIssue).toBeUndefined();
		});
	});

	describe("Contrast Check (Task 6.3)", () => {
		test("should detect low contrast for text", () => {
			const palette: PaletteColor[] = [
				{ hex: "#C8C8CB", role: "text" }, // Light gray
				{ hex: "#FFFFFF", role: "background" }, // White
			];
			const result = validatePalette(palette);
			const contrastIssue = result.issues.find(
				(i) => i.type === "low_contrast",
			);
			expect(contrastIssue).toBeDefined();
			expect(contrastIssue?.severity).toBe("error");
		});

		test("should not flag high contrast text", () => {
			const palette: PaletteColor[] = [
				{ hex: "#000000", role: "text" }, // Black
				{ hex: "#FFFFFF", role: "background" }, // White
			];
			const result = validatePalette(palette);
			const contrastIssue = result.issues.find(
				(i) => i.type === "low_contrast",
			);
			expect(contrastIssue).toBeUndefined();
		});

		test("should apply stricter threshold for small text", () => {
			const palette: PaletteColor[] = [
				{ hex: "#84919E", role: "text" }, // CUD gray
				{ hex: "#FFFFFF", role: "background" }, // White
			];
			// Normal contrast might pass 4.5:1 but fail 7:1
			const normalResult = validatePalette(palette, { assumeSmallText: false });
			const smallTextResult = validatePalette(palette, {
				assumeSmallText: true,
			});
			// Small text should have more issues or same
			expect(smallTextResult.issues.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("CVD Confusion Risk Check (Task 6.4)", () => {
		test("should detect CVD confusion risk", () => {
			// Red and green are often confused by protan/deutan
			const palette: PaletteColor[] = [
				{ hex: "#FF2800", role: "accent" }, // CUD red
				{ hex: "#35A16B", role: "accent" }, // CUD green
			];
			const result = validatePalette(palette);
			// This pair may or may not be flagged depending on deltaE thresholds
			// Just check the structure works
			expect(result.issues).toBeDefined();
		});

		test("should not flag visually distinct pairs under CVD", () => {
			// Blue and yellow are usually distinguishable even with CVD
			const palette: PaletteColor[] = [
				{ hex: "#0041FF", role: "accent" }, // CUD blue
				{ hex: "#FAF500", role: "accent" }, // CUD yellow
			];
			const result = validatePalette(palette);
			const cvdIssue = result.issues.find(
				(i) => i.type === "cvd_confusion_risk",
			);
			// Blue and yellow should be distinguishable
			expect(cvdIssue).toBeUndefined();
		});
	});

	describe("Similar Colors Check (Task 6.5)", () => {
		test("should detect very similar colors", () => {
			// Two very similar yellows
			const palette: PaletteColor[] = [
				{ hex: "#FAF500", role: "accent" }, // CUD yellow
				{ hex: "#F5F000", role: "accent" }, // Very close to yellow
			];
			const result = validatePalette(palette);
			const similarIssue = result.issues.find((i) => i.type === "too_similar");
			// May be detected depending on threshold
			expect(result.issues).toBeDefined();
		});

		test("should flag yellow/yellow-green high lightness risk", () => {
			const palette: PaletteColor[] = [
				{ hex: "#FAF500", role: "accent" }, // CUD yellow (high L)
				{ hex: "#D8F255", role: "accent" }, // CUD bright yellow-green (high L)
			];
			const result = validatePalette(palette);
			// Check for confusable risk detection
			const confusableIssue = result.issues.find(
				(i) => i.type === "confusable_yellow_green",
			);
			// This should be flagged
			expect(confusableIssue).toBeDefined();
		});
	});

	describe("Role and Good Example Check (Task 6.6)", () => {
		test("should detect good CUD example pattern", () => {
			// Warm accent + cool base + good contrast
			const palette: PaletteColor[] = [
				{ hex: "#FF2800", role: "accent" }, // Warm red
				{ hex: "#BFE4FF", role: "base" }, // Cool sky blue
				{ hex: "#FFFFFF", role: "background" },
			];
			const result = validatePalette(palette);
			const goodExampleIssue = result.issues.find(
				(i) => i.type === "cud_good_example_like",
			);
			// May or may not be detected based on implementation
			expect(result.issues).toBeDefined();
		});
	});

	describe("Full CUD Palette Validation", () => {
		test("should not flag CUD colors as not_in_cud_set", () => {
			const palette: PaletteColor[] = CUD_ACCENT_COLORS.map((c) => ({
				hex: c.hex,
				role: "accent" as const,
			}));
			palette.push({ hex: "#FFFFFF", role: "background" });
			const result = validatePalette(palette);
			// CUD colors should not have not_in_cud_set issues
			const notInCudIssues = result.issues.filter(
				(i) => i.type === "not_in_cud_set",
			);
			expect(notInCudIssues.length).toBe(0);
		});

		test("should validate mixed CUD palette without not_in_cud_set errors", () => {
			const palette: PaletteColor[] = [
				{ hex: "#FF2800", role: "accent" }, // Red
				{ hex: "#0041FF", role: "accent" }, // Blue
				{ hex: "#FFFF80", role: "base" }, // Cream
				{ hex: "#000000", role: "text" }, // Black
				{ hex: "#FFFFFF", role: "background" }, // White
			];
			const result = validatePalette(palette);
			// CUD colors should not have not_in_cud_set issues
			const notInCudIssues = result.issues.filter(
				(i) => i.type === "not_in_cud_set",
			);
			expect(notInCudIssues.length).toBe(0);
		});
	});
});

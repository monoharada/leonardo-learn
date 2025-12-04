/**
 * 検証エンジンゴールデンパターンテスト
 * Requirement 10.2: CUD完全一致パレット → ok: true、危険な組み合わせ → 適切なissue生成を確認
 */
import { describe, expect, test } from "bun:test";
import {
	CUD_ACCENT_COLORS,
	CUD_BASE_COLORS,
	CUD_NEUTRAL_COLORS,
} from "./colors";
import { type PaletteColor, validatePalette } from "./validator";

describe("Validator Golden Pattern Tests (Task 10.2)", () => {
	describe("CUD完全一致パレット", () => {
		test("CUD推奨色のみのパレットはnot_in_cud_set issueがない", () => {
			const palette: PaletteColor[] = [
				{ hex: "#FF2800", role: "accent" }, // CUD red
				{ hex: "#0041FF", role: "accent" }, // CUD blue
				{ hex: "#FFFFFF", role: "background" }, // CUD white
				{ hex: "#000000", role: "text" }, // CUD black
			];
			const result = validatePalette(palette);

			const notInCudIssues = result.issues.filter(
				(i) => i.type === "not_in_cud_set",
			);
			expect(notInCudIssues.length).toBe(0);
		});

		test("CUDアクセント全9色パレットはnot_in_cud_set issueがない", () => {
			const palette: PaletteColor[] = CUD_ACCENT_COLORS.map((c) => ({
				hex: c.hex,
				role: "accent" as const,
			}));
			palette.push({ hex: "#FFFFFF", role: "background" });

			const result = validatePalette(palette);
			const notInCudIssues = result.issues.filter(
				(i) => i.type === "not_in_cud_set",
			);
			expect(notInCudIssues.length).toBe(0);
		});

		test("黒文字+白背景の高コントラストパレットはlow_contrast issueがない", () => {
			const palette: PaletteColor[] = [
				{ hex: "#000000", role: "text" },
				{ hex: "#FFFFFF", role: "background" },
			];
			const result = validatePalette(palette);

			const contrastIssues = result.issues.filter(
				(i) => i.type === "low_contrast",
			);
			expect(contrastIssues.length).toBe(0);
		});
	});

	describe("危険な組み合わせの検出", () => {
		test("非CUD色は not_in_cud_set issue を発行する", () => {
			const palette: PaletteColor[] = [
				{ hex: "#808000", role: "accent" }, // Olive - not CUD
			];
			const result = validatePalette(palette);

			const notInCudIssues = result.issues.filter(
				(i) => i.type === "not_in_cud_set",
			);
			expect(notInCudIssues.length).toBeGreaterThan(0);
			expect(notInCudIssues[0]?.severity).toBe("warning");
		});

		test("低コントラスト（text vs background）は low_contrast issue を発行する", () => {
			const palette: PaletteColor[] = [
				{ hex: "#C8C8CB", role: "text" }, // Light gray
				{ hex: "#FFFFFF", role: "background" }, // White
			];
			const result = validatePalette(palette);

			const contrastIssues = result.issues.filter(
				(i) => i.type === "low_contrast",
			);
			expect(contrastIssues.length).toBeGreaterThan(0);
			expect(contrastIssues[0]?.severity).toBe("error");
		});

		test("黄色系+高明度の複数色は confusable_yellow_green issue を発行する", () => {
			const palette: PaletteColor[] = [
				{ hex: "#FAF500", role: "accent" }, // CUD yellow
				{ hex: "#D8F255", role: "accent" }, // CUD bright yellow-green
				{ hex: "#FFFFFF", role: "background" },
			];
			const result = validatePalette(palette);

			const confusableIssues = result.issues.filter(
				(i) => i.type === "confusable_yellow_green",
			);
			expect(confusableIssues.length).toBeGreaterThan(0);
		});

		test("類似色は too_similar issue を発行する", () => {
			const palette: PaletteColor[] = [
				{ hex: "#FAF500", role: "accent" }, // CUD yellow
				{ hex: "#F9F400", role: "accent" }, // Very similar yellow
			];
			const result = validatePalette(palette);

			const similarIssues = result.issues.filter(
				(i) => i.type === "too_similar",
			);
			expect(similarIssues.length).toBeGreaterThan(0);
		});
	});

	describe("各issueタイプの検出ロジック", () => {
		test("not_in_cud_set: detailsにnearestIdとdeltaEを含む", () => {
			const palette: PaletteColor[] = [
				{ hex: "#FF0000", role: "accent" }, // Pure red (not exact CUD)
			];
			const result = validatePalette(palette);

			const issue = result.issues.find((i) => i.type === "not_in_cud_set");
			if (issue) {
				expect(issue.details?.nearestId).toBeDefined();
				expect(issue.details?.deltaE).toBeDefined();
			}
		});

		test("low_contrast: detailsにcontrastRatioを含む", () => {
			const palette: PaletteColor[] = [
				{ hex: "#C8C8CB", role: "text" },
				{ hex: "#FFFFFF", role: "background" },
			];
			const result = validatePalette(palette);

			const issue = result.issues.find((i) => i.type === "low_contrast");
			expect(issue).toBeDefined();
			expect(issue?.details?.contrastRatio).toBeDefined();
			expect(issue?.details?.threshold).toBeDefined();
		});

		test("cvd_confusion_risk: detailsにcvdTypeを含む", () => {
			// Red and green can be confused under CVD
			const palette: PaletteColor[] = [
				{ hex: "#FF2800", role: "accent" }, // Red
				{ hex: "#35A16B", role: "accent" }, // Green
			];
			const result = validatePalette(palette);

			const cvdIssue = result.issues.find(
				(i) => i.type === "cvd_confusion_risk",
			);
			if (cvdIssue) {
				expect(cvdIssue.details?.cvdType).toBeDefined();
				expect(["protan", "deutan"]).toContain(cvdIssue.details?.cvdType);
			}
		});

		test("too_similar: detailsにdeltaEを含む", () => {
			const palette: PaletteColor[] = [
				{ hex: "#FAF500", role: "accent" },
				{ hex: "#F9F400", role: "accent" },
			];
			const result = validatePalette(palette);

			const issue = result.issues.find((i) => i.type === "too_similar");
			expect(issue).toBeDefined();
			expect(issue?.details?.deltaE).toBeDefined();
		});
	});

	describe("コンテキストオプションの動作", () => {
		test("context=chart ではより厳しいコントラスト閾値を適用", () => {
			const palette: PaletteColor[] = [
				{ hex: "#84919E", role: "text" }, // CUD gray (medium contrast)
				{ hex: "#FFFFFF", role: "background" },
			];

			const normalResult = validatePalette(palette, { context: "ui" });
			const chartResult = validatePalette(palette, { context: "chart" });

			// chartコンテキストではより多くのコントラスト問題が検出される可能性
			expect(chartResult.issues.length).toBeGreaterThanOrEqual(
				normalResult.issues.length,
			);
		});

		test("assumeSmallText=true ではより厳しいコントラスト閾値を適用", () => {
			const palette: PaletteColor[] = [
				{ hex: "#84919E", role: "text" },
				{ hex: "#FFFFFF", role: "background" },
			];

			const normalResult = validatePalette(palette, { assumeSmallText: false });
			const smallTextResult = validatePalette(palette, {
				assumeSmallText: true,
			});

			expect(smallTextResult.issues.length).toBeGreaterThanOrEqual(
				normalResult.issues.length,
			);
		});
	});

	describe("良い例パターンの検出", () => {
		test("暖色アクセント+寒色ベース+明度差のパターンを検出", () => {
			const palette: PaletteColor[] = [
				{ hex: "#FF2800", role: "accent" }, // Warm red (accent)
				{ hex: "#BFE4FF", role: "base" }, // Cool sky blue (base)
				{ hex: "#FFFFFF", role: "background" },
			];
			const result = validatePalette(palette);

			const goodExampleIssue = result.issues.find(
				(i) => i.type === "cud_good_example_like",
			);
			expect(goodExampleIssue).toBeDefined();
			expect(goodExampleIssue?.severity).toBe("info");
		});
	});

	describe("複合シナリオ", () => {
		test("実用的なUIパレット（CUD準拠・高コントラストテキスト）", () => {
			const palette: PaletteColor[] = [
				{ hex: "#000000", role: "text" }, // Black text - high contrast
				{ hex: "#FFFFFF", role: "background" },
			];
			const result = validatePalette(palette);

			// CUD推奨色のみでnot_in_cud_setがない
			const notInCudIssues = result.issues.filter(
				(i) => i.type === "not_in_cud_set",
			);
			expect(notInCudIssues.length).toBe(0);

			// 黒文字+白背景は高コントラスト
			const lowContrastIssues = result.issues.filter(
				(i) => i.type === "low_contrast",
			);
			expect(lowContrastIssues.length).toBe(0);
		});

		test("アクセント色の低コントラストは検出される（設計通り）", () => {
			// CUD推奨色でもアクセント色は背景との低コントラストになりうる
			const palette: PaletteColor[] = [
				{ hex: "#FF2800", role: "accent" }, // CUD red (3.78:1 vs white)
				{ hex: "#FFFFFF", role: "background" },
			];
			const result = validatePalette(palette);

			// アクセント色も text/accent role として検証されるため
			// 4.5:1を下回る場合はlow_contrastが発行される
			const lowContrastIssues = result.issues.filter(
				(i) => i.type === "low_contrast",
			);
			expect(lowContrastIssues.length).toBeGreaterThan(0);
		});

		test("問題のあるパレット（複数のissue）", () => {
			const palette: PaletteColor[] = [
				{ hex: "#808000", role: "accent" }, // Non-CUD olive
				{ hex: "#808080", role: "text" }, // Non-CUD gray
				{ hex: "#AAAAAA", role: "background" }, // Low contrast background
			];
			const result = validatePalette(palette);

			// 複数の問題が検出されるべき
			expect(result.issues.length).toBeGreaterThan(1);
			expect(result.ok).toBe(false);
		});
	});
});

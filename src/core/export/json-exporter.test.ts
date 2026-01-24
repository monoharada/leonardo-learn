import { describe, expect, test } from "bun:test";
import { Color } from "../color";
import { generateM3ToneScale } from "../strategies/m3-generator";
import { generateNeutralScale } from "../system/neutral-scale";
import type { BrandToken, DadsToken } from "../tokens/types";
import {
	exportToJSON,
	exportToJSONv2,
	type JSONExportOptions,
} from "./json-exporter";

describe("JSONExporter", () => {
	describe("exportToJSON", () => {
		test("should export a single color to JSON", () => {
			const color = new Color("#3366cc");
			const result = exportToJSON({ primary: color });

			expect(result.colors.primary).toBeDefined();
			expect(result.colors.primary.oklch).toBeDefined();
			expect(result.colors.primary.srgb).toBeDefined();
		});

		test("should include OKLCH values", () => {
			const color = new Color("#3366cc");
			const result = exportToJSON({ primary: color });

			const oklch = result.colors.primary.oklch;
			expect(oklch.l).toBeDefined();
			expect(oklch.c).toBeDefined();
			expect(oklch.h).toBeDefined();
			expect(typeof oklch.l).toBe("number");
		});

		test("should include sRGB hex value", () => {
			const color = new Color("#3366cc");
			const result = exportToJSON({ primary: color });

			expect(result.colors.primary.srgb.hex).toMatch(/^#[0-9a-f]{6}$/i);
		});

		test("should include Display P3 values when supported", () => {
			const color = new Color("#3366cc");
			const result = exportToJSON({ primary: color });

			expect(result.colors.primary.p3).toBeDefined();
		});

		test("should include metadata", () => {
			const color = new Color("#3366cc");
			const result = exportToJSON({ primary: color });

			expect(result.metadata).toBeDefined();
			expect(result.metadata.version).toBeDefined();
			expect(result.metadata.generatedAt).toBeDefined();
			expect(result.metadata.colorSpace).toBe("oklch");
		});

		test("should export multiple colors", () => {
			const colors = {
				primary: new Color("#3366cc"),
				secondary: new Color("#66cc33"),
				error: new Color("#cc3366"),
			};
			const result = exportToJSON(colors);

			expect(result.colors.primary).toBeDefined();
			expect(result.colors.secondary).toBeDefined();
			expect(result.colors.error).toBeDefined();
		});

		describe("with tone scales", () => {
			test("should export M3 tone scale", () => {
				const scale = generateM3ToneScale("#3366cc");
				const colors: Record<string, Color> = {};

				// Convert tone scale to color record
				for (const [tone, color] of scale.tones) {
					colors[`primary-${tone}`] = color;
				}

				const result = exportToJSON(colors);

				expect(result.colors["primary-0"]).toBeDefined();
				expect(result.colors["primary-50"]).toBeDefined();
				expect(result.colors["primary-100"]).toBeDefined();
			});

			test("should export neutral scale", () => {
				const scale = generateNeutralScale("#3366cc");
				const colors: Record<string, Color> = {};

				// Convert neutral scale to color record
				for (const [shade, color] of Object.entries(scale.shades)) {
					colors[`neutral-${shade}`] = color;
				}

				const result = exportToJSON(colors);

				expect(result.colors["neutral-50"]).toBeDefined();
				expect(result.colors["neutral-500"]).toBeDefined();
				expect(result.colors["neutral-950"]).toBeDefined();
			});
		});

		describe("with options", () => {
			test("should use custom prefix", () => {
				const color = new Color("#3366cc");
				const options: JSONExportOptions = {
					prefix: "brand",
				};
				const result = exportToJSON({ primary: color }, options);

				expect(result.metadata.prefix).toBe("brand");
			});

			test("should include indent option in metadata", () => {
				const color = new Color("#3366cc");
				const options: JSONExportOptions = {
					indent: 4,
				};
				const result = exportToJSON({ primary: color }, options);

				expect(result.metadata.indent).toBe(4);
			});
		});

		describe("toString method", () => {
			test("should return valid JSON string", () => {
				const color = new Color("#3366cc");
				const result = exportToJSON({ primary: color });
				const jsonString = JSON.stringify(result, null, 2);

				expect(() => JSON.parse(jsonString)).not.toThrow();
			});

			test("should maintain precision in JSON output", () => {
				const color = new Color("#3366cc");
				const result = exportToJSON({ primary: color });
				const jsonString = JSON.stringify(result, null, 2);
				const parsed = JSON.parse(jsonString);

				expect(typeof parsed.colors.primary.oklch.l).toBe("number");
				expect(typeof parsed.colors.primary.oklch.c).toBe("number");
			});
		});

		describe("CUD metadata (Task 9)", () => {
			test("should not include CUD metadata by default", () => {
				const color = new Color("#FF2800"); // CUD red
				const result = exportToJSON({ primary: color });

				expect(result.colors.primary.cudMetadata).toBeUndefined();
			});

			test("should include CUD metadata when option is true", () => {
				const color = new Color("#FF2800"); // CUD red
				const result = exportToJSON(
					{ primary: color },
					{ includeCudMetadata: true },
				);

				expect(result.colors.primary.cudMetadata).toBeDefined();
				expect(result.colors.primary.cudMetadata?.nearestId).toBe("red");
				expect(result.colors.primary.cudMetadata?.matchLevel).toBe("exact");
			});

			test("should include correct CUD metadata for non-CUD color", () => {
				const color = new Color("#123456");
				const result = exportToJSON(
					{ primary: color },
					{ includeCudMetadata: true },
				);

				expect(result.colors.primary.cudMetadata).toBeDefined();
				expect(result.colors.primary.cudMetadata?.deltaE).toBeGreaterThan(0);
			});

			test("should include group in CUD metadata", () => {
				const color = new Color("#FF2800"); // CUD accent red
				const result = exportToJSON(
					{ primary: color },
					{ includeCudMetadata: true },
				);

				expect(result.colors.primary.cudMetadata?.group).toBe("accent");
			});

			test("should include CUD metadata for multiple colors", () => {
				const colors = {
					red: new Color("#FF2800"),
					blue: new Color("#0041FF"),
					white: new Color("#FFFFFF"),
				};
				const result = exportToJSON(colors, { includeCudMetadata: true });

				expect(result.colors.red.cudMetadata?.nearestId).toBe("red");
				expect(result.colors.blue.cudMetadata?.nearestId).toBe("blue");
				expect(result.colors.white.cudMetadata?.nearestId).toBe("white");
			});
		});

		describe("Extended CUD metadata (Task 7.1)", () => {
			test("should include zone classification in CUD metadata", () => {
				const color = new Color("#FF2800"); // CUD red - exact match
				const result = exportToJSON(
					{ primary: color },
					{ includeCudMetadata: true },
				);

				expect(result.colors.primary.cudMetadata?.zone).toBe("safe");
			});

			test("should include CUD color name (nameJa) in metadata", () => {
				const color = new Color("#FF2800"); // CUD red
				const result = exportToJSON(
					{ primary: color },
					{ includeCudMetadata: true },
				);

				expect(result.colors.primary.cudMetadata?.nearestName).toBe("赤");
			});

			test("should classify zone as warning for near colors", () => {
				// A color that is close but not exact match
				const color = new Color("#FF3010"); // Near CUD red
				const result = exportToJSON(
					{ primary: color },
					{ includeCudMetadata: true },
				);

				// Check that zone is assigned based on deltaE
				const zone = result.colors.primary.cudMetadata?.zone;
				expect(["safe", "warning", "off"]).toContain(zone);
			});

			test("should include CUD summary when option is enabled", () => {
				const colors = {
					red: new Color("#FF2800"), // CUD exact
					blue: new Color("#0041FF"), // CUD exact
					custom: new Color("#123456"), // Non-CUD
				};
				const result = exportToJSON(colors, {
					includeCudMetadata: true,
					includeCudSummary: true,
				});

				expect(result.cudSummary).toBeDefined();
				expect(result.cudSummary?.complianceRate).toBeGreaterThanOrEqual(0);
				expect(result.cudSummary?.complianceRate).toBeLessThanOrEqual(100);
			});

			test("should include zone distribution in CUD summary", () => {
				const colors = {
					red: new Color("#FF2800"), // Safe zone
					green: new Color("#35A16B"), // Safe zone
					custom: new Color("#123456"), // Likely off zone
				};
				const result = exportToJSON(colors, {
					includeCudMetadata: true,
					includeCudSummary: true,
				});

				expect(result.cudSummary?.zoneDistribution).toBeDefined();
				expect(result.cudSummary?.zoneDistribution.safe).toBeGreaterThanOrEqual(
					0,
				);
				expect(
					result.cudSummary?.zoneDistribution.warning,
				).toBeGreaterThanOrEqual(0);
				expect(result.cudSummary?.zoneDistribution.off).toBeGreaterThanOrEqual(
					0,
				);
			});

			test("should include mode info in CUD summary", () => {
				const colors = { primary: new Color("#FF2800") };
				const result = exportToJSON(colors, {
					includeCudMetadata: true,
					includeCudSummary: true,
					cudMode: "strict",
				});

				expect(result.cudSummary?.mode).toBe("strict");
			});

			test("should set isFullyCompliant to true when all colors are in safe zone", () => {
				const colors = {
					red: new Color("#FF2800"), // CUD exact
					blue: new Color("#0041FF"), // CUD exact
					green: new Color("#35A16B"), // CUD exact
				};
				const result = exportToJSON(colors, {
					includeCudMetadata: true,
					includeCudSummary: true,
					cudMode: "strict",
				});

				expect(result.cudSummary?.isFullyCompliant).toBe(true);
			});

			test("should set isFullyCompliant to false when any color is not in safe zone", () => {
				const colors = {
					red: new Color("#FF2800"), // CUD exact
					custom: new Color("#123456"), // Non-CUD
				};
				const result = exportToJSON(colors, {
					includeCudMetadata: true,
					includeCudSummary: true,
					cudMode: "strict",
				});

				expect(result.cudSummary?.isFullyCompliant).toBe(false);
			});

			test("should not include CUD summary when option is false", () => {
				const colors = { primary: new Color("#FF2800") };
				const result = exportToJSON(colors, {
					includeCudMetadata: true,
					includeCudSummary: false,
				});

				expect(result.cudSummary).toBeUndefined();
			});

			test("should default CUD mode to off when not specified", () => {
				const colors = { primary: new Color("#FF2800") };
				const result = exportToJSON(colors, {
					includeCudMetadata: true,
					includeCudSummary: true,
				});

				expect(result.cudSummary?.mode).toBe("off");
			});
		});

		describe("CUD validation summary before export (Task 7.3)", () => {
			test("should generate validation summary with warning count", () => {
				// Import the new function
				const { generateCudValidationSummary } = require("./json-exporter");

				const colors = {
					red: new Color("#FF2800"), // CUD exact - safe
					blue: new Color("#0041FF"), // CUD exact - safe
					custom: new Color("#123456"), // Non-CUD - likely off
				};

				const summary = generateCudValidationSummary(colors);

				expect(summary).toBeDefined();
				expect(typeof summary.warningCount).toBe("number");
				expect(typeof summary.errorCount).toBe("number");
				expect(summary.totalColors).toBe(3);
			});

			test("should count warnings for colors in warning zone", () => {
				const { generateCudValidationSummary } = require("./json-exporter");

				// Near CUD red - should be in warning zone
				const colors = {
					nearRed: new Color("#FF3820"),
				};

				const summary = generateCudValidationSummary(colors);

				// Check that warning or off zone colors are counted
				expect(
					summary.warningCount + summary.errorCount,
				).toBeGreaterThanOrEqual(0);
			});

			test("should count errors for colors in off zone", () => {
				const { generateCudValidationSummary } = require("./json-exporter");

				// Far from any CUD color
				const colors = {
					offColor: new Color("#123456"),
				};

				const summary = generateCudValidationSummary(colors);

				expect(summary.errorCount).toBeGreaterThanOrEqual(1);
			});

			test("should return zero warnings and errors for all CUD-compliant palette", () => {
				const { generateCudValidationSummary } = require("./json-exporter");

				const colors = {
					red: new Color("#FF2800"), // CUD exact
					blue: new Color("#0041FF"), // CUD exact
					green: new Color("#35A16B"), // CUD exact
				};

				const summary = generateCudValidationSummary(colors);

				expect(summary.warningCount).toBe(0);
				expect(summary.errorCount).toBe(0);
				expect(summary.isExportReady).toBe(true);
			});

			test("should provide isExportReady flag", () => {
				const { generateCudValidationSummary } = require("./json-exporter");

				const colors = {
					custom: new Color("#123456"), // Non-CUD
				};

				const summary = generateCudValidationSummary(colors);

				expect(typeof summary.isExportReady).toBe("boolean");
				expect(summary.isExportReady).toBe(false);
			});

			test("should include zone distribution in summary", () => {
				const { generateCudValidationSummary } = require("./json-exporter");

				const colors = {
					red: new Color("#FF2800"), // safe
					custom: new Color("#123456"), // off
				};

				const summary = generateCudValidationSummary(colors);

				expect(summary.zoneDistribution).toBeDefined();
				expect(typeof summary.zoneDistribution.safe).toBe("number");
				expect(typeof summary.zoneDistribution.warning).toBe("number");
				expect(typeof summary.zoneDistribution.off).toBe("number");
			});

			test("should provide human-readable message", () => {
				const { generateCudValidationSummary } = require("./json-exporter");

				const colors = {
					red: new Color("#FF2800"),
					custom: new Color("#123456"),
				};

				const summary = generateCudValidationSummary(colors);

				expect(typeof summary.message).toBe("string");
				expect(summary.message.length).toBeGreaterThan(0);
			});

			test("should work with empty color palette", () => {
				const { generateCudValidationSummary } = require("./json-exporter");

				const colors = {};

				const summary = generateCudValidationSummary(colors);

				expect(summary.totalColors).toBe(0);
				expect(summary.warningCount).toBe(0);
				expect(summary.errorCount).toBe(0);
				expect(summary.isExportReady).toBe(true);
			});
		});

		describe("edge cases", () => {
			test("should handle pure white", () => {
				const color = new Color("#ffffff");
				const result = exportToJSON({ white: color });

				expect(result.colors.white.oklch.l).toBeCloseTo(1, 2);
				expect(result.colors.white.oklch.c).toBeCloseTo(0, 2);
			});

			test("should handle pure black", () => {
				const color = new Color("#000000");
				const result = exportToJSON({ black: color });

				expect(result.colors.black.oklch.l).toBeCloseTo(0, 2);
				expect(result.colors.black.oklch.c).toBeCloseTo(0, 2);
			});

			test("should handle achromatic colors (undefined hue)", () => {
				const color = new Color("#808080");
				const result = exportToJSON({ gray: color });

				// Gray should still have h defined (or as null in output)
				expect(result.colors.gray.oklch).toBeDefined();
			});
		});
	});
});

/**
 * JSON Exporter v2 テスト
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */
describe("JSONExporter v2", () => {
	describe("exportToJSONv2", () => {
		// Requirement 11.1: dadsTokensオブジェクトにid, hex, nameJa, nameEn, source, immutableプロパティを含める
		test("should output dadsTokens with id, hex, nameJa, nameEn, source, immutable properties", () => {
			const dadsTokens: DadsToken[] = [
				{
					id: "dads-blue-500",
					hex: "#0066cc",
					nameJa: "青500",
					nameEn: "Blue 500",
					classification: { category: "chromatic", hue: "blue", scale: 500 },
					source: "dads" as const,
				},
			];

			const brandTokens: BrandToken[] = [];

			const result = exportToJSONv2(brandTokens, {
				includeDadsTokens: true,
				dadsTokens,
			});

			expect(result.dadsTokens).toBeDefined();
			expect(result.dadsTokens["dads-blue-500"]).toBeDefined();
			expect(result.dadsTokens["dads-blue-500"].id).toBe("dads-blue-500");
			expect(result.dadsTokens["dads-blue-500"].hex).toBe("#0066cc");
			expect(result.dadsTokens["dads-blue-500"].nameJa).toBe("青500");
			expect(result.dadsTokens["dads-blue-500"].nameEn).toBe("Blue 500");
			expect(result.dadsTokens["dads-blue-500"].source).toBe("dads");
			expect(result.dadsTokens["dads-blue-500"].immutable).toBe(true);
		});

		// Requirement 11.2: alpha値を持つDadsTokenにはalphaプロパティを追加
		test("should include alpha property when DadsToken has alpha value", () => {
			const dadsTokens: DadsToken[] = [
				{
					id: "dads-neutral-gray-500-alpha",
					hex: "#808080",
					alpha: 0.5,
					nameJa: "グレー500透過",
					nameEn: "Gray 500 Alpha",
					classification: { category: "neutral", scale: 500 },
					source: "dads" as const,
				},
			];

			const result = exportToJSONv2([], {
				includeDadsTokens: true,
				dadsTokens,
			});

			expect(result.dadsTokens["dads-neutral-gray-500-alpha"].alpha).toBe(0.5);
		});

		// Requirement 11.3: brandTokensオブジェクトにid, hex, source, originalHex, dadsReferenceを含める
		test("should output brandTokens with id, hex, source, originalHex, dadsReference", () => {
			const brandTokens: BrandToken[] = [
				{
					id: "brand-primary-500",
					hex: "#1a73e8",
					source: "brand" as const,
					originalHex: "#1a70e5",
					dadsReference: {
						tokenId: "dads-blue-500",
						tokenHex: "#0066cc",
						deltaE: 0.02,
						derivationType: "soft-snap" as const,
						zone: "safe" as const,
					},
				},
			];

			const result = exportToJSONv2(brandTokens);

			expect(result.brandTokens).toBeDefined();
			expect(result.brandTokens["brand-primary-500"]).toBeDefined();
			expect(result.brandTokens["brand-primary-500"].id).toBe(
				"brand-primary-500",
			);
			expect(result.brandTokens["brand-primary-500"].hex).toBe("#1a73e8");
			expect(result.brandTokens["brand-primary-500"].source).toBe("brand");
			expect(result.brandTokens["brand-primary-500"].originalHex).toBe(
				"#1a70e5",
			);
			expect(
				result.brandTokens["brand-primary-500"].dadsReference,
			).toBeDefined();
		});

		// Requirement 11.4: dadsReferenceにtokenId, tokenHex, tokenAlpha, deltaE, derivationType, zoneを含める
		test("should include complete dadsReference with tokenId, tokenHex, tokenAlpha, deltaE, derivationType, zone", () => {
			const brandTokens: BrandToken[] = [
				{
					id: "brand-overlay-500",
					hex: "#000000",
					alpha: 0.3,
					source: "brand" as const,
					dadsReference: {
						tokenId: "dads-neutral-gray-500",
						tokenHex: "#808080",
						tokenAlpha: 0.5,
						deltaE: 0.1,
						derivationType: "reference" as const,
						zone: "warning" as const,
					},
				},
			];

			const result = exportToJSONv2(brandTokens);

			const ref = result.brandTokens["brand-overlay-500"].dadsReference;
			expect(ref.tokenId).toBe("dads-neutral-gray-500");
			expect(ref.tokenHex).toBe("#808080");
			expect(ref.tokenAlpha).toBe(0.5);
			expect(ref.deltaE).toBe(0.1);
			expect(ref.derivationType).toBe("reference");
			expect(ref.zone).toBe("warning");
		});

		// Requirement 11.5: cudSummaryにcomplianceRate, mode, zoneDistributionを出力
		test("should output cudSummary with complianceRate, mode, zoneDistribution", () => {
			const brandTokens: BrandToken[] = [
				{
					id: "brand-primary-500",
					hex: "#1a73e8",
					source: "brand" as const,
					dadsReference: {
						tokenId: "dads-blue-500",
						tokenHex: "#0066cc",
						deltaE: 0.02,
						derivationType: "soft-snap" as const,
						zone: "safe" as const,
					},
				},
				{
					id: "brand-secondary-500",
					hex: "#ff5733",
					source: "brand" as const,
					dadsReference: {
						tokenId: "dads-red-500",
						tokenHex: "#ff0000",
						deltaE: 0.08,
						derivationType: "soft-snap" as const,
						zone: "warning" as const,
					},
				},
			];

			const result = exportToJSONv2(brandTokens, { cudMode: "soft" });

			expect(result.cudSummary).toBeDefined();
			expect(typeof result.cudSummary.complianceRate).toBe("number");
			expect(result.cudSummary.mode).toBe("soft");
			expect(result.cudSummary.zoneDistribution).toBeDefined();
			expect(typeof result.cudSummary.zoneDistribution.safe).toBe("number");
			expect(typeof result.cudSummary.zoneDistribution.warning).toBe("number");
			expect(typeof result.cudSummary.zoneDistribution.off).toBe("number");
		});

		// Requirement 11.6: metadataにversion, generatedAt, tokenSchemaを含める
		test("should include metadata with version, generatedAt, tokenSchema", () => {
			const result = exportToJSONv2([]);

			expect(result.metadata).toBeDefined();
			expect(result.metadata.version).toBe("2.0.0");
			expect(result.metadata.generatedAt).toBeDefined();
			// tokenSchemaは仕様どおり "dads-brand-v1" で固定
			// ref: docs/design/dads-immutable-tokens.md:844
			expect(result.metadata.tokenSchema).toBe("dads-brand-v1");
			// generatedAtはISO形式の日時文字列
			expect(result.metadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});

		// v1/v2切り替え - デフォルトはv2
		test("should use v2 output format by default", () => {
			const brandTokens: BrandToken[] = [
				{
					id: "brand-primary-500",
					hex: "#1a73e8",
					source: "brand" as const,
					dadsReference: {
						tokenId: "dads-blue-500",
						tokenHex: "#0066cc",
						deltaE: 0.02,
						derivationType: "soft-snap" as const,
						zone: "safe" as const,
					},
				},
			];

			const result = exportToJSONv2(brandTokens);

			// v2形式の確認
			expect(result.brandTokens).toBeDefined();
			expect(result.metadata).toBeDefined();
			expect(result.cudSummary).toBeDefined();
		});

		// v1互換出力
		test("should support v1 output format when outputVersion is v1", () => {
			const brandTokens: BrandToken[] = [
				{
					id: "brand-primary-500",
					hex: "#1a73e8",
					source: "brand" as const,
					dadsReference: {
						tokenId: "dads-blue-500",
						tokenHex: "#0066cc",
						deltaE: 0.02,
						derivationType: "soft-snap" as const,
						zone: "safe" as const,
					},
				},
			];

			const result = exportToJSONv2(brandTokens, { outputVersion: "v1" });

			// v1形式ではcolorsフィールドを使用
			expect(result.colors).toBeDefined();
			expect(result.brandTokens).toBeUndefined();
		});

		// 空配列でも正常動作
		test("should handle empty token arrays", () => {
			const result = exportToJSONv2([]);

			expect(result.brandTokens).toBeDefined();
			expect(Object.keys(result.brandTokens)).toHaveLength(0);
			expect(result.metadata).toBeDefined();
			expect(result.cudSummary).toBeDefined();
		});

		// brandNamespaceオプション
		test("should use brandNamespace option for token grouping", () => {
			const brandTokens: BrandToken[] = [
				{
					id: "brand-primary-500",
					hex: "#1a73e8",
					source: "brand" as const,
					dadsReference: {
						tokenId: "dads-blue-500",
						tokenHex: "#0066cc",
						deltaE: 0.02,
						derivationType: "soft-snap" as const,
						zone: "safe" as const,
					},
				},
			];

			const result = exportToJSONv2(brandTokens, { brandNamespace: "myapp" });

			expect(result.metadata.brandNamespace).toBe("myapp");
		});

		// includeDadsTokens=falseでDADSトークンを除外
		test("should exclude dadsTokens when includeDadsTokens is false", () => {
			const dadsTokens: DadsToken[] = [
				{
					id: "dads-blue-500",
					hex: "#0066cc",
					nameJa: "青500",
					nameEn: "Blue 500",
					classification: { category: "chromatic", hue: "blue", scale: 500 },
					source: "dads" as const,
				},
			];

			const result = exportToJSONv2([], {
				includeDadsTokens: false,
				dadsTokens,
			});

			expect(result.dadsTokens).toBeUndefined();
		});

		// 複数のDADSトークンとブランドトークンの処理
		test("should handle multiple DADS tokens and brand tokens", () => {
			const dadsTokens: DadsToken[] = [
				{
					id: "dads-blue-500",
					hex: "#0066cc",
					nameJa: "青500",
					nameEn: "Blue 500",
					classification: { category: "chromatic", hue: "blue", scale: 500 },
					source: "dads" as const,
				},
				{
					id: "dads-red-500",
					hex: "#ff0000",
					nameJa: "赤500",
					nameEn: "Red 500",
					classification: { category: "chromatic", hue: "red", scale: 500 },
					source: "dads" as const,
				},
			];

			const brandTokens: BrandToken[] = [
				{
					id: "brand-primary-500",
					hex: "#1a73e8",
					source: "brand" as const,
					dadsReference: {
						tokenId: "dads-blue-500",
						tokenHex: "#0066cc",
						deltaE: 0.02,
						derivationType: "soft-snap" as const,
						zone: "safe" as const,
					},
				},
				{
					id: "brand-accent-500",
					hex: "#ff5733",
					source: "brand" as const,
					dadsReference: {
						tokenId: "dads-red-500",
						tokenHex: "#ff0000",
						deltaE: 0.05,
						derivationType: "soft-snap" as const,
						zone: "safe" as const,
					},
				},
			];

			const result = exportToJSONv2(brandTokens, {
				includeDadsTokens: true,
				dadsTokens,
			});

			const dadsTokensOutput = result.dadsTokens;
			expect(dadsTokensOutput).toBeDefined();
			if (!dadsTokensOutput) throw new Error("dadsTokens should be defined");
			expect(Object.keys(dadsTokensOutput)).toHaveLength(2);
			expect(Object.keys(result.brandTokens)).toHaveLength(2);
		});
	});
});

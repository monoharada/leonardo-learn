/**
 * CSSExporter - CSS Custom Properties形式エクスポートのテスト
 */

import { describe, expect, it } from "bun:test";
import { Color } from "../color";
import type { BrandToken, DadsReference, DadsToken } from "../tokens/types";
import {
	type CudCommentData,
	exportScalesToCSS,
	exportToCSS,
	exportToCSSv2,
	formatCudComment,
	formatDerivationComment,
	generateSemanticTokenName,
	hexToRgba,
} from "./css-exporter";

describe("CSSExporter", () => {
	describe("exportToCSS", () => {
		it("基本的なCSS Custom Propertiesを生成する", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToCSS(colors);

			expect(result.css).toContain(":root {");
			expect(result.css).toContain("--color-primary:");
			expect(result.variables).toContain("--color-primary");
		});

		it("sRGB fallbackとOKLCH値を両方出力する", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToCSS(colors);

			// hex fallback
			expect(result.css).toMatch(/--color-primary: #[0-9a-f]{6};/i);
			// OKLCH値
			expect(result.css).toMatch(/--color-primary: oklch\(/);
		});

		it("カスタムプレフィックスを使用できる", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToCSS(colors, { prefix: "theme" });

			expect(result.css).toContain("--theme-primary:");
			expect(result.variables).toContain("--theme-primary");
		});

		it("カスタムセレクタを使用できる", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToCSS(colors, { selector: ".dark-theme" });

			expect(result.css).toContain(".dark-theme {");
		});

		it("@supports広色域fallbackを含める", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToCSS(colors, { includeWideGamutFallback: true });

			expect(result.css).toContain("@supports (color: oklch(0% 0 0))");
			expect(result.css).toContain(":root {");
		});

		it("複数の色をエクスポートできる", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
				secondary: new Color({ mode: "oklch", l: 0.6, c: 0.15, h: 180 }),
				error: new Color({ mode: "oklch", l: 0.5, c: 0.25, h: 30 }),
			};

			const result = exportToCSS(colors);

			expect(result.variables).toHaveLength(3);
			expect(result.css).toContain("--color-primary:");
			expect(result.css).toContain("--color-secondary:");
			expect(result.css).toContain("--color-error:");
		});

		it("camelCaseをkebab-caseに変換する", () => {
			const colors = {
				primaryLight: new Color({ mode: "oklch", l: 0.8, c: 0.1, h: 250 }),
				errorDark: new Color({ mode: "oklch", l: 0.3, c: 0.2, h: 30 }),
			};

			const result = exportToCSS(colors);

			expect(result.css).toContain("--color-primary-light:");
			expect(result.css).toContain("--color-error-dark:");
		});

		it("カスタムインデントを使用できる", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToCSS(colors, { indent: 4 });

			expect(result.css).toContain("    --color-primary:");
		});
	});

	describe("generateSemanticTokenName", () => {
		it("セマンティックトークン名を生成する", () => {
			const name = generateSemanticTokenName("primary", 500);
			expect(name).toBe("--color-primary-500");
		});

		it("カスタムプレフィックスを使用できる", () => {
			const name = generateSemanticTokenName("error", 700, "theme");
			expect(name).toBe("--theme-error-700");
		});

		it("文字列のシェード値も受け付ける", () => {
			const name = generateSemanticTokenName("neutral", "dark");
			expect(name).toBe("--color-neutral-dark");
		});
	});

	describe("exportScalesToCSS", () => {
		it("トーンスケールをCSS Custom Propertiesとしてエクスポートする", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[50, new Color({ mode: "oklch", l: 0.95, c: 0.05, h: 250 })],
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
					[900, new Color({ mode: "oklch", l: 0.2, c: 0.15, h: 250 })],
				]),
			};

			const result = exportScalesToCSS(scales);

			expect(result.variables).toContain("--color-primary-50");
			expect(result.variables).toContain("--color-primary-500");
			expect(result.variables).toContain("--color-primary-900");
			expect(result.css).toContain("/* primary */");
		});

		it("複数のロールをエクスポートできる", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
				secondary: new Map([
					[500, new Color({ mode: "oklch", l: 0.6, c: 0.15, h: 180 })],
				]),
			};

			const result = exportScalesToCSS(scales);

			expect(result.css).toContain("/* primary */");
			expect(result.css).toContain("/* secondary */");
			expect(result.variables).toContain("--color-primary-500");
			expect(result.variables).toContain("--color-secondary-500");
		});

		it("トーン値でソートされる", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[900, new Color({ mode: "oklch", l: 0.2, c: 0.15, h: 250 })],
					[50, new Color({ mode: "oklch", l: 0.95, c: 0.05, h: 250 })],
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
			};

			const result = exportScalesToCSS(scales);

			// 50が500より前、500が900より前にある
			const css = result.css;
			const pos50 = css.indexOf("primary-50:");
			const pos500 = css.indexOf("primary-500:");
			const pos900 = css.indexOf("primary-900:");

			expect(pos50).toBeLessThan(pos500);
			expect(pos500).toBeLessThan(pos900);
		});

		it("@supports広色域fallbackを含める", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
			};

			const result = exportScalesToCSS(scales, {
				includeWideGamutFallback: true,
			});

			expect(result.css).toContain("@supports (color: oklch(0% 0 0))");
		});

		it("OKLCH値が正しくフォーマットされる", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
			};

			const result = exportScalesToCSS(scales);

			// oklch(50.0% 0.xxx 250.0) の形式
			expect(result.css).toMatch(/oklch\(\d+\.\d+% \d+\.\d+ \d+\.\d+\)/);
		});
	});

	describe("formatCudComment", () => {
		it("CUDコメント文字列を正しくフォーマットする（exactマッチ）", () => {
			const data: CudCommentData = {
				nearestName: "赤",
				matchLevel: "exact",
				deltaE: 0.0,
			};

			const result = formatCudComment(data);

			expect(result).toBe("/* CUD: 赤 (exact, ΔE=0.000) */");
		});

		it("CUDコメント文字列を正しくフォーマットする（nearマッチ）", () => {
			const data: CudCommentData = {
				nearestName: "緑",
				matchLevel: "near",
				deltaE: 0.032,
			};

			const result = formatCudComment(data);

			expect(result).toBe("/* CUD: 緑 (near, ΔE=0.032) */");
		});

		it("CUDコメント文字列を正しくフォーマットする（moderateマッチ）", () => {
			const data: CudCommentData = {
				nearestName: "青",
				matchLevel: "moderate",
				deltaE: 0.085,
			};

			const result = formatCudComment(data);

			expect(result).toBe("/* CUD: 青 (moderate, ΔE=0.085) */");
		});

		it("CUDコメント文字列を正しくフォーマットする（offマッチ）", () => {
			const data: CudCommentData = {
				nearestName: "橙",
				matchLevel: "off",
				deltaE: 0.156,
			};

			const result = formatCudComment(data);

			expect(result).toBe("/* CUD: 橙 (off, ΔE=0.156) */");
		});

		it("deltaE値を小数点以下3桁でフォーマットする", () => {
			const data: CudCommentData = {
				nearestName: "黄",
				matchLevel: "near",
				deltaE: 0.1,
			};

			const result = formatCudComment(data);

			expect(result).toBe("/* CUD: 黄 (near, ΔE=0.100) */");
		});
	});

	describe("exportToCSS with CUD comments", () => {
		it("includeCudCommentsオプションでCUDコメントを追加する", () => {
			// CUD赤に近い色を使用
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5353, c: 0.2406, h: 30.1 }),
			};

			const result = exportToCSS(colors, { includeCudComments: true });

			// CUDコメントが含まれている
			expect(result.css).toContain("/* CUD:");
			expect(result.css).toContain("ΔE=");
		});

		it("includeCudCommentsがfalseの場合はコメントなし", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToCSS(colors, { includeCudComments: false });

			expect(result.css).not.toContain("/* CUD:");
		});

		it("デフォルトではCUDコメントは含まれない", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToCSS(colors);

			expect(result.css).not.toContain("/* CUD:");
		});

		it("複数色でそれぞれCUDコメントが追加される", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5353, c: 0.2406, h: 30.1 }),
				secondary: new Color({ mode: "oklch", l: 0.7, c: 0.15, h: 145 }),
			};

			const result = exportToCSS(colors, { includeCudComments: true });

			// 両方の変数にCUDコメントがある（2回以上マッチ）
			const cudCommentMatches = result.css.match(/\/\* CUD:/g);
			expect(cudCommentMatches).not.toBeNull();
			expect(cudCommentMatches?.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("exportScalesToCSS with CUD comments", () => {
		it("includeCudCommentsオプションでCUDコメントを追加する", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5353, c: 0.2406, h: 30.1 })],
				]),
			};

			const result = exportScalesToCSS(scales, { includeCudComments: true });

			expect(result.css).toContain("/* CUD:");
		});

		it("複数トーンでそれぞれCUDコメントが追加される", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[50, new Color({ mode: "oklch", l: 0.95, c: 0.05, h: 30 })],
					[500, new Color({ mode: "oklch", l: 0.5353, c: 0.2406, h: 30.1 })],
					[900, new Color({ mode: "oklch", l: 0.2, c: 0.15, h: 30 })],
				]),
			};

			const result = exportScalesToCSS(scales, { includeCudComments: true });

			const cudCommentMatches = result.css.match(/\/\* CUD:/g);
			expect(cudCommentMatches).not.toBeNull();
			expect(cudCommentMatches?.length).toBeGreaterThanOrEqual(3);
		});
	});
});

/**
 * CSSエクスポーターv2のテスト
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
describe("CSSExporter v2", () => {
	describe("exportToCSSv2", () => {
		// Requirements 10.1, 10.2: DADSプリミティブとブランドトークンの出力
		it("DADSプリミティブを--dads-{color}形式で出力する", () => {
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

			const result = exportToCSSv2(brandTokens, dadsTokens);

			expect(result).toContain("--dads-blue-500");
			expect(result).toContain("#0066cc");
		});

		it("ブランドトークンを--brand-{role}-{shade}形式で出力する", () => {
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

			const result = exportToCSSv2(brandTokens);

			expect(result).toContain("--brand-primary-500");
			expect(result).toContain("#1a73e8");
		});

		// Requirement 10.3: alpha値を持つトークンはrgba()形式で出力
		it("alpha値を持つトークンはrgba(R, G, B, alpha)形式で出力する", () => {
			const dadsTokens: DadsToken[] = [
				{
					id: "dads-neutral-gray-500",
					hex: "#808080",
					alpha: 0.5,
					nameJa: "グレー500透過",
					nameEn: "Gray 500 Alpha",
					classification: { category: "neutral", scale: 500 },
					source: "dads" as const,
				},
			];

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

			const result = exportToCSSv2(brandTokens, dadsTokens);

			// DADSトークンのrgba出力
			expect(result).toContain("rgba(128, 128, 128, 0.5)");
			// ブランドトークンのrgba出力
			expect(result).toContain("rgba(0, 0, 0, 0.3)");
		});

		// Requirement 10.4: alpha値がないか1の場合は#RRGGBB形式で出力
		it("alpha値がないか1の場合は#RRGGBB形式で出力する", () => {
			const dadsTokens: DadsToken[] = [
				{
					id: "dads-red-500",
					hex: "#ff0000",
					nameJa: "赤500",
					nameEn: "Red 500",
					classification: { category: "chromatic", hue: "red", scale: 500 },
					source: "dads" as const,
				},
				{
					id: "dads-green-500",
					hex: "#00ff00",
					alpha: 1,
					nameJa: "緑500",
					nameEn: "Green 500",
					classification: { category: "chromatic", hue: "green", scale: 500 },
					source: "dads" as const,
				},
			];

			const result = exportToCSSv2([], dadsTokens);

			expect(result).toContain("--dads-red-500: #ff0000;");
			expect(result).toContain("--dads-green-500: #00ff00;");
			// rgba形式ではないことを確認
			expect(result).not.toContain("rgba(255, 0, 0,");
			expect(result).not.toContain("rgba(0, 255, 0,");
		});

		// Requirement 10.5: derivationコメント（参照先DADS、deltaE、派生タイプ）を追加
		it("derivationコメント（参照先DADS、deltaE、派生タイプ）を追加する", () => {
			const brandTokens: BrandToken[] = [
				{
					id: "brand-accent-500",
					hex: "#e91e63",
					source: "brand" as const,
					dadsReference: {
						tokenId: "dads-magenta-500",
						tokenHex: "#d81b60",
						deltaE: 0.045,
						derivationType: "soft-snap" as const,
						zone: "safe" as const,
					},
				},
			];

			const result = exportToCSSv2(brandTokens, [], { includeComments: true });

			// derivationコメントの確認
			expect(result).toContain("dads-magenta-500");
			expect(result).toContain("0.045");
			expect(result).toContain("soft-snap");
		});

		// Requirement 10.5: 不変性を示すコメントをDADSセクションに追加
		it("不変性を示すコメントをDADSセクションに追加する", () => {
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

			const result = exportToCSSv2([], dadsTokens, { includeComments: true });

			// 不変性コメントの確認
			expect(result).toMatch(/DADS.*(?:Immutable|不変|変更不可)/i);
		});

		it("DADSトークンとブランドトークンを分離したセクションで出力する", () => {
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

			const result = exportToCSSv2(brandTokens, dadsTokens, {
				includeComments: true,
			});

			// DADSセクションがブランドセクションより前にある
			const dadsIndex = result.indexOf("--dads-");
			const brandIndex = result.indexOf("--brand-");
			expect(dadsIndex).toBeLessThan(brandIndex);
		});

		it("includeDadsTokens=falseの場合はDADSトークンを出力しない", () => {
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

			const result = exportToCSSv2(brandTokens, dadsTokens, {
				includeDadsTokens: false,
			});

			expect(result).not.toContain("--dads-");
			expect(result).toContain("--brand-primary-500");
		});

		it("空のトークン配列でも正常に動作する", () => {
			const result = exportToCSSv2([], []);

			expect(result).toContain(":root");
			expect(result).toContain("}");
		});
	});

	describe("formatDerivationComment", () => {
		it("派生情報を正しいフォーマットでコメント化する", () => {
			const dadsRef: DadsReference = {
				tokenId: "dads-blue-500",
				tokenHex: "#0066cc",
				deltaE: 0.032,
				derivationType: "soft-snap" as const,
				zone: "safe" as const,
			};

			const result = formatDerivationComment(dadsRef);

			expect(result).toContain("dads-blue-500");
			expect(result).toContain("ΔE=0.032");
			expect(result).toContain("soft-snap");
		});
	});

	describe("hexToRgba", () => {
		it("HEXとalphaからrgba文字列を生成する", () => {
			const result = hexToRgba("#ff0000", 0.5);
			expect(result).toBe("rgba(255, 0, 0, 0.5)");
		});

		it("小文字HEXも正しく処理する", () => {
			const result = hexToRgba("#00ff00", 0.75);
			expect(result).toBe("rgba(0, 255, 0, 0.75)");
		});
	});
});

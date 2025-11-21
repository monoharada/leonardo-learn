/**
 * DTCGExporter - W3C Design Tokens形式エクスポートのテスト
 */

import { describe, expect, it } from "bun:test";
import { Color } from "../color";
import {
	exportScalesToDTCG,
	exportToDTCG,
	exportWithAliases,
} from "./dtcg-exporter";

describe("DTCGExporter", () => {
	describe("exportToDTCG", () => {
		it("基本的なDTCG形式のトークンを生成する", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToDTCG(colors);

			expect(result.tokens.color).toBeDefined();
			const colorTokens = result.tokens.color as Record<string, unknown>;
			expect(colorTokens.primary).toBeDefined();
		});

		it("$valueと$typeを含む", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToDTCG(colors);

			const colorTokens = result.tokens.color as Record<
				string,
				{ $value: string; $type: string }
			>;
			expect(colorTokens.primary.$value).toBeDefined();
			expect(colorTokens.primary.$type).toBe("color");
		});

		it("OKLCH形式で色値を出力する", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToDTCG(colors);

			const colorTokens = result.tokens.color as Record<
				string,
				{ $value: string }
			>;
			expect(colorTokens.primary.$value).toMatch(/^oklch\(/);
		});

		it("sRGB形式で色値を出力できる", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToDTCG(colors, { colorSpace: "srgb" });

			const colorTokens = result.tokens.color as Record<
				string,
				{ $value: string }
			>;
			expect(colorTokens.primary.$value).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it("複数の色をエクスポートできる", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
				secondary: new Color({ mode: "oklch", l: 0.6, c: 0.15, h: 180 }),
				error: new Color({ mode: "oklch", l: 0.5, c: 0.25, h: 30 }),
			};

			const result = exportToDTCG(colors);

			const colorTokens = result.tokens.color as Record<string, unknown>;
			expect(Object.keys(colorTokens)).toHaveLength(3);
		});

		it("JSON文字列を生成する", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToDTCG(colors);

			expect(result.json).toBeDefined();
			expect(() => JSON.parse(result.json)).not.toThrow();
		});

		it("カスタムインデントを使用できる", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToDTCG(colors, { indent: 4 });

			// 4スペースインデントが使用される
			expect(result.json).toContain("    ");
		});
	});

	describe("exportScalesToDTCG", () => {
		it("トーンスケールをDTCG形式でエクスポートする", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[50, new Color({ mode: "oklch", l: 0.95, c: 0.05, h: 250 })],
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
					[900, new Color({ mode: "oklch", l: 0.2, c: 0.15, h: 250 })],
				]),
			};

			const result = exportScalesToDTCG(scales);

			const colorTokens = result.tokens.color as Record<
				string,
				Record<string, unknown>
			>;
			expect(colorTokens.primary["50"]).toBeDefined();
			expect(colorTokens.primary["500"]).toBeDefined();
			expect(colorTokens.primary["900"]).toBeDefined();
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

			const result = exportScalesToDTCG(scales);

			const colorTokens = result.tokens.color as Record<string, unknown>;
			expect(colorTokens.primary).toBeDefined();
			expect(colorTokens.secondary).toBeDefined();
		});

		it("aliasトークンを含めることができる", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[100, new Color({ mode: "oklch", l: 0.9, c: 0.1, h: 250 })],
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
					[900, new Color({ mode: "oklch", l: 0.2, c: 0.15, h: 250 })],
				]),
			};

			const result = exportScalesToDTCG(scales, { includeAliases: true });

			expect(result.tokens.semantic).toBeDefined();
			const semantic = result.tokens.semantic as Record<
				string,
				Record<string, { $value: string }>
			>;
			expect(semantic.primary.default.$value).toBe("{color.primary.500}");
			expect(semantic.primary.light.$value).toBe("{color.primary.100}");
			expect(semantic.primary.dark.$value).toBe("{color.primary.900}");
		});

		it("各トークンに$typeを含む", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
			};

			const result = exportScalesToDTCG(scales);

			const colorTokens = result.tokens.color as Record<
				string,
				Record<string, { $type: string }>
			>;
			expect(colorTokens.primary["500"].$type).toBe("color");
		});
	});

	describe("exportWithAliases", () => {
		it("カスタムaliasトークンを生成する", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
			};

			const aliases = {
				"button.background": "primary.500",
			};

			const result = exportWithAliases(scales, aliases);

			const semantic = result.tokens.semantic as Record<
				string,
				Record<string, { $value: string }>
			>;
			expect(semantic.button.background.$value).toBe("{color.primary.500}");
		});

		it("ネストされたaliasパスをサポートする", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
				error: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.25, h: 30 })],
				]),
			};

			const aliases = {
				"button.primary.background": "primary.500",
				"button.error.background": "error.500",
			};

			const result = exportWithAliases(scales, aliases);

			const semantic = result.tokens.semantic as Record<
				string,
				Record<string, Record<string, { $value: string }>>
			>;
			expect(semantic.button.primary.background.$value).toBe(
				"{color.primary.500}",
			);
			expect(semantic.button.error.background.$value).toBe("{color.error.500}");
		});

		it("aliasトークンに$typeを含む", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
			};

			const aliases = {
				"button.background": "primary.500",
			};

			const result = exportWithAliases(scales, aliases);

			const semantic = result.tokens.semantic as Record<
				string,
				Record<string, { $type: string }>
			>;
			expect(semantic.button.background.$type).toBe("color");
		});

		it("基本トークンとaliasトークンを分離する", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
			};

			const aliases = {
				"button.background": "primary.500",
			};

			const result = exportWithAliases(scales, aliases);

			expect(result.tokens.color).toBeDefined();
			expect(result.tokens.semantic).toBeDefined();

			// colorには実際の値
			const colorTokens = result.tokens.color as Record<
				string,
				Record<string, { $value: string }>
			>;
			expect(colorTokens.primary["500"].$value).toMatch(/^oklch\(/);

			// semanticには参照
			const semantic = result.tokens.semantic as Record<
				string,
				Record<string, { $value: string }>
			>;
			expect(semantic.button.background.$value).toBe("{color.primary.500}");
		});
	});
});

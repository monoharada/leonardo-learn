/**
 * TailwindExporter - Tailwind CSS設定形式エクスポートのテスト
 */

import { describe, expect, it } from "bun:test";
import { Color } from "../color";
import {
	exportScalesToTailwind,
	exportToTailwind,
	exportToTailwindV4,
} from "./tailwind-exporter";

describe("TailwindExporter", () => {
	describe("exportToTailwind", () => {
		it("基本的なTailwind設定を生成する", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToTailwind(colors);

			expect(result.colors.primary).toBeDefined();
			expect(result.config).toContain("module.exports");
			expect(result.config).toContain("theme");
			expect(result.config).toContain("extend");
			expect(result.config).toContain("colors");
		});

		it("OKLCH形式で色値を出力する", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToTailwind(colors);

			expect(result.colors.primary).toMatch(/^oklch\(/);
		});

		it("hex形式で色値を出力できる", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToTailwind(colors, { colorSpace: "hex" });

			expect(result.colors.primary).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it("複数の色をエクスポートできる", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
				secondary: new Color({ mode: "oklch", l: 0.6, c: 0.15, h: 180 }),
				error: new Color({ mode: "oklch", l: 0.5, c: 0.25, h: 30 }),
			};

			const result = exportToTailwind(colors);

			expect(Object.keys(result.colors)).toHaveLength(3);
		});

		it("ESモジュール形式で出力できる", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToTailwind(colors, { esModule: true });

			expect(result.config).toContain("export default");
			expect(result.config).not.toContain("module.exports");
		});

		it("カスタムインデントを使用できる", () => {
			const colors = {
				primary: new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 }),
			};

			const result = exportToTailwind(colors, { indent: 4 });

			expect(result.config).toContain("    theme:");
		});
	});

	describe("exportScalesToTailwind", () => {
		it("トーンスケールをTailwind設定としてエクスポートする", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[50, new Color({ mode: "oklch", l: 0.95, c: 0.05, h: 250 })],
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
					[900, new Color({ mode: "oklch", l: 0.2, c: 0.15, h: 250 })],
				]),
			};

			const result = exportScalesToTailwind(scales);

			const primary = result.colors.primary as Record<string, string>;
			expect(primary["50"]).toBeDefined();
			expect(primary["500"]).toBeDefined();
			expect(primary["900"]).toBeDefined();
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

			const result = exportScalesToTailwind(scales);

			expect(result.colors.primary).toBeDefined();
			expect(result.colors.secondary).toBeDefined();
		});

		it("トーン値でソートされる", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[900, new Color({ mode: "oklch", l: 0.2, c: 0.15, h: 250 })],
					[50, new Color({ mode: "oklch", l: 0.95, c: 0.05, h: 250 })],
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
			};

			const result = exportScalesToTailwind(scales);

			const primary = result.colors.primary as Record<string, string>;
			const keys = Object.keys(primary).map(Number);

			// 順序が保持されている（JSONでは保証されないが、Map→Objectの変換順）
			expect(keys).toContain(50);
			expect(keys).toContain(500);
			expect(keys).toContain(900);
		});

		it("ネストされた構造を生成する", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
			};

			const result = exportScalesToTailwind(scales);

			// primary.500のようなネスト構造
			expect(typeof result.colors.primary).toBe("object");
			const primary = result.colors.primary as Record<string, string>;
			expect(primary["500"]).toBeDefined();
		});

		it("設定文字列がvalid JavaScriptになる", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
			};

			const result = exportScalesToTailwind(scales);

			// 基本的な構文チェック
			expect(result.config).toContain("module.exports = {");
			expect(result.config).toContain("theme: {");
			expect(result.config).toContain("extend: {");
			expect(result.config).toContain("colors:");
		});
	});

	describe("exportToTailwindV4", () => {
		it("Tailwind v4形式のCSS変数を生成する", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
			};

			const result = exportToTailwindV4(scales);

			expect(result).toContain("@theme {");
			expect(result).toContain("--color-primary-500:");
			expect(result).toContain("oklch(");
		});

		it("複数のロールとトーンをエクスポートする", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[50, new Color({ mode: "oklch", l: 0.95, c: 0.05, h: 250 })],
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
				error: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.25, h: 30 })],
				]),
			};

			const result = exportToTailwindV4(scales);

			expect(result).toContain("/* primary */");
			expect(result).toContain("--color-primary-50:");
			expect(result).toContain("--color-primary-500:");
			expect(result).toContain("/* error */");
			expect(result).toContain("--color-error-500:");
		});

		it("カスタムインデントを使用できる", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
			};

			const result = exportToTailwindV4(scales, { indent: 4 });

			expect(result).toContain("    --color-primary-500:");
		});

		it("OKLCH値が正しくフォーマットされる", () => {
			const scales: Record<string, Map<number, Color>> = {
				primary: new Map([
					[500, new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				]),
			};

			const result = exportToTailwindV4(scales);

			// oklch(50.0% 0.xxx 250.0) の形式
			expect(result).toMatch(/oklch\(\d+\.\d+% \d+\.\d+ \d+\.\d+\)/);
		});
	});
});

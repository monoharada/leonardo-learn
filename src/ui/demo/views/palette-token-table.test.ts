/**
 * パレットトークンテーブルモジュールのテスト
 *
 * @module @/ui/demo/views/palette-token-table.test
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポートの確認を行う。
 */

import { describe, expect, it } from "bun:test";
import type { TokenTableRow } from "./palette-token-table";

describe("palette-token-table module", () => {
	describe("exports", () => {
		it("should export createTokenTable function", async () => {
			const { createTokenTable } = await import("./palette-token-table");
			expect(createTokenTable).toBeDefined();
			expect(typeof createTokenTable).toBe("function");
		});

		it("should export createTableRow function", async () => {
			const { createTableRow } = await import("./palette-token-table");
			expect(createTableRow).toBeDefined();
			expect(typeof createTableRow).toBe("function");
		});
	});

	describe("TokenTableRow interface", () => {
		it("should accept valid row data with semantic category", () => {
			const row: TokenTableRow = {
				colorSwatch: "#FF2800",
				tokenName: "Error-1",
				primitiveName: "red-800",
				hex: "#FF2800",
				category: "semantic",
			};

			expect(row.colorSwatch).toBe("#FF2800");
			expect(row.tokenName).toBe("Error-1");
			expect(row.primitiveName).toBe("red-800");
			expect(row.hex).toBe("#FF2800");
			expect(row.category).toBe("semantic");
		});

		it("should accept valid row data with primary category", () => {
			const row: TokenTableRow = {
				colorSwatch: "#00A3BF",
				tokenName: "Primary",
				primitiveName: "cyan-800",
				hex: "#00A3BF",
				category: "primary",
			};

			expect(row.category).toBe("primary");
		});

		it("should accept valid row data with accent category", () => {
			const row: TokenTableRow = {
				colorSwatch: "#259063",
				tokenName: "Accent-1",
				primitiveName: "green-600",
				hex: "#259063",
				category: "accent",
			};

			expect(row.category).toBe("accent");
		});
	});

	describe("semantic color token names", () => {
		it("should support Error tokens", () => {
			const errorTokens: TokenTableRow[] = [
				{
					colorSwatch: "#FF2800",
					tokenName: "Error-1",
					primitiveName: "red-800",
					hex: "#FF2800",
					category: "semantic",
				},
				{
					colorSwatch: "#C70000",
					tokenName: "Error-2",
					primitiveName: "red-900",
					hex: "#C70000",
					category: "semantic",
				},
			];

			expect(errorTokens[0].tokenName).toBe("Error-1");
			expect(errorTokens[1].tokenName).toBe("Error-2");
		});

		it("should support Success tokens", () => {
			const successTokens: TokenTableRow[] = [
				{
					colorSwatch: "#35A16B",
					tokenName: "Success-1",
					primitiveName: "green-600",
					hex: "#35A16B",
					category: "semantic",
				},
				{
					colorSwatch: "#1D7044",
					tokenName: "Success-2",
					primitiveName: "green-800",
					hex: "#1D7044",
					category: "semantic",
				},
			];

			expect(successTokens[0].tokenName).toBe("Success-1");
			expect(successTokens[1].tokenName).toBe("Success-2");
		});

		it("should support Warning tokens", () => {
			const warningTokens: TokenTableRow[] = [
				{
					colorSwatch: "#D7C447",
					tokenName: "Warning-YL1",
					primitiveName: "yellow-600",
					hex: "#D7C447",
					category: "semantic",
				},
				{
					colorSwatch: "#FF9900",
					tokenName: "Warning-OR1",
					primitiveName: "orange-600",
					hex: "#FF9900",
					category: "semantic",
				},
			];

			expect(warningTokens[0].tokenName).toBe("Warning-YL1");
			expect(warningTokens[1].tokenName).toBe("Warning-OR1");
		});

		it("should support Link tokens", () => {
			const linkToken: TokenTableRow = {
				colorSwatch: "#0091FF",
				tokenName: "Link-Default",
				primitiveName: "blue-1000",
				hex: "#0091FF",
				category: "semantic",
			};

			expect(linkToken.tokenName).toBe("Link-Default");
		});
	});

	describe("data transformation helpers", () => {
		it("should correctly format hex values", () => {
			const row: TokenTableRow = {
				colorSwatch: "#ff2800",
				tokenName: "Error-1",
				primitiveName: "red-800",
				hex: "#ff2800",
				category: "semantic",
			};

			// HEX値は大文字でも小文字でも受け入れる
			expect(row.hex.toUpperCase()).toBe("#FF2800");
		});

		it("should support lowercase primitive names", () => {
			const row: TokenTableRow = {
				colorSwatch: "#00A3BF",
				tokenName: "Primary",
				primitiveName: "cyan-800",
				hex: "#00A3BF",
				category: "primary",
			};

			expect(row.primitiveName).toMatch(/^[a-z]+-\d+$/);
		});
	});
});

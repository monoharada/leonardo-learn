/**
 * CircularSwatchTransformer関数群のテスト
 *
 * Requirements: 2.1, 2.2, 2.3
 * - ロールラベル短縮名生成（P/S/A/Su/E/W/L等）
 * - 優先ロール選択（Primary > Secondary > Accent > Semantic > Link）
 * - テキスト色自動調整（明るい背景→黒、暗い背景→白）
 */

import { describe, expect, it } from "bun:test";
import type { SemanticRole } from "@/core/semantic-role/types";
import {
	getContrastTextColor,
	getShortLabel,
	ROLE_PRIORITY,
	selectPriorityRole,
} from "./circular-swatch-transformer";

describe("CircularSwatchTransformer", () => {
	describe("getShortLabel", () => {
		it("should return 'P' for primary category", () => {
			const role: SemanticRole = {
				name: "Primary",
				category: "primary",
				fullName: "[Primary] Primary",
				shortLabel: "P",
			};
			expect(getShortLabel(role)).toBe("P");
		});

		it("should return 'S' for secondary category", () => {
			const role: SemanticRole = {
				name: "Secondary",
				category: "secondary",
				fullName: "[Secondary] Secondary",
				shortLabel: "S",
			};
			expect(getShortLabel(role)).toBe("S");
		});

		it("should return 'A' for accent category", () => {
			const role: SemanticRole = {
				name: "Accent-Blue",
				category: "accent",
				fullName: "[Accent] Accent-Blue",
				shortLabel: "A",
			};
			expect(getShortLabel(role)).toBe("A");
		});

		it("should return numbered 'A1', 'A2' for multiple accents", () => {
			const role: SemanticRole = {
				name: "Accent-Blue",
				category: "accent",
				fullName: "[Accent] Accent-Blue",
				shortLabel: "A",
			};
			expect(getShortLabel(role, 0)).toBe("A1");
			expect(getShortLabel(role, 1)).toBe("A2");
			expect(getShortLabel(role, 2)).toBe("A3");
		});

		it("should return 'Su' for success semantic subtype", () => {
			const role: SemanticRole = {
				name: "Success-1",
				category: "semantic",
				semanticSubType: "success",
				fullName: "[Semantic] Success-1",
				shortLabel: "Su",
			};
			expect(getShortLabel(role)).toBe("Su");
		});

		it("should return 'E' for error semantic subtype", () => {
			const role: SemanticRole = {
				name: "Error-1",
				category: "semantic",
				semanticSubType: "error",
				fullName: "[Semantic] Error-1",
				shortLabel: "E",
			};
			expect(getShortLabel(role)).toBe("E");
		});

		it("should return 'W' for warning semantic subtype", () => {
			const role: SemanticRole = {
				name: "Warning-YL1",
				category: "semantic",
				semanticSubType: "warning",
				fullName: "[Semantic] Warning-YL1",
				shortLabel: "W",
			};
			expect(getShortLabel(role)).toBe("W");
		});

		it("should return 'L' for link category", () => {
			const role: SemanticRole = {
				name: "Link-Default",
				category: "link",
				fullName: "[Link] Link-Default",
				shortLabel: "L",
			};
			expect(getShortLabel(role)).toBe("L");
		});
	});

	describe("selectPriorityRole", () => {
		it("should select primary over all other categories", () => {
			const roles: SemanticRole[] = [
				{
					name: "Link-Default",
					category: "link",
					fullName: "[Link] Link-Default",
					shortLabel: "L",
				},
				{
					name: "Primary",
					category: "primary",
					fullName: "[Primary] Primary",
					shortLabel: "P",
				},
				{
					name: "Accent-Blue",
					category: "accent",
					fullName: "[Accent] Accent-Blue",
					shortLabel: "A",
				},
			];

			const priority = selectPriorityRole(roles);
			expect(priority.category).toBe("primary");
		});

		it("should select secondary over accent, semantic, link", () => {
			const roles: SemanticRole[] = [
				{
					name: "Link-Default",
					category: "link",
					fullName: "[Link] Link-Default",
					shortLabel: "L",
				},
				{
					name: "Secondary",
					category: "secondary",
					fullName: "[Secondary] Secondary",
					shortLabel: "S",
				},
				{
					name: "Success-1",
					category: "semantic",
					semanticSubType: "success",
					fullName: "[Semantic] Success-1",
					shortLabel: "Su",
				},
			];

			const priority = selectPriorityRole(roles);
			expect(priority.category).toBe("secondary");
		});

		it("should select accent over semantic and link", () => {
			const roles: SemanticRole[] = [
				{
					name: "Link-Default",
					category: "link",
					fullName: "[Link] Link-Default",
					shortLabel: "L",
				},
				{
					name: "Accent-Blue",
					category: "accent",
					fullName: "[Accent] Accent-Blue",
					shortLabel: "A",
				},
				{
					name: "Success-1",
					category: "semantic",
					semanticSubType: "success",
					fullName: "[Semantic] Success-1",
					shortLabel: "Su",
				},
			];

			const priority = selectPriorityRole(roles);
			expect(priority.category).toBe("accent");
		});

		it("should select semantic over link", () => {
			const roles: SemanticRole[] = [
				{
					name: "Link-Default",
					category: "link",
					fullName: "[Link] Link-Default",
					shortLabel: "L",
				},
				{
					name: "Success-1",
					category: "semantic",
					semanticSubType: "success",
					fullName: "[Semantic] Success-1",
					shortLabel: "Su",
				},
			];

			const priority = selectPriorityRole(roles);
			expect(priority.category).toBe("semantic");
		});

		it("should return first role if only one exists", () => {
			const roles: SemanticRole[] = [
				{
					name: "Link-Default",
					category: "link",
					fullName: "[Link] Link-Default",
					shortLabel: "L",
				},
			];

			const priority = selectPriorityRole(roles);
			expect(priority.name).toBe("Link-Default");
		});

		it("should respect ROLE_PRIORITY order", () => {
			expect(ROLE_PRIORITY).toEqual([
				"primary",
				"secondary",
				"accent",
				"semantic",
				"link",
			]);
		});
	});

	describe("getContrastTextColor", () => {
		it("should return 'black' for light backgrounds", () => {
			expect(getContrastTextColor("#ffffff")).toBe("black");
			expect(getContrastTextColor("#fefefe")).toBe("black");
			expect(getContrastTextColor("#e0e0e0")).toBe("black");
			expect(getContrastTextColor("#ffff00")).toBe("black"); // 黄色（明るい）
		});

		it("should return 'white' for dark backgrounds", () => {
			expect(getContrastTextColor("#000000")).toBe("white");
			expect(getContrastTextColor("#1a1a1a")).toBe("white");
			expect(getContrastTextColor("#333333")).toBe("white");
			expect(getContrastTextColor("#0000ff")).toBe("white"); // 青（暗い）
		});

		it("should handle mid-tone colors", () => {
			// 中間色は4.5:1のコントラスト基準で判定
			const midGray = getContrastTextColor("#808080");
			expect(["black", "white"]).toContain(midGray);
		});
	});
});

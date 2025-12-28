/**
 * CircularSwatchTransformer関数群のテスト
 *
 * Requirements: 2.1, 2.2, 2.3
 * - ロールラベル短縮名生成（P/S/A/Su/E/W/L等）
 * - 優先ロール選択（Primary > Secondary > Accent > Semantic > Link）
 * - テキスト色自動調整（明るい背景→黒、暗い背景→白）
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import type { SemanticRole } from "@/core/semantic-role/types";
import {
	getContrastTextColor,
	getShortLabel,
	ROLE_PRIORITY,
	selectPriorityRole,
	transformToCircle,
	wrapCircularSwatchWithRoleName,
} from "./circular-swatch-transformer";

// JSDOMでdocumentをセットアップ
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement as typeof HTMLElement;

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

	describe("transformToCircle", () => {
		let swatchElement: HTMLElement;

		beforeEach(() => {
			swatchElement = document.createElement("div");
			swatchElement.classList.add("dads-swatch");
			// 背景色をセット
			swatchElement.style.backgroundColor = "#3B82F6";
		});

		it("should add circular class to swatch", () => {
			const role: SemanticRole = {
				name: "Primary",
				category: "primary",
				fullName: "[Primary] Primary",
				shortLabel: "P",
			};

			transformToCircle(swatchElement, role, "#3B82F6");

			expect(swatchElement.classList.contains("dads-swatch--circular")).toBe(
				true,
			);
		});

		it("should add center label with short label text", () => {
			const role: SemanticRole = {
				name: "Primary",
				category: "primary",
				fullName: "[Primary] Primary",
				shortLabel: "P",
			};

			transformToCircle(swatchElement, role, "#3B82F6");

			const label = swatchElement.querySelector(".dads-swatch__role-label");
			expect(label).not.toBeNull();
			expect(label?.textContent).toBe("プライマリ");
		});

		it("should set white text color for dark backgrounds", () => {
			const role: SemanticRole = {
				name: "Primary",
				category: "primary",
				fullName: "[Primary] Primary",
				shortLabel: "P",
			};

			// 暗い背景色
			transformToCircle(swatchElement, role, "#1a1a1a");

			const label = swatchElement.querySelector(
				".dads-swatch__role-label",
			) as HTMLElement;
			expect(label?.style.color).toBe("white");
		});

		it("should set black text color for light backgrounds", () => {
			const role: SemanticRole = {
				name: "Success",
				category: "semantic",
				semanticSubType: "success",
				fullName: "[Semantic] Success",
				shortLabel: "Su",
			};

			// 明るい背景色
			transformToCircle(swatchElement, role, "#ffffff");

			const label = swatchElement.querySelector(
				".dads-swatch__role-label",
			) as HTMLElement;
			expect(label?.style.color).toBe("black");
		});

		it("should display katakana label for semantic error role", () => {
			const role: SemanticRole = {
				name: "Error-1",
				category: "semantic",
				semanticSubType: "error",
				fullName: "[Semantic] Error-1",
				shortLabel: "E",
			};

			transformToCircle(swatchElement, role, "#ff0000");

			const label = swatchElement.querySelector(".dads-swatch__role-label");
			expect(label?.textContent).toBe("エラー");
		});

		it("should display katakana label for warning semantic role", () => {
			const role: SemanticRole = {
				name: "Warning-1",
				category: "semantic",
				semanticSubType: "warning",
				fullName: "[Semantic] Warning-1",
				shortLabel: "W",
			};

			transformToCircle(swatchElement, role, "#ffcc00");

			const label = swatchElement.querySelector(".dads-swatch__role-label");
			expect(label?.textContent).toBe("ワーニング");
		});

		it("should not duplicate labels when called multiple times on same element", () => {
			const role1: SemanticRole = {
				name: "Primary",
				category: "primary",
				fullName: "[Primary] Primary",
				shortLabel: "P",
			};

			const role2: SemanticRole = {
				name: "Secondary",
				category: "secondary",
				fullName: "[Secondary] Secondary",
				shortLabel: "S",
			};

			// 1回目の適用
			transformToCircle(swatchElement, role1, "#3B82F6");
			expect(
				swatchElement.querySelectorAll(".dads-swatch__role-label").length,
			).toBe(1);
			expect(
				swatchElement.querySelector(".dads-swatch__role-label")?.textContent,
			).toBe("プライマリ");

			// 2回目の適用（ラベルが重複せず更新されること）
			transformToCircle(swatchElement, role2, "#8B5CF6");
			expect(
				swatchElement.querySelectorAll(".dads-swatch__role-label").length,
			).toBe(1);
			expect(
				swatchElement.querySelector(".dads-swatch__role-label")?.textContent,
			).toBe("セカンダリ");

			// 3回目の適用も確認
			transformToCircle(swatchElement, role1, "#3B82F6");
			expect(
				swatchElement.querySelectorAll(".dads-swatch__role-label").length,
			).toBe(1);
		});

		it("should set color on scale/hex labels", () => {
			const role: SemanticRole = {
				name: "Primary",
				category: "primary",
				fullName: "[Primary] Primary",
				shortLabel: "P",
			};

			// スケールラベルとHEXラベルを追加
			const scaleLabel = document.createElement("span");
			scaleLabel.className = "dads-swatch__scale";
			swatchElement.appendChild(scaleLabel);

			const hexLabel = document.createElement("span");
			hexLabel.className = "dads-swatch__hex";
			swatchElement.appendChild(hexLabel);

			// 暗い背景色
			transformToCircle(swatchElement, role, "#1a1a1a");

			// scale/hexラベルの色が設定されていることを確認
			expect(scaleLabel.style.color).toBe("white");
			expect(hexLabel.style.color).toBe("white");
		});
	});

	describe("wrapCircularSwatchWithRoleName", () => {
		let swatchElement: HTMLElement;
		let parentElement: HTMLElement;

		beforeEach(() => {
			parentElement = document.createElement("div");
			swatchElement = document.createElement("div");
			swatchElement.classList.add("dads-swatch", "dads-swatch--circular");
			parentElement.appendChild(swatchElement);
		});

		it("should wrap swatch in a wrapper element", () => {
			const role: SemanticRole = {
				name: "Accent-Blue",
				category: "accent",
				fullName: "[Accent] Accent-Blue",
				shortLabel: "A",
			};

			const wrapper = wrapCircularSwatchWithRoleName(swatchElement, role);

			expect(wrapper.classList.contains("dads-swatch--circular-wrapper")).toBe(
				true,
			);
			expect(wrapper.contains(swatchElement)).toBe(true);
		});

		it("should add role name label below swatch", () => {
			const role: SemanticRole = {
				name: "Link-Default",
				category: "link",
				fullName: "[Link] Link-Default",
				shortLabel: "L",
			};

			const wrapper = wrapCircularSwatchWithRoleName(swatchElement, role);
			const roleNameLabel = wrapper.querySelector(".dads-swatch__role-name");

			expect(roleNameLabel).not.toBeNull();
			expect(roleNameLabel?.textContent).toBe("Link-Default");
			expect(roleNameLabel?.getAttribute("title")).toBe("[Link] Link-Default");
		});

		it("should insert wrapper at swatch position in parent", () => {
			const role: SemanticRole = {
				name: "Primary",
				category: "primary",
				fullName: "[Primary] Primary",
				shortLabel: "P",
			};

			const wrapper = wrapCircularSwatchWithRoleName(swatchElement, role);

			// wrapperはparentElementの子になっている
			expect(parentElement.contains(wrapper)).toBe(true);
			// swatchElementはwrapperの子になっている
			expect(wrapper.contains(swatchElement)).toBe(true);
		});
	});
});

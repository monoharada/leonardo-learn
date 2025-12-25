/**
 * ExternalRoleInfoBar関数群のテスト
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 * - ロールバッジ要素生成
 * - ロール情報要素生成
 * - 未解決ロールバー生成
 */

import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";

// JSDOMでdocumentをセットアップ
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement as typeof HTMLElement;

import type { SemanticRole } from "@/core/semantic-role/types";
import {
	createRoleBadge,
	createRoleInfoElement,
	ROLE_CATEGORY_COLORS,
	type RoleInfoItem,
	renderConnector,
	renderUnresolvedRolesBar,
	type UnresolvedRoleItem,
} from "./external-role-info-bar";

describe("ExternalRoleInfoBar", () => {
	describe("ROLE_CATEGORY_COLORS", () => {
		it("should have color for each category", () => {
			expect(ROLE_CATEGORY_COLORS.primary).toBeDefined();
			expect(ROLE_CATEGORY_COLORS.secondary).toBeDefined();
			expect(ROLE_CATEGORY_COLORS.accent).toBeDefined();
			expect(ROLE_CATEGORY_COLORS.semantic).toBeDefined();
			expect(ROLE_CATEGORY_COLORS.link).toBeDefined();
		});

		it("should have hex color format", () => {
			const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
			expect(ROLE_CATEGORY_COLORS.primary).toMatch(hexColorRegex);
			expect(ROLE_CATEGORY_COLORS.secondary).toMatch(hexColorRegex);
			expect(ROLE_CATEGORY_COLORS.accent).toMatch(hexColorRegex);
			expect(ROLE_CATEGORY_COLORS.semantic).toMatch(hexColorRegex);
			expect(ROLE_CATEGORY_COLORS.link).toMatch(hexColorRegex);
		});
	});

	describe("createRoleBadge", () => {
		it("should create badge element with role name", () => {
			const role: SemanticRole = {
				name: "Primary",
				category: "primary",
				fullName: "[Primary] Primary",
				shortLabel: "P",
			};

			const badge = createRoleBadge(role);

			expect(badge.tagName.toLowerCase()).toBe("span");
			expect(badge.classList.contains("dads-role-badge")).toBe(true);
			expect(badge.textContent).toBe("Primary");
		});

		it("should include scale in text content when provided", () => {
			const role: SemanticRole = {
				name: "Success-1",
				category: "semantic",
				semanticSubType: "success",
				fullName: "[Semantic] Success-1",
				shortLabel: "Su",
			};

			const badge = createRoleBadge(role, 600);

			expect(badge.textContent).toBe("Success-1 (600)");
		});

		it("should apply category background color", () => {
			const role: SemanticRole = {
				name: "Secondary",
				category: "secondary",
				fullName: "[Secondary] Secondary",
				shortLabel: "S",
			};

			const badge = createRoleBadge(role);

			// JSDOMはhexをrgbに変換するため、rgb形式でチェック
			// #7B1FA2 = rgb(123, 31, 162)
			expect(badge.style.backgroundColor).toBe("rgb(123, 31, 162)");
		});

		it("should have white text color", () => {
			const role: SemanticRole = {
				name: "Accent-Blue",
				category: "accent",
				fullName: "[Accent] Accent-Blue",
				shortLabel: "A",
			};

			const badge = createRoleBadge(role);

			expect(badge.style.color).toBe("white");
		});

		it("should have data-category attribute", () => {
			const role: SemanticRole = {
				name: "Link-Default",
				category: "link",
				fullName: "[Link] Link-Default",
				shortLabel: "L",
			};

			const badge = createRoleBadge(role);

			expect(badge.dataset.category).toBe("link");
		});
	});

	describe("createRoleInfoElement", () => {
		let mockSwatchElement: HTMLElement;

		beforeEach(() => {
			mockSwatchElement = document.createElement("div");
			mockSwatchElement.className = "dads-swatch";
		});

		it("should create info element with dads-role-info-item class", () => {
			const item: RoleInfoItem = {
				role: {
					name: "Primary",
					category: "primary",
					fullName: "[Primary] Primary",
					shortLabel: "P",
				},
				scale: 500,
				swatchElement: mockSwatchElement,
			};

			const element = createRoleInfoElement(item);

			expect(element.tagName.toLowerCase()).toBe("div");
			expect(element.classList.contains("dads-role-info-item")).toBe(true);
		});

		it("should contain role badge with scale", () => {
			const item: RoleInfoItem = {
				role: {
					name: "Error-1",
					category: "semantic",
					semanticSubType: "error",
					fullName: "[Semantic] Error-1",
					shortLabel: "E",
				},
				scale: 700,
				swatchElement: mockSwatchElement,
			};

			const element = createRoleInfoElement(item);
			const badge = element.querySelector(".dads-role-badge");

			expect(badge).not.toBeNull();
			expect(badge?.textContent).toBe("Error-1 (700)");
		});

		it("should have data-scale attribute", () => {
			const item: RoleInfoItem = {
				role: {
					name: "Accent-Blue",
					category: "accent",
					fullName: "[Accent] Accent-Blue",
					shortLabel: "A",
				},
				scale: 400,
				swatchElement: mockSwatchElement,
			};

			const element = createRoleInfoElement(item);

			expect(element.dataset.scale).toBe("400");
		});
	});

	describe("renderUnresolvedRolesBar", () => {
		it("should return null for empty array", () => {
			const result = renderUnresolvedRolesBar([]);

			expect(result).toBeNull();
		});

		it("should create bar with dads-unresolved-roles-bar class", () => {
			const items: UnresolvedRoleItem[] = [
				{
					role: {
						name: "Primary",
						category: "primary",
						fullName: "[Primary] Primary",
						shortLabel: "P",
					},
				},
			];

			const bar = renderUnresolvedRolesBar(items);

			expect(bar).not.toBeNull();
			expect(bar?.classList.contains("dads-unresolved-roles-bar")).toBe(true);
		});

		it("should have label element", () => {
			const items: UnresolvedRoleItem[] = [
				{
					role: {
						name: "Secondary",
						category: "secondary",
						fullName: "[Secondary] Secondary",
						shortLabel: "S",
					},
				},
			];

			const bar = renderUnresolvedRolesBar(items);
			const label = bar?.querySelector(".dads-unresolved-roles-bar__label");

			expect(label).not.toBeNull();
			expect(label?.textContent).toBe("未解決ロール:");
		});

		it("should contain badges for each role", () => {
			const items: UnresolvedRoleItem[] = [
				{
					role: {
						name: "Primary",
						category: "primary",
						fullName: "[Primary] Primary",
						shortLabel: "P",
					},
				},
				{
					role: {
						name: "Secondary",
						category: "secondary",
						fullName: "[Secondary] Secondary",
						shortLabel: "S",
					},
				},
			];

			const bar = renderUnresolvedRolesBar(items);
			const badges = bar?.querySelectorAll(".dads-role-badge");

			expect(badges?.length).toBe(2);
		});

		it("should create badges without scale", () => {
			const items: UnresolvedRoleItem[] = [
				{
					role: {
						name: "Primary",
						category: "primary",
						fullName: "[Primary] Primary",
						shortLabel: "P",
					},
				},
			];

			const bar = renderUnresolvedRolesBar(items);
			const badge = bar?.querySelector(".dads-role-badge");

			// scaleがないので括弧なし
			expect(badge?.textContent).toBe("Primary");
		});
	});

	describe("renderConnector", () => {
		let mockSwatchElement: HTMLElement;
		let mockInfoElement: HTMLElement;

		beforeEach(() => {
			mockSwatchElement = document.createElement("div");
			mockSwatchElement.className = "dads-swatch";

			mockInfoElement = document.createElement("div");
			mockInfoElement.className = "dads-role-info-item";
		});

		it("should create connector element with dads-role-connector class", () => {
			const connector = renderConnector(mockSwatchElement, mockInfoElement);

			expect(connector.tagName.toLowerCase()).toBe("div");
			expect(connector.classList.contains("dads-role-connector")).toBe(true);
		});

		it("should have data-testid attribute", () => {
			const connector = renderConnector(mockSwatchElement, mockInfoElement);

			expect(connector.dataset.testid).toBe("role-connector");
		});

		it("should be styled as vertical line", () => {
			const connector = renderConnector(mockSwatchElement, mockInfoElement);

			// コネクタは縦線として表示（幅1px）
			expect(connector.style.width).toBe("1px");
		});

		it("should have gray background color", () => {
			const connector = renderConnector(mockSwatchElement, mockInfoElement);

			// グレー系の背景色
			expect(connector.style.backgroundColor).toBeTruthy();
		});
	});
});

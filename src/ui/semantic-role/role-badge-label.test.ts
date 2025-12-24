/**
 * RoleBadgeLabel関数群のテスト
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 4.2, 4.3
 * - バッジラベル下部配置
 * - バッジ情報内容（ロール名・カテゴリ色）
 * - バッジスタイル（9px, 600, 3px角丸）
 * - 複数ロール縦スタック（最大2つ+「+N」）
 * - pointer-events無効化
 */

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// JSDOMでdocumentをセットアップ
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;

import type { RoleCategory, SemanticRole } from "@/core/semantic-role/types";
import {
	createOverflowBadge,
	createRoleBadges,
	createSingleBadge,
} from "./role-badge-label";

describe("RoleBadgeLabel", () => {
	describe("createSingleBadge", () => {
		const testRole: SemanticRole = {
			name: "Primary",
			category: "primary",
			fullName: "[Primary] Primary",
		};

		it("should create a span element for badge", () => {
			const badge = createSingleBadge(testRole);

			expect(badge).toBeInstanceOf(HTMLElement);
			expect(badge.tagName).toBe("SPAN");
		});

		it("should display the role name as text content", () => {
			const badge = createSingleBadge(testRole);

			expect(badge.textContent).toBe("Primary");
		});

		it("should have font-size: 9px", () => {
			const badge = createSingleBadge(testRole);

			expect(badge.style.fontSize).toBe("9px");
		});

		it("should have font-weight: 600 (semi-bold)", () => {
			const badge = createSingleBadge(testRole);

			expect(badge.style.fontWeight).toBe("600");
		});

		it("should have border-radius: 3px", () => {
			const badge = createSingleBadge(testRole);

			expect(badge.style.borderRadius).toBe("3px");
		});

		it("should have white text color", () => {
			const badge = createSingleBadge(testRole);

			// JSDOMはwhiteをrgb(255, 255, 255)に変換する可能性がある
			const color = badge.style.color;
			expect(color === "white" || color === "rgb(255, 255, 255)").toBe(true);
		});

		it("should have padding: 1px 4px", () => {
			const badge = createSingleBadge(testRole);

			expect(badge.style.padding).toBe("1px 4px");
		});

		it("should have max-width: 60px for text truncation", () => {
			const badge = createSingleBadge(testRole);

			expect(badge.style.maxWidth).toBe("60px");
		});

		it("should have overflow: hidden for truncation", () => {
			const badge = createSingleBadge(testRole);

			expect(badge.style.overflow).toBe("hidden");
		});

		it("should have text-overflow: ellipsis for truncation", () => {
			const badge = createSingleBadge(testRole);

			expect(badge.style.textOverflow).toBe("ellipsis");
		});

		it("should have white-space: nowrap to prevent wrapping", () => {
			const badge = createSingleBadge(testRole);

			expect(badge.style.whiteSpace).toBe("nowrap");
		});

		it("should apply category-specific background color", () => {
			const categories: RoleCategory[] = [
				"primary",
				"secondary",
				"accent",
				"semantic",
				"link",
			];

			for (const category of categories) {
				const role: SemanticRole = {
					name: "Test",
					category,
					fullName: `[${category}] Test`,
				};
				const badge = createSingleBadge(role);

				expect(badge.style.backgroundColor).toBeTruthy();
			}
		});
	});

	describe("createOverflowBadge", () => {
		it("should create a span element", () => {
			const badge = createOverflowBadge(3);

			expect(badge).toBeInstanceOf(HTMLElement);
			expect(badge.tagName).toBe("SPAN");
		});

		it("should display '+N' format for remaining roles", () => {
			const badge = createOverflowBadge(3);

			expect(badge.textContent).toBe("+3");
		});

		it("should display '+1' for a single remaining role", () => {
			const badge = createOverflowBadge(1);

			expect(badge.textContent).toBe("+1");
		});

		it("should have gray background", () => {
			const badge = createOverflowBadge(2);

			// グレー系の背景色
			expect(badge.style.backgroundColor).toBeTruthy();
		});

		it("should have same styling as regular badges", () => {
			const badge = createOverflowBadge(5);

			expect(badge.style.fontSize).toBe("9px");
			expect(badge.style.fontWeight).toBe("600");
			expect(badge.style.borderRadius).toBe("3px");
		});
	});

	describe("createRoleBadges", () => {
		it("should create a container element", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];
			const container = createRoleBadges(roles);

			expect(container).toBeInstanceOf(HTMLElement);
			expect(container.tagName).toBe("DIV");
		});

		it("should have position: absolute for overlay", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];
			const container = createRoleBadges(roles);

			expect(container.style.position).toBe("absolute");
		});

		it("should be positioned at bottom: 4px, left: 4px", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];
			const container = createRoleBadges(roles);

			expect(container.style.bottom).toBe("4px");
			expect(container.style.left).toBe("4px");
		});

		it("should have pointer-events: none", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];
			const container = createRoleBadges(roles);

			expect(container.style.pointerEvents).toBe("none");
		});

		it("should have z-index: 10", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];
			const container = createRoleBadges(roles);

			expect(container.style.zIndex).toBe("10");
		});

		it("should use flexbox column for vertical stacking", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];
			const container = createRoleBadges(roles);

			expect(container.style.display).toBe("flex");
			expect(container.style.flexDirection).toBe("column");
		});

		it("should have gap: 2px between badges", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];
			const container = createRoleBadges(roles);

			expect(container.style.gap).toBe("2px");
		});

		it("should display 1 badge for 1 role", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];
			const container = createRoleBadges(roles);

			expect(container.children.length).toBe(1);
		});

		it("should display 2 badges for 2 roles", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
				{
					name: "Secondary",
					category: "secondary",
					fullName: "[Secondary] Secondary",
				},
			];
			const container = createRoleBadges(roles);

			expect(container.children.length).toBe(2);
		});

		it("should display 2 badges + overflow for 3 or more roles", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
				{
					name: "Secondary",
					category: "secondary",
					fullName: "[Secondary] Secondary",
				},
				{ name: "Accent", category: "accent", fullName: "[Accent] Accent" },
			];
			const container = createRoleBadges(roles);

			// 2 regular badges + 1 overflow badge
			expect(container.children.length).toBe(3);

			// Last child should be overflow badge with "+1"
			const lastChild = container.lastElementChild;
			expect(lastChild?.textContent).toBe("+1");
		});

		it("should display '+3' for 5 roles (2 shown + 3 hidden)", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
				{
					name: "Secondary",
					category: "secondary",
					fullName: "[Secondary] Secondary",
				},
				{ name: "Accent", category: "accent", fullName: "[Accent] Accent" },
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
				},
				{ name: "Error", category: "semantic", fullName: "[Semantic] Error" },
			];
			const container = createRoleBadges(roles);

			expect(container.children.length).toBe(3);

			const lastChild = container.lastElementChild;
			expect(lastChild?.textContent).toBe("+3");
		});

		it("should return null for empty roles array", () => {
			const roles: SemanticRole[] = [];
			const result = createRoleBadges(roles);

			expect(result).toBeNull();
		});

		it("should have data-semantic-role-badges attribute for identification", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];
			const container = createRoleBadges(roles);

			expect(container.dataset.semanticRoleBadges).toBe("true");
		});
	});
});

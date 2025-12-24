/**
 * RoleDotIndicator関数のテスト
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 4.2, 4.3
 * - 円形ドット右上配置
 * - カテゴリ別ドット色
 * - ドットの視認性確保（境界線・シャドウ）
 * - pointer-events無効化
 */

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// JSDOMでdocumentをセットアップ
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;

import type { RoleCategory } from "@/core/semantic-role/types";
import { createRoleDot, ROLE_CATEGORY_COLORS } from "./role-dot-indicator";

describe("RoleDotIndicator", () => {
	describe("ROLE_CATEGORY_COLORS", () => {
		it("should define color for primary category as indigo (#6366f1)", () => {
			expect(ROLE_CATEGORY_COLORS.primary).toBe("#6366f1");
		});

		it("should define color for secondary category as purple (#8b5cf6)", () => {
			expect(ROLE_CATEGORY_COLORS.secondary).toBe("#8b5cf6");
		});

		it("should define color for accent category as pink (#ec4899)", () => {
			expect(ROLE_CATEGORY_COLORS.accent).toBe("#ec4899");
		});

		it("should define color for semantic category as emerald (#10b981)", () => {
			expect(ROLE_CATEGORY_COLORS.semantic).toBe("#10b981");
		});

		it("should define color for link category as blue (#3b82f6)", () => {
			expect(ROLE_CATEGORY_COLORS.link).toBe("#3b82f6");
		});
	});

	describe("createRoleDot", () => {
		const categories: RoleCategory[] = [
			"primary",
			"secondary",
			"accent",
			"semantic",
			"link",
		];

		for (const category of categories) {
			it(`should create a dot element for ${category} category`, () => {
				const dot = createRoleDot(category);

				expect(dot).toBeInstanceOf(HTMLElement);
				expect(dot.tagName).toBe("SPAN");
			});

			it(`should apply correct background color for ${category} category`, () => {
				const dot = createRoleDot(category);
				const expectedColor = ROLE_CATEGORY_COLORS[category];

				// JSDOMはHEXをRGBに変換するため、どちらかでマッチすればOK
				const bgColor = dot.style.backgroundColor;
				const hexToRgb = (hex: string): string => {
					const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
					if (!result) return "";
					const r = Number.parseInt(result[1] ?? "0", 16);
					const g = Number.parseInt(result[2] ?? "0", 16);
					const b = Number.parseInt(result[3] ?? "0", 16);
					return `rgb(${r}, ${g}, ${b})`;
				};
				expect(
					bgColor === expectedColor || bgColor === hexToRgb(expectedColor),
				).toBe(true);
			});
		}

		it("should have 12px width and height (circle)", () => {
			const dot = createRoleDot("primary");

			expect(dot.style.width).toBe("12px");
			expect(dot.style.height).toBe("12px");
		});

		it("should have border-radius 50% for circle shape", () => {
			const dot = createRoleDot("primary");

			expect(dot.style.borderRadius).toBe("50%");
		});

		it("should have position absolute for overlay positioning", () => {
			const dot = createRoleDot("primary");

			expect(dot.style.position).toBe("absolute");
		});

		it("should be positioned at top: 4px, right: 4px", () => {
			const dot = createRoleDot("primary");

			expect(dot.style.top).toBe("4px");
			expect(dot.style.right).toBe("4px");
		});

		it("should have white border (2px) for visibility", () => {
			const dot = createRoleDot("primary");

			expect(dot.style.border).toBe("2px solid white");
		});

		it("should have box-shadow for visibility on various backgrounds", () => {
			const dot = createRoleDot("primary");

			expect(dot.style.boxShadow).toBeTruthy();
			expect(dot.style.boxShadow).toContain("rgba(0, 0, 0");
		});

		it("should have pointer-events: none to not block interactions", () => {
			const dot = createRoleDot("primary");

			expect(dot.style.pointerEvents).toBe("none");
		});

		it("should have z-index: 10 to be above existing badges", () => {
			const dot = createRoleDot("primary");

			expect(dot.style.zIndex).toBe("10");
		});

		it("should have data-semantic-role-dot attribute for identification", () => {
			const dot = createRoleDot("primary");

			expect(dot.dataset.semanticRoleDot).toBe("true");
		});
	});
});

/**
 * SemanticRoleOverlay テスト
 *
 * オーバーレイ統括コンポーネントのテスト
 * Requirements: 4.1, 4.2, 5.2
 */

import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";

// JSDOMでdocumentをセットアップ
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;

import type { SemanticRole } from "@/core/semantic-role/types";
import type { DadsColorHue } from "@/core/tokens/types";
import {
	applyOverlay,
	createAccessibleDescription,
	createAccessibleDescriptionElement,
	mergeTooltipContent,
} from "./semantic-role-overlay";

describe("SemanticRoleOverlay", () => {
	let swatchElement: HTMLElement;

	beforeEach(() => {
		// DOM環境のセットアップ
		swatchElement = document.createElement("div");
		swatchElement.classList.add("dads-swatch");
		swatchElement.setAttribute("title", "#3B82F6 - Blue 500");
		document.body.appendChild(swatchElement);
	});

	describe("applyOverlay", () => {
		it("ロール配列が空の場合、オーバーレイを追加しない", () => {
			const roles: SemanticRole[] = [];

			applyOverlay(swatchElement, "blue" as DadsColorHue, 500, roles);

			// ドットとバッジが追加されていないことを確認
			expect(
				swatchElement.querySelector("[data-semantic-role-dot]"),
			).toBeNull();
			expect(
				swatchElement.querySelector("[data-semantic-role-badges]"),
			).toBeNull();
			// title属性は変更されていないこと
			expect(swatchElement.getAttribute("title")).toBe("#3B82F6 - Blue 500");
		});

		it("ロールが存在する場合、ドットインジケーターを追加する", () => {
			const roles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
				},
			];

			applyOverlay(swatchElement, "green" as DadsColorHue, 600, roles);

			const dot = swatchElement.querySelector("[data-semantic-role-dot]");
			expect(dot).not.toBeNull();
		});

		it("ロールが存在する場合、バッジコンテナを追加する", () => {
			const roles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
				},
			];

			applyOverlay(swatchElement, "green" as DadsColorHue, 600, roles);

			const badges = swatchElement.querySelector("[data-semantic-role-badges]");
			expect(badges).not.toBeNull();
		});

		it("スウォッチにtabindex='0'を設定する", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];

			applyOverlay(swatchElement, "blue" as DadsColorHue, 500, roles);

			expect(swatchElement.getAttribute("tabindex")).toBe("0");
		});

		it("スウォッチのposition:relativeを設定する（オーバーレイの基準点）", () => {
			const roles: SemanticRole[] = [
				{ name: "Link", category: "link", fullName: "[Link] Link" },
			];

			applyOverlay(swatchElement, "blue" as DadsColorHue, 600, roles);

			expect(swatchElement.style.position).toBe("relative");
		});

		it("ブランドスウォッチの場合、isBrand=trueでaria-describedbyを設定する", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
				{
					name: "Secondary",
					category: "secondary",
					fullName: "[Secondary] Secondary",
				},
			];

			applyOverlay(swatchElement, undefined, undefined, roles, true);

			expect(swatchElement.getAttribute("aria-describedby")).toBe(
				"swatch-brand-desc",
			);
		});

		it("DADSスウォッチの場合、適切なaria-describedby IDを設定する", () => {
			const roles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
				},
			];

			applyOverlay(swatchElement, "green" as DadsColorHue, 600, roles);

			expect(swatchElement.getAttribute("aria-describedby")).toBe(
				"swatch-green-600-desc",
			);
		});
	});

	describe("mergeTooltipContent", () => {
		it("既存のtitleとロール情報を正しく結合する", () => {
			const existingTitle = "#3B82F6 - Blue 500";
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];

			const result = mergeTooltipContent(existingTitle, roles);

			expect(result).toBe(
				"#3B82F6 - Blue 500\n---\nセマンティックロール:\n[Primary] Primary",
			);
		});

		it("複数のロールがある場合、すべてのロール情報を含める", () => {
			const existingTitle = "#3B82F6 - Blue 500";
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
				{ name: "Link", category: "link", fullName: "[Link] Link" },
			];

			const result = mergeTooltipContent(existingTitle, roles);

			expect(result).toContain("[Primary] Primary");
			expect(result).toContain("[Link] Link");
		});

		it("ロール配列が空の場合、既存のtitleをそのまま返す", () => {
			const existingTitle = "#3B82F6 - Blue 500";
			const roles: SemanticRole[] = [];

			const result = mergeTooltipContent(existingTitle, roles);

			expect(result).toBe(existingTitle);
		});

		it("既存のtitleが空の場合でも、ロール情報を正しく表示する", () => {
			const existingTitle = "";
			const roles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
				},
			];

			const result = mergeTooltipContent(existingTitle, roles);

			expect(result).toBe("\n---\nセマンティックロール:\n[Semantic] Success");
		});
	});

	describe("createAccessibleDescription", () => {
		it("DADSシェードの場合、正しいID形式を生成する（swatch-{hue}-{scale}-desc）", () => {
			const dadsHue = "blue" as DadsColorHue;
			const scale = 600;
			const roles: SemanticRole[] = [
				{ name: "Link", category: "link", fullName: "[Link] Link" },
			];

			const id = createAccessibleDescription(dadsHue, scale, roles);

			expect(id).toBe("swatch-blue-600-desc");
		});

		it("ブランドロールの場合、正しいID形式を生成する（swatch-brand-desc）", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];

			const id = createAccessibleDescription(undefined, undefined, roles, true);

			expect(id).toBe("swatch-brand-desc");
		});

		it("light-blueなどのハイフン含みのhueも正しく処理する", () => {
			const dadsHue = "light-blue" as DadsColorHue;
			const scale = 500;
			const roles: SemanticRole[] = [
				{ name: "Link", category: "link", fullName: "[Link] Link" },
			];

			const id = createAccessibleDescription(dadsHue, scale, roles);

			expect(id).toBe("swatch-light-blue-500-desc");
		});
	});

	describe("createAccessibleDescriptionElement", () => {
		it("正しいID属性を持つspan要素を生成する", () => {
			const dadsHue = "green" as DadsColorHue;
			const scale = 600;
			const roles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
				},
			];

			const element = createAccessibleDescriptionElement(dadsHue, scale, roles);

			expect(element.id).toBe("swatch-green-600-desc");
			expect(element.tagName.toLowerCase()).toBe("span");
		});

		it("スクリーンリーダー専用のスタイルを適用する（視覚的に非表示）", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];

			const element = createAccessibleDescriptionElement(
				"blue" as DadsColorHue,
				500,
				roles,
			);

			// sr-only相当のスタイルが適用されていること
			expect(element.style.position).toBe("absolute");
			expect(element.style.width).toBe("1px");
			expect(element.style.height).toBe("1px");
			expect(element.style.overflow).toBe("hidden");
		});

		it("ロール情報を含むテキストコンテンツを設定する", () => {
			const roles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
				},
				{
					name: "Warning",
					category: "semantic",
					fullName: "[Semantic] Warning",
				},
			];

			const element = createAccessibleDescriptionElement(
				"green" as DadsColorHue,
				600,
				roles,
			);

			expect(element.textContent).toContain("[Semantic] Success");
			expect(element.textContent).toContain("[Semantic] Warning");
		});

		it("ブランドロールの場合、brand IDで生成する", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];

			const element = createAccessibleDescriptionElement(
				undefined,
				undefined,
				roles,
				true,
			);

			expect(element.id).toBe("swatch-brand-desc");
		});
	});
});

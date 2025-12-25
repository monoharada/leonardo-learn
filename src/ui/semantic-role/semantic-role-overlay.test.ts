/**
 * SemanticRoleOverlay テスト
 *
 * オーバーレイ統括コンポーネントのテスト
 * Requirements: 4.1, 4.2, 5.2
 */

import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

	afterEach(() => {
		// DOM要素のクリーンアップ
		document.body.innerHTML = "";
	});

	describe("applyOverlay", () => {
		it("ロール配列が空の場合、オーバーレイを追加しない", () => {
			const roles: SemanticRole[] = [];

			applyOverlay(
				swatchElement,
				"blue" as DadsColorHue,
				500,
				roles,
				false,
				"#3B82F6",
			);

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

		// Task 10.1: 旧テストを新UI仕様に更新
		// 旧「ドットインジケーター追加」「バッジコンテナ追加」テストは廃止
		// 代わりに新UI「円形スウォッチ」「中央ラベル」テストで検証

		it("スウォッチにtabindex='0'を設定する", () => {
			const roles: SemanticRole[] = [
				{
					name: "Primary",
					category: "primary",
					fullName: "[Primary] Primary",
					shortLabel: "P",
				},
			];

			applyOverlay(
				swatchElement,
				"blue" as DadsColorHue,
				500,
				roles,
				false,
				"#3B82F6",
			);

			expect(swatchElement.getAttribute("tabindex")).toBe("0");
		});

		it("スウォッチのposition:relativeを設定する（オーバーレイの基準点）", () => {
			const roles: SemanticRole[] = [
				{
					name: "Link",
					category: "link",
					fullName: "[Link] Link",
					shortLabel: "L",
				},
			];

			applyOverlay(
				swatchElement,
				"blue" as DadsColorHue,
				600,
				roles,
				false,
				"#2563EB",
			);

			expect(swatchElement.style.position).toBe("relative");
		});

		it("hue-scale特定不可のブランドスウォッチの場合、aria-describedbyを設定しない", () => {
			const roles: SemanticRole[] = [
				{
					name: "Primary",
					category: "primary",
					fullName: "[Primary] Primary",
					shortLabel: "P",
				},
				{
					name: "Secondary",
					category: "secondary",
					fullName: "[Secondary] Secondary",
					shortLabel: "S",
				},
			];

			applyOverlay(swatchElement, undefined, undefined, roles, true, "#3B82F6");

			// hue-scale特定不可の場合はaria-describedbyを設定しない
			expect(swatchElement.getAttribute("aria-describedby")).toBeNull();
		});

		it("DADSスウォッチの場合、適切なaria-describedby IDを設定する", () => {
			const roles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
					shortLabel: "Su",
				},
			];

			applyOverlay(
				swatchElement,
				"green" as DadsColorHue,
				600,
				roles,
				false,
				"#22C55E",
			);

			expect(swatchElement.getAttribute("aria-describedby")).toBe(
				"swatch-green-600-desc",
			);
		});

		it("同一スウォッチに対して再実行しても、ARIA説明要素が重複しない", () => {
			const roles1: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
					shortLabel: "Su",
				},
			];
			const roles2: SemanticRole[] = [
				{
					name: "Error",
					category: "semantic",
					fullName: "[Semantic] Error",
					shortLabel: "E",
				},
			];

			// 1回目のapplyOverlay
			applyOverlay(
				swatchElement,
				"green" as DadsColorHue,
				600,
				roles1,
				false,
				"#22C55E",
			);

			// 2回目のapplyOverlay（同じスウォッチに再実行）
			applyOverlay(
				swatchElement,
				"green" as DadsColorHue,
				600,
				roles2,
				false,
				"#22C55E",
			);

			// 説明要素は1つのみ存在する（重複しない）
			const descElements = document.querySelectorAll("#swatch-green-600-desc");
			expect(descElements.length).toBe(1);

			// 最新のロール情報が反映されている
			expect(descElements[0]?.textContent).toContain("[Semantic] Error");
		});

		// Task 10.1: 新UIコンポーネントへの切り替えテスト
		it("【新UI】旧ドット・バッジが表示されないこと", () => {
			const roles: SemanticRole[] = [
				{
					name: "Primary",
					category: "primary",
					fullName: "[Primary] Primary",
					shortLabel: "P",
				},
			];

			applyOverlay(
				swatchElement,
				"blue" as DadsColorHue,
				600,
				roles,
				false,
				"#3B82F6",
			);

			// 旧RoleDotIndicatorが追加されていないことを確認
			expect(
				swatchElement.querySelector("[data-semantic-role-dot]"),
			).toBeNull();
			// 旧RoleBadgeLabelが追加されていないことを確認
			expect(
				swatchElement.querySelector("[data-semantic-role-badges]"),
			).toBeNull();
		});

		it("【新UI】円形スウォッチクラスが追加されること", () => {
			const roles: SemanticRole[] = [
				{
					name: "Primary",
					category: "primary",
					fullName: "[Primary] Primary",
					shortLabel: "P",
				},
			];

			applyOverlay(
				swatchElement,
				"blue" as DadsColorHue,
				600,
				roles,
				false,
				"#3B82F6",
			);

			expect(swatchElement.classList.contains("dads-swatch--circular")).toBe(
				true,
			);
		});

		it("【新UI】円形スウォッチ中央にラベルが表示されること", () => {
			const roles: SemanticRole[] = [
				{
					name: "Primary",
					category: "primary",
					fullName: "[Primary] Primary",
					shortLabel: "P",
				},
			];

			applyOverlay(
				swatchElement,
				"blue" as DadsColorHue,
				600,
				roles,
				false,
				"#3B82F6",
			);

			const label = swatchElement.querySelector(".dads-swatch__role-label");
			expect(label).not.toBeNull();
			expect(label?.textContent).toBe("P");
		});

		it("【新UI】複数ロール時、優先度最高のロールラベルが表示されること", () => {
			const roles: SemanticRole[] = [
				{
					name: "Link",
					category: "link",
					fullName: "[Link] Link",
					shortLabel: "L",
				},
				{
					name: "Primary",
					category: "primary",
					fullName: "[Primary] Primary",
					shortLabel: "P",
				},
			];

			applyOverlay(
				swatchElement,
				"blue" as DadsColorHue,
				600,
				roles,
				false,
				"#3B82F6",
			);

			const label = swatchElement.querySelector(".dads-swatch__role-label");
			expect(label?.textContent).toBe("P"); // Primary > Link
		});

		it("【新UI】明るい背景では黒文字ラベルになること", () => {
			const roles: SemanticRole[] = [
				{
					name: "Primary",
					category: "primary",
					fullName: "[Primary] Primary",
					shortLabel: "P",
				},
			];

			// 明るい背景色（白に近い）
			applyOverlay(
				swatchElement,
				"gray" as DadsColorHue,
				50,
				roles,
				false,
				"#F9FAFB",
			);

			const label = swatchElement.querySelector(
				".dads-swatch__role-label",
			) as HTMLElement;
			expect(label?.style.color).toBe("black");
		});

		it("【新UI】暗い背景では白文字ラベルになること", () => {
			const roles: SemanticRole[] = [
				{
					name: "Primary",
					category: "primary",
					fullName: "[Primary] Primary",
					shortLabel: "P",
				},
			];

			// 暗い背景色（黒に近い）
			applyOverlay(
				swatchElement,
				"gray" as DadsColorHue,
				900,
				roles,
				false,
				"#111827",
			);

			const label = swatchElement.querySelector(
				".dads-swatch__role-label",
			) as HTMLElement;
			expect(label?.style.color).toBe("white");
		});

		it("【新UI】hue-scale特定可能なブランドロールが該当DADSスウォッチで円形化されること", () => {
			const roles: SemanticRole[] = [
				{
					name: "Primary",
					category: "primary",
					fullName: "[Brand] Primary",
					shortLabel: "P",
				},
			];

			// hue-scale特定可能なブランドロール（dadsHueとscaleが存在）
			applyOverlay(
				swatchElement,
				"blue" as DadsColorHue,
				600,
				roles,
				false, // isBrand=falseでもdadsHue/scale特定可能なら円形化
				"#3B82F6",
			);

			expect(swatchElement.classList.contains("dads-swatch--circular")).toBe(
				true,
			);
			const label = swatchElement.querySelector(".dads-swatch__role-label");
			expect(label).not.toBeNull();
			expect(label?.textContent).toBe("P");
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

	describe("createAccessibleDescription（新仕様）", () => {
		it("DADSシェードの場合、正しいID形式を生成する（swatch-{hue}-{scale}-desc）", () => {
			const dadsHue = "blue" as DadsColorHue;
			const scale = 600;
			const roles: SemanticRole[] = [
				{ name: "Link", category: "link", fullName: "[Link] Link" },
			];

			const id = createAccessibleDescription(dadsHue, scale, roles);

			expect(id).toBe("swatch-blue-600-desc");
		});

		it("hue-scale特定可能なブランドロールの場合、該当DADSシェードのIDにマージする", () => {
			const dadsHue = "blue" as DadsColorHue;
			const scale = 600;
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];

			// hue-scaleが特定可能なブランドロールはDADSシェードのIDを使用
			const id = createAccessibleDescription(dadsHue, scale, roles);

			expect(id).toBe("swatch-blue-600-desc");
		});

		it("hue-scale特定不可のブランドロールの場合、nullを返す（ARIA ID不要）", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];

			// isBrand=trueでhue-scaleがundefinedの場合はARIA ID不要
			const id = createAccessibleDescription(undefined, undefined, roles, true);

			expect(id).toBeNull();
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

	describe("createAccessibleDescriptionElement（新仕様）", () => {
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

			expect(element).not.toBeNull();
			expect(element?.id).toBe("swatch-green-600-desc");
			expect(element?.tagName.toLowerCase()).toBe("span");
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
			expect(element).not.toBeNull();
			expect(element?.style.position).toBe("absolute");
			expect(element?.style.width).toBe("1px");
			expect(element?.style.height).toBe("1px");
			expect(element?.style.overflow).toBe("hidden");
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

			expect(element).not.toBeNull();
			expect(element?.textContent).toContain("[Semantic] Success");
			expect(element?.textContent).toContain("[Semantic] Warning");
		});

		it("hue-scale特定不可のブランドロールの場合、nullを返す（ARIA要素不要）", () => {
			const roles: SemanticRole[] = [
				{ name: "Primary", category: "primary", fullName: "[Primary] Primary" },
			];

			const element = createAccessibleDescriptionElement(
				undefined,
				undefined,
				roles,
				true,
			);

			// hue-scale特定不可の場合はnull（ARIA要素生成不要）
			expect(element).toBeNull();
		});
	});
});

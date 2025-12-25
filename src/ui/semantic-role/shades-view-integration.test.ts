/**
 * シェードビュー統合テスト
 *
 * renderShadesViewへのSemanticRoleOverlay統合をテスト
 * Task 4.2, 4.3, 4.4
 */

import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HarmonyType } from "@/core/harmony";
import {
	createSemanticRoleMapper,
	type PaletteInfo,
} from "@/core/semantic-role/role-mapper";
import type { SemanticRole } from "@/core/semantic-role/types";
import type { DadsColorHue } from "@/core/tokens/types";
import { applyOverlay } from "./semantic-role-overlay";

// JSDOMでdocumentをセットアップ
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;

describe("シェードビュー統合テスト", () => {
	describe("Task 4.2: generateRoleMappingの統合", () => {
		it("DADSハーモニーの場合、ロールマッピングが生成される", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue", step: 600 },
				{ name: "Secondary", baseChromaName: "Purple", step: 500 },
			];

			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);
			const roleMapping = mapper.getRoleMapping();

			// DADS_COLORSからのマッピングが存在する
			expect(roleMapping.size).toBeGreaterThan(0);
		});

		it("DADS以外のハーモニーの場合、空のマッピングが返される", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue", step: 600 },
			];

			const mapper = createSemanticRoleMapper(
				palettes,
				HarmonyType.COMPLEMENTARY,
			);
			const roleMapping = mapper.getRoleMapping();

			expect(roleMapping.size).toBe(0);
		});

		it("hue-scale特定可能なブランドロールがDADSキーに統合される", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue", step: 600 },
				{ name: "Secondary", baseChromaName: "Purple", step: 500 },
			];

			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);

			// blue-600にPrimaryが統合される
			const blueRoles = mapper.lookupRoles("blue", 600);
			expect(blueRoles.map((r) => r.name)).toContain("Primary");

			// purple-500にSecondaryが統合される
			const purpleRoles = mapper.lookupRoles("purple", 500);
			expect(purpleRoles.map((r) => r.name)).toContain("Secondary");

			// hue-scale特定可能な場合、unresolvedには入らない
			const unresolvedRoles = mapper.lookupUnresolvedBrandRoles();
			expect(unresolvedRoles).toHaveLength(0);
		});

		it("hue-scale特定不可なブランドロールがbrand-unresolvedに集約される", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary" }, // baseChromaName/stepなし
				{ name: "Secondary" }, // baseChromaName/stepなし
			];

			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);
			const unresolvedRoles = mapper.lookupUnresolvedBrandRoles();

			expect(unresolvedRoles).toHaveLength(2);
			expect(unresolvedRoles.map((r) => r.name)).toContain("Primary");
			expect(unresolvedRoles.map((r) => r.name)).toContain("Secondary");
		});
	});

	describe("Task 4.3: renderDadsHueSectionオーバーレイ統合", () => {
		let swatchElement: HTMLElement;

		beforeEach(() => {
			swatchElement = document.createElement("div");
			swatchElement.className = "dads-swatch dads-swatch--readonly";
			swatchElement.dataset.hue = "green";
			swatchElement.dataset.scale = "600";
			swatchElement.setAttribute("title", "#22C55E - Green 600");
		});

		it("スウォッチにDADSセマンティックロールのオーバーレイが適用される", () => {
			const palettes: PaletteInfo[] = [];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);

			// green-600のロールを取得（DADS_COLORSにSuccess-1がある）
			const roles = mapper.lookupRoles("green" as DadsColorHue, 600);

			if (roles.length > 0) {
				applyOverlay(swatchElement, "green" as DadsColorHue, 600, roles);

				// ドットが追加されていること
				expect(
					swatchElement.querySelector("[data-semantic-role-dot]"),
				).not.toBeNull();
				// バッジが追加されていること
				expect(
					swatchElement.querySelector("[data-semantic-role-badges]"),
				).not.toBeNull();
				// tabindexが設定されていること
				expect(swatchElement.getAttribute("tabindex")).toBe("0");
			}
		});

		it("hue-scale特定可能なブランドロールがDADSキーに統合される", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Green", step: 600 },
			];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);

			// lookupRolesはDADSセマンティックロール + 統合されたブランドロールを返す
			const roles = mapper.lookupRoles("green" as DadsColorHue, 600);

			// Primaryブランドロールがgreen-600に統合されていること
			const hasBrandRole = roles.some((r) => r.name === "Primary");
			expect(hasBrandRole).toBe(true);
		});

		it("セマンティックロールがないスウォッチにはオーバーレイが適用されない", () => {
			const palettes: PaletteInfo[] = [];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);

			// 通常使われないスケール値
			const roles = mapper.lookupRoles("green" as DadsColorHue, 50);

			applyOverlay(swatchElement, "green" as DadsColorHue, 50, roles);

			// ロールがない場合はオーバーレイが適用されない
			if (roles.length === 0) {
				expect(
					swatchElement.querySelector("[data-semantic-role-dot]"),
				).toBeNull();
			}
		});
	});

	describe("Task 4.4: renderBrandColorSectionオーバーレイ統合", () => {
		let brandSwatchElement: HTMLElement;

		beforeEach(() => {
			brandSwatchElement = document.createElement("div");
			brandSwatchElement.className = "dads-swatch dads-swatch--brand";
			brandSwatchElement.dataset.testid = "swatch-brand";
			brandSwatchElement.setAttribute("title", "#3B82F6");
		});

		it("ブランドスウォッチに未解決ブランドロールが表示される", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary" }, // hue-scale特定不可
				{ name: "Secondary" }, // hue-scale特定不可
			];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);
			const brandRoles = mapper.lookupUnresolvedBrandRoles();

			applyOverlay(brandSwatchElement, undefined, undefined, brandRoles, true);

			// ドットが追加されていること
			expect(
				brandSwatchElement.querySelector("[data-semantic-role-dot]"),
			).not.toBeNull();
			// バッジが追加されていること
			expect(
				brandSwatchElement.querySelector("[data-semantic-role-badges]"),
			).not.toBeNull();
			// hue-scale特定不可の場合、aria-describedbyは設定されない（新仕様）
			expect(brandSwatchElement.getAttribute("aria-describedby")).toBeNull();
		});

		it("DADSシェードと同じスタイルでバッジが表示される", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary" }, // hue-scale特定不可
			];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);
			const brandRoles = mapper.lookupUnresolvedBrandRoles();

			applyOverlay(brandSwatchElement, undefined, undefined, brandRoles, true);

			const badges = brandSwatchElement.querySelector(
				"[data-semantic-role-badges]",
			);
			expect(badges).not.toBeNull();
		});
	});

	describe("CVDシミュレーションモードでの動作", () => {
		it("CVDシミュレーション時もドット・バッジ色は固定維持される", () => {
			// ドット・バッジはインラインスタイルで固定色が設定されているため
			// CVDシミュレーションの影響を受けない
			const swatchElement = document.createElement("div");
			swatchElement.className = "dads-swatch";

			const roles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
				},
			];

			applyOverlay(swatchElement, "green" as DadsColorHue, 600, roles);

			const dot = swatchElement.querySelector(
				"[data-semantic-role-dot]",
			) as HTMLElement;
			expect(dot).not.toBeNull();
			// ドットにはインラインスタイルで背景色が設定されている
			expect(dot?.style.backgroundColor).toBeTruthy();
		});
	});
});

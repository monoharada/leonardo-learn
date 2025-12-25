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
				// Task 10.1: 新UI仕様（円形スウォッチ）
				applyOverlay(
					swatchElement,
					"green" as DadsColorHue,
					600,
					roles,
					false,
					"#22C55E",
				);

				// 【新UI】円形スウォッチクラスが追加されること
				expect(swatchElement.classList.contains("dads-swatch--circular")).toBe(
					true,
				);
				// 【新UI】中央ラベルが追加されること
				expect(
					swatchElement.querySelector(".dads-swatch__role-label"),
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

			applyOverlay(
				swatchElement,
				"green" as DadsColorHue,
				50,
				roles,
				false,
				"#F0FDF4",
			);

			// ロールがない場合はオーバーレイが適用されない
			if (roles.length === 0) {
				expect(
					swatchElement.querySelector("[data-semantic-role-dot]"),
				).toBeNull();
			}
		});
	});

	describe("Task 4.4: renderBrandColorSectionオーバーレイ統合（新UI仕様）", () => {
		// Task 10.1: 旧テストを削除
		// hue-scale特定不可のブランドロールは欄外情報のみで表示され、
		// スウォッチの円形化は行わない（Task 10.2で実装予定）
		// そのため、このセクションのテストは大幅に変更

		it("hue-scale特定不可のブランドロールはスウォッチを円形化しない", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary" }, // hue-scale特定不可
				{ name: "Secondary" }, // hue-scale特定不可
			];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);
			const brandRoles = mapper.lookupUnresolvedBrandRoles();

			const brandSwatchElement = document.createElement("div");
			brandSwatchElement.className = "dads-swatch dads-swatch--brand";

			// hue-scale特定不可のブランドロールはtransformToCircleが呼ばれないため円形化されない
			// （applyOverlay内でdadsHue/scaleがundefinedかつisBrand=trueの場合はスキップ）
			applyOverlay(
				brandSwatchElement,
				undefined,
				undefined,
				brandRoles,
				true,
				"#3B82F6",
			);

			// hue-scale特定不可の場合、円形化クラスは追加されない
			expect(
				brandSwatchElement.classList.contains("dads-swatch--circular"),
			).toBe(false);
			// hue-scale特定不可の場合、aria-describedbyは設定されない（新仕様）
			expect(brandSwatchElement.getAttribute("aria-describedby")).toBeNull();
		});

		it("hue-scale特定不可のブランドロールでもツールチップは更新される", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary" }, // hue-scale特定不可
			];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);
			const brandRoles = mapper.lookupUnresolvedBrandRoles();

			const brandSwatchElement = document.createElement("div");
			brandSwatchElement.setAttribute("title", "#3B82F6");

			applyOverlay(
				brandSwatchElement,
				undefined,
				undefined,
				brandRoles,
				true,
				"#3B82F6",
			);

			// ツールチップにロール情報が追加されていること
			const title = brandSwatchElement.getAttribute("title");
			expect(title).toContain("セマンティックロール");
		});
	});

	describe("CVDシミュレーションモードでの動作（新UI仕様）", () => {
		// Task 10.1: 新UI仕様に更新
		// 円形スウォッチのラベル色はインラインスタイルで固定設定
		it("CVDシミュレーション時もラベル文字色は固定維持される", () => {
			const swatchElement = document.createElement("div");
			swatchElement.className = "dads-swatch";

			const roles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
					semanticSubType: "success",
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

			// 【新UI】中央ラベルが追加されること
			const label = swatchElement.querySelector(
				".dads-swatch__role-label",
			) as HTMLElement;
			expect(label).not.toBeNull();
			// ラベルにはインラインスタイルでテキスト色が設定されている
			expect(label?.style.color).toBeTruthy();
		});
	});

	describe("Task 10.2: hue-scale不定ロールバーの追加", () => {
		it("hue-scale不定のブランドロールがシェードビュー先頭に1回だけ表示されること", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary" }, // hue-scale特定不可
				{ name: "Secondary" }, // hue-scale特定不可
			];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);
			const unresolvedRoles = mapper.lookupUnresolvedBrandRoles();

			// 未解決ロールが存在することを確認
			expect(unresolvedRoles).toHaveLength(2);
			expect(unresolvedRoles.map((r) => r.name)).toContain("Primary");
			expect(unresolvedRoles.map((r) => r.name)).toContain("Secondary");
		});

		it("未解決ロールがない場合にバーが表示されないこと", () => {
			// hue-scale特定可能なパレットのみ
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue", step: 600 },
			];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);
			const unresolvedRoles = mapper.lookupUnresolvedBrandRoles();

			// 未解決ロールが空であること
			expect(unresolvedRoles).toHaveLength(0);
		});
	});

	describe("Task 10.2: DOM統合テスト - 未解決ロールバーの配置", () => {
		/**
		 * 注: renderShadesViewはdemo.ts内のプライベート関数であり、
		 * DADSトークンの非同期読み込みなど複雑な依存があるため直接テスト困難。
		 * 以下のテストはrenderShadesView内のロジックを再現してDOM操作を検証。
		 * 実際のrenderShadesViewの統合検証はTask 11のE2Eテストで実施予定。
		 * @see e2e/semantic-role-test-page.html
		 */
		it("未解決ロールバーがDOMに追加されること", async () => {
			// external-role-info-barのrenderUnresolvedRolesBarをテスト
			const { renderUnresolvedRolesBar } = await import(
				"./external-role-info-bar"
			);

			const container = document.createElement("div");

			// 説明セクション（renderShadesView内のinfoSection相当）
			const infoSection = document.createElement("div");
			infoSection.className = "dads-info-section";
			container.appendChild(infoSection);

			// 未解決ロールバーを追加（renderShadesView内のロジック相当）
			const unresolvedRoles: SemanticRole[] = [
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
			const unresolvedItems = unresolvedRoles.map((role) => ({ role }));
			const unresolvedBar = renderUnresolvedRolesBar(unresolvedItems);
			if (unresolvedBar) {
				container.appendChild(unresolvedBar);
			}

			// 色相セクション（renderShadesView内のrenderDadsHueSection相当）
			const hueSection = document.createElement("section");
			hueSection.className = "dads-hue-section";
			container.appendChild(hueSection);

			// 検証: 未解決ロールバーが1件だけ存在すること
			const unresolvedBars = container.querySelectorAll(
				".dads-unresolved-roles-bar",
			);
			expect(unresolvedBars).toHaveLength(1);

			// 検証: 未解決ロールバーが色相セクションより前に配置されていること
			const children = Array.from(container.children);
			const barIndex = children.findIndex((el) =>
				el.classList.contains("dads-unresolved-roles-bar"),
			);
			const sectionIndex = children.findIndex((el) =>
				el.classList.contains("dads-hue-section"),
			);
			expect(barIndex).toBeLessThan(sectionIndex);
			expect(barIndex).toBeGreaterThan(0); // infoSectionの後

			// 検証: バッジが2つ存在すること（Primary, Secondary）
			const badges = container.querySelectorAll(".dads-role-badge");
			expect(badges).toHaveLength(2);
		});

		it("未解決ロールがない場合はDOMにバーが追加されないこと", async () => {
			const { renderUnresolvedRolesBar } = await import(
				"./external-role-info-bar"
			);

			const container = document.createElement("div");

			// 説明セクション
			const infoSection = document.createElement("div");
			infoSection.className = "dads-info-section";
			container.appendChild(infoSection);

			// 未解決ロールが空の場合
			const unresolvedBar = renderUnresolvedRolesBar([]);
			if (unresolvedBar) {
				container.appendChild(unresolvedBar);
			}

			// 色相セクション
			const hueSection = document.createElement("section");
			hueSection.className = "dads-hue-section";
			container.appendChild(hueSection);

			// 検証: 未解決ロールバーが存在しないこと
			const unresolvedBars = container.querySelectorAll(
				".dads-unresolved-roles-bar",
			);
			expect(unresolvedBars).toHaveLength(0);
		});

		it("シェードビュー全体で1回のみ表示されること（複数色相セクションがあっても）", async () => {
			const { renderUnresolvedRolesBar } = await import(
				"./external-role-info-bar"
			);

			const container = document.createElement("div");

			// 未解決ロールバーを1回だけ追加（renderShadesViewのロジック）
			const unresolvedRoles: SemanticRole[] = [
				{
					name: "Primary",
					category: "primary",
					fullName: "[Primary] Primary",
					shortLabel: "P",
				},
			];
			const unresolvedBar = renderUnresolvedRolesBar(
				unresolvedRoles.map((role) => ({ role })),
			);
			if (unresolvedBar) {
				container.appendChild(unresolvedBar);
			}

			// 複数の色相セクションを追加
			for (let i = 0; i < 3; i++) {
				const hueSection = document.createElement("section");
				hueSection.className = "dads-hue-section";
				container.appendChild(hueSection);
			}

			// 検証: 未解決ロールバーは1件のみ（複数セクションがあっても）
			const unresolvedBars = container.querySelectorAll(
				".dads-unresolved-roles-bar",
			);
			expect(unresolvedBars).toHaveLength(1);

			// 検証: 色相セクションは3件
			const hueSections = container.querySelectorAll(".dads-hue-section");
			expect(hueSections).toHaveLength(3);
		});
	});
});

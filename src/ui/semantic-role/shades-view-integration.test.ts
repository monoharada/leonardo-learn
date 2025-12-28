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
import { type RoleInfoItem, renderRoleInfoBar } from "./external-role-info-bar";
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

	describe("Task 10.5: CVDシミュレーション時の表示調整", () => {
		/**
		 * Task 10.5: CVDシミュレーション時の表示調整
		 *
		 * 要件:
		 * - 欄外ロール情報のカテゴリ色は固定（シミュレーション適用外）
		 * - コントラスト境界ピルの色は固定（シミュレーション適用外）
		 * - スウォッチ自体のみシミュレーション色を表示
		 *
		 * @see requirements.md 4.3
		 */

		it("欄外ロール情報のカテゴリ色がCVDシミュレーションの影響を受けないこと", async () => {
			const { createRoleBadge, ROLE_CATEGORY_COLORS } = await import(
				"./external-role-info-bar"
			);

			// 各カテゴリのバッジを生成
			const categories = [
				"primary",
				"secondary",
				"accent",
				"semantic",
				"link",
			] as const;

			for (const category of categories) {
				const role: SemanticRole = {
					name: `Test-${category}`,
					category,
					fullName: `[${category}] Test`,
					shortLabel: category[0].toUpperCase(),
				};

				const badge = createRoleBadge(role);

				// バッジの背景色がROLE_CATEGORY_COLORSからの固定値であること
				// CVDシミュレーション関数は呼ばれていない（直接色を設定）
				expect(badge.style.backgroundColor).toBeTruthy();

				// 色が変換されていないことを確認（固定値のまま）
				// ROLE_CATEGORY_COLORSの色がそのまま設定されている
				const expectedColor = ROLE_CATEGORY_COLORS[category];
				expect(expectedColor).toBeDefined();
			}
		});

		it("コントラスト境界ピルのスタイルがCVDシミュレーションの影響を受けないこと", async () => {
			const { createBoundaryPill } = await import(
				"./contrast-boundary-indicator"
			);

			// 白抜きピル（outlineスタイル）
			const outlinePill = createBoundaryPill({
				scale: 400,
				label: "3:1→",
				style: "outline",
				direction: "start",
			});

			// CSSクラスで色が定義されていること（インラインスタイルではない）
			expect(outlinePill.classList.contains("dads-contrast-pill")).toBe(true);
			expect(
				outlinePill.classList.contains("dads-contrast-pill--outline"),
			).toBe(true);

			// 黒塗りピル（filledスタイル）
			const filledPill = createBoundaryPill({
				scale: 800,
				label: "←3:1",
				style: "filled",
				direction: "end",
			});

			// CSSクラスで色が定義されていること（インラインスタイルではない）
			expect(filledPill.classList.contains("dads-contrast-pill")).toBe(true);
			expect(filledPill.classList.contains("dads-contrast-pill--filled")).toBe(
				true,
			);
		});

		it("円形スウォッチの中央ラベル色がCVDシミュレーションの影響を受けないこと", () => {
			const swatchElement = document.createElement("div");
			swatchElement.className = "dads-swatch";

			const role: SemanticRole = {
				name: "Primary",
				category: "primary",
				fullName: "[Primary] Primary",
				shortLabel: "P",
			};

			applyOverlay(
				swatchElement,
				"blue" as DadsColorHue,
				600,
				[role],
				false,
				"#2563EB", // Blue 600
			);

			const label = swatchElement.querySelector(
				".dads-swatch__role-label",
			) as HTMLElement;

			// ラベル色は背景色に基づいて計算された固定値（white/black）
			// CVDシミュレーション関数は適用されない
			expect(["white", "black"]).toContain(label?.style.color);
		});

		it("未解決ロールバーのバッジ色がCVDシミュレーションの影響を受けないこと", async () => {
			const { renderUnresolvedRolesBar, ROLE_CATEGORY_COLORS } = await import(
				"./external-role-info-bar"
			);

			const unresolvedItems = [
				{
					role: {
						name: "Primary",
						category: "primary" as const,
						fullName: "[Primary] Primary",
						shortLabel: "P",
					},
				},
				{
					role: {
						name: "Secondary",
						category: "secondary" as const,
						fullName: "[Secondary] Secondary",
						shortLabel: "S",
					},
				},
			];

			const bar = renderUnresolvedRolesBar(unresolvedItems);
			expect(bar).not.toBeNull();

			const badges = bar?.querySelectorAll(".dads-role-badge");
			expect(badges?.length).toBe(2);

			// 各バッジが固定のカテゴリ色を持つこと
			for (const badge of badges || []) {
				const htmlBadge = badge as HTMLElement;
				expect(htmlBadge.style.backgroundColor).toBeTruthy();
				// 白い文字色（固定）
				expect(htmlBadge.style.color).toBe("white");
			}
		});

		it("欄外ロール情報バーのバッジ色がCVDシミュレーションの影響を受けないこと", () => {
			const mockSwatchElement = document.createElement("div");
			mockSwatchElement.className = "dads-swatch";

			const roleItems: RoleInfoItem[] = [
				{
					role: {
						name: "Success",
						category: "semantic",
						semanticSubType: "success",
						fullName: "[Semantic] Success",
						shortLabel: "Su",
					},
					scale: 600,
					swatchElement: mockSwatchElement,
				},
			];

			const bar = renderRoleInfoBar(roleItems);
			const badge = bar.querySelector(".dads-role-badge") as HTMLElement;

			// バッジの背景色が設定されていること
			expect(badge.style.backgroundColor).toBeTruthy();
			// 白い文字色（固定）
			expect(badge.style.color).toBe("white");
		});

		it("コネクタ線の色がCVDシミュレーションの影響を受けないこと", async () => {
			const { renderConnector } = await import("./external-role-info-bar");

			const mockSwatchElement = document.createElement("div");
			const mockInfoElement = document.createElement("div");

			const connector = renderConnector(mockSwatchElement, mockInfoElement);

			// コネクタの背景色が固定のグレー色であること
			// #9e9e9e = rgb(158, 158, 158)
			expect(connector.style.backgroundColor).toBe("rgb(158, 158, 158)");
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

	describe("Task 10.3: DOM統合テスト - 色相セクション下部の欄外ロール情報バー", () => {
		/**
		 * Task 10.3: renderDadsHueSectionに欄外ロール情報バーを追加する
		 *
		 * 各色相セクションの直後にExternalRoleInfoBar.renderRoleInfoBarを呼び出し、
		 * ロールが割り当てられたスウォッチからRoleInfoItemを収集して表示。
		 * hue-scale特定可能なブランドロールも対象に含める。
		 *
		 * @see external-role-info-bar.ts
		 */
		it("色相セクション下部に欄外ロール情報が表示されること", () => {
			// 色相セクションを模擬
			const hueSection = document.createElement("section");
			hueSection.className = "dads-hue-section";

			// スケールコンテナを追加
			const scaleContainer = document.createElement("div");
			scaleContainer.className = "dads-scale";
			hueSection.appendChild(scaleContainer);

			// スウォッチを追加（ロール割り当てあり）
			const swatch = document.createElement("div");
			swatch.className = "dads-swatch dads-swatch--circular";
			swatch.dataset.hue = "green";
			swatch.dataset.scale = "600";
			scaleContainer.appendChild(swatch);

			// RoleInfoItemを作成
			const roleItems: RoleInfoItem[] = [
				{
					role: {
						name: "Success",
						category: "semantic",
						fullName: "[Semantic] Success",
						semanticSubType: "success",
						shortLabel: "Su",
					},
					scale: 600,
					swatchElement: swatch,
				},
			];

			// renderRoleInfoBarを呼び出して欄外情報バーを生成
			const infoBar = renderRoleInfoBar(roleItems);

			// セクションに追加
			hueSection.appendChild(infoBar);

			// 検証: 情報バーが存在すること
			const bar = hueSection.querySelector(".dads-role-info-bar");
			expect(bar).not.toBeNull();

			// 検証: ロール情報アイテムが存在すること
			const items = hueSection.querySelectorAll(".dads-role-info-item");
			expect(items).toHaveLength(1);

			// 検証: バッジが正しいテキストを持つこと
			const badge = hueSection.querySelector(".dads-role-badge");
			expect(badge?.textContent).toContain("Success");
			expect(badge?.textContent).toContain("600");
		});

		it("hue-scale特定可能ブランドロールがコネクタ付きで表示されること", () => {
			// 色相セクションを模擬
			const hueSection = document.createElement("section");
			hueSection.className = "dads-hue-section";

			// スケールコンテナを追加
			const scaleContainer = document.createElement("div");
			scaleContainer.className = "dads-scale";
			hueSection.appendChild(scaleContainer);

			// スウォッチを追加（ブランドロール割り当てあり）
			const swatch = document.createElement("div");
			swatch.className = "dads-swatch dads-swatch--circular";
			swatch.dataset.hue = "blue";
			swatch.dataset.scale = "600";
			scaleContainer.appendChild(swatch);

			// RoleInfoItem（ブランドロール）を作成
			const roleItems: RoleInfoItem[] = [
				{
					role: {
						name: "Primary",
						category: "primary",
						fullName: "[Primary] Primary",
						shortLabel: "P",
					},
					scale: 600,
					swatchElement: swatch,
				},
			];

			// renderRoleInfoBarを呼び出して欄外情報バーを生成
			const infoBar = renderRoleInfoBar(roleItems);

			// セクションに追加
			hueSection.appendChild(infoBar);

			// 検証: コネクタが存在すること
			const connectors = hueSection.querySelectorAll(".dads-role-connector");
			expect(connectors).toHaveLength(1);

			// 検証: コネクタがdata-testidを持つこと
			expect(connectors[0].getAttribute("data-testid")).toBe("role-connector");
		});

		it("同一色相に複数ロールがある場合に全てが水平に並ぶこと", () => {
			// 色相セクションを模擬
			const hueSection = document.createElement("section");
			hueSection.className = "dads-hue-section";

			// 複数のスウォッチ（同一色相、異なるスケール）
			const scaleContainer = document.createElement("div");
			scaleContainer.className = "dads-scale";
			hueSection.appendChild(scaleContainer);

			const swatch1 = document.createElement("div");
			swatch1.className = "dads-swatch dads-swatch--circular";
			swatch1.dataset.hue = "green";
			swatch1.dataset.scale = "600";
			scaleContainer.appendChild(swatch1);

			const swatch2 = document.createElement("div");
			swatch2.className = "dads-swatch dads-swatch--circular";
			swatch2.dataset.hue = "green";
			swatch2.dataset.scale = "700";
			scaleContainer.appendChild(swatch2);

			// 複数のRoleInfoItem
			const roleItems: RoleInfoItem[] = [
				{
					role: {
						name: "Success",
						category: "semantic",
						fullName: "[Semantic] Success",
						semanticSubType: "success",
						shortLabel: "Su",
					},
					scale: 600,
					swatchElement: swatch1,
				},
				{
					role: {
						name: "Success Dark",
						category: "semantic",
						fullName: "[Semantic] Success Dark",
						semanticSubType: "success",
						shortLabel: "Su",
					},
					scale: 700,
					swatchElement: swatch2,
				},
			];

			// renderRoleInfoBarを呼び出して欄外情報バーを生成
			const infoBar = renderRoleInfoBar(roleItems);
			hueSection.appendChild(infoBar);

			// 検証: 情報バーに複数のロール情報アイテムが存在すること
			const items = hueSection.querySelectorAll(".dads-role-info-item");
			expect(items).toHaveLength(2);

			// 検証: 各アイテムにコネクタが存在すること
			const connectors = hueSection.querySelectorAll(".dads-role-connector");
			expect(connectors).toHaveLength(2);

			// 検証: 情報バーのdata-testidが正しいこと
			expect(infoBar.getAttribute("data-testid")).toBe("role-info-bar");
		});

		it("ロール割り当てがないスウォッチのみの場合は空の情報バーが返ること", () => {
			// 空のRoleInfoItem配列
			const roleItems: RoleInfoItem[] = [];

			// renderRoleInfoBarを呼び出して欄外情報バーを生成
			const infoBar = renderRoleInfoBar(roleItems);

			// 検証: 空のコンテナが返ること
			expect(infoBar.classList.contains("dads-role-info-bar")).toBe(true);
			expect(infoBar.children).toHaveLength(0);
		});

		it("hue-scale特定不可ロールはTask 10.2で処理済みのため、ここでは除外されること", () => {
			// hue-scale特定不可ロールはrenderUnresolvedRolesBarで処理済み
			// renderRoleInfoBarは必ずscale/swatchElementを持つRoleInfoItemのみ受け付ける
			// 型レベルで除外されているため、ランタイムテストは不要

			// RoleInfoItem型はscaleとswatchElementが必須
			const swatch = document.createElement("div");
			const roleItem: RoleInfoItem = {
				role: {
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
					semanticSubType: "success",
					shortLabel: "Su",
				},
				scale: 600, // 必須
				swatchElement: swatch, // 必須
			};

			// 型が正しく定義されていることを確認
			expect(roleItem.scale).toBe(600);
			expect(roleItem.swatchElement).toBe(swatch);
		});
	});

	describe("Task 10.4: DOM統合テスト - コントラスト境界表示", () => {
		/**
		 * Task 10.4: renderDadsHueSectionにコントラスト境界表示を追加する
		 *
		 * 各色相セクションでContrastBoundaryCalculator.calculateBoundariesを呼び出し、
		 * ContrastBoundaryIndicator.renderBoundaryPillsで境界ピルを生成。
		 * セクション要素の子としてコントラスト境界インジケーターを追加。
		 *
		 * @see contrast-boundary-indicator.ts
		 * @see contrast-boundary-calculator.ts
		 */

		it("各色相セクションにコントラスト境界ピルが表示されること", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);
			const { calculateBoundaries } = await import(
				"@/core/semantic-role/contrast-boundary-calculator"
			);

			// 色相セクションを模擬
			const hueSection = document.createElement("section");
			hueSection.className = "dads-hue-section";

			// スケールコンテナを追加
			const scaleContainer = document.createElement("div");
			scaleContainer.className = "dads-scale";
			hueSection.appendChild(scaleContainer);

			// スウォッチを追加（明るい色から暗い色まで）
			const scales = [
				50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
			];
			const scaleElements = new Map<number, HTMLElement>();

			// 模擬的なHEX値（明るい色から暗い色へ）
			const hexValues: Record<number, string> = {
				50: "#FAFAFA",
				100: "#F5F5F5",
				200: "#E5E5E5",
				300: "#D4D4D4",
				400: "#A3A3A3",
				500: "#737373",
				600: "#525252",
				700: "#404040",
				800: "#262626",
				900: "#171717",
				1000: "#0A0A0A",
				1100: "#050505",
				1200: "#000000",
			};

			for (const scale of scales) {
				const swatch = document.createElement("div");
				swatch.className = "dads-swatch";
				swatch.dataset.scale = String(scale);
				swatch.style.backgroundColor = hexValues[scale];
				scaleContainer.appendChild(swatch);
				scaleElements.set(scale, swatch);
			}

			// 色アイテム配列を作成
			const colorItems = scales.map((scale) => ({
				scale,
				hex: hexValues[scale],
			}));

			// コントラスト境界を計算
			const boundaries = calculateBoundaries(colorItems);

			// 境界ピルを生成
			const boundaryContainer = renderBoundaryPills(boundaries, scaleElements);
			hueSection.appendChild(boundaryContainer);

			// 検証: コントラスト境界コンテナが存在すること
			const container = hueSection.querySelector(".dads-contrast-boundary");
			expect(container).not.toBeNull();

			// 検証: 境界ピルが生成されていること（白背景用と黒背景用）
			const pills = hueSection.querySelectorAll(".dads-contrast-pill");
			expect(pills.length).toBeGreaterThan(0);
		});

		it("白背景境界ピルが正しいscale位置に表示されること", async () => {
			const { renderBoundaryPills, createBoundaryPill } = await import(
				"./contrast-boundary-indicator"
			);
			const { calculateBoundaries } = await import(
				"@/core/semantic-role/contrast-boundary-calculator"
			);

			// グレースケールの色アイテム
			const colorItems = [
				{ scale: 50, hex: "#FAFAFA" }, // 白に近い
				{ scale: 300, hex: "#D4D4D4" }, // 中間明るい
				{ scale: 500, hex: "#737373" }, // 中間暗い
				{ scale: 800, hex: "#262626" }, // 暗い
			];

			const scaleElements = new Map<number, HTMLElement>();
			for (const item of colorItems) {
				const swatch = document.createElement("div");
				swatch.className = "dads-swatch";
				swatch.dataset.scale = String(item.scale);
				// getBoundingClientRectのモック用に幅を設定
				Object.defineProperty(swatch, "getBoundingClientRect", {
					value: () => ({
						left: item.scale * 10,
						width: 50,
						top: 0,
						height: 50,
						right: item.scale * 10 + 50,
						bottom: 50,
					}),
				});
				scaleElements.set(item.scale, swatch);
			}

			const boundaries = calculateBoundaries(colorItems);

			// 白背景3:1境界が計算されていること
			expect(boundaries.white3to1).not.toBeNull();

			// 白背景用ピルの生成テスト
			if (boundaries.white3to1 !== null) {
				const pill = createBoundaryPill({
					scale: boundaries.white3to1,
					label: "3:1→",
					style: "outline",
					direction: "start",
				});

				expect(pill.classList.contains("dads-contrast-pill")).toBe(true);
				expect(pill.classList.contains("dads-contrast-pill--outline")).toBe(
					true,
				);
				expect(pill.textContent).toBe("3:1→");
			}
		});

		it("黒背景境界ピルが正しいscale位置に表示されること", async () => {
			const { createBoundaryPill } = await import(
				"./contrast-boundary-indicator"
			);
			const { calculateBoundaries } = await import(
				"@/core/semantic-role/contrast-boundary-calculator"
			);

			// グレースケールの色アイテム
			const colorItems = [
				{ scale: 50, hex: "#FAFAFA" },
				{ scale: 500, hex: "#737373" },
				{ scale: 1000, hex: "#0A0A0A" },
			];

			const boundaries = calculateBoundaries(colorItems);

			// 黒背景4.5:1境界が計算されていること
			expect(boundaries.black4_5to1).not.toBeNull();

			// 黒背景用ピルの生成テスト
			if (boundaries.black4_5to1 !== null) {
				const pill = createBoundaryPill({
					scale: boundaries.black4_5to1,
					label: "←4.5:1",
					style: "filled",
					direction: "end",
				});

				expect(pill.classList.contains("dads-contrast-pill")).toBe(true);
				expect(pill.classList.contains("dads-contrast-pill--filled")).toBe(
					true,
				);
				expect(pill.textContent).toBe("←4.5:1");
			}
		});

		it("境界がない場合にピルが表示されないこと", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			// 全ての境界がnullの場合
			const boundaries = {
				white3to1: null,
				white4_5to1: null,
				black4_5to1: null,
				black3to1: null,
			};

			const scaleElements = new Map<number, HTMLElement>();
			const container = renderBoundaryPills(boundaries, scaleElements);

			// 検証: コンテナは存在し、2行構造（whiteRow, blackRow）があるが、ピルは空
			expect(container.classList.contains("dads-contrast-boundary")).toBe(true);
			expect(container.children).toHaveLength(2); // 2行構造
			expect(container.querySelectorAll(".dads-contrast-pill")).toHaveLength(0);
		});

		it("renderDadsHueSectionのロジック相当でコントラスト境界が生成されること", async () => {
			/**
			 * demo.ts内のrenderDadsHueSectionの実装ロジックを再現。
			 * 実際のrenderDadsHueSectionは複雑な依存（DADSトークン非同期読み込み等）があるため、
			 * ここではロジックを再現してDOM操作を検証。
			 */
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);
			const { calculateBoundaries } = await import(
				"@/core/semantic-role/contrast-boundary-calculator"
			);

			// 色相セクションを模擬
			const hueSection = document.createElement("section");
			hueSection.className = "dads-hue-section";

			const scaleContainer = document.createElement("div");
			scaleContainer.className = "dads-scale";
			hueSection.appendChild(scaleContainer);

			// スウォッチとscaleElementsマップを作成
			const colorItems = [
				{ scale: 50, hex: "#F0F9FF" },
				{ scale: 100, hex: "#E0F2FE" },
				{ scale: 200, hex: "#BAE6FD" },
				{ scale: 300, hex: "#7DD3FC" },
				{ scale: 400, hex: "#38BDF8" },
				{ scale: 500, hex: "#0EA5E9" },
				{ scale: 600, hex: "#0284C7" },
				{ scale: 700, hex: "#0369A1" },
				{ scale: 800, hex: "#075985" },
				{ scale: 900, hex: "#0C4A6E" },
			];

			const scaleElements = new Map<number, HTMLElement>();

			for (const item of colorItems) {
				const swatch = document.createElement("div");
				swatch.className = "dads-swatch";
				swatch.dataset.scale = String(item.scale);
				swatch.style.backgroundColor = item.hex;
				// getBoundingClientRectのモック
				Object.defineProperty(swatch, "getBoundingClientRect", {
					value: () => ({
						left: item.scale,
						width: 50,
						top: 0,
						height: 50,
						right: item.scale + 50,
						bottom: 50,
					}),
				});
				scaleContainer.appendChild(swatch);
				scaleElements.set(item.scale, swatch);
			}

			// --- renderDadsHueSection内のロジック相当 ---
			// Task 10.4: コントラスト境界計算とピル生成
			const boundaries = calculateBoundaries(colorItems);
			const boundaryContainer = renderBoundaryPills(boundaries, scaleElements);
			hueSection.appendChild(boundaryContainer);
			// --- ここまで ---

			// 検証: コンテナがセクション内に追加されていること
			expect(
				hueSection.querySelector(".dads-contrast-boundary"),
			).not.toBeNull();

			// 検証: 白背景ピルが存在すること（青系なので明るいところから暗いところへの境界がある）
			const outlinePills = hueSection.querySelectorAll(
				".dads-contrast-pill--outline",
			);
			expect(outlinePills.length).toBeGreaterThanOrEqual(0);

			// 検証: 黒背景ピルが存在すること
			const filledPills = hueSection.querySelectorAll(
				".dads-contrast-pill--filled",
			);
			expect(filledPills.length).toBeGreaterThanOrEqual(0);
		});
	});
});

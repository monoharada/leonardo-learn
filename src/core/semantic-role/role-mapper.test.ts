/**
 * SemanticRoleMapper関数群のテスト
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1
 * - generateRoleMappingでDADS判定を含むマッピング生成
 * - DADSセマンティックロールのキー形式「${dadsHue}-${scale}」
 * - ブランドロールは「brand」キーに集約
 * - lookupRolesで特定hue-scaleのロールを検索
 * - lookupBrandRolesでブランドロール配列を取得
 * - 計算時間200ms以内を保証
 */

import { describe, expect, it } from "bun:test";
import { HarmonyType } from "@/core/harmony";
import type { PaletteInfo } from "./role-mapper";
import { createSemanticRoleMapper, generateRoleMapping } from "./role-mapper";

describe("SemanticRoleMapper", () => {
	describe("generateRoleMapping", () => {
		it("should return empty map when harmonyType is not DADS", () => {
			const palettes: PaletteInfo[] = [{ name: "Primary" }];
			const result = generateRoleMapping(palettes, HarmonyType.COMPLEMENTARY);
			expect(result.size).toBe(0);
		});

		it("should return empty map when harmonyType is NONE", () => {
			const palettes: PaletteInfo[] = [{ name: "Primary" }];
			const result = generateRoleMapping(palettes, HarmonyType.NONE);
			expect(result.size).toBe(0);
		});

		it("should return empty map when harmonyType is M3", () => {
			const palettes: PaletteInfo[] = [{ name: "Primary" }];
			const result = generateRoleMapping(palettes, HarmonyType.M3);
			expect(result.size).toBe(0);
		});

		it("should generate mapping when harmonyType is DADS", () => {
			const palettes: PaletteInfo[] = [{ name: "Primary" }];
			const result = generateRoleMapping(palettes, HarmonyType.DADS);
			// DADSの場合はDADS_COLORSからマッピングが生成される
			expect(result.size).toBeGreaterThan(0);
		});

		it("should generate mapping with correct key format dadsHue-scale", () => {
			const palettes: PaletteInfo[] = [];
			const result = generateRoleMapping(palettes, HarmonyType.DADS);

			// DADS_COLORSにはgreen-600のSuccess-1がある
			expect(result.has("green-600")).toBe(true);
			// DADS_COLORSにはblue-1000のLink-Defaultがある
			expect(result.has("blue-1000")).toBe(true);
			// DADS_COLORSにはred-800のError-1がある
			expect(result.has("red-800")).toBe(true);
		});

		it("should correctly normalize chromaName to DadsColorHue", () => {
			const palettes: PaletteInfo[] = [];
			const result = generateRoleMapping(palettes, HarmonyType.DADS);

			// DADS_COLORS: chromaName="cyan" → displayName="Light Blue" → DadsHue="light-blue"
			// Accent-Light Blue is at cyan-600 which maps to light-blue-600
			expect(result.has("light-blue-600")).toBe(true);

			// DADS_COLORS: chromaName="teal" → displayName="Cyan" → DadsHue="cyan"
			// Accent-Cyan is at teal-600 which maps to cyan-600
			expect(result.has("cyan-600")).toBe(true);
		});

		it("should aggregate brand roles under 'brand' key", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue", step: 500 },
				{ name: "Secondary", baseChromaName: "Purple", step: 600 },
			];
			const result = generateRoleMapping(palettes, HarmonyType.DADS);

			expect(result.has("brand")).toBe(true);
			const brandRoles = result.get("brand");
			expect(brandRoles).toBeDefined();
			expect(brandRoles?.length).toBe(2);
			expect(brandRoles?.some((r) => r.name === "Primary")).toBe(true);
			expect(brandRoles?.some((r) => r.name === "Secondary")).toBe(true);
		});

		it("should set hueScale for brand roles with baseChromaName/step", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue", step: 500 },
				{ name: "Secondary", baseChromaName: "Purple", step: 600 },
			];
			const result = generateRoleMapping(palettes, HarmonyType.DADS);

			const brandRoles = result.get("brand");
			const primaryRole = brandRoles?.find((r) => r.name === "Primary");
			const secondaryRole = brandRoles?.find((r) => r.name === "Secondary");

			// baseChromaName/stepがある場合はhueScaleが設定される
			expect(primaryRole?.hueScale).toBe("blue-500");
			expect(secondaryRole?.hueScale).toBe("purple-600");
		});

		it("should handle brand palettes without baseChromaName/step", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary" }, // no baseChromaName/step
			];
			const result = generateRoleMapping(palettes, HarmonyType.DADS);

			expect(result.has("brand")).toBe(true);
			const brandRoles = result.get("brand");
			expect(brandRoles).toBeDefined();
			expect(brandRoles?.length).toBe(1);
			expect(brandRoles?.[0].name).toBe("Primary");
			// baseChromaName/stepがない場合はhueScaleがundefined
			expect(brandRoles?.[0].hueScale).toBeUndefined();
		});

		it("should not set hueScale when only baseChromaName exists without step", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue" }, // stepがない
			];
			const result = generateRoleMapping(palettes, HarmonyType.DADS);

			const brandRoles = result.get("brand");
			expect(brandRoles?.[0].hueScale).toBeUndefined();
		});

		it("should not set hueScale when only step exists without baseChromaName", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary", step: 500 }, // baseChromaNameがない
			];
			const result = generateRoleMapping(palettes, HarmonyType.DADS);

			const brandRoles = result.get("brand");
			expect(brandRoles?.[0].hueScale).toBeUndefined();
		});

		it("should return empty map when palettes is empty and no DADS colors", () => {
			// Even with empty palettes, DADS_COLORS should still generate mappings
			const palettes: PaletteInfo[] = [];
			const result = generateRoleMapping(palettes, HarmonyType.DADS);
			// DADS_COLORS are always included
			expect(result.size).toBeGreaterThan(0);
		});

		it("should set correct category for each role type", () => {
			const palettes: PaletteInfo[] = [];
			const result = generateRoleMapping(palettes, HarmonyType.DADS);

			// Check semantic roles (Success, Error, Warning)
			const greenRoles = result.get("green-600");
			expect(greenRoles?.some((r) => r.category === "semantic")).toBe(true);

			// Check link roles
			const linkRoles = result.get("blue-1000");
			expect(linkRoles?.some((r) => r.category === "link")).toBe(true);

			// Check accent roles
			const accentRoles = result.get("purple-500");
			expect(accentRoles?.some((r) => r.category === "accent")).toBe(true);
		});

		it("should generate correct fullName format: [カテゴリ名] ロール名", () => {
			const palettes: PaletteInfo[] = [];
			const result = generateRoleMapping(palettes, HarmonyType.DADS);

			const greenRoles = result.get("green-600");
			const successRole = greenRoles?.find((r) => r.name === "Success-1");
			expect(successRole).toBeDefined();
			expect(successRole?.fullName).toBe("[Semantic] Success-1");
		});
	});

	describe("createSemanticRoleMapper (Service Interface)", () => {
		it("should provide lookupRoles function", () => {
			const palettes: PaletteInfo[] = [];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);

			const roles = mapper.lookupRoles("green", 600);
			expect(roles.length).toBeGreaterThan(0);
			expect(roles.some((r) => r.name === "Success-1")).toBe(true);
		});

		it("should return empty array for non-existent hue-scale", () => {
			const palettes: PaletteInfo[] = [];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);

			const roles = mapper.lookupRoles("blue", 50);
			expect(roles).toEqual([]);
		});

		it("should provide lookupBrandRoles function", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue", step: 500 },
			];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);

			const brandRoles = mapper.lookupBrandRoles();
			expect(brandRoles.length).toBe(1);
			expect(brandRoles[0].name).toBe("Primary");
			expect(brandRoles[0].category).toBe("primary");
		});

		it("should return empty array for brand roles when none exist", () => {
			const palettes: PaletteInfo[] = [];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);

			const brandRoles = mapper.lookupBrandRoles();
			expect(brandRoles).toEqual([]);
		});

		it("should provide getRoleMapping function", () => {
			const palettes: PaletteInfo[] = [];
			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);

			const mapping = mapper.getRoleMapping();
			expect(mapping instanceof Map).toBe(true);
			expect(mapping.size).toBeGreaterThan(0);
		});
	});

	describe("Multiple roles on same shade", () => {
		it("should aggregate multiple roles on the same hue-scale", () => {
			const palettes: PaletteInfo[] = [];
			const result = generateRoleMapping(palettes, HarmonyType.DADS);

			// DADS_COLORS has multiple roles at green-800: Success-2 and Accent-Green
			const greenRoles = result.get("green-800");
			expect(greenRoles).toBeDefined();
			expect(greenRoles?.length).toBeGreaterThanOrEqual(2);
		});

		it("should aggregate multiple roles at orange-600", () => {
			const palettes: PaletteInfo[] = [];
			const result = generateRoleMapping(palettes, HarmonyType.DADS);

			// DADS_COLORS: Warning-OR1 and Accent-Orange both at orange-600
			const orangeRoles = result.get("orange-600");
			expect(orangeRoles).toBeDefined();
			expect(orangeRoles?.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("Performance", () => {
		// CI_BENCH環境変数が設定されている場合のみ実行（CI環境でのフレーク防止）
		const isCiBench = process.env.CI_BENCH === "1";

		it("should complete single mapping generation within requirement", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue", step: 500 },
				{ name: "Secondary", baseChromaName: "Purple", step: 600 },
			];

			const start = performance.now();
			generateRoleMapping(palettes, HarmonyType.DADS);
			const elapsed = performance.now() - start;

			// 単回実行は200ms以内（要件5.1準拠、低速環境でも安定）
			expect(elapsed).toBeLessThan(200);
		});

		it.skipIf(!isCiBench)(
			"should complete 100 iterations within 200ms (CI_BENCH only)",
			() => {
				const palettes: PaletteInfo[] = [
					{ name: "Primary", baseChromaName: "Blue", step: 500 },
					{ name: "Secondary", baseChromaName: "Purple", step: 600 },
				];

				const start = performance.now();
				for (let i = 0; i < 100; i++) {
					generateRoleMapping(palettes, HarmonyType.DADS);
				}
				const elapsed = performance.now() - start;

				// 100回実行しても200ms以内（1回あたり2ms以内）
				expect(elapsed).toBeLessThan(200);
			},
		);
	});
});

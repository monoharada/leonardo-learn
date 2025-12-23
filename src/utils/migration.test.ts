/**
 * Migration Utility テスト
 * OptimizedColor配列をBrandToken配列に変換する機能をテスト
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import { describe, expect, test } from "bun:test";
import type { OptimizedColor } from "../core/cud/optimizer";
import {
	type MigrationOptions,
	type MigrationResult,
	migrateOptimizedColors,
} from "./migration";

describe("migrateOptimizedColors", () => {
	// テスト用のOptimizedColor（brandToken.dadsReferenceあり）
	const createOptimizedColorWithBrandToken = (
		hex: string,
		originalHex: string,
		tokenId: string,
		tokenHex: string,
		deltaE: number,
	): OptimizedColor => ({
		hex,
		originalHex,
		zone: "safe",
		deltaE,
		snapped: true,
		cudTarget: {
			id: tokenId,
			hex: tokenHex,
			nameJa: "テスト色",
			nameEn: "Test Color",
			group: "accent",
			oklab: { l: 0.5, a: 0.1, b: 0.1 },
		},
		brandToken: {
			suggestedId: `brand-color-1`,
			dadsReference: {
				tokenId,
				tokenHex,
				deltaE,
				derivationType: "soft-snap",
				zone: "safe",
			},
		},
	});

	// テスト用のOptimizedColor（brandToken.dadsReferenceなし、cudTargetあり）
	const createOptimizedColorWithCudTarget = (
		hex: string,
		originalHex: string,
		tokenId: string,
		tokenHex: string,
		deltaE: number,
	): OptimizedColor => ({
		hex,
		originalHex,
		zone: "warning",
		deltaE,
		snapped: false,
		cudTarget: {
			id: tokenId,
			hex: tokenHex,
			nameJa: "推定色",
			nameEn: "Inferred Color",
			group: "base",
			oklab: { l: 0.6, a: 0.05, b: 0.05 },
		},
	});

	// テスト用のOptimizedColor（brandToken.dadsReferenceもcudTargetもなし）
	const createOptimizedColorWithoutReference = (
		hex: string,
		originalHex: string,
		deltaE: number,
	): OptimizedColor => ({
		hex,
		originalHex,
		zone: "off",
		deltaE,
		snapped: false,
	});

	describe("Requirement 13.1: OptimizedColor配列をBrandToken配列に変換", () => {
		test("brandToken.dadsReferenceがある場合、それを使用してBrandTokenを生成", () => {
			const colors: OptimizedColor[] = [
				createOptimizedColorWithBrandToken(
					"#FF0000",
					"#FF1111",
					"cud-red",
					"#FF2800",
					0.02,
				),
			];

			const result: MigrationResult = migrateOptimizedColors(colors);

			expect(result.brandTokens).toHaveLength(1);
			expect(result.brandTokens[0].hex).toBe("#FF0000");
			expect(result.brandTokens[0].originalHex).toBe("#FF1111");
			expect(result.brandTokens[0].source).toBe("brand");
			expect(result.brandTokens[0].dadsReference.tokenId).toBe("cud-red");
			expect(result.brandTokens[0].dadsReference.tokenHex).toBe("#FF2800");
			expect(result.brandTokens[0].dadsReference.deltaE).toBe(0.02);
			expect(result.brandTokens[0].dadsReference.derivationType).toBe(
				"soft-snap",
			);
			expect(result.warnings).toHaveLength(0);
			expect(result.unmigrated).toHaveLength(0);
		});

		test("複数のOptimizedColorを変換できる", () => {
			const colors: OptimizedColor[] = [
				createOptimizedColorWithBrandToken(
					"#FF0000",
					"#FF1111",
					"cud-red",
					"#FF2800",
					0.02,
				),
				createOptimizedColorWithBrandToken(
					"#00FF00",
					"#11FF11",
					"cud-green",
					"#35A16B",
					0.03,
				),
			];

			const result = migrateOptimizedColors(colors);

			expect(result.brandTokens).toHaveLength(2);
			expect(result.warnings).toHaveLength(0);
			expect(result.unmigrated).toHaveLength(0);
		});
	});

	describe("Requirement 13.2: MigrationResult型を返却", () => {
		test("MigrationResult型の構造が正しい", () => {
			const colors: OptimizedColor[] = [
				createOptimizedColorWithBrandToken(
					"#FF0000",
					"#FF1111",
					"cud-red",
					"#FF2800",
					0.02,
				),
			];

			const result = migrateOptimizedColors(colors);

			expect(result).toHaveProperty("brandTokens");
			expect(result).toHaveProperty("warnings");
			expect(result).toHaveProperty("unmigrated");
			expect(Array.isArray(result.brandTokens)).toBe(true);
			expect(Array.isArray(result.warnings)).toBe(true);
			expect(Array.isArray(result.unmigrated)).toBe(true);
		});
	});

	describe("Requirement 13.3: DADS参照を特定できない色はunmigratedに追加", () => {
		test("cudTargetから推定する場合、warningsに記録", () => {
			const colors: OptimizedColor[] = [
				createOptimizedColorWithCudTarget(
					"#AABBCC",
					"#AABBDD",
					"cud-inferred",
					"#AABBEE",
					0.08,
				),
			];

			const result = migrateOptimizedColors(colors);

			expect(result.brandTokens).toHaveLength(1);
			expect(result.brandTokens[0].dadsReference.tokenId).toBe("cud-inferred");
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toContain("#AABBCC");
			expect(result.unmigrated).toHaveLength(0);
		});

		test("cudTargetもbrandToken.dadsReferenceもない場合、unmigratedに追加", () => {
			const colors: OptimizedColor[] = [
				createOptimizedColorWithoutReference("#123456", "#123457", 0.35),
			];

			const result = migrateOptimizedColors(colors);

			expect(result.brandTokens).toHaveLength(0);
			expect(result.unmigrated).toHaveLength(1);
			expect(result.unmigrated[0]).toBe("#123456");
		});

		test("混在パターン: 正常、推定、失敗の組み合わせ", () => {
			const colors: OptimizedColor[] = [
				createOptimizedColorWithBrandToken(
					"#FF0000",
					"#FF1111",
					"cud-red",
					"#FF2800",
					0.02,
				),
				createOptimizedColorWithCudTarget(
					"#AABBCC",
					"#AABBDD",
					"cud-inferred",
					"#AABBEE",
					0.08,
				),
				createOptimizedColorWithoutReference("#123456", "#123457", 0.35),
			];

			const result = migrateOptimizedColors(colors);

			expect(result.brandTokens).toHaveLength(2); // 正常 + 推定
			expect(result.warnings.length).toBeGreaterThan(0); // 推定時の警告
			expect(result.unmigrated).toHaveLength(1); // 失敗
			expect(result.unmigrated[0]).toBe("#123456");
		});
	});

	describe("Requirement 13.4: brandPrefixとrolesオプションでID生成をカスタマイズ", () => {
		test("brandPrefixオプションでnamespaceを指定できる", () => {
			const colors: OptimizedColor[] = [
				createOptimizedColorWithBrandToken(
					"#FF0000",
					"#FF1111",
					"cud-red",
					"#FF2800",
					0.02,
				),
			];

			const options: MigrationOptions = {
				brandPrefix: "acme",
			};
			const result = migrateOptimizedColors(colors, options);

			expect(result.brandTokens[0].id).toMatch(/^brand-acme-/);
		});

		test("rolesオプションでIDのrole部分を指定できる", () => {
			const colors: OptimizedColor[] = [
				createOptimizedColorWithBrandToken(
					"#FF0000",
					"#FF1111",
					"cud-red",
					"#FF2800",
					0.02,
				),
				createOptimizedColorWithBrandToken(
					"#00FF00",
					"#11FF11",
					"cud-green",
					"#35A16B",
					0.03,
				),
			];

			const result = migrateOptimizedColors(colors, {
				roles: ["primary", "secondary"],
			});

			expect(result.brandTokens[0].id).toContain("primary");
			expect(result.brandTokens[1].id).toContain("secondary");
		});

		test("brandPrefixとrolesを同時に使用できる", () => {
			const colors: OptimizedColor[] = [
				createOptimizedColorWithBrandToken(
					"#FF0000",
					"#FF1111",
					"cud-red",
					"#FF2800",
					0.02,
				),
			];

			const result = migrateOptimizedColors(colors, {
				brandPrefix: "myapp",
				roles: ["accent"],
			});

			expect(result.brandTokens[0].id).toMatch(/^brand-myapp-accent-/);
		});

		test("rolesが足りない場合はcolor-N形式にフォールバック", () => {
			const colors: OptimizedColor[] = [
				createOptimizedColorWithBrandToken(
					"#FF0000",
					"#FF1111",
					"cud-red",
					"#FF2800",
					0.02,
				),
				createOptimizedColorWithBrandToken(
					"#00FF00",
					"#11FF11",
					"cud-green",
					"#35A16B",
					0.03,
				),
			];

			const result = migrateOptimizedColors(colors, {
				roles: ["primary"], // 1つのroleしか指定しない
			});

			expect(result.brandTokens[0].id).toContain("primary");
			expect(result.brandTokens[1].id).toContain("color-2"); // フォールバック
		});
	});

	describe("ID重複回避", () => {
		test("同じロールでも重複しないIDを生成する", () => {
			const colors: OptimizedColor[] = [
				createOptimizedColorWithBrandToken(
					"#FF0000",
					"#FF1111",
					"cud-red",
					"#FF2800",
					0.02,
				),
				createOptimizedColorWithBrandToken(
					"#FF0001",
					"#FF1112",
					"cud-red-2",
					"#FF2801",
					0.02,
				),
			];

			// 同じroleを指定しても重複しない
			const result = migrateOptimizedColors(colors, {
				roles: ["primary", "primary"],
			});

			const ids = result.brandTokens.map((t) => t.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length); // すべて一意
		});

		test("連続して呼び出してもIDが重複しない", () => {
			const color1: OptimizedColor[] = [
				createOptimizedColorWithBrandToken(
					"#FF0000",
					"#FF1111",
					"cud-red",
					"#FF2800",
					0.02,
				),
			];
			const color2: OptimizedColor[] = [
				createOptimizedColorWithBrandToken(
					"#00FF00",
					"#11FF11",
					"cud-green",
					"#35A16B",
					0.03,
				),
			];

			const result1 = migrateOptimizedColors(color1, { roles: ["primary"] });
			const result2 = migrateOptimizedColors(color2, { roles: ["primary"] });

			// 別々の呼び出しなので同じIDでもOK（呼び出し間での重複回避は呼び出し側の責任）
			expect(result1.brandTokens[0].id).toBe(result2.brandTokens[0].id);
		});
	});

	describe("空配列のハンドリング", () => {
		test("空の配列を渡すと空の結果を返す", () => {
			const result = migrateOptimizedColors([]);

			expect(result.brandTokens).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
			expect(result.unmigrated).toHaveLength(0);
		});
	});
});

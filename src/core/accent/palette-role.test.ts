/**
 * PaletteRole Tests
 *
 * Task 10.2: 役割ベースパレット選択の実装
 * Issue #7: palette-role.ts のテストカバレッジ追加
 */

import { describe, expect, it, mock, spyOn } from "bun:test";
import {
	ANALOGOUS_ROLE_CONFIG,
	COMPLEMENTARY_ROLE_CONFIG,
	COMPOUND_ROLE_CONFIG,
	getPaletteRole,
	getRoleConfigForHarmony,
	getRolesForCount,
	MONOCHROMATIC_ROLE_CONFIG,
	PALETTE_ROLES,
	type PaletteRole,
	type PaletteRoleId,
	SHADES_ROLE_CONFIG,
	SPLIT_COMPLEMENTARY_ROLE_CONFIG,
	SQUARE_ROLE_CONFIG,
	TRIADIC_ROLE_CONFIG,
} from "./palette-role";

describe("PaletteRole", () => {
	describe("PALETTE_ROLES", () => {
		it("should define 10 role types", () => {
			const roleIds = Object.keys(PALETTE_ROLES);
			expect(roleIds.length).toBe(10);
		});

		it("should include all required role IDs", () => {
			const roleIds = Object.keys(PALETTE_ROLES) as PaletteRoleId[];
			expect(roleIds).toContain("accent");
			expect(roleIds).toContain("accentLight");
			expect(roleIds).toContain("accentDark");
			expect(roleIds).toContain("secondary");
			expect(roleIds).toContain("secondaryLight");
			expect(roleIds).toContain("secondaryDark");
			expect(roleIds).toContain("tertiary");
			expect(roleIds).toContain("baseMuted");
			expect(roleIds).toContain("baseLight");
			expect(roleIds).toContain("baseDark");
		});

		it("should have correct stepOffset for light roles (positive = lighter)", () => {
			// 正の値はより明るい色を指定（DADSでは小さいステップ値）
			expect(PALETTE_ROLES.accentLight.stepOffset).toBe(300);
			expect(PALETTE_ROLES.secondaryLight.stepOffset).toBe(300);
			expect(PALETTE_ROLES.baseLight.stepOffset).toBe(400);
		});

		it("should have correct stepOffset for dark roles (negative = darker)", () => {
			// 負の値はより暗い色を指定（DADSでは大きいステップ値）
			expect(PALETTE_ROLES.accentDark.stepOffset).toBe(-400);
			expect(PALETTE_ROLES.secondaryDark.stepOffset).toBe(-400);
			expect(PALETTE_ROLES.baseDark.stepOffset).toBe(-300);
		});

		it("should have correct stepOffset for base roles", () => {
			expect(PALETTE_ROLES.accent.stepOffset).toBe(0);
			expect(PALETTE_ROLES.secondary.stepOffset).toBe(0);
			expect(PALETTE_ROLES.baseMuted.stepOffset).toBe(200);
		});

		it("should have bilingual names for all roles", () => {
			for (const roleId of Object.keys(PALETTE_ROLES) as PaletteRoleId[]) {
				const role = PALETTE_ROLES[roleId];
				expect(role.nameJa).toBeDefined();
				expect(role.nameEn).toBeDefined();
				expect(role.nameJa.length).toBeGreaterThan(0);
				expect(role.nameEn.length).toBeGreaterThan(0);
			}
		});
	});

	describe("getPaletteRole", () => {
		it("should return role with correct id", () => {
			const role = getPaletteRole("accent");
			expect(role.id).toBe("accent");
		});

		it("should include all properties from PALETTE_ROLES", () => {
			const role = getPaletteRole("accentLight");
			expect(role.id).toBe("accentLight");
			expect(role.nameJa).toBe("アクセント（明）");
			expect(role.nameEn).toBe("Accent Light");
			expect(role.stepOffset).toBe(300);
			expect(role.hueDirection).toBe("harmony");
		});

		it("should return role for harmony direction", () => {
			const role = getPaletteRole("secondary");
			expect(role.hueDirection).toBe("harmony");
			expect(role.harmonyDirectionIndex).toBe(1);
		});

		it("should return role for third harmony direction", () => {
			const role = getPaletteRole("tertiary");
			expect(role.hueDirection).toBe("harmony");
			expect(role.harmonyDirectionIndex).toBe(2);
		});

		it("should return role for base direction", () => {
			const role = getPaletteRole("baseMuted");
			expect(role.hueDirection).toBe("base");
			expect(role.harmonyDirectionIndex).toBeUndefined();
		});
	});

	describe("getRoleConfigForHarmony", () => {
		it("should return COMPLEMENTARY_ROLE_CONFIG for complementary", () => {
			const config = getRoleConfigForHarmony("complementary");
			expect(config).toBe(COMPLEMENTARY_ROLE_CONFIG);
		});

		it("should return TRIADIC_ROLE_CONFIG for triadic", () => {
			const config = getRoleConfigForHarmony("triadic");
			expect(config).toBe(TRIADIC_ROLE_CONFIG);
		});

		it("should return ANALOGOUS_ROLE_CONFIG for analogous", () => {
			const config = getRoleConfigForHarmony("analogous");
			expect(config).toBe(ANALOGOUS_ROLE_CONFIG);
		});

		it("should return SPLIT_COMPLEMENTARY_ROLE_CONFIG for split-complementary", () => {
			const config = getRoleConfigForHarmony("split-complementary");
			expect(config).toBe(SPLIT_COMPLEMENTARY_ROLE_CONFIG);
		});

		it("should return MONOCHROMATIC_ROLE_CONFIG for monochromatic", () => {
			const config = getRoleConfigForHarmony("monochromatic");
			expect(config).toBe(MONOCHROMATIC_ROLE_CONFIG);
		});

		it("should return SHADES_ROLE_CONFIG for shades", () => {
			const config = getRoleConfigForHarmony("shades");
			expect(config).toBe(SHADES_ROLE_CONFIG);
		});

		it("should return COMPOUND_ROLE_CONFIG for compound", () => {
			const config = getRoleConfigForHarmony("compound");
			expect(config).toBe(COMPOUND_ROLE_CONFIG);
		});

		it("should return SQUARE_ROLE_CONFIG for square", () => {
			const config = getRoleConfigForHarmony("square");
			expect(config).toBe(SQUARE_ROLE_CONFIG);
		});

		it("should log warning for unknown harmony type", () => {
			const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
			// @ts-expect-error: Testing unknown harmony type
			getRoleConfigForHarmony("unknown-type");
			expect(warnSpy).toHaveBeenCalled();
			warnSpy.mockRestore();
		});
	});

	describe("getRolesForCount", () => {
		it("should return 1 role for count 1", () => {
			const roles = getRolesForCount("complementary", 1);
			expect(roles.length).toBe(1);
		});

		it("should return 2 roles for count 2", () => {
			const roles = getRolesForCount("complementary", 2);
			expect(roles.length).toBe(2);
		});

		it("should return 3 roles for count 3", () => {
			const roles = getRolesForCount("triadic", 3);
			expect(roles.length).toBe(3);
		});

		it("should return PaletteRole objects with id", () => {
			const roles = getRolesForCount("complementary", 3);
			for (const role of roles) {
				expect(role.id).toBeDefined();
				expect(role.nameJa).toBeDefined();
				expect(role.nameEn).toBeDefined();
				expect(typeof role.stepOffset).toBe("number");
			}
		});

		it("should return correct roles for complementary 1-count", () => {
			const roles = getRolesForCount("complementary", 1);
			const ids = roles.map((r) => r.id);
			expect(ids).toEqual(["accent"]);
		});

		it("should return correct roles for complementary 2-count", () => {
			const roles = getRolesForCount("complementary", 2);
			const ids = roles.map((r) => r.id);
			expect(ids).toEqual(["accent", "accentDark"]);
		});

		it("should return correct roles for triadic 3-count", () => {
			const roles = getRolesForCount("triadic", 3);
			const ids = roles.map((r) => r.id);
			expect(ids).toEqual(["accent", "secondary", "accentLight"]);
		});

		it("should return correct roles for monochromatic 1-count", () => {
			const roles = getRolesForCount("monochromatic", 1);
			const ids = roles.map((r) => r.id);
			expect(ids).toEqual(["baseMuted"]);
		});

		it("should include tertiary for square 3-count", () => {
			const roles = getRolesForCount("square", 3);
			const ids = roles.map((r) => r.id);
			expect(ids).toEqual(["accent", "secondary", "tertiary"]);
		});
	});

	describe("Role Config Structures", () => {
		const roleConfigs = [
			{ name: "COMPLEMENTARY", config: COMPLEMENTARY_ROLE_CONFIG },
			{ name: "TRIADIC", config: TRIADIC_ROLE_CONFIG },
			{ name: "ANALOGOUS", config: ANALOGOUS_ROLE_CONFIG },
			{ name: "SPLIT_COMPLEMENTARY", config: SPLIT_COMPLEMENTARY_ROLE_CONFIG },
			{ name: "MONOCHROMATIC", config: MONOCHROMATIC_ROLE_CONFIG },
			{ name: "SHADES", config: SHADES_ROLE_CONFIG },
			{ name: "COMPOUND", config: COMPOUND_ROLE_CONFIG },
			{ name: "SQUARE", config: SQUARE_ROLE_CONFIG },
		];

		for (const { name, config } of roleConfigs) {
			describe(`${name}_ROLE_CONFIG`, () => {
				it("should have configurations for counts 1, 2, 3", () => {
					expect(config[1]).toBeDefined();
					expect(config[2]).toBeDefined();
					expect(config[3]).toBeDefined();
				});

				it("should have increasing role counts", () => {
					expect(config[1].length).toBe(1);
					expect(config[2].length).toBe(2);
					expect(config[3].length).toBe(3);
				});

				it("should only contain valid role IDs", () => {
					const validIds = Object.keys(PALETTE_ROLES);
					for (const count of [1, 2, 3] as const) {
						for (const roleId of config[count]) {
							expect(validIds).toContain(roleId);
						}
					}
				});
			});
		}
	});

	describe("stepOffset semantics (Issue #2/#3 verification)", () => {
		/**
		 * DADS仕様: 50=最も明るい、1200=最も暗い
		 * 計算式: targetStep = baseStep - stepOffset
		 *
		 * 正のstepOffset → 小さいステップ → 明るい
		 * 負のstepOffset → 大きいステップ → 暗い
		 */

		it("positive stepOffset should result in lighter color (lower step)", () => {
			const baseStep = 500;
			const lightRole = PALETTE_ROLES.accentLight;

			// targetStep = 500 - 300 = 200 (より小さい = より明るい)
			const targetStep = baseStep - lightRole.stepOffset;
			expect(targetStep).toBe(200);
			expect(targetStep).toBeLessThan(baseStep);
		});

		it("negative stepOffset should result in darker color (higher step)", () => {
			const baseStep = 500;
			const darkRole = PALETTE_ROLES.accentDark;

			// targetStep = 500 - (-400) = 900 (より大きい = より暗い)
			const targetStep = baseStep - darkRole.stepOffset;
			expect(targetStep).toBe(900);
			expect(targetStep).toBeGreaterThan(baseStep);
		});

		it("zero stepOffset should maintain base step", () => {
			const baseStep = 500;
			const accentRole = PALETTE_ROLES.accent;

			// targetStep = 500 - 0 = 500 (変化なし)
			const targetStep = baseStep - accentRole.stepOffset;
			expect(targetStep).toBe(500);
			expect(targetStep).toBe(baseStep);
		});
	});
});

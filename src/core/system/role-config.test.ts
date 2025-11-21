import { describe, expect, test } from "bun:test";
import {
	DEFAULT_ROLE_CONFIGS,
	getRoleConfig,
	type RoleConfig,
	type RoleType,
	validateRoleConfig,
} from "./role-config";

describe("RoleConfig", () => {
	describe("RoleType", () => {
		test("should define all 8 role types", () => {
			const expectedRoles: RoleType[] = [
				"primary",
				"secondary",
				"tertiary",
				"error",
				"warning",
				"success",
				"neutral",
				"neutralVariant",
			];

			for (const role of expectedRoles) {
				expect(DEFAULT_ROLE_CONFIGS[role]).toBeDefined();
			}
		});
	});

	describe("DEFAULT_ROLE_CONFIGS", () => {
		describe("primary role", () => {
			test("should have high chroma range (0.16-0.25)", () => {
				const config = DEFAULT_ROLE_CONFIGS.primary;
				expect(config.chromaRange[0]).toBe(0.16);
				expect(config.chromaRange[1]).toBe(0.25);
			});

			test("should have mid lightness range (0.4-0.7)", () => {
				const config = DEFAULT_ROLE_CONFIGS.primary;
				expect(config.lightnessRange[0]).toBe(0.4);
				expect(config.lightnessRange[1]).toBe(0.7);
			});
		});

		describe("secondary role", () => {
			test("should have medium chroma range (0.08-0.16)", () => {
				const config = DEFAULT_ROLE_CONFIGS.secondary;
				expect(config.chromaRange[0]).toBe(0.08);
				expect(config.chromaRange[1]).toBe(0.16);
			});

			test("should have mid lightness range (0.4-0.7)", () => {
				const config = DEFAULT_ROLE_CONFIGS.secondary;
				expect(config.lightnessRange[0]).toBe(0.4);
				expect(config.lightnessRange[1]).toBe(0.7);
			});
		});

		describe("tertiary role", () => {
			test("should have low-medium chroma range (0.06-0.12)", () => {
				const config = DEFAULT_ROLE_CONFIGS.tertiary;
				expect(config.chromaRange[0]).toBe(0.06);
				expect(config.chromaRange[1]).toBe(0.12);
			});
		});

		describe("error role", () => {
			test("should have high chroma for visibility", () => {
				const config = DEFAULT_ROLE_CONFIGS.error;
				expect(config.chromaRange[0]).toBeGreaterThanOrEqual(0.16);
			});

			test("should have red hue range (15°-45°)", () => {
				const config = DEFAULT_ROLE_CONFIGS.error;
				expect(config.hueRange).toBeDefined();
				expect(config.hueRange?.[0]).toBe(15);
				expect(config.hueRange?.[1]).toBe(45);
			});
		});

		describe("warning role", () => {
			test("should have medium-high chroma for visibility", () => {
				const config = DEFAULT_ROLE_CONFIGS.warning;
				expect(config.chromaRange[0]).toBeGreaterThanOrEqual(0.12);
			});

			test("should have yellow/orange hue range (60°-90°)", () => {
				const config = DEFAULT_ROLE_CONFIGS.warning;
				expect(config.hueRange).toBeDefined();
				expect(config.hueRange?.[0]).toBe(60);
				expect(config.hueRange?.[1]).toBe(90);
			});
		});

		describe("success role", () => {
			test("should have medium chroma for good visibility", () => {
				const config = DEFAULT_ROLE_CONFIGS.success;
				expect(config.chromaRange[0]).toBeGreaterThanOrEqual(0.08);
			});

			test("should have green hue range (140°-160°)", () => {
				const config = DEFAULT_ROLE_CONFIGS.success;
				expect(config.hueRange).toBeDefined();
				expect(config.hueRange?.[0]).toBe(140);
				expect(config.hueRange?.[1]).toBe(160);
			});
		});

		describe("neutral role", () => {
			test("should have very low chroma range (0.00-0.02)", () => {
				const config = DEFAULT_ROLE_CONFIGS.neutral;
				expect(config.chromaRange[0]).toBe(0.0);
				expect(config.chromaRange[1]).toBe(0.02);
			});

			test("should be marked as neutral", () => {
				const config = DEFAULT_ROLE_CONFIGS.neutral;
				expect(config.isNeutral).toBe(true);
			});
		});

		describe("neutralVariant role", () => {
			test("should have low chroma range (0.02-0.06) for subtle color tint", () => {
				const config = DEFAULT_ROLE_CONFIGS.neutralVariant;
				expect(config.chromaRange[0]).toBe(0.02);
				expect(config.chromaRange[1]).toBe(0.06);
			});

			test("should be marked as neutral and variant", () => {
				const config = DEFAULT_ROLE_CONFIGS.neutralVariant;
				expect(config.isNeutral).toBe(true);
				expect(config.isVariant).toBe(true);
			});
		});
	});

	describe("getRoleConfig", () => {
		test("should return default config for a role", () => {
			const config = getRoleConfig("primary");
			expect(config).toEqual(DEFAULT_ROLE_CONFIGS.primary);
		});

		test("should merge custom config with defaults", () => {
			const customConfig: Partial<RoleConfig> = {
				chromaRange: [0.2, 0.3],
			};
			const config = getRoleConfig("primary", customConfig);
			expect(config.chromaRange).toEqual([0.2, 0.3]);
			expect(config.lightnessRange).toEqual(
				DEFAULT_ROLE_CONFIGS.primary.lightnessRange,
			);
		});
	});

	describe("validateRoleConfig", () => {
		test("should return valid for correct config", () => {
			const result = validateRoleConfig({
				name: "primary",
				chromaRange: [0.16, 0.25],
				lightnessRange: [0.4, 0.7],
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		test("should return error for invalid chroma range (min > max)", () => {
			const result = validateRoleConfig({
				name: "primary",
				chromaRange: [0.25, 0.16],
				lightnessRange: [0.4, 0.7],
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"chromaRange: min must be less than or equal to max",
			);
		});

		test("should return error for invalid lightness range (min > max)", () => {
			const result = validateRoleConfig({
				name: "primary",
				chromaRange: [0.16, 0.25],
				lightnessRange: [0.7, 0.4],
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"lightnessRange: min must be less than or equal to max",
			);
		});

		test("should return error for chroma out of bounds (> 0.4)", () => {
			const result = validateRoleConfig({
				name: "primary",
				chromaRange: [0.16, 0.5],
				lightnessRange: [0.4, 0.7],
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"chromaRange: values must be between 0 and 0.4",
			);
		});

		test("should return error for lightness out of bounds", () => {
			const result = validateRoleConfig({
				name: "primary",
				chromaRange: [0.16, 0.25],
				lightnessRange: [-0.1, 1.1],
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"lightnessRange: values must be between 0 and 1",
			);
		});

		test("should return error for invalid hue range", () => {
			const result = validateRoleConfig({
				name: "error",
				chromaRange: [0.16, 0.25],
				lightnessRange: [0.4, 0.7],
				hueRange: [45, 15],
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"hueRange: min must be less than or equal to max",
			);
		});

		test("should return error for hue out of bounds", () => {
			const result = validateRoleConfig({
				name: "error",
				chromaRange: [0.16, 0.25],
				lightnessRange: [0.4, 0.7],
				hueRange: [-10, 370],
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"hueRange: values must be between 0 and 360",
			);
		});
	});
});

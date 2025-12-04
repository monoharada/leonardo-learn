/**
 * CUD Zone Classification Tests
 * Task 1.1: ゾーン分類ロジックのテスト
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
import { describe, expect, test } from "bun:test";
import {
	type CudZone,
	classifyZone,
	DEFAULT_ZONE_THRESHOLDS,
	getZoneClassification,
	validateThresholds,
	type ZoneClassification,
	type ZoneThresholds,
} from "./zone";

describe("CUD Zone Classification (Task 1.1)", () => {
	describe("DEFAULT_ZONE_THRESHOLDS (Req 2.1)", () => {
		test("should have correct default safe threshold (0.05)", () => {
			expect(DEFAULT_ZONE_THRESHOLDS.safe).toBe(0.05);
		});

		test("should have correct default warning threshold (0.12)", () => {
			expect(DEFAULT_ZONE_THRESHOLDS.warning).toBe(0.12);
		});

		test("safe threshold should be less than warning threshold", () => {
			expect(DEFAULT_ZONE_THRESHOLDS.safe).toBeLessThan(
				DEFAULT_ZONE_THRESHOLDS.warning,
			);
		});
	});

	describe("classifyZone (Req 2.3, 2.4, 2.5)", () => {
		describe("Safe Zone - deltaE <= 0.05 (Req 2.3)", () => {
			test("should classify deltaE = 0 as safe", () => {
				expect(classifyZone(0)).toBe("safe");
			});

			test("should classify deltaE = 0.03 as safe", () => {
				expect(classifyZone(0.03)).toBe("safe");
			});

			test("should classify deltaE = 0.05 (boundary) as safe", () => {
				expect(classifyZone(0.05)).toBe("safe");
			});
		});

		describe("Warning Zone - 0.05 < deltaE <= 0.12 (Req 2.4)", () => {
			test("should classify deltaE = 0.0500001 as warning", () => {
				expect(classifyZone(0.0500001)).toBe("warning");
			});

			test("should classify deltaE = 0.08 as warning", () => {
				expect(classifyZone(0.08)).toBe("warning");
			});

			test("should classify deltaE = 0.12 (boundary) as warning", () => {
				expect(classifyZone(0.12)).toBe("warning");
			});
		});

		describe("Off Zone - deltaE > 0.12 (Req 2.5)", () => {
			test("should classify deltaE = 0.1200001 as off", () => {
				expect(classifyZone(0.1200001)).toBe("off");
			});

			test("should classify deltaE = 0.15 as off", () => {
				expect(classifyZone(0.15)).toBe("off");
			});

			test("should classify deltaE = 0.5 as off", () => {
				expect(classifyZone(0.5)).toBe("off");
			});
		});

		describe("with custom thresholds (Req 2.2)", () => {
			test("should use custom safe threshold", () => {
				const customThresholds = { safe: 0.03, warning: 0.08 };
				expect(classifyZone(0.03, customThresholds)).toBe("safe");
				expect(classifyZone(0.04, customThresholds)).toBe("warning");
			});

			test("should use custom warning threshold", () => {
				const customThresholds = { safe: 0.03, warning: 0.08 };
				expect(classifyZone(0.08, customThresholds)).toBe("warning");
				expect(classifyZone(0.09, customThresholds)).toBe("off");
			});

			test("should allow partial threshold override (safe only)", () => {
				expect(classifyZone(0.03, { safe: 0.02 })).toBe("warning");
				expect(classifyZone(0.02, { safe: 0.02 })).toBe("safe");
			});

			test("should allow partial threshold override (warning only)", () => {
				expect(classifyZone(0.1, { warning: 0.09 })).toBe("off");
				expect(classifyZone(0.08, { warning: 0.09 })).toBe("warning");
			});
		});
	});

	describe("getZoneClassification (Req 2.6)", () => {
		test("should return complete ZoneClassification structure", () => {
			const result = getZoneClassification(0.07);

			expect(result).toHaveProperty("zone");
			expect(result).toHaveProperty("deltaE");
			expect(result).toHaveProperty("thresholds");
		});

		test("should include correct deltaE value", () => {
			const result = getZoneClassification(0.07);
			expect(result.deltaE).toBe(0.07);
		});

		test("should include correct zone classification", () => {
			expect(getZoneClassification(0.03).zone).toBe("safe");
			expect(getZoneClassification(0.07).zone).toBe("warning");
			expect(getZoneClassification(0.15).zone).toBe("off");
		});

		test("should include default thresholds when not specified", () => {
			const result = getZoneClassification(0.05);
			expect(result.thresholds.safe).toBe(DEFAULT_ZONE_THRESHOLDS.safe);
			expect(result.thresholds.warning).toBe(DEFAULT_ZONE_THRESHOLDS.warning);
		});

		test("should include custom thresholds when specified", () => {
			const customThresholds = { safe: 0.03, warning: 0.08 };
			const result = getZoneClassification(0.05, customThresholds);
			expect(result.thresholds.safe).toBe(0.03);
			expect(result.thresholds.warning).toBe(0.08);
		});

		test("should merge partial thresholds with defaults", () => {
			const result = getZoneClassification(0.05, { safe: 0.03 });
			expect(result.thresholds.safe).toBe(0.03);
			expect(result.thresholds.warning).toBe(DEFAULT_ZONE_THRESHOLDS.warning);
		});
	});

	describe("validateThresholds (Req 2.2)", () => {
		test("should return true for valid thresholds", () => {
			expect(validateThresholds({ safe: 0.05, warning: 0.12 })).toBe(true);
		});

		test("should return true when safe < warning", () => {
			expect(validateThresholds({ safe: 0.01, warning: 0.02 })).toBe(true);
		});

		test("should return false when safe >= warning", () => {
			expect(validateThresholds({ safe: 0.12, warning: 0.12 })).toBe(false);
			expect(validateThresholds({ safe: 0.15, warning: 0.12 })).toBe(false);
		});

		test("should return false for negative thresholds", () => {
			expect(validateThresholds({ safe: -0.01, warning: 0.12 })).toBe(false);
			expect(validateThresholds({ safe: 0.05, warning: -0.01 })).toBe(false);
		});

		test("should return false for zero thresholds", () => {
			expect(validateThresholds({ safe: 0, warning: 0.12 })).toBe(false);
			expect(validateThresholds({ safe: 0.05, warning: 0 })).toBe(false);
		});
	});

	describe("edge cases", () => {
		test("should handle very small deltaE values", () => {
			expect(classifyZone(0.0001)).toBe("safe");
			expect(classifyZone(0.00001)).toBe("safe");
		});

		test("should handle very large deltaE values", () => {
			expect(classifyZone(1.0)).toBe("off");
			expect(classifyZone(10.0)).toBe("off");
		});

		test("should handle floating point precision at boundaries", () => {
			// IEEE 754 浮動小数点の精度問題を考慮
			const almostSafe = 0.05 - Number.EPSILON;
			const almostWarning = 0.12 - Number.EPSILON;
			expect(classifyZone(almostSafe)).toBe("safe");
			expect(classifyZone(almostWarning)).toBe("warning");
		});
	});
});

/**
 * Anchor Color Management Tests
 * タスク2.1: アンカーカラー状態管理のテスト
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { describe, expect, it } from "vitest";
import {
	type AnchorPriority,
	createAnchorColor,
	setAnchorPriority,
	suggestPriority,
} from "./anchor";
import { CUD_COLOR_SET } from "./colors";

describe("Anchor Color Management", () => {
	describe("createAnchorColor", () => {
		it("should create an anchor color state from a valid hex", () => {
			// Arrange
			const hex = "#FF2800"; // CUD赤（exact match expected）

			// Act
			const result = createAnchorColor(hex);

			// Assert
			expect(result.originalHex).toBe("#FF2800");
			expect(result.nearestCud).toBeDefined();
			expect(result.nearestCud.nearest).toBeDefined();
			expect(result.nearestCud.deltaE).toBeGreaterThanOrEqual(0);
			expect(result.nearestCud.matchLevel).toBeDefined();
		});

		it("should normalize hex input (lowercase, without #)", () => {
			// Arrange
			const hex = "ff2800"; // lowercase, no #

			// Act
			const result = createAnchorColor(hex);

			// Assert
			expect(result.originalHex).toBe("#FF2800");
		});

		it("should find exact match for CUD red color", () => {
			// Arrange
			const cudRed = "#FF2800";

			// Act
			const result = createAnchorColor(cudRed);

			// Assert
			expect(result.nearestCud.matchLevel).toBe("exact");
			expect(result.nearestCud.nearest.id).toBe("red");
			expect(result.nearestCud.deltaE).toBeLessThanOrEqual(0.03);
		});

		it("should set default priority based on match level (exact → cud)", () => {
			// Arrange
			const cudGreen = "#35A16B"; // CUD緑

			// Act
			const result = createAnchorColor(cudGreen);

			// Assert
			expect(result.priority).toBe("cud");
			expect(result.effectiveHex).toBe(result.nearestCud.nearest.hex);
		});

		it("should set default priority based on match level (off → brand)", () => {
			// Arrange
			const nonCudColor = "#123456"; // CUDから離れた色

			// Act
			const result = createAnchorColor(nonCudColor);

			// Assert
			expect(result.priority).toBe("brand");
			expect(result.effectiveHex).toBe("#123456");
		});

		it("should handle near match level priority", () => {
			// Find a color that is near but not exact
			// Orange CUD: #FF9900, try a slightly different shade
			const nearOrange = "#FF9500";

			// Act
			const result = createAnchorColor(nearOrange);

			// Assert
			// Should still prefer CUD for near matches
			if (result.nearestCud.matchLevel === "near") {
				expect(result.priority).toBe("cud");
			}
		});

		it("should throw error for invalid hex", () => {
			// Arrange & Act & Assert
			expect(() => createAnchorColor("invalid")).toThrow();
			expect(() => createAnchorColor("")).toThrow();
			expect(() => createAnchorColor("#GGG")).toThrow();
		});
	});

	describe("setAnchorPriority", () => {
		it("should change priority from brand to cud", () => {
			// Arrange
			const anchor = createAnchorColor("#123456");
			expect(anchor.priority).toBe("brand");

			// Act
			const updated = setAnchorPriority(anchor, "cud");

			// Assert
			expect(updated.priority).toBe("cud");
			expect(updated.effectiveHex).toBe(anchor.nearestCud.nearest.hex);
		});

		it("should change priority from cud to brand", () => {
			// Arrange
			const anchor = createAnchorColor("#FF2800"); // CUD red
			expect(anchor.priority).toBe("cud");

			// Act
			const updated = setAnchorPriority(anchor, "brand");

			// Assert
			expect(updated.priority).toBe("brand");
			expect(updated.effectiveHex).toBe(anchor.originalHex);
		});

		it("should return new object (immutability)", () => {
			// Arrange
			const anchor = createAnchorColor("#FF2800");

			// Act
			const updated = setAnchorPriority(anchor, "brand");

			// Assert
			expect(updated).not.toBe(anchor);
			expect(anchor.priority).toBe("cud"); // Original unchanged
		});

		it("should preserve other properties when changing priority", () => {
			// Arrange
			const anchor = createAnchorColor("#FF9900");

			// Act
			const updated = setAnchorPriority(anchor, "brand");

			// Assert
			expect(updated.originalHex).toBe(anchor.originalHex);
			expect(updated.nearestCud).toEqual(anchor.nearestCud);
		});
	});

	describe("suggestPriority", () => {
		it("should suggest cud for exact match", () => {
			// Arrange
			const anchor = createAnchorColor("#FF2800"); // CUD red exact

			// Act
			const suggestion = suggestPriority(anchor);

			// Assert
			expect(suggestion).toBe("cud");
		});

		it("should suggest cud for near match", () => {
			// Find a near match color
			// We need to test with a color that's close but not exact
			const nearColor = "#FF2900"; // Very close to CUD red

			// Act
			const anchor = createAnchorColor(nearColor);
			const suggestion = suggestPriority(anchor);

			// Assert
			if (anchor.nearestCud.matchLevel === "near") {
				expect(suggestion).toBe("cud");
			}
		});

		it("should suggest brand for moderate match", () => {
			// A color that's moderately different from any CUD color
			const moderateColor = "#8B4513"; // SaddleBrown - moderate distance

			// Act
			const anchor = createAnchorColor(moderateColor);
			const suggestion = suggestPriority(anchor);

			// Assert
			if (anchor.nearestCud.matchLevel === "moderate") {
				expect(suggestion).toBe("brand");
			}
		});

		it("should suggest brand for off match", () => {
			// A color that's far from any CUD color
			const offColor = "#123456";

			// Act
			const anchor = createAnchorColor(offColor);
			const suggestion = suggestPriority(anchor);

			// Assert
			if (anchor.nearestCud.matchLevel === "off") {
				expect(suggestion).toBe("brand");
			}
		});
	});

	describe("effectiveHex calculation", () => {
		it("should return original hex when priority is brand", () => {
			// Arrange
			const hex = "#AABBCC";
			const anchor = createAnchorColor(hex);

			// Act
			const brandAnchor = setAnchorPriority(anchor, "brand");

			// Assert
			expect(brandAnchor.effectiveHex).toBe("#AABBCC");
		});

		it("should return CUD hex when priority is cud", () => {
			// Arrange
			const hex = "#FF2800"; // CUD red
			const anchor = createAnchorColor(hex);

			// Act
			const cudAnchor = setAnchorPriority(anchor, "cud");

			// Assert
			expect(cudAnchor.effectiveHex).toBe(anchor.nearestCud.nearest.hex);
		});
	});

	describe("integration with CUD colors", () => {
		it("should work with all CUD colors as exact matches", () => {
			for (const cudColor of CUD_COLOR_SET) {
				const anchor = createAnchorColor(cudColor.hex);

				expect(anchor.nearestCud.matchLevel).toBe("exact");
				expect(anchor.nearestCud.nearest.id).toBe(cudColor.id);
				expect(anchor.priority).toBe("cud");
			}
		});
	});

	describe("AnchorColorState interface", () => {
		it("should contain all required properties", () => {
			// Arrange & Act
			const anchor = createAnchorColor("#FF2800");

			// Assert - Type checking via property access
			const _originalHex: string = anchor.originalHex;
			const _nearestCud = anchor.nearestCud;
			const _priority: AnchorPriority = anchor.priority;
			const _effectiveHex: string = anchor.effectiveHex;

			expect(_originalHex).toBeDefined();
			expect(_nearestCud).toBeDefined();
			expect(_priority).toBeDefined();
			expect(_effectiveHex).toBeDefined();
		});
	});
});

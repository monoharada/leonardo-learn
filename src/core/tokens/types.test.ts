/**
 * DADSトークンとブランドトークンの型定義テスト
 * TDD: RED phase - テストを先に記述
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, expect, it } from "vitest";
import {
	type BrandToken,
	type ColorToken,
	type DadsChromaScale,
	type DadsColorCategory,
	type DadsColorHue,
	type DadsNeutralScale,
	type DadsToken,
	type DerivationType,
	isBrandToken,
	isDadsToken,
} from "./types";

describe("DADSトークン型定義", () => {
	describe("DadsColorHue型", () => {
		it("10色相を表現できる", () => {
			const hues: DadsColorHue[] = [
				"blue",
				"light-blue",
				"cyan",
				"green",
				"lime",
				"yellow",
				"orange",
				"red",
				"magenta",
				"purple",
			];
			expect(hues).toHaveLength(10);
		});
	});

	describe("DadsChromaScale型", () => {
		it("有彩色スケール（50-1200）を表現できる", () => {
			const scales: DadsChromaScale[] = [
				50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
			];
			expect(scales).toHaveLength(13);
		});
	});

	describe("DadsNeutralScale型", () => {
		it("無彩色スケール（420, 536を含む）を表現できる", () => {
			const scales: DadsNeutralScale[] = [
				50, 100, 200, 300, 400, 420, 500, 536, 600, 700, 800, 900,
			];
			expect(scales).toHaveLength(12);
			expect(scales).toContain(420);
			expect(scales).toContain(536);
		});
	});

	describe("DadsColorCategory型", () => {
		it("3つのカテゴリを表現できる", () => {
			const categories: DadsColorCategory[] = [
				"chromatic",
				"neutral",
				"semantic",
			];
			expect(categories).toHaveLength(3);
		});
	});

	describe("DerivationType型", () => {
		it("4つの派生タイプを表現できる", () => {
			const types: DerivationType[] = [
				"strict-snap",
				"soft-snap",
				"reference",
				"manual",
			];
			expect(types).toHaveLength(4);
		});
	});

	describe("DadsToken型", () => {
		it("必須プロパティを持つ", () => {
			const token: DadsToken = {
				id: "dads-blue-500",
				hex: "#0000FF",
				nameJa: "青",
				nameEn: "Blue",
				classification: {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				},
				source: "dads",
			};

			expect(token.id).toBe("dads-blue-500");
			expect(token.hex).toBe("#0000FF");
			expect(token.nameJa).toBe("青");
			expect(token.nameEn).toBe("Blue");
			expect(token.classification.category).toBe("chromatic");
			expect(token.source).toBe("dads");
		});

		it("オプショナルなalpha値を持てる", () => {
			const token: DadsToken = {
				id: "dads-blue-500-alpha",
				hex: "#0000FF",
				nameJa: "青（半透明）",
				nameEn: "Blue (Semi-transparent)",
				classification: {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				},
				source: "dads",
				alpha: 0.5,
			};

			expect(token.alpha).toBe(0.5);
		});

		it("CUDマッピング情報を持てる", () => {
			const token: DadsToken = {
				id: "dads-blue-500",
				hex: "#0000FF",
				nameJa: "青",
				nameEn: "Blue",
				classification: {
					category: "chromatic",
					hue: "blue",
					scale: 500,
					cudMapping: {
						nearestCudId: "cud-blue",
						deltaE: 0.03,
					},
				},
				source: "dads",
			};

			expect(token.classification.cudMapping?.nearestCudId).toBe("cud-blue");
			expect(token.classification.cudMapping?.deltaE).toBe(0.03);
		});
	});

	describe("BrandToken型", () => {
		it("必須プロパティを持つ", () => {
			const token: BrandToken = {
				id: "brand-primary-500",
				hex: "#1A73E8",
				source: "brand",
				dadsReference: {
					tokenId: "dads-blue-600",
					tokenHex: "#0066CC",
					deltaE: 0.05,
					derivationType: "soft-snap",
					zone: "safe",
				},
			};

			expect(token.id).toBe("brand-primary-500");
			expect(token.hex).toBe("#1A73E8");
			expect(token.source).toBe("brand");
			expect(token.dadsReference.tokenId).toBe("dads-blue-600");
		});

		it("オプショナルなalpha値を持てる", () => {
			const token: BrandToken = {
				id: "brand-primary-500-alpha",
				hex: "#1A73E8",
				alpha: 0.8,
				source: "brand",
				dadsReference: {
					tokenId: "dads-blue-600",
					tokenHex: "#0066CC",
					deltaE: 0.05,
					derivationType: "soft-snap",
					zone: "safe",
				},
			};

			expect(token.alpha).toBe(0.8);
		});

		it("originalHex（最適化前の入力色）を保持できる", () => {
			const token: BrandToken = {
				id: "brand-primary-500",
				hex: "#1A73E8",
				source: "brand",
				originalHex: "#1565C0",
				dadsReference: {
					tokenId: "dads-blue-600",
					tokenHex: "#0066CC",
					deltaE: 0.05,
					derivationType: "soft-snap",
					zone: "safe",
				},
			};

			expect(token.originalHex).toBe("#1565C0");
		});

		it("DadsReferenceにtokenAlphaを含められる", () => {
			const token: BrandToken = {
				id: "brand-primary-500",
				hex: "#1A73E8",
				source: "brand",
				dadsReference: {
					tokenId: "dads-blue-600",
					tokenHex: "#0066CC",
					tokenAlpha: 0.5,
					deltaE: 0.05,
					derivationType: "soft-snap",
					zone: "safe",
				},
			};

			expect(token.dadsReference.tokenAlpha).toBe(0.5);
		});
	});

	describe("isDadsToken型ガード", () => {
		it("DadsTokenに対してtrueを返す", () => {
			const token: ColorToken = {
				id: "dads-blue-500",
				hex: "#0000FF",
				nameJa: "青",
				nameEn: "Blue",
				classification: {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				},
				source: "dads",
			};

			expect(isDadsToken(token)).toBe(true);
		});

		it("BrandTokenに対してfalseを返す", () => {
			const token: ColorToken = {
				id: "brand-primary-500",
				hex: "#1A73E8",
				source: "brand",
				dadsReference: {
					tokenId: "dads-blue-600",
					tokenHex: "#0066CC",
					deltaE: 0.05,
					derivationType: "soft-snap",
					zone: "safe",
				},
			};

			expect(isDadsToken(token)).toBe(false);
		});
	});

	describe("isBrandToken型ガード", () => {
		it("BrandTokenに対してtrueを返す", () => {
			const token: ColorToken = {
				id: "brand-primary-500",
				hex: "#1A73E8",
				source: "brand",
				dadsReference: {
					tokenId: "dads-blue-600",
					tokenHex: "#0066CC",
					deltaE: 0.05,
					derivationType: "soft-snap",
					zone: "safe",
				},
			};

			expect(isBrandToken(token)).toBe(true);
		});

		it("DadsTokenに対してfalseを返す", () => {
			const token: ColorToken = {
				id: "dads-blue-500",
				hex: "#0000FF",
				nameJa: "青",
				nameEn: "Blue",
				classification: {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				},
				source: "dads",
			};

			expect(isBrandToken(token)).toBe(false);
		});
	});

	describe("ColorToken型（Discriminated Union）", () => {
		it("sourceフィールドで判別できる", () => {
			const dadsToken: ColorToken = {
				id: "dads-blue-500",
				hex: "#0000FF",
				nameJa: "青",
				nameEn: "Blue",
				classification: {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				},
				source: "dads",
			};

			const brandToken: ColorToken = {
				id: "brand-primary-500",
				hex: "#1A73E8",
				source: "brand",
				dadsReference: {
					tokenId: "dads-blue-600",
					tokenHex: "#0066CC",
					deltaE: 0.05,
					derivationType: "soft-snap",
					zone: "safe",
				},
			};

			// TypeScriptのNarrowing
			if (isDadsToken(dadsToken)) {
				expect(dadsToken.nameJa).toBe("青");
			}

			if (isBrandToken(brandToken)) {
				expect(brandToken.dadsReference.tokenId).toBe("dads-blue-600");
			}
		});
	});
});

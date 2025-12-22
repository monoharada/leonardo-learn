/**
 * トークン編集保護機能のテスト
 *
 * Requirements: 12.1, 12.2
 *
 * TDD: RED - 失敗するテストを先に作成
 */

import { describe, expect, it } from "vitest";
import type {
	BrandToken,
	DadsReference,
	DadsToken,
} from "../../core/tokens/types";
import { checkTokenEditability, type TokenEditGuard } from "./token-edit-guard";

describe("checkTokenEditability", () => {
	// テスト用のサンプルDadsReference
	const sampleDadsReference: DadsReference = {
		tokenId: "dads-blue-500",
		tokenHex: "#0017C1",
		deltaE: 2.5,
		derivationType: "soft-snap",
		zone: "warning",
	};

	// テスト用のDADSトークン
	const dadsToken: DadsToken = {
		id: "dads-blue-500",
		hex: "#0017C1",
		nameJa: "ブルー500",
		nameEn: "Blue 500",
		classification: {
			category: "chromatic",
			hue: "blue",
			scale: 500,
		},
		source: "dads",
	};

	// テスト用のブランドトークン
	const brandToken: BrandToken = {
		id: "brand-primary-500",
		hex: "#0022CC",
		source: "brand",
		dadsReference: sampleDadsReference,
		originalHex: "#0033FF",
	};

	describe("DADSトークンの場合", () => {
		it("編集不可を返却すること", () => {
			const result: TokenEditGuard = checkTokenEditability(dadsToken);

			expect(result.canEdit).toBe(false);
		});

		it("「DADSプリミティブカラーは変更できません」メッセージを返却すること", () => {
			const result: TokenEditGuard = checkTokenEditability(dadsToken);

			expect(result.reason).toBe("DADSプリミティブカラーは変更できません");
		});

		it("代替案として「ブランドトークンを作成」を提示すること", () => {
			const result: TokenEditGuard = checkTokenEditability(dadsToken);

			expect(result.suggestion).toBe(
				"独自の色が必要な場合は「ブランドトークンを作成」を選択してください",
			);
		});

		it("alpha値を持つDADSトークンも編集不可であること", () => {
			const dadsTokenWithAlpha: DadsToken = {
				...dadsToken,
				alpha: 0.5,
			};

			const result: TokenEditGuard = checkTokenEditability(dadsTokenWithAlpha);

			expect(result.canEdit).toBe(false);
			expect(result.reason).toBe("DADSプリミティブカラーは変更できません");
		});
	});

	describe("ブランドトークンの場合", () => {
		it("編集可を返却すること", () => {
			const result: TokenEditGuard = checkTokenEditability(brandToken);

			expect(result.canEdit).toBe(true);
		});

		it("reasonが未定義であること", () => {
			const result: TokenEditGuard = checkTokenEditability(brandToken);

			expect(result.reason).toBeUndefined();
		});

		it("suggestionが未定義であること", () => {
			const result: TokenEditGuard = checkTokenEditability(brandToken);

			expect(result.suggestion).toBeUndefined();
		});

		it("alpha値を持つブランドトークンも編集可であること", () => {
			const brandTokenWithAlpha: BrandToken = {
				...brandToken,
				alpha: 0.8,
			};

			const result: TokenEditGuard = checkTokenEditability(brandTokenWithAlpha);

			expect(result.canEdit).toBe(true);
		});

		it("originalHexがないブランドトークンも編集可であること", () => {
			const brandTokenWithoutOriginal: BrandToken = {
				id: "brand-secondary-600",
				hex: "#FF5500",
				source: "brand",
				dadsReference: sampleDadsReference,
			};

			const result: TokenEditGuard = checkTokenEditability(
				brandTokenWithoutOriginal,
			);

			expect(result.canEdit).toBe(true);
		});
	});

	describe("TokenEditGuard型の構造", () => {
		it("DADSトークンの場合、canEdit, reason, suggestionを全て含むこと", () => {
			const result: TokenEditGuard = checkTokenEditability(dadsToken);

			expect(result).toHaveProperty("canEdit");
			expect(result).toHaveProperty("reason");
			expect(result).toHaveProperty("suggestion");
		});

		it("ブランドトークンの場合、canEditを含むこと", () => {
			const result: TokenEditGuard = checkTokenEditability(brandToken);

			expect(result).toHaveProperty("canEdit");
		});
	});
});

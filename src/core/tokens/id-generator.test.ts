/**
 * ブランドトークンID生成機能のテスト
 * TDD: RED phase - テストを先に記述
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, expect, it } from "vitest";
import { type BrandTokenIdOptions, generateBrandTokenId } from "./id-generator";

describe("generateBrandTokenId", () => {
	describe("Requirement 6.1: ID形式", () => {
		it("brand-{role}-{shade}形式のIDを生成する（namespaceなし）", () => {
			const options: BrandTokenIdOptions = {
				role: "primary",
				shade: 500,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-primary-500");
		});

		it("brand-{namespace}-{role}-{shade}形式のIDを生成する", () => {
			const options: BrandTokenIdOptions = {
				namespace: "acme",
				role: "accent",
				shade: 600,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-acme-accent-600");
		});
	});

	describe("Requirement 6.2: namespace指定", () => {
		it("namespaceが指定された場合はIDに含める", () => {
			const options: BrandTokenIdOptions = {
				namespace: "myapp",
				role: "success",
				shade: 400,
			};
			const id = generateBrandTokenId(options);
			expect(id).toContain("myapp");
			expect(id).toBe("brand-myapp-success-400");
		});

		it("namespaceが空文字の場合は含めない", () => {
			const options: BrandTokenIdOptions = {
				namespace: "",
				role: "error",
				shade: 500,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-error-500");
		});
	});

	describe("Requirement 6.3: shadeデフォルト", () => {
		it("shadeが未指定の場合は500をデフォルトとする", () => {
			const options: BrandTokenIdOptions = {
				role: "secondary",
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-secondary-500");
		});

		it("shade 0を明示的に指定できる", () => {
			const options: BrandTokenIdOptions = {
				role: "white",
				shade: 0,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-white-0");
		});
	});

	describe("Requirement 6.4: 重複回避", () => {
		it("既存IDと重複する場合は数値サフィックスを付加する", () => {
			const existingIds = new Set(["brand-primary-500"]);
			const options: BrandTokenIdOptions = {
				role: "primary",
				shade: 500,
				existingIds,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-primary-500-2");
		});

		it("サフィックス付きIDも重複する場合は次の番号を使用する", () => {
			const existingIds = new Set([
				"brand-primary-500",
				"brand-primary-500-2",
				"brand-primary-500-3",
			]);
			const options: BrandTokenIdOptions = {
				role: "primary",
				shade: 500,
				existingIds,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-primary-500-4");
		});

		it("既存IDセットが空の場合はサフィックスなし", () => {
			const options: BrandTokenIdOptions = {
				role: "primary",
				shade: 500,
				existingIds: new Set(),
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-primary-500");
		});

		it("existingIdsが未指定の場合もサフィックスなし", () => {
			const options: BrandTokenIdOptions = {
				role: "primary",
				shade: 500,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-primary-500");
		});
	});

	describe("Requirement 6.5: 入力サニタイズ", () => {
		it("大文字を小文字に変換する", () => {
			const options: BrandTokenIdOptions = {
				namespace: "ACME",
				role: "PRIMARY",
				shade: 500,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-acme-primary-500");
		});

		it("スペースをハイフンに変換する", () => {
			const options: BrandTokenIdOptions = {
				namespace: "my app",
				role: "primary color",
				shade: 500,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-my-app-primary-color-500");
		});

		it("特殊文字を除去する（ハイフン以外）", () => {
			const options: BrandTokenIdOptions = {
				namespace: "acme@corp!",
				role: "pri$mary#",
				shade: 500,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-acmecorp-primary-500");
		});

		it("連続ハイフンを単一ハイフンに変換する", () => {
			const options: BrandTokenIdOptions = {
				role: "primary--color",
				shade: 500,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-primary-color-500");
		});

		it("先頭・末尾のハイフンを除去する", () => {
			const options: BrandTokenIdOptions = {
				role: "-primary-",
				shade: 500,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-primary-500");
		});

		it("日本語を含む場合は除去する", () => {
			const options: BrandTokenIdOptions = {
				role: "プライマリprimary色",
				shade: 500,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-primary-500");
		});

		it("数字を含むroleを処理できる", () => {
			const options: BrandTokenIdOptions = {
				role: "color1",
				shade: 500,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe("brand-color1-500");
		});
	});

	describe("エッジケース", () => {
		it("roleが空文字の場合はエラーをスローする", () => {
			const options: BrandTokenIdOptions = {
				role: "",
				shade: 500,
			};
			expect(() => generateBrandTokenId(options)).toThrow("role is required");
		});

		it("サニタイズ後にroleが空になる場合はエラーをスローする", () => {
			const options: BrandTokenIdOptions = {
				role: "!@#$%",
				shade: 500,
			};
			expect(() => generateBrandTokenId(options)).toThrow("role is required");
		});

		it("非常に長いIDも正しく生成される", () => {
			const options: BrandTokenIdOptions = {
				namespace: "very-long-namespace-name",
				role: "very-long-role-name-for-testing",
				shade: 1000,
			};
			const id = generateBrandTokenId(options);
			expect(id).toBe(
				"brand-very-long-namespace-name-very-long-role-name-for-testing-1000",
			);
		});
	});
});

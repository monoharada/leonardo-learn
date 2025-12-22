/**
 * セマンティックトークン参照解決機能のテスト
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import { describe, expect, it } from "vitest";
import {
	createTokenRegistry,
	resolveSemanticReference,
} from "./semantic-resolver";
import type { DadsColorClassification, DadsToken } from "./types";

/**
 * テスト用のDadsTokenを生成するヘルパー関数
 */
function createTestDadsToken(
	id: string,
	hex: string,
	classification: DadsColorClassification,
): DadsToken {
	return {
		id,
		hex,
		nameJa: `テスト ${id}`,
		nameEn: `Test ${id}`,
		classification,
		source: "dads",
	};
}

describe("resolveSemanticReference", () => {
	describe("Requirement 3.1: var(--color-primitive-{hue}-{scale})形式の参照をパースする", () => {
		it("var(--color-primitive-green-500)形式の参照を正しくパースする", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-green-500", "#00a040", {
					category: "chromatic",
					hue: "green",
					scale: 500,
				}),
			];
			const registry = createTokenRegistry(tokens);

			const result = resolveSemanticReference(
				"var(--color-primitive-green-500)",
				registry,
			);

			expect(result).toBe("#00a040");
		});

		it("var(--color-primitive-light-blue-300)のようなハイフン付き色相を正しくパースする", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-light-blue-300", "#7ec8e3", {
					category: "chromatic",
					hue: "light-blue",
					scale: 300,
				}),
			];
			const registry = createTokenRegistry(tokens);

			const result = resolveSemanticReference(
				"var(--color-primitive-light-blue-300)",
				registry,
			);

			expect(result).toBe("#7ec8e3");
		});

		it("10種類すべての色相の参照を正しく解決する", () => {
			const hues = [
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

			const tokens: DadsToken[] = hues.map((hue, idx) =>
				createTestDadsToken(
					`dads-${hue}-500`,
					`#${idx.toString(16).padStart(6, "0")}`,
					{
						category: "chromatic",
						hue: hue as DadsToken["classification"]["hue"],
						scale: 500,
					},
				),
			);
			const registry = createTokenRegistry(tokens);

			for (let i = 0; i < hues.length; i++) {
				const result = resolveSemanticReference(
					`var(--color-primitive-${hues[i]}-500)`,
					registry,
				);
				expect(result).toBe(`#${i.toString(16).padStart(6, "0")}`);
			}
		});

		it("様々なスケール値の参照を正しく解決する", () => {
			const scales = [
				50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
			];
			const tokens: DadsToken[] = scales.map((scale) =>
				createTestDadsToken(
					`dads-blue-${scale}`,
					`#${scale.toString(16).padStart(6, "0")}`,
					{
						category: "chromatic",
						hue: "blue",
						scale: scale as DadsToken["classification"]["scale"],
					},
				),
			);
			const registry = createTokenRegistry(tokens);

			for (const scale of scales) {
				const result = resolveSemanticReference(
					`var(--color-primitive-blue-${scale})`,
					registry,
				);
				expect(result).toBe(`#${scale.toString(16).padStart(6, "0")}`);
			}
		});
	});

	describe("Requirement 3.2: 参照先が存在しない場合はnullを返却", () => {
		it("存在しないトークンの参照はnullを返す", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-blue-500", "#0066cc", {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				}),
			];
			const registry = createTokenRegistry(tokens);

			const result = resolveSemanticReference(
				"var(--color-primitive-red-500)",
				registry,
			);

			expect(result).toBeNull();
		});

		it("存在しないスケール値の参照はnullを返す", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-blue-500", "#0066cc", {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				}),
			];
			const registry = createTokenRegistry(tokens);

			const result = resolveSemanticReference(
				"var(--color-primitive-blue-999)",
				registry,
			);

			expect(result).toBeNull();
		});

		it("空のレジストリで参照するとnullを返す", () => {
			const registry = createTokenRegistry([]);

			const result = resolveSemanticReference(
				"var(--color-primitive-blue-500)",
				registry,
			);

			expect(result).toBeNull();
		});
	});

	describe("Requirement 3.3: CUDマッピング前に呼び出されることを想定した設計", () => {
		it("HEX値（#で始まる文字列）を返却し、CUD計算に使用可能", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-green-500", "#00a040", {
					category: "chromatic",
					hue: "green",
					scale: 500,
				}),
			];
			const registry = createTokenRegistry(tokens);

			const result = resolveSemanticReference(
				"var(--color-primitive-green-500)",
				registry,
			);

			// HEX形式で始まることを確認（CUD計算に使用可能）
			expect(result).not.toBeNull();
			expect(result).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it("複数のセマンティックトークンを連続して解決可能", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-green-500", "#00a040", {
					category: "chromatic",
					hue: "green",
					scale: 500,
				}),
				createTestDadsToken("dads-red-600", "#cc0000", {
					category: "chromatic",
					hue: "red",
					scale: 600,
				}),
				createTestDadsToken("dads-yellow-400", "#ffcc00", {
					category: "chromatic",
					hue: "yellow",
					scale: 400,
				}),
			];
			const registry = createTokenRegistry(tokens);

			// 複数の参照を連続して解決
			const results = [
				resolveSemanticReference("var(--color-primitive-green-500)", registry),
				resolveSemanticReference("var(--color-primitive-red-600)", registry),
				resolveSemanticReference("var(--color-primitive-yellow-400)", registry),
			];

			expect(results[0]).toBe("#00a040");
			expect(results[1]).toBe("#cc0000");
			expect(results[2]).toBe("#ffcc00");
		});
	});

	describe("無効な入力の処理", () => {
		it("var()形式でない文字列はnullを返す", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-blue-500", "#0066cc", {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				}),
			];
			const registry = createTokenRegistry(tokens);

			expect(resolveSemanticReference("#0066cc", registry)).toBeNull();
			expect(resolveSemanticReference("blue-500", registry)).toBeNull();
			expect(resolveSemanticReference("", registry)).toBeNull();
		});

		it("不完全なvar()形式はnullを返す", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-blue-500", "#0066cc", {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				}),
			];
			const registry = createTokenRegistry(tokens);

			expect(resolveSemanticReference("var()", registry)).toBeNull();
			expect(resolveSemanticReference("var(--)", registry)).toBeNull();
			expect(
				resolveSemanticReference("var(--color-primitive)", registry),
			).toBeNull();
		});

		it("primitiveではない参照形式はnullを返す", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-blue-500", "#0066cc", {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				}),
			];
			const registry = createTokenRegistry(tokens);

			// semantic参照は直接解決しない
			expect(
				resolveSemanticReference("var(--color-semantic-success)", registry),
			).toBeNull();
			// neutral参照
			expect(
				resolveSemanticReference("var(--color-neutral-white)", registry),
			).toBeNull();
		});
	});

	describe("TokenRegistry", () => {
		it("createTokenRegistryがトークンをIDで検索可能なレジストリを生成する", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-blue-500", "#0066cc", {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				}),
				createTestDadsToken("dads-red-500", "#cc0000", {
					category: "chromatic",
					hue: "red",
					scale: 500,
				}),
			];

			const registry = createTokenRegistry(tokens);

			// 直接getByIdでアクセス
			const blueToken = registry.getById("dads-blue-500");
			expect(blueToken).toBeDefined();
			expect(blueToken?.hex).toBe("#0066cc");

			const redToken = registry.getById("dads-red-500");
			expect(redToken).toBeDefined();
			expect(redToken?.hex).toBe("#cc0000");

			// 存在しないIDはundefined
			expect(registry.getById("dads-green-500")).toBeUndefined();
		});

		it("createTokenRegistryがトークンを色相とスケールで検索可能なレジストリを生成する", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-blue-500", "#0066cc", {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				}),
				createTestDadsToken("dads-blue-600", "#0055aa", {
					category: "chromatic",
					hue: "blue",
					scale: 600,
				}),
			];

			const registry = createTokenRegistry(tokens);

			// 色相とスケールで検索
			const blue500 = registry.getByHueAndScale("blue", 500);
			expect(blue500).toBeDefined();
			expect(blue500?.hex).toBe("#0066cc");

			const blue600 = registry.getByHueAndScale("blue", 600);
			expect(blue600).toBeDefined();
			expect(blue600?.hex).toBe("#0055aa");

			// 存在しない組み合わせはundefined
			expect(registry.getByHueAndScale("blue", 999)).toBeUndefined();
			expect(registry.getByHueAndScale("red", 500)).toBeUndefined();
		});
	});
});

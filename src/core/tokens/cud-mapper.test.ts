/**
 * CUDマッピング付加機能のテスト
 *
 * Requirements: 4.1, 4.2, 4.3
 */

import { describe, expect, it } from "vitest";
import type { CudColor } from "../cud/colors";
import { enrichWithCudMapping } from "./cud-mapper";
import type { DadsColorClassification, DadsToken } from "./types";

/**
 * テスト用DadsTokenを生成するヘルパー関数
 */
function createTestDadsToken(
	id: string,
	hex: string,
	classification: DadsColorClassification = {
		category: "chromatic",
		hue: "blue",
		scale: 500,
	},
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

/**
 * テスト用CudColorを生成するヘルパー関数
 */
function createTestCudColor(
	id: string,
	hex: string,
	rgb: [number, number, number],
): CudColor {
	return {
		id,
		group: "accent",
		nameJa: `テスト ${id}`,
		nameEn: `Test ${id}`,
		hex,
		rgb,
		oklch: { l: 0.5, c: 0.1, h: 200 },
		oklab: { l: 0.5, a: 0, b: 0 },
	};
}

describe("enrichWithCudMapping", () => {
	describe("Requirement 4.1: deltaE計算", () => {
		it("DadsToken配列とCudColor配列を受け取り、各トークンについて最も近いCUD色を検索する", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-blue-500", "#0041ff"), // CUD青に近い
				createTestDadsToken("dads-red-500", "#ff2800"), // CUD赤に近い
			];

			const cudColors: CudColor[] = [
				createTestCudColor("blue", "#0041FF", [0, 65, 255]),
				createTestCudColor("red", "#FF2800", [255, 40, 0]),
			];

			const result = enrichWithCudMapping(tokens, cudColors);

			expect(result.tokens).toHaveLength(2);
			expect(result.warnings).toHaveLength(0);

			// 青いトークンはCUD青に最も近い
			const blueToken = result.tokens.find((t) => t.id === "dads-blue-500");
			expect(blueToken?.classification.cudMapping?.nearestCudId).toBe("blue");

			// 赤いトークンはCUD赤に最も近い
			const redToken = result.tokens.find((t) => t.id === "dads-red-500");
			expect(redToken?.classification.cudMapping?.nearestCudId).toBe("red");
		});

		it("各トークンについてdeltaEを計算する", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-blue-500", "#0041ff"), // CUD青と同色
			];

			const cudColors: CudColor[] = [
				createTestCudColor("blue", "#0041FF", [0, 65, 255]),
			];

			const result = enrichWithCudMapping(tokens, cudColors);

			const token = result.tokens[0];
			expect(token.classification.cudMapping).toBeDefined();
			// 同色なのでdeltaEはほぼ0
			expect(token.classification.cudMapping?.deltaE).toBeCloseTo(0, 3);
		});

		it("deltaEの値は0以上の数値である", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-blue-500", "#123456"),
				createTestDadsToken("dads-green-500", "#654321"),
			];

			const cudColors: CudColor[] = [
				createTestCudColor("blue", "#0041FF", [0, 65, 255]),
				createTestCudColor("green", "#35A16B", [53, 161, 107]),
			];

			const result = enrichWithCudMapping(tokens, cudColors);

			for (const token of result.tokens) {
				expect(token.classification.cudMapping?.deltaE).toBeGreaterThanOrEqual(
					0,
				);
				expect(typeof token.classification.cudMapping?.deltaE).toBe("number");
			}
		});
	});

	describe("Requirement 4.2: cudMappingプロパティ設定", () => {
		it("classification.cudMappingにnearestCudIdとdeltaEを設定する", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-orange-500", "#ff9900"), // CUDオレンジに近い
			];

			const cudColors: CudColor[] = [
				createTestCudColor("orange", "#FF9900", [255, 153, 0]),
				createTestCudColor("yellow", "#FAF500", [250, 245, 0]),
			];

			const result = enrichWithCudMapping(tokens, cudColors);

			const token = result.tokens[0];
			expect(token.classification.cudMapping).toBeDefined();
			expect(token.classification.cudMapping?.nearestCudId).toBe("orange");
			expect(typeof token.classification.cudMapping?.deltaE).toBe("number");
		});

		it("既存のclassification情報を保持しつつcudMappingを追加する", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-blue-500", "#0066cc", {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				}),
			];

			const cudColors: CudColor[] = [
				createTestCudColor("blue", "#0041FF", [0, 65, 255]),
			];

			const result = enrichWithCudMapping(tokens, cudColors);

			const token = result.tokens[0];
			// 既存の分類情報が保持されている
			expect(token.classification.category).toBe("chromatic");
			expect(token.classification.hue).toBe("blue");
			expect(token.classification.scale).toBe(500);
			// cudMappingが追加されている
			expect(token.classification.cudMapping).toBeDefined();
		});
	});

	describe("Requirement 4.3: var()参照のスキップ", () => {
		it("hex値が#で始まらないトークン（var()参照）はCUDマッピングをスキップする", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken(
					"dads-semantic-success",
					"var(--color-primitive-green-500)",
					{
						category: "semantic",
					},
				),
				createTestDadsToken("dads-blue-500", "#0066cc", {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				}),
			];

			const cudColors: CudColor[] = [
				createTestCudColor("blue", "#0041FF", [0, 65, 255]),
				createTestCudColor("green", "#35A16B", [53, 161, 107]),
			];

			const result = enrichWithCudMapping(tokens, cudColors);

			// var()参照のトークンはcudMappingがない
			const semanticToken = result.tokens.find(
				(t) => t.id === "dads-semantic-success",
			);
			expect(semanticToken?.classification.cudMapping).toBeUndefined();

			// HEX値のトークンはcudMappingがある
			const blueToken = result.tokens.find((t) => t.id === "dads-blue-500");
			expect(blueToken?.classification.cudMapping).toBeDefined();
		});

		it("スキップされたトークンは元のプロパティを維持する", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken(
					"dads-semantic-error",
					"var(--color-primitive-red-500)",
					{
						category: "semantic",
					},
				),
			];

			const cudColors: CudColor[] = [
				createTestCudColor("red", "#FF2800", [255, 40, 0]),
			];

			const result = enrichWithCudMapping(tokens, cudColors);

			const token = result.tokens[0];
			expect(token.id).toBe("dads-semantic-error");
			expect(token.hex).toBe("var(--color-primitive-red-500)");
			expect(token.classification.category).toBe("semantic");
			expect(token.source).toBe("dads");
		});
	});

	describe("エッジケース", () => {
		it("空のトークン配列を渡した場合、空の結果を返す", () => {
			const cudColors: CudColor[] = [
				createTestCudColor("blue", "#0041FF", [0, 65, 255]),
			];

			const result = enrichWithCudMapping([], cudColors);

			expect(result.tokens).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});

		it("空のCUD色配列を渡した場合、cudMappingなしのトークンを返す", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-blue-500", "#0066cc"),
			];

			const result = enrichWithCudMapping(tokens, []);

			expect(result.tokens).toHaveLength(1);
			expect(result.tokens[0].classification.cudMapping).toBeUndefined();
		});

		it("alpha値を持つトークンも正しく処理される", () => {
			const tokens: DadsToken[] = [
				{
					...createTestDadsToken("dads-blue-500-alpha", "#0066cc"),
					alpha: 0.5,
				},
			];

			const cudColors: CudColor[] = [
				createTestCudColor("blue", "#0041FF", [0, 65, 255]),
			];

			const result = enrichWithCudMapping(tokens, cudColors);

			const token = result.tokens[0];
			expect(token.alpha).toBe(0.5);
			expect(token.classification.cudMapping).toBeDefined();
		});

		it("元のトークン配列は変更されない（イミュータビリティ）", () => {
			const originalToken = createTestDadsToken("dads-blue-500", "#0066cc");
			const tokens: DadsToken[] = [originalToken];

			const cudColors: CudColor[] = [
				createTestCudColor("blue", "#0041FF", [0, 65, 255]),
			];

			enrichWithCudMapping(tokens, cudColors);

			// 元のトークンにはcudMappingがないことを確認
			expect(originalToken.classification.cudMapping).toBeUndefined();
		});

		it("複数のCUD色から最も近い色を正しく選択する", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-custom", "#0050ff"), // 青に近い色
			];

			// 青、緑、赤のCUD色
			const cudColors: CudColor[] = [
				createTestCudColor("blue", "#0041FF", [0, 65, 255]),
				createTestCudColor("green", "#35A16B", [53, 161, 107]),
				createTestCudColor("red", "#FF2800", [255, 40, 0]),
			];

			const result = enrichWithCudMapping(tokens, cudColors);

			// 青に最も近いはず
			expect(result.tokens[0].classification.cudMapping?.nearestCudId).toBe(
				"blue",
			);
		});
	});

	describe("DadsToken不変性の維持", () => {
		it("返却されるトークンはDadsTokenの構造を維持する", () => {
			const tokens: DadsToken[] = [
				createTestDadsToken("dads-blue-500", "#0066cc"),
			];

			const cudColors: CudColor[] = [
				createTestCudColor("blue", "#0041FF", [0, 65, 255]),
			];

			const result = enrichWithCudMapping(tokens, cudColors);

			const token = result.tokens[0];
			expect(token.source).toBe("dads");
			expect(token.id).toBe("dads-blue-500");
			expect(token.hex).toBe("#0066cc");
			expect(token.nameJa).toBeDefined();
			expect(token.nameEn).toBeDefined();
			expect(token.classification).toBeDefined();
		});
	});
});

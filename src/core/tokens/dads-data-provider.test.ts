import { beforeEach, describe, expect, test } from "vitest";
import {
	clearTokenCache,
	getAllDadsChromatic,
	getDadsColorsByHue,
	getHueOrder,
	getScaleOrder,
	loadDadsTokens,
} from "./dads-data-provider";
import type { DadsToken } from "./types";

describe("dads-data-provider", () => {
	beforeEach(() => {
		clearTokenCache();
	});

	describe("getHueOrder", () => {
		test("10色相を正しい順序で返す", () => {
			const hues = getHueOrder();
			expect(hues).toEqual([
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
			]);
		});
	});

	describe("getScaleOrder", () => {
		test("13スケールを正しい順序で返す", () => {
			const scales = getScaleOrder();
			expect(scales).toEqual([
				50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
			]);
		});
	});

	describe("getDadsColorsByHue", () => {
		const mockTokens: DadsToken[] = [
			{
				id: "dads-blue-50",
				hex: "#e8f4fc",
				nameJa: "青 50",
				nameEn: "Blue 50",
				classification: {
					category: "chromatic",
					hue: "blue",
					scale: 50,
				},
				source: "dads",
			},
			{
				id: "dads-blue-500",
				hex: "#0066cc",
				nameJa: "青 500",
				nameEn: "Blue 500",
				classification: {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				},
				source: "dads",
			},
			{
				id: "dads-blue-1200",
				hex: "#001a33",
				nameJa: "青 1200",
				nameEn: "Blue 1200",
				classification: {
					category: "chromatic",
					hue: "blue",
					scale: 1200,
				},
				source: "dads",
			},
			{
				id: "dads-red-500",
				hex: "#cc0000",
				nameJa: "赤 500",
				nameEn: "Red 500",
				classification: {
					category: "chromatic",
					hue: "red",
					scale: 500,
				},
				source: "dads",
			},
		];

		test("指定した色相のスケールを取得できる", () => {
			const result = getDadsColorsByHue(mockTokens, "blue");

			expect(result.hue).toBe("blue");
			expect(result.hueName).toEqual({ ja: "青", en: "Blue" });
			expect(result.colors).toHaveLength(13);
		});

		test("存在するトークンの値が正しく設定される", () => {
			const result = getDadsColorsByHue(mockTokens, "blue");

			const color50 = result.colors.find((c) => c.scale === 50);
			expect(color50?.hex).toBe("#e8f4fc");
			expect(color50?.token.id).toBe("dads-blue-50");

			const color500 = result.colors.find((c) => c.scale === 500);
			expect(color500?.hex).toBe("#0066cc");

			const color1200 = result.colors.find((c) => c.scale === 1200);
			expect(color1200?.hex).toBe("#001a33");
		});

		test("存在しないスケールはプレースホルダーが設定される", () => {
			const result = getDadsColorsByHue(mockTokens, "blue");

			// 100はモックに存在しない
			const color100 = result.colors.find((c) => c.scale === 100);
			expect(color100?.hex).toBe("#000000");
			expect(color100?.token.id).toBe("dads-blue-100");
		});

		test("スケール順序が正しい", () => {
			const result = getDadsColorsByHue(mockTokens, "blue");
			const scales = result.colors.map((c) => c.scale);
			expect(scales).toEqual([
				50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
			]);
		});
	});

	describe("getAllDadsChromatic", () => {
		const mockTokens: DadsToken[] = [
			{
				id: "dads-blue-500",
				hex: "#0066cc",
				nameJa: "青 500",
				nameEn: "Blue 500",
				classification: {
					category: "chromatic",
					hue: "blue",
					scale: 500,
				},
				source: "dads",
			},
			{
				id: "dads-red-500",
				hex: "#cc0000",
				nameJa: "赤 500",
				nameEn: "Red 500",
				classification: {
					category: "chromatic",
					hue: "red",
					scale: 500,
				},
				source: "dads",
			},
		];

		test("全10色相のスケールを返す", () => {
			const result = getAllDadsChromatic(mockTokens);

			expect(result).toHaveLength(10);
			expect(result.map((r) => r.hue)).toEqual([
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
			]);
		});

		test("各色相に13スケールがある", () => {
			const result = getAllDadsChromatic(mockTokens);

			for (const scale of result) {
				expect(scale.colors).toHaveLength(13);
			}
		});
	});

	describe("loadDadsTokens", () => {
		test("トークンを読み込める（キャッシュ動作）", async () => {
			// 最初の呼び出し
			const tokens1 = await loadDadsTokens();
			expect(tokens1.length).toBeGreaterThan(0);

			// 2回目の呼び出し（キャッシュから）
			const tokens2 = await loadDadsTokens();
			expect(tokens2).toBe(tokens1); // 同じ参照
		});

		test("clearTokenCacheでキャッシュがクリアされる", async () => {
			const tokens1 = await loadDadsTokens();
			clearTokenCache();
			const tokens2 = await loadDadsTokens();

			// 値は同じだが異なる参照
			expect(tokens2).not.toBe(tokens1);
			expect(tokens2.length).toBe(tokens1.length);
		});

		test("有彩色トークンが10色相含まれる", async () => {
			const tokens = await loadDadsTokens();

			const chromaticTokens = tokens.filter(
				(t) => t.classification.category === "chromatic",
			);
			const hues = new Set(chromaticTokens.map((t) => t.classification.hue));

			expect(hues.size).toBe(10);
			expect(hues).toContain("blue");
			expect(hues).toContain("red");
			expect(hues).toContain("green");
		});

		test("各色相に13スケールのトークンがある", async () => {
			const tokens = await loadDadsTokens();

			for (const hue of getHueOrder()) {
				const hueTokens = tokens.filter(
					(t) =>
						t.classification.category === "chromatic" &&
						t.classification.hue === hue,
				);
				expect(hueTokens.length).toBe(13);
			}
		});
	});
});

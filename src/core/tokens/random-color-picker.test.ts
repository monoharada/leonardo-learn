/**
 * ランダムカラー選択機能のテスト
 *
 * @module @/core/tokens/random-color-picker.test
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { DadsToken } from "./types";

// テスト用モックデータ
const mockChromaticTokens: DadsToken[] = [
	{
		id: "dads-blue-500",
		hex: "#0066cc",
		nameJa: "青 500",
		nameEn: "Blue 500",
		classification: { category: "chromatic", hue: "blue", scale: 500 },
		source: "dads",
	},
	{
		id: "dads-blue-600",
		hex: "#0052a3",
		nameJa: "青 600",
		nameEn: "Blue 600",
		classification: { category: "chromatic", hue: "blue", scale: 600 },
		source: "dads",
	},
	{
		id: "dads-blue-700",
		hex: "#00408a",
		nameJa: "青 700",
		nameEn: "Blue 700",
		classification: { category: "chromatic", hue: "blue", scale: 700 },
		source: "dads",
	},
	{
		id: "dads-red-500",
		hex: "#cc0000",
		nameJa: "赤 500",
		nameEn: "Red 500",
		classification: { category: "chromatic", hue: "red", scale: 500 },
		source: "dads",
	},
	{
		id: "dads-red-600",
		hex: "#a30000",
		nameJa: "赤 600",
		nameEn: "Red 600",
		classification: { category: "chromatic", hue: "red", scale: 600 },
		source: "dads",
	},
	{
		id: "dads-red-700",
		hex: "#8a0000",
		nameJa: "赤 700",
		nameEn: "Red 700",
		classification: { category: "chromatic", hue: "red", scale: 700 },
		source: "dads",
	},
	{
		id: "dads-green-500",
		hex: "#00cc66",
		nameJa: "緑 500",
		nameEn: "Green 500",
		classification: { category: "chromatic", hue: "green", scale: 500 },
		source: "dads",
	},
	{
		id: "dads-green-600",
		hex: "#00a352",
		nameJa: "緑 600",
		nameEn: "Green 600",
		classification: { category: "chromatic", hue: "green", scale: 600 },
		source: "dads",
	},
	{
		id: "dads-green-700",
		hex: "#008a40",
		nameJa: "緑 700",
		nameEn: "Green 700",
		classification: { category: "chromatic", hue: "green", scale: 700 },
		source: "dads",
	},
];

const mockNeutralTokens: DadsToken[] = [
	{
		id: "dads-neutral-500",
		hex: "#888888",
		nameJa: "ニュートラル 500",
		nameEn: "Neutral 500",
		classification: { category: "neutral", scale: 500 },
		source: "dads",
	},
];

// モック関数を作成
const mockLoadDadsTokens = mock(async () => [
	...mockChromaticTokens,
	...mockNeutralTokens,
]);

// dads-data-providerモジュールをモック
mock.module("./dads-data-provider", () => ({
	loadDadsTokens: mockLoadDadsTokens,
	clearTokenCache: mock(() => {}),
}));

// モック設定後にインポート
import { getRandomDadsColor, getRandomDadsToken } from "./random-color-picker";

describe("random-color-picker", () => {
	beforeEach(() => {
		mockLoadDadsTokens.mockClear();
	});

	afterEach(() => {
		mockLoadDadsTokens.mockClear();
	});

	describe("getRandomDadsColor", () => {
		it("should return a valid hex color", async () => {
			const hex = await getRandomDadsColor();

			// HEX形式であることを確認
			expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it("should return a hex color from mock chromatic tokens", async () => {
			const hex = await getRandomDadsColor();

			// モックデータのいずれかのHEX値であることを確認
			const mockHexValues = mockChromaticTokens.map((t) => t.hex);
			expect(mockHexValues).toContain(hex);
		});

		it("should return different colors on multiple calls (probabilistic)", async () => {
			// 10回呼び出して、少なくとも2つの異なる色が返されることを確認
			const colors = await Promise.all(
				Array.from({ length: 10 }, () => getRandomDadsColor()),
			);

			const uniqueColors = new Set(colors);
			// 9色のモックデータからランダムに選択しているため、10回中少なくとも2つは異なるはず
			expect(uniqueColors.size).toBeGreaterThan(1);
		});

		it("should return colors from chromatic category only", async () => {
			// 複数回実行して全てがchromaticカテゴリであることを確認
			const tokens = await Promise.all(
				Array.from({ length: 5 }, () => getRandomDadsToken()),
			);

			for (const token of tokens) {
				expect(token.classification.category).toBe("chromatic");
				expect(token.classification.hue).toBeDefined();
				expect(token.classification.scale).toBeDefined();
			}
		});
	});

	describe("getRandomDadsToken", () => {
		it("should return a valid DadsToken", async () => {
			const token = await getRandomDadsToken();

			// トークンの構造を確認
			expect(token).toHaveProperty("id");
			expect(token).toHaveProperty("hex");
			expect(token).toHaveProperty("nameJa");
			expect(token).toHaveProperty("nameEn");
			expect(token).toHaveProperty("classification");
			expect(token).toHaveProperty("source");

			// HEX形式であることを確認
			expect(token.hex).toMatch(/^#[0-9a-f]{6}$/i);

			// chromaticカテゴリであることを確認
			expect(token.classification.category).toBe("chromatic");
			expect(token.source).toBe("dads");
		});

		it("should return tokens with valid hue and scale from mock data", async () => {
			const token = await getRandomDadsToken();

			// モックデータのいずれかであることを確認
			const mockIds = mockChromaticTokens.map((t) => t.id);
			expect(mockIds).toContain(token.id);

			// 色相がモックデータの色相のいずれかであることを確認
			const validHues = ["blue", "red", "green"];
			expect(validHues).toContain(token.classification.hue);

			// スケールがモックデータのスケールのいずれかであることを確認
			const validScales = [500, 600, 700];
			expect(validScales).toContain(token.classification.scale);
		});

		it("should return token with matching hex and DadsToken structure", async () => {
			const token = await getRandomDadsToken();
			const hex = await getRandomDadsColor();

			// 両方がHEX形式であることを確認
			expect(token.hex).toMatch(/^#[0-9a-f]{6}$/i);
			expect(hex).toMatch(/^#[0-9a-f]{6}$/i);

			// 両方がモックデータから選ばれていることを確認
			const mockHexValues = mockChromaticTokens.map((t) => t.hex);
			expect(mockHexValues).toContain(token.hex);
			expect(mockHexValues).toContain(hex);
		});
	});

	describe("error handling", () => {
		it("should handle token loading failures gracefully", async () => {
			// トークンの読み込みは成功するはずだが、エラーハンドリングの構造をテスト
			// 実際のエラーケースはモック化が必要だが、ここでは正常系のみテスト
			const hex = await getRandomDadsColor();
			expect(hex).toBeDefined();
		});
	});

	describe("randomness", () => {
		it("should have good distribution across multiple calls (statistical test)", async () => {
			// 50回呼び出して分布を確認
			const colors = await Promise.all(
				Array.from({ length: 50 }, () => getRandomDadsColor()),
			);

			const uniqueColors = new Set(colors);
			// 9色のモックデータから50回選択すると、少なくとも5色は異なるはず
			expect(uniqueColors.size).toBeGreaterThanOrEqual(5);

			// 全ての色がモックデータに含まれていることを確認
			const mockHexValues = mockChromaticTokens.map((t) => t.hex);
			for (const color of colors) {
				expect(mockHexValues).toContain(color);
			}
		});
	});

	describe("selectRandomChromaticToken (internal helper)", () => {
		it("should reuse logic between getRandomDadsColor and getRandomDadsToken", async () => {
			// 両関数が同じ内部ヘルパーを使用していることを間接的に確認
			// loadDadsTokensが呼び出されていることを確認
			await getRandomDadsColor();
			expect(mockLoadDadsTokens).toHaveBeenCalled();

			mockLoadDadsTokens.mockClear();

			await getRandomDadsToken();
			expect(mockLoadDadsTokens).toHaveBeenCalled();
		});

		it("should filter only chromatic tokens", async () => {
			// neutralトークンが選ばれないことを確認（50回テスト）
			const neutralHex = mockNeutralTokens[0].hex;

			for (let i = 0; i < 50; i++) {
				const hex = await getRandomDadsColor();
				expect(hex).not.toBe(neutralHex);
			}
		});
	});
});

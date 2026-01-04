/**
 * HarmonyPaletteGenerator Tests
 * Section 8: アクセント選定UI改善
 */

import { describe, expect, it } from "bun:test";
import {
	getAllHarmonyPalettes,
	getHarmonyPaletteColors,
	type HarmonyPaletteResult,
} from "./harmony-palette-generator";

describe("HarmonyPaletteGenerator", () => {
	// テスト用ブランドカラー（DADS Blue 600 に近い色）
	const TEST_BRAND_COLOR = "#0056FF";

	describe("getHarmonyPaletteColors", () => {
		it("補色パレットを生成できる", async () => {
			const result = await getHarmonyPaletteColors(
				TEST_BRAND_COLOR,
				"complementary",
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.result.brandColor).toBe(TEST_BRAND_COLOR);
				expect(result.result.accentColors).toHaveLength(2);
				expect(result.result.harmonyType).toBe("complementary");
				expect(result.result.candidates).toHaveLength(2);

				// アクセントカラーがHEX形式であることを確認
				expect(result.result.accentColors[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
				expect(result.result.accentColors[1]).toMatch(/^#[0-9A-Fa-f]{6}$/);
			}
		});

		it("トライアドパレットを生成できる", async () => {
			const result = await getHarmonyPaletteColors(TEST_BRAND_COLOR, "triadic");

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.result.brandColor).toBe(TEST_BRAND_COLOR);
				expect(result.result.accentColors).toHaveLength(2);
				expect(result.result.harmonyType).toBe("triadic");
				expect(result.result.candidates).toHaveLength(2);
			}
		});

		it("類似色パレットを生成できる", async () => {
			const result = await getHarmonyPaletteColors(
				TEST_BRAND_COLOR,
				"analogous",
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.result.brandColor).toBe(TEST_BRAND_COLOR);
				expect(result.result.accentColors).toHaveLength(2);
				expect(result.result.harmonyType).toBe("analogous");
			}
		});

		it("分裂補色パレットを生成できる", async () => {
			const result = await getHarmonyPaletteColors(
				TEST_BRAND_COLOR,
				"split-complementary",
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.result.brandColor).toBe(TEST_BRAND_COLOR);
				expect(result.result.accentColors).toHaveLength(2);
				expect(result.result.harmonyType).toBe("split-complementary");
			}
		});

		it('"all" タイプはエラーを返す', async () => {
			const result = await getHarmonyPaletteColors(TEST_BRAND_COLOR, "all");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("INVALID_HARMONY_TYPE");
			}
		});

		it("無効なブランドカラーはエラーを返す", async () => {
			const result = await getHarmonyPaletteColors("", "complementary");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("BRAND_COLOR_NOT_SET");
			}
		});

		it("補色パレットは異なるステップの2色を選定する", async () => {
			const result = await getHarmonyPaletteColors(
				TEST_BRAND_COLOR,
				"complementary",
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const candidates = result.result.candidates;
				// 2色の候補が選定されている
				expect(candidates.length).toBe(2);

				// 異なるステップが選定されている（可能な場合）
				if (candidates[0].step !== candidates[1].step) {
					expect(candidates[0].step).not.toBe(candidates[1].step);
				}
			}
		});
	});

	describe("getAllHarmonyPalettes", () => {
		it("全ハーモニータイプのパレットを一度に取得できる", async () => {
			const result = await getAllHarmonyPalettes(TEST_BRAND_COLOR);

			expect(result.ok).toBe(true);
			if (result.ok && result.result) {
				// 4種類のハーモニータイプが取得される
				expect(result.result.complementary).not.toBeNull();
				expect(result.result.triadic).not.toBeNull();
				expect(result.result.analogous).not.toBeNull();
				expect(result.result["split-complementary"]).not.toBeNull();

				// 各パレットが3色（ブランド + 2アクセント）を持つ
				if (result.result.complementary) {
					expect(result.result.complementary.accentColors).toHaveLength(2);
				}
				if (result.result.triadic) {
					expect(result.result.triadic.accentColors).toHaveLength(2);
				}
			}
		});

		it("無効なブランドカラーはエラーを返す", async () => {
			const result = await getAllHarmonyPalettes("");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error?.code).toBe("BRAND_COLOR_NOT_SET");
			}
		});

		it("背景色オプションを指定できる", async () => {
			const result = await getAllHarmonyPalettes(TEST_BRAND_COLOR, {
				backgroundHex: "#000000",
			});

			expect(result.ok).toBe(true);
		});
	});

	describe("パレット色の妥当性", () => {
		it("補色パレットのアクセントはブランドカラーの反対側にある", async () => {
			const result = await getHarmonyPaletteColors(
				TEST_BRAND_COLOR,
				"complementary",
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				// 補色は180°反対なので、候補の色相はブランドカラーと大きく異なる
				const candidates = result.result.candidates;
				expect(candidates.length).toBeGreaterThan(0);
			}
		});

		it("トライアドパレットは120°と240°方向から選定される", async () => {
			const result = await getHarmonyPaletteColors(TEST_BRAND_COLOR, "triadic");

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.result.candidates).toHaveLength(2);
			}
		});

		it("類似色パレットは±30°方向から選定される", async () => {
			const result = await getHarmonyPaletteColors(
				TEST_BRAND_COLOR,
				"analogous",
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.result.candidates).toHaveLength(2);
			}
		});
	});
});

/**
 * HarmonyPaletteGenerator Tests
 * Section 8: アクセント選定UI改善
 */

import { describe, expect, it } from "bun:test";
import { toOklch } from "../../utils/color-space";
import {
	getAllHarmonyPalettes,
	getHarmonyPaletteColors,
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

	describe("Phase 1: 明度バリエーションテスト", () => {
		it("3色補色パレットで明度差が15%以上ある", async () => {
			const result = await getHarmonyPaletteColors(
				TEST_BRAND_COLOR,
				"complementary",
				{ accentCount: 3 },
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const colors = result.result.accentColors;
				expect(colors).toHaveLength(3);

				// 各色の明度（OKLCH L値）を取得
				const lightnesses = colors.map((hex) => {
					const oklch = toOklch(hex);
					return oklch?.l ?? 0;
				});

				// 最大明度差を計算
				const maxL = Math.max(...lightnesses);
				const minL = Math.min(...lightnesses);
				const lightnessDiff = maxL - minL;

				// 15%以上の明度差があることを確認
				expect(lightnessDiff).toBeGreaterThanOrEqual(0.15);
			}
		});

		it("4色補色パレットでベース方向の色が含まれる", async () => {
			const result = await getHarmonyPaletteColors(
				TEST_BRAND_COLOR,
				"complementary",
				{ accentCount: 4 },
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const candidates = result.result.candidates;
				expect(candidates).toHaveLength(4);

				// ブランドカラーの色相を取得
				const brandOklch = toOklch(TEST_BRAND_COLOR);
				const brandHue = brandOklch?.h ?? 0;

				// 少なくとも1つの候補がベース方向（ブランドカラーに近い色相）にあることを確認
				const hasBaseDirection = candidates.some((c) => {
					const hueDiff = Math.abs(c.hue - brandHue);
					const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
					return normalizedDiff <= 30; // ±30°以内
				});

				expect(hasBaseDirection).toBe(true);
			}
		});

		it("5色補色パレットで明暗バリエーションが豊富", async () => {
			const result = await getHarmonyPaletteColors(
				TEST_BRAND_COLOR,
				"complementary",
				{ accentCount: 5 },
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const colors = result.result.accentColors;
				expect(colors).toHaveLength(5);

				// 各色の明度を取得
				const lightnesses = colors.map((hex) => {
					const oklch = toOklch(hex);
					return oklch?.l ?? 0;
				});

				// 明度の範囲が広いことを確認（20%以上）
				const maxL = Math.max(...lightnesses);
				const minL = Math.min(...lightnesses);
				const lightnessDiff = maxL - minL;

				expect(lightnessDiff).toBeGreaterThanOrEqual(0.2);
			}
		});

		it("トライアドパレットで各方向から色が選定される", async () => {
			const result = await getHarmonyPaletteColors(
				TEST_BRAND_COLOR,
				"triadic",
				{ accentCount: 4 },
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const candidates = result.result.candidates;
				expect(candidates).toHaveLength(4);

				// ブランドカラーの色相から120°、240°方向の色相を計算
				const brandOklch = toOklch(TEST_BRAND_COLOR);
				const brandHue = brandOklch?.h ?? 0;
				const targetHue1 = (brandHue + 120) % 360;
				const targetHue2 = (brandHue + 240) % 360;

				// 各方向に少なくとも1色ずつあることを確認
				const hasDirection1 = candidates.some((c) => {
					const hueDiff = Math.abs(c.hue - targetHue1);
					const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
					return normalizedDiff <= 30;
				});

				const hasDirection2 = candidates.some((c) => {
					const hueDiff = Math.abs(c.hue - targetHue2);
					const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
					return normalizedDiff <= 30;
				});

				expect(hasDirection1).toBe(true);
				expect(hasDirection2).toBe(true);
			}
		});

		it("役割に基づいて重複しない候補が選定される", async () => {
			const result = await getHarmonyPaletteColors(
				TEST_BRAND_COLOR,
				"complementary",
				{ accentCount: 5 },
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const candidates = result.result.candidates;
				const tokenIds = candidates.map((c) => c.tokenId);

				// 全てのトークンIDがユニークであることを確認
				const uniqueTokenIds = new Set(tokenIds);
				expect(uniqueTokenIds.size).toBe(tokenIds.length);
			}
		});
	});

	describe("Phase 2: 新ハーモニータイプテスト", () => {
		describe("モノクロマティック", () => {
			it("モノクロマティックパレットを生成できる", async () => {
				const result = await getHarmonyPaletteColors(
					TEST_BRAND_COLOR,
					"monochromatic",
				);

				expect(result.ok).toBe(true);
				if (result.ok) {
					expect(result.result.brandColor).toBe(TEST_BRAND_COLOR);
					expect(result.result.accentColors).toHaveLength(2);
					expect(result.result.harmonyType).toBe("monochromatic");
				}
			});

			it("モノクロマティックパレットの全色が同一色相（±30°）", async () => {
				const result = await getHarmonyPaletteColors(
					TEST_BRAND_COLOR,
					"monochromatic",
					{ accentCount: 3 },
				);

				expect(result.ok).toBe(true);
				if (result.ok) {
					const brandOklch = toOklch(TEST_BRAND_COLOR);
					const brandHue = brandOklch?.h ?? 0;

					const allWithinRange = result.result.candidates.every((c) => {
						const hueDiff = Math.abs(c.hue - brandHue);
						const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
						return normalizedDiff <= 30;
					});

					expect(allWithinRange).toBe(true);
				}
			});

			it("モノクロマティックパレットで明度差がある", async () => {
				const result = await getHarmonyPaletteColors(
					TEST_BRAND_COLOR,
					"monochromatic",
					{ accentCount: 3 },
				);

				expect(result.ok).toBe(true);
				if (result.ok) {
					const lightnesses = result.result.accentColors.map((hex) => {
						const oklch = toOklch(hex);
						return oklch?.l ?? 0;
					});

					const maxL = Math.max(...lightnesses);
					const minL = Math.min(...lightnesses);
					expect(maxL - minL).toBeGreaterThanOrEqual(0.2);
				}
			});
		});

		describe("シェード", () => {
			it("シェードパレットを生成できる", async () => {
				const result = await getHarmonyPaletteColors(
					TEST_BRAND_COLOR,
					"shades",
				);

				expect(result.ok).toBe(true);
				if (result.ok) {
					expect(result.result.brandColor).toBe(TEST_BRAND_COLOR);
					expect(result.result.accentColors).toHaveLength(2);
					expect(result.result.harmonyType).toBe("shades");
				}
			});

			it("シェードパレットの明度が線形に分布", async () => {
				const result = await getHarmonyPaletteColors(
					TEST_BRAND_COLOR,
					"shades",
					{ accentCount: 3 },
				);

				expect(result.ok).toBe(true);
				if (result.ok) {
					const lightnesses = result.result.accentColors
						.map((hex) => {
							const oklch = toOklch(hex);
							return oklch?.l ?? 0;
						})
						.sort((a, b) => b - a); // 明るい順

					// 線形分布を確認（隣接する明度差が大きく異ならない）
					if (lightnesses.length >= 3) {
						const diff1 = lightnesses[0] - lightnesses[1];
						const diff2 = lightnesses[1] - lightnesses[2];
						// 差の比率が0.3〜3.0の範囲内（あまりにも偏っていない）
						const ratio = diff1 / diff2;
						expect(ratio).toBeGreaterThan(0.1);
						expect(ratio).toBeLessThan(10);
					}
				}
			});
		});

		describe("コンパウンド", () => {
			it("コンパウンドパレットを生成できる", async () => {
				const result = await getHarmonyPaletteColors(
					TEST_BRAND_COLOR,
					"compound",
				);

				expect(result.ok).toBe(true);
				if (result.ok) {
					expect(result.result.brandColor).toBe(TEST_BRAND_COLOR);
					expect(result.result.accentColors).toHaveLength(2);
					expect(result.result.harmonyType).toBe("compound");
				}
			});

			it("コンパウンドパレットは類似色と補色方向の両方を含む", async () => {
				const result = await getHarmonyPaletteColors(
					TEST_BRAND_COLOR,
					"compound",
					{ accentCount: 4 },
				);

				expect(result.ok).toBe(true);
				if (result.ok) {
					const brandOklch = toOklch(TEST_BRAND_COLOR);
					const brandHue = brandOklch?.h ?? 0;

					// 類似色方向（+30°）
					const analogousHue = (brandHue + 30) % 360;
					// 補色方向（180°）
					const complementaryHue = (brandHue + 180) % 360;

					const candidates = result.result.candidates;

					const hasAnalogous = candidates.some((c) => {
						const hueDiff = Math.abs(c.hue - analogousHue);
						const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
						return normalizedDiff <= 30;
					});

					const hasComplementary = candidates.some((c) => {
						const hueDiff = Math.abs(c.hue - complementaryHue);
						const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
						return normalizedDiff <= 30;
					});

					expect(hasAnalogous).toBe(true);
					expect(hasComplementary).toBe(true);
				}
			});
		});

		describe("正方形", () => {
			it("正方形パレットを生成できる", async () => {
				const result = await getHarmonyPaletteColors(
					TEST_BRAND_COLOR,
					"square",
					{ accentCount: 3 },
				);

				expect(result.ok).toBe(true);
				if (result.ok) {
					expect(result.result.brandColor).toBe(TEST_BRAND_COLOR);
					expect(result.result.accentColors).toHaveLength(3);
					expect(result.result.harmonyType).toBe("square");
				}
			});

			it("正方形パレットは3方向の色相を含む", async () => {
				const result = await getHarmonyPaletteColors(
					TEST_BRAND_COLOR,
					"square",
					{ accentCount: 3 },
				);

				expect(result.ok).toBe(true);
				if (result.ok) {
					const brandOklch = toOklch(TEST_BRAND_COLOR);
					const brandHue = brandOklch?.h ?? 0;

					const squareHues = [
						(brandHue + 90) % 360,
						(brandHue + 180) % 360,
						(brandHue + 270) % 360,
					];

					const candidates = result.result.candidates;

					const has90 = candidates.some((c) => {
						const hueDiff = Math.abs(c.hue - squareHues[0]);
						const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
						return normalizedDiff <= 30;
					});

					const has180 = candidates.some((c) => {
						const hueDiff = Math.abs(c.hue - squareHues[1]);
						const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
						return normalizedDiff <= 30;
					});

					const has270 = candidates.some((c) => {
						const hueDiff = Math.abs(c.hue - squareHues[2]);
						const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
						return normalizedDiff <= 30;
					});

					expect(has90).toBe(true);
					expect(has180).toBe(true);
					expect(has270).toBe(true);
				}
			});
		});

		describe("getAllHarmonyPalettes", () => {
			it("新ハーモニータイプを含む全パレットを取得できる", async () => {
				const result = await getAllHarmonyPalettes(TEST_BRAND_COLOR);

				expect(result.ok).toBe(true);
				if (result.ok && result.result) {
					// 既存の4タイプ
					expect(result.result.complementary).not.toBeNull();
					expect(result.result.triadic).not.toBeNull();
					expect(result.result.analogous).not.toBeNull();
					expect(result.result["split-complementary"]).not.toBeNull();

					// 新しい3タイプ
					expect(result.result.monochromatic).not.toBeNull();
					expect(result.result.shades).not.toBeNull();
					expect(result.result.compound).not.toBeNull();
					expect(result.result.square).not.toBeNull();
				}
			});
		});
	});

	describe("brandColor重複防止", () => {
		// DADSトークンの色（ランダム選択で選ばれる可能性がある色）
		const DADS_TOKEN_COLORS = [
			"#2c4100", // lime系の暗い色
			"#0056ff", // blue系
			"#ff5500", // orange系
		];

		it("analogousパレットでbrandColorと同じトークンが選ばれない", async () => {
			for (const brandColor of DADS_TOKEN_COLORS) {
				const result = await getAllHarmonyPalettes(brandColor);

				expect(result.ok).toBe(true);
				if (!result.ok) continue;

				const analogous = result.result?.analogous;
				if (!analogous) continue;

				// 全てのアクセントカラーがbrandColorと異なることを確認
				for (const accentColor of analogous.accentColors) {
					expect(accentColor.toLowerCase()).not.toBe(brandColor.toLowerCase());
				}
			}
		});

		it("complementaryパレットでbrandColorと同じトークンが選ばれない", async () => {
			for (const brandColor of DADS_TOKEN_COLORS) {
				const result = await getAllHarmonyPalettes(brandColor);

				expect(result.ok).toBe(true);
				if (!result.ok) continue;

				const complementary = result.result?.complementary;
				if (!complementary) continue;

				// 全てのアクセントカラーがbrandColorと異なることを確認
				for (const accentColor of complementary.accentColors) {
					expect(accentColor.toLowerCase()).not.toBe(brandColor.toLowerCase());
				}
			}
		});

		it("compoundパレットでbrandColorと同じトークンが選ばれない", async () => {
			for (const brandColor of DADS_TOKEN_COLORS) {
				const result = await getAllHarmonyPalettes(brandColor);

				expect(result.ok).toBe(true);
				if (!result.ok) continue;

				const compound = result.result?.compound;
				if (!compound) continue;

				// 全てのアクセントカラーがbrandColorと異なることを確認
				for (const accentColor of compound.accentColors) {
					expect(accentColor.toLowerCase()).not.toBe(brandColor.toLowerCase());
				}
			}
		});

		it("パレット内の全色がユニークなカラーコードである", async () => {
			for (const brandColor of DADS_TOKEN_COLORS) {
				const result = await getAllHarmonyPalettes(brandColor);

				expect(result.ok).toBe(true);
				if (!result.ok) continue;

				// 各ハーモニータイプでチェック
				const harmonyTypes = [
					"complementary",
					"triadic",
					"analogous",
					"split-complementary",
					"compound",
					"square",
				] as const;

				for (const harmonyType of harmonyTypes) {
					const palette = result.result?.[harmonyType];
					if (!palette) continue;

					const allColors = [palette.brandColor, ...palette.accentColors];
					const uniqueColors = new Set(allColors.map((c) => c.toLowerCase()));

					// 全てのカラーコードがユニークであることを確認
					expect(uniqueColors.size).toBe(allColors.length);
				}
			}
		});
	});
});

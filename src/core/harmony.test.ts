import { beforeAll, describe, expect, test } from "bun:test";
import { Color } from "./color";
import {
	generateHarmonyPalette,
	getVibrancyAdjustment,
	HarmonyType,
	initializeHarmonyDads,
} from "./harmony";

describe("getVibrancyAdjustment - Boundary Value Tests", () => {
	describe("Brown Zone (20-60°)", () => {
		test("20° (brown zone start) - 境界値での調整", () => {
			const result = getVibrancyAdjustment(20);

			// intensity = 1 - |20 - 40| / 20 = 1 - 1 = 0
			expect(result.toneBoost).toBe(0); // 8 * 0 = 0
			expect(result.chromaMultiplier).toBe(1.1);
			expect(result.toneBlendFactor).toBe(0.7); // 0.7 + 0.15 * 0 = 0.7
		});

		test("30° (brown zone interior) - 内部値での調整", () => {
			const result = getVibrancyAdjustment(30);

			// intensity = 1 - |30 - 40| / 20 = 1 - 10/20 = 0.5
			const expectedIntensity = 0.5;
			expect(result.toneBoost).toBe(4); // 8 * 0.5 = 4
			expect(result.chromaMultiplier).toBe(1.1);
			expect(result.toneBlendFactor).toBeCloseTo(0.775, 2); // 0.7 + 0.15 * 0.5
		});

		test("40° (brown zone peak) - ピーク強度での調整", () => {
			const result = getVibrancyAdjustment(40);

			// intensity = 1 - |40 - 40| / 20 = 1
			expect(result.toneBoost).toBe(8); // 8 * 1 = 8
			expect(result.chromaMultiplier).toBe(1.1);
			expect(result.toneBlendFactor).toBe(0.85); // 0.7 + 0.15 * 1 = 0.85
		});

		test("60° (brown zone end / yellow zone start) - 境界値での調整", () => {
			const result = getVibrancyAdjustment(60);

			// 60°はBrown Zone（20-60）とYellow Zone（60-120）の両方に該当
			// 実装は最初にマッチしたBrown Zoneを返す
			// intensity (Brown) = 1 - |60 - 40| / 20 = 0
			expect(result.toneBoost).toBe(0); // 8 * 0 = 0
			expect(result.chromaMultiplier).toBe(1.1); // Brown Zone固定値
			expect(result.toneBlendFactor).toBe(0.7); // 0.7 + 0.15 * 0
		});
	});

	describe("Yellow Zone (60-120°)", () => {
		test("61° (yellow zone interior, brown zone終了後) - 黄色帯での調整", () => {
			const result = getVibrancyAdjustment(61);

			// 60°は重複のため61°でテスト
			// intensity = 1 - |61 - 90| / 30 = 1 - 29/30 ≈ 0.0333
			const expectedIntensity = 1 - 29 / 30;
			expect(result.toneBoost).toBeCloseTo(15 * expectedIntensity, 2);
			expect(result.chromaMultiplier).toBeCloseTo(
				1.15 + 0.05 * expectedIntensity,
				2,
			);
			expect(result.toneBlendFactor).toBeCloseTo(
				0.85 + 0.1 * expectedIntensity,
				2,
			);
		});

		test("90° (yellow zone peak) - ピーク強度での調整", () => {
			const result = getVibrancyAdjustment(90);

			// intensity = 1 - |90 - 90| / 30 = 1
			expect(result.toneBoost).toBe(15); // 15 * 1
			expect(result.chromaMultiplier).toBe(1.2); // 1.15 + 0.05 * 1
			expect(result.toneBlendFactor).toBe(0.95); // 0.85 + 0.1 * 1
		});

		test("95° (yellow zone interior) - 内部値での調整", () => {
			const result = getVibrancyAdjustment(95);

			// intensity = 1 - |95 - 90| / 30 = 1 - 5/30 = 0.8333...
			const expectedIntensity = 1 - 5 / 30;
			expect(result.toneBoost).toBeCloseTo(15 * expectedIntensity, 2); // ~12.5
			expect(result.chromaMultiplier).toBeCloseTo(
				1.15 + 0.05 * expectedIntensity,
				2,
			); // ~1.19
			expect(result.toneBlendFactor).toBeCloseTo(
				0.85 + 0.1 * expectedIntensity,
				2,
			); // ~0.93
		});

		test("120° (yellow zone end / lime zone start) - 境界値での調整", () => {
			const result = getVibrancyAdjustment(120);

			// 120°はYellow Zone（60-120）とLime Zone（120-150）の両方に該当
			// 実装は最初にマッチしたYellow Zoneを返す
			// intensity (Yellow) = 1 - |120 - 90| / 30 = 0
			expect(result.toneBoost).toBe(0); // 15 * 0 = 0
			expect(result.chromaMultiplier).toBe(1.15); // 1.15 + 0.05 * 0
			expect(result.toneBlendFactor).toBe(0.85); // 0.85 + 0.1 * 0
		});
	});

	describe("Lime Zone (120-150°)", () => {
		test("121° (lime zone interior, yellow zone終了後) - 黄緑帯での調整", () => {
			const result = getVibrancyAdjustment(121);

			// 120°は重複のため121°でテスト
			// intensity = 1 - |121 - 135| / 15 = 1 - 14/15 ≈ 0.0667
			const expectedIntensity = 1 - 14 / 15;
			expect(result.toneBoost).toBeCloseTo(10 * expectedIntensity, 2);
			expect(result.chromaMultiplier).toBe(1.1);
			expect(result.toneBlendFactor).toBeCloseTo(
				0.75 + 0.1 * expectedIntensity,
				2,
			);
		});

		test("135° (lime zone peak) - ピーク強度での調整", () => {
			const result = getVibrancyAdjustment(135);

			// intensity = 1 - |135 - 135| / 15 = 1
			expect(result.toneBoost).toBe(10); // 10 * 1
			expect(result.chromaMultiplier).toBe(1.1);
			expect(result.toneBlendFactor).toBe(0.85); // 0.75 + 0.1 * 1
		});

		test("150° (lime zone end) - 境界値での調整", () => {
			const result = getVibrancyAdjustment(150);

			// intensity = 1 - |150 - 135| / 15 = 0
			expect(result.toneBoost).toBe(0);
			expect(result.chromaMultiplier).toBe(1.1);
			expect(result.toneBlendFactor).toBe(0.75);
		});
	});

	describe("Outside Problem Zones", () => {
		test("0° (red) - 問題帯外での調整なし", () => {
			const result = getVibrancyAdjustment(0);

			expect(result.toneBoost).toBe(0);
			expect(result.chromaMultiplier).toBe(1.0);
			expect(result.toneBlendFactor).toBe(0.5);
		});

		test("150° (lime zone end) - 境界値（問題帯終了）", () => {
			const result = getVibrancyAdjustment(150);

			// intensity = 1 - |150 - 135| / 15 = 0
			expect(result.toneBoost).toBe(0);
			expect(result.chromaMultiplier).toBe(1.1); // Lime Zone固定値
			expect(result.toneBlendFactor).toBe(0.75);
		});

		test("151° (問題帯外) - 151°以降は調整なし", () => {
			const result = getVibrancyAdjustment(151);

			expect(result.toneBoost).toBe(0);
			expect(result.chromaMultiplier).toBe(1.0);
			expect(result.toneBlendFactor).toBe(0.5);
		});

		test("180° (cyan) - 問題帯外での調整なし", () => {
			const result = getVibrancyAdjustment(180);

			expect(result.toneBoost).toBe(0);
			expect(result.chromaMultiplier).toBe(1.0);
			expect(result.toneBlendFactor).toBe(0.5);
		});

		test("270° (blue) - 問題帯外での調整なし", () => {
			const result = getVibrancyAdjustment(270);

			expect(result.toneBoost).toBe(0);
			expect(result.chromaMultiplier).toBe(1.0);
			expect(result.toneBlendFactor).toBe(0.5);
		});

		test("360° (red, normalized to 0°) - 正規化後の境界値", () => {
			const result = getVibrancyAdjustment(360);

			expect(result.toneBoost).toBe(0);
			expect(result.chromaMultiplier).toBe(1.0);
			expect(result.toneBlendFactor).toBe(0.5);
		});
	});

	describe("Edge Cases", () => {
		test("負の値 (-30°) - 正規化後に問題帯外", () => {
			const result = getVibrancyAdjustment(-30);

			// -30° → 330° (問題帯外)
			expect(result.toneBoost).toBe(0);
			expect(result.chromaMultiplier).toBe(1.0);
			expect(result.toneBlendFactor).toBe(0.5);
		});

		test("360超過 (420°) - 正規化後に茶色帯", () => {
			const result = getVibrancyAdjustment(420);

			// 420° → 60° (brown zone end, 実装はBrown Zoneを返す)
			// intensity (Brown) = 1 - |60 - 40| / 20 = 0
			expect(result.toneBoost).toBe(0);
			expect(result.chromaMultiplier).toBe(1.1);
			expect(result.toneBlendFactor).toBe(0.7);
		});
	});

	describe("Peak Intensity Calculation", () => {
		test("各ゾーンのピークで最大強度になること", () => {
			// Brown zone peak (40°)
			const brown = getVibrancyAdjustment(40);
			expect(brown.toneBlendFactor).toBe(0.85); // 最大

			// Yellow zone peak (90°)
			const yellow = getVibrancyAdjustment(90);
			expect(yellow.toneBoost).toBe(15); // 最大
			expect(yellow.chromaMultiplier).toBe(1.2); // 最大
			expect(yellow.toneBlendFactor).toBe(0.95); // 最大

			// Lime zone peak (135°)
			const lime = getVibrancyAdjustment(135);
			expect(lime.toneBoost).toBe(10); // 最大
			expect(lime.toneBlendFactor).toBe(0.85); // 最大
		});

		test("ゾーン境界で強度が最小になること", () => {
			// Brown zone boundaries
			expect(getVibrancyAdjustment(20).toneBoost).toBe(0);
			// 60°はBrown Zoneとして処理されるが、ピークから遠いため0
			expect(getVibrancyAdjustment(60).toneBoost).toBe(0);

			// Yellow zone boundaries (重複を避けて61°, 120°でテスト)
			const yellow61 = getVibrancyAdjustment(61);
			expect(yellow61.toneBoost).toBeGreaterThan(0); // ゾーン内部
			expect(getVibrancyAdjustment(120).toneBoost).toBe(0); // ピークから遠い

			// Lime zone boundaries (重複を避けて121°, 150°でテスト)
			const lime121 = getVibrancyAdjustment(121);
			expect(lime121.toneBoost).toBeGreaterThan(0); // ゾーン内部
			expect(getVibrancyAdjustment(150).toneBoost).toBe(0); // ピークから遠い
		});
	});
});

describe("Issue #39: DADSトークンのstep値がSystemPaletteColorに伝播する", () => {
	// 共通テストデータ
	const TEST_BRAND_COLOR = "#2c4100"; // lime系の色

	// ヘルパー: step値が有効なDADS stepであることを検証
	const expectValidDadsStep = (step: number | undefined) => {
		expect(step).toBeDefined();
		expect(typeof step).toBe("number");
		// DADS stepは100〜2400の範囲
		expect(step).toBeGreaterThanOrEqual(100);
		expect(step).toBeLessThanOrEqual(2400);
	};

	// ヘルパー: DADSトークン由来の色（secondary/accent）をフィルター
	const filterDadsColors = (
		palette: ReturnType<typeof generateHarmonyPalette>,
	) => palette.filter((c) => c.role === "secondary" || c.role === "accent");

	beforeAll(async () => {
		await initializeHarmonyDads();
	});

	test("ANALOGOUS ハーモニーでAccent色にstepが設定される", () => {
		const brandColor = new Color(TEST_BRAND_COLOR);
		const palette = generateHarmonyPalette(brandColor, HarmonyType.ANALOGOUS);

		expect(palette.length).toBeGreaterThanOrEqual(3);

		const dadsColors = filterDadsColors(palette);
		expect(dadsColors.length).toBeGreaterThan(0);

		for (const color of dadsColors) {
			expectValidDadsStep(color.step);
		}
	});

	test("COMPLEMENTARY ハーモニーでSecondary色にstepが設定される", () => {
		const brandColor = new Color(TEST_BRAND_COLOR);
		const palette = generateHarmonyPalette(
			brandColor,
			HarmonyType.COMPLEMENTARY,
		);

		const secondaryColor = palette.find((c) => c.role === "secondary");
		expect(secondaryColor).toBeDefined();
		expectValidDadsStep(secondaryColor?.step);
	});

	test("TRIADIC ハーモニーでSecondary/Accent色にstepが設定される", () => {
		const brandColor = new Color(TEST_BRAND_COLOR);
		const palette = generateHarmonyPalette(brandColor, HarmonyType.TRIADIC);

		expect(palette.length).toBeGreaterThanOrEqual(3);

		// Note: neutral色はDADSトークンからではないためstepは不要
		const dadsColors = filterDadsColors(palette);
		expect(dadsColors.length).toBeGreaterThan(0);

		for (const color of dadsColors) {
			expectValidDadsStep(color.step);
		}
	});
});

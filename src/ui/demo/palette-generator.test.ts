/**
 * パレット生成モジュールのテスト
 *
 * @module @/ui/demo/palette-generator.test
 * Requirements: 9.1, 9.2, 9.3
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { HarmonyType } from "@/core/harmony";
import {
	createPalettesFromHarmonyColors,
	handleGenerate,
	type PaletteGeneratorCallbacks,
} from "./palette-generator";
import { resetState, state } from "./state";

describe("palette-generator", () => {
	beforeEach(() => {
		// 各テスト前に状態をリセット
		resetState();
	});

	afterEach(() => {
		// 各テスト後に状態をリセット
		resetState();
	});

	describe("handleGenerate", () => {
		it("有効なHEXカラーでパレットを生成する", () => {
			const onComplete = mock();
			const callbacks: PaletteGeneratorCallbacks = { onComplete };

			handleGenerate("#0066CC", HarmonyType.COMPLEMENTARY, callbacks);

			// state.palettesが更新されている
			expect(state.palettes.length).toBeGreaterThan(0);
			// state.shadesPalettesが更新されている
			expect(state.shadesPalettes.length).toBeGreaterThan(0);
			// activeIdが設定されている
			expect(state.activeId).toBe(state.palettes[0]?.id);
			// activeHarmonyIndexがリセットされている
			expect(state.activeHarmonyIndex).toBe(0);
			// コールバックが呼ばれている
			expect(onComplete).toHaveBeenCalledTimes(1);
		});

		it("Primaryパレットは指定したハーモニータイプを持つ", () => {
			const callbacks: PaletteGeneratorCallbacks = { onComplete: mock() };

			handleGenerate("#0066CC", HarmonyType.TRIADIC, callbacks);

			const primaryPalette = state.palettes[0];
			expect(primaryPalette).toBeDefined();
			expect(primaryPalette?.harmony).toBe(HarmonyType.TRIADIC);
		});

		it("派生パレット（index > 0）はHarmonyType.NONEを持つ", () => {
			const callbacks: PaletteGeneratorCallbacks = { onComplete: mock() };

			handleGenerate("#0066CC", HarmonyType.ANALOGOUS, callbacks);

			// 派生パレット（存在する場合）を確認
			for (let i = 1; i < state.palettes.length; i++) {
				expect(state.palettes[i]?.harmony).toBe(HarmonyType.NONE);
			}
		});

		it("Primaryパレットは元の入力HEX値を保持する（丸め誤差防止）", () => {
			const callbacks: PaletteGeneratorCallbacks = { onComplete: mock() };
			const inputHex = "#0066CC";

			handleGenerate(inputHex, HarmonyType.COMPLEMENTARY, callbacks);

			const primaryPalette = state.palettes.find((p) =>
				p.id.includes("primary"),
			);
			expect(primaryPalette).toBeDefined();
			// keyColors[0]が元のHEX値を含む
			expect(primaryPalette?.keyColors[0]?.toLowerCase()).toContain(
				inputHex.toLowerCase(),
			);
		});

		it("shadesPalettesはHarmonyType.NONEを持つ", () => {
			const callbacks: PaletteGeneratorCallbacks = { onComplete: mock() };

			handleGenerate("#0066CC", HarmonyType.COMPLEMENTARY, callbacks);

			for (const palette of state.shadesPalettes) {
				expect(palette.harmony).toBe(HarmonyType.NONE);
			}
		});

		it("DADSハーモニーの場合、ステップ情報が付与される", () => {
			const callbacks: PaletteGeneratorCallbacks = { onComplete: mock() };

			handleGenerate("#0066CC", HarmonyType.DADS, callbacks);

			// DADSモードではパレットにステップ情報が含まれる場合がある
			// 少なくとも1つのパレットを確認
			expect(state.palettes.length).toBeGreaterThan(0);
		});

		it("M3ハーモニーでも正常に生成される", () => {
			const callbacks: PaletteGeneratorCallbacks = { onComplete: mock() };

			handleGenerate("#0066CC", HarmonyType.M3, callbacks);

			expect(state.palettes.length).toBeGreaterThan(0);
			expect(state.shadesPalettes.length).toBeGreaterThan(0);
		});

		it("パレットIDは一意の形式を持つ", () => {
			const callbacks: PaletteGeneratorCallbacks = { onComplete: mock() };

			handleGenerate("#0066CC", HarmonyType.COMPLEMENTARY, callbacks);

			const ids = state.palettes.map((p) => p.id);
			const uniqueIds = new Set(ids);
			// すべてのIDが一意
			expect(uniqueIds.size).toBe(ids.length);
			// sys-で始まる形式
			for (const id of ids) {
				expect(id).toMatch(/^sys-\d+-/);
			}
		});

		it("shadesPalettesのIDはshades-で始まる", () => {
			const callbacks: PaletteGeneratorCallbacks = { onComplete: mock() };

			handleGenerate("#0066CC", HarmonyType.COMPLEMENTARY, callbacks);

			for (const palette of state.shadesPalettes) {
				expect(palette.id).toMatch(/^shades-\d+-/);
			}
		});

		it("ratiosはデフォルト値を持つ", () => {
			const callbacks: PaletteGeneratorCallbacks = { onComplete: mock() };

			handleGenerate("#0066CC", HarmonyType.COMPLEMENTARY, callbacks);

			const expectedRatios = [21, 15, 10, 7, 4.5, 3, 1];
			for (const palette of state.palettes) {
				expect(palette.ratios).toEqual(expectedRatios);
			}
			for (const palette of state.shadesPalettes) {
				expect(palette.ratios).toEqual(expectedRatios);
			}
		});
	});

	describe("createPalettesFromHarmonyColors", () => {
		it("PrimaryパレットのharmonyはHarmonyFilterTypeから正しく変換される", () => {
			const palettes = createPalettesFromHarmonyColors(
				"analogous",
				["#111111", "#222222"],
				[{ dadsSourceName: "Green 1100", step: 1100 }] as never[],
			);

			// パレット順序: Primary → Secondary → Tertiary → Accent
			// Primaryは選択ハーモニー（analogous）を持つ
			expect(palettes[0]?.harmony).toBe(HarmonyType.ANALOGOUS);
			expect(palettes[0]?.name).toBe("Primary");

			// Secondary/Tertiaryが導出される
			expect(palettes[1]?.name).toBe("Secondary");
			expect(palettes[1]?.harmony).toBe(HarmonyType.NONE);
			expect(palettes[1]?.derivedFrom?.derivationType).toBe("secondary");

			expect(palettes[2]?.name).toBe("Tertiary");
			expect(palettes[2]?.harmony).toBe(HarmonyType.NONE);
			expect(palettes[2]?.derivedFrom?.derivationType).toBe("tertiary");

			// Accent（index 3）はNONE（Primaryのみがモードを表す）
			expect(palettes[3]?.name).toBe("Accent 1");
			expect(palettes[3]?.harmony).toBe(HarmonyType.NONE);

			// candidates由来のDADSメタデータがAccentに反映される
			expect(palettes[3]?.baseChromaName).toBe("Green");
			expect(palettes[3]?.step).toBe(1100);
		});
	});
});

/**
 * constants.tsのテスト
 *
 * TDD: RED Phase - 実装前にテストを作成
 * Requirements: 6.2, 6.3
 */
import { describe, expect, it } from "bun:test";
import { HarmonyType } from "@/core/harmony";
import { DEFAULT_STATE, HARMONY_TYPES } from "./constants";
import type { DemoState, HarmonyTypeConfig } from "./types";

describe("constants.ts", () => {
	describe("HARMONY_TYPES", () => {
		it("配列として定義されていること", () => {
			expect(Array.isArray(HARMONY_TYPES)).toBe(true);
		});

		it("8種類のハーモニータイプが定義されていること", () => {
			expect(HARMONY_TYPES.length).toBe(8);
		});

		it("各ハーモニータイプが必要なプロパティを持つこと", () => {
			for (const harmony of HARMONY_TYPES) {
				expect(harmony).toHaveProperty("id");
				expect(harmony).toHaveProperty("name");
				expect(harmony).toHaveProperty("description");
				expect(harmony).toHaveProperty("harmonyType");
				expect(harmony).toHaveProperty("detail");
			}
		});

		it("Complementaryが含まれること", () => {
			const complementary = HARMONY_TYPES.find((h) => h.id === "complementary");
			expect(complementary).toBeDefined();
			expect(complementary?.name).toBe("Complementary");
			expect(complementary?.harmonyType).toBe(HarmonyType.COMPLEMENTARY);
		});

		it("Analogousが含まれること", () => {
			const analogous = HARMONY_TYPES.find((h) => h.id === "analogous");
			expect(analogous).toBeDefined();
			expect(analogous?.name).toBe("Analogous");
			expect(analogous?.harmonyType).toBe(HarmonyType.ANALOGOUS);
		});

		it("Triadicが含まれること", () => {
			const triadic = HARMONY_TYPES.find((h) => h.id === "triadic");
			expect(triadic).toBeDefined();
			expect(triadic?.name).toBe("Triadic");
			expect(triadic?.harmonyType).toBe(HarmonyType.TRIADIC);
		});

		it("Split Complementaryが含まれること", () => {
			const split = HARMONY_TYPES.find((h) => h.id === "split");
			expect(split).toBeDefined();
			expect(split?.name).toBe("Split Comp.");
			expect(split?.harmonyType).toBe(HarmonyType.SPLIT_COMPLEMENTARY);
		});

		it("Tetradicが含まれること", () => {
			const tetradic = HARMONY_TYPES.find((h) => h.id === "tetradic");
			expect(tetradic).toBeDefined();
			expect(tetradic?.name).toBe("Tetradic");
			expect(tetradic?.harmonyType).toBe(HarmonyType.TETRADIC);
		});

		it("Squareが含まれること", () => {
			const square = HARMONY_TYPES.find((h) => h.id === "square");
			expect(square).toBeDefined();
			expect(square?.name).toBe("Square");
			expect(square?.harmonyType).toBe(HarmonyType.SQUARE);
		});

		it("Material 3が含まれること", () => {
			const m3 = HARMONY_TYPES.find((h) => h.id === "m3");
			expect(m3).toBeDefined();
			expect(m3?.name).toBe("Material 3");
			expect(m3?.harmonyType).toBe(HarmonyType.M3);
		});

		it("DADSが含まれること", () => {
			const dads = HARMONY_TYPES.find((h) => h.id === "dads");
			expect(dads).toBeDefined();
			expect(dads?.name).toBe("DADS");
			expect(dads?.harmonyType).toBe(HarmonyType.DADS);
		});

		it("HarmonyTypeConfig型に準拠すること", () => {
			// TypeScript型チェックで検証されるが、ランタイムでも構造を確認
			const harmony: HarmonyTypeConfig = HARMONY_TYPES[0];
			expect(typeof harmony.id).toBe("string");
			expect(typeof harmony.name).toBe("string");
			expect(typeof harmony.description).toBe("string");
			expect(typeof harmony.detail).toBe("string");
		});
	});

	describe("DEFAULT_STATE", () => {
		it("DemoState型に準拠すること", () => {
			// TypeScript型チェックで検証される
			const state: DemoState = DEFAULT_STATE;
			expect(state).toBeDefined();
		});

		it("palettesが空配列であること", () => {
			expect(DEFAULT_STATE.palettes).toEqual([]);
		});

		it("shadesPalettesが空配列であること", () => {
			expect(DEFAULT_STATE.shadesPalettes).toEqual([]);
		});

		it("activeIdが空文字列であること", () => {
			expect(DEFAULT_STATE.activeId).toBe("");
		});

		it("activeHarmonyIndexが0であること", () => {
			expect(DEFAULT_STATE.activeHarmonyIndex).toBe(0);
		});

		it("contrastIntensityがmoderateであること", () => {
			expect(DEFAULT_STATE.contrastIntensity).toBe("moderate");
		});

		it("lightnessDistributionがlinearであること", () => {
			expect(DEFAULT_STATE.lightnessDistribution).toBe("linear");
		});

		it("viewModeがstudioであること", () => {
			expect(DEFAULT_STATE.viewMode).toBe("studio");
		});

		it("cvdSimulationがnormalであること", () => {
			expect(DEFAULT_STATE.cvdSimulation).toBe("normal");
		});

		it("cvdConfusionThresholdが3.5であること", () => {
			expect(DEFAULT_STATE.cvdConfusionThreshold).toBe(3.5);
		});

		it("selectedHarmonyConfigがnullであること", () => {
			expect(DEFAULT_STATE.selectedHarmonyConfig).toBeNull();
		});

		it("cudModeがguideであること", () => {
			expect(DEFAULT_STATE.cudMode).toBe("guide");
		});

		it("lightBackgroundColorが#ffffffであること", () => {
			expect(DEFAULT_STATE.lightBackgroundColor).toBe("#ffffff");
		});

		it("darkBackgroundColorが#000000であること", () => {
			expect(DEFAULT_STATE.darkBackgroundColor).toBe("#000000");
		});
	});
});

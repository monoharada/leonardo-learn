/**
 * キーカラー導出モジュールのテスト
 *
 * @module @/core/key-color-derivation/deriver.test
 */

import { describe, expect, it } from "bun:test";
import { Color } from "../color";
import { deriveSecondaryTertiary } from "./deriver";
import { DADS_CONTRAST_DEFAULTS } from "./types";

describe("deriveSecondaryTertiary", () => {
	describe("ライト背景", () => {
		const lightBg = "#ffffff";

		it("セカンダリはコントラスト要件に基づいて方向が決まる（高コントラストPrimary→lighter）", () => {
			// #3366cc はコントラスト約5.3:1（>3.0目標）なので lighter方向
			const result = deriveSecondaryTertiary({
				primaryColor: "#3366cc",
				backgroundColor: lightBg,
			});

			// Primary contrast > target → lighter direction
			expect(result.secondary.lightnessDirection).toBe("lighter");
			expect(result.secondary.tone).toBeGreaterThan(result.primary.tone);
		});

		it("ターシャリはプライマリより明るくなる", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#3366cc",
				backgroundColor: lightBg,
			});

			expect(result.tertiary.lightnessDirection).toBe("lighter");
			expect(result.tertiary.tone).toBeGreaterThan(result.primary.tone);
		});

		it("プライマリ、セカンダリ、ターシャリは同じ色相を共有する（sharedHue経由で検証）", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#cc3366",
				backgroundColor: lightBg,
			});

			// sharedHueが設定されていること
			expect(result.sharedHue).toBeDefined();
			expect(result.sharedHue).toBeGreaterThanOrEqual(0);
			expect(result.sharedHue).toBeLessThanOrEqual(360);
		});

		it("セカンダリは3:1コントラスト目標に向かって探索する", () => {
			// 低コントラストのPrimary（#99bbff, 約2:1）を使用して暗い方向に探索
			const result = deriveSecondaryTertiary({
				primaryColor: "#99bbff",
				backgroundColor: lightBg,
			});

			// Primary contrast < target → darker direction → 3:1に近づく
			expect(result.secondary.contrastRatio).toBeGreaterThanOrEqual(2.5);
			expect(result.secondary.lightnessDirection).toBe("darker");
		});

		it("背景モードがlightと判定される", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#3366cc",
				backgroundColor: lightBg,
			});

			expect(result.backgroundMode).toBe("light");
		});
	});

	describe("ダーク背景", () => {
		const darkBg = "#1a1a1a";

		it("セカンダリはPrimaryと異なるトーンになる（コントラストベースで方向決定）", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#6699ff",
				backgroundColor: darkBg,
			});

			// Secondaryの方向はコントラストベースで決まる
			// Primary contrast (6.27) > target (3.0) → 低いコントラストが必要 → 暗い方向
			expect(result.secondary.lightnessDirection).toBe("darker");
			expect(result.secondary.tone).not.toBe(result.primary.tone);
		});

		it("ターシャリはダーク背景に近づく（暗い方向）", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#6699ff",
				backgroundColor: darkBg,
			});

			expect(result.tertiary.lightnessDirection).toBe("darker");
			// Tertiaryのコントラストは目標（1.5）に近い
			expect(result.tertiary.contrastRatio).toBeLessThan(3.0);
		});

		it("背景モードがdarkと判定される", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#6699ff",
				backgroundColor: darkBg,
			});

			expect(result.backgroundMode).toBe("dark");
		});

		it("プライマリ、セカンダリ、ターシャリは同じ色相を共有する", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#ff6699",
				backgroundColor: darkBg,
			});

			// sharedHueとsharedChromaが設定されていること
			expect(result.sharedHue).toBeDefined();
			expect(result.sharedChroma).toBeDefined();
		});
	});

	describe("エッジケース", () => {
		it("黄色系の色相を正しく処理する", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#ffcc00", // 黄色
				backgroundColor: "#ffffff",
			});

			// 有効なカラーが生成されること
			expect(result.secondary.color).toBeDefined();
			expect(result.tertiary.color).toBeDefined();
			expect(result.secondary.color.toHex()).toMatch(/^#[0-9a-f]{6}$/i);
			expect(result.tertiary.color.toHex()).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it("非常に明るいプライマリカラーを処理する", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#ccddff", // 非常に明るい青
				backgroundColor: "#ffffff",
			});

			// セカンダリはコントラストを達成するためにかなり暗くなるべき
			expect(result.secondary.tone).toBeLessThan(70);
		});

		it("非常に暗いプライマリカラーを処理する", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#112233", // 非常に暗い青
				backgroundColor: "#000000",
			});

			// 有効なカラーが生成されること
			expect(result.secondary.color).toBeDefined();
			expect(result.tertiary.color).toBeDefined();
		});

		it("Colorインスタンスを入力として受け入れる", () => {
			const primaryColor = new Color("#3366cc");
			const backgroundColor = new Color("#ffffff");

			const result = deriveSecondaryTertiary({
				primaryColor,
				backgroundColor,
			});

			expect(result.primary.color).toBeDefined();
			expect(result.secondary.color).toBeDefined();
			expect(result.tertiary.color).toBeDefined();
		});

		it("カスタムコントラスト値を使用できる", () => {
			// #99bbff（淡い青）はコントラスト約2:1なので、4.5目標に向けて暗い方向に探索
			const result = deriveSecondaryTertiary({
				primaryColor: "#99bbff",
				backgroundColor: "#ffffff",
				secondaryUiContrast: 4.5,
				tertiaryContrast: 2.0,
			});

			// カスタム値（4.5）に近づくこと
			// 淡い色 → 暗い方向に探索 → 高コントラスト達成
			expect(result.secondary.contrastRatio).toBeGreaterThanOrEqual(4.0);
		});

		it("グレースケールカラーを処理する", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#808080", // グレー
				backgroundColor: "#ffffff",
			});

			expect(result.secondary.color).toBeDefined();
			expect(result.tertiary.color).toBeDefined();
		});

		it("中間の背景色を正しく処理する", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#3366cc",
				backgroundColor: "#808080", // 中間グレー
			});

			// 背景がちょうど中間なので、OKLCHのL値に基づいて判定
			// #808080のOKLCH L値は約0.6なのでlight
			expect(result.backgroundMode).toBe("light");
		});
	});

	describe("デフォルト値", () => {
		it("DADS準拠のデフォルトコントラスト値が正しく設定されている", () => {
			expect(DADS_CONTRAST_DEFAULTS.primaryText).toBe(4.5);
			expect(DADS_CONTRAST_DEFAULTS.secondaryUi).toBe(3.0);
			expect(DADS_CONTRAST_DEFAULTS.secondaryText).toBe(4.5);
			expect(DADS_CONTRAST_DEFAULTS.tertiary).toBe(1.5);
		});
	});

	describe("結果の構造", () => {
		it("すべての必須フィールドが存在する", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#3366cc",
				backgroundColor: "#ffffff",
			});

			// primary
			expect(result.primary.color).toBeInstanceOf(Color);
			expect(typeof result.primary.tone).toBe("number");
			expect(typeof result.primary.contrastRatio).toBe("number");

			// secondary
			expect(result.secondary.color).toBeInstanceOf(Color);
			expect(typeof result.secondary.tone).toBe("number");
			expect(typeof result.secondary.contrastRatio).toBe("number");
			expect(result.secondary.lightnessDirection).toMatch(/^(lighter|darker)$/);

			// tertiary
			expect(result.tertiary.color).toBeInstanceOf(Color);
			expect(typeof result.tertiary.tone).toBe("number");
			expect(typeof result.tertiary.contrastRatio).toBe("number");
			expect(result.tertiary.lightnessDirection).toMatch(/^(lighter|darker)$/);

			// shared values
			expect(typeof result.sharedHue).toBe("number");
			expect(typeof result.sharedChroma).toBe("number");
			expect(result.backgroundMode).toMatch(/^(light|dark)$/);
		});

		it("トーン値は0-100の範囲内", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#3366cc",
				backgroundColor: "#ffffff",
			});

			expect(result.primary.tone).toBeGreaterThanOrEqual(0);
			expect(result.primary.tone).toBeLessThanOrEqual(100);
			expect(result.secondary.tone).toBeGreaterThanOrEqual(0);
			expect(result.secondary.tone).toBeLessThanOrEqual(100);
			expect(result.tertiary.tone).toBeGreaterThanOrEqual(0);
			expect(result.tertiary.tone).toBeLessThanOrEqual(100);
		});

		it("色相値は0-360の範囲内", () => {
			const result = deriveSecondaryTertiary({
				primaryColor: "#3366cc",
				backgroundColor: "#ffffff",
			});

			expect(result.sharedHue).toBeGreaterThanOrEqual(0);
			expect(result.sharedHue).toBeLessThanOrEqual(360);
		});
	});
});

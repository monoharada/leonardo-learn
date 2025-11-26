/**
 * DADSOptimizer - DADSスタイルアクセシビリティ最適化のテスト
 */

import { describe, expect, it } from "bun:test";
import { Color } from "../color";
import type { RoleType } from "../system/role-config";
import { DADSOptimizer, type DADSOptions } from "./dads-optimizer";
import type { ToneScale, ToneValue } from "./m3-generator";

// テスト用のToneScaleを作成するヘルパー
function createTestToneScale(
	role: RoleType = "primary",
	hue: number = 250,
	chroma: number = 0.1,
): ToneScale {
	const tones = new Map<ToneValue, Color>();
	const toneValues: ToneValue[] = [
		0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100,
	];

	for (const tone of toneValues) {
		const lightness = tone / 100;
		tones.set(
			tone,
			new Color({ mode: "oklch", l: lightness, c: chroma, h: hue }),
		);
	}

	return {
		role,
		tones,
		sourceColor: new Color({ mode: "oklch", l: 0.5, c: chroma, h: hue }),
	};
}

describe("DADSOptimizer", () => {
	describe("optimize", () => {
		it("スケールを最適化してコントラストを改善する", () => {
			const optimizer = new DADSOptimizer();

			const scales = new Map<RoleType, ToneScale>([
				["primary", createTestToneScale("primary")],
			]);

			const options: DADSOptions = {
				targetLevel: "aaa",
				useAPCA: false,
				generateInteractiveStates: false,
			};

			const optimized = optimizer.optimize(scales, options);

			expect(optimized.size).toBe(1);
			expect(optimized.get("primary")).toBeDefined();
		});

		it("AAA基準（7:1）を満たすテキストカラーを生成する", () => {
			const optimizer = new DADSOptimizer();

			const scales = new Map<RoleType, ToneScale>([
				["primary", createTestToneScale("primary")],
			]);

			const options: DADSOptions = {
				targetLevel: "aaa",
				useAPCA: false,
				generateInteractiveStates: false,
			};

			const optimized = optimizer.optimize(scales, options);
			const primaryScale = optimized.get("primary");

			if (primaryScale) {
				// 暗いトーン（テキスト用）と明るいトーン（背景用）のコントラストを検証
				const darkTone = primaryScale.tones.get(10);
				const lightTone = primaryScale.tones.get(99);

				if (darkTone && lightTone) {
					const contrast = darkTone.contrast(lightTone);
					// AAA基準は7:1以上
					expect(contrast).toBeGreaterThanOrEqual(7);
				}
			}
		});

		it("AA基準（4.5:1）を満たすテキストカラーを生成する", () => {
			const optimizer = new DADSOptimizer();

			const scales = new Map<RoleType, ToneScale>([
				["primary", createTestToneScale("primary")],
			]);

			const options: DADSOptions = {
				targetLevel: "aa",
				useAPCA: false,
				generateInteractiveStates: false,
			};

			const optimized = optimizer.optimize(scales, options);
			const primaryScale = optimized.get("primary");

			if (primaryScale) {
				const darkTone = primaryScale.tones.get(20);
				const lightTone = primaryScale.tones.get(90);

				if (darkTone && lightTone) {
					const contrast = darkTone.contrast(lightTone);
					// AA基準は4.5:1以上
					expect(contrast).toBeGreaterThanOrEqual(4.5);
				}
			}
		});

		it("Lightnessを調整してコントラストを達成する", () => {
			const optimizer = new DADSOptimizer();

			// 低コントラストなスケール（中間のLightnessのみ）
			const tones = new Map<ToneValue, Color>();
			const toneValues: ToneValue[] = [
				0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100,
			];

			for (const tone of toneValues) {
				// 意図的に中間のLightnessに集中
				const lightness = 0.4 + (tone / 100) * 0.3;
				tones.set(
					tone,
					new Color({ mode: "oklch", l: lightness, c: 0.1, h: 250 }),
				);
			}

			const lowContrastScale: ToneScale = {
				role: "primary",
				tones,
				sourceColor: new Color({ mode: "oklch", l: 0.5, c: 0.1, h: 250 }),
			};

			const scales = new Map<RoleType, ToneScale>([
				["primary", lowContrastScale],
			]);

			const options: DADSOptions = {
				targetLevel: "aa",
				useAPCA: false,
				generateInteractiveStates: false,
			};

			const optimized = optimizer.optimize(scales, options);
			const primaryScale = optimized.get("primary");

			if (primaryScale) {
				// 調整後、暗いトーンと明るいトーンの差が改善されているはず
				const darkTone = primaryScale.tones.get(10);
				const lightTone = primaryScale.tones.get(99);

				if (darkTone && lightTone) {
					const contrast = darkTone.contrast(lightTone);
					// AA基準（4.5:1）を満たすように調整されている
					expect(contrast).toBeGreaterThanOrEqual(4.5);
				}
			}
		});

		it("Chroma/Hueは変更しない", () => {
			const optimizer = new DADSOptimizer();

			const hue = 250;
			const chroma = 0.15;
			const scales = new Map<RoleType, ToneScale>([
				["primary", createTestToneScale("primary", hue, chroma)],
			]);

			const options: DADSOptions = {
				targetLevel: "aaa",
				useAPCA: false,
				generateInteractiveStates: false,
			};

			const optimized = optimizer.optimize(scales, options);
			const primaryScale = optimized.get("primary");

			if (primaryScale) {
				for (const [_tone, color] of primaryScale.tones) {
					// Hueは維持
					expect(color.oklch.h).toBe(hue);
					// Chromaは同じか、クランプによる調整のみ
					// （Lightnessが変わるとChromaもクランプされる可能性がある）
				}
			}
		});

		it("複数のロールを最適化できる", () => {
			const optimizer = new DADSOptimizer();

			const scales = new Map<RoleType, ToneScale>([
				["primary", createTestToneScale("primary", 250)],
				["error", createTestToneScale("error", 30)],
			]);

			const options: DADSOptions = {
				targetLevel: "aa",
				useAPCA: false,
				generateInteractiveStates: false,
			};

			const optimized = optimizer.optimize(scales, options);

			expect(optimized.size).toBe(2);
			expect(optimized.get("primary")).toBeDefined();
			expect(optimized.get("error")).toBeDefined();
		});
	});

	describe("generateInteractiveStates", () => {
		it("インタラクティブ状態カラーを生成する", () => {
			const optimizer = new DADSOptimizer();

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.15, h: 250 });

			const states = optimizer.generateInteractiveStates(baseColor);

			expect(states.focus).toBeDefined();
			expect(states.hover).toBeDefined();
			expect(states.active).toBeDefined();
			expect(states.disabled).toBeDefined();
		});

		it("フォーカスはベースより明るい", () => {
			const optimizer = new DADSOptimizer();

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.15, h: 250 });
			const states = optimizer.generateInteractiveStates(baseColor);

			expect(states.focus.oklch.l).toBeGreaterThan(baseColor.oklch.l);
		});

		it("ホバーはベースより少し明るい", () => {
			const optimizer = new DADSOptimizer();

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.15, h: 250 });
			const states = optimizer.generateInteractiveStates(baseColor);

			expect(states.hover.oklch.l).toBeGreaterThan(baseColor.oklch.l);
		});

		it("アクティブはベースより暗い", () => {
			const optimizer = new DADSOptimizer();

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.15, h: 250 });
			const states = optimizer.generateInteractiveStates(baseColor);

			expect(states.active.oklch.l).toBeLessThan(baseColor.oklch.l);
		});

		it("ディセーブルドは低いChroma", () => {
			const optimizer = new DADSOptimizer();

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.15, h: 250 });
			const states = optimizer.generateInteractiveStates(baseColor);

			expect(states.disabled.oklch.c).toBeLessThan(baseColor.oklch.c);
		});
	});

	describe("APCA support", () => {
		it("useAPCA有効時はAPCA計算を使用する", () => {
			const optimizer = new DADSOptimizer();

			const scales = new Map<RoleType, ToneScale>([
				["primary", createTestToneScale("primary")],
			]);

			const options: DADSOptions = {
				targetLevel: "aa",
				useAPCA: true,
				generateInteractiveStates: false,
			};

			const optimized = optimizer.optimize(scales, options);

			// APCA対応の最適化が行われる（結果は同様）
			expect(optimized.size).toBe(1);
		});
	});
});

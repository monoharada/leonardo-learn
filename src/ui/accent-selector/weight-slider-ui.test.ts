/**
 * WeightSliderUI Tests
 *
 * Task 4.4: WeightSlider UI の実装
 * Requirements: 2.3
 */

import { beforeEach, describe, expect, test } from "bun:test";
import {
	type ScoreWeights,
	WeightSliderUI,
	type WeightsChangeCallback,
} from "./weight-slider-ui";

describe("WeightSliderUI", () => {
	let slider: WeightSliderUI;

	// モックコンテナ（DOM環境非依存のテスト用）
	const mockContainer = {
		querySelector: () => null,
		appendChild: () => {},
	} as unknown as HTMLElement;

	beforeEach(() => {
		slider = new WeightSliderUI(mockContainer);
	});

	describe("constructor", () => {
		test("デフォルト重みで初期化される", () => {
			const weights = slider.getWeights();
			expect(weights.harmony).toBe(40);
			expect(weights.cud).toBe(30);
			expect(weights.contrast).toBe(30);
		});
	});

	describe("getWeights", () => {
		test("現在の重みを返す", () => {
			const weights = slider.getWeights();
			expect(weights.harmony + weights.cud + weights.contrast).toBe(100);
		});
	});

	describe("setWeights", () => {
		test("重みを設定できる", () => {
			slider.setWeights({ harmony: 50, cud: 25, contrast: 25 });

			const weights = slider.getWeights();
			expect(weights.harmony).toBe(50);
			expect(weights.cud).toBe(25);
			expect(weights.contrast).toBe(25);
		});

		test("合計が100でない場合は自動正規化される", () => {
			// 合計が100でない値を設定
			slider.setWeights({ harmony: 60, cud: 30, contrast: 30 });

			const weights = slider.getWeights();
			// 合計が100になるように正規化される
			expect(weights.harmony + weights.cud + weights.contrast).toBe(100);
		});

		test("合計が0の場合はデフォルト重みが適用される", () => {
			slider.setWeights({ harmony: 0, cud: 0, contrast: 0 });

			const weights = slider.getWeights();
			expect(weights.harmony).toBe(40);
			expect(weights.cud).toBe(30);
			expect(weights.contrast).toBe(30);
		});
	});

	describe("setHarmonyWeight", () => {
		test("ハーモニー重みを個別に設定できる", () => {
			slider.setHarmonyWeight(50);

			const weights = slider.getWeights();
			expect(weights.harmony).toBe(50);
			// 他の重みも再調整される
			expect(weights.harmony + weights.cud + weights.contrast).toBe(100);
		});

		test("0から100の範囲外はクランプされる", () => {
			slider.setHarmonyWeight(120);
			expect(slider.getWeights().harmony).toBeLessThanOrEqual(100);

			slider.setHarmonyWeight(-10);
			expect(slider.getWeights().harmony).toBeGreaterThanOrEqual(0);
		});
	});

	describe("setCudWeight", () => {
		test("CUD重みを個別に設定できる", () => {
			slider.setCudWeight(40);

			const weights = slider.getWeights();
			expect(weights.cud).toBe(40);
			expect(weights.harmony + weights.cud + weights.contrast).toBe(100);
		});
	});

	describe("setContrastWeight", () => {
		test("コントラスト重みを個別に設定できる", () => {
			slider.setContrastWeight(50);

			const weights = slider.getWeights();
			expect(weights.contrast).toBe(50);
			expect(weights.harmony + weights.cud + weights.contrast).toBe(100);
		});
	});

	describe("onWeightsChange", () => {
		test("重み変更時にコールバックが呼ばれる", () => {
			let callbackCalled = false;
			let callbackWeights: ScoreWeights | null = null;

			slider.onWeightsChange((weights) => {
				callbackCalled = true;
				callbackWeights = weights;
			});

			slider.setWeights({ harmony: 60, cud: 20, contrast: 20 });

			expect(callbackCalled).toBe(true);
			expect(callbackWeights).not.toBeNull();
			expect(callbackWeights?.harmony).toBe(60);
		});

		test("setHarmonyWeightでもコールバックが呼ばれる", () => {
			let callCount = 0;

			slider.onWeightsChange(() => {
				callCount++;
			});

			slider.setHarmonyWeight(55);
			expect(callCount).toBe(1);
		});

		test("setCudWeightでもコールバックが呼ばれる", () => {
			let callCount = 0;

			slider.onWeightsChange(() => {
				callCount++;
			});

			slider.setCudWeight(35);
			expect(callCount).toBe(1);
		});

		test("setContrastWeightでもコールバックが呼ばれる", () => {
			let callCount = 0;

			slider.onWeightsChange(() => {
				callCount++;
			});

			slider.setContrastWeight(45);
			expect(callCount).toBe(1);
		});
	});

	describe("normalizeWeights (内部)", () => {
		test("合計100への正規化が正しく動作する", () => {
			// 合計120のケース
			slider.setWeights({ harmony: 60, cud: 30, contrast: 30 });
			const weights = slider.getWeights();

			// 正規化後の合計が100
			expect(weights.harmony + weights.cud + weights.contrast).toBe(100);

			// 比率が維持される（60:30:30 = 50:25:25）
			expect(weights.harmony).toBe(50);
			expect(weights.cud).toBe(25);
			expect(weights.contrast).toBe(25);
		});

		test("合計50への正規化も正しく動作する", () => {
			// 合計50のケース
			slider.setWeights({ harmony: 20, cud: 15, contrast: 15 });
			const weights = slider.getWeights();

			expect(weights.harmony + weights.cud + weights.contrast).toBe(100);
		});

		test("端数処理で合計が100になることを保証", () => {
			// 端数が発生しやすいケース
			slider.setWeights({ harmony: 33, cud: 33, contrast: 34 });
			const weights = slider.getWeights();

			expect(weights.harmony + weights.cud + weights.contrast).toBe(100);
		});
	});

	describe("resetToDefault", () => {
		test("デフォルト重みにリセットできる", () => {
			slider.setWeights({ harmony: 70, cud: 15, contrast: 15 });
			slider.resetToDefault();

			const weights = slider.getWeights();
			expect(weights.harmony).toBe(40);
			expect(weights.cud).toBe(30);
			expect(weights.contrast).toBe(30);
		});

		test("リセット時にコールバックが呼ばれる", () => {
			let callbackCalled = false;

			slider.onWeightsChange(() => {
				callbackCalled = true;
			});

			slider.setWeights({ harmony: 70, cud: 15, contrast: 15 });
			callbackCalled = false; // リセット前にフラグをクリア

			slider.resetToDefault();
			expect(callbackCalled).toBe(true);
		});
	});

	describe("render", () => {
		test("DOM環境がない場合でもエラーが発生しない", () => {
			expect(() => slider.render()).not.toThrow();
		});
	});

	describe("getWeightLabels", () => {
		test("各重みのラベルを取得できる", () => {
			const labels = slider.getWeightLabels();

			expect(labels.harmony.nameJa).toBe("ハーモニー");
			expect(labels.harmony.nameEn).toBe("Harmony");
			expect(labels.cud.nameJa).toBe("CUD");
			expect(labels.cud.nameEn).toBe("CUD");
			expect(labels.contrast.nameJa).toBe("コントラスト");
			expect(labels.contrast.nameEn).toBe("Contrast");
		});
	});
});

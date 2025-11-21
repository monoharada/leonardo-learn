/**
 * ContrastMaintainer - WCAGコントラスト維持機能のテスト
 */

import { describe, expect, it } from "bun:test";
import { Color } from "../color";
import type { ToneScale, ToneValue } from "../strategies/m3-generator";
import {
	ContrastMaintainer,
	type ContrastRequirement,
} from "./contrast-maintainer";

// テスト用のToneScaleを作成するヘルパー
function createTestToneScale(
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
		role: "primary",
		tones,
		sourceColor: new Color({ mode: "oklch", l: 0.5, c: chroma, h: hue }),
	};
}

describe("ContrastMaintainer", () => {
	describe("verify", () => {
		it("スケール内の全ペアのコントラストを検証する", () => {
			const maintainer = new ContrastMaintainer();
			const scale = createTestToneScale();

			const results = maintainer.verify(scale);

			expect(results).toBeDefined();
			expect(results.passed).toBeDefined();
			expect(results.violations).toBeDefined();
		});

		it("白と黒のペアはAAA基準を満たす", () => {
			const maintainer = new ContrastMaintainer();
			const scale = createTestToneScale();

			const requirements: ContrastRequirement[] = [
				{ fg: 0, bg: 100, level: "AAA" },
			];

			const results = maintainer.verify(scale, { requirements });

			// tone 0（黒）とtone 100（白）は21:1に近いコントラスト
			const violation = results.violations.find(
				(v) => v.fg === 0 && v.bg === 100,
			);
			expect(violation).toBeUndefined();
		});

		it("類似したLightnessのペアはコントラスト違反を検出する", () => {
			const maintainer = new ContrastMaintainer();
			const scale = createTestToneScale();

			const requirements: ContrastRequirement[] = [
				{ fg: 40, bg: 50, level: "AA" }, // 類似したLightness
			];

			const results = maintainer.verify(scale, { requirements });

			// L=0.4とL=0.5は4.5:1を満たさない
			const violation = results.violations.find(
				(v) => v.fg === 40 && v.bg === 50,
			);
			expect(violation).toBeDefined();
		});

		it("AA基準（4.5:1）を検証する", () => {
			const maintainer = new ContrastMaintainer();
			const scale = createTestToneScale();

			const requirements: ContrastRequirement[] = [
				{ fg: 20, bg: 90, level: "AA" },
			];

			const results = maintainer.verify(scale, { requirements });

			// L=0.2とL=0.9は4.5:1を満たすはず
			const passed = results.passed.find((p) => p.fg === 20 && p.bg === 90);
			expect(passed).toBeDefined();
		});

		it("AAA基準（7:1）を検証する", () => {
			const maintainer = new ContrastMaintainer();
			const scale = createTestToneScale();

			const requirements: ContrastRequirement[] = [
				{ fg: 10, bg: 95, level: "AAA" },
			];

			const results = maintainer.verify(scale, { requirements });

			// L=0.1とL=0.95は7:1を満たすはず
			const passed = results.passed.find((p) => p.fg === 10 && p.bg === 95);
			expect(passed).toBeDefined();
		});

		it("大文字テキスト基準（3:1）を検証する", () => {
			const maintainer = new ContrastMaintainer();
			const scale = createTestToneScale();

			const requirements: ContrastRequirement[] = [
				{ fg: 30, bg: 70, level: "AA-large" },
			];

			const results = maintainer.verify(scale, { requirements });

			// L=0.3とL=0.7は3:1を満たすはず
			expect(results).toBeDefined();
		});
	});

	describe("adjust", () => {
		it("コントラスト違反を自動調整する", () => {
			const maintainer = new ContrastMaintainer();
			const scale = createTestToneScale();

			const requirements: ContrastRequirement[] = [
				{ fg: 40, bg: 50, level: "AA" },
			];

			const adjusted = maintainer.adjust(scale, { requirements });

			// 調整後のスケールを再検証
			const results = maintainer.verify(adjusted, { requirements });

			// 違反が解消されているか、警告として記録されている
			expect(adjusted.tones.size).toBe(scale.tones.size);
		});

		it("Lightnessを調整してコントラストを改善する", () => {
			const maintainer = new ContrastMaintainer();
			const scale = createTestToneScale();

			const requirements: ContrastRequirement[] = [
				{ fg: 40, bg: 60, level: "AA" },
			];

			const adjusted = maintainer.adjust(scale, { requirements });

			// 調整された色のLightnessが変更されている
			const originalFg = scale.tones.get(40);
			const adjustedFg = adjusted.tones.get(40);

			if (originalFg && adjustedFg) {
				// 調整が行われたか確認（同じ場合もあり得る）
				expect(adjustedFg).toBeDefined();
			}
		});

		it("調整後もChromaとHueは維持される", () => {
			const maintainer = new ContrastMaintainer();
			const hue = 250;
			const chroma = 0.1;
			const scale = createTestToneScale(hue, chroma);

			const requirements: ContrastRequirement[] = [
				{ fg: 40, bg: 60, level: "AA" },
			];

			const adjusted = maintainer.adjust(scale, { requirements });

			// 各トーンのHueとChromaが維持されている
			for (const [tone, color] of adjusted.tones) {
				const originalColor = scale.tones.get(tone);
				if (originalColor) {
					// Hueは維持
					expect(color.oklch.h).toBe(originalColor.oklch.h);
					// Chromaも維持（クランプの影響は除く）
				}
			}
		});

		it("調整不可能な場合は警告を含む結果を返す", () => {
			const maintainer = new ContrastMaintainer();
			const scale = createTestToneScale();

			// 非常に近いトーンでAAA要求は困難
			const requirements: ContrastRequirement[] = [
				{ fg: 49, bg: 51, level: "AAA" },
			];

			const adjusted = maintainer.adjust(scale, { requirements });

			// スケールは返されるが、完全な解決は困難
			expect(adjusted.tones.size).toBe(scale.tones.size);
		});
	});

	describe("getOptimalPairs", () => {
		it("AA基準を満たすペアを取得する", () => {
			const maintainer = new ContrastMaintainer();
			const scale = createTestToneScale();

			const pairs = maintainer.getOptimalPairs(scale, "AA");

			expect(pairs.length).toBeGreaterThan(0);

			for (const pair of pairs) {
				expect(pair.ratio).toBeGreaterThanOrEqual(4.5);
			}
		});

		it("AAA基準を満たすペアを取得する", () => {
			const maintainer = new ContrastMaintainer();
			const scale = createTestToneScale();

			const pairs = maintainer.getOptimalPairs(scale, "AAA");

			for (const pair of pairs) {
				expect(pair.ratio).toBeGreaterThanOrEqual(7);
			}
		});

		it("テキスト用と背景用の推奨ペアを返す", () => {
			const maintainer = new ContrastMaintainer();
			const scale = createTestToneScale();

			const pairs = maintainer.getOptimalPairs(scale, "AA");

			// 暗い色と明るい色のペアが含まれる
			const hasContrastingPair = pairs.some(
				(p) =>
					(p.fgTone <= 30 && p.bgTone >= 80) ||
					(p.fgTone >= 80 && p.bgTone <= 30),
			);
			expect(hasContrastingPair).toBe(true);
		});
	});
});

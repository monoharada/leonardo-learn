/**
 * ScalePreview - スケールプレビューのテスト
 */

import { describe, expect, it } from "bun:test";
import { Color } from "../color";
import type { ToneScale, ToneValue } from "../strategies/m3-generator";
import {
	generateMultiScalePreview,
	generateScalePreview,
	getShadeDetails,
} from "./scale-preview";

// テスト用のToneScaleを作成するヘルパー
function createTestToneScale(role = "primary"): ToneScale {
	const tones = new Map<ToneValue, Color>();
	const toneValues: ToneValue[] = [
		0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100,
	];

	for (const tone of toneValues) {
		const lightness = tone / 100;
		tones.set(
			tone,
			new Color({ mode: "oklch", l: lightness, c: 0.15, h: 250 }),
		);
	}

	return {
		role,
		tones,
		sourceColor: new Color({ mode: "oklch", l: 0.5, c: 0.15, h: 250 }),
	};
}

describe("ScalePreview", () => {
	describe("generateScalePreview", () => {
		it("スケールプレビューを生成する", () => {
			const scale = createTestToneScale();
			const preview = generateScalePreview(scale);

			expect(preview.role).toBe("primary");
			expect(preview.sourceColor).toBeDefined();
			expect(preview.shades).toHaveLength(13);
		});

		it("各シェードにWCAG準拠レベルを含む", () => {
			const scale = createTestToneScale();
			const preview = generateScalePreview(scale);

			for (const shade of preview.shades) {
				expect(shade.wcagOnWhite).toBeDefined();
				expect(shade.wcagOnBlack).toBeDefined();
				expect(["AAA", "AA", "AA-Large", "Fail"]).toContain(shade.wcagOnWhite);
				expect(["AAA", "AA", "AA-Large", "Fail"]).toContain(shade.wcagOnBlack);
			}
		});

		it("各シェードにOKLCH値を含む", () => {
			const scale = createTestToneScale();
			const preview = generateScalePreview(scale);

			for (const shade of preview.shades) {
				expect(shade.oklch.l).toBeDefined();
				expect(shade.oklch.c).toBeDefined();
				expect(shade.oklch.h).toBeDefined();
			}
		});

		it("各シェードにhex値を含む", () => {
			const scale = createTestToneScale();
			const preview = generateScalePreview(scale);

			for (const shade of preview.shades) {
				expect(shade.hex).toMatch(/^#[0-9a-f]{6}$/i);
			}
		});

		it("各シェードにコントラスト比を含む", () => {
			const scale = createTestToneScale();
			const preview = generateScalePreview(scale);

			for (const shade of preview.shades) {
				expect(shade.contrastWithWhite).toBeGreaterThan(0);
				expect(shade.contrastWithBlack).toBeGreaterThan(0);
			}
		});

		it("各シェードに推奨用途を含む", () => {
			const scale = createTestToneScale();
			const preview = generateScalePreview(scale);

			for (const shade of preview.shades) {
				expect(shade.primaryUsage).toBeDefined();
			}
		});

		it("暗いシェードは白背景で高いWCAGレベルを持つ", () => {
			const scale = createTestToneScale();
			const preview = generateScalePreview(scale);

			const darkShades = preview.shades.filter((s) => s.tone <= 20);
			for (const shade of darkShades) {
				expect(["AAA", "AA"]).toContain(shade.wcagOnWhite);
			}
		});

		it("明るいシェードは黒背景で高いWCAGレベルを持つ", () => {
			const scale = createTestToneScale();
			const preview = generateScalePreview(scale);

			const lightShades = preview.shades.filter((s) => s.tone >= 90);
			for (const shade of lightShades) {
				expect(["AAA", "AA"]).toContain(shade.wcagOnBlack);
			}
		});

		it("アクセシビリティ警告を含む", () => {
			const scale = createTestToneScale();
			const preview = generateScalePreview(scale);

			expect(preview.warnings).toBeDefined();
			expect(Array.isArray(preview.warnings)).toBe(true);
		});
	});

	describe("generateMultiScalePreview", () => {
		it("複数スケールのプレビューを生成する", () => {
			const scales = {
				primary: createTestToneScale("primary"),
				secondary: createTestToneScale("secondary"),
			};

			const previews = generateMultiScalePreview(scales);

			expect(previews).toHaveLength(2);
			expect(previews[0].role).toBeDefined();
			expect(previews[1].role).toBeDefined();
		});

		it("各スケールが正しいシェード数を持つ", () => {
			const scales = {
				primary: createTestToneScale("primary"),
				error: createTestToneScale("error"),
			};

			const previews = generateMultiScalePreview(scales);

			for (const preview of previews) {
				expect(preview.shades).toHaveLength(13);
			}
		});
	});

	describe("getShadeDetails", () => {
		it("シェードの詳細情報を文字列で返す", () => {
			const scale = createTestToneScale();
			const preview = generateScalePreview(scale);
			const shade = preview.shades[0];

			const details = getShadeDetails(shade);

			expect(details).toContain("トーン:");
			expect(details).toContain("Hex:");
			expect(details).toContain("OKLCH:");
			expect(details).toContain("白背景コントラスト:");
			expect(details).toContain("黒背景コントラスト:");
			expect(details).toContain("推奨用途:");
		});

		it("WCAGレベルを含む", () => {
			const scale = createTestToneScale();
			const preview = generateScalePreview(scale);
			const shade = preview.shades[0];

			const details = getShadeDetails(shade);

			// AAA, AA, AA-Large, Failのいずれかを含む
			expect(
				details.includes("AAA") ||
					details.includes("AA") ||
					details.includes("Fail"),
			).toBe(true);
		});
	});
});

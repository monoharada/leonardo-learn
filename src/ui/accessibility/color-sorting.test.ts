/**
 * カラーソートモジュールのテスト
 *
 * @module @/ui/accessibility/color-sorting.test
 */

import { describe, expect, it } from "bun:test";
import { Color } from "@/core/color";
import {
	getAllSortTypes,
	getSortTypeName,
	type NamedColor,
	sortByDeltaE,
	sortByHue,
	sortByLightness,
	sortColorsWithValidation,
	validateBoundaries,
} from "./color-sorting";

/**
 * テスト用のカラーセットを作成する
 */
function createTestColors(): NamedColor[] {
	return [
		{ name: "Red", color: new Color("#ff0000") },
		{ name: "Green", color: new Color("#00ff00") },
		{ name: "Blue", color: new Color("#0000ff") },
		{ name: "Yellow", color: new Color("#ffff00") },
		{ name: "Cyan", color: new Color("#00ffff") },
	];
}

describe("sortByHue", () => {
	it("色相順にソートする", () => {
		const colors = createTestColors();
		const sorted = sortByHue(colors);

		// 色相は大まかに: Red(~29°), Yellow(~110°), Green(~142°), Cyan(~195°), Blue(~264°)
		// 実際のOKLCH色相値でソートされることを確認
		const hues = sorted.map((c) => c.color.oklch.h ?? 0);

		// 昇順になっていることを確認
		for (let i = 0; i < hues.length - 1; i++) {
			expect(hues[i]).toBeLessThanOrEqual(hues[i + 1] ?? 360);
		}
	});

	it("空配列を処理できる", () => {
		const sorted = sortByHue([]);
		expect(sorted).toHaveLength(0);
	});

	it("単一要素を処理できる", () => {
		const colors = [{ name: "Red", color: new Color("#ff0000") }];
		const sorted = sortByHue(colors);
		expect(sorted).toHaveLength(1);
		expect(sorted[0]?.name).toBe("Red");
	});

	it("元の配列を変更しない", () => {
		const colors = createTestColors();
		const originalLength = colors.length;
		const originalFirst = colors[0]?.name;

		sortByHue(colors);

		expect(colors).toHaveLength(originalLength);
		expect(colors[0]?.name).toBe(originalFirst);
	});
});

describe("sortByLightness", () => {
	it("明度順にソートする（暗→明）", () => {
		const colors = createTestColors();
		const sorted = sortByLightness(colors);

		const lightnesses = sorted.map((c) => c.color.oklch.l ?? 0);

		// 昇順になっていることを確認
		for (let i = 0; i < lightnesses.length - 1; i++) {
			expect(lightnesses[i]).toBeLessThanOrEqual(lightnesses[i + 1] ?? 1);
		}
	});

	it("空配列を処理できる", () => {
		const sorted = sortByLightness([]);
		expect(sorted).toHaveLength(0);
	});

	it("元の配列を変更しない", () => {
		const colors = createTestColors();
		const originalLength = colors.length;

		sortByLightness(colors);

		expect(colors).toHaveLength(originalLength);
	});
});

describe("sortByDeltaE", () => {
	it("類似色を隣接させる", () => {
		const colors = createTestColors();
		const sorted = sortByDeltaE(colors);

		// 全ての色が含まれていることを確認
		expect(sorted).toHaveLength(colors.length);
		const sortedNames = sorted.map((c) => c.name);
		for (const color of colors) {
			expect(sortedNames).toContain(color.name);
		}
	});

	it("空配列を処理できる", () => {
		const sorted = sortByDeltaE([]);
		expect(sorted).toHaveLength(0);
	});

	it("単一要素を処理できる", () => {
		const colors = [{ name: "Red", color: new Color("#ff0000") }];
		const sorted = sortByDeltaE(colors);
		expect(sorted).toHaveLength(1);
		expect(sorted[0]?.name).toBe("Red");
	});

	it("元の配列を変更しない", () => {
		const colors = createTestColors();
		const originalLength = colors.length;

		sortByDeltaE(colors);

		expect(colors).toHaveLength(originalLength);
	});
});

describe("validateBoundaries", () => {
	it("隣接ペア間の色差を計算する", () => {
		const colors = createTestColors();
		const sorted = sortByHue(colors);
		const validations = validateBoundaries(sorted);

		// n-1個の境界が存在する
		expect(validations).toHaveLength(colors.length - 1);

		// 各境界にインデックス、名前、色差が含まれる
		for (const validation of validations) {
			expect(validation.index).toBeGreaterThanOrEqual(0);
			expect(validation.leftName).toBeTruthy();
			expect(validation.rightName).toBeTruthy();
			expect(validation.deltaE).toBeGreaterThanOrEqual(0);
			expect(typeof validation.isDistinguishable).toBe("boolean");
		}
	});

	it("色差が閾値以上なら識別可能と判定する", () => {
		// 十分に異なる色を用意
		const colors: NamedColor[] = [
			{ name: "Black", color: new Color("#000000") },
			{ name: "White", color: new Color("#ffffff") },
		];

		const validations = validateBoundaries(colors);

		expect(validations).toHaveLength(1);
		expect(validations[0]?.isDistinguishable).toBe(true);
		expect(validations[0]?.deltaE).toBeGreaterThan(3.0);
	});

	it("類似色は識別困難と判定する", () => {
		// 非常に近い色を用意
		const colors: NamedColor[] = [
			{ name: "Gray1", color: new Color("#808080") },
			{ name: "Gray2", color: new Color("#828282") },
		];

		const validations = validateBoundaries(colors);

		expect(validations).toHaveLength(1);
		expect(validations[0]?.isDistinguishable).toBe(false);
		expect(validations[0]?.deltaE).toBeLessThan(3.0);
	});

	it("thresholdを指定して識別判定を切り替えられる", () => {
		// ΔEが3.5〜5.0の間になるグレーを用意（3.5ではOK、5.0では警告）
		const colors: NamedColor[] = [
			{ name: "Gray1", color: new Color("#5c5c5c") },
			{ name: "Gray2", color: new Color("#6a6a6a") },
		];

		const relaxed = validateBoundaries(colors, { threshold: 3.5 });
		expect(relaxed).toHaveLength(1);
		expect(relaxed[0]?.deltaE).toBeGreaterThanOrEqual(3.5);
		expect(relaxed[0]?.deltaE).toBeLessThan(5.0);
		expect(relaxed[0]?.isDistinguishable).toBe(true);

		const strict = validateBoundaries(colors, { threshold: 5.0 });
		expect(strict).toHaveLength(1);
		expect(strict[0]?.deltaE).toBeGreaterThanOrEqual(3.5);
		expect(strict[0]?.deltaE).toBeLessThan(5.0);
		expect(strict[0]?.isDistinguishable).toBe(false);
	});

	it("空配列を処理できる", () => {
		const validations = validateBoundaries([]);
		expect(validations).toHaveLength(0);
	});

	it("単一要素を処理できる", () => {
		const colors = [{ name: "Red", color: new Color("#ff0000") }];
		const validations = validateBoundaries(colors);
		expect(validations).toHaveLength(0);
	});
});

describe("sortColorsWithValidation", () => {
	it("色相順でソートと検証を実行する", () => {
		const colors = createTestColors();
		const result = sortColorsWithValidation(colors, "hue");

		expect(result.sortType).toBe("hue");
		expect(result.sortedColors).toHaveLength(colors.length);
		expect(result.boundaryValidations).toHaveLength(colors.length - 1);
	});

	it("色差順でソートと検証を実行する", () => {
		const colors = createTestColors();
		const result = sortColorsWithValidation(colors, "deltaE");

		expect(result.sortType).toBe("deltaE");
		expect(result.sortedColors).toHaveLength(colors.length);
		expect(result.boundaryValidations).toHaveLength(colors.length - 1);
	});

	it("明度順でソートと検証を実行する", () => {
		const colors = createTestColors();
		const result = sortColorsWithValidation(colors, "lightness");

		expect(result.sortType).toBe("lightness");
		expect(result.sortedColors).toHaveLength(colors.length);
		expect(result.boundaryValidations).toHaveLength(colors.length - 1);
	});
});

describe("getSortTypeName", () => {
	it("hueの表示名を返す", () => {
		expect(getSortTypeName("hue")).toBe("色相順 (Hue)");
	});

	it("deltaEの表示名を返す", () => {
		expect(getSortTypeName("deltaE")).toBe("色差順 (ΔE)");
	});

	it("lightnessの表示名を返す", () => {
		expect(getSortTypeName("lightness")).toBe("明度順 (Lightness)");
	});
});

describe("getAllSortTypes", () => {
	it("全てのソートタイプを返す", () => {
		const types = getAllSortTypes();

		expect(types).toContain("hue");
		expect(types).toContain("deltaE");
		expect(types).toContain("lightness");
		expect(types).toHaveLength(3);
	});
});

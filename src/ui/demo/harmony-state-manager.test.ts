/**
 * ハーモニー状態管理のテスト
 *
 * TDD Phase 1: 🔴 Red - テストを先に書く
 *
 * @module @/ui/demo/harmony-state-manager.test
 */

import { beforeEach, describe, expect, it } from "bun:test";
import type { HarmonyFilterType } from "@/core/accent/harmony-filter-calculator";

// テスト対象のモジュールをインポート（まだ存在しない）
import {
	ALL_HARMONY_TYPES,
	createHarmonyStateManager,
	getRandomHarmonyType,
	type HarmonyPreviewData,
	type HarmonyStateManager,
} from "./harmony-state-manager";

describe("HarmonyStateManager", () => {
	let manager: HarmonyStateManager;

	beforeEach(() => {
		manager = createHarmonyStateManager();
	});

	describe("初期状態", () => {
		it("初期状態でselectedHarmonyTypeはnull", () => {
			expect(manager.getSelectedHarmonyType()).toBeNull();
		});

		it("初期状態でhasUserSelectedHarmonyはfalse", () => {
			expect(manager.hasUserSelectedHarmony()).toBe(false);
		});

		it("初期状態でharmonyPreviewsは空のMap", () => {
			expect(manager.getHarmonyPreviews().size).toBe(0);
		});
	});

	describe("getRandomHarmonyType", () => {
		it("8種類のハーモニータイプのいずれかを返す", () => {
			const result = getRandomHarmonyType();
			expect(ALL_HARMONY_TYPES).toContain(result);
		});

		it("複数回呼び出すと異なる値を返すことがある（ランダム性確認）", () => {
			const results = new Set<HarmonyFilterType>();
			// 100回試行して、少なくとも2種類以上の結果が出ることを確認
			for (let i = 0; i < 100; i++) {
				results.add(getRandomHarmonyType());
			}
			expect(results.size).toBeGreaterThanOrEqual(2);
		});
	});

	describe("selectHarmony", () => {
		it("selectHarmony()でselectedHarmonyTypeが更新される", () => {
			manager.selectHarmony("triadic");
			expect(manager.getSelectedHarmonyType()).toBe("triadic");
		});

		it("selectHarmony()でhasUserSelectedHarmonyがtrueになる", () => {
			expect(manager.hasUserSelectedHarmony()).toBe(false);
			manager.selectHarmony("complementary");
			expect(manager.hasUserSelectedHarmony()).toBe(true);
		});

		it("ユーザー選択後は同じハーモニーが優先される", () => {
			manager.selectHarmony("analogous");
			expect(manager.getSelectedHarmonyType()).toBe("analogous");

			// getOrSelectHarmonyを呼んでも、ユーザー選択済みなら同じ値
			const result = manager.getOrSelectHarmony();
			expect(result).toBe("analogous");
		});
	});

	describe("getOrSelectHarmony", () => {
		it("未選択時はランダムにハーモニーを選択する", () => {
			const result = manager.getOrSelectHarmony();
			expect(ALL_HARMONY_TYPES).toContain(result);
		});

		it("未選択時に呼び出してもhasUserSelectedHarmonyはfalseのまま", () => {
			manager.getOrSelectHarmony();
			expect(manager.hasUserSelectedHarmony()).toBe(false);
		});

		it("選択済みの場合は同じ値を返す", () => {
			manager.selectHarmony("split-complementary");
			const result1 = manager.getOrSelectHarmony();
			const result2 = manager.getOrSelectHarmony();
			expect(result1).toBe("split-complementary");
			expect(result2).toBe("split-complementary");
		});
	});

	describe("setHarmonyPreviews", () => {
		it("harmonyPreviewsにブランドカラー変更時に全8種類が格納される", () => {
			const previews: HarmonyPreviewData = {
				complementary: ["#0066cc", "#cc6600"],
				triadic: ["#0066cc", "#cc0066", "#66cc00"],
				analogous: ["#0066cc", "#0033cc", "#0099cc"],
				"split-complementary": ["#0066cc", "#cc3300", "#cc9900"],
				monochromatic: ["#0066cc", "#004499", "#0088ee"],
				shades: ["#0066cc", "#003366", "#0099ff"],
				compound: ["#0066cc", "#cc6600", "#00cc66"],
				square: ["#0066cc", "#66cc00", "#cc0066", "#00cc66"],
			};

			manager.setHarmonyPreviews(previews);

			expect(manager.getHarmonyPreviews().size).toBe(8);
			expect(manager.getHarmonyPreviews().get("complementary")).toEqual([
				"#0066cc",
				"#cc6600",
			]);
		});

		it("getPreviewColors()で特定ハーモニーのプレビュー色を取得できる", () => {
			const previews: HarmonyPreviewData = {
				complementary: ["#ff0000", "#00ffff"],
				triadic: ["#ff0000", "#00ff00", "#0000ff"],
				analogous: [],
				"split-complementary": [],
				monochromatic: [],
				shades: [],
				compound: [],
				square: [],
			};

			manager.setHarmonyPreviews(previews);

			expect(manager.getPreviewColors("complementary")).toEqual([
				"#ff0000",
				"#00ffff",
			]);
			expect(manager.getPreviewColors("triadic")).toEqual([
				"#ff0000",
				"#00ff00",
				"#0000ff",
			]);
			expect(manager.getPreviewColors("analogous")).toEqual([]);
		});

		it("存在しないハーモニータイプのプレビューはundefinedを返す", () => {
			expect(
				manager.getPreviewColors("complementary" as HarmonyFilterType),
			).toBeUndefined();
		});
	});

	describe("reset", () => {
		it("reset()で初期状態に戻る", () => {
			manager.selectHarmony("triadic");
			manager.setHarmonyPreviews({
				complementary: ["#000"],
				triadic: [],
				analogous: [],
				"split-complementary": [],
				monochromatic: [],
				shades: [],
				compound: [],
				square: [],
			});

			manager.reset();

			expect(manager.getSelectedHarmonyType()).toBeNull();
			expect(manager.hasUserSelectedHarmony()).toBe(false);
			expect(manager.getHarmonyPreviews().size).toBe(0);
		});
	});
});

describe("ALL_HARMONY_TYPES", () => {
	it("8種類のハーモニータイプを含む", () => {
		expect(ALL_HARMONY_TYPES).toHaveLength(8);
	});

	it("必要なすべてのハーモニータイプを含む", () => {
		const expected: HarmonyFilterType[] = [
			"complementary",
			"triadic",
			"analogous",
			"split-complementary",
			"monochromatic",
			"shades",
			"compound",
			"square",
		];
		expect(ALL_HARMONY_TYPES).toEqual(expect.arrayContaining(expected));
	});
});

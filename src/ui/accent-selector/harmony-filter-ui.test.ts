/**
 * HarmonyFilterUI Tests
 *
 * Task 4.4: HarmonyFilter UI の実装
 * Requirements: 3.1, 2.3
 */

import { beforeEach, describe, expect, test } from "bun:test";
import type { HarmonyFilterType } from "../../core/accent/harmony-filter-calculator";
import {
	type HarmonyFilterChangeCallback,
	HarmonyFilterUI,
} from "./harmony-filter-ui";

describe("HarmonyFilterUI", () => {
	let filter: HarmonyFilterUI;

	// モックコンテナ（DOM環境非依存のテスト用）
	const mockContainer = {
		querySelector: () => null,
		appendChild: () => {},
	} as unknown as HTMLElement;

	beforeEach(() => {
		filter = new HarmonyFilterUI(mockContainer);
	});

	describe("constructor", () => {
		test("初期値は 'all' が選択されている", () => {
			expect(filter.getSelectedType()).toBe("all");
		});
	});

	describe("getSelectedType", () => {
		test("現在選択されているハーモニータイプを返す", () => {
			expect(filter.getSelectedType()).toBe("all");
		});
	});

	describe("setSelectedType", () => {
		test("ハーモニータイプを設定できる", () => {
			filter.setSelectedType("complementary");
			expect(filter.getSelectedType()).toBe("complementary");
		});

		test("triadic を設定できる", () => {
			filter.setSelectedType("triadic");
			expect(filter.getSelectedType()).toBe("triadic");
		});

		test("analogous を設定できる", () => {
			filter.setSelectedType("analogous");
			expect(filter.getSelectedType()).toBe("analogous");
		});

		test("split-complementary を設定できる", () => {
			filter.setSelectedType("split-complementary");
			expect(filter.getSelectedType()).toBe("split-complementary");
		});

		test("all に戻せる", () => {
			filter.setSelectedType("complementary");
			filter.setSelectedType("all");
			expect(filter.getSelectedType()).toBe("all");
		});
	});

	describe("onFilterChange", () => {
		test("フィルタ変更時にコールバックが呼ばれる", () => {
			let callbackCalled = false;
			let callbackType: HarmonyFilterType | null = null;

			filter.onFilterChange((type) => {
				callbackCalled = true;
				callbackType = type;
			});

			filter.setSelectedType("triadic");

			expect(callbackCalled).toBe(true);
			expect(callbackType).toBe("triadic");
		});

		test("コールバックなしでも設定は機能する", () => {
			// コールバックなしで設定してもエラーが発生しない
			filter.setSelectedType("analogous");
			expect(filter.getSelectedType()).toBe("analogous");
		});

		test("同じ値への変更でもコールバックが呼ばれる", () => {
			let callCount = 0;

			filter.onFilterChange(() => {
				callCount++;
			});

			filter.setSelectedType("all");
			filter.setSelectedType("all");

			expect(callCount).toBe(2);
		});
	});

	describe("getHarmonyTypeOptions", () => {
		test("全てのハーモニータイプオプションを返す", () => {
			const options = filter.getHarmonyTypeOptions();

			expect(options.length).toBe(5);

			// 各オプションが正しい形式を持つことを確認
			for (const option of options) {
				expect(option).toHaveProperty("id");
				expect(option).toHaveProperty("nameJa");
				expect(option).toHaveProperty("nameEn");
			}
		});

		test("オプションに 'all' が含まれる", () => {
			const options = filter.getHarmonyTypeOptions();
			const allOption = options.find((o) => o.id === "all");
			expect(allOption).toBeDefined();
			expect(allOption?.nameJa).toBe("すべて");
		});

		test("オプションに 'complementary' が含まれる", () => {
			const options = filter.getHarmonyTypeOptions();
			const option = options.find((o) => o.id === "complementary");
			expect(option).toBeDefined();
			expect(option?.nameJa).toBe("補色");
		});

		test("オプションに 'triadic' が含まれる", () => {
			const options = filter.getHarmonyTypeOptions();
			const option = options.find((o) => o.id === "triadic");
			expect(option).toBeDefined();
			expect(option?.nameJa).toBe("トライアド");
		});

		test("オプションに 'analogous' が含まれる", () => {
			const options = filter.getHarmonyTypeOptions();
			const option = options.find((o) => o.id === "analogous");
			expect(option).toBeDefined();
			expect(option?.nameJa).toBe("類似色");
		});

		test("オプションに 'split-complementary' が含まれる", () => {
			const options = filter.getHarmonyTypeOptions();
			const option = options.find((o) => o.id === "split-complementary");
			expect(option).toBeDefined();
			expect(option?.nameJa).toBe("分裂補色");
		});
	});

	describe("render", () => {
		test("DOM環境がない場合でもエラーが発生しない", () => {
			// renderメソッドはDOM環境がない場合は何もしない
			expect(() => filter.render()).not.toThrow();
		});
	});
});

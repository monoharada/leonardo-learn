/**
 * ManualAccentSelector Tests
 *
 * Task 5.1: ManualAccentSelector の実装テスト
 * Requirements: 5.1, 5.2, 5.3, 7.2
 *
 * テスト対象:
 * - 手動選択パネルの開閉制御
 * - カテゴリタブ表示（Chromatic/Neutral/Semantic の3種）
 * - Chromaticカテゴリでの色相タブ表示
 * - Neutral/Semanticカテゴリでのトークン一覧表示
 * - トークン選択時のプレビューとスコア自動計算
 * - 選択したトークンの追加機能
 * - エラー時はスコア非表示で色選択のみ許可
 */

import { beforeEach, describe, expect, test } from "bun:test";
import type { BalanceScoreResult } from "../../core/accent/balance-score-calculator";
import type { DadsToken } from "../../core/tokens/types";

// Mock loadDadsTokens before importing ManualAccentSelector
const mockTokens: DadsToken[] = [
	// Chromatic tokens (blue 500, 600)
	{
		id: "dads-blue-500",
		hex: "#0056FF",
		nameJa: "青 500",
		nameEn: "Blue 500",
		classification: { category: "chromatic", hue: "blue", scale: 500 },
		source: "dads",
	},
	{
		id: "dads-blue-600",
		hex: "#0044CC",
		nameJa: "青 600",
		nameEn: "Blue 600",
		classification: { category: "chromatic", hue: "blue", scale: 600 },
		source: "dads",
	},
	// Neutral tokens (gray)
	{
		id: "dads-gray-500",
		hex: "#808080",
		nameJa: "グレー 500",
		nameEn: "Gray 500",
		classification: { category: "neutral", scale: 500 },
		source: "dads",
	},
	{
		id: "dads-gray-600",
		hex: "#666666",
		nameJa: "グレー 600",
		nameEn: "Gray 600",
		classification: { category: "neutral", scale: 600 },
		source: "dads",
	},
	// Semantic tokens
	{
		id: "dads-success-500",
		hex: "#00AA00",
		nameJa: "成功 500",
		nameEn: "Success 500",
		classification: { category: "semantic", scale: 500 },
		source: "dads",
	},
	{
		id: "dads-error-500",
		hex: "#FF0000",
		nameJa: "エラー 500",
		nameEn: "Error 500",
		classification: { category: "semantic", scale: 500 },
		source: "dads",
	},
];

// Import after setting up mocks
import {
	groupTokensByCategory,
	ManualAccentSelector,
} from "./manual-accent-selector";

describe("ManualAccentSelector", () => {
	describe("groupTokensByCategory", () => {
		test("should group tokens by category correctly", () => {
			const grouped = groupTokensByCategory(mockTokens);

			expect(grouped.chromatic).toHaveLength(2);
			expect(grouped.neutral).toHaveLength(2);
			expect(grouped.semantic).toHaveLength(2);
		});

		test("should filter chromatic tokens correctly", () => {
			const grouped = groupTokensByCategory(mockTokens);

			expect(
				grouped.chromatic.every(
					(t) => t.classification.category === "chromatic",
				),
			).toBe(true);
		});

		test("should filter neutral tokens correctly", () => {
			const grouped = groupTokensByCategory(mockTokens);

			expect(
				grouped.neutral.every((t) => t.classification.category === "neutral"),
			).toBe(true);
		});

		test("should filter semantic tokens correctly", () => {
			const grouped = groupTokensByCategory(mockTokens);

			expect(
				grouped.semantic.every((t) => t.classification.category === "semantic"),
			).toBe(true);
		});
	});

	describe("State Management", () => {
		let selector: ManualAccentSelector;

		beforeEach(() => {
			// Create mock container
			const container = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			selector = new ManualAccentSelector(container);
		});

		test("should initialize with default state", () => {
			const state = selector.getState();

			expect(state.isOpen).toBe(false);
			expect(state.selectedCategory).toBe("chromatic");
			expect(state.selectedHue).toBe(null);
			expect(state.selectedToken).toBe(null);
			expect(state.calculatedScore).toBe(null);
			expect(state.isLoading).toBe(false);
		});

		test("should update category selection", () => {
			selector.selectCategory("neutral");

			expect(selector.getState().selectedCategory).toBe("neutral");
			expect(selector.getState().selectedHue).toBe(null);
		});

		test("should update hue selection for chromatic category", () => {
			selector.selectCategory("chromatic");
			selector.selectHue("blue");

			expect(selector.getState().selectedHue).toBe("blue");
		});

		test("should clear hue when switching to non-chromatic category", () => {
			selector.selectCategory("chromatic");
			selector.selectHue("blue");
			selector.selectCategory("neutral");

			expect(selector.getState().selectedHue).toBe(null);
		});

		test("should set brand color", () => {
			selector.setBrandColor("#FF0000");

			expect(selector.getState().brandColorHex).toBe("#FF0000");
		});

		test("should track open/close state", () => {
			expect(selector.getState().isOpen).toBe(false);

			selector.setIsOpen(true);
			expect(selector.getState().isOpen).toBe(true);

			selector.setIsOpen(false);
			expect(selector.getState().isOpen).toBe(false);
		});
	});

	describe("Token Selection", () => {
		let selector: ManualAccentSelector;

		beforeEach(() => {
			const container = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			selector = new ManualAccentSelector(container);
			selector.setBrandColor("#0056FF");
		});

		test("should select token and update state", () => {
			const token = mockTokens[0];
			selector.selectToken(token);

			expect(selector.getState().selectedToken).toEqual(token);
		});

		test("should clear calculated score when no brand color is set", () => {
			const selectorNoBrand = new ManualAccentSelector({
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement);

			const token = mockTokens[0];
			selectorNoBrand.selectToken(token);

			// Score should be null when no brand color
			expect(selectorNoBrand.getState().calculatedScore).toBe(null);
		});
	});

	describe("Tokens Filtering", () => {
		let selector: ManualAccentSelector;

		beforeEach(() => {
			const container = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			selector = new ManualAccentSelector(container);
			selector.setTokensForTesting(mockTokens);
		});

		test("should get chromatic tokens when chromatic category selected", () => {
			selector.selectCategory("chromatic");
			const tokens = selector.getCurrentCategoryTokens();

			expect(
				tokens.every((t) => t.classification.category === "chromatic"),
			).toBe(true);
		});

		test("should get neutral tokens when neutral category selected", () => {
			selector.selectCategory("neutral");
			const tokens = selector.getCurrentCategoryTokens();

			expect(tokens.every((t) => t.classification.category === "neutral")).toBe(
				true,
			);
		});

		test("should get semantic tokens when semantic category selected", () => {
			selector.selectCategory("semantic");
			const tokens = selector.getCurrentCategoryTokens();

			expect(
				tokens.every((t) => t.classification.category === "semantic"),
			).toBe(true);
		});

		test("should filter chromatic tokens by hue when hue is selected", () => {
			selector.selectCategory("chromatic");
			selector.selectHue("blue");
			const tokens = selector.getCurrentCategoryTokens();

			expect(tokens.every((t) => t.classification.hue === "blue")).toBe(true);
		});
	});

	describe("Error State Handling", () => {
		let selector: ManualAccentSelector;

		beforeEach(() => {
			const container = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			selector = new ManualAccentSelector(container);
		});

		test("should track error state for auto selection disabled", () => {
			selector.setAutoSelectionDisabled(true);

			expect(selector.getState().autoSelectionDisabled).toBe(true);
		});

		test("should allow token selection when auto selection is disabled", () => {
			selector.setAutoSelectionDisabled(true);
			selector.setTokensForTesting(mockTokens);

			const token = mockTokens[0];
			selector.selectToken(token);

			// Token selection should still work
			expect(selector.getState().selectedToken).toEqual(token);
		});

		test("should hide score when auto selection is disabled", () => {
			selector.setAutoSelectionDisabled(true);
			selector.setBrandColor("#FF0000");
			selector.setTokensForTesting(mockTokens);

			const token = mockTokens[0];
			selector.selectToken(token);

			// Score should not be calculated when auto selection is disabled
			expect(selector.getState().calculatedScore).toBe(null);
		});
	});

	describe("Add Selected Token", () => {
		let selector: ManualAccentSelector;
		let addedCandidate: {
			token: DadsToken;
			score: BalanceScoreResult | null;
		} | null = null;

		beforeEach(() => {
			const container = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			selector = new ManualAccentSelector(container);
			selector.setTokensForTesting(mockTokens);
			selector.setBrandColor("#FF0000");

			addedCandidate = null;
			selector.onAddAccent((token, score) => {
				addedCandidate = { token, score };
			});
		});

		test("should call callback when adding selected token", () => {
			const token = mockTokens[0];
			selector.selectToken(token);
			selector.addSelectedAccent();

			expect(addedCandidate).not.toBe(null);
			expect(addedCandidate?.token).toEqual(token);
		});

		test("should not call callback when no token is selected", () => {
			selector.addSelectedAccent();

			expect(addedCandidate).toBe(null);
		});

		test("should clear selection after adding", () => {
			const token = mockTokens[0];
			selector.selectToken(token);
			selector.addSelectedAccent();

			expect(selector.getState().selectedToken).toBe(null);
		});
	});

	describe("Available Hues", () => {
		let selector: ManualAccentSelector;

		beforeEach(() => {
			const container = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			selector = new ManualAccentSelector(container);
			selector.setTokensForTesting(mockTokens);
		});

		test("should return available hues from chromatic tokens", () => {
			const hues = selector.getAvailableHues();

			expect(hues).toContain("blue");
		});

		test("should return unique hues only", () => {
			const hues = selector.getAvailableHues();
			const uniqueHues = [...new Set(hues)];

			expect(hues).toEqual(uniqueHues);
		});
	});
});

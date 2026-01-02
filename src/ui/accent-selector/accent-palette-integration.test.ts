/**
 * AccentPaletteIntegration テスト
 *
 * Task 4.3: 候補選択とパレット連携の実装
 * Requirements: 4.3, 4.4
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポート、依存関係、ロジックの確認を行う。
 */

import { beforeEach, describe, expect, it } from "bun:test";
import type { ScoredCandidate } from "../../core/accent/accent-candidate-service";
import type { BalanceScoreResult } from "../../core/accent/balance-score-calculator";

describe("AccentPaletteIntegration module", () => {
	describe("exports", () => {
		it("should export SelectedAccent type", async () => {
			const module = await import("./accent-palette-integration");
			expect(module).toBeDefined();
		});

		it("should export AccentPaletteIntegration class", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			expect(AccentPaletteIntegration).toBeDefined();
			expect(typeof AccentPaletteIntegration).toBe("function");
		});
	});

	describe("module loading", () => {
		it("should load without errors", async () => {
			const module = await import("./accent-palette-integration");
			expect(module).toBeDefined();
		});
	});
});

describe("AccentPaletteIntegration class logic", () => {
	/**
	 * テスト用のモック候補を生成
	 */
	function createMockCandidate(
		overrides: Partial<ScoredCandidate> = {},
	): ScoredCandidate {
		const defaultScore: BalanceScoreResult = {
			total: 75.5,
			breakdown: {
				harmonyScore: 80,
				cudScore: 70,
				contrastScore: 76,
			},
			weights: { harmony: 40, cud: 30, contrast: 30 },
		};

		return {
			tokenId: "blue-600",
			hex: "#0056FF",
			nameJa: "ブルー 600",
			nameEn: "Blue 600",
			dadsSourceName: "Blue 600",
			step: 600,
			score: defaultScore,
			hue: 225,
			...overrides,
		};
	}

	describe("constructor", () => {
		it("should initialize with empty selected accents", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();
			expect(integration.getSelectedAccents()).toEqual([]);
		});
	});

	describe("selectCandidate", () => {
		it("should add candidate to selected accents", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();
			const candidate = createMockCandidate();

			integration.selectCandidate(candidate);

			const selected = integration.getSelectedAccents();
			expect(selected.length).toBe(1);
			expect(selected[0].tokenId).toBe("blue-600");
			expect(selected[0].hex).toBe("#0056FF");
		});

		it("should not add duplicate candidate", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();
			const candidate = createMockCandidate();

			integration.selectCandidate(candidate);
			integration.selectCandidate(candidate);

			expect(integration.getSelectedAccents().length).toBe(1);
		});

		it("should add multiple different candidates", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();

			integration.selectCandidate(
				createMockCandidate({ tokenId: "blue-600", hex: "#0056FF" }),
			);
			integration.selectCandidate(
				createMockCandidate({ tokenId: "red-500", hex: "#FF0000" }),
			);

			expect(integration.getSelectedAccents().length).toBe(2);
		});
	});

	describe("removeSelectedAccent", () => {
		it("should remove selected accent by tokenId", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();

			integration.selectCandidate(createMockCandidate({ tokenId: "blue-600" }));
			integration.selectCandidate(createMockCandidate({ tokenId: "red-500" }));

			integration.removeSelectedAccent("blue-600");

			const selected = integration.getSelectedAccents();
			expect(selected.length).toBe(1);
			expect(selected[0].tokenId).toBe("red-500");
		});

		it("should do nothing if tokenId not found", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();

			integration.selectCandidate(createMockCandidate({ tokenId: "blue-600" }));
			integration.removeSelectedAccent("non-existent");

			expect(integration.getSelectedAccents().length).toBe(1);
		});
	});

	describe("replaceSelectedAccent", () => {
		it("should replace existing accent with new candidate", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();

			const original = createMockCandidate({
				tokenId: "blue-600",
				hex: "#0056FF",
			});
			const replacement = createMockCandidate({
				tokenId: "red-500",
				hex: "#FF0000",
			});

			integration.selectCandidate(original);
			integration.replaceSelectedAccent("blue-600", replacement);

			const selected = integration.getSelectedAccents();
			expect(selected.length).toBe(1);
			expect(selected[0].tokenId).toBe("red-500");
			expect(selected[0].hex).toBe("#FF0000");
		});

		it("should maintain order when replacing", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();

			integration.selectCandidate(createMockCandidate({ tokenId: "blue-600" }));
			integration.selectCandidate(createMockCandidate({ tokenId: "red-500" }));
			integration.selectCandidate(
				createMockCandidate({ tokenId: "green-400" }),
			);

			const replacement = createMockCandidate({
				tokenId: "purple-700",
			});
			integration.replaceSelectedAccent("red-500", replacement);

			const selected = integration.getSelectedAccents();
			expect(selected.length).toBe(3);
			expect(selected[0].tokenId).toBe("blue-600");
			expect(selected[1].tokenId).toBe("purple-700");
			expect(selected[2].tokenId).toBe("green-400");
		});

		it("should do nothing if old tokenId not found", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();

			integration.selectCandidate(createMockCandidate({ tokenId: "blue-600" }));

			const replacement = createMockCandidate({ tokenId: "red-500" });
			integration.replaceSelectedAccent("non-existent", replacement);

			const selected = integration.getSelectedAccents();
			expect(selected.length).toBe(1);
			expect(selected[0].tokenId).toBe("blue-600");
		});
	});

	describe("clearAllAccents", () => {
		it("should remove all selected accents", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();

			integration.selectCandidate(createMockCandidate({ tokenId: "blue-600" }));
			integration.selectCandidate(createMockCandidate({ tokenId: "red-500" }));

			integration.clearAllAccents();

			expect(integration.getSelectedAccents()).toEqual([]);
		});
	});

	describe("isSelected", () => {
		it("should return true if candidate is selected", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();

			integration.selectCandidate(createMockCandidate({ tokenId: "blue-600" }));

			expect(integration.isSelected("blue-600")).toBe(true);
		});

		it("should return false if candidate is not selected", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();

			integration.selectCandidate(createMockCandidate({ tokenId: "blue-600" }));

			expect(integration.isSelected("red-500")).toBe(false);
		});
	});

	describe("onAccentsChange callback", () => {
		it("should call callback when accent is added", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();

			let callbackCalled = false;
			integration.onAccentsChange(() => {
				callbackCalled = true;
			});

			integration.selectCandidate(createMockCandidate());

			expect(callbackCalled).toBe(true);
		});

		it("should call callback when accent is removed", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();

			integration.selectCandidate(createMockCandidate({ tokenId: "blue-600" }));

			let callbackCalled = false;
			integration.onAccentsChange(() => {
				callbackCalled = true;
			});

			integration.removeSelectedAccent("blue-600");

			expect(callbackCalled).toBe(true);
		});

		it("should call callback when accent is replaced", async () => {
			const { AccentPaletteIntegration } = await import(
				"./accent-palette-integration"
			);
			const integration = new AccentPaletteIntegration();

			integration.selectCandidate(createMockCandidate({ tokenId: "blue-600" }));

			let callbackCalled = false;
			integration.onAccentsChange(() => {
				callbackCalled = true;
			});

			integration.replaceSelectedAccent(
				"blue-600",
				createMockCandidate({ tokenId: "red-500" }),
			);

			expect(callbackCalled).toBe(true);
		});
	});
});

/**
 * AccentCandidateGrid テスト
 *
 * Task 4.2: AccentCandidateGrid 候補表示UIの実装
 * Requirements: 4.2, 2.5
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポート、依存関係、ロジックの確認を行う。
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import type { ScoredCandidate } from "../../core/accent/accent-candidate-service";
import type { BalanceScoreResult } from "../../core/accent/balance-score-calculator";

describe("AccentCandidateGrid module", () => {
	describe("exports", () => {
		it("should export AccentCandidateGrid class", async () => {
			const { AccentCandidateGrid } = await import("./accent-candidate-grid");
			expect(AccentCandidateGrid).toBeDefined();
			expect(typeof AccentCandidateGrid).toBe("function");
		});
	});

	describe("module loading", () => {
		it("should load without errors", async () => {
			const module = await import("./accent-candidate-grid");
			expect(module).toBeDefined();
		});
	});
});

describe("AccentCandidateGrid class logic", () => {
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
		it("should initialize with empty candidates", async () => {
			const { AccentCandidateGrid } = await import("./accent-candidate-grid");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const grid = new AccentCandidateGrid(mockContainer);
			expect(grid.getCandidates()).toEqual([]);
		});
	});

	describe("setCandidates", () => {
		it("should set candidates", async () => {
			const { AccentCandidateGrid } = await import("./accent-candidate-grid");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const grid = new AccentCandidateGrid(mockContainer);
			const candidates = [
				createMockCandidate({ tokenId: "blue-600" }),
				createMockCandidate({ tokenId: "red-500" }),
			];

			grid.setCandidates(candidates);
			expect(grid.getCandidates()).toEqual(candidates);
		});

		it("should replace previous candidates", async () => {
			const { AccentCandidateGrid } = await import("./accent-candidate-grid");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const grid = new AccentCandidateGrid(mockContainer);
			const candidates1 = [createMockCandidate({ tokenId: "blue-600" })];
			const candidates2 = [createMockCandidate({ tokenId: "red-500" })];

			grid.setCandidates(candidates1);
			grid.setCandidates(candidates2);

			expect(grid.getCandidates()).toEqual(candidates2);
			expect(grid.getCandidates().length).toBe(1);
		});
	});

	describe("onSelectCandidate", () => {
		it("should register selection callback", async () => {
			const { AccentCandidateGrid } = await import("./accent-candidate-grid");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const grid = new AccentCandidateGrid(mockContainer);
			let selectedCandidate: ScoredCandidate | null = null;

			grid.onSelectCandidate((candidate) => {
				selectedCandidate = candidate;
			});

			// コールバックが登録されていることを確認
			const candidate = createMockCandidate();
			grid.setCandidates([candidate]);

			// selectCandidateメソッドで選択をトリガー
			grid.selectCandidate(candidate.tokenId);

			expect(selectedCandidate).not.toBeNull();
			expect(selectedCandidate?.tokenId).toBe("blue-600");
		});
	});

	describe("selectCandidate", () => {
		it("should trigger callback with correct candidate", async () => {
			const { AccentCandidateGrid } = await import("./accent-candidate-grid");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const grid = new AccentCandidateGrid(mockContainer);
			let selectedCandidate: ScoredCandidate | null = null;

			grid.onSelectCandidate((candidate) => {
				selectedCandidate = candidate;
			});

			const candidates = [
				createMockCandidate({ tokenId: "blue-600", hex: "#0056FF" }),
				createMockCandidate({ tokenId: "red-500", hex: "#FF0000" }),
			];
			grid.setCandidates(candidates);

			grid.selectCandidate("red-500");

			expect(selectedCandidate?.tokenId).toBe("red-500");
			expect(selectedCandidate?.hex).toBe("#FF0000");
		});

		it("should not trigger callback if candidate not found", async () => {
			const { AccentCandidateGrid } = await import("./accent-candidate-grid");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const grid = new AccentCandidateGrid(mockContainer);
			let callbackCalled = false;

			grid.onSelectCandidate(() => {
				callbackCalled = true;
			});

			grid.setCandidates([createMockCandidate({ tokenId: "blue-600" })]);
			grid.selectCandidate("non-existent-id");

			expect(callbackCalled).toBe(false);
		});
	});

	describe("formatScore", () => {
		it("should format total score as integer", async () => {
			const { AccentCandidateGrid } = await import("./accent-candidate-grid");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const grid = new AccentCandidateGrid(mockContainer);

			// 75.5 → "76"
			expect(grid.formatScore(75.5)).toBe("76");
			// 75.4 → "75"
			expect(grid.formatScore(75.4)).toBe("75");
			// 100 → "100"
			expect(grid.formatScore(100)).toBe("100");
			// 0 → "0"
			expect(grid.formatScore(0)).toBe("0");
		});
	});

	describe("getScoreBreakdownText", () => {
		it("should format score breakdown for display", async () => {
			const { AccentCandidateGrid } = await import("./accent-candidate-grid");
			const mockContainer = {
				querySelector: () => null,
				appendChild: () => {},
			} as unknown as HTMLElement;

			const grid = new AccentCandidateGrid(mockContainer);
			const candidate = createMockCandidate();

			const breakdownText = grid.getScoreBreakdownText(candidate);

			expect(breakdownText).toContain("ハーモニー");
			expect(breakdownText).toContain("80");
			expect(breakdownText).toContain("CUD");
			expect(breakdownText).toContain("70");
			expect(breakdownText).toContain("コントラスト");
			expect(breakdownText).toContain("76");
		});
	});
});

describe("AccentCandidateGrid rendering", () => {
	let restoreDom: (() => void) | undefined;

	beforeAll(() => {
		const g = global as unknown as {
			document?: Document;
			HTMLElement?: typeof HTMLElement;
		};
		const previous = { document: g.document, HTMLElement: g.HTMLElement };

		const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
		g.document = dom.window.document;
		g.HTMLElement = dom.window.HTMLElement as unknown as typeof HTMLElement;

		restoreDom = () => {
			g.document = previous.document;
			g.HTMLElement = previous.HTMLElement;
		};
	});

	afterAll(() => {
		restoreDom?.();
	});

	it("should apply getDisplayHex only to the swatch, keeping candidate data for selection", async () => {
		const { AccentCandidateGrid } = await import("./accent-candidate-grid");

		const score: BalanceScoreResult = {
			total: 75.5,
			breakdown: {
				harmonyScore: 80,
				cudScore: 70,
				contrastScore: 76,
			},
			weights: { harmony: 40, cud: 30, contrast: 30 },
		};
		const candidate: ScoredCandidate = {
			tokenId: "red-500",
			hex: "#FF0000",
			nameJa: "レッド 500",
			nameEn: "Red 500",
			dadsSourceName: "Red 500",
			step: 500,
			score,
			hue: 30,
		};

		const container = document.createElement("div");
		document.body.appendChild(container);

		let selected: ScoredCandidate | null = null;
		const grid = new AccentCandidateGrid(container, {
			getDisplayHex: () => "#00ff00",
		});
		grid.onSelectCandidate((c) => {
			selected = c;
		});
		grid.setCandidates([candidate]);

		const swatch = container.querySelector(
			".accent-candidate-card__swatch",
		) as HTMLElement | null;
		expect(swatch).not.toBeNull();
		// JSDOMはHEXをRGBに変換するため、期待値もRGB形式で指定
		expect(swatch?.style.backgroundColor).toBe("rgb(0, 255, 0)");

		const card = container.querySelector(
			".accent-candidate-card",
		) as HTMLElement | null;
		card?.click();

		expect(selected).not.toBeNull();
		expect(selected?.hex).toBe("#FF0000");
		expect(candidate.hex).toBe("#FF0000");
	});
});

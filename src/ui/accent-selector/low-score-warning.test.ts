/**
 * LowScoreWarning Tests
 *
 * Task 5.2: 低スコア警告の実装テスト
 * Requirements: 5.4
 *
 * テスト対象:
 * - 総合スコア50未満の判定機能
 * - 低スコア警告トースト表示
 * - 追加は許可する動作
 */

import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { ScoredCandidate } from "../../core/accent/accent-candidate-service";
import type { BalanceScoreResult } from "../../core/accent/balance-score-calculator";

import {
	createLowScoreWarningMessage,
	isLowScoreCandidate,
	LOW_SCORE_THRESHOLD,
	LowScoreWarningToast,
} from "./low-score-warning";

describe("Low Score Warning", () => {
	describe("isLowScoreCandidate", () => {
		const createMockScore = (total: number): BalanceScoreResult => ({
			total,
			breakdown: {
				harmonyScore: 50,
				cudScore: 50,
				contrastScore: 50,
			},
			weights: {
				harmony: 40,
				cud: 30,
				contrast: 30,
			},
		});

		const createMockCandidate = (totalScore: number): ScoredCandidate => ({
			tokenId: "test-token",
			hex: "#FF0000",
			nameJa: "テスト",
			nameEn: "Test",
			dadsSourceName: "Test 500",
			step: 500,
			score: createMockScore(totalScore),
			hue: 0,
		});

		test("should return true for score below threshold (50)", () => {
			expect(isLowScoreCandidate(createMockCandidate(49))).toBe(true);
			expect(isLowScoreCandidate(createMockCandidate(25))).toBe(true);
			expect(isLowScoreCandidate(createMockCandidate(0))).toBe(true);
		});

		test("should return false for score at threshold (50)", () => {
			expect(isLowScoreCandidate(createMockCandidate(50))).toBe(false);
		});

		test("should return false for score above threshold", () => {
			expect(isLowScoreCandidate(createMockCandidate(51))).toBe(false);
			expect(isLowScoreCandidate(createMockCandidate(75))).toBe(false);
			expect(isLowScoreCandidate(createMockCandidate(100))).toBe(false);
		});

		test("should handle boundary values correctly", () => {
			expect(isLowScoreCandidate(createMockCandidate(49.9))).toBe(true);
			expect(isLowScoreCandidate(createMockCandidate(50.0))).toBe(false);
			expect(isLowScoreCandidate(createMockCandidate(50.1))).toBe(false);
		});
	});

	describe("LOW_SCORE_THRESHOLD", () => {
		test("should be 50", () => {
			expect(LOW_SCORE_THRESHOLD).toBe(50);
		});
	});

	describe("createLowScoreWarningMessage", () => {
		test("should create message with rounded score", () => {
			const message = createLowScoreWarningMessage(45.5);
			expect(message).toContain("46");
		});

		test("should include warning about recommendation difference", () => {
			const message = createLowScoreWarningMessage(30);
			expect(message).toContain("推奨色との差");
		});

		test("should include score value", () => {
			const message = createLowScoreWarningMessage(25);
			expect(message).toContain("25点");
		});
	});

	describe("LowScoreWarningToast", () => {
		let toast: LowScoreWarningToast;
		let container: HTMLElement;

		beforeEach(() => {
			// Create a mock container
			container = {
				querySelector: () => null,
				appendChild: mock(() => {}),
				removeChild: mock(() => {}),
			} as unknown as HTMLElement;

			toast = new LowScoreWarningToast(container);
		});

		test("should initialize without showing", () => {
			expect(toast.isVisible()).toBe(false);
		});

		test("should show toast with low score", () => {
			toast.show(35);
			expect(toast.isVisible()).toBe(true);
		});

		test("should hide toast", () => {
			toast.show(35);
			toast.hide();
			expect(toast.isVisible()).toBe(false);
		});

		test("should get message content", () => {
			toast.show(42);
			const message = toast.getMessage();
			expect(message).toContain("42点");
		});

		test("should auto-hide after timeout", async () => {
			toast.show(35, { autoHideMs: 10 });

			expect(toast.isVisible()).toBe(true);

			// Wait for auto-hide
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(toast.isVisible()).toBe(false);
		});

		test("should allow adding even with low score", () => {
			let addWasCalled = false;
			toast.show(35);

			// Register callback
			toast.onProceedAnyway(() => {
				addWasCalled = true;
			});

			// Simulate proceed action
			toast.proceedWithAdd();

			expect(addWasCalled).toBe(true);
		});

		test("should cancel and hide toast", () => {
			toast.show(35);
			expect(toast.isVisible()).toBe(true);

			toast.cancel();
			expect(toast.isVisible()).toBe(false);
		});
	});

	describe("Integration with ScoredCandidate", () => {
		const createMockCandidate = (
			totalScore: number,
			tokenId = "test-token",
		): ScoredCandidate => ({
			tokenId,
			hex: "#FF0000",
			nameJa: "テスト",
			nameEn: "Test",
			dadsSourceName: "Test 500",
			step: 500,
			score: {
				total: totalScore,
				breakdown: {
					harmonyScore: 50,
					cudScore: 50,
					contrastScore: 50,
				},
				weights: {
					harmony: 40,
					cud: 30,
					contrast: 30,
				},
			},
			hue: 0,
		});

		test("should correctly identify low score candidates from various scores", () => {
			const candidates = [
				createMockCandidate(20, "low-1"),
				createMockCandidate(49, "low-2"),
				createMockCandidate(50, "threshold"),
				createMockCandidate(75, "high-1"),
				createMockCandidate(95, "high-2"),
			];

			const lowScoreCandidates = candidates.filter(isLowScoreCandidate);

			expect(lowScoreCandidates).toHaveLength(2);
			expect(lowScoreCandidates.map((c) => c.tokenId)).toEqual([
				"low-1",
				"low-2",
			]);
		});
	});
});

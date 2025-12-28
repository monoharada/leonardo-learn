/**
 * アクセシビリティビューモジュールのテスト
 *
 * TDD: RED → GREEN → REFACTOR
 *
 * @module @/ui/demo/views/accessibility-view.test
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { resetState, state } from "../state";
import type { Color } from "../types";

// DOM環境のモック設定
globalThis.document = {
	createElement: (tag: string) => {
		const element = {
			tag,
			className: "",
			innerHTML: "",
			textContent: "",
			style: {} as Record<string, string>,
			dataset: {} as Record<string, string>,
			children: [] as unknown[],
			appendChild: (child: unknown) => {
				element.children.push(child);
				return child;
			},
			removeChild: (child: unknown) => {
				const index = element.children.indexOf(child);
				if (index > -1) element.children.splice(index, 1);
				return child;
			},
			setAttribute: () => {},
			getAttribute: () => null,
			addEventListener: () => {},
			removeEventListener: () => {},
			querySelectorAll: () => [],
		};
		return element;
	},
	getElementById: () => null,
	body: {},
} as unknown as Document;

// CVD関連のモック
mock.module("@/accessibility/cvd-simulator", () => ({
	simulateCVD: (color: { toCss: () => string }) => color,
	getAllCVDTypes: () => [
		"protanopia",
		"deuteranopia",
		"tritanopia",
		"achromatopsia",
	],
	getCVDTypeName: (type: string) => {
		const names: Record<string, string> = {
			protanopia: "1型2色覚（P型）",
			deuteranopia: "2型2色覚（D型）",
			tritanopia: "3型2色覚（T型）",
			achromatopsia: "全色盲",
		};
		return names[type] || type;
	},
}));

mock.module("@/accessibility/distinguishability", () => ({
	checkAdjacentShadesDistinguishability: () => ({ problematicPairs: [] }),
	checkPaletteDistinguishability: () => ({ problematicPairs: [] }),
	calculateDeltaE: () => 5.0, // モックでは常に識別可能な値を返す
}));

mock.module("@/core/cud/validator", () => ({
	validatePalette: () => ({
		valid: true,
		issues: [],
	}),
}));

mock.module("@/ui/cud-components", () => ({
	showPaletteValidation: mock(() => {}),
	snapToCudColor: (hex: string) => ({ hex, snapped: false }),
}));

mock.module("@/core/solver", () => ({
	findColorForContrast: mock(() => ({
		toCss: () => "#888888",
		toHex: () => "#888888",
		contrast: () => 4.5,
	})),
}));

mock.module("@/ui/style-constants", () => ({
	getContrastRatios: () => [
		1.1, 1.25, 1.45, 1.8, 2.3, 3.0, 4.0, 5.5, 7.5, 10.0, 13.0, 16.0, 19.0,
	],
	STEP_NAMES: [
		"50",
		"100",
		"200",
		"300",
		"400",
		"500",
		"600",
		"700",
		"800",
		"900",
		"1000",
		"1100",
		"1200",
	],
}));

describe("accessibility-view", () => {
	beforeEach(() => {
		resetState();
	});

	describe("renderAccessibilityView", () => {
		it("should export renderAccessibilityView function", async () => {
			const { renderAccessibilityView } = await import("./accessibility-view");
			expect(typeof renderAccessibilityView).toBe("function");
		});

		it("should accept container and helpers parameters", async () => {
			const { renderAccessibilityView } = await import("./accessibility-view");
			const container = document.createElement("div");
			const helpers = {
				applySimulation: (color: Color) => color,
			};

			// 関数が例外をスローしないことを確認
			expect(() =>
				renderAccessibilityView(container as unknown as HTMLElement, helpers),
			).not.toThrow();
		});

		it("should set container className to dads-section", async () => {
			const { renderAccessibilityView } = await import("./accessibility-view");
			const container = document.createElement("div") as unknown as HTMLElement;
			const helpers = {
				applySimulation: (color: Color) => color,
			};

			renderAccessibilityView(container, helpers);

			expect(container.className).toBe("dads-section");
		});

		it("should render empty state when palettes is empty", async () => {
			const { renderAccessibilityView } = await import("./accessibility-view");
			const container = document.createElement(
				"div",
			) as unknown as HTMLElement & {
				children: unknown[];
			};
			const helpers = {
				applySimulation: (color: Color) => color,
			};
			state.palettes = [];

			renderAccessibilityView(container, helpers);

			// 空状態を表示することを確認（子要素が追加される）
			expect(container.children.length).toBeGreaterThan(0);
		});
	});

	describe("renderDistinguishabilityAnalysis", () => {
		it("should be exported and callable", async () => {
			const { renderDistinguishabilityAnalysis } = await import(
				"./accessibility-view"
			);
			expect(typeof renderDistinguishabilityAnalysis).toBe("function");
		});

		it("should accept container and colors parameters", async () => {
			const { renderDistinguishabilityAnalysis } = await import(
				"./accessibility-view"
			);
			const container = document.createElement("div") as unknown as HTMLElement;
			const colors: Record<string, Color> = {};

			// 関数が例外をスローしないことを確認
			expect(() =>
				renderDistinguishabilityAnalysis(container, colors),
			).not.toThrow();
		});
	});

	describe("renderAdjacentShadesAnalysis", () => {
		it("should be exported and callable", async () => {
			const { renderAdjacentShadesAnalysis } = await import(
				"./accessibility-view"
			);
			expect(typeof renderAdjacentShadesAnalysis).toBe("function");
		});

		it("should accept container and colors parameters", async () => {
			const { renderAdjacentShadesAnalysis } = await import(
				"./accessibility-view"
			);
			const container = document.createElement("div") as unknown as HTMLElement;
			const colors: { name: string; color: Color }[] = [];

			// 関数が例外をスローしないことを確認
			expect(() =>
				renderAdjacentShadesAnalysis(container, colors),
			).not.toThrow();
		});
	});
});

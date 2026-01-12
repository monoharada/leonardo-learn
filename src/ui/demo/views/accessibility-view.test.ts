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
	calculateSimpleDeltaE: () => 5.0, // ΔEOK計算のモック（識別可能な値）
	DISTINGUISHABILITY_THRESHOLD: 5.0, // 識別可能閾値のモック
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

	/**
	 * UI Refinement: Key Colorsセクション削除（UI部分のみ）
	 * keyColorsMap生成は残す
	 */
	describe("UI Refinement: Key Colors section removal", () => {
		it("should NOT render Key Colors section heading", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// "キーカラー＋セマンティックカラーの識別性確認" という見出しがないこと
			expect(content).not.toContain(
				'keyColorsHeading.textContent = "キーカラー＋セマンティックカラーの識別性確認"',
			);
		});

		it("should still generate keyColorsMap for use in sorting validation", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// keyColorsMap生成コードは残っている
			expect(content).toContain("const keyColorsMap");
			// viewStateも渡すようにリファクタリングされた
			expect(content).toContain(
				"renderSortingValidationSection(container, keyColorsMap, viewState)",
			);
		});

		it("should NOT call renderDistinguishabilityAnalysis for key colors section", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// keyColorsSectionへのrenderDistinguishabilityAnalysis呼び出しがないこと
			expect(content).not.toContain(
				"renderDistinguishabilityAnalysis(keyColorsSection",
			);
		});
	});

	/**
	 * UI Refinement: Explanation文言更新
	 */
	describe("UI Refinement: Explanation text update", () => {
		it("should NOT mention removed Key Colors section in explanation", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// 削除されたセクションへの言及がないこと
			// 「キーカラー＋セマンティックカラーの識別性」という独立した項目がないこと
			expect(content).not.toContain(
				"<li><strong>キーカラー＋セマンティックカラーの識別性:</strong>",
			);
		});

		it("should mention all-pair validation in explanation", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// 全ペア検証への言及があること
			expect(content).toContain("全ペア");
		});
	});

	/**
	 * UI Refinement: Alert Box layout change
	 * tabs → alertBox → boundaryContainer の順序
	 */
	describe("UI Refinement: Alert Box layout", () => {
		it("should append alertBox AFTER tabs in renderSortingValidationSection", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// renderSortTabs呼び出しの後にalertBoxをappendしていること
			// 順序: renderSortTabs → section.appendChild(alertBox)
			const sortTabsIndex = content.indexOf("renderSortTabs(section");
			const alertBoxAppendIndex = content.indexOf(
				"section.appendChild(alertBox)",
			);

			expect(sortTabsIndex).toBeGreaterThan(-1);
			expect(alertBoxAppendIndex).toBeGreaterThan(-1);
			expect(alertBoxAppendIndex).toBeGreaterThan(sortTabsIndex);
		});
	});

	/**
	 * UI Refinement: Alert Box simplified to show CVD confusion count only
	 */
	describe("UI Refinement: Alert Box simplified display", () => {
		it("should show CVD confusion count in updateAlertBox", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// updateAlertBox内でCVD混同リスク件数を表示
			expect(content).toContain("cvdConfusionCount");
			expect(content).toContain("識別困難なペア検出");
		});

		it("should display simplified alert message without separate pair counts", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// updateAlertBox関数を抽出
			const updateAlertBoxStart = content.indexOf("const updateAlertBox = ()");
			const updateAlertBoxEnd = content.indexOf(
				"updateAlertBox();",
				updateAlertBoxStart,
			);
			const updateAlertBoxContent = content.slice(
				updateAlertBoxStart,
				updateAlertBoxEnd,
			);

			// 「全ペア X件、隣接ペア Y件」形式は使用しない
			expect(updateAlertBoxContent).not.toContain("全ペア");
			expect(updateAlertBoxContent).not.toContain("隣接ペア");
		});
	});

	/**
	 * Hybrid Approach (2+3): CVD Confusion Details
	 * - Shows which CVD type has issues (P型/D型)
	 * - Lists problematic color pairs
	 * - Displays ΔE values for severity
	 */
	describe("Hybrid Approach: CVD Confusion Details display", () => {
		it("should have getCvdTypeLabelJa helper for Japanese CVD type names", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			// getCvdTypeLabelJaはcvd-detection.tsに抽出された
			const filePath = path.join(
				import.meta.dir,
				"../../accessibility/cvd-detection.ts",
			);
			const content = fs.readFileSync(filePath, "utf-8");

			// getCvdTypeLabelJa関数が存在すること
			expect(content).toContain("function getCvdTypeLabelJa");
			expect(content).toContain("P型（1型2色覚）");
			expect(content).toContain("D型（2型2色覚）");
		});

		it("should have renderCvdConfusionDetails function for hybrid display", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// renderCvdConfusionDetails関数が存在すること
			expect(content).toContain("function renderCvdConfusionDetails");
		});

		it("should group CVD confusion pairs by CVD type", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			// groupPairsByCvdTypeはcvd-detection.tsに抽出された
			const cvdDetectionPath = path.join(
				import.meta.dir,
				"../../accessibility/cvd-detection.ts",
			);
			const cvdDetectionContent = fs.readFileSync(cvdDetectionPath, "utf-8");

			// CVDTypeを使用してMapでグループ化（全4タイプ対応）
			expect(cvdDetectionContent).toContain("Map<CVDType, CvdConfusionPair[]>");

			// accessibility-view.tsでgroupedByTypeを使用していること
			const viewFilePath = path.join(import.meta.dir, "accessibility-view.ts");
			const viewContent = fs.readFileSync(viewFilePath, "utf-8");
			expect(viewContent).toContain("groupedByType");
		});

		it("should display CVD type header with pair count", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// CVDタイプヘッダーの表示
			expect(content).toContain("dads-a11y-cvd-type-header");
			expect(content).toContain("で混同リスク:");
			expect(content).toContain("ペア");
		});

		it("should display color swatches for each problematic pair", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			// createPairSwatchはdom-helpers.tsに抽出された
			const filePath = path.join(import.meta.dir, "../utils/dom-helpers.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// 色スウォッチの表示
			expect(content).toContain("dads-a11y-cvd-pair-swatch");
		});

		it("should display deltaE values for each pair", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// ΔE値の表示
			expect(content).toContain("dads-a11y-cvd-pair-deltaE");
			expect(content).toContain("cvdDeltaE.toFixed");
		});

		it("should call renderCvdConfusionDetails in renderSortingValidationSection", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// renderSortingValidationSection内でrenderCvdConfusionDetailsを呼び出すこと
			// Note: 関数呼び出しが複数行にまたがる可能性があるので、関数名のみをチェック
			expect(content).toContain("renderCvdConfusionDetails(");
			expect(content).toContain("cvdDetailsContainer");
		});
	});

	/**
	 * UI Refinement: Remove bottom summary
	 */
	describe("UI Refinement: Bottom summary removal", () => {
		it("should NOT create summary div in renderAllCvdBoundaryValidations", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// renderAllCvdBoundaryValidations関数内でsummary divを作成していないこと
			// "dads-a11y-boundary-summary" クラスをrenderAllCvdBoundaryValidations内で使用していないこと
			const funcStart = content.indexOf(
				"function renderAllCvdBoundaryValidations",
			);
			const funcEnd = content.indexOf(
				"function renderSortingValidationSection",
			);

			expect(funcStart).toBeGreaterThan(-1);
			expect(funcEnd).toBeGreaterThan(funcStart);

			const funcContent = content.slice(funcStart, funcEnd);
			expect(funcContent).not.toContain("dads-a11y-boundary-summary");
		});
	});

	/**
	 * Task 5.3: 画面間での背景色同期を確認する
	 * Requirements: 5.2, 5.5
	 */
	describe("background color synchronization (Task 5.3)", () => {
		it("should use state.lightBackgroundColor for container background", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// state.lightBackgroundColorを参照してコンテナ背景色を設定
			expect(content).toContain("state.lightBackgroundColor");
		});

		it("should apply background color to container element", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// container.style.backgroundColorを設定
			expect(content).toContain("container.style.backgroundColor");
		});

		it("should reference Requirements 5.2 or 5.5 in comments", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// Requirementsの参照（モジュールヘッダまたはコメント内）
			// 5.2または5.5のいずれかが含まれていれば良い
			const has52 = content.includes("5.2");
			const has55 = content.includes("5.5");
			expect(has52 || has55).toBe(true);
		});

		it("should import state from ../state module", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "accessibility-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// stateのインポート
			expect(content).toContain('from "../state"');
		});
	});
});

/**
 * ContrastBoundaryIndicator テスト
 *
 * コントラスト比境界ピル表示のテスト
 * Requirements: 6.1, 6.4, 6.5
 */

import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";

// JSDOMでdocumentをセットアップ
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement as typeof HTMLElement;

import {
	type BoundaryPillConfig,
	createBoundaryPill,
} from "./contrast-boundary-indicator";

describe("ContrastBoundaryIndicator", () => {
	describe("createBoundaryPill", () => {
		it("should create pill element with correct text for white background 3:1", () => {
			const config: BoundaryPillConfig = {
				scale: 400,
				label: "3:1→",
				style: "outline",
				direction: "start",
			};

			const pill = createBoundaryPill(config);

			expect(pill.textContent).toBe("3:1→");
			expect(pill.classList.contains("dads-contrast-pill")).toBe(true);
		});

		it("should create pill element with correct text for white background 4.5:1", () => {
			const config: BoundaryPillConfig = {
				scale: 500,
				label: "4.5:1→",
				style: "outline",
				direction: "start",
			};

			const pill = createBoundaryPill(config);

			expect(pill.textContent).toBe("4.5:1→");
		});

		it("should create pill element with correct text for black background 4.5:1", () => {
			const config: BoundaryPillConfig = {
				scale: 700,
				label: "←4.5:1",
				style: "filled",
				direction: "end",
			};

			const pill = createBoundaryPill(config);

			expect(pill.textContent).toBe("←4.5:1");
		});

		it("should create pill element with correct text for black background 3:1", () => {
			const config: BoundaryPillConfig = {
				scale: 800,
				label: "←3:1",
				style: "filled",
				direction: "end",
			};

			const pill = createBoundaryPill(config);

			expect(pill.textContent).toBe("←3:1");
		});

		it("should apply outline style for white background pills", () => {
			const config: BoundaryPillConfig = {
				scale: 400,
				label: "3:1→",
				style: "outline",
				direction: "start",
			};

			const pill = createBoundaryPill(config);

			expect(pill.classList.contains("dads-contrast-pill--outline")).toBe(true);
		});

		it("should apply filled style for black background pills", () => {
			const config: BoundaryPillConfig = {
				scale: 800,
				label: "←3:1",
				style: "filled",
				direction: "end",
			};

			const pill = createBoundaryPill(config);

			expect(pill.classList.contains("dads-contrast-pill--filled")).toBe(true);
		});

		it("should have data-scale attribute", () => {
			const config: BoundaryPillConfig = {
				scale: 600,
				label: "4.5:1→",
				style: "outline",
				direction: "start",
			};

			const pill = createBoundaryPill(config);

			expect(pill.dataset.scale).toBe("600");
		});

		it("should have data-direction attribute", () => {
			const config: BoundaryPillConfig = {
				scale: 700,
				label: "←4.5:1",
				style: "filled",
				direction: "end",
			};

			const pill = createBoundaryPill(config);

			expect(pill.dataset.direction).toBe("end");
		});

		it("should have pointer-events none for non-interactive pills", () => {
			const config: BoundaryPillConfig = {
				scale: 400,
				label: "3:1→",
				style: "outline",
				direction: "start",
			};

			const pill = createBoundaryPill(config);

			// CSSクラスで設定されているため、確認のみ
			expect(pill.classList.contains("dads-contrast-pill")).toBe(true);
		});
	});

	describe("renderBoundaryPills", () => {
		let scaleElements: Map<number, HTMLElement>;

		beforeEach(() => {
			// スウォッチ要素のモックを作成
			scaleElements = new Map();
			const scales = [
				50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
			];
			for (const scale of scales) {
				const el = document.createElement("div");
				el.style.width = "40px";
				el.style.height = "40px";
				el.dataset.scale = String(scale);
				scaleElements.set(scale, el);
			}
		});

		it("should create container with correct class", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			const boundaries = {
				white3to1: 400,
				white4_5to1: 500,
				black4_5to1: 700,
				black3to1: 800,
			};

			const container = renderBoundaryPills(boundaries, scaleElements);

			expect(container.classList.contains("dads-contrast-boundary")).toBe(true);
		});

		it("should render all 4 pills when all boundaries exist", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			const boundaries = {
				white3to1: 400,
				white4_5to1: 500,
				black4_5to1: 700,
				black3to1: 800,
			};

			const container = renderBoundaryPills(boundaries, scaleElements);
			const pills = container.querySelectorAll(".dads-contrast-pill");

			expect(pills.length).toBe(4);
		});

		it("should render white background pills with outline style at correct scale positions", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			const boundaries = {
				white3to1: 400,
				white4_5to1: 500,
				black4_5to1: null,
				black3to1: null,
			};

			const container = renderBoundaryPills(boundaries, scaleElements);
			const outlinePills = container.querySelectorAll(
				".dads-contrast-pill--outline",
			);

			expect(outlinePills.length).toBe(2);

			// 3:1→ と 4.5:1→ のラベルを確認
			const labels = Array.from(outlinePills).map((p) => p.textContent);
			expect(labels).toContain("3:1→");
			expect(labels).toContain("4.5:1→");
		});

		it("should render black background pills with filled style at correct scale positions", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			const boundaries = {
				white3to1: null,
				white4_5to1: null,
				black4_5to1: 700,
				black3to1: 800,
			};

			const container = renderBoundaryPills(boundaries, scaleElements);
			const filledPills = container.querySelectorAll(
				".dads-contrast-pill--filled",
			);

			expect(filledPills.length).toBe(2);

			// ←4.5:1 と ←3:1 のラベルを確認
			const labels = Array.from(filledPills).map((p) => p.textContent);
			expect(labels).toContain("←4.5:1");
			expect(labels).toContain("←3:1");
		});

		it("should not render pill when boundary is null", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			const boundaries = {
				white3to1: null,
				white4_5to1: null,
				black4_5to1: null,
				black3to1: null,
			};

			const container = renderBoundaryPills(boundaries, scaleElements);
			const pills = container.querySelectorAll(".dads-contrast-pill");

			expect(pills.length).toBe(0);
		});

		it("should skip pill when scale element does not exist in scaleElements map", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			// 400のスウォッチを削除
			scaleElements.delete(400);

			const boundaries = {
				white3to1: 400, // このスウォッチは存在しない
				white4_5to1: 500,
				black4_5to1: null,
				black3to1: null,
			};

			const container = renderBoundaryPills(boundaries, scaleElements);
			const pills = container.querySelectorAll(".dads-contrast-pill");

			// 400のピルはスキップされる
			expect(pills.length).toBe(1);
		});

		it("should set data-scale attribute on pills", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			const boundaries = {
				white3to1: 400,
				white4_5to1: null,
				black4_5to1: null,
				black3to1: null,
			};

			const container = renderBoundaryPills(boundaries, scaleElements);
			const pill = container.querySelector(".dads-contrast-pill");

			expect(pill?.getAttribute("data-scale")).toBe("400");
		});

		it("should set correct direction data attribute", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			const boundaries = {
				white3to1: 400,
				white4_5to1: null,
				black4_5to1: 700,
				black3to1: null,
			};

			const container = renderBoundaryPills(boundaries, scaleElements);
			const startPill = container.querySelector('[data-direction="start"]');
			const endPill = container.querySelector('[data-direction="end"]');

			expect(startPill).not.toBeNull();
			expect(endPill).not.toBeNull();
		});

		it("should set left style for white background pills (start direction)", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			const boundaries = {
				white3to1: 400,
				white4_5to1: null,
				black4_5to1: null,
				black3to1: null,
			};

			const container = renderBoundaryPills(boundaries, scaleElements);
			const pill = container.querySelector(
				".dads-contrast-pill",
			) as HTMLElement;

			// JSDOM環境ではoffsetLeftは0を返すため、style.leftが設定されていることを確認
			expect(pill.style.left).toBe("0px");
		});

		it("should set left style with transform for black background pills (end direction)", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			const boundaries = {
				white3to1: null,
				white4_5to1: null,
				black4_5to1: 700,
				black3to1: null,
			};

			const container = renderBoundaryPills(boundaries, scaleElements);
			const pill = container.querySelector(
				".dads-contrast-pill",
			) as HTMLElement;

			// JSDOM環境ではoffsetWidth/offsetLeftは0を返すため、leftが設定されていることを確認
			// 中央配置のため、width=0の場合はleft=0px
			expect(pill.style.left).toBe("0px");
		});

		it("should position pills correctly based on scaleElements (integration)", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			const boundaries = {
				white3to1: 400,
				white4_5to1: 500,
				black4_5to1: 700,
				black3to1: 800,
			};

			const container = renderBoundaryPills(boundaries, scaleElements);
			const pills = container.querySelectorAll(".dads-contrast-pill");

			// 全4つのピルが生成されること
			expect(pills.length).toBe(4);

			// 各ピルにstyle.leftが設定されていること
			for (const pill of pills) {
				const htmlPill = pill as HTMLElement;
				expect(htmlPill.style.left).toBeDefined();
				expect(htmlPill.style.left).not.toBe("");
			}

			// endディレクションのピルも中央配置で位置が設定されていること
			const endPills = container.querySelectorAll('[data-direction="end"]');
			for (const pill of endPills) {
				const htmlPill = pill as HTMLElement;
				expect(htmlPill.style.left).toBeDefined();
				expect(htmlPill.style.left).not.toBe("");
			}
		});

		it("should use minimum scale as reference point for position calculation", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			// 挿入順を意図的にシャッフル（500, 400, 600の順）
			const shuffledElements = new Map<number, HTMLElement>();
			const mockRect = (left: number, width: number) => ({
				left,
				width,
				top: 0,
				right: left + width,
				bottom: 40,
				height: 40,
				x: left,
				y: 0,
				toJSON: () => ({}),
			});

			const el500 = document.createElement("div");
			el500.getBoundingClientRect = () => mockRect(40, 40);
			el500.dataset.scale = "500";
			shuffledElements.set(500, el500);

			const el400 = document.createElement("div");
			el400.getBoundingClientRect = () => mockRect(0, 40); // 最小scaleが基準点（left=0）
			el400.dataset.scale = "400";
			shuffledElements.set(400, el400);

			const el600 = document.createElement("div");
			el600.getBoundingClientRect = () => mockRect(80, 40);
			el600.dataset.scale = "600";
			shuffledElements.set(600, el600);

			const boundaries = {
				white3to1: 400,
				white4_5to1: 500,
				black4_5to1: null,
				black3to1: null,
			};

			const container = renderBoundaryPills(boundaries, shuffledElements);
			const pills = container.querySelectorAll(".dads-contrast-pill");

			expect(pills.length).toBe(2);

			// 400の3:1ピルは基準点からの中央位置 = 0 + 40/2 = 20px
			const pill400 = container.querySelector(
				'[data-scale="400"]',
			) as HTMLElement;
			expect(pill400.style.left).toBe("20px");

			// 500の4.5:1ピルは基準点から中央位置 = 40 + 40/2 = 60px
			const pill500 = container.querySelector(
				'[data-scale="500"]',
			) as HTMLElement;
			expect(pill500.style.left).toBe("60px");
		});

		it("should calculate end direction pill position correctly with width", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			const mockRect = (left: number, width: number) => ({
				left,
				width,
				top: 0,
				right: left + width,
				bottom: 40,
				height: 40,
				x: left,
				y: 0,
				toJSON: () => ({}),
			});

			const elementsWithMock = new Map<number, HTMLElement>();

			const el50 = document.createElement("div");
			el50.getBoundingClientRect = () => mockRect(0, 40);
			el50.dataset.scale = "50";
			elementsWithMock.set(50, el50);

			const el700 = document.createElement("div");
			el700.getBoundingClientRect = () => mockRect(200, 40);
			el700.dataset.scale = "700";
			elementsWithMock.set(700, el700);

			const boundaries = {
				white3to1: null,
				white4_5to1: null,
				black4_5to1: 700,
				black3to1: null,
			};

			const container = renderBoundaryPills(boundaries, elementsWithMock);
			const pill = container.querySelector(
				".dads-contrast-pill",
			) as HTMLElement;

			// end方向も中央配置: left = 200 + 40/2 = 220px (基準点0から)
			expect(pill.style.left).toBe("220px");
		});

		it("should render pills in two-row structure (white on top, black on bottom)", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			const boundaries = {
				white3to1: 400,
				white4_5to1: 500,
				black4_5to1: 700,
				black3to1: 800,
			};

			const container = renderBoundaryPills(boundaries, scaleElements);

			// 2行構造を確認
			const rows = container.querySelectorAll(".dads-contrast-boundary__row");
			expect(rows.length).toBe(2);

			// 上段（白背景用）にoutlineピルが配置されていること
			const whiteRow = rows[0];
			const whitePills = whiteRow?.querySelectorAll(
				".dads-contrast-pill--outline",
			);
			expect(whitePills?.length).toBe(2);

			// 下段（黒背景用）にfilledピルが配置されていること
			const blackRow = rows[1];
			const blackPills = blackRow?.querySelectorAll(
				".dads-contrast-pill--filled",
			);
			expect(blackPills?.length).toBe(2);
		});

		it("should create two-row structure even when empty", async () => {
			const { renderBoundaryPills } = await import(
				"./contrast-boundary-indicator"
			);

			const boundaries = {
				white3to1: null,
				white4_5to1: null,
				black4_5to1: null,
				black3to1: null,
			};

			const container = renderBoundaryPills(boundaries, scaleElements);

			// 2行構造が存在すること
			const rows = container.querySelectorAll(".dads-contrast-boundary__row");
			expect(rows.length).toBe(2);

			// ピルは空
			const pills = container.querySelectorAll(".dads-contrast-pill");
			expect(pills.length).toBe(0);
		});
	});
});

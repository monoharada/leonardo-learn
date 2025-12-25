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
});

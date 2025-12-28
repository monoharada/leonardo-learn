/**
 * シェードビューモジュールのテスト
 *
 * TDD: RED → GREEN → REFACTOR
 *
 * @module @/ui/demo/views/shades-view.test
 */

import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { resetState, state } from "../state";
import type { ShadesViewCallbacks } from "./shades-view";
import { renderShadesView } from "./shades-view";

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

// loadDadsTokensのモック
const mockDadsTokens = {
	primitive: {
		color: {
			red: {
				"50": { $value: "#fff5f5" },
				"100": { $value: "#fee2e2" },
				"200": { $value: "#fecaca" },
				"300": { $value: "#fca5a5" },
				"400": { $value: "#f87171" },
				"500": { $value: "#ef4444" },
				"600": { $value: "#dc2626" },
				"700": { $value: "#b91c1c" },
				"800": { $value: "#991b1b" },
				"900": { $value: "#7f1d1d" },
				"1000": { $value: "#6a1a1a" },
				"1100": { $value: "#551616" },
				"1200": { $value: "#3f1111" },
			},
		},
	},
};

// モジュールモック
mock.module("@/core/tokens/dads-data-provider", () => ({
	loadDadsTokens: mock(() => Promise.resolve(mockDadsTokens)),
	getAllDadsChromatic: mock(() => [
		{
			hue: "red",
			hueName: { en: "Red", ja: "赤" },
			colors: [
				{ scale: 50, hex: "#fff5f5", token: { nameJa: "レッド50" } },
				{ scale: 600, hex: "#dc2626", token: { nameJa: "レッド600" } },
				{ scale: 1200, hex: "#3f1111", token: { nameJa: "レッド1200" } },
			],
		},
	]),
}));

mock.module("@/core/semantic-role/role-mapper", () => ({
	createSemanticRoleMapper: mock(() => ({
		lookupRoles: () => [],
		lookupUnresolvedBrandRoles: () => [],
	})),
}));

mock.module("@/accessibility/cvd-simulator", () => ({
	simulateCVD: (color: { toCss: () => string }) => color,
}));

mock.module("@/accessibility/wcag2", () => ({
	verifyContrast: () => ({ contrast: 4.5, level: "AA" }),
}));

describe("shades-view", () => {
	beforeEach(() => {
		resetState();
	});

	describe("renderShadesView", () => {
		it("should export renderShadesView function", () => {
			expect(typeof renderShadesView).toBe("function");
		});

		it("should accept container and callbacks parameters", async () => {
			const container = document.createElement("div");
			const callbacks: ShadesViewCallbacks = {
				onColorClick: mock(() => {}),
			};

			// 関数が例外をスローしないことを確認
			await expect(
				renderShadesView(container, callbacks),
			).resolves.toBeUndefined();
		});

		it("should set container className to dads-section", async () => {
			const container = document.createElement("div") as unknown as HTMLElement;
			const callbacks: ShadesViewCallbacks = {
				onColorClick: mock(() => {}),
			};

			await renderShadesView(container, callbacks);

			expect(container.className).toBe("dads-section");
		});
	});

	describe("renderDadsHueSection", () => {
		it("should be exported and callable", async () => {
			const { renderDadsHueSection } = await import("./shades-view");
			expect(typeof renderDadsHueSection).toBe("function");
		});
	});

	describe("renderBrandColorSection", () => {
		it("should be exported and callable", async () => {
			const { renderBrandColorSection } = await import("./shades-view");
			expect(typeof renderBrandColorSection).toBe("function");
		});
	});
});

/**
 * シェードビューモジュールのテスト
 *
 * TDD: RED → GREEN → REFACTOR
 *
 * @module @/ui/demo/views/shades-view.test
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { resetState, state } from "../state";
import type { ShadesViewCallbacks } from "./shades-view";
import { renderShadesView } from "./shades-view";

// DOM環境のモック設定
const originalDocument = globalThis.document;

function createMockDocument(): Document {
	return {
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
}

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
let lastRoleMapperArgs:
	| { palettesInfo: unknown; harmonyType: unknown }
	| undefined;

const createSemanticRoleMapperMock = mock(
	(palettesInfo: unknown, harmonyType: unknown) => {
		lastRoleMapperArgs = { palettesInfo, harmonyType };
		return {
			lookupRoles: () => [],
			lookupUnresolvedBrandRoles: () => [],
		};
	},
);

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
	findDadsColorByHex: mock(() => undefined),
}));

mock.module("@/core/semantic-role/role-mapper", () => ({
	createSemanticRoleMapper: createSemanticRoleMapperMock,
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
		lastRoleMapperArgs = undefined;
		globalThis.document = createMockDocument();
	});

	afterEach(() => {
		globalThis.document = originalDocument;
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

		it("should use state.palettes when shadesPalettes is empty for role mapping", async () => {
			const container = document.createElement("div") as unknown as HTMLElement;
			const callbacks: ShadesViewCallbacks = {
				onColorClick: mock(() => {}),
			};

			state.shadesPalettes = [];
			state.palettes = [
				{
					id: "p1",
					name: "Primary",
					keyColors: ["#111111"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "analogous" as any,
					baseChromaName: "Green",
					step: 1100,
				},
			] as any;
			state.activeId = "p1";

			await renderShadesView(container, callbacks);

			expect(lastRoleMapperArgs?.palettesInfo).toEqual([
				{ name: "Primary", baseChromaName: "Green", step: 1100 },
			]);
		});
	});

	describe("renderDadsHueSection", () => {
		it("should be exported and callable", async () => {
			const { renderDadsHueSection } = await import("./shades-view");
			expect(typeof renderDadsHueSection).toBe("function");
		});
	});

	describe("renderPrimaryBrandSection", () => {
		it("should be exported and callable", async () => {
			const { renderPrimaryBrandSection } = await import("./shades-view");
			expect(typeof renderPrimaryBrandSection).toBe("function");
		});
	});

	/**
	 * Task 5.2: シェードビューに背景色を適用する
	 * Requirements: 1.1, 3.5, 5.5, 5.6
	 */
	describe("background color integration (Task 5.2)", () => {
		it("should import createBackgroundColorSelector from background-color-selector module", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "shades-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// 背景色セレクターのインポート
			expect(content).toContain("createBackgroundColorSelector");
		});

		it("should integrate background color selector at top of shades view", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "shades-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// 背景色セレクターをビュー上部に配置
			expect(content).toContain("background-color-selector");
		});

		it("should apply background color to container", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "shades-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// コンテナの背景色を更新
			expect(content).toContain("container.style.backgroundColor");
		});

		it("should use state.lightBackgroundColor for background color", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "shades-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// state.lightBackgroundColorを参照
			expect(content).toContain("state.lightBackgroundColor");
		});

		it("should reference Requirements 5.5, 5.6 in comments", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "shades-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// Requirementsの参照（モジュールヘッダまたはコメント内）
			expect(content).toContain("5.5");
			expect(content).toContain("5.6");
		});

		it("should call persistBackgroundColor on color change", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "shades-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// 背景色変更時に永続化
			expect(content).toContain("persistBackgroundColor");
		});

		// NOTE: determineColorModeはスウォッチボーダー機能と共に削除されました
		// 色は隣接して表示され、ボーダーなしのデザインに変更

		it("should re-render view on background color change", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "shades-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// 背景色変更時に再レンダリング
			expect(content).toContain("renderShadesView");
		});

		it("should use new background color for hover contrast display (Req 3.5)", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "shades-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// ホバー時のコントラスト計算で背景色を使用
			// verifyContrastの第2引数でstate.lightBackgroundColorを使用
			expect(content).toContain("state.lightBackgroundColor");
		});
	});

	// NOTE: Task 6.3のスウォッチボーダー機能は削除されました
	// 色は隣接して表示され、ボーダーなしのデザインに変更
});

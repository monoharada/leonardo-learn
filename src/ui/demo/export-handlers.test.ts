/**
 * エクスポートハンドラモジュールのテスト
 *
 * @module @/ui/demo/export-handlers.test
 */

import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "bun:test";
import { JSDOM } from "jsdom";
import { Color } from "@/core/color";
import { loadDadsTokens } from "@/core/tokens/dads-data-provider";
import {
	downloadFile,
	generateExportColors,
	getExportContent,
	setupExportHandlers,
} from "./export-handlers";
import { resetState, state } from "./state";

describe("export-handlers", () => {
	beforeEach(() => {
		resetState();
	});

	afterEach(() => {
		resetState();
	});

	describe("generateExportColors", () => {
		it("shadesPalettesから色を生成する", () => {
			// Setup: shadesPalettesにパレットを追加
			state.shadesPalettes = [
				{
					id: "test-primary",
					name: "Primary",
					keyColors: ["#0066CC"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];

			const colors = generateExportColors();

			// 13ステップの色が生成される
			expect(Object.keys(colors).length).toBeGreaterThanOrEqual(13);
			// パレット名がキー名に含まれる
			expect(Object.keys(colors).some((k) => k.startsWith("primary-"))).toBe(
				true,
			);
		});

		it("shadesPalettesが空の場合はpalettesを使用する", () => {
			state.palettes = [
				{
					id: "test-primary",
					name: "Primary",
					keyColors: ["#0066CC"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];
			state.shadesPalettes = [];

			const colors = generateExportColors();

			expect(Object.keys(colors).length).toBeGreaterThanOrEqual(13);
		});

		it("パレット名をケバブケースに変換する", () => {
			state.shadesPalettes = [
				{
					id: "test-palette",
					name: "Brand Color",
					keyColors: ["#FF6600"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];

			const colors = generateExportColors();

			expect(
				Object.keys(colors).some((k) => k.startsWith("brand-color-")),
			).toBe(true);
		});

		it("空のパレットでは空のオブジェクトを返す", () => {
			state.palettes = [];
			state.shadesPalettes = [];

			const colors = generateExportColors();

			expect(Object.keys(colors).length).toBe(0);
		});

		it("生成された色がColorインスタンスである", () => {
			state.shadesPalettes = [
				{
					id: "test-primary",
					name: "Primary",
					keyColors: ["#0066CC"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];

			const colors = generateExportColors();

			for (const color of Object.values(colors)) {
				expect(color).toBeInstanceOf(Color);
			}
		});
	});

	describe("getExportContent", () => {
		beforeEach(() => {
			state.shadesPalettes = [
				{
					id: "test-primary",
					name: "Primary",
					keyColors: ["#0066CC"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];
		});

		it("CSS形式でエクスポートする", () => {
			const content = getExportContent("css");

			expect(content).toContain(":root");
			expect(content).toContain("--");
		});

		it("Tailwind形式でエクスポートする", () => {
			const content = getExportContent("tailwind");

			expect(content).toContain("module.exports");
		});

		it("JSON形式でエクスポートする", () => {
			const content = getExportContent("json");

			// JSONとしてパース可能
			const parsed = JSON.parse(content);
			expect(parsed).toBeDefined();
		});
	});

	describe("semantic/link token inclusion (CSS/Tailwind)", () => {
		beforeAll(async () => {
			await loadDadsTokens();
		});

		beforeEach(() => {
			state.shadesPalettes = [
				{
					id: "test-primary",
					name: "Primary",
					keyColors: ["#0066CC"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
					baseChromaName: "Blue",
					step: 600,
				},
			];
		});

		it("should include semantic/link variables in CSS export", () => {
			const content = getExportContent("css");

			expect(content).toContain("--color-success:");
			expect(content).toContain("--color-error:");
			expect(content).toContain("--color-warning:");
			expect(content).toContain("--color-link:");

			// Primary は 1トークンのみ（スケールは出さない）
			expect(content).toContain("--color-primary:");
			expect(content).not.toContain("--color-primary-50:");
		});

		it("should include semantic/link sections with DEFAULT in Tailwind export", () => {
			const content = getExportContent("tailwind");

			expect(content).toContain('"success"');
			expect(content).toContain('"DEFAULT"');
			expect(content).toContain('"error"');
			expect(content).toContain('"warning"');
			expect(content).toContain('"link"');

			// Primary は 1トークンのみ（primary-50 などは出さない）
			expect(content).toContain('"primary"');
			expect(content).not.toContain("primary-50");

			// DADS primitives should be included
			expect(content).toContain('"dads"');
			expect(content).toContain('"primitive"');

			// Tailwind export should be standalone: include CSS variable definitions
			expect(content).toContain("plugins");
			expect(content).toContain("addBase");
			expect(content).toContain('"--color-primary"');
			expect(content).toContain('"--color-primitive-blue-50"');
		});

		it("should include DADS primitives in JSON export", () => {
			const content = getExportContent("json");
			const parsed = JSON.parse(content);

			// color.dads.primitive.blue.50 が存在する
			expect(parsed).toHaveProperty("color.dads.primitive.blue.50.$value");
			expect(parsed.color.dads.primitive.blue["50"].$type).toBe("color");

			// role tokens should alias to DADS primitives when possible
			expect(parsed.color.primary.$value).toBe(
				"{color.dads.primitive.blue.600}",
			);
		});
	});

	describe("downloadFile", () => {
		// downloadFileはDOM操作を含むため、ユニットテストではスキップ
		// E2Eテストで検証する（Task 6.3）
		it.skip("ダウンロードリンクを作成してクリックする（E2Eで検証）", () => {
			expect(() => {
				downloadFile("test content", "test.txt", "text/plain");
			}).not.toThrow();
		});
	});

	describe("setupExportHandlers", () => {
		const originalDocument = globalThis.document;
		const originalHTMLElement = globalThis.HTMLElement;
		let dom: JSDOM | null = null;

		beforeEach(() => {
			dom = new JSDOM(
				'<!doctype html><html><body><button class="studio-export-btn">Export</button><dialog id="export-dialog"><div id="export-format-buttons"><button data-format="css" data-active="true">CSS</button><button data-format="tailwind">Tailwind</button><button data-format="json">JSON</button></div><textarea id="export-area" readonly></textarea><button id="export-copy-btn">Copy</button><button id="export-download-btn">Download</button></dialog></body></html>',
			);
			// @ts-expect-error: JSDOM環境でグローバルを上書き
			globalThis.document = dom.window.document;
			// @ts-expect-error: JSDOM環境でグローバルを上書き
			globalThis.HTMLElement = dom.window.HTMLElement;
		});

		afterEach(() => {
			// @ts-expect-error: 元の値を復元
			globalThis.document = originalDocument;
			// @ts-expect-error: 元の値を復元
			globalThis.HTMLElement = originalHTMLElement;
			dom?.window.close();
			dom = null;
		});

		it("delegated .studio-export-btn click populates preview and syncs modal state", () => {
			state.shadesPalettes = [
				{
					id: "test-primary",
					name: "Primary",
					keyColors: ["#0066CC"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];

			const exportDialog = document.getElementById(
				"export-dialog",
			) as HTMLDialogElement | null;
			const exportArea = document.getElementById(
				"export-area",
			) as HTMLTextAreaElement | null;

			expect(exportDialog).toBeTruthy();
			expect(exportArea).toBeTruthy();

			if (!exportDialog || !exportArea) return;

			// JSDOMではshowModalが未実装のことがあるためスタブする
			// @ts-expect-error: テスト用にshowModalを上書き
			exportDialog.showModal = () => {
				exportDialog.setAttribute("open", "");
			};

			setupExportHandlers({
				exportBtn: null,
				exportDialog,
				exportArea,
				exportFormatButtons: document.querySelectorAll(
					"#export-format-buttons button",
				),
				exportCopyBtn: document.getElementById("export-copy-btn"),
				exportDownloadBtn: document.getElementById("export-download-btn"),
			});

			const trigger =
				document.querySelector<HTMLButtonElement>(".studio-export-btn");
			expect(trigger).toBeTruthy();
			if (!trigger) return;

			trigger.click();

			expect(exportArea.value).toContain(":root");
			expect(document.documentElement.classList.contains("is-modal-open")).toBe(
				true,
			);

			// close イベントでもscroll lock状態が解除される
			exportDialog.removeAttribute("open");
			if (!dom) {
				throw new Error("Expected JSDOM to be initialized in beforeEach");
			}
			exportDialog.dispatchEvent(new dom.window.Event("close"));

			expect(document.documentElement.classList.contains("is-modal-open")).toBe(
				false,
			);
		});
	});

	describe("warning pattern filter", () => {
		beforeEach(() => {
			resetState();
		});

		it("should include Warning-YL palettes when yellow pattern is selected", () => {
			state.semanticColorConfig.warningPattern = "yellow";
			state.shadesPalettes = [
				{
					id: "warning-yl",
					name: "Warning-YL1",
					keyColors: ["#FFD700"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
				{
					id: "warning-or",
					name: "Warning-OR1",
					keyColors: ["#FF8C00"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];

			const colors = generateExportColors();

			// 黄色パターンが含まれる
			expect(
				Object.keys(colors).some((k) => k.startsWith("warning-yl1-")),
			).toBe(true);
			// オレンジパターンは含まれない
			expect(
				Object.keys(colors).some((k) => k.startsWith("warning-or1-")),
			).toBe(false);
		});

		it("should include Warning-OR palettes when orange pattern is selected", () => {
			state.semanticColorConfig.warningPattern = "orange";
			state.shadesPalettes = [
				{
					id: "warning-yl",
					name: "Warning-YL1",
					keyColors: ["#FFD700"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
				{
					id: "warning-or",
					name: "Warning-OR1",
					keyColors: ["#FF8C00"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];

			const colors = generateExportColors();

			// オレンジパターンが含まれる
			expect(
				Object.keys(colors).some((k) => k.startsWith("warning-or1-")),
			).toBe(true);
			// 黄色パターンは含まれない
			expect(
				Object.keys(colors).some((k) => k.startsWith("warning-yl1-")),
			).toBe(false);
		});

		it("should use resolved pattern when auto is selected", () => {
			state.semanticColorConfig.warningPattern = "auto";
			state.semanticColorConfig.resolvedWarningPattern = "orange";
			state.shadesPalettes = [
				{
					id: "warning-yl",
					name: "Warning-YL1",
					keyColors: ["#FFD700"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
				{
					id: "warning-or",
					name: "Warning-OR1",
					keyColors: ["#FF8C00"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];

			const colors = generateExportColors();

			// resolvedがorangeなのでオレンジパターンが含まれる
			expect(
				Object.keys(colors).some((k) => k.startsWith("warning-or1-")),
			).toBe(true);
			// 黄色パターンは含まれない
			expect(
				Object.keys(colors).some((k) => k.startsWith("warning-yl1-")),
			).toBe(false);
		});

		it("should fallback to yellow when auto has no resolved pattern", () => {
			state.semanticColorConfig.warningPattern = "auto";
			state.semanticColorConfig.resolvedWarningPattern = undefined;
			state.shadesPalettes = [
				{
					id: "warning-yl",
					name: "Warning-YL1",
					keyColors: ["#FFD700"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
				{
					id: "warning-or",
					name: "Warning-OR1",
					keyColors: ["#FF8C00"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];

			const colors = generateExportColors();

			// デフォルトは黄色
			expect(
				Object.keys(colors).some((k) => k.startsWith("warning-yl1-")),
			).toBe(true);
			// オレンジパターンは含まれない
			expect(
				Object.keys(colors).some((k) => k.startsWith("warning-or1-")),
			).toBe(false);
		});

		it("should include non-warning palettes regardless of pattern", () => {
			state.semanticColorConfig.warningPattern = "yellow";
			state.shadesPalettes = [
				{
					id: "primary",
					name: "Primary",
					keyColors: ["#0066CC"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
				{
					id: "error",
					name: "Error",
					keyColors: ["#FF0000"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];

			const colors = generateExportColors();

			// 警告以外のパレットは常に含まれる
			expect(Object.keys(colors).some((k) => k.startsWith("primary-"))).toBe(
				true,
			);
			expect(Object.keys(colors).some((k) => k.startsWith("error-"))).toBe(
				true,
			);
		});
	});

	describe("export dialog open (delegated trigger)", () => {
		let previousDocument: typeof document | undefined;
		let previousHTMLElement: typeof HTMLElement | undefined;
		let previousMouseEvent: typeof MouseEvent | undefined;

		beforeEach(() => {
			resetState();

			previousDocument = global.document;
			previousHTMLElement = global.HTMLElement;
			previousMouseEvent = global.MouseEvent;

			const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
			global.document = dom.window.document;
			global.HTMLElement = dom.window.HTMLElement as typeof HTMLElement;
			global.MouseEvent = dom.window.MouseEvent as typeof MouseEvent;

			state.shadesPalettes = [
				{
					id: "test-primary",
					name: "Primary",
					keyColors: ["#0066CC"],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: "none" as never,
				},
			];
		});

		afterEach(() => {
			global.document = previousDocument as typeof document;
			global.HTMLElement = previousHTMLElement as typeof HTMLElement;
			global.MouseEvent = previousMouseEvent as typeof MouseEvent;
		});

		it("should populate export preview when clicking .studio-export-btn", () => {
			const exportDialog = document.createElement("dialog");
			const exportArea = document.createElement("textarea");
			const formatButtons = document.createElement("div");

			formatButtons.id = "export-format-buttons";
			formatButtons.innerHTML = `
				<button data-format="css" data-active="true">CSS</button>
				<button data-format="tailwind">Tailwind</button>
				<button data-format="json">JSON</button>
			`;

			Object.defineProperty(exportDialog, "showModal", {
				value: () => {
					exportDialog.setAttribute("open", "");
				},
				configurable: true,
			});

			document.body.appendChild(exportDialog);
			document.body.appendChild(exportArea);
			document.body.appendChild(formatButtons);

			setupExportHandlers({
				exportBtn: null,
				exportDialog,
				exportArea,
				exportFormatButtons: document.querySelectorAll(
					"#export-format-buttons button",
				),
				exportCopyBtn: null,
				exportDownloadBtn: null,
			});

			const trigger = document.createElement("button");
			trigger.className = "studio-export-btn";
			document.body.appendChild(trigger);

			expect(exportArea.value).toBe("");
			trigger.dispatchEvent(
				new MouseEvent("click", {
					bubbles: true,
				}),
			);

			expect(exportArea.value).not.toBe("");
			expect(document.documentElement.classList.contains("is-modal-open")).toBe(
				true,
			);
		});
	});
});

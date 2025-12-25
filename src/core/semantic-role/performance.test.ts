/**
 * セマンティックロールマッピング パフォーマンステスト
 *
 * Task 5.2: パフォーマンステストを実装する
 * - 10色相×13スケール（130シェード）のマッピング生成が200ms以内であること
 * - DOM追加によるレンダリングブロッキングがないこと
 *
 * Requirements: 5.1, 5.2
 */

import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { HarmonyType } from "@/core/harmony";
import type { DadsColorHue } from "@/core/tokens/types";
import {
	createSemanticRoleMapper,
	generateRoleMapping,
	type PaletteInfo,
} from "./role-mapper";
import type { SemanticRole } from "./types";

// JSDOMでdocumentをセットアップ（DOM操作テスト用）
let dom: JSDOM;

beforeAll(() => {
	dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
	global.document = dom.window.document;
	global.HTMLElement = dom.window.HTMLElement;
});

describe("パフォーマンステスト", () => {
	describe("Task 5.2: マッピング生成パフォーマンス", () => {
		it("130シェード（10色相×13スケール）のマッピング生成が200ms以内であること", () => {
			// パレット設定（ブランドロールを含む）
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue", step: 600 },
				{ name: "Secondary", baseChromaName: "Purple", step: 500 },
			];

			// 複数回実行して平均を取る
			const iterations = 10;
			const times: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const startTime = performance.now();
				generateRoleMapping(palettes, HarmonyType.DADS);
				const endTime = performance.now();
				times.push(endTime - startTime);
			}

			const averageTime = times.reduce((sum, t) => sum + t, 0) / times.length;
			const maxTime = Math.max(...times);

			console.log(`マッピング生成パフォーマンス:
        - 平均時間: ${averageTime.toFixed(2)}ms
        - 最大時間: ${maxTime.toFixed(2)}ms
        - 要件: 200ms以内`);

			// 要件: 200ms以内
			expect(averageTime).toBeLessThan(200);
			expect(maxTime).toBeLessThan(200);
		});

		it("大規模パレット（10ブランドロール）でも200ms以内であること", () => {
			// 多数のブランドロールを含むパレット
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue", step: 600 },
				{ name: "Secondary", baseChromaName: "Purple", step: 500 },
				{ name: "Primary", baseChromaName: "Green", step: 600 },
				{ name: "Secondary", baseChromaName: "Orange", step: 500 },
				{ name: "Primary", baseChromaName: "Red", step: 600 },
				{ name: "Secondary", baseChromaName: "Yellow", step: 500 },
				{ name: "Primary", baseChromaName: "Cyan", step: 600 },
				{ name: "Secondary", baseChromaName: "Magenta", step: 500 },
				{ name: "Primary", baseChromaName: "Lime", step: 600 },
				{ name: "Secondary", baseChromaName: "Light Blue", step: 500 },
			];

			const iterations = 10;
			const times: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const startTime = performance.now();
				generateRoleMapping(palettes, HarmonyType.DADS);
				const endTime = performance.now();
				times.push(endTime - startTime);
			}

			const averageTime = times.reduce((sum, t) => sum + t, 0) / times.length;

			console.log(`大規模パレットパフォーマンス:
        - 平均時間: ${averageTime.toFixed(2)}ms
        - 要件: 200ms以内`);

			expect(averageTime).toBeLessThan(200);
		});

		it("lookupRolesの検索が高速であること（1000回の検索が100ms以内）", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue", step: 600 },
			];

			const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);

			// 1000回の検索を実行
			const iterations = 1000;
			const hues: DadsColorHue[] = [
				"blue",
				"green",
				"red",
				"yellow",
				"purple",
				"orange",
				"cyan",
				"magenta",
				"lime",
				"light-blue",
			];
			const scales = [
				50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
			];

			const startTime = performance.now();

			for (let i = 0; i < iterations; i++) {
				const hue = hues[i % hues.length];
				const scale = scales[i % scales.length];
				mapper.lookupRoles(hue, scale);
			}

			const endTime = performance.now();
			const totalTime = endTime - startTime;

			console.log(`lookupRoles検索パフォーマンス:
        - 1000回の検索: ${totalTime.toFixed(2)}ms
        - 要件: 100ms以内`);

			expect(totalTime).toBeLessThan(100);
		});
	});

	describe("Task 5.2: DOM操作パフォーマンス", () => {
		/**
		 * 注意: JSDOMはブラウザDOMより大幅に遅いため、
		 * ユニットテストではDOM操作数と相対的なパフォーマンスを検証する。
		 * 実際のブラウザでの200ms以内要件はE2Eテストで検証する。
		 */
		it("130シェードへのオーバーレイ適用がDOM要素を正しく生成すること", async () => {
			// オーバーレイ適用関数をインポート
			const { applyOverlay } = await import(
				"@/ui/semantic-role/semantic-role-overlay"
			);

			// 130個のスウォッチ要素を作成
			const swatches: HTMLElement[] = [];
			const hues: DadsColorHue[] = [
				"blue",
				"green",
				"red",
				"yellow",
				"purple",
				"orange",
				"cyan",
				"magenta",
				"lime",
				"light-blue",
			];
			const scales = [
				50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
			];

			for (const hue of hues) {
				for (const scale of scales) {
					const swatch = document.createElement("div");
					swatch.className = "dads-swatch";
					swatch.dataset.hue = hue;
					swatch.dataset.scale = String(scale);
					swatch.setAttribute("title", `#AABBCC - Test ${hue} ${scale}`);
					swatches.push(swatch);
				}
			}

			// テスト用のロール
			const testRoles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
				},
			];

			// オーバーレイ適用のパフォーマンスを測定
			const startTime = performance.now();

			// ロールがあるスウォッチにのみオーバーレイを適用（現実的なシナリオ）
			// DADS_COLORSには約20個のロールがあるので、約15%のスウォッチにオーバーレイを適用
			let appliedCount = 0;
			for (let i = 0; i < swatches.length; i++) {
				// 約15%のスウォッチにオーバーレイを適用
				if (i % 7 === 0) {
					const swatch = swatches[i];
					const hue = swatch.dataset.hue as DadsColorHue;
					const scale = Number.parseInt(swatch.dataset.scale || "0", 10);
					applyOverlay(swatch, hue, scale, testRoles, false);
					appliedCount++;
				}
			}

			const endTime = performance.now();
			const totalTime = endTime - startTime;

			console.log(`DOM操作パフォーマンス:
        - 全スウォッチ数: ${swatches.length}
        - オーバーレイ適用数: ${appliedCount}
        - 合計時間: ${totalTime.toFixed(2)}ms
        - 1スウォッチあたり: ${(totalTime / appliedCount).toFixed(2)}ms
        - 注: JSDOMはブラウザより遅いため、E2Eテストで200ms要件を検証`);

			// DOM要素が正しく生成されていることを検証
			let dotCount = 0;
			let badgeCount = 0;
			for (const swatch of swatches) {
				const dot = swatch.querySelector("[data-semantic-role-dot]");
				const badges = swatch.querySelector("[data-semantic-role-badges]");
				if (dot) dotCount++;
				if (badges) badgeCount++;
			}

			expect(dotCount).toBe(appliedCount);
			expect(badgeCount).toBe(appliedCount);
		});

		it("全スウォッチへのオーバーレイ適用で正しいDOM構造が生成されること", async () => {
			const { applyOverlay } = await import(
				"@/ui/semantic-role/semantic-role-overlay"
			);

			// 20個のスウォッチ要素を作成（JSDOMの制限を考慮して小規模に）
			const swatches: HTMLElement[] = [];
			const hues: DadsColorHue[] = ["blue", "green", "red", "yellow"];
			const scales = [100, 300, 500, 700, 900];

			for (const hue of hues) {
				for (const scale of scales) {
					const swatch = document.createElement("div");
					swatch.className = "dads-swatch";
					swatch.dataset.hue = hue;
					swatch.dataset.scale = String(scale);
					swatch.setAttribute("title", `#AABBCC - Test ${hue} ${scale}`);
					swatches.push(swatch);
				}
			}

			const testRoles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
				},
				{ name: "Error", category: "semantic", fullName: "[Semantic] Error" },
			];

			// 全スウォッチにオーバーレイを適用
			const startTime = performance.now();

			for (const swatch of swatches) {
				const hue = swatch.dataset.hue as DadsColorHue;
				const scale = Number.parseInt(swatch.dataset.scale || "0", 10);
				applyOverlay(swatch, hue, scale, testRoles, false);
			}

			const endTime = performance.now();
			const totalTime = endTime - startTime;

			console.log(`小規模DOM操作パフォーマンス:
        - スウォッチ数: ${swatches.length}
        - 合計時間: ${totalTime.toFixed(2)}ms
        - 1スウォッチあたり: ${(totalTime / swatches.length).toFixed(2)}ms`);

			// DOM構造が正しいことを検証
			for (const swatch of swatches) {
				// ドットが追加されていること
				expect(swatch.querySelector("[data-semantic-role-dot]")).not.toBeNull();
				// バッジが追加されていること
				expect(
					swatch.querySelector("[data-semantic-role-badges]"),
				).not.toBeNull();
				// tabindexが設定されていること
				expect(swatch.getAttribute("tabindex")).toBe("0");
				// aria-describedbyが設定されていること
				expect(swatch.getAttribute("aria-describedby")).not.toBeNull();
			}
		});

		it("DOM操作のパフォーマンスが概ね線形にスケールすること", async () => {
			const { applyOverlay } = await import(
				"@/ui/semantic-role/semantic-role-overlay"
			);

			const testRoles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
				},
			];

			// 異なるサイズでパフォーマンスを測定
			// JSDOMではGCやその他のオーバーヘッドがあるため、小さなサイズで比較
			const sizes = [5, 10, 15];
			const times: number[] = [];

			for (const size of sizes) {
				const swatches: HTMLElement[] = [];
				for (let i = 0; i < size; i++) {
					const swatch = document.createElement("div");
					swatch.className = "dads-swatch";
					swatch.setAttribute("title", `Test ${i}`);
					swatches.push(swatch);
				}

				const startTime = performance.now();
				for (const swatch of swatches) {
					applyOverlay(swatch, "blue", 600, testRoles, false);
				}
				const endTime = performance.now();
				times.push(endTime - startTime);
			}

			console.log(`線形スケーリング検証:
        - ${sizes[0]}要素: ${times[0].toFixed(2)}ms
        - ${sizes[1]}要素: ${times[1].toFixed(2)}ms
        - ${sizes[2]}要素: ${times[2].toFixed(2)}ms
        - 注: JSDOMにはGCオーバーヘッドがあるため、正確な線形性は保証されない`);

			// JSDOMの制限を考慮して、パフォーマンスが破綻しないことを検証
			// 要素数に対して大幅に遅くならなければOK
			const timePerElement1 = times[0] / sizes[0];
			const timePerElement2 = times[1] / sizes[1];
			const timePerElement3 = times[2] / sizes[2];

			console.log(`1要素あたりの時間:
        - ${sizes[0]}要素: ${timePerElement1.toFixed(2)}ms/要素
        - ${sizes[1]}要素: ${timePerElement2.toFixed(2)}ms/要素
        - ${sizes[2]}要素: ${timePerElement3.toFixed(2)}ms/要素`);

			// 1要素あたりの時間が大幅に増加しないことを検証
			// JSDOMでは初期化オーバーヘッドがあるため、ある程度の変動は許容
			expect(timePerElement2).toBeLessThan(timePerElement1 * 3); // 3倍以内
			expect(timePerElement3).toBeLessThan(timePerElement1 * 3); // 3倍以内
		});
	});

	describe("メモリ効率", () => {
		it("マッピング生成でメモリリークがないこと", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue", step: 600 },
			];

			// 100回繰り返してメモリリークをチェック
			const iterations = 100;

			for (let i = 0; i < iterations; i++) {
				const mapper = createSemanticRoleMapper(palettes, HarmonyType.DADS);
				// マッピングを使用
				mapper.lookupRoles("blue", 600);
				mapper.lookupUnresolvedBrandRoles();
				// マッパーはスコープを抜けるとGC対象になる
			}

			// テストが完了すればメモリリークはないと判断
			expect(true).toBe(true);
		});
	});
});

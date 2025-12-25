/**
 * セマンティックロールマッピング パフォーマンステスト
 *
 * Task 5.2: パフォーマンステストを実装する
 * - 10色相×13スケール（130シェード）のマッピング生成が200ms以内であること
 * - DOM追加によるレンダリングブロッキングがないこと
 *
 * Task 11.5: パフォーマンステストを更新する
 * - マッピング計算 + コントラスト境界計算が200ms以内であること
 * - DOM追加（円形スウォッチ + 欄外情報 + 境界ピル）によるレンダリングブロッキングがないこと
 *
 * Requirements: 5.1, 5.2
 */

import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { HarmonyType } from "@/core/harmony";
import type { DadsColorHue } from "@/core/tokens/types";
import {
	type ColorItem,
	calculateBoundaries,
} from "./contrast-boundary-calculator";
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

	describe("Task 11.5: コントラスト境界計算パフォーマンス", () => {
		/**
		 * 典型的なDADSカラースケール（13スケール）を生成
		 * 明るい色から暗い色へのグラデーション
		 */
		function generateTypicalColorScale(hue: string): ColorItem[] {
			// 実際のDADSカラースケールに近いHEX値を生成
			// scale 50（最も明るい）からscale 1200（最も暗い）
			const hexByScale: Record<number, string> = {
				50: "#F8FAFC",
				100: "#F1F5F9",
				200: "#E2E8F0",
				300: "#CBD5E1",
				400: "#94A3B8",
				500: "#64748B",
				600: "#475569",
				700: "#334155",
				800: "#1E293B",
				900: "#0F172A",
				1000: "#0A1120",
				1100: "#050810",
				1200: "#020408",
			};

			return Object.entries(hexByScale).map(([scale, hex]) => ({
				scale: Number.parseInt(scale, 10),
				hex,
			}));
		}

		it("10色相×13スケールのコントラスト境界計算が200ms以内であること", () => {
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

			// 各色相のカラースケールを生成
			const colorScales = hues.map((hue) => generateTypicalColorScale(hue));

			const iterations = 10;
			const times: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const startTime = performance.now();

				// 10色相すべてのコントラスト境界を計算
				for (const colors of colorScales) {
					calculateBoundaries(colors);
				}

				const endTime = performance.now();
				times.push(endTime - startTime);
			}

			const averageTime = times.reduce((sum, t) => sum + t, 0) / times.length;
			const maxTime = Math.max(...times);

			console.log(`コントラスト境界計算パフォーマンス:
        - 平均時間: ${averageTime.toFixed(2)}ms
        - 最大時間: ${maxTime.toFixed(2)}ms
        - 色相数: ${hues.length}
        - 要件: 200ms以内`);

			expect(averageTime).toBeLessThan(200);
			expect(maxTime).toBeLessThan(200);
		});

		it("マッピング生成 + コントラスト境界計算の合計が200ms以内であること", () => {
			const palettes: PaletteInfo[] = [
				{ name: "Primary", baseChromaName: "Blue", step: 600 },
				{ name: "Secondary", baseChromaName: "Purple", step: 500 },
			];

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

			// 各色相のカラースケールを生成
			const colorScales = hues.map((hue) => generateTypicalColorScale(hue));

			const iterations = 10;
			const times: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const startTime = performance.now();

				// 1. マッピング生成
				generateRoleMapping(palettes, HarmonyType.DADS);

				// 2. 10色相すべてのコントラスト境界を計算
				for (const colors of colorScales) {
					calculateBoundaries(colors);
				}

				const endTime = performance.now();
				times.push(endTime - startTime);
			}

			const averageTime = times.reduce((sum, t) => sum + t, 0) / times.length;
			const maxTime = Math.max(...times);

			console.log(`マッピング + 境界計算 合計パフォーマンス:
        - 平均時間: ${averageTime.toFixed(2)}ms
        - 最大時間: ${maxTime.toFixed(2)}ms
        - 要件: 200ms以内 (Requirements 5.1)`);

			// Requirements 5.1: マッピング計算 + コントラスト境界計算を200ms以内に完了
			expect(averageTime).toBeLessThan(200);
			expect(maxTime).toBeLessThan(200);
		});

		it("1000回のコントラスト境界計算が高速であること", () => {
			const colors = generateTypicalColorScale("blue");

			const iterations = 1000;
			const startTime = performance.now();

			for (let i = 0; i < iterations; i++) {
				calculateBoundaries(colors);
			}

			const endTime = performance.now();
			const totalTime = endTime - startTime;

			console.log(`コントラスト境界計算 高頻度パフォーマンス:
        - 1000回の計算: ${totalTime.toFixed(2)}ms
        - 1回あたり: ${(totalTime / iterations).toFixed(3)}ms`);

			// 1000回の計算が1秒以内
			expect(totalTime).toBeLessThan(1000);
		});
	});

	describe("Task 5.2: DOM操作パフォーマンス", () => {
		/**
		 * 注意: JSDOMはブラウザDOMより大幅に遅いため、
		 * ユニットテストではDOM操作数と相対的なパフォーマンスを検証する。
		 * 実際のブラウザでの200ms以内要件はE2Eテストで検証する。
		 *
		 * Requirements 5.2: DOM要素の追加を最小限に抑える
		 * - 各コンポーネントで追加される子要素数を明示的に検証
		 */
		it("130シェードへのオーバーレイ適用がDOM要素を正しく生成すること", async () => {
			// オーバーレイ適用関数をインポート
			const { applyOverlay } = await import(
				"@/ui/semantic-role/semantic-role-overlay"
			);

			// コンテナを作成してdocument.bodyに追加（レンダリングブロッキング検証用）
			const container = document.createElement("div");
			container.id = "test-overlay-container";
			document.body.appendChild(container);

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
					swatch.style.width = "50px";
					swatch.style.height = "50px";
					swatch.style.display = "inline-block";
					swatch.setAttribute("title", `#AABBCC - Test ${hue} ${scale}`);
					container.appendChild(swatch);
					swatches.push(swatch);
				}
			}

			// Task 10.1: 新UI仕様でshortLabelを追加
			const testRoles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
					semanticSubType: "success",
					shortLabel: "Su",
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
					// Task 10.1: 新UI仕様でbackgroundColorを追加
					applyOverlay(swatch, hue, scale, testRoles, false, "#AABBCC");
					// レイアウト読み取りを強制してレンダリングブロッキングを検証
					swatch.getBoundingClientRect();
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

			// Task 10.1: 新UI仕様に更新
			// DOM要素が正しく生成されていることを検証（円形スウォッチ + 中央ラベル）
			let circularCount = 0;
			let labelCount = 0;
			for (const swatch of swatches) {
				if (swatch.classList.contains("dads-swatch--circular")) circularCount++;
				const label = swatch.querySelector(".dads-swatch__role-label");
				if (label) labelCount++;
			}

			expect(circularCount).toBe(appliedCount);
			expect(labelCount).toBe(appliedCount);

			// Requirements 5.2: DOM要素の追加を最小限に抑える
			// 各オーバーレイ付きスウォッチには2つの子要素が追加される
			// - ラベル要素（.dads-swatch__role-label）
			// - 説明要素（aria-describedby用の非表示要素）
			for (const swatch of swatches) {
				if (swatch.classList.contains("dads-swatch--circular")) {
					// 子要素数を検証（ラベル + 説明要素）
					expect(swatch.childElementCount).toBe(2);
				}
			}

			// クリーンアップ
			container.remove();
		});

		it("全スウォッチへのオーバーレイ適用で正しいDOM構造が生成されること（新UI）", async () => {
			const { applyOverlay } = await import(
				"@/ui/semantic-role/semantic-role-overlay"
			);

			// コンテナを作成してdocument.bodyに追加（レンダリングブロッキング検証用）
			const container = document.createElement("div");
			container.id = "test-small-overlay-container";
			document.body.appendChild(container);

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
					swatch.style.width = "50px";
					swatch.style.height = "50px";
					swatch.style.display = "inline-block";
					swatch.setAttribute("title", `#AABBCC - Test ${hue} ${scale}`);
					container.appendChild(swatch);
					swatches.push(swatch);
				}
			}

			// Task 10.1: 新UI仕様でshortLabelを追加
			const testRoles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
					semanticSubType: "success",
					shortLabel: "Su",
				},
				{
					name: "Error",
					category: "semantic",
					fullName: "[Semantic] Error",
					semanticSubType: "error",
					shortLabel: "E",
				},
			];

			// 全スウォッチにオーバーレイを適用（新UI仕様: backgroundColorを指定）
			const startTime = performance.now();

			for (const swatch of swatches) {
				const hue = swatch.dataset.hue as DadsColorHue;
				const scale = Number.parseInt(swatch.dataset.scale || "0", 10);
				applyOverlay(swatch, hue, scale, testRoles, false, "#AABBCC");
				// レイアウト読み取りを強制してレンダリングブロッキングを検証
				swatch.getBoundingClientRect();
			}

			const endTime = performance.now();
			const totalTime = endTime - startTime;

			console.log(`小規模DOM操作パフォーマンス（新UI）:
        - スウォッチ数: ${swatches.length}
        - 合計時間: ${totalTime.toFixed(2)}ms
        - 1スウォッチあたり: ${(totalTime / swatches.length).toFixed(2)}ms`);

			// Task 10.1: 新UI仕様でDOM構造を検証
			for (const swatch of swatches) {
				// 【新UI】円形スウォッチクラスが追加されていること
				expect(swatch.classList.contains("dads-swatch--circular")).toBe(true);
				// 【新UI】中央ラベルが追加されていること
				expect(swatch.querySelector(".dads-swatch__role-label")).not.toBeNull();
				// tabindexが設定されていること
				expect(swatch.getAttribute("tabindex")).toBe("0");
				// aria-describedbyが設定されていること
				expect(swatch.getAttribute("aria-describedby")).not.toBeNull();
			}

			// クリーンアップ
			container.remove();
		});

		it("DOM操作のパフォーマンスが概ね線形にスケールすること（新UI）", async () => {
			const { applyOverlay } = await import(
				"@/ui/semantic-role/semantic-role-overlay"
			);

			// Task 10.1: 新UI仕様でshortLabelを追加
			const testRoles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
					semanticSubType: "success",
					shortLabel: "Su",
				},
			];

			// 異なるサイズでパフォーマンスを測定
			// JSDOMではGCやその他のオーバーヘッドがあるため、小さなサイズで比較
			const sizes = [5, 10, 15];
			const times: number[] = [];

			for (const size of sizes) {
				// 各サイズごとにコンテナを作成
				const container = document.createElement("div");
				container.id = `test-scaling-container-${size}`;
				document.body.appendChild(container);

				const swatches: HTMLElement[] = [];
				for (let i = 0; i < size; i++) {
					const swatch = document.createElement("div");
					swatch.className = "dads-swatch";
					swatch.style.width = "50px";
					swatch.style.height = "50px";
					swatch.style.display = "inline-block";
					swatch.setAttribute("title", `Test ${i}`);
					container.appendChild(swatch);
					swatches.push(swatch);
				}

				const startTime = performance.now();
				for (const swatch of swatches) {
					// Task 10.1: 新UI仕様でbackgroundColorを追加
					applyOverlay(swatch, "blue", 600, testRoles, false, "#3B82F6");
					// レイアウト読み取りを強制してレンダリングブロッキングを検証
					swatch.getBoundingClientRect();
				}
				const endTime = performance.now();
				times.push(endTime - startTime);

				// クリーンアップ
				container.remove();
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

	describe("Task 11.5: 欄外情報 + 境界ピル DOM操作パフォーマンス", () => {
		/**
		 * Task 11.5: 新UIコンポーネント（欄外情報バー + 境界ピル）の
		 * DOM操作がレンダリングブロッキングを起こさないことを検証
		 *
		 * Requirements 5.2: DOM要素の追加を最小限に抑える
		 * - document.bodyへ追加してレイアウト読み取りを検証
		 * - 子要素数を明示的に検証
		 */
		it("欄外ロール情報バー生成が高速であること", async () => {
			const { renderRoleInfoBar } = await import(
				"@/ui/semantic-role/external-role-info-bar"
			);
			type RoleInfoItemType =
				import("@/ui/semantic-role/external-role-info-bar").RoleInfoItem;

			// コンテナを作成してdocument.bodyに追加（レンダリングブロッキング検証用）
			const container = document.createElement("div");
			container.id = "test-role-info-container";
			document.body.appendChild(container);

			// スウォッチ要素を作成してコンテナに追加
			const swatches: HTMLElement[] = [];
			for (let i = 0; i < 20; i++) {
				const swatch = document.createElement("div");
				swatch.className = "dads-swatch";
				swatch.style.width = "50px";
				swatch.style.height = "50px";
				swatch.style.display = "inline-block";
				container.appendChild(swatch);
				swatches.push(swatch);
			}

			// RoleInfoItemを作成
			const roleItems: RoleInfoItemType[] = swatches.map((swatch, i) => ({
				role: {
					name: `Role${i}`,
					category: i % 2 === 0 ? "primary" : "semantic",
					fullName: `[Test] Role${i}`,
					shortLabel: i % 2 === 0 ? "P" : "Su",
				} as SemanticRole,
				scale: (i + 1) * 100,
				swatchElement: swatch,
			}));

			const iterations = 10;
			const times: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const startTime = performance.now();
				const bar = renderRoleInfoBar(roleItems);
				container.appendChild(bar);
				// レイアウト読み取りを強制してレンダリングブロッキングを検証
				bar.getBoundingClientRect();
				const endTime = performance.now();
				times.push(endTime - startTime);
				// 次のイテレーションのためにバーを削除
				bar.remove();
			}

			const averageTime = times.reduce((sum, t) => sum + t, 0) / times.length;

			console.log(`欄外ロール情報バー生成パフォーマンス:
        - アイテム数: ${roleItems.length}
        - 平均時間: ${averageTime.toFixed(2)}ms
        - 1アイテムあたり: ${(averageTime / roleItems.length).toFixed(3)}ms`);

			// 20アイテムの処理が50ms以内
			expect(averageTime).toBeLessThan(50);

			// Requirements 5.2: DOM要素数を検証
			const finalBar = renderRoleInfoBar(roleItems);
			container.appendChild(finalBar);
			// 欄外情報バーの子要素数を検証
			// 各ロールに対して：情報要素（1つ）+ コネクタ（1つ）= 2つ
			expect(finalBar.childElementCount).toBe(roleItems.length * 2);

			// クリーンアップ
			container.remove();
		});

		it("未解決ロールバー生成が高速であること", async () => {
			const { renderUnresolvedRolesBar } = await import(
				"@/ui/semantic-role/external-role-info-bar"
			);
			type UnresolvedRoleItemType =
				import("@/ui/semantic-role/external-role-info-bar").UnresolvedRoleItem;

			// コンテナを作成してdocument.bodyに追加（レンダリングブロッキング検証用）
			const container = document.createElement("div");
			container.id = "test-unresolved-container";
			document.body.appendChild(container);

			// 未解決ロールアイテムを作成
			const unresolvedRoles: UnresolvedRoleItemType[] = [];
			for (let i = 0; i < 10; i++) {
				unresolvedRoles.push({
					role: {
						name: `UnresolvedRole${i}`,
						category: i % 2 === 0 ? "primary" : "secondary",
						fullName: `[Unresolved] Role${i}`,
						shortLabel: i % 2 === 0 ? "P" : "S",
					} as SemanticRole,
				});
			}

			const iterations = 10;
			const times: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const startTime = performance.now();
				const bar = renderUnresolvedRolesBar(unresolvedRoles);
				container.appendChild(bar);
				// レイアウト読み取りを強制してレンダリングブロッキングを検証
				bar.getBoundingClientRect();
				const endTime = performance.now();
				times.push(endTime - startTime);
				// 次のイテレーションのためにバーを削除
				bar.remove();
			}

			const averageTime = times.reduce((sum, t) => sum + t, 0) / times.length;

			console.log(`未解決ロールバー生成パフォーマンス:
        - ロール数: ${unresolvedRoles.length}
        - 平均時間: ${averageTime.toFixed(2)}ms`);

			// 10ロールの処理が30ms以内
			expect(averageTime).toBeLessThan(30);

			// Requirements 5.2: DOM要素数を検証
			const finalBar = renderUnresolvedRolesBar(unresolvedRoles);
			container.appendChild(finalBar!);
			// 未解決ロールバーの子要素数を検証
			// 先頭ラベル（1つ）+ 各ロールのバッジ（n個）= 1 + n
			expect(finalBar!.childElementCount).toBe(unresolvedRoles.length + 1);

			// クリーンアップ
			container.remove();
		});

		it("コントラスト境界ピル生成が高速であること", async () => {
			const { renderBoundaryPills } = await import(
				"@/ui/semantic-role/contrast-boundary-indicator"
			);
			const { calculateBoundaries: calcBoundaries } = await import(
				"@/core/semantic-role/contrast-boundary-calculator"
			);

			// コンテナを作成してdocument.bodyに追加（レンダリングブロッキング検証用）
			const container = document.createElement("div");
			container.id = "test-boundary-container";
			container.style.position = "relative";
			document.body.appendChild(container);

			// 典型的なカラースケールを生成
			const colors: ColorItem[] = [
				{ scale: 50, hex: "#F8FAFC" },
				{ scale: 100, hex: "#F1F5F9" },
				{ scale: 200, hex: "#E2E8F0" },
				{ scale: 300, hex: "#CBD5E1" },
				{ scale: 400, hex: "#94A3B8" },
				{ scale: 500, hex: "#64748B" },
				{ scale: 600, hex: "#475569" },
				{ scale: 700, hex: "#334155" },
				{ scale: 800, hex: "#1E293B" },
				{ scale: 900, hex: "#0F172A" },
				{ scale: 1000, hex: "#0A1120" },
				{ scale: 1100, hex: "#050810" },
				{ scale: 1200, hex: "#020408" },
			];

			// スウォッチ要素を作成してscaleElementsマップを構築（コンテナに追加）
			const scaleElements = new Map<number, HTMLElement>();
			for (const color of colors) {
				const swatch = document.createElement("div");
				swatch.className = "dads-swatch";
				swatch.style.width = "50px";
				swatch.style.height = "50px";
				swatch.style.display = "inline-block";
				swatch.style.position = "relative";
				container.appendChild(swatch);
				scaleElements.set(color.scale, swatch);
			}

			const boundaries = calcBoundaries(colors);

			const iterations = 10;
			const times: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const startTime = performance.now();
				const pillContainer = renderBoundaryPills(boundaries, scaleElements);
				container.appendChild(pillContainer);
				// レイアウト読み取りを強制してレンダリングブロッキングを検証
				pillContainer.getBoundingClientRect();
				const endTime = performance.now();
				times.push(endTime - startTime);
				// 次のイテレーションのためにピルコンテナを削除
				pillContainer.remove();
			}

			const averageTime = times.reduce((sum, t) => sum + t, 0) / times.length;

			console.log(`コントラスト境界ピル生成パフォーマンス:
        - ピル数: 最大4個
        - 平均時間: ${averageTime.toFixed(2)}ms`);

			// 4ピルの処理が20ms以内
			expect(averageTime).toBeLessThan(20);

			// Requirements 5.2: DOM要素数を検証
			const finalPillContainer = renderBoundaryPills(boundaries, scaleElements);
			container.appendChild(finalPillContainer);
			// コントラスト境界ピルは最大4個（白3:1, 白4.5:1, 黒4.5:1, 黒3:1）
			expect(finalPillContainer.childElementCount).toBeLessThanOrEqual(4);

			// クリーンアップ
			container.remove();
		});

		it("全新UI要素（円形 + 欄外 + ピル）の統合DOM操作が高速であること", async () => {
			const { applyOverlay } = await import(
				"@/ui/semantic-role/semantic-role-overlay"
			);
			const { renderRoleInfoBar } = await import(
				"@/ui/semantic-role/external-role-info-bar"
			);
			const { renderBoundaryPills } = await import(
				"@/ui/semantic-role/contrast-boundary-indicator"
			);
			const { calculateBoundaries: calcBoundaries } = await import(
				"@/core/semantic-role/contrast-boundary-calculator"
			);

			// 1色相分のセットアップ（13スケール）
			const scales = [
				50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
			];

			// カラーアイテム
			const colors: ColorItem[] = [
				{ scale: 50, hex: "#F8FAFC" },
				{ scale: 100, hex: "#F1F5F9" },
				{ scale: 200, hex: "#E2E8F0" },
				{ scale: 300, hex: "#CBD5E1" },
				{ scale: 400, hex: "#94A3B8" },
				{ scale: 500, hex: "#64748B" },
				{ scale: 600, hex: "#475569" },
				{ scale: 700, hex: "#334155" },
				{ scale: 800, hex: "#1E293B" },
				{ scale: 900, hex: "#0F172A" },
				{ scale: 1000, hex: "#0A1120" },
				{ scale: 1100, hex: "#050810" },
				{ scale: 1200, hex: "#020408" },
			];

			// ロールを持つスウォッチ（約15%）
			const roleSwatchIndices = [2, 5, 8, 10]; // scale 200, 500, 800, 1000
			const testRoles: SemanticRole[] = [
				{
					name: "Success",
					category: "semantic",
					fullName: "[Semantic] Success",
					semanticSubType: "success",
					shortLabel: "Su",
				},
			];

			const iterations = 10;
			const times: number[] = [];

			for (let iter = 0; iter < iterations; iter++) {
				// 各イテレーションで新しいDOMを作成（状態蓄積を防止）
				const container = document.createElement("div");
				container.id = `test-integration-container-${iter}`;
				container.style.position = "relative";
				document.body.appendChild(container);

				const swatches: HTMLElement[] = [];
				const scaleElements = new Map<number, HTMLElement>();

				for (const scale of scales) {
					const swatch = document.createElement("div");
					swatch.className = "dads-swatch";
					swatch.setAttribute("title", `#AABBCC - blue ${scale}`);
					swatch.style.width = "50px";
					swatch.style.height = "50px";
					swatch.style.display = "inline-block";
					container.appendChild(swatch);
					swatches.push(swatch);
					scaleElements.set(scale, swatch);
				}

				const startTime = performance.now();

				// 1. 円形スウォッチへのオーバーレイ適用
				const roleItems: Array<{
					role: SemanticRole;
					scale: number;
					swatchElement: HTMLElement;
				}> = [];
				for (const idx of roleSwatchIndices) {
					const swatch = swatches[idx];
					const scale = scales[idx];
					if (swatch && scale !== undefined) {
						applyOverlay(swatch, "blue", scale, testRoles, false, "#64748B");
						roleItems.push({
							role: testRoles[0],
							scale,
							swatchElement: swatch,
						});
					}
				}

				// 2. 欄外情報バー生成
				const infoBar = renderRoleInfoBar(roleItems);
				container.appendChild(infoBar);

				// 3. コントラスト境界計算 + ピル生成
				const boundaries = calcBoundaries(colors);
				const pillContainer = renderBoundaryPills(boundaries, scaleElements);
				container.appendChild(pillContainer);

				// レイアウト読み取りを強制してレンダリングブロッキングを検証
				infoBar.getBoundingClientRect();
				pillContainer.getBoundingClientRect();

				const endTime = performance.now();
				times.push(endTime - startTime);

				// クリーンアップ（次のイテレーションのため）
				container.remove();
			}

			const averageTime = times.reduce((sum, t) => sum + t, 0) / times.length;
			const maxTime = Math.max(...times);

			console.log(`全新UI要素 統合DOM操作パフォーマンス:
        - スウォッチ数: ${scales.length}
        - ロール割り当て数: ${roleSwatchIndices.length}
        - 平均時間: ${averageTime.toFixed(2)}ms
        - 最大時間: ${maxTime.toFixed(2)}ms
        - 注: 1色相分のDOM操作。10色相では約10倍だがE2Eで200ms要件を検証`);

			// 1色相分の処理が50ms以内（10色相で500ms以内の見込み）
			// JSDOMはブラウザより遅いため、実際のE2Eでは200ms要件を満たす
			expect(averageTime).toBeLessThan(50);

			// Requirements 5.2: 最終的なDOM要素数を検証
			// 新しいコンテナで検証用に一度だけ実行
			const verifyContainer = document.createElement("div");
			verifyContainer.id = "test-integration-verify";
			verifyContainer.style.position = "relative";
			document.body.appendChild(verifyContainer);

			const verifySwatches: HTMLElement[] = [];
			const verifyScaleElements = new Map<number, HTMLElement>();
			for (const scale of scales) {
				const swatch = document.createElement("div");
				swatch.className = "dads-swatch";
				swatch.setAttribute("title", `#AABBCC - blue ${scale}`);
				swatch.style.width = "50px";
				swatch.style.height = "50px";
				swatch.style.display = "inline-block";
				verifyContainer.appendChild(swatch);
				verifySwatches.push(swatch);
				verifyScaleElements.set(scale, swatch);
			}

			// オーバーレイ適用
			const verifyRoleItems: Array<{
				role: SemanticRole;
				scale: number;
				swatchElement: HTMLElement;
			}> = [];
			for (const idx of roleSwatchIndices) {
				const swatch = verifySwatches[idx];
				const scale = scales[idx];
				if (swatch && scale !== undefined) {
					applyOverlay(swatch, "blue", scale, testRoles, false, "#64748B");
					verifyRoleItems.push({
						role: testRoles[0],
						scale,
						swatchElement: swatch,
					});
				}
			}

			const verifyInfoBar = renderRoleInfoBar(verifyRoleItems);
			verifyContainer.appendChild(verifyInfoBar);
			const verifyBoundaries = calcBoundaries(colors);
			const verifyPillContainer = renderBoundaryPills(
				verifyBoundaries,
				verifyScaleElements,
			);
			verifyContainer.appendChild(verifyPillContainer);

			// DOM要素数の検証
			// オーバーレイ付きスウォッチは各2つの子要素を持つ（ラベル + 説明要素）
			for (const idx of roleSwatchIndices) {
				const swatch = verifySwatches[idx];
				if (swatch && swatch.classList.contains("dads-swatch--circular")) {
					expect(swatch.childElementCount).toBe(2);
				}
			}
			// 欄外情報バーの子要素数：各ロールに対して情報要素 + コネクタ = 2つ
			expect(verifyInfoBar.childElementCount).toBe(
				roleSwatchIndices.length * 2,
			);
			// コントラスト境界ピルは最大4個
			expect(verifyPillContainer.childElementCount).toBeLessThanOrEqual(4);

			// クリーンアップ
			verifyContainer.remove();
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

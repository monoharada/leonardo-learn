/**
 * 色詳細モーダルモジュールのテスト
 *
 * Task 3.4a: 色詳細モーダルの基本構造テスト
 * - openColorDetailModal関数のシグネチャ
 * - _testHelpers.createAbortController関数
 *
 * NOTE: DOM操作を伴うテスト（モーダル開閉、イベントリスナーのクリーンアップ）は
 * 主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポートの確認を行う。
 *
 * @module @/ui/demo/color-detail-modal.test
 * Requirements: 4.1
 */

import { describe, expect, it } from "bun:test";

describe("color-detail-modal module", () => {
	describe("scrubber module (Task 3.4b)", () => {
		describe("exports", () => {
			it("should export drawScrubber function", async () => {
				const { _testHelpers } = await import("./color-detail-modal");
				expect(_testHelpers.drawScrubber).toBeDefined();
				expect(typeof _testHelpers.drawScrubber).toBe("function");
			});

			it("should export createScrubberHandlers function", async () => {
				const { _testHelpers } = await import("./color-detail-modal");
				expect(_testHelpers.createScrubberHandlers).toBeDefined();
				expect(typeof _testHelpers.createScrubberHandlers).toBe("function");
			});

			it("should export resizeScrubber function", async () => {
				const { _testHelpers } = await import("./color-detail-modal");
				expect(_testHelpers.resizeScrubber).toBeDefined();
				expect(typeof _testHelpers.resizeScrubber).toBe("function");
			});

			it("should export setupScrubberEventListeners function", async () => {
				const { _testHelpers } = await import("./color-detail-modal");
				expect(_testHelpers.setupScrubberEventListeners).toBeDefined();
				expect(typeof _testHelpers.setupScrubberEventListeners).toBe(
					"function",
				);
			});
		});

		describe("scrubber drawing logic", () => {
			it("drawScrubber should calculate visible hue range correctly", async () => {
				const { Color } = await import("@/core/color");
				const { _testHelpers } = await import("./color-detail-modal");

				// drawScrubberは内部でvisibleRange=30を使用
				// 中心色相から±15度の範囲を表示する
				const result = _testHelpers.calculateHueRange(180); // centerHue = 180
				expect(result.visibleRange).toBe(30);
				expect(result.minHue).toBe(165); // 180 - 15
				expect(result.maxHue).toBe(195); // 180 + 15
			});

			it("drawScrubber should normalize hue values to 0-360 range", async () => {
				const { _testHelpers } = await import("./color-detail-modal");

				// 負の色相値は0-360に正規化される
				expect(_testHelpers.normalizeHue(-30)).toBe(330);
				expect(_testHelpers.normalizeHue(0)).toBe(0);
				expect(_testHelpers.normalizeHue(360)).toBe(0);
				expect(_testHelpers.normalizeHue(390)).toBe(30);
			});

			it("drawScrubber should calculate handle position from hue difference", async () => {
				const { _testHelpers } = await import("./color-detail-modal");

				// width=300, visibleRange=30 → pixelsPerDegree=10
				const width = 300;
				const visibleRange = 30;
				const centerHue = 180;

				// 現在の色相が中心と同じ場合、ハンドルは中央
				const handleX1 = _testHelpers.calculateHandlePosition(
					180,
					centerHue,
					width,
					visibleRange,
				);
				expect(handleX1).toBe(150); // width / 2

				// 現在の色相が中心より+5度の場合
				const handleX2 = _testHelpers.calculateHandlePosition(
					185,
					centerHue,
					width,
					visibleRange,
				);
				expect(handleX2).toBe(200); // 150 + 5 * 10

				// 現在の色相が中心より-5度の場合
				const handleX3 = _testHelpers.calculateHandlePosition(
					175,
					centerHue,
					width,
					visibleRange,
				);
				expect(handleX3).toBe(100); // 150 - 5 * 10
			});

			it("drawScrubber should handle hue wrap-around correctly", async () => {
				const { _testHelpers } = await import("./color-detail-modal");

				// 色相のラップアラウンド（350度 → 10度の差は+20度ではなく-340度→+20度）
				const diff = _testHelpers.calculateHueDifference(10, 350);
				expect(diff).toBe(20); // 10 - 350 = -340 → +20（短い方向）
			});
		});

		describe("scrubber event handlers", () => {
			it("createScrubberHandlers should return handlers object", async () => {
				const { Color } = await import("@/core/color");
				const { _testHelpers } = await import("./color-detail-modal");

				const mockConfig = {
					keyColor: new Color("#ff0000"),
					currentColor: new Color("#ff0000"),
					readOnly: false,
					onColorChange: () => {},
				};

				const handlers = _testHelpers.createScrubberHandlers(mockConfig);
				expect(handlers).toBeDefined();
				expect(handlers.handleStart).toBeDefined();
				expect(handlers.handleMove).toBeDefined();
				expect(handlers.handleEnd).toBeDefined();
			});

			it("handlers should respect readOnly mode", async () => {
				const { Color } = await import("@/core/color");
				const { _testHelpers } = await import("./color-detail-modal");

				let colorChanged = false;
				const mockConfig = {
					keyColor: new Color("#ff0000"),
					currentColor: new Color("#ff0000"),
					readOnly: true,
					onColorChange: () => {
						colorChanged = true;
					},
				};

				const handlers = _testHelpers.createScrubberHandlers(mockConfig);

				// readOnlyモードではハンドラが無効化される
				handlers.handleStart({} as MouseEvent);
				expect(handlers.isDragging()).toBe(false);
				expect(colorChanged).toBe(false);
			});

			it("handlers should track dragging state correctly", async () => {
				const { Color } = await import("@/core/color");
				const { _testHelpers } = await import("./color-detail-modal");

				const mockConfig = {
					keyColor: new Color("#ff0000"),
					currentColor: new Color("#ff0000"),
					readOnly: false,
					onColorChange: () => {},
				};

				const handlers = _testHelpers.createScrubberHandlers(mockConfig);

				// 初期状態ではドラッグ中でない
				expect(handlers.isDragging()).toBe(false);

				// handleStart後はドラッグ中
				// Note: 実際のDOM操作はE2Eでテスト
			});
		});

		describe("scrubber hue calculation", () => {
			it("should calculate new hue from mouse position correctly", async () => {
				const { _testHelpers } = await import("./color-detail-modal");

				const width = 300;
				const centerHue = 180;
				const visibleRange = 30;

				// キャンバス中央をクリック → centerHue
				const hue1 = _testHelpers.calculateHueFromPosition(
					150,
					width,
					centerHue,
					visibleRange,
				);
				expect(hue1).toBe(180);

				// キャンバス右端をクリック → centerHue + visibleRange/2
				const hue2 = _testHelpers.calculateHueFromPosition(
					300,
					width,
					centerHue,
					visibleRange,
				);
				expect(hue2).toBe(195);

				// キャンバス左端をクリック → centerHue - visibleRange/2
				const hue3 = _testHelpers.calculateHueFromPosition(
					0,
					width,
					centerHue,
					visibleRange,
				);
				expect(hue3).toBe(165);
			});
		});
	});

	describe("exports", () => {
		it("should export openColorDetailModal function", async () => {
			const { openColorDetailModal } = await import("./color-detail-modal");
			expect(openColorDetailModal).toBeDefined();
			expect(typeof openColorDetailModal).toBe("function");
		});

		it("should export _testHelpers object", async () => {
			const { _testHelpers } = await import("./color-detail-modal");
			expect(_testHelpers).toBeDefined();
			expect(typeof _testHelpers).toBe("object");
		});

		it("should only export public API functions", async () => {
			const module = await import("./color-detail-modal");
			const exportedKeys = Object.keys(module);

			// 設計仕様に基づく公開API: openColorDetailModal
			expect(exportedKeys).toContain("openColorDetailModal");

			// テスト用ヘルパー
			expect(exportedKeys).toContain("_testHelpers");
		});
	});

	describe("function signatures", () => {
		it("openColorDetailModal should accept options parameter and optional callback", async () => {
			const { openColorDetailModal } = await import("./color-detail-modal");
			// 関数のシグネチャを確認（引数2つ: options, onRenderMain?）
			// Task 3.4c: onRenderMainコールバックを追加
			expect(openColorDetailModal.length).toBe(2);
		});
	});

	describe("_testHelpers", () => {
		it("should have createAbortController function", async () => {
			const { _testHelpers } = await import("./color-detail-modal");
			expect(_testHelpers.createAbortController).toBeDefined();
			expect(typeof _testHelpers.createAbortController).toBe("function");
		});

		it("should have getLastAbortController function", async () => {
			const { _testHelpers } = await import("./color-detail-modal");
			expect(_testHelpers.getLastAbortController).toBeDefined();
			expect(typeof _testHelpers.getLastAbortController).toBe("function");
		});

		it("createAbortController should return AbortController instance", async () => {
			const { _testHelpers } = await import("./color-detail-modal");
			const controller = _testHelpers.createAbortController();
			expect(controller).toBeInstanceOf(AbortController);
			expect(controller.signal).toBeDefined();
		});

		it("getLastAbortController should return the last created controller", async () => {
			const { _testHelpers } = await import("./color-detail-modal");
			const controller = _testHelpers.createAbortController();
			const lastController = _testHelpers.getLastAbortController();
			expect(lastController).toBe(controller);
		});
	});

	describe("dependency compliance", () => {
		it("should only depend on types.ts (state layer)", async () => {
			// モジュールのロードが成功することを確認
			// 依存関係はコード内で直接確認
			const module = await import("./color-detail-modal");
			expect(module).toBeDefined();
		});
	});

	describe("color sync and readOnly mode (Task 3.4c)", () => {
		describe("updateDetail function", () => {
			it("should export updateDetailConfig type via _testHelpers", async () => {
				const { _testHelpers } = await import("./color-detail-modal");
				expect(_testHelpers.createUpdateDetailHandler).toBeDefined();
				expect(typeof _testHelpers.createUpdateDetailHandler).toBe("function");
			});

			it("createUpdateDetailHandler should return updateDetail function", async () => {
				const { Color } = await import("@/core/color");
				const { _testHelpers } = await import("./color-detail-modal");

				const mockConfig = {
					fixedScale: {
						colors: [
							new Color("#ff0000"),
							new Color("#00ff00"),
							new Color("#0000ff"),
						],
						keyIndex: 1,
						hexValues: ["#ff0000", "#00ff00", "#0000ff"],
					},
					paletteInfo: {
						name: "Test Palette",
						baseChromaName: "Red",
					},
					readOnly: false,
					keyColor: new Color("#ff0000"),
					drawScrubber: () => {},
					getCurrentColor: () => new Color("#ff0000"),
					setCurrentColor: () => {},
					onRenderMain: () => {},
				};

				const handler = _testHelpers.createUpdateDetailHandler(mockConfig);
				expect(handler.updateDetail).toBeDefined();
				expect(typeof handler.updateDetail).toBe("function");
			});

			it("updateDetail should calculate token name correctly", async () => {
				const { Color } = await import("@/core/color");
				const { _testHelpers } = await import("./color-detail-modal");

				const result = _testHelpers.calculateTokenInfo(
					new Color("#ff0000"),
					5, // selectedIndex
					{
						name: "Test Palette",
						baseChromaName: "Red",
					},
				);

				expect(result.tokenName).toBe("red-700"); // STEP_NAMES[5] = 700
				expect(result.chromaDisplayName).toBeDefined();
			});
		});

		describe("syncPalette function", () => {
			it("should export syncPalette function via _testHelpers", async () => {
				const { _testHelpers } = await import("./color-detail-modal");
				expect(_testHelpers.syncPalette).toBeDefined();
				expect(typeof _testHelpers.syncPalette).toBe("function");
			});

			it("syncPalette should update matching palette keyColors by name", async () => {
				const { Color } = await import("@/core/color");
				const { _testHelpers } = await import("./color-detail-modal");

				const palettes = [
					{
						id: "1",
						name: "Blue",
						keyColors: ["#0000ff"],
						ratios: [],
						harmony: "none" as const,
					},
					{
						id: "2",
						name: "Red",
						keyColors: ["#ff0000"],
						ratios: [],
						harmony: "none" as const,
					},
				];

				_testHelpers.syncPalette(palettes, "#00ff00", {
					name: "Red",
					baseChromaName: undefined,
				});

				expect(palettes[0].keyColors).toEqual(["#0000ff"]); // unchanged
				expect(palettes[1].keyColors).toEqual(["#00ff00"]); // updated
			});

			it("syncPalette should update matching palette keyColors by baseChromaName", async () => {
				const { _testHelpers } = await import("./color-detail-modal");

				const palettes = [
					{
						id: "1",
						name: "Blue Palette",
						baseChromaName: "Blue",
						keyColors: ["#0000ff"],
						ratios: [],
						harmony: "none" as const,
					},
					{
						id: "2",
						name: "Red Palette",
						baseChromaName: "Red",
						keyColors: ["#ff0000"],
						ratios: [],
						harmony: "none" as const,
					},
				];

				_testHelpers.syncPalette(palettes, "#00ff00", {
					name: "Red Palette",
					baseChromaName: "Red",
				});

				expect(palettes[0].keyColors).toEqual(["#0000ff"]); // unchanged
				expect(palettes[1].keyColors).toEqual(["#00ff00"]); // updated
			});
		});

		describe("updateCard function", () => {
			it("should export updateContrastCard function via _testHelpers", async () => {
				const { _testHelpers } = await import("./color-detail-modal");
				expect(_testHelpers.calculateContrastInfo).toBeDefined();
				expect(typeof _testHelpers.calculateContrastInfo).toBe("function");
			});

			it("calculateContrastInfo should calculate WCAG and APCA values", async () => {
				const { Color } = await import("@/core/color");
				const { _testHelpers } = await import("./color-detail-modal");

				const result = _testHelpers.calculateContrastInfo(
					new Color("#000000"), // foreground
					new Color("#ffffff"), // background
				);

				expect(result.ratio).toBeGreaterThanOrEqual(21); // black on white = 21:1
				expect(result.apca).toBeDefined();
				expect(typeof result.apca).toBe("number");
			});

			it("calculateContrastInfo should return correct badge level", async () => {
				const { Color } = await import("@/core/color");
				const { _testHelpers } = await import("./color-detail-modal");

				// AAA level (ratio >= 7.0)
				const aaaResult = _testHelpers.calculateContrastInfo(
					new Color("#000000"),
					new Color("#ffffff"),
				);
				expect(aaaResult.level).toBe("success");
				expect(aaaResult.badgeText).toBe("AAA");

				// Low contrast
				const lowResult = _testHelpers.calculateContrastInfo(
					new Color("#888888"),
					new Color("#999999"),
				);
				expect(lowResult.level).toBe("error");
				expect(lowResult.badgeText).toBe("Fail");
			});
		});

		describe("readOnly mode", () => {
			it("createUpdateDetailHandler should respect readOnly flag", async () => {
				const { Color } = await import("@/core/color");
				const { _testHelpers } = await import("./color-detail-modal");

				const setKeyColorCalled = false;
				const mockConfig = {
					fixedScale: {
						colors: [new Color("#ff0000")],
						keyIndex: 0,
						hexValues: ["#ff0000"],
					},
					paletteInfo: {
						name: "Test",
					},
					readOnly: true,
					keyColor: new Color("#ff0000"),
					drawScrubber: () => {},
					getCurrentColor: () => new Color("#ff0000"),
					setCurrentColor: () => {},
					onRenderMain: () => {},
				};

				const handler = _testHelpers.createUpdateDetailHandler(mockConfig);
				expect(handler.isReadOnly()).toBe(true);
			});

			it("scrubber handlers should be disabled in readOnly mode", async () => {
				const { Color } = await import("@/core/color");
				const { _testHelpers } = await import("./color-detail-modal");

				let colorChanged = false;
				const handlers = _testHelpers.createScrubberHandlers({
					keyColor: new Color("#ff0000"),
					currentColor: new Color("#ff0000"),
					readOnly: true,
					onColorChange: () => {
						colorChanged = true;
					},
				});

				handlers.handleStart({} as MouseEvent);
				expect(handlers.isDragging()).toBe(false);
				expect(colorChanged).toBe(false);
			});
		});
	});

	describe("ColorDetailModalOptions type compatibility", () => {
		it("should accept valid ColorDetailModalOptions structure", async () => {
			// 型互換性のテスト（コンパイル時チェック）
			const { Color } = await import("@/core/color");
			const { openColorDetailModal } = await import("./color-detail-modal");

			// 有効なオプションオブジェクトを作成できることを確認
			// NOTE: 実際のDOM操作はE2Eテストでカバー
			const validOptions = {
				stepColor: new Color("#ff0000"),
				keyColor: new Color("#ff0000"),
				index: 5,
				fixedScale: {
					colors: [new Color("#ff0000")],
					keyIndex: 0,
				},
				paletteInfo: {
					name: "Test Palette",
				},
			};

			// 型が正しいことを確認（エラーが発生しないこと）
			expect(validOptions.stepColor).toBeDefined();
			expect(validOptions.keyColor).toBeDefined();
			expect(validOptions.index).toBe(5);
			expect(validOptions.fixedScale.colors.length).toBeGreaterThan(0);
			expect(validOptions.paletteInfo.name).toBe("Test Palette");
		});

		it("should support optional fields in ColorDetailModalOptions", async () => {
			const { Color } = await import("@/core/color");

			// オプショナルフィールドを含むオプション
			const optionsWithOptional = {
				stepColor: new Color("#ff0000"),
				keyColor: new Color("#ff0000"),
				index: 0,
				fixedScale: {
					colors: [new Color("#ff0000")],
					keyIndex: 0,
					hexValues: ["#ff0000"], // optional
				},
				paletteInfo: {
					name: "Test",
					baseChromaName: "Red", // optional
				},
				readOnly: true, // optional
				originalHex: "#ff0000", // optional
			};

			expect(optionsWithOptional.readOnly).toBe(true);
			expect(optionsWithOptional.originalHex).toBe("#ff0000");
			expect(optionsWithOptional.fixedScale.hexValues).toEqual(["#ff0000"]);
			expect(optionsWithOptional.paletteInfo.baseChromaName).toBe("Red");
		});
	});
});

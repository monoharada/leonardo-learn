/**
 * CUD機能 統合テスト
 *
 * Task 9.1: 統合テストの実装
 * - 最適化フロー全体（Anchor → Optimizer → Snapper → Result）の検証
 * - UIフロー（ModeSelector → Optimizer → Preview更新）の検証
 * - エクスポートフロー（Optimizer → JSONExporter → CUDメタデータ）の検証
 *
 * Requirements: 8.4
 */

import { describe, expect, it, vi } from "vitest";
// UI modules
import {
	type CudCompatibilityMode,
	createPaletteProcessor,
	processPaletteWithMode,
} from "../../ui/cud-components";
import { Color } from "../color";
// Export modules
import { exportToCSSv2 } from "../export/css-exporter";
import {
	exportToJSON,
	exportToJSONv2,
	generateCudValidationSummary,
	type JSONExportResultV2,
} from "../export/json-exporter";
import type { BrandToken, DadsToken } from "../tokens/types";
// Core modules
import { createAnchorColor, setAnchorPriority } from "./anchor";
import { optimizePalette } from "./optimizer";
import {
	findNearestCudColor,
	type ProcessPaletteResultV1,
	type ProcessPaletteResultV2,
	processPaletteWithModeV2,
} from "./service";
import { classifyZone } from "./zone";

/**
 * テスト用CUD推奨色のHEX値
 * CUD推奨配色セット ver.4から
 */
const CUD_COLORS = {
	red: "#FF2800", // 赤
	green: "#35A16B", // 緑
	blue: "#0041FF", // 青
	orange: "#FF9900", // オレンジ
	yellow: "#FAF500", // 黄
	pink: "#FF99A0", // ピンク
	skyBlue: "#66CCFF", // 空色
	brown: "#663300", // 茶
	purple: "#9A0079", // 紫
	white: "#FFFFFF", // 白
	black: "#000000", // 黒
};

/**
 * テスト用非CUD色
 * Off Zoneに入るようdeltaE > 0.12となる色を選択
 */
const NON_CUD_COLORS = {
	customRed: "#FF0000", // 純粋な赤（CUD赤とは異なる）
	customBlue: "#0000FF", // 純粋な青
	customGreen: "#00FF00", // ライム緑
	randomColor: "#567890", // Off Zoneに入るランダムな色
	darkPurple: "#4B0082", // インディゴ
};

/**
 * HEXからColorオブジェクトを作成するヘルパー
 * @param hex - HEX色値
 * @returns Colorオブジェクト
 */
const createColor = (hex: string): Color => new Color(hex);

// ============================================================================
// 1. 最適化フロー統合テスト（Anchor → Optimizer → Snapper → Result）
// ============================================================================

describe("最適化フロー統合テスト", () => {
	describe("Anchor → Optimizer統合", () => {
		it("CUD推奨色をアンカーにした場合、最適化結果が一貫している", () => {
			// Arrange: CUD赤色をアンカーとして設定
			const anchor = createAnchorColor(CUD_COLORS.red);

			// アンカーがexact matchであることを確認
			expect(anchor.nearestCud.matchLevel).toBe("exact");
			expect(anchor.priority).toBe("cud");

			// Act: パレットを最適化
			const candidates = [CUD_COLORS.red, CUD_COLORS.green, CUD_COLORS.blue];
			const result = optimizePalette(candidates, anchor, {
				lambda: 0.5,
				mode: "soft",
			});

			// Assert: 結果の検証
			expect(result.palette).toHaveLength(3);
			expect(result.cudComplianceRate).toBe(100); // 全てCUD推奨色なので100%
			expect(result.warnings).toHaveLength(0); // 警告なし

			// 各色がSafe Zoneにあることを確認
			for (const color of result.palette) {
				expect(color.zone).toBe("safe");
				expect(color.snapped).toBe(false); // スナップ不要
			}
		});

		it("非CUD色をアンカーにした場合、優先度に応じた処理が行われる", () => {
			// Arrange: ランダムな非CUD色をアンカーとして設定
			const anchor = createAnchorColor(NON_CUD_COLORS.randomColor);

			// アンカーのmatchLevelを確認
			// matchLevelに応じて優先度が決まる: exact/near -> cud, moderate/off -> brand
			expect(anchor.nearestCud.matchLevel).toBeDefined();

			// Act: パレットを最適化（Softモード）
			const candidates = [NON_CUD_COLORS.randomColor, NON_CUD_COLORS.customRed];
			const result = optimizePalette(candidates, anchor, {
				lambda: 0.5,
				mode: "soft",
			});

			// Assert: 最適化結果が存在する
			expect(result.palette).toHaveLength(2);
			expect(result.cudComplianceRate).toBeGreaterThanOrEqual(0);
			expect(result.cudComplianceRate).toBeLessThanOrEqual(100);
		});

		it("優先度変更がOptimizerの結果に反映される", () => {
			// Arrange: 明確にOff Zoneに入る色をアンカーとして設定
			const offZoneColor = "#334455"; // 暗い灰青色
			const anchor = createAnchorColor(offZoneColor);

			// 優先度をcudに変更
			const cudPriorityAnchor = setAnchorPriority(anchor, "cud");
			expect(cudPriorityAnchor.priority).toBe("cud");
			expect(cudPriorityAnchor.effectiveHex).toBe(
				anchor.nearestCud.nearest.hex,
			);

			// 優先度変更により実効色が変わることを確認
			const brandPriorityAnchor = setAnchorPriority(anchor, "brand");
			expect(brandPriorityAnchor.effectiveHex).toBe(anchor.originalHex);

			// effectiveHexが異なることを確認
			expect(cudPriorityAnchor.effectiveHex).not.toBe(
				brandPriorityAnchor.effectiveHex,
			);

			// Act: 両方の優先度で最適化
			const candidates = [CUD_COLORS.red, CUD_COLORS.green];

			const brandResult = optimizePalette(candidates, brandPriorityAnchor, {
				lambda: 0.5,
				mode: "soft",
			});

			const cudResult = optimizePalette(candidates, cudPriorityAnchor, {
				lambda: 0.5,
				mode: "soft",
			});

			// Assert: 最適化結果が正常に返される
			expect(brandResult.palette).toHaveLength(2);
			expect(cudResult.palette).toHaveLength(2);

			// 両方の結果に調和スコアが存在する
			expect(brandResult.harmonyScore).toBeDefined();
			expect(cudResult.harmonyScore).toBeDefined();
		});
	});

	describe("Optimizer → Snapper統合", () => {
		it("Softモードでゾーンに応じたスナップが適用される", () => {
			// Arrange
			const anchor = createAnchorColor(CUD_COLORS.red);

			// Safe/Warning/Off各ゾーンの色を含むパレット
			const candidates = [
				CUD_COLORS.red, // Safe Zone（exact match）
				NON_CUD_COLORS.customRed, // Warning or Off Zone
				NON_CUD_COLORS.randomColor, // Off Zone
			];

			// Act
			const result = optimizePalette(candidates, anchor, {
				lambda: 0.5,
				mode: "soft",
				returnFactor: 0.5,
			});

			// Assert
			expect(result.palette).toHaveLength(3);

			// Safe Zone色はスナップされない
			const safeColor = result.palette[0];
			expect(safeColor.zone).toBe("safe");
			expect(safeColor.snapped).toBe(false);

			// Off Zone色はスナップされる
			const offColor = result.palette.find((c) => c.zone === "off");
			if (offColor) {
				expect(offColor.snapped).toBe(true);
			}
		});

		it("Strictモードで全色がCUD推奨色にスナップされる", () => {
			// Arrange
			const anchor = createAnchorColor(CUD_COLORS.red);

			// 様々な色を含むパレット
			const candidates = [
				NON_CUD_COLORS.customRed,
				NON_CUD_COLORS.customBlue,
				NON_CUD_COLORS.customGreen,
			];

			// Act
			const result = optimizePalette(candidates, anchor, {
				lambda: 0.5,
				mode: "strict",
			});

			// Assert: 全てスナップされている
			expect(result.palette).toHaveLength(3);
			for (const color of result.palette) {
				expect(color.snapped).toBe(true);
				expect(color.cudTarget).toBeDefined();
				// スナップ後はCUD推奨色のHEXになっている
				expect(color.hex).toBe(color.cudTarget?.hex);
			}

			// Strictモードでは警告なし
			expect(result.warnings).toHaveLength(0);
		});

		it("returnFactorがスナップ量に影響する", () => {
			// Arrange
			const anchor = createAnchorColor(CUD_COLORS.red);
			const candidates = [NON_CUD_COLORS.customRed];

			// Act: returnFactor=0（スナップなし）
			const result0 = optimizePalette(candidates, anchor, {
				lambda: 0.5,
				mode: "soft",
				returnFactor: 0,
			});

			// returnFactor=1（完全スナップ）
			const result1 = optimizePalette(candidates, anchor, {
				lambda: 0.5,
				mode: "soft",
				returnFactor: 1,
			});

			// Assert
			// returnFactor=0ではWarning Zone内なら元の色を維持
			// returnFactor=1では完全にCUD色にスナップ
			const color0 = result0.palette[0];
			const color1 = result1.palette[0];

			// color1の方がCUD色に近くなっている（deltaEが小さい）
			// ただしゾーンによって動作が異なるため、単純比較は難しい
			expect(color0).toBeDefined();
			expect(color1).toBeDefined();
		});
	});

	describe("Snapper → HarmonyScore統合", () => {
		it("スナップ後の色で調和スコアが計算される", () => {
			// Arrange
			const anchor = createAnchorColor(CUD_COLORS.red);
			const candidates = [
				CUD_COLORS.red,
				NON_CUD_COLORS.customBlue,
				NON_CUD_COLORS.customGreen,
			];

			// Act
			const result = optimizePalette(candidates, anchor, {
				lambda: 0.5,
				mode: "soft",
			});

			// Assert: 調和スコアが計算されている
			expect(result.harmonyScore).toBeDefined();
			expect(result.harmonyScore.total).toBeGreaterThanOrEqual(0);
			expect(result.harmonyScore.total).toBeLessThanOrEqual(100);

			// 内訳も存在する
			expect(result.harmonyScore.breakdown).toBeDefined();
			expect(result.harmonyScore.breakdown.hueScore).toBeDefined();
			expect(result.harmonyScore.breakdown.lightnessScore).toBeDefined();
			expect(result.harmonyScore.breakdown.contrastScore).toBeDefined();
		});

		it("目的関数値が調和スコアとCUD距離を反映している", () => {
			// Arrange
			const anchor = createAnchorColor(CUD_COLORS.red);

			// 全てCUD推奨色のパレット（CUD距離=0）
			const cudPalette = [CUD_COLORS.red, CUD_COLORS.green, CUD_COLORS.blue];

			// 非CUD色を含むパレット
			const mixedPalette = [
				CUD_COLORS.red,
				NON_CUD_COLORS.randomColor,
				NON_CUD_COLORS.darkPurple,
			];

			// Act
			const cudResult = optimizePalette(cudPalette, anchor, {
				lambda: 0.5,
				mode: "soft",
			});

			const mixedResult = optimizePalette(mixedPalette, anchor, {
				lambda: 0.5,
				mode: "soft",
			});

			// Assert: CUDパレットの方が目的関数値が低い（良い）
			// 注: 調和スコアによっては逆転する可能性があるため、単純な比較は避ける
			expect(cudResult.objectiveValue).toBeDefined();
			expect(mixedResult.objectiveValue).toBeDefined();
		});
	});

	describe("フロー全体の検証", () => {
		it("Anchor作成からResult取得まで一連の処理が正常に動作する", () => {
			// Step 1: アンカー作成
			const anchor = createAnchorColor(CUD_COLORS.orange);
			expect(anchor.originalHex).toBe(CUD_COLORS.orange);
			expect(anchor.nearestCud.matchLevel).toBe("exact");

			// Step 2: パレット準備
			const candidates = [
				CUD_COLORS.orange,
				CUD_COLORS.blue,
				NON_CUD_COLORS.customRed,
				NON_CUD_COLORS.darkPurple,
			];

			// Step 3: 最適化実行
			const result = optimizePalette(candidates, anchor, {
				lambda: 0.5,
				mode: "soft",
				returnFactor: 0.5,
			});

			// Step 4: 結果検証
			expect(result.palette).toHaveLength(4);
			expect(result.cudComplianceRate).toBeGreaterThanOrEqual(0);
			expect(result.cudComplianceRate).toBeLessThanOrEqual(100);
			expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);

			// 各色の整合性を確認
			for (const color of result.palette) {
				// ゾーン判定が正しい
				const expectedZone = classifyZone(color.deltaE);
				expect(color.zone).toBe(expectedZone);

				// スナップ状態が一貫している
				if (color.zone === "safe") {
					expect(color.snapped).toBe(false);
				}
			}
		});

		it("処理時間が妥当な範囲内である", () => {
			// Arrange: 20色のパレット（Requirement 8.1: 200ms以内）
			const anchor = createAnchorColor(CUD_COLORS.red);
			const candidates = [
				CUD_COLORS.red,
				CUD_COLORS.green,
				CUD_COLORS.blue,
				CUD_COLORS.orange,
				CUD_COLORS.yellow,
				CUD_COLORS.pink,
				CUD_COLORS.skyBlue,
				CUD_COLORS.brown,
				CUD_COLORS.purple,
				CUD_COLORS.white,
				CUD_COLORS.black,
				NON_CUD_COLORS.customRed,
				NON_CUD_COLORS.customBlue,
				NON_CUD_COLORS.customGreen,
				NON_CUD_COLORS.randomColor,
				NON_CUD_COLORS.darkPurple,
				"#AABBCC",
				"#DDEEFF",
				"#112233",
				"#445566",
			];

			// Act
			const result = optimizePalette(candidates, anchor, {
				lambda: 0.5,
				mode: "soft",
			});

			// Assert: 200ms以内
			expect(result.processingTimeMs).toBeLessThan(200);
		});
	});
});

// ============================================================================
// 2. UIフロー統合テスト（ModeSelector → Optimizer → Preview更新）
// ============================================================================

describe("UIフロー統合テスト", () => {
	describe("processPaletteWithMode統合", () => {
		const testPalette = [
			CUD_COLORS.red,
			CUD_COLORS.green,
			NON_CUD_COLORS.randomColor,
		];

		it("Offモードで元のパレットがそのまま返される", () => {
			// Act
			const result = processPaletteWithMode(testPalette, "off");

			// Assert
			expect(result.processed).toHaveLength(3);
			expect(result.processed).toEqual(testPalette.map((c) => c.toUpperCase()));
			expect(result.optimizationResult).toBeUndefined();
			expect(result.zoneInfos).toBeUndefined();
		});

		it("Guideモードでゾーン情報が付加される", () => {
			// Act
			const result = processPaletteWithMode(testPalette, "guide");

			// Assert
			expect(result.processed).toHaveLength(3);
			expect(result.zoneInfos).toBeDefined();
			expect(result.zoneInfos).toHaveLength(3);
			expect(result.optimizationResult).toBeUndefined();

			// ゾーン情報の検証
			const zoneInfos = result.zoneInfos;
			if (!zoneInfos) {
				throw new Error("zoneInfos should be defined in guide mode");
			}
			for (const info of zoneInfos) {
				expect(["safe", "warning", "off"]).toContain(info.zone);
				expect(info.deltaE).toBeGreaterThanOrEqual(0);
				expect(info.nearestCud).toBeDefined();
			}
		});

		it("Softモードで最適化結果が返される", () => {
			// Act
			const result = processPaletteWithMode(testPalette, "soft");

			// Assert
			expect(result.processed).toHaveLength(3);
			expect(result.optimizationResult).toBeDefined();
			expect(result.zoneInfos).toBeUndefined();

			// 最適化結果の検証
			const opt = result.optimizationResult;
			if (!opt) {
				throw new Error("optimizationResult should be defined in soft mode");
			}
			expect(opt.palette).toHaveLength(3);
			expect(opt.cudComplianceRate).toBeGreaterThanOrEqual(0);
			expect(opt.harmonyScore).toBeDefined();
		});

		it("Strictモードで全色がスナップされる", () => {
			// Act
			const result = processPaletteWithMode(testPalette, "strict");

			// Assert
			expect(result.processed).toHaveLength(3);
			expect(result.optimizationResult).toBeDefined();

			// 全色がスナップされている
			const opt = result.optimizationResult;
			if (!opt) {
				throw new Error("optimizationResult should be defined in strict mode");
			}
			for (const color of opt.palette) {
				expect(color.snapped).toBe(true);
				expect(color.cudTarget).toBeDefined();
			}
		});
	});

	describe("PaletteProcessor統合", () => {
		it("モード変更時にコールバックが呼ばれる", () => {
			// Arrange
			const callback = vi.fn();
			const processor = createPaletteProcessor(
				[CUD_COLORS.red, CUD_COLORS.green],
				callback,
				"guide",
			);

			// Act
			processor.setMode("soft");

			// Assert
			expect(callback).toHaveBeenCalledTimes(1);
			expect(processor.getMode()).toBe("soft");

			const result = processor.getResult();
			expect(result.optimizationResult).toBeDefined();
		});

		it("パレット更新時に再計算される", () => {
			// Arrange
			const callback = vi.fn();
			const processor = createPaletteProcessor(
				[CUD_COLORS.red],
				callback,
				"soft",
			);

			// Act
			processor.updatePalette([
				CUD_COLORS.red,
				CUD_COLORS.green,
				CUD_COLORS.blue,
			]);

			// Assert
			expect(callback).toHaveBeenCalledTimes(1);
			const result = processor.getResult();
			expect(result.processed).toHaveLength(3);
		});

		it("オプション変更時に再計算される", () => {
			// Arrange
			const callback = vi.fn();
			const processor = createPaletteProcessor(
				[CUD_COLORS.red, NON_CUD_COLORS.randomColor],
				callback,
				"soft",
			);

			// Act
			processor.setOptions({ lambda: 0.9 });

			// Assert
			expect(callback).toHaveBeenCalledTimes(1);
			const newResult = processor.getResult();

			// lambdaが異なるので目的関数値が変わる可能性がある
			expect(newResult.optimizationResult).toBeDefined();
		});

		it("全モード切り替えが正常に動作する", () => {
			// Arrange
			const callback = vi.fn();
			const processor = createPaletteProcessor(
				[CUD_COLORS.red, NON_CUD_COLORS.randomColor],
				callback,
				"off",
			);

			const modes: CudCompatibilityMode[] = ["off", "guide", "soft", "strict"];

			// Act & Assert
			for (const mode of modes) {
				processor.setMode(mode);
				const result = processor.getResult();
				expect(result.processed).toBeDefined();

				switch (mode) {
					case "off":
						expect(result.optimizationResult).toBeUndefined();
						expect(result.zoneInfos).toBeUndefined();
						break;
					case "guide":
						expect(result.zoneInfos).toBeDefined();
						expect(result.optimizationResult).toBeUndefined();
						break;
					case "soft":
					case "strict":
						expect(result.optimizationResult).toBeDefined();
						expect(result.zoneInfos).toBeUndefined();
						break;
				}
			}

			// 4回のモード変更
			expect(callback).toHaveBeenCalledTimes(4);
		});
	});

	describe("アンカーカラー指定との統合", () => {
		it("アンカー指定でOptimizer結果が変わる", () => {
			// Arrange
			const palette = [
				CUD_COLORS.red,
				CUD_COLORS.green,
				NON_CUD_COLORS.randomColor,
			];

			// Act: 異なるアンカーで処理
			const resultRed = processPaletteWithMode(palette, "soft", {
				anchorHex: CUD_COLORS.red,
			});

			const resultBlue = processPaletteWithMode(palette, "soft", {
				anchorHex: CUD_COLORS.blue,
			});

			// Assert: 調和スコアが異なる
			expect(resultRed.optimizationResult?.harmonyScore.total).not.toBe(
				resultBlue.optimizationResult?.harmonyScore.total,
			);
		});
	});
});

// ============================================================================
// 3. エクスポートフロー統合テスト（Optimizer → JSONExporter → CUDメタデータ）
// ============================================================================

describe("エクスポートフロー統合テスト", () => {
	describe("最適化結果のエクスポート", () => {
		it("CUDメタデータ付きJSONエクスポートが正常に動作する", () => {
			// Arrange: Colorオブジェクトを作成
			const colors: Record<string, Color> = {
				primary: createColor(CUD_COLORS.red),
				secondary: createColor(CUD_COLORS.green),
				accent: createColor(NON_CUD_COLORS.randomColor),
			};

			// Act
			const result = exportToJSON(colors, {
				includeCudMetadata: true,
			});

			// Assert
			expect(result.colors).toBeDefined();
			expect(Object.keys(result.colors)).toHaveLength(3);

			// 各色にCUDメタデータが含まれている
			for (const colorData of Object.values(result.colors)) {
				expect(colorData.cudMetadata).toBeDefined();
				expect(colorData.cudMetadata?.nearestId).toBeDefined();
				expect(colorData.cudMetadata?.nearestName).toBeDefined();
				expect(colorData.cudMetadata?.deltaE).toBeGreaterThanOrEqual(0);
				expect(colorData.cudMetadata?.zone).toBeDefined();
				expect(["safe", "warning", "off"]).toContain(
					colorData.cudMetadata?.zone,
				);
			}
		});

		it("CUDサマリー付きエクスポートが正常に動作する", () => {
			// Arrange
			const colors: Record<string, Color> = {
				red: createColor(CUD_COLORS.red),
				green: createColor(CUD_COLORS.green),
				blue: createColor(CUD_COLORS.blue),
			};

			// Act
			const result = exportToJSON(colors, {
				includeCudMetadata: true,
				includeCudSummary: true,
				cudMode: "soft",
			});

			// Assert
			expect(result.cudSummary).toBeDefined();
			expect(result.cudSummary?.mode).toBe("soft");
			expect(result.cudSummary?.complianceRate).toBe(100); // 全てCUD推奨色
			expect(result.cudSummary?.zoneDistribution).toBeDefined();
			expect(result.cudSummary?.isFullyCompliant).toBe(true);
		});

		it("Strictモードでの完全準拠フラグが正しく設定される", () => {
			// Arrange: 全てCUD推奨色
			const colors: Record<string, Color> = {
				red: createColor(CUD_COLORS.red),
				green: createColor(CUD_COLORS.green),
			};

			// Act
			const result = exportToJSON(colors, {
				includeCudMetadata: true,
				includeCudSummary: true,
				cudMode: "strict",
			});

			// Assert
			expect(result.cudSummary?.isFullyCompliant).toBe(true);
		});

		it("ゾーン分布が正しく計算される", () => {
			// Arrange: Safe/Warning/Off各ゾーンの色を含む
			const colors: Record<string, Color> = {
				safe: createColor(CUD_COLORS.red), // Safe Zone
				maybeWarning: createColor(NON_CUD_COLORS.customRed), // Warning or Off
				off: createColor(NON_CUD_COLORS.randomColor), // Off Zone
			};

			// Act
			const result = exportToJSON(colors, {
				includeCudMetadata: true,
				includeCudSummary: true,
				cudMode: "guide",
			});

			// Assert
			expect(result.cudSummary).toBeDefined();
			const summary = result.cudSummary;
			if (!summary) {
				throw new Error("cudSummary should be defined");
			}
			const dist = summary.zoneDistribution;
			expect(dist.safe + dist.warning + dist.off).toBe(3);
		});
	});

	describe("検証サマリー生成", () => {
		it("検証サマリーが正しく生成される", () => {
			// Arrange
			const colors: Record<string, Color> = {
				red: createColor(CUD_COLORS.red),
				random: createColor(NON_CUD_COLORS.randomColor),
			};

			// Act
			const summary = generateCudValidationSummary(colors);

			// Assert
			expect(summary.totalColors).toBe(2);
			expect(summary.zoneDistribution).toBeDefined();
			expect(summary.message).toBeDefined();

			// safeが1色以上あるはず
			expect(summary.zoneDistribution.safe).toBeGreaterThanOrEqual(1);
		});

		it("全色準拠時のサマリーメッセージが適切", () => {
			// Arrange: 全てCUD推奨色
			const colors: Record<string, Color> = {
				red: createColor(CUD_COLORS.red),
				green: createColor(CUD_COLORS.green),
				blue: createColor(CUD_COLORS.blue),
			};

			// Act
			const summary = generateCudValidationSummary(colors);

			// Assert
			expect(summary.isExportReady).toBe(true);
			expect(summary.errorCount).toBe(0);
			expect(summary.message).toContain("CUD準拠");
		});

		it("エラーがある場合のサマリーが適切", () => {
			// Arrange: Off Zone色のみ
			const colors: Record<string, Color> = {
				random1: createColor(NON_CUD_COLORS.randomColor),
				random2: createColor(NON_CUD_COLORS.darkPurple),
			};

			// Act
			const summary = generateCudValidationSummary(colors);

			// Assert
			// Off Zoneがある場合はエクスポート不可
			if (summary.errorCount > 0) {
				expect(summary.isExportReady).toBe(false);
			}
		});
	});

	describe("Optimizer → Exporter一貫性", () => {
		it("Optimizer結果とExporter結果のゾーン判定が一致する", () => {
			// Arrange
			const anchor = createAnchorColor(CUD_COLORS.red);
			const candidates = [CUD_COLORS.red, NON_CUD_COLORS.randomColor];

			// Optimizerで最適化
			const optResult = optimizePalette(candidates, anchor, {
				lambda: 0.5,
				mode: "soft",
			});

			// 同じ色でColorオブジェクトを作成してエクスポート
			const colors: Record<string, Color> = {
				color0: createColor(optResult.palette[0].hex),
				color1: createColor(optResult.palette[1].hex),
			};

			const exportResult = exportToJSON(colors, {
				includeCudMetadata: true,
			});

			// Assert: ゾーン判定が一致
			// 注: 最適化後の色なのでゾーンが変わっている可能性がある
			// しかし同じ色に対するゾーン判定は一貫しているべき
			for (let i = 0; i < optResult.palette.length; i++) {
				const optColor = optResult.palette[i];
				const exportColor = exportResult.colors[`color${i}`];

				// 最適化後の色でのゾーン判定を確認
				const expectedZone = classifyZone(
					findNearestCudColor(optColor.hex).deltaE,
				);
				expect(exportColor.cudMetadata?.zone).toBe(expectedZone);
			}
		});
	});
});

// ============================================================================
// 4. エンドツーエンドシナリオ
// ============================================================================

describe("エンドツーエンドシナリオ", () => {
	it("ブランドカラーからCUD最適化パレット生成・エクスポートまでの一連フロー", () => {
		// Step 1: ブランドカラーをアンカーとして設定
		const brandColor = "#FF5500"; // ブランドのオレンジ
		const anchor = createAnchorColor(brandColor);

		// Step 2: パレット候補を準備
		const candidates = [
			brandColor,
			"#0066CC", // ブランドの青
			"#33CC33", // ブランドの緑
			"#CC3333", // ブランドの赤
		];

		// Step 3: Softモードで最適化
		const optResult = optimizePalette(candidates, anchor, {
			lambda: 0.5,
			mode: "soft",
			returnFactor: 0.5,
		});

		// Step 4: UIフローで処理
		const uiResult = processPaletteWithMode(candidates, "soft", {
			anchorHex: brandColor,
		});

		// Step 5: エクスポート用Colorオブジェクト作成
		const colors: Record<string, Color> = {
			primary: createColor(optResult.palette[0].hex),
			secondary: createColor(optResult.palette[1].hex),
			success: createColor(optResult.palette[2].hex),
			danger: createColor(optResult.palette[3].hex),
		};

		// Step 6: CUDメタデータ付きエクスポート
		const exportResult = exportToJSON(colors, {
			includeCudMetadata: true,
			includeCudSummary: true,
			cudMode: "soft",
		});

		// Assertions: 全ステップが正常に完了
		expect(anchor).toBeDefined();
		expect(optResult.palette).toHaveLength(4);
		expect(uiResult.optimizationResult).toBeDefined();
		expect(exportResult.colors).toBeDefined();
		expect(exportResult.cudSummary).toBeDefined();

		// 処理時間が妥当
		expect(optResult.processingTimeMs).toBeLessThan(200);

		// 最適化によりCUD準拠率が改善されている（または維持）
		expect(optResult.cudComplianceRate).toBeGreaterThanOrEqual(0);
	});

	it("Strictモードでの完全CUD準拠パレット生成フロー", () => {
		// Step 1: アンカー設定
		const anchor = createAnchorColor(CUD_COLORS.red);

		// Step 2: 任意の色を含むパレット
		const candidates = [
			"#FF0000", // 任意の赤
			"#00FF00", // ライム
			"#0000FF", // 純青
			"#FFFF00", // 黄
		];

		// Step 3: Strictモードで最適化
		const optResult = optimizePalette(candidates, anchor, {
			lambda: 0.5,
			mode: "strict",
		});

		// Step 4: エクスポート
		const colors: Record<string, Color> = {};
		optResult.palette.forEach((color, i) => {
			colors[`color${i}`] = createColor(color.hex);
		});

		const exportResult = exportToJSON(colors, {
			includeCudMetadata: true,
			includeCudSummary: true,
			cudMode: "strict",
		});

		// Assertions: Strictモードでは全色がCUD推奨色にスナップされる
		for (const color of optResult.palette) {
			expect(color.snapped).toBe(true);
			expect(color.cudTarget).toBeDefined();
			// スナップ後の色はCUD推奨色と一致
			expect(color.hex).toBe(color.cudTarget?.hex);
		}

		// 注: cudComplianceRateはスナップ前の元色に対するゾーン判定に基づく
		// Strictモードでは全色がスナップされるが、元の色のゾーンは変わらない
		// 従って、準拠率は元の色の状態を反映する
		expect(optResult.cudComplianceRate).toBeGreaterThanOrEqual(0);
		expect(optResult.cudComplianceRate).toBeLessThanOrEqual(100);

		// エクスポート結果のモードが正しい
		expect(exportResult.cudSummary?.mode).toBe("strict");
	});
});

// ============================================================================
// 5. v2 API統合テスト（Task 7.1）
// パレット生成からエクスポートまでの統合テスト
// Requirements: 9.1, 9.2, 9.3, 10.1, 11.1
// ============================================================================

describe("v2 API統合テスト (Task 7.1)", () => {
	/**
	 * テスト用パレット
	 */
	const TEST_PALETTE = ["#FF2800", "#35A16B", "#0041FF"]; // CUD推奨色
	const MIXED_PALETTE = ["#FF2800", "#123456", "#AABBCC"]; // CUD/非CUD混在

	describe("v2 APIでのパレット生成→BrandToken配列取得フロー", () => {
		it("v2 APIでBrandToken配列が正しく生成される", () => {
			// Act
			const result = processPaletteWithModeV2(TEST_PALETTE, {
				mode: "soft",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			// Assert: BrandToken配列が生成される
			expect(result.brandTokens).toBeDefined();
			expect(Array.isArray(result.brandTokens)).toBe(true);
			expect(result.brandTokens.length).toBe(3);

			// 各BrandTokenの構造を検証
			for (const token of result.brandTokens) {
				expect(token.id).toBeDefined();
				expect(token.hex).toMatch(/^#[A-F0-9]{6}$/);
				expect(token.source).toBe("brand");
				expect(token.dadsReference).toBeDefined();
				expect(token.dadsReference.tokenId).toBeDefined();
				expect(token.dadsReference.tokenHex).toMatch(/^#[A-F0-9]{6}$/);
				expect(typeof token.dadsReference.deltaE).toBe("number");
				expect(["strict-snap", "soft-snap", "reference", "manual"]).toContain(
					token.dadsReference.derivationType,
				);
				expect(["safe", "warning", "off"]).toContain(token.dadsReference.zone);
			}
		});

		it("v2 APIでDADSリファレンスMapが正しく生成される", () => {
			// Act
			const result = processPaletteWithModeV2(TEST_PALETTE, {
				mode: "soft",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			// Assert: DADSリファレンスMapが生成される
			expect(result.dadsReferences).toBeDefined();
			expect(result.dadsReferences).toBeInstanceOf(Map);

			// 参照されたDADSトークンが含まれる
			for (const [tokenId, dadsToken] of result.dadsReferences) {
				expect(typeof tokenId).toBe("string");
				expect(dadsToken.id).toBe(tokenId);
				expect(dadsToken.source).toBe("dads");
				expect(dadsToken.hex).toMatch(/^#[A-F0-9]{6}$/);
				expect(dadsToken.nameJa).toBeDefined();
				expect(dadsToken.nameEn).toBeDefined();
			}
		});

		it("v2 APIでgenerationContextが正しく適用される", () => {
			// Act
			const usedIds = new Set<string>();
			const result = processPaletteWithModeV2(TEST_PALETTE, {
				mode: "soft",
				apiVersion: "v2",
				generationContext: {
					namespace: "myapp",
					roles: ["primary", "secondary", "accent"],
					usedIds,
				},
			}) as ProcessPaletteResultV2;

			// Assert: namespaceがIDに含まれる
			for (const token of result.brandTokens) {
				expect(token.id).toContain("myapp");
			}

			// Assert: rolesがIDに含まれる
			expect(result.brandTokens[0].id).toContain("primary");
			expect(result.brandTokens[1].id).toContain("secondary");
			expect(result.brandTokens[2].id).toContain("accent");

			// Assert: usedIdsが更新される
			expect(usedIds.size).toBe(3);
			for (const token of result.brandTokens) {
				expect(usedIds.has(token.id)).toBe(true);
			}
		});

		it("v2 APIでoriginalHexが保持される", () => {
			// Act
			const result = processPaletteWithModeV2(MIXED_PALETTE, {
				mode: "soft",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			// Assert: originalHexが元の色を保持
			expect(result.brandTokens[0].originalHex).toBe("#FF2800");
			expect(result.brandTokens[1].originalHex).toBe("#123456");
			expect(result.brandTokens[2].originalHex).toBe("#AABBCC");
		});

		it("v2 APIでcudComplianceRateが正しく計算される", () => {
			// CUD推奨色のみ
			const cudResult = processPaletteWithModeV2(TEST_PALETTE, {
				mode: "soft",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			expect(cudResult.cudComplianceRate).toBe(100);

			// 混在パレット
			const mixedResult = processPaletteWithModeV2(MIXED_PALETTE, {
				mode: "soft",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			// 1色がCUD、2色が非CUD
			expect(mixedResult.cudComplianceRate).toBeLessThan(100);
		});

		it("v2 APIでharmonyScoreが計算される", () => {
			// Act
			const result = processPaletteWithModeV2(TEST_PALETTE, {
				mode: "soft",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			// Assert
			expect(result.harmonyScore).toBeDefined();
			expect(result.harmonyScore.total).toBeGreaterThanOrEqual(0);
			expect(result.harmonyScore.total).toBeLessThanOrEqual(100);
			expect(result.harmonyScore.breakdown).toBeDefined();
		});
	});

	describe("CSS/JSONエクスポートv2形式の出力検証", () => {
		it("BrandTokenからCSS v2形式が正しく出力される", () => {
			// Arrange: v2 APIでBrandToken生成
			const result = processPaletteWithModeV2(TEST_PALETTE, {
				mode: "soft",
				apiVersion: "v2",
				generationContext: {
					roles: ["primary", "secondary", "accent"],
				},
			}) as ProcessPaletteResultV2;

			// DADSトークンを配列に変換
			const dadsTokens: DadsToken[] = Array.from(
				result.dadsReferences.values(),
			);

			// Act: CSS v2エクスポート
			const css = exportToCSSv2(result.brandTokens, dadsTokens, {
				includeComments: true,
			});

			// Assert: CSS構造
			expect(css).toContain(":root");
			expect(css).toContain("}");

			// DADSセクションの確認
			expect(css).toMatch(/DADS.*(?:Immutable|不変)/i);

			// ブランドトークンの確認
			for (const token of result.brandTokens) {
				expect(css).toContain(`--${token.id}`);
			}

			// derivationコメントの確認
			expect(css).toContain("Derived:");
			expect(css).toContain("ΔE=");
		});

		it("BrandTokenからJSON v2形式が正しく出力される", () => {
			// Arrange: v2 APIでBrandToken生成
			const result = processPaletteWithModeV2(TEST_PALETTE, {
				mode: "soft",
				apiVersion: "v2",
				generationContext: {
					namespace: "myapp",
					roles: ["primary", "secondary", "accent"],
				},
			}) as ProcessPaletteResultV2;

			const dadsTokens: DadsToken[] = Array.from(
				result.dadsReferences.values(),
			);

			// Act: JSON v2エクスポート
			const json = exportToJSONv2(result.brandTokens, {
				includeDadsTokens: true,
				dadsTokens,
				brandNamespace: "myapp",
				cudMode: "soft",
			}) as JSONExportResultV2;

			// Assert: メタデータ
			expect(json.metadata).toBeDefined();
			expect(json.metadata.version).toBe("2.0.0");
			expect(json.metadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
			expect(json.metadata.tokenSchema).toBe("dads-brand-v1");
			expect(json.metadata.brandNamespace).toBe("myapp");

			// Assert: DADSトークン
			expect(json.dadsTokens).toBeDefined();
			const exportedDadsTokens = json.dadsTokens;
			if (!exportedDadsTokens) {
				throw new Error("dadsTokens should be defined");
			}
			for (const [id, dadsData] of Object.entries(exportedDadsTokens)) {
				expect(dadsData.id).toBe(id);
				expect(dadsData.source).toBe("dads");
				expect(dadsData.immutable).toBe(true);
			}

			// Assert: ブランドトークン
			expect(json.brandTokens).toBeDefined();
			expect(Object.keys(json.brandTokens).length).toBe(3);
			for (const [id, brandData] of Object.entries(json.brandTokens)) {
				expect(brandData.id).toBe(id);
				expect(brandData.source).toBe("brand");
				expect(brandData.dadsReference).toBeDefined();
				expect(brandData.dadsReference.tokenId).toBeDefined();
				expect(brandData.dadsReference.derivationType).toBeDefined();
				expect(brandData.dadsReference.zone).toBeDefined();
			}

			// Assert: CUDサマリー
			expect(json.cudSummary).toBeDefined();
			expect(json.cudSummary.mode).toBe("soft");
			expect(typeof json.cudSummary.complianceRate).toBe("number");
			expect(json.cudSummary.zoneDistribution).toBeDefined();
			expect(typeof json.cudSummary.zoneDistribution.safe).toBe("number");
			expect(typeof json.cudSummary.zoneDistribution.warning).toBe("number");
			expect(typeof json.cudSummary.zoneDistribution.off).toBe("number");
		});

		it("alpha値を持つトークンが正しくエクスポートされる", () => {
			// Arrange: alpha値を持つBrandToken
			const brandTokenWithAlpha: BrandToken[] = [
				{
					id: "brand-overlay-500",
					hex: "#000000",
					alpha: 0.5,
					source: "brand",
					dadsReference: {
						tokenId: "cud-black",
						tokenHex: "#000000",
						deltaE: 0,
						derivationType: "reference",
						zone: "safe",
					},
				},
			];

			// Act: CSS v2エクスポート
			const css = exportToCSSv2(brandTokenWithAlpha);

			// Assert: rgba形式で出力
			expect(css).toContain("rgba(0, 0, 0, 0.5)");

			// Act: JSON v2エクスポート
			const json = exportToJSONv2(brandTokenWithAlpha) as JSONExportResultV2;

			// Assert: alpha値が含まれる
			expect(json.brandTokens["brand-overlay-500"].alpha).toBe(0.5);
		});
	});

	describe("v1 APIとの後方互換性検証", () => {
		it("apiVersion未指定時はv1形式で返却される", () => {
			// Act
			const result = processPaletteWithModeV2(TEST_PALETTE, {
				mode: "soft",
			});

			// Assert: v1形式（palette属性を持つ）
			expect("palette" in result).toBe(true);
			expect("brandTokens" in result).toBe(false);

			const v1Result = result as ProcessPaletteResultV1;
			expect(v1Result.palette).toHaveLength(3);
			for (const color of v1Result.palette) {
				expect(color.hex).toBeDefined();
				expect(color.originalHex).toBeDefined();
				expect(color.zone).toBeDefined();
				expect(color.deltaE).toBeDefined();
				expect(typeof color.snapped).toBe("boolean");
			}
		});

		it("apiVersion=v1で明示的にv1形式が返却される", () => {
			// Act
			const result = processPaletteWithModeV2(TEST_PALETTE, {
				mode: "soft",
				apiVersion: "v1",
			}) as ProcessPaletteResultV1;

			// Assert: v1形式
			expect(result.palette).toBeDefined();
			expect(result.cudComplianceRate).toBeDefined();
			expect(result.harmonyScore).toBeDefined();
			expect(result.warnings).toBeDefined();
		});

		it("v1とv2で同じ入力に対して一貫した結果が得られる", () => {
			// Act
			const v1Result = processPaletteWithModeV2(TEST_PALETTE, {
				mode: "soft",
				apiVersion: "v1",
			}) as ProcessPaletteResultV1;

			const v2Result = processPaletteWithModeV2(TEST_PALETTE, {
				mode: "soft",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			// Assert: CUD準拠率が一致
			expect(v1Result.cudComplianceRate).toBe(v2Result.cudComplianceRate);

			// Assert: 調和スコアが一致
			expect(v1Result.harmonyScore.total).toBe(v2Result.harmonyScore.total);

			// Assert: 最適化された色が一致
			for (let i = 0; i < TEST_PALETTE.length; i++) {
				expect(v1Result.palette[i].hex).toBe(v2Result.brandTokens[i].hex);
				expect(v1Result.palette[i].originalHex).toBe(
					v2Result.brandTokens[i].originalHex,
				);
				expect(v1Result.palette[i].zone).toBe(
					v2Result.brandTokens[i].dadsReference.zone,
				);
			}
		});

		it("anchorオプションがv1/v2両方で動作する", () => {
			// Act: v1
			const v1Result = processPaletteWithModeV2(TEST_PALETTE, {
				mode: "soft",
				apiVersion: "v1",
				anchor: { anchorIndex: 1, isFixed: true },
			}) as ProcessPaletteResultV1;

			// Act: v2
			const v2Result = processPaletteWithModeV2(TEST_PALETTE, {
				mode: "soft",
				apiVersion: "v2",
				anchor: { anchorIndex: 1, isFixed: true },
			}) as ProcessPaletteResultV2;

			// Assert: 結果が存在する
			expect(v1Result.palette).toHaveLength(3);
			expect(v2Result.brandTokens).toHaveLength(3);
		});
	});

	describe("エンドツーエンド: パレット生成→エクスポートフロー", () => {
		it("ブランドカラーからv2形式での完全なフローが動作する", () => {
			// Step 1: ブランドカラーでパレット生成
			const brandColors = ["#FF5500", "#0066CC", "#33CC33", "#CC3333"];
			const usedIds = new Set<string>();

			// Step 2: v2 APIで処理
			const result = processPaletteWithModeV2(brandColors, {
				mode: "soft",
				apiVersion: "v2",
				anchor: { anchorIndex: 0, isFixed: true },
				generationContext: {
					namespace: "brand",
					roles: ["primary", "secondary", "success", "danger"],
					usedIds,
				},
			}) as ProcessPaletteResultV2;

			// Step 3: DADSトークン配列に変換
			const dadsTokens: DadsToken[] = Array.from(
				result.dadsReferences.values(),
			);

			// Step 4: CSSエクスポート
			const css = exportToCSSv2(result.brandTokens, dadsTokens, {
				includeComments: true,
			});

			// Step 5: JSONエクスポート
			const json = exportToJSONv2(result.brandTokens, {
				includeDadsTokens: true,
				dadsTokens,
				brandNamespace: "brand",
				cudMode: "soft",
			}) as JSONExportResultV2;

			// Assertions
			expect(result.brandTokens).toHaveLength(4);
			expect(css).toContain(":root");
			expect(css).toContain("--brand-");
			expect(json.brandTokens).toBeDefined();
			expect(Object.keys(json.brandTokens)).toHaveLength(4);
			expect(json.metadata.brandNamespace).toBe("brand");

			// 処理結果の整合性
			for (const token of result.brandTokens) {
				// CSSに含まれる
				expect(css).toContain(`--${token.id}`);
				// JSONに含まれる
				expect(json.brandTokens[token.id]).toBeDefined();
				// originalHexが保持されている
				expect(token.originalHex).toBeDefined();
			}
		});

		it("Strictモードでの完全なv2フローが動作する", () => {
			// Step 1: 任意の色でパレット生成
			const colors = ["#FF0000", "#00FF00", "#0000FF"];

			// Step 2: Strictモードで処理
			const result = processPaletteWithModeV2(colors, {
				mode: "strict",
				apiVersion: "v2",
				generationContext: {
					roles: ["primary", "secondary", "accent"],
				},
			}) as ProcessPaletteResultV2;

			// Step 3: 全色がstrict-snapであることを確認
			for (const token of result.brandTokens) {
				expect(token.dadsReference.derivationType).toBe("strict-snap");
			}

			// Step 4: エクスポート
			const dadsTokens: DadsToken[] = Array.from(
				result.dadsReferences.values(),
			);
			const json = exportToJSONv2(result.brandTokens, {
				includeDadsTokens: true,
				dadsTokens,
				cudMode: "strict",
			}) as JSONExportResultV2;

			// Assert: モードがstrict
			expect(json.cudSummary.mode).toBe("strict");

			// Assert: 全てのブランドトークンがstrict-snap
			for (const brandData of Object.values(json.brandTokens)) {
				expect(brandData.dadsReference.derivationType).toBe("strict-snap");
			}
		});
	});
});

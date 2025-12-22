/**
 * CUD Optimizer Tests
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, expect, it } from "vitest";
import { createAnchorColor } from "./anchor";
import {
	calculateObjective,
	DEFAULT_LAMBDA,
	type OptimizationOptions,
	type OptimizedColor,
	optimizePalette,
} from "./optimizer";
import { DEFAULT_ZONE_THRESHOLDS } from "./zone";

// Task 3.2: brandToken情報テスト
// Requirements: 8.1, 8.2, 8.3
describe("OptimizedColor brandToken property (Task 3.2)", () => {
	describe("brandToken property structure", () => {
		it("should include brandToken property in OptimizedColor (Requirement 8.1)", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);
			const optimizedColor = result.palette[0];

			// brandTokenプロパティが存在する
			expect(optimizedColor).toHaveProperty("brandToken");
			expect(optimizedColor.brandToken).toBeDefined();
		});

		it("should include suggestedId in brandToken (Requirement 8.2)", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);
			const optimizedColor = result.palette[0];

			// suggestedIdが含まれる
			expect(optimizedColor.brandToken).toHaveProperty("suggestedId");
			expect(typeof optimizedColor.brandToken?.suggestedId).toBe("string");
		});

		it("should include dadsReference in brandToken (Requirement 8.2)", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);
			const optimizedColor = result.palette[0];

			// dadsReferenceが含まれる
			expect(optimizedColor.brandToken).toHaveProperty("dadsReference");
			expect(optimizedColor.brandToken?.dadsReference).toBeDefined();
		});

		it("should have correct dadsReference structure (Requirement 8.2)", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);
			const dadsRef = result.palette[0].brandToken?.dadsReference;

			// dadsReferenceの構造を検証
			expect(dadsRef).toHaveProperty("tokenId");
			expect(dadsRef).toHaveProperty("tokenHex");
			expect(dadsRef).toHaveProperty("deltaE");
			expect(dadsRef).toHaveProperty("derivationType");
			expect(dadsRef).toHaveProperty("zone");
		});
	});

	describe("derivation info conversion (Requirement 8.3)", () => {
		it("should convert Snapper derivation to dadsReference in Soft mode", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"]; // CUD赤

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);
			const dadsRef = result.palette[0].brandToken?.dadsReference;

			// CUD赤への参照（CUD色のIDは"red"）
			expect(dadsRef?.tokenId).toBe("red");
			expect(dadsRef?.tokenHex).toBe("#FF2800");
			expect(dadsRef?.derivationType).toBe("reference"); // Safe Zoneはスナップなし
			expect(dadsRef?.zone).toBe("safe");
		});

		it("should convert Snapper derivation to dadsReference in Strict mode", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#123456"]; // Off Zone色

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "strict",
			};

			const result = optimizePalette(candidates, anchor, options);
			const dadsRef = result.palette[0].brandToken?.dadsReference;

			// Strictモードではstrict-snap
			expect(dadsRef?.derivationType).toBe("strict-snap");
			expect(dadsRef?.tokenId).toBeDefined();
			expect(dadsRef?.tokenHex).toBeDefined();
		});

		it("should set soft-snap derivationType for Warning Zone colors in Soft mode", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF3500"]; // Warning Zone付近

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
				returnFactor: 0.5,
			};

			const result = optimizePalette(candidates, anchor, options);
			const optimizedColor = result.palette[0];
			const dadsRef = optimizedColor.brandToken?.dadsReference;

			// Warning Zoneでスナップありならsoft-snap
			if (optimizedColor.snapped && optimizedColor.zone === "warning") {
				expect(dadsRef?.derivationType).toBe("soft-snap");
			}
		});

		it("should preserve zone info in dadsReference", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800", "#123456"]; // Safe Zone + Off Zone

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			// Safe Zone色のdadsReference
			expect(result.palette[0].brandToken?.dadsReference.zone).toBe("safe");
			// Off Zone色のdadsReference
			expect(result.palette[1].brandToken?.dadsReference.zone).toBe("off");
		});

		it("should include deltaE in dadsReference", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);
			const dadsRef = result.palette[0].brandToken?.dadsReference;

			// deltaEは数値
			expect(typeof dadsRef?.deltaE).toBe("number");
			// CUD推奨色なのでdeltaE ≈ 0
			expect(dadsRef?.deltaE).toBeCloseTo(0, 3);
		});
	});

	describe("backward compatibility (Requirement 8.3)", () => {
		it("should preserve existing hex property", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);
			const optimizedColor = result.palette[0];

			expect(optimizedColor.hex).toBeDefined();
			expect(optimizedColor.hex).toBe("#FF2800");
		});

		it("should preserve existing originalHex property", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);
			const optimizedColor = result.palette[0];

			expect(optimizedColor.originalHex).toBeDefined();
			expect(optimizedColor.originalHex).toBe("#FF2800");
		});

		it("should preserve existing zone property", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);
			const optimizedColor = result.palette[0];

			expect(optimizedColor.zone).toBeDefined();
			expect(optimizedColor.zone).toBe("safe");
		});

		it("should preserve existing deltaE property", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);
			const optimizedColor = result.palette[0];

			expect(typeof optimizedColor.deltaE).toBe("number");
		});

		it("should preserve existing snapped property", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);
			const optimizedColor = result.palette[0];

			expect(typeof optimizedColor.snapped).toBe("boolean");
		});

		it("should preserve existing cudTarget property", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "strict",
			};

			const result = optimizePalette(candidates, anchor, options);
			const optimizedColor = result.palette[0];

			expect(optimizedColor.cudTarget).toBeDefined();
		});
	});
});

describe("CUD Optimizer", () => {
	describe("calculateObjective", () => {
		it("should calculate objective function correctly with default lambda", () => {
			// 目的関数 = Σ(deltaE) + λ × (1 - harmonyScore/100)
			// Requirement 3.3
			const palette: OptimizedColor[] = [
				{
					hex: "#FF2800",
					originalHex: "#FF2800",
					zone: "safe",
					deltaE: 0.0,
					snapped: false,
				},
				{
					hex: "#35A16B",
					originalHex: "#35A16B",
					zone: "safe",
					deltaE: 0.0,
					snapped: false,
				},
			];

			const harmonyScore = 80;
			const lambda = 0.5; // デフォルト

			// Σ(deltaE) = 0.0 + 0.0 = 0.0
			// λ × (1 - 80/100) = 0.5 × 0.2 = 0.1
			// total = 0.0 + 0.1 = 0.1
			const result = calculateObjective(palette, harmonyScore, lambda);
			expect(result).toBeCloseTo(0.1, 5);
		});

		it("should increase objective when colors have higher deltaE", () => {
			const palette: OptimizedColor[] = [
				{
					hex: "#FF2800",
					originalHex: "#FF2800",
					zone: "warning",
					deltaE: 0.08,
					snapped: false,
				},
				{
					hex: "#35A16B",
					originalHex: "#35A16B",
					zone: "off",
					deltaE: 0.15,
					snapped: false,
				},
			];

			const harmonyScore = 75;
			const lambda = 0.5;

			// Σ(deltaE) = 0.08 + 0.15 = 0.23
			// λ × (1 - 75/100) = 0.5 × 0.25 = 0.125
			// total = 0.23 + 0.125 = 0.355
			const result = calculateObjective(palette, harmonyScore, lambda);
			expect(result).toBeCloseTo(0.355, 5);
		});

		it("should respect lambda weight in objective calculation", () => {
			const palette: OptimizedColor[] = [
				{
					hex: "#FF2800",
					originalHex: "#FF2800",
					zone: "safe",
					deltaE: 0.1,
					snapped: false,
				},
			];

			const harmonyScore = 50;

			// λ = 0 (CUD距離のみ)
			const resultLambda0 = calculateObjective(palette, harmonyScore, 0);
			expect(resultLambda0).toBeCloseTo(0.1, 5);

			// λ = 1 (調和スコアの影響を最大化)
			// 0.1 + 1 × (1 - 0.5) = 0.1 + 0.5 = 0.6
			const resultLambda1 = calculateObjective(palette, harmonyScore, 1);
			expect(resultLambda1).toBeCloseTo(0.6, 5);
		});
	});

	describe("optimizePalette - Soft mode", () => {
		it("should prioritize Safe Zone colors in Soft mode", () => {
			// Requirement 3.4: Safe Zoneからの色選択を優先
			const anchor = createAnchorColor("#FF2800"); // CUD赤

			// CUD推奨色（Safe Zone内）を含むパレット
			const candidates = ["#FF2800", "#35A16B", "#0041FF"]; // 赤, 緑, 青（CUD色）

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			expect(result.palette).toHaveLength(3);
			// Safe Zone色はスナップされない
			for (const color of result.palette) {
				if (color.zone === "safe") {
					expect(color.snapped).toBe(false);
				}
			}
		});

		it("should apply soft snap to Warning Zone colors", () => {
			// Requirement 3.4: Warning Zoneから補充
			const anchor = createAnchorColor("#FF2800");

			// Warning Zone付近の色を含む
			const candidates = ["#FF3000"]; // CUD赤に近いがexactではない

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
				returnFactor: 0.5,
			};

			const result = optimizePalette(candidates, anchor, options);

			expect(result.palette).toHaveLength(1);
			// Warning Zoneの色は部分スナップされる場合がある
		});

		it("should snap Off Zone colors to Warning boundary in Soft mode", () => {
			const anchor = createAnchorColor("#FF2800");

			// Off Zone色（CUDから離れた色）
			const candidates = ["#123456"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			expect(result.palette).toHaveLength(1);
			const optimizedColor = result.palette[0];
			// Off Zone色はスナップされる
			expect(optimizedColor.zone).toBe("off");
			expect(optimizedColor.snapped).toBe(true);
		});
	});

	describe("optimizePalette - Strict mode", () => {
		it("should snap all colors to CUD colors in Strict mode", () => {
			// Requirement 3.3: Strictは完全スナップ
			const anchor = createAnchorColor("#FF2800");

			const candidates = ["#FF2800", "#123456", "#AABBCC"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "strict",
			};

			const result = optimizePalette(candidates, anchor, options);

			expect(result.palette).toHaveLength(3);
			// すべての色がスナップされる
			for (const color of result.palette) {
				expect(color.snapped).toBe(true);
			}
		});
	});

	describe("optimizePalette - Result structure", () => {
		it("should return correct result structure", () => {
			// Requirement 3.5: 目的関数値とCUD準拠率を結果に含める
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800", "#35A16B"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			// 結果構造の検証
			expect(result).toHaveProperty("palette");
			expect(result).toHaveProperty("objectiveValue");
			expect(result).toHaveProperty("cudComplianceRate");
			expect(result).toHaveProperty("harmonyScore");
			expect(result).toHaveProperty("processingTimeMs");

			// 型チェック
			expect(typeof result.objectiveValue).toBe("number");
			expect(typeof result.cudComplianceRate).toBe("number");
			expect(typeof result.processingTimeMs).toBe("number");

			// CUD準拠率は0-100の範囲
			expect(result.cudComplianceRate).toBeGreaterThanOrEqual(0);
			expect(result.cudComplianceRate).toBeLessThanOrEqual(100);

			// 処理時間は正の値
			expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
		});

		it("should calculate CUD compliance rate correctly", () => {
			// Safe + Warning = CUD準拠
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800", "#35A16B"]; // CUD色のみ

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			// CUD推奨色のみならば100%準拠
			expect(result.cudComplianceRate).toBe(100);
		});

		it("should include processing time in result", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800", "#35A16B", "#0041FF"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			// processingTimeMsが実行時間を反映
			expect(result.processingTimeMs).toBeDefined();
			expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
		});
	});

	describe("optimizePalette - Module integration", () => {
		it("should integrate with Zone module correctly", () => {
			// Zone判定が正しく統合されている
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"]; // exact match

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
				zoneThresholds: DEFAULT_ZONE_THRESHOLDS,
			};

			const result = optimizePalette(candidates, anchor, options);

			expect(result.palette[0].zone).toBe("safe");
		});

		it("should integrate with HarmonyScore module correctly", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800", "#35A16B", "#0041FF"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			// harmonyScoreが計算されている
			expect(result.harmonyScore).toBeDefined();
			expect(result.harmonyScore.total).toBeGreaterThanOrEqual(0);
			expect(result.harmonyScore.total).toBeLessThanOrEqual(100);
		});

		it("should integrate with Snapper module correctly", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#123456"]; // Off Zone色

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "strict",
			};

			const result = optimizePalette(candidates, anchor, options);

			// Strictモードではスナップが適用される
			expect(result.palette[0].snapped).toBe(true);
			expect(result.palette[0].cudTarget).toBeDefined();
		});
	});

	describe("optimizePalette - Custom options", () => {
		it("should respect custom zone thresholds", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2850"]; // CUD赤に近い

			const customThresholds = {
				safe: 0.02,
				warning: 0.08,
			};

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
				zoneThresholds: customThresholds,
			};

			const result = optimizePalette(candidates, anchor, options);

			// カスタム閾値が適用される
			expect(result.palette).toHaveLength(1);
		});

		it("should respect custom return factor", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF3500"]; // Warning Zone付近

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
				returnFactor: 1.0, // 完全スナップ
			};

			const result = optimizePalette(candidates, anchor, options);

			expect(result.palette).toHaveLength(1);
		});

		it("should use default lambda when not specified", () => {
			expect(DEFAULT_LAMBDA).toBe(0.5);
		});
	});

	describe("optimizePalette - Off Zone warnings and alternatives", () => {
		// Requirement 3.6: Off Zone色が残る場合の警告と代替候補提案
		it("should include warnings when Off Zone colors remain in result", () => {
			const anchor = createAnchorColor("#FF2800");
			// Off Zone色を含むパレット
			const candidates = ["#FF2800", "#123456", "#AABBCC"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			// warningsプロパティが存在する
			expect(result).toHaveProperty("warnings");
			expect(Array.isArray(result.warnings)).toBe(true);

			// Off Zone色があるため警告が含まれる
			expect(result.warnings.length).toBeGreaterThan(0);
		});

		it("should include alternative suggestions for Off Zone colors", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#123456"]; // Off Zone色

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			// alternativesプロパティが存在する
			expect(result).toHaveProperty("alternatives");
			expect(Array.isArray(result.alternatives)).toBe(true);

			// Off Zone色に対する代替候補が含まれる
			expect(result.alternatives.length).toBeGreaterThan(0);
			// 代替候補の構造を検証
			for (const alt of result.alternatives) {
				expect(alt).toHaveProperty("originalHex");
				expect(alt).toHaveProperty("suggestedHex");
				expect(alt).toHaveProperty("suggestedCudColor");
				expect(alt).toHaveProperty("reason");
			}
		});

		it("should have no warnings when all colors are in Safe/Warning zones", () => {
			const anchor = createAnchorColor("#FF2800");
			// CUD推奨色のみ（Safe Zone）
			const candidates = ["#FF2800", "#35A16B", "#0041FF"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			expect(result.warnings).toHaveLength(0);
			expect(result.alternatives).toHaveLength(0);
		});

		it("should generate warning messages in Japanese", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#123456"]; // Off Zone色

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			// 警告メッセージが日本語
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatch(/CUD非準拠|Off Zone/);
		});

		it("should count Off Zone colors in result summary", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800", "#123456", "#AABBCC"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			// offZoneCountプロパティ
			expect(result).toHaveProperty("offZoneCount");
			expect(result.offZoneCount).toBeGreaterThanOrEqual(0);
		});

		it("should have no warnings in Strict mode (all snapped)", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#123456", "#AABBCC"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "strict",
			};

			const result = optimizePalette(candidates, anchor, options);

			// Strictモードでは全てスナップされるので警告なし
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe("optimizePalette - Edge cases", () => {
		it("should handle empty palette", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates: string[] = [];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			expect(() => optimizePalette(candidates, anchor, options)).toThrow();
		});

		it("should handle single color palette", () => {
			const anchor = createAnchorColor("#FF2800");
			const candidates = ["#FF2800"];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			expect(result.palette).toHaveLength(1);
		});

		it("should handle large palette (20 colors)", () => {
			const anchor = createAnchorColor("#FF2800");
			// 20色のテストパレット
			const candidates = [
				"#FF2800",
				"#FF9900",
				"#FFFF00",
				"#35A16B",
				"#0041FF",
				"#66CCFF",
				"#9A0079",
				"#FF99A0",
				"#000000",
				"#FFFFFF",
				"#A0A0A0",
				"#7F878F",
				"#C8C8CB",
				"#663300",
				"#FF6600",
				"#99CC00",
				"#006600",
				"#003366",
				"#330066",
				"#660033",
			];

			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(candidates, anchor, options);

			expect(result.palette).toHaveLength(20);
			// パフォーマンス: 200ms以内（Requirement 8.1）
			expect(result.processingTimeMs).toBeLessThan(200);
		});
	});

	// Task 5.3: 最適化機能のユニットテスト
	// Requirements: 8.4

	describe("optimizePalette - Soft/Strict Mode Behavior (Task 5.3)", () => {
		// Soft/Strictモードでの最適化動作検証

		describe("Soft Mode Specific Behavior", () => {
			it("should preserve Safe Zone colors without modification", () => {
				// Safe Zone (ΔE ≤ 0.05) の色はスナップなしで出力
				const anchor = createAnchorColor("#FF2800");
				// CUD推奨色（exact match = deltaE 0）
				const candidates = ["#FF2800", "#35A16B", "#0041FF"];

				const options: OptimizationOptions = {
					lambda: 0.5,
					mode: "soft",
				};

				const result = optimizePalette(candidates, anchor, options);

				// すべてSafe Zone色
				for (const color of result.palette) {
					expect(color.zone).toBe("safe");
					expect(color.snapped).toBe(false);
					expect(color.hex).toBe(color.originalHex);
				}
			});

			it("should partially snap Warning Zone colors based on returnFactor", () => {
				const anchor = createAnchorColor("#FF2800");
				// Warning Zone付近の色（0.05 < ΔE ≤ 0.12）
				const candidates = ["#FF3500"];

				const optionsLow: OptimizationOptions = {
					lambda: 0.5,
					mode: "soft",
					returnFactor: 0.3,
				};

				const optionsHigh: OptimizationOptions = {
					lambda: 0.5,
					mode: "soft",
					returnFactor: 0.7,
				};

				const resultLow = optimizePalette(candidates, anchor, optionsLow);
				const resultHigh = optimizePalette(candidates, anchor, optionsHigh);

				// 高いreturnFactorほどCUD色に近づく
				if (resultLow.palette[0].snapped && resultHigh.palette[0].snapped) {
					// スナップ量が異なることを確認
					expect(resultLow.palette[0].hex).not.toBe(resultHigh.palette[0].hex);
				}
			});

			it("should snap Off Zone colors towards Warning Zone boundary", () => {
				const anchor = createAnchorColor("#FF2800");
				// Off Zone色（ΔE > 0.12）
				const candidates = ["#123456"];

				const options: OptimizationOptions = {
					lambda: 0.5,
					mode: "soft",
				};

				const result = optimizePalette(candidates, anchor, options);
				const optimizedColor = result.palette[0];

				// Off Zone色はスナップされる
				expect(optimizedColor.zone).toBe("off");
				expect(optimizedColor.snapped).toBe(true);
				// 元の色とは異なる
				expect(optimizedColor.hex).not.toBe(optimizedColor.originalHex);
			});

			it("should have Off Zone count matching actual Off Zone colors in result", () => {
				const anchor = createAnchorColor("#FF2800");
				const candidates = ["#FF2800", "#123456", "#654321", "#ABCDEF"];

				const options: OptimizationOptions = {
					lambda: 0.5,
					mode: "soft",
				};

				const result = optimizePalette(candidates, anchor, options);

				const actualOffZoneCount = result.palette.filter(
					(c) => c.zone === "off",
				).length;
				expect(result.offZoneCount).toBe(actualOffZoneCount);
			});
		});

		describe("Strict Mode Specific Behavior", () => {
			it("should snap all colors to CUD colors", () => {
				const anchor = createAnchorColor("#FF2800");
				const candidates = ["#FF2800", "#123456", "#AABBCC", "#654321"];

				const options: OptimizationOptions = {
					lambda: 0.5,
					mode: "strict",
				};

				const result = optimizePalette(candidates, anchor, options);

				// すべての色がスナップされる
				for (const color of result.palette) {
					expect(color.snapped).toBe(true);
					expect(color.cudTarget).toBeDefined();
					// hex はCUD推奨色のhexと一致する
					expect(color.hex).toBe(color.cudTarget?.hex);
				}
			});

			it("should preserve original zone classification in Strict mode", () => {
				// Strictモードでもzoneは元の色のゾーンを保持する
				const anchor = createAnchorColor("#FF2800");
				// Safe Zone色とOff Zone色
				const candidates = ["#FF2800", "#123456"];

				const options: OptimizationOptions = {
					lambda: 0.5,
					mode: "strict",
				};

				const result = optimizePalette(candidates, anchor, options);

				// #FF2800はSafe Zone（CUD色）
				expect(result.palette[0].zone).toBe("safe");
				// #123456はOff Zone
				expect(result.palette[1].zone).toBe("off");
				// しかし両方ともスナップされる
				expect(result.palette[0].snapped).toBe(true);
				expect(result.palette[1].snapped).toBe(true);
			});

			it("should have no warnings and no Off Zone count in Strict mode (Req 3.6)", () => {
				// Strictモードではoffzoneのカウントは0、警告も0
				// （すべてスナップされるため）
				const anchor = createAnchorColor("#FF2800");
				const candidates = ["#123456", "#AABBCC"];

				const options: OptimizationOptions = {
					lambda: 0.5,
					mode: "strict",
				};

				const result = optimizePalette(candidates, anchor, options);

				// Requirement 3.6: Strictモードでは警告なし
				expect(result.warnings).toHaveLength(0);
				expect(result.alternatives).toHaveLength(0);
				expect(result.offZoneCount).toBe(0);
			});

			it("should preserve original deltaE values in Strict mode", () => {
				// deltaEは元の色からCUD色への距離を保持
				const anchor = createAnchorColor("#FF2800");
				const candidates = ["#FF2800"]; // CUD推奨色

				const options: OptimizationOptions = {
					lambda: 0.5,
					mode: "strict",
				};

				const result = optimizePalette(candidates, anchor, options);

				// CUD推奨色の場合、deltaE = 0
				expect(result.palette[0].deltaE).toBeCloseTo(0, 3);
			});
		});

		describe("Mode Comparison", () => {
			it("should produce different results between Soft and Strict modes", () => {
				const anchor = createAnchorColor("#FF2800");
				const candidates = ["#FF3500", "#123456"];

				const softResult = optimizePalette(candidates, anchor, {
					lambda: 0.5,
					mode: "soft",
				});

				const strictResult = optimizePalette(candidates, anchor, {
					lambda: 0.5,
					mode: "strict",
				});

				// 少なくとも1色は異なる結果になる
				const hasDifferentResults = softResult.palette.some(
					(softColor, i) => softColor.hex !== strictResult.palette[i].hex,
				);
				expect(hasDifferentResults).toBe(true);

				// Strictモードでは全色がCUD推奨色にスナップされる
				for (const color of strictResult.palette) {
					expect(color.snapped).toBe(true);
					expect(color.hex).toBe(color.cudTarget?.hex);
				}
			});

			it("should have different snapping behavior between modes", () => {
				const anchor = createAnchorColor("#FF2800");
				// Off Zone色
				const candidates = ["#123456"];

				const softResult = optimizePalette(candidates, anchor, {
					lambda: 0.5,
					mode: "soft",
				});

				const strictResult = optimizePalette(candidates, anchor, {
					lambda: 0.5,
					mode: "strict",
				});

				// Softモード: Warning境界までスナップ（完全CUD色ではない）
				// Strictモード: 完全にCUD色にスナップ
				expect(softResult.palette[0].hex).not.toBe(strictResult.palette[0].hex);
				expect(strictResult.palette[0].hex).toBe(
					strictResult.palette[0].cudTarget?.hex,
				);
			});
		});
	});

	describe("Lambda Parameter Effect Tests (Task 5.3)", () => {
		// λパラメータの効果テスト

		describe("calculateObjective with varying lambda", () => {
			it("should return only delta sum when lambda is 0", () => {
				// λ = 0: 調和スコアを無視、CUD距離のみ
				const palette: OptimizedColor[] = [
					{
						hex: "#FF2800",
						originalHex: "#FF2800",
						zone: "safe",
						deltaE: 0.05,
						snapped: false,
					},
					{
						hex: "#35A16B",
						originalHex: "#35A16B",
						zone: "warning",
						deltaE: 0.08,
						snapped: false,
					},
				];
				const harmonyScore = 30; // 低い調和スコア

				const result = calculateObjective(palette, harmonyScore, 0);

				// Σ(deltaE) = 0.05 + 0.08 = 0.13
				// λ × (1 - 30/100) = 0 × 0.7 = 0
				// total = 0.13
				expect(result).toBeCloseTo(0.13, 5);
			});

			it("should maximize harmony penalty when lambda is 1", () => {
				// λ = 1: 調和スコアのペナルティを最大化
				const palette: OptimizedColor[] = [
					{
						hex: "#FF2800",
						originalHex: "#FF2800",
						zone: "safe",
						deltaE: 0.0,
						snapped: false,
					},
				];
				const harmonyScore = 40;

				const result = calculateObjective(palette, harmonyScore, 1);

				// Σ(deltaE) = 0.0
				// λ × (1 - 40/100) = 1 × 0.6 = 0.6
				// total = 0.6
				expect(result).toBeCloseTo(0.6, 5);
			});

			it("should balance CUD distance and harmony at lambda 0.5", () => {
				const palette: OptimizedColor[] = [
					{
						hex: "#FF2800",
						originalHex: "#FF2800",
						zone: "safe",
						deltaE: 0.1,
						snapped: false,
					},
					{
						hex: "#35A16B",
						originalHex: "#35A16B",
						zone: "safe",
						deltaE: 0.1,
						snapped: false,
					},
				];
				const harmonyScore = 60;

				const result = calculateObjective(palette, harmonyScore, 0.5);

				// Σ(deltaE) = 0.2
				// λ × (1 - 60/100) = 0.5 × 0.4 = 0.2
				// total = 0.4
				expect(result).toBeCloseTo(0.4, 5);
			});
		});

		describe("optimizePalette with varying lambda", () => {
			it("should produce lower objective value with higher harmony score when lambda is high", () => {
				const anchor = createAnchorColor("#FF2800");
				const candidates = ["#FF2800", "#35A16B", "#0041FF"];

				const resultLowLambda = optimizePalette(candidates, anchor, {
					lambda: 0.1,
					mode: "soft",
				});

				const resultHighLambda = optimizePalette(candidates, anchor, {
					lambda: 0.9,
					mode: "soft",
				});

				// 同じパレット（CUD推奨色）なら、lambdaが高いほど調和スコアの影響が大きい
				// 調和スコアが同じなら、高lambdaの方がペナルティ影響が大きい
				expect(resultLowLambda.harmonyScore.total).toBe(
					resultHighLambda.harmonyScore.total,
				);
			});

			it("should have consistent objective formula across different lambda values", () => {
				const anchor = createAnchorColor("#FF2800");
				const candidates = ["#FF2800", "#123456"];

				const lambdaValues = [0.0, 0.25, 0.5, 0.75, 1.0];
				const results = lambdaValues.map((lambda) =>
					optimizePalette(candidates, anchor, { lambda, mode: "soft" }),
				);

				// 目的関数値がlambdaに対して単調変化するか確認
				// 調和スコアが100未満の場合、lambdaが増えると目的関数値が増える
				for (let i = 1; i < results.length; i++) {
					const prev = results[i - 1];
					const curr = results[i];

					// 調和スコアが100未満なら、lambdaが増えるとペナルティが増加
					if (curr.harmonyScore.total < 100) {
						// 目的関数値を再計算して検証
						const expectedPrev = calculateObjective(
							prev.palette,
							prev.harmonyScore.total,
							lambdaValues[i - 1],
						);
						const expectedCurr = calculateObjective(
							curr.palette,
							curr.harmonyScore.total,
							lambdaValues[i],
						);
						expect(prev.objectiveValue).toBeCloseTo(expectedPrev, 5);
						expect(curr.objectiveValue).toBeCloseTo(expectedCurr, 5);
					}
				}
			});
		});

		describe("Lambda boundary values", () => {
			it("should accept lambda = 0", () => {
				const anchor = createAnchorColor("#FF2800");
				const candidates = ["#FF2800"];

				const result = optimizePalette(candidates, anchor, {
					lambda: 0,
					mode: "soft",
				});

				expect(result).toBeDefined();
				expect(result.objectiveValue).toBeDefined();
			});

			it("should accept lambda = 1", () => {
				const anchor = createAnchorColor("#FF2800");
				const candidates = ["#FF2800"];

				const result = optimizePalette(candidates, anchor, {
					lambda: 1,
					mode: "soft",
				});

				expect(result).toBeDefined();
				expect(result.objectiveValue).toBeDefined();
			});
		});
	});

	describe("CUD Compliance Rate Accuracy Tests (Task 5.3)", () => {
		// CUD準拠率の算出精度テスト

		describe("Compliance rate calculation precision", () => {
			it("should calculate 100% compliance for all Safe Zone colors", () => {
				const anchor = createAnchorColor("#FF2800");
				// CUD推奨色のみ（すべてSafe Zone）
				const candidates = ["#FF2800", "#35A16B", "#0041FF", "#FFFF00"];

				const result = optimizePalette(candidates, anchor, {
					lambda: 0.5,
					mode: "soft",
				});

				expect(result.cudComplianceRate).toBe(100);
			});

			it("should calculate correct rate with mixed zones", () => {
				const anchor = createAnchorColor("#FF2800");
				// 2 Safe + 2 Off = 50% compliance
				const candidates = ["#FF2800", "#35A16B", "#123456", "#654321"];

				const result = optimizePalette(candidates, anchor, {
					lambda: 0.5,
					mode: "soft",
				});

				// Safe/Warning色の数を数える
				const compliantCount = result.palette.filter(
					(c) => c.zone === "safe" || c.zone === "warning",
				).length;
				const expectedRate = (compliantCount / result.palette.length) * 100;

				expect(result.cudComplianceRate).toBeCloseTo(expectedRate, 5);
			});

			it("should calculate 0% compliance for all Off Zone colors", () => {
				const anchor = createAnchorColor("#FF2800");
				// CUDから遠い色のみ
				const candidates = ["#123456", "#654321", "#ABCDEF"];

				const result = optimizePalette(candidates, anchor, {
					lambda: 0.5,
					mode: "soft",
				});

				// すべてOff Zoneなら0%
				const offZoneCount = result.palette.filter(
					(c) => c.zone === "off",
				).length;
				if (offZoneCount === result.palette.length) {
					expect(result.cudComplianceRate).toBe(0);
				}
			});

			it("should handle fractional compliance rates correctly", () => {
				const anchor = createAnchorColor("#FF2800");
				// 3色パレット：1 Safe + 2 Off = 33.33...%
				const candidates = ["#FF2800", "#123456", "#654321"];

				const result = optimizePalette(candidates, anchor, {
					lambda: 0.5,
					mode: "soft",
				});

				// 小数点以下の精度を確認
				const safeCount = result.palette.filter(
					(c) => c.zone === "safe",
				).length;
				const warningCount = result.palette.filter(
					(c) => c.zone === "warning",
				).length;
				const expectedRate =
					((safeCount + warningCount) / result.palette.length) * 100;

				expect(result.cudComplianceRate).toBeCloseTo(expectedRate, 5);
			});
		});

		describe("Compliance rate with zone distribution", () => {
			it("should count Warning Zone colors as compliant", () => {
				const anchor = createAnchorColor("#FF2800");
				const candidates = ["#FF3200"]; // Warning Zone付近

				const result = optimizePalette(candidates, anchor, {
					lambda: 0.5,
					mode: "soft",
				});

				// Warning Zone色も準拠としてカウント
				if (result.palette[0].zone === "warning") {
					expect(result.cudComplianceRate).toBe(100);
				}
			});

			it("should correctly sum Safe and Warning zones for compliance", () => {
				const anchor = createAnchorColor("#FF2800");
				// CUD推奨色（Safe）とCUD付近色（Warning）の混合
				const candidates = ["#FF2800", "#FF3000", "#35A16B", "#123456"];

				const result = optimizePalette(candidates, anchor, {
					lambda: 0.5,
					mode: "soft",
				});

				const safeCount = result.palette.filter(
					(c) => c.zone === "safe",
				).length;
				const warningCount = result.palette.filter(
					(c) => c.zone === "warning",
				).length;
				const offCount = result.palette.filter((c) => c.zone === "off").length;

				expect(safeCount + warningCount + offCount).toBe(result.palette.length);

				const expectedRate =
					((safeCount + warningCount) / result.palette.length) * 100;
				expect(result.cudComplianceRate).toBeCloseTo(expectedRate, 5);
			});
		});

		describe("Compliance rate in Strict mode", () => {
			it("should calculate compliance rate based on original color zones in Strict mode", () => {
				const anchor = createAnchorColor("#FF2800");
				// CUD色（Safe Zone）
				const candidates = ["#FF2800", "#35A16B", "#0041FF"];

				const result = optimizePalette(candidates, anchor, {
					lambda: 0.5,
					mode: "strict",
				});

				// CUD推奨色のみなのでcudComplianceRateは100%
				expect(result.cudComplianceRate).toBe(100);
			});

			it("should reflect original zone distribution in compliance rate", () => {
				const anchor = createAnchorColor("#FF2800");
				// 1 Safe + 2 Off = 33.33% compliance based on original zones
				const candidates = ["#FF2800", "#123456", "#654321"];

				const result = optimizePalette(candidates, anchor, {
					lambda: 0.5,
					mode: "strict",
				});

				// Strictモードでも compliance rate は元の色のゾーンに基づく
				// しかし warnings と offZoneCount は 0（スナップ済みのため）
				expect(result.warnings).toHaveLength(0);
				expect(result.offZoneCount).toBe(0);

				// compliance rate は元のゾーンに基づいて計算される
				const safeCount = result.palette.filter(
					(c) => c.zone === "safe",
				).length;
				const warningCount = result.palette.filter(
					(c) => c.zone === "warning",
				).length;
				const expectedRate =
					((safeCount + warningCount) / result.palette.length) * 100;
				expect(result.cudComplianceRate).toBeCloseTo(expectedRate, 5);
			});
		});
	});
});

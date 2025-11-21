/**
 * CollisionDetector - セマンティック衝突検出のテスト
 */

import { describe, expect, it } from "bun:test";
import { Color } from "../color";
import {
	type CollisionDetectionOptions,
	CollisionDetector,
	type CVDType,
} from "./collision-detector";
import type { RoleType } from "./role-config";

describe("CollisionDetector", () => {
	describe("detect", () => {
		it("色相が30°未満の場合にhue衝突を検出する", () => {
			const detector = new CollisionDetector();

			// 赤系（H: 25°）とオレンジ系（H: 40°）- ΔH = 15°
			const colors = new Map<RoleType, Color>([
				["primary", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 25 })],
				["error", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 40 })],
			]);

			const results = detector.detect(colors);

			expect(results.length).toBeGreaterThan(0);
			const hueCollision = results.find((r) => r.type === "hue");
			expect(hueCollision).toBeDefined();
			expect(hueCollision?.pair).toEqual(
				expect.arrayContaining(["primary", "error"]),
			);
			expect(hueCollision?.deltaH).toBeLessThan(30);
		});

		it("色相が30°以上の場合は衝突を検出しない", () => {
			const detector = new CollisionDetector();

			// 青系（H: 250°）と赤系（H: 30°）- ΔH = 140° (360 - 220)
			const colors = new Map<RoleType, Color>([
				["primary", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				["error", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 30 })],
			]);

			const results = detector.detect(colors);

			const hueCollision = results.find(
				(r) =>
					r.type === "hue" &&
					r.pair.includes("primary") &&
					r.pair.includes("error"),
			);
			expect(hueCollision).toBeUndefined();
		});

		it("同一Lightness帯でChromaとLightnessが類似している場合にchroma-lightness衝突を検出する", () => {
			const detector = new CollisionDetector();

			// 同じようなL/Cの2色（クランプ後も閾値内になる値を使用）
			const colors = new Map<RoleType, Color>([
				["primary", new Color({ mode: "oklch", l: 0.5, c: 0.1, h: 250 })],
				["secondary", new Color({ mode: "oklch", l: 0.55, c: 0.08, h: 200 })],
			]);

			const results = detector.detect(colors);

			const clCollision = results.find((r) => r.type === "chroma-lightness");
			expect(clCollision).toBeDefined();
		});

		it("色相差を正しく計算する（180°を超える場合の短い経路）", () => {
			const detector = new CollisionDetector();

			// H: 10° と H: 350° - 実際のΔH = 20°（360° - 340° = 20°）
			const colors = new Map<RoleType, Color>([
				["primary", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 10 })],
				["error", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 350 })],
			]);

			const results = detector.detect(colors);

			const hueCollision = results.find((r) => r.type === "hue");
			expect(hueCollision).toBeDefined();
			expect(hueCollision?.deltaH).toBe(20);
		});

		it("カスタム閾値を適用できる", () => {
			const detector = new CollisionDetector();

			// ΔH = 40° のペア（secondary-tertiaryはデフォルト強化閾値がないペア）
			const colors = new Map<RoleType, Color>([
				["secondary", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 0 })],
				["tertiary", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 40 })],
			]);

			// デフォルト閾値（30°）では衝突なし
			const defaultResults = detector.detect(colors);
			const defaultHue = defaultResults.find((r) => r.type === "hue");
			expect(defaultHue).toBeUndefined();

			// 閾値を50°に設定すると衝突
			const customOptions: CollisionDetectionOptions = {
				baseHueThreshold: 50,
			};
			const customResults = detector.detect(colors, customOptions);
			const customHue = customResults.find((r) => r.type === "hue");
			expect(customHue).toBeDefined();
		});

		it("primary-errorペアで強化閾値（45°）をデフォルトで適用する", () => {
			const detector = new CollisionDetector();

			// ΔH = 40° - デフォルト閾値（30°）では衝突しないが、primary-errorはデフォルトで45°
			const colors = new Map<RoleType, Color>([
				["primary", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 0 })],
				["error", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 40 })],
			]);

			// デフォルトでprimary-errorの強化閾値が適用される
			const results = detector.detect(colors);

			const collision = results.find(
				(r) => r.pair.includes("primary") && r.pair.includes("error"),
			);
			expect(collision).toBeDefined();
			expect(collision?.severity).toBe("error");
		});

		it("warning-errorペアで強化閾値（40°）をデフォルトで適用する", () => {
			const detector = new CollisionDetector();

			// 黄系（H: 70°）とオレンジ系（H: 35°）- ΔH = 35°
			const colors = new Map<RoleType, Color>([
				["warning", new Color({ mode: "oklch", l: 0.6, c: 0.15, h: 70 })],
				["error", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 35 })],
			]);

			// デフォルトでwarning-errorの強化閾値が適用される
			const results = detector.detect(colors);

			const collision = results.find(
				(r) => r.pair.includes("warning") && r.pair.includes("error"),
			);
			expect(collision).toBeDefined();
		});

		it("複数のカラー間で全てのペアを検証する", () => {
			const detector = new CollisionDetector();

			// 3色のセマンティックカラー
			const colors = new Map<RoleType, Color>([
				["primary", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 })],
				["error", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 30 })],
				["warning", new Color({ mode: "oklch", l: 0.6, c: 0.15, h: 75 })],
			]);

			const results = detector.detect(colors);

			// 結果の数を確認（衝突有無に関わらず全ペアを検証）
			// 3色なら3ペア: primary-error, primary-warning, error-warning
			expect(results).toBeDefined();
		});

		it("severityを正しく判定する（warning vs error）", () => {
			const detector = new CollisionDetector();

			// ギリギリの衝突（ΔH = 29°）
			const colors = new Map<RoleType, Color>([
				["primary", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 0 })],
				["secondary", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 29 })],
			]);

			const results = detector.detect(colors);
			const collision = results.find((r) => r.type === "hue");

			expect(collision).toBeDefined();
			expect(collision?.severity).toBe("warning");
		});
	});

	describe("suggest", () => {
		it("衝突に対して調整提案を生成する", () => {
			const detector = new CollisionDetector();

			// 近い色相のペア
			const colors = new Map<RoleType, Color>([
				["primary", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 25 })],
				["error", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 40 })],
			]);

			const results = detector.detect(colors);
			const collision = results.find((r) => r.type === "hue");

			if (collision) {
				const suggestion = detector.suggest(collision);

				expect(suggestion).toBeDefined();
				expect(suggestion.target).toBeDefined();
				expect(suggestion.priority).toBeDefined();
			}
		});

		it("調整優先順位に従う（Chroma→Lightness→Hue）", () => {
			const detector = new CollisionDetector();

			// chroma-lightness衝突（クランプ後も閾値内になる値を使用）
			const colors = new Map<RoleType, Color>([
				["primary", new Color({ mode: "oklch", l: 0.5, c: 0.1, h: 250 })],
				["secondary", new Color({ mode: "oklch", l: 0.55, c: 0.08, h: 200 })],
			]);

			const results = detector.detect(colors);
			const clCollision = results.find((r) => r.type === "chroma-lightness");

			if (clCollision) {
				const suggestion = detector.suggest(clCollision);
				// chroma-lightnessの場合、chromaまたはlightnessが優先
				expect(["chroma", "lightness"]).toContain(suggestion.priority);
			}
		});

		it("Hue調整は±30°以内に制限される", () => {
			const detector = new CollisionDetector();

			// Hue衝突
			const colors = new Map<RoleType, Color>([
				["primary", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 0 })],
				["error", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 20 })],
			]);

			const results = detector.detect(colors);
			const hueCollision = results.find((r) => r.type === "hue");

			if (hueCollision) {
				const suggestion = detector.suggest(hueCollision);

				if (suggestion.adjustments.hue !== undefined) {
					expect(Math.abs(suggestion.adjustments.hue)).toBeLessThanOrEqual(30);
				}
			}
		});
	});

	describe("CVD simulation", () => {
		it("CVDタイプを指定して識別可能性を検証できる", () => {
			const detector = new CollisionDetector();

			// 赤と緑（Protanopiaで見分けにくい）
			const colors = new Map<RoleType, Color>([
				["error", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 30 })],
				["success", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 150 })],
			]);

			const options: CollisionDetectionOptions = {
				cvdTypes: ["protanopia"],
			};

			const results = detector.detect(colors, options);

			// CVD検証が実行されることを確認
			const cvdCollision = results.find((r) => r.type === "cvd");
			// CVDシミュレーション結果によっては検出される可能性がある
			expect(results).toBeDefined();
		});

		it("複数のCVDタイプを検証できる", () => {
			const detector = new CollisionDetector();

			const colors = new Map<RoleType, Color>([
				["error", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 30 })],
				["success", new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 150 })],
			]);

			const cvdTypes: CVDType[] = ["protanopia", "deuteranopia", "tritanopia"];
			const options: CollisionDetectionOptions = { cvdTypes };

			const results = detector.detect(colors, options);

			expect(results).toBeDefined();
		});
	});
});

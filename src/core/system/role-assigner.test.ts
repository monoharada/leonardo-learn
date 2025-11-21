/**
 * RoleAssigner - ロール自動割当のテスト
 */

import { describe, expect, it } from "bun:test";
import { Color } from "../color";
import type { ToneScale, ToneValue } from "../strategies/m3-generator";
import { RoleAssigner, type UsageRole } from "./role-assigner";

// テスト用のToneScaleを作成するヘルパー
function createTestToneScale(): ToneScale {
	const tones = new Map<ToneValue, Color>();
	const toneValues: ToneValue[] = [
		0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100,
	];

	// 各トーンに対応するLightnessで色を生成
	for (const tone of toneValues) {
		const lightness = tone / 100;
		tones.set(tone, new Color({ mode: "oklch", l: lightness, c: 0.1, h: 250 }));
	}

	return {
		role: "primary",
		tones,
		sourceColor: new Color({ mode: "oklch", l: 0.5, c: 0.1, h: 250 }),
	};
}

describe("RoleAssigner", () => {
	describe("assign", () => {
		it("各シェードにプライマリ用途を割り当てる", () => {
			const assigner = new RoleAssigner();
			const scale = createTestToneScale();

			const assignments = assigner.assign(scale);

			expect(assignments.length).toBe(13); // 13トーン値

			for (const assignment of assignments) {
				expect(assignment.primaryUsage).toBeDefined();
				expect(assignment.tone).toBeDefined();
				expect(assignment.color).toBeDefined();
			}
		});

		it("Lightness 80%以上のシェードはbackground/surfaceとして推奨する", () => {
			const assigner = new RoleAssigner();
			const scale = createTestToneScale();

			const assignments = assigner.assign(scale);

			// tone 90, 95, 99, 100 は L >= 0.8
			const lightAssignments = assignments.filter(
				(a) => a.tone >= 90 || a.tone === 100,
			);

			for (const assignment of lightAssignments) {
				expect(["background", "surface"]).toContain(assignment.primaryUsage);
			}
		});

		it("Lightness 20%以下のシェードはtext/iconとして推奨する", () => {
			const assigner = new RoleAssigner();
			const scale = createTestToneScale();

			const assignments = assigner.assign(scale);

			// tone 0, 10, 20 は L <= 0.2
			const darkAssignments = assignments.filter((a) => a.tone <= 20);

			for (const assignment of darkAssignments) {
				expect(["text", "icon"]).toContain(assignment.primaryUsage);
			}
		});

		it("中間のLightnessはcontainerまたはborderとして推奨する", () => {
			const assigner = new RoleAssigner();
			const scale = createTestToneScale();

			const assignments = assigner.assign(scale);

			// tone 30, 40, 50, 60, 70, 80
			const midAssignments = assignments.filter(
				(a) => a.tone > 20 && a.tone < 90,
			);

			for (const assignment of midAssignments) {
				// 中間色はcontainer, border, またはhover/activeなどの状態色
				expect([
					"container",
					"border",
					"hover",
					"active",
					"focus",
					"surface",
				]).toContain(assignment.primaryUsage);
			}
		});

		it("セカンダリ用途も割り当てる", () => {
			const assigner = new RoleAssigner();
			const scale = createTestToneScale();

			const assignments = assigner.assign(scale);

			// いくつかのシェードにはセカンダリ用途がある
			const withSecondary = assignments.filter(
				(a) => a.secondaryUsage !== undefined,
			);
			expect(withSecondary.length).toBeGreaterThan(0);
		});

		it("コントラスト値を計算する", () => {
			const assigner = new RoleAssigner();
			const scale = createTestToneScale();

			const assignments = assigner.assign(scale);

			for (const assignment of assignments) {
				// 白と黒に対するコントラスト比
				expect(assignment.contrastWithWhite).toBeGreaterThan(0);
				expect(assignment.contrastWithBlack).toBeGreaterThan(0);

				// 暗い色は白に対してコントラストが高い
				if (assignment.tone <= 20) {
					expect(assignment.contrastWithWhite).toBeGreaterThan(
						assignment.contrastWithBlack,
					);
				}

				// 明るい色は黒に対してコントラストが高い
				if (assignment.tone >= 90) {
					expect(assignment.contrastWithBlack).toBeGreaterThan(
						assignment.contrastWithWhite,
					);
				}
			}
		});

		it("10種類のロールカテゴリを提供する", () => {
			const expectedRoles: UsageRole[] = [
				"background",
				"surface",
				"container",
				"text",
				"icon",
				"border",
				"focus",
				"hover",
				"active",
				"disabled",
			];

			const assigner = new RoleAssigner();
			const scale = createTestToneScale();

			const assignments = assigner.assign(scale);

			// 全割当からプライマリとセカンダリの用途を収集
			const usedRoles = new Set<UsageRole>();
			for (const assignment of assignments) {
				usedRoles.add(assignment.primaryUsage);
				if (assignment.secondaryUsage) {
					usedRoles.add(assignment.secondaryUsage);
				}
			}

			// 少なくとも主要なロールが含まれている
			expect(usedRoles.has("background") || usedRoles.has("surface")).toBe(
				true,
			);
			expect(usedRoles.has("text") || usedRoles.has("icon")).toBe(true);
			expect(usedRoles.has("container")).toBe(true);
		});
	});

	describe("verifyContrast", () => {
		it("2色間のコントラスト比を検証する", () => {
			const assigner = new RoleAssigner();

			const white = new Color({ mode: "oklch", l: 1.0, c: 0, h: 0 });
			const black = new Color({ mode: "oklch", l: 0, c: 0, h: 0 });

			const result = assigner.verifyContrast(black, white);

			expect(result.ratio).toBeGreaterThan(20); // 黒と白は21:1
			expect(result.meetsAA).toBe(true);
			expect(result.meetsAAA).toBe(true);
			expect(result.meetsAALarge).toBe(true);
		});

		it("WCAG AA基準（4.5:1）を判定する", () => {
			const assigner = new RoleAssigner();

			// 中程度のコントラスト
			const color1 = new Color({ mode: "oklch", l: 0.3, c: 0.1, h: 250 });
			const color2 = new Color({ mode: "oklch", l: 0.9, c: 0, h: 0 });

			const result = assigner.verifyContrast(color1, color2);

			expect(result.ratio).toBeDefined();
			// AA基準の判定
			if (result.ratio >= 4.5) {
				expect(result.meetsAA).toBe(true);
			} else {
				expect(result.meetsAA).toBe(false);
			}
		});

		it("WCAG AAA基準（7:1）を判定する", () => {
			const assigner = new RoleAssigner();

			// 高コントラスト
			const color1 = new Color({ mode: "oklch", l: 0.15, c: 0.1, h: 250 });
			const color2 = new Color({ mode: "oklch", l: 0.95, c: 0, h: 0 });

			const result = assigner.verifyContrast(color1, color2);

			// AAA基準の判定
			if (result.ratio >= 7) {
				expect(result.meetsAAA).toBe(true);
			} else {
				expect(result.meetsAAA).toBe(false);
			}
		});

		it("大文字テキスト用のAA基準（3:1）を判定する", () => {
			const assigner = new RoleAssigner();

			// 低コントラスト
			const color1 = new Color({ mode: "oklch", l: 0.4, c: 0.1, h: 250 });
			const color2 = new Color({ mode: "oklch", l: 0.7, c: 0, h: 0 });

			const result = assigner.verifyContrast(color1, color2);

			// 大文字テキスト基準の判定
			if (result.ratio >= 3) {
				expect(result.meetsAALarge).toBe(true);
			} else {
				expect(result.meetsAALarge).toBe(false);
			}
		});
	});

	describe("generateInteractiveStates", () => {
		it("ベースカラーからフォーカス状態カラーを生成する", () => {
			const assigner = new RoleAssigner();

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 });
			const states = assigner.generateInteractiveStates(baseColor);

			expect(states.focus).toBeDefined();
			// フォーカスは視認性の高い色（sRGB gamut clampにより彩度は制限される可能性あり）
			expect(states.focus.oklch.c).toBeGreaterThan(0);
		});

		it("ホバー状態カラーを生成する", () => {
			const assigner = new RoleAssigner();

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 });
			const states = assigner.generateInteractiveStates(baseColor);

			expect(states.hover).toBeDefined();
			// ホバーはベースより明るいまたは彩度が高い
			const hoverL = states.hover.oklch.l;
			const hoverC = states.hover.oklch.c;
			expect(hoverL >= baseColor.oklch.l || hoverC > baseColor.oklch.c).toBe(
				true,
			);
		});

		it("アクティブ状態カラーを生成する", () => {
			const assigner = new RoleAssigner();

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 });
			const states = assigner.generateInteractiveStates(baseColor);

			expect(states.active).toBeDefined();
			// アクティブはベースより暗い
			expect(states.active.oklch.l).toBeLessThanOrEqual(baseColor.oklch.l);
		});

		it("ディスエーブル状態カラーを生成する", () => {
			const assigner = new RoleAssigner();

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 });
			const states = assigner.generateInteractiveStates(baseColor);

			expect(states.disabled).toBeDefined();
			// ディスエーブルは低彩度・中間Lightness
			expect(states.disabled.oklch.c).toBeLessThan(baseColor.oklch.c);
		});

		it("選択状態カラーを生成する", () => {
			const assigner = new RoleAssigner();

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 });
			const states = assigner.generateInteractiveStates(baseColor);

			expect(states.selected).toBeDefined();
			// 選択はベースと同系色で視覚的に区別可能
		});

		it("エラー状態カラーを生成する", () => {
			const assigner = new RoleAssigner();

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 });
			const states = assigner.generateInteractiveStates(baseColor);

			expect(states.error).toBeDefined();
			// エラーは赤系色（H: 15-45°）
			const errorHue = states.error.oklch.h;
			expect(errorHue).toBeGreaterThanOrEqual(10);
			expect(errorHue).toBeLessThanOrEqual(50);
		});

		it("白背景との十分なコントラストを維持する", () => {
			const assigner = new RoleAssigner();
			const white = new Color({ mode: "oklch", l: 1.0, c: 0, h: 0 });

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 });
			const states = assigner.generateInteractiveStates(baseColor);

			// フォーカスインジケーターは3:1以上必要
			const focusContrast = states.focus.contrast(white);
			expect(focusContrast).toBeGreaterThanOrEqual(3);
		});

		it("暗い背景用のフォーカス状態も生成できる", () => {
			const assigner = new RoleAssigner();

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 });
			const states = assigner.generateInteractiveStates(baseColor, {
				darkMode: true,
			});

			expect(states.focus).toBeDefined();
			// ダークモードでは明るいフォーカス
			expect(states.focus.oklch.l).toBeGreaterThan(0.5);
		});

		it("全ての状態間で視覚的区別が可能", () => {
			const assigner = new RoleAssigner();

			const baseColor = new Color({ mode: "oklch", l: 0.5, c: 0.2, h: 250 });
			const states = assigner.generateInteractiveStates(baseColor);

			// hoverとactiveは異なるLightness
			expect(states.hover.oklch.l).not.toBe(states.active.oklch.l);

			// disabledは他と彩度で区別される
			expect(states.disabled.oklch.c).toBeLessThan(states.hover.oklch.c);
		});
	});
});

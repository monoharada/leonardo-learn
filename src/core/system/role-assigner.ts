/**
 * RoleAssigner - ロール自動割当
 *
 * 生成されたシェードに対してデザインシステムでの推奨用途
 * （ボタン背景、テキスト、境界線等）を自動的に割り当てます。
 */

import { Color } from "../color";
import type { ToneScale, ToneValue } from "../strategies/m3-generator";

/**
 * 用途ロール
 */
export type UsageRole =
	| "background"
	| "surface"
	| "container"
	| "text"
	| "icon"
	| "border"
	| "focus"
	| "hover"
	| "active"
	| "disabled";

/**
 * ロール割当結果
 */
export interface RoleAssignment {
	/** トーン値 */
	tone: ToneValue | number;
	/** カラー */
	color: Color;
	/** プライマリ用途 */
	primaryUsage: UsageRole;
	/** セカンダリ用途 */
	secondaryUsage?: UsageRole;
	/** 白に対するコントラスト比 */
	contrastWithWhite: number;
	/** 黒に対するコントラスト比 */
	contrastWithBlack: number;
}

/**
 * コントラスト検証結果
 */
export interface ContrastVerification {
	/** コントラスト比 */
	ratio: number;
	/** WCAG AA準拠（4.5:1） */
	meetsAA: boolean;
	/** WCAG AAA準拠（7:1） */
	meetsAAA: boolean;
	/** WCAG AA大文字テキスト準拠（3:1） */
	meetsAALarge: boolean;
}

/**
 * インタラクティブ状態カラー
 */
export interface InteractiveStates {
	/** フォーカスインジケーター */
	focus: Color;
	/** ホバー状態 */
	hover: Color;
	/** アクティブ状態 */
	active: Color;
	/** ディスエーブル状態 */
	disabled: Color;
	/** 選択状態 */
	selected: Color;
	/** エラー状態 */
	error: Color;
}

/**
 * インタラクティブ状態生成オプション
 */
export interface InteractiveStateOptions {
	/** ダークモード */
	darkMode?: boolean;
}

/**
 * RoleAssigner - ロール自動割当クラス
 */
export class RoleAssigner {
	private readonly white = new Color({ mode: "oklch", l: 1.0, c: 0, h: 0 });
	private readonly black = new Color({ mode: "oklch", l: 0, c: 0, h: 0 });

	/**
	 * スケールに対してロールを割り当てる
	 *
	 * @param scale - トーンスケール
	 * @returns ロール割当結果の配列
	 */
	assign(scale: ToneScale): RoleAssignment[] {
		const assignments: RoleAssignment[] = [];

		for (const [tone, color] of scale.tones) {
			const lightness = color.oklch.l;

			// コントラスト計算
			const contrastWithWhite = color.contrast(this.white);
			const contrastWithBlack = color.contrast(this.black);

			// Lightnessに基づく用途の割当
			const { primaryUsage, secondaryUsage } = this.determineUsage(
				lightness,
				tone,
			);

			assignments.push({
				tone,
				color,
				primaryUsage,
				secondaryUsage,
				contrastWithWhite,
				contrastWithBlack,
			});
		}

		// トーン値でソート
		assignments.sort((a, b) => a.tone - b.tone);

		return assignments;
	}

	/**
	 * 2色間のコントラストを検証する
	 *
	 * @param fg - 前景色
	 * @param bg - 背景色
	 * @returns コントラスト検証結果
	 */
	verifyContrast(fg: Color, bg: Color): ContrastVerification {
		const ratio = fg.contrast(bg);

		return {
			ratio,
			meetsAA: ratio >= 4.5,
			meetsAAA: ratio >= 7,
			meetsAALarge: ratio >= 3,
		};
	}

	/**
	 * ベースカラーからインタラクティブ状態カラーを生成する
	 *
	 * @param baseColor - ベースカラー
	 * @param options - 生成オプション
	 * @returns インタラクティブ状態カラー
	 */
	generateInteractiveStates(
		baseColor: Color,
		options: InteractiveStateOptions = {},
	): InteractiveStates {
		const { darkMode = false } = options;
		const base = baseColor.oklch;

		// フォーカス: 高彩度・高視認性
		const focusL = darkMode
			? Math.min(base.l + 0.3, 0.95)
			: Math.max(base.l - 0.15, 0.35);
		const focusC = Math.min(base.c * 1.2, 0.35);
		const focus = new Color({
			mode: "oklch",
			l: focusL,
			c: focusC,
			h: base.h,
		});

		// ホバー: 明るさを上げる
		const hoverL = Math.min(base.l + 0.08, 0.95);
		const hoverC = Math.min(base.c * 1.05, 0.35);
		const hover = new Color({
			mode: "oklch",
			l: hoverL,
			c: hoverC,
			h: base.h,
		});

		// アクティブ: 暗くする
		const activeL = Math.max(base.l - 0.1, 0.1);
		const activeC = Math.min(base.c * 1.1, 0.35);
		const active = new Color({
			mode: "oklch",
			l: activeL,
			c: activeC,
			h: base.h,
		});

		// ディスエーブル: 低彩度・中間Lightness
		const disabledL = darkMode ? 0.4 : 0.65;
		const disabledC = base.c * 0.3;
		const disabled = new Color({
			mode: "oklch",
			l: disabledL,
			c: disabledC,
			h: base.h,
		});

		// 選択: ベースより少し明るく彩度高め
		const selectedL = Math.min(base.l + 0.05, 0.9);
		const selectedC = Math.min(base.c * 1.15, 0.35);
		const selected = new Color({
			mode: "oklch",
			l: selectedL,
			c: selectedC,
			h: base.h,
		});

		// エラー: 赤系（H: 25-35°）
		const errorHue = 30; // 赤-オレンジ
		const errorL = darkMode ? 0.65 : 0.5;
		const errorC = 0.2;
		const error = new Color({
			mode: "oklch",
			l: errorL,
			c: errorC,
			h: errorHue,
		});

		return {
			focus,
			hover,
			active,
			disabled,
			selected,
			error,
		};
	}

	/**
	 * Lightnessに基づいて用途を決定する
	 */
	private determineUsage(
		lightness: number,
		tone: number,
	): { primaryUsage: UsageRole; secondaryUsage?: UsageRole } {
		// 極明（L >= 0.8）: background/surface
		if (lightness >= 0.8 || tone >= 90) {
			if (tone === 100 || tone === 99) {
				return { primaryUsage: "background", secondaryUsage: "surface" };
			}
			if (tone >= 95) {
				return { primaryUsage: "surface", secondaryUsage: "background" };
			}
			return { primaryUsage: "surface" };
		}

		// 極暗（L <= 0.2）: text/icon
		if (lightness <= 0.2 || tone <= 20) {
			if (tone === 0 || tone === 10) {
				return { primaryUsage: "text", secondaryUsage: "icon" };
			}
			return { primaryUsage: "icon", secondaryUsage: "text" };
		}

		// 中間の明るい方（L 0.6-0.8）: container, border
		if (lightness >= 0.6 || tone >= 60) {
			if (tone >= 80) {
				return { primaryUsage: "container", secondaryUsage: "border" };
			}
			return { primaryUsage: "container" };
		}

		// 中間（L 0.4-0.6）: hover, active
		if (lightness >= 0.4 || tone >= 40) {
			if (tone >= 50) {
				return { primaryUsage: "hover", secondaryUsage: "active" };
			}
			return { primaryUsage: "active", secondaryUsage: "focus" };
		}

		// 中間の暗い方（L 0.2-0.4）: focus, border
		return { primaryUsage: "focus", secondaryUsage: "border" };
	}
}

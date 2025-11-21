/**
 * DADSOptimizer - DADSスタイルアクセシビリティ最適化
 *
 * WCAG AAA/APCA準拠のアクセシビリティ最適化されたカラーパレットを生成します。
 * Design for Accessibility Design System（DADS）の原則に基づいています。
 */

import { Color } from "../color";
import type { RoleType } from "../system/role-config";
import type { ToneScale, ToneValue } from "./m3-generator";

/**
 * DADSオプション
 */
export interface DADSOptions {
	/** ターゲットレベル */
	targetLevel: "aa" | "aaa";
	/** APCA計算を使用するか */
	useAPCA: boolean;
	/** インタラクティブ状態を生成するか */
	generateInteractiveStates: boolean;
}

/**
 * インタラクティブ状態カラー
 */
export interface InteractiveStateColors {
	/** フォーカス状態 */
	focus: Color;
	/** ホバー状態 */
	hover: Color;
	/** アクティブ状態 */
	active: Color;
	/** 無効状態 */
	disabled: Color;
}

/**
 * DADSOptimizer - アクセシビリティ最適化クラス
 */
export class DADSOptimizer {
	/**
	 * レベルごとの必要コントラスト比
	 */
	private readonly contrastRequirements: Record<"aa" | "aaa", number> = {
		aa: 4.5,
		aaa: 7,
	};

	/**
	 * スケールを最適化する
	 *
	 * @param scales - ロールとスケールのマップ
	 * @param options - DADSオプション
	 * @returns 最適化されたスケール
	 */
	optimize(
		scales: Map<RoleType, ToneScale>,
		options: DADSOptions,
	): Map<RoleType, ToneScale> {
		const optimized = new Map<RoleType, ToneScale>();

		for (const [role, scale] of scales) {
			const optimizedScale = this.optimizeScale(scale, options);
			optimized.set(role, optimizedScale);
		}

		return optimized;
	}

	/**
	 * 個別のスケールを最適化する
	 */
	private optimizeScale(scale: ToneScale, options: DADSOptions): ToneScale {
		const targetRatio = this.contrastRequirements[options.targetLevel];

		const optimizedTones = new Map<ToneValue | number, Color>();

		// 元のトーン値をソート
		const sortedTones = Array.from(scale.tones.entries()).sort(
			([a], [b]) => a - b,
		);

		// 基準となる白と黒
		const white = new Color({ mode: "oklch", l: 1.0, c: 0, h: 0 });
		const black = new Color({ mode: "oklch", l: 0, c: 0, h: 0 });

		// まず明るいトーンを最適化して背景を確保
		const lightTone99 = scale.tones.get(99 as ToneValue);
		let optimizedLight: Color | undefined;

		if (lightTone99) {
			optimizedLight = this.optimizeForContrast(
				lightTone99,
				black,
				targetRatio,
				"lighter",
			);
		}

		for (const [tone, color] of sortedTones) {
			let optimizedColor = color;

			// トーンに基づいて最適化方針を決定
			if (tone <= 20) {
				// 暗いトーン（テキスト用）: 明るい背景に対するコントラストを最適化
				const reference = optimizedLight || white;
				optimizedColor = this.optimizeForContrast(
					color,
					reference,
					targetRatio,
					"darker",
				);
			} else if (tone >= 90) {
				// 明るいトーン（背景用）: 黒に対するコントラストを最適化
				optimizedColor = this.optimizeForContrast(
					color,
					black,
					targetRatio,
					"lighter",
				);
			} else {
				// 中間トーン: そのまま維持
				optimizedColor = color;
			}

			optimizedTones.set(tone, optimizedColor);
		}

		return {
			...scale,
			tones: optimizedTones,
		};
	}

	/**
	 * コントラストを満たすように色を最適化する
	 */
	private optimizeForContrast(
		color: Color,
		reference: Color,
		targetRatio: number,
		direction: "darker" | "lighter",
	): Color {
		const currentRatio = color.contrast(reference);

		if (currentRatio >= targetRatio) {
			return color;
		}

		const oklch = color.oklch;

		// 二分探索でLightnessを調整
		let minL = direction === "darker" ? 0 : oklch.l;
		let maxL = direction === "darker" ? oklch.l : 1;

		let bestColor = color;
		let bestRatio = currentRatio;

		for (let i = 0; i < 20; i++) {
			const midL = (minL + maxL) / 2;
			const testColor = new Color({
				mode: "oklch",
				l: midL,
				c: oklch.c,
				h: oklch.h,
			});

			const ratio = testColor.contrast(reference);

			if (ratio >= targetRatio) {
				if (
					ratio < bestRatio ||
					bestRatio < targetRatio ||
					Math.abs(midL - oklch.l) < Math.abs(bestColor.oklch.l - oklch.l)
				) {
					bestColor = testColor;
					bestRatio = ratio;
				}

				// 元の値に近づける
				if (direction === "darker") {
					minL = midL;
				} else {
					maxL = midL;
				}
			} else {
				// コントラスト不足、さらに調整
				if (direction === "darker") {
					maxL = midL;
				} else {
					minL = midL;
				}
			}
		}

		return bestColor;
	}

	/**
	 * インタラクティブ状態カラーを生成する
	 *
	 * @param baseColor - ベースカラー
	 * @returns インタラクティブ状態カラー
	 */
	generateInteractiveStates(baseColor: Color): InteractiveStateColors {
		const oklch = baseColor.oklch;

		// フォーカス: より明るく、高Chroma
		const focus = new Color({
			mode: "oklch",
			l: Math.min(1, oklch.l + 0.15),
			c: Math.min(0.3, oklch.c + 0.05),
			h: oklch.h,
		});

		// ホバー: 少し明るく
		const hover = new Color({
			mode: "oklch",
			l: Math.min(1, oklch.l + 0.08),
			c: oklch.c,
			h: oklch.h,
		});

		// アクティブ: 暗く
		const active = new Color({
			mode: "oklch",
			l: Math.max(0, oklch.l - 0.1),
			c: oklch.c,
			h: oklch.h,
		});

		// ディセーブルド: 低Chroma、中間Lightness
		const disabled = new Color({
			mode: "oklch",
			l: 0.6,
			c: Math.max(0, oklch.c - 0.08),
			h: oklch.h,
		});

		return { focus, hover, active, disabled };
	}
}

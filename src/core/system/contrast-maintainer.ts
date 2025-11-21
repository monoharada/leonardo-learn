/**
 * ContrastMaintainer - WCAGコントラスト維持機能
 *
 * ロール別調整適用時のWCAGコントラスト比要件を維持し、
 * 違反を検出して自動調整するフィードバックループを提供します。
 */

import { Color } from "../color";
import type { ToneScale, ToneValue } from "../strategies/m3-generator";

/**
 * コントラストレベル
 */
export type ContrastLevel = "AA" | "AAA" | "AA-large";

/**
 * コントラスト要件
 */
export interface ContrastRequirement {
	/** 前景トーン */
	fg: ToneValue | number;
	/** 背景トーン */
	bg: ToneValue | number;
	/** 要求レベル */
	level: ContrastLevel;
}

/**
 * コントラスト検証結果
 */
export interface ContrastVerificationResult {
	/** パスした要件 */
	passed: ContrastPairResult[];
	/** 違反した要件 */
	violations: ContrastViolation[];
}

/**
 * コントラストペア結果
 */
export interface ContrastPairResult {
	/** 前景トーン */
	fg: ToneValue | number;
	/** 背景トーン */
	bg: ToneValue | number;
	/** コントラスト比 */
	ratio: number;
	/** 要求レベル */
	level: ContrastLevel;
}

/**
 * コントラスト違反
 */
export interface ContrastViolation extends ContrastPairResult {
	/** 必要なコントラスト比 */
	requiredRatio: number;
}

/**
 * 最適ペア結果
 */
export interface OptimalPair {
	/** 前景トーン */
	fgTone: ToneValue | number;
	/** 背景トーン */
	bgTone: ToneValue | number;
	/** コントラスト比 */
	ratio: number;
}

/**
 * 検証オプション
 */
export interface VerifyOptions {
	/** コントラスト要件 */
	requirements?: ContrastRequirement[];
}

/**
 * ContrastMaintainer - WCAGコントラスト維持クラス
 */
export class ContrastMaintainer {
	/**
	 * レベルごとの必要コントラスト比
	 */
	private readonly levelRatios: Record<ContrastLevel, number> = {
		AA: 4.5,
		AAA: 7,
		"AA-large": 3,
	};

	/**
	 * スケールのコントラストを検証する
	 *
	 * @param scale - トーンスケール
	 * @param options - 検証オプション
	 * @returns 検証結果
	 */
	verify(
		scale: ToneScale,
		options: VerifyOptions = {},
	): ContrastVerificationResult {
		const passed: ContrastPairResult[] = [];
		const violations: ContrastViolation[] = [];

		const requirements = options.requirements || this.getDefaultRequirements();

		for (const req of requirements) {
			const fgColor = scale.tones.get(req.fg as ToneValue);
			const bgColor = scale.tones.get(req.bg as ToneValue);

			if (!fgColor || !bgColor) continue;

			const ratio = fgColor.contrast(bgColor);
			const requiredRatio = this.levelRatios[req.level];

			const result: ContrastPairResult = {
				fg: req.fg,
				bg: req.bg,
				ratio,
				level: req.level,
			};

			if (ratio >= requiredRatio) {
				passed.push(result);
			} else {
				violations.push({
					...result,
					requiredRatio,
				});
			}
		}

		return { passed, violations };
	}

	/**
	 * コントラスト違反を自動調整する
	 *
	 * @param scale - トーンスケール
	 * @param options - 検証オプション
	 * @returns 調整されたスケール
	 */
	adjust(scale: ToneScale, options: VerifyOptions = {}): ToneScale {
		const requirements = options.requirements || this.getDefaultRequirements();

		// 新しいトーンマップを作成
		const adjustedTones = new Map<ToneValue | number, Color>();

		// 元のトーンをコピー
		for (const [tone, color] of scale.tones) {
			adjustedTones.set(tone, color);
		}

		// 各要件をチェックして調整
		for (const req of requirements) {
			const fgColor = adjustedTones.get(req.fg);
			const bgColor = adjustedTones.get(req.bg);

			if (!fgColor || !bgColor) continue;

			const ratio = fgColor.contrast(bgColor);
			const requiredRatio = this.levelRatios[req.level];

			if (ratio < requiredRatio) {
				// コントラスト不足の場合、前景のLightnessを調整
				const adjustedFg = this.adjustLightnessForContrast(
					fgColor,
					bgColor,
					requiredRatio,
				);
				adjustedTones.set(req.fg, adjustedFg);
			}
		}

		return {
			...scale,
			tones: adjustedTones,
		};
	}

	/**
	 * 指定レベルを満たす最適なペアを取得する
	 *
	 * @param scale - トーンスケール
	 * @param level - コントラストレベル
	 * @returns 最適ペアの配列
	 */
	getOptimalPairs(scale: ToneScale, level: ContrastLevel): OptimalPair[] {
		const pairs: OptimalPair[] = [];
		const requiredRatio = this.levelRatios[level];

		const toneValues = Array.from(scale.tones.keys()).sort((a, b) => a - b);

		// 全ペアをチェック
		for (let i = 0; i < toneValues.length; i++) {
			for (let j = i + 1; j < toneValues.length; j++) {
				const fgTone = toneValues[i];
				const bgTone = toneValues[j];

				const fgColor = scale.tones.get(fgTone);
				const bgColor = scale.tones.get(bgTone);

				if (!fgColor || !bgColor) continue;

				const ratio = fgColor.contrast(bgColor);

				if (ratio >= requiredRatio) {
					pairs.push({ fgTone, bgTone, ratio });
					// 逆方向のペアも追加
					pairs.push({ fgTone: bgTone, bgTone: fgTone, ratio });
				}
			}
		}

		// コントラスト比でソート（高い順）
		pairs.sort((a, b) => b.ratio - a.ratio);

		return pairs;
	}

	/**
	 * デフォルトのコントラスト要件を取得
	 */
	private getDefaultRequirements(): ContrastRequirement[] {
		return [
			// テキスト用：暗い色と明るい背景
			{ fg: 10, bg: 100, level: "AA" },
			{ fg: 10, bg: 95, level: "AA" },
			{ fg: 20, bg: 90, level: "AA" },
			// 逆パターン
			{ fg: 95, bg: 10, level: "AA" },
			{ fg: 90, bg: 20, level: "AA" },
		];
	}

	/**
	 * コントラストを満たすようにLightnessを調整する
	 */
	private adjustLightnessForContrast(
		fg: Color,
		bg: Color,
		targetRatio: number,
	): Color {
		const fgOklch = fg.oklch;
		const bgOklch = bg.oklch;

		// 二分探索でLightnessを調整
		let minL = 0;
		let maxL = 1;

		// 前景が暗いか明るいかを判定
		const fgIsDarker = fgOklch.l < bgOklch.l;

		// 調整方向を決定
		if (fgIsDarker) {
			// 暗い色をさらに暗くする
			maxL = bgOklch.l - 0.1;
		} else {
			// 明るい色をさらに明るくする
			minL = bgOklch.l + 0.1;
		}

		// 二分探索
		let bestL = fgOklch.l;
		let bestRatio = fg.contrast(bg);

		for (let i = 0; i < 20; i++) {
			const midL = (minL + maxL) / 2;
			const testColor = new Color({
				mode: "oklch",
				l: midL,
				c: fgOklch.c,
				h: fgOklch.h,
			});

			const ratio = testColor.contrast(bg);

			if (ratio >= targetRatio) {
				if (
					Math.abs(midL - fgOklch.l) < Math.abs(bestL - fgOklch.l) ||
					bestRatio < targetRatio
				) {
					bestL = midL;
					bestRatio = ratio;
				}

				// 元の値に近づける
				if (fgIsDarker) {
					minL = midL;
				} else {
					maxL = midL;
				}
			} else {
				// コントラスト不足、さらに調整
				if (fgIsDarker) {
					maxL = midL;
				} else {
					minL = midL;
				}
			}
		}

		return new Color({
			mode: "oklch",
			l: bestL,
			c: fgOklch.c,
			h: fgOklch.h,
		});
	}
}

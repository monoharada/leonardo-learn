import {
	argbFromHex,
	Hct,
	hexFromArgb,
} from "@material/material-color-utilities";
import { Color } from "./color";

/**
 * 黄色系（暖色系）の色相かどうかを判定
 * @param hue - OKLCH色相（0-360）
 * @returns 黄色系の場合true
 */
export function isWarmYellowHue(hue: number): boolean {
	// OKLCH色相で黄色〜オレンジ系（約70-110°）
	return hue >= 70 && hue <= 110;
}

/**
 * HCTを使用して、指定したコントラスト比を達成する色を見つける
 * 黄色系では彩度を最大化して鮮やかさを保つ
 * 黄色系はTone 33以上を使用して鮮やかさを確保（参考画像の最暗シェード基準）
 */
function findColorWithHCT(
	fgColor: Color,
	bgColor: Color,
	targetContrast: number,
	tolerance: number,
): Color | null {
	const fgHex = fgColor.toHex();
	const fgArgb = argbFromHex(fgHex);
	const fgHct = Hct.fromInt(fgArgb);

	const bgArgb = argbFromHex(bgColor.toHex());
	const bgHct = Hct.fromInt(bgArgb);
	const bgTone = bgHct.tone;

	// 黄色系のTone範囲
	// 達成不可能な高コントラスト要求でも段階的な色を生成するため、下限を低めに設定
	const minToneForYellow = 20; // 最暗（より暗い色まで許容）
	const preferredMinTone = 33; // 彩度を維持できる推奨下限

	// 元の色のToneを基準に、相対的な明るさを維持
	const sourceTone = fgHct.tone;

	// 指定Toneでの色とコントラストを計算するヘルパー
	const getColorAtTone = (tone: number): Color => {
		const maxChromaHct = Hct.from(fgHct.hue, 150, tone);
		const chroma = maxChromaHct.chroma * 0.95;
		const resultHct = Hct.from(fgHct.hue, chroma, tone);
		const resultHex = hexFromArgb(resultHct.toInt());
		return new Color(resultHex);
	};

	const getContrastAtTone = (tone: number): number => {
		return getColorAtTone(tone).contrast(bgColor);
	};

	// 白背景（bgTone > 90）の場合
	const isLightBackground = bgTone > 90;

	// 推奨下限（Tone 33）での達成可能コントラスト
	const contrastAtPreferredMin = getContrastAtTone(preferredMinTone);

	// 達成不可能な高コントラスト要求の場合、Tone 33〜20の範囲で比例配分
	if (isLightBackground && targetContrast > contrastAtPreferredMin) {
		// コントラスト要求に応じて、Tone 33からTone 20まで段階的に暗くする
		const maxContrast = 21.0;

		// 達成不可能な範囲での相対的な位置（0〜1）
		// contrastAtPreferredMin（約8.4）〜 maxContrast（21.0）を 0〜1 にマッピング
		const ratio = Math.min(
			1,
			(targetContrast - contrastAtPreferredMin) /
				(maxContrast - contrastAtPreferredMin),
		);

		// Tone 33 から Tone 20 まで比例配分
		const toneRange = preferredMinTone - minToneForYellow; // 33 - 20 = 13
		const targetTone = preferredMinTone - toneRange * ratio;

		return getColorAtTone(Math.max(minToneForYellow, targetTone));
	}

	// 二分探索でコントラスト比を達成するToneを探す
	const searchRange = (minTone: number, maxTone: number): Color | null => {
		let low = minTone;
		let high = maxTone;
		let best: Color | null = null;
		let minDiff = Infinity;

		for (let i = 0; i < 25; i++) {
			const midTone = (low + high) / 2;

			const candidate = getColorAtTone(midTone);
			const contrast = candidate.contrast(bgColor);
			const diff = Math.abs(contrast - targetContrast);

			if (diff < minDiff) {
				minDiff = diff;
				best = candidate;
			}

			if (diff <= tolerance) {
				return candidate;
			}

			// コントラストの調整
			if (midTone < bgTone) {
				// 暗い範囲: Toneが低いほどコントラストが高い
				if (contrast < targetContrast) {
					high = midTone;
				} else {
					low = midTone;
				}
			} else {
				// 明るい範囲: Toneが高いほどコントラストが高い
				if (contrast < targetContrast) {
					low = midTone;
				} else {
					high = midTone;
				}
			}
		}
		return best;
	};

	// 暗い側を探索（下限をpreferredMinToneに設定、彩度維持のため）
	const darkResult = searchRange(preferredMinTone, bgTone);
	// 明るい側を探索
	const lightResult = searchRange(bgTone, 100);

	// 各結果のコントラスト差を計算
	const darkContrast = darkResult ? darkResult.contrast(bgColor) : 0;
	const lightContrast = lightResult ? lightResult.contrast(bgColor) : 0;
	const darkDiff = darkResult
		? Math.abs(darkContrast - targetContrast)
		: Infinity;
	const lightDiff = lightResult
		? Math.abs(lightContrast - targetContrast)
		: Infinity;

	// 有効な結果を判定（許容誤差内）
	const darkValid = darkDiff <= tolerance * 2;
	const lightValid = lightDiff <= tolerance * 2;

	// 白背景で高コントラスト要求（3.0以上）の場合は暗い側を優先
	if (isLightBackground && targetContrast >= 3.0) {
		if (darkResult) {
			// 暗い側の結果が要求に近いか、少なくとも存在すれば暗い側を返す
			if (darkValid || !lightValid) {
				return darkResult;
			}
			// 明るい側がより近い場合でも、暗い側が要求の80%以上を満たせば暗い側を返す
			if (darkContrast >= targetContrast * 0.8) {
				return darkResult;
			}
		}
	}

	// 両方有効な場合、元のToneに近い方を返す
	if (darkValid && lightValid && darkResult && lightResult) {
		const darkTone = Hct.fromInt(argbFromHex(darkResult.toHex())).tone;
		const lightTone = Hct.fromInt(argbFromHex(lightResult.toHex())).tone;
		const d0 = Math.abs(darkTone - sourceTone);
		const d1 = Math.abs(lightTone - sourceTone);
		return d0 < d1 ? darkResult : lightResult;
	}

	// 有効な結果が1つだけの場合
	if (darkValid && darkResult) return darkResult;
	if (lightValid && lightResult) return lightResult;

	// どちらも許容誤差外の場合、より近い方を返す
	if (darkDiff < lightDiff && darkResult) return darkResult;
	if (lightResult) return lightResult;
	return darkResult;
}

/**
 * Binary search to find a color with a specific contrast ratio against a background.
 * Adjusts the Lightness channel of the foreground color.
 * For yellow/warm colors, uses HCT to maximize chroma at each lightness level.
 */
export const findColorForContrast = (
	fgColor: Color,
	bgColor: Color,
	targetContrast: number,
	tolerance = 0.01,
): Color | null => {
	// 黄色系の場合はHCTベースの探索を使用
	const fgHue = fgColor.oklch.h ?? 0;
	if (isWarmYellowHue(fgHue)) {
		return findColorWithHCT(fgColor, bgColor, targetContrast, tolerance);
	}
	// Initial check
	const currentContrast = fgColor.contrast(bgColor);
	if (Math.abs(currentContrast - targetContrast) <= tolerance) {
		return fgColor.clone();
	}

	// Determine search range and direction
	// We search the entire lightness range [0, 1]
	// But we need to know if we are looking for a lighter or darker color.
	// Actually, for a given background, there might be two solutions (one lighter, one darker).
	// Usually we want to preserve the hue/chroma and just change lightness.
	// And usually we want to find the *closest* lightness to the original that satisfies the contrast.

	const bgL = bgColor.oklch.l;
	const fgL = fgColor.oklch.l;

	// Try searching in direction of original lightness first?
	// Or just search both sides [0, bgL] and [bgL, 1] and pick the one closest to original fgL.

	const searchRange = (min: number, max: number): Color | null => {
		let low = min;
		let high = max;
		let best: Color | null = null;
		let minDiff = Infinity;

		for (let i = 0; i < 20; i++) {
			const mid = (low + high) / 2;
			const candidate = new Color({ ...fgColor.oklch, l: mid });
			const contrast = candidate.contrast(bgColor);
			const diff = Math.abs(contrast - targetContrast);

			if (diff < minDiff) {
				minDiff = diff;
				best = candidate;
			}

			if (diff <= tolerance) {
				return candidate;
			}

			// Contrast generally increases as we move away from bgL
			// If we are in [0, bgL], lower L means higher contrast (usually)
			// If we are in [bgL, 1], higher L means higher contrast (usually)

			if (mid < bgL) {
				// In darker range. Lower L -> Higher Contrast (usually)
				if (contrast < targetContrast) {
					high = mid; // Need more contrast -> go darker -> lower L? Wait.
					// Black (0) vs Bg(0.5) -> Contrast 21 (max)
					// Mid (0.4) vs Bg(0.5) -> Contrast 1.2
					// So yes, lower L = higher contrast.
					high = mid;
				} else {
					low = mid; // Contrast too high -> go lighter -> higher L
				}
			} else {
				// In lighter range. Higher L -> Higher Contrast
				if (contrast < targetContrast) {
					low = mid; // Need more contrast -> go lighter
				} else {
					high = mid; // Contrast too high -> go darker
				}
			}
		}
		return best;
	};

	// Search both sides
	const darkResult = searchRange(0, bgL);
	const lightResult = searchRange(bgL, 1);

	// Check which one is valid and closest to original L
	const validResults: Color[] = [];
	if (
		darkResult &&
		Math.abs(darkResult.contrast(bgColor) - targetContrast) <= tolerance * 2
	) {
		validResults.push(darkResult);
	}
	if (
		lightResult &&
		Math.abs(lightResult.contrast(bgColor) - targetContrast) <= tolerance * 2
	) {
		validResults.push(lightResult);
	}

	if (validResults.length === 0) return null;

	const first = validResults[0];
	if (validResults.length === 1 && first) return first;

	const second = validResults[1];
	if (!first || !second) return first || null;

	// Return the one closest to original lightness
	const d0 = Math.abs(first.oklch.l - fgL);
	const d1 = Math.abs(second.oklch.l - fgL);
	return d0 < d1 ? first : second;
};

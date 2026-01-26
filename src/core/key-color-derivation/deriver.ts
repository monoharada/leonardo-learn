/**
 * キーカラー導出モジュール
 *
 * プライマリカラーからセカンダリ/ターシャリを導出するアルゴリズムを実装。
 * HCT色空間を使用し、コントラスト要件に基づいて適切なトーンを探索する。
 *
 * @module @/core/key-color-derivation/deriver
 */

import {
	argbFromHex,
	Hct,
	hexFromArgb,
} from "@material/material-color-utilities";
import { Color } from "../color";
import {
	getDadsColorsByHue,
	getDadsHueFromDisplayName,
} from "../tokens/dads-data-provider";
import type { DadsChromaScale, DadsToken } from "../tokens/types";
import type { DerivationConfig, DerivedColor, DerivedColorSet } from "./types";
import { DADS_CONTRAST_DEFAULTS } from "./types";

/**
 * フォールバック時のHCTトーンオフセット値
 *
 * バイナリサーチが失敗した場合に、プライマリまたはセカンダリの
 * トーンからこの値だけ明るい/暗い方向にずらしてフォールバック色を生成する。
 */
const FALLBACK_TONE_OFFSET = 15;

/**
 * フォールバック色を生成する
 *
 * @param hue - 色相
 * @param chroma - 彩度
 * @param baseTone - 基準トーン
 * @param direction - 明度方向
 * @param bgColor - 背景色（コントラスト計算用）
 * @returns DerivedColor
 */
function createFallbackColor(
	hue: number,
	chroma: number,
	baseTone: number,
	direction: "lighter" | "darker",
	bgColor: Color,
): DerivedColor {
	const toneOffset =
		direction === "lighter" ? FALLBACK_TONE_OFFSET : -FALLBACK_TONE_OFFSET;
	const tone = baseTone + toneOffset;
	const color = fromHct(hue, chroma, tone);
	return {
		color,
		tone,
		contrastRatio: color.contrast(bgColor),
		lightnessDirection: direction,
	};
}

/**
 * 背景がライトモードかどうかを判定
 *
 * OKLCH明度（L値）が0.5を超える場合はライトモード
 *
 * @param bgColor 背景色
 * @returns ライト背景の場合true
 */
function isLightBackground(bgColor: Color): boolean {
	return bgColor.oklch.l > 0.5;
}

/**
 * ColorオブジェクトからHCT表現を取得
 *
 * @param color Colorインスタンス
 * @returns HCTオブジェクト
 */
function toHct(color: Color): Hct {
	const hex = color.toHex();
	const argb = argbFromHex(hex);
	return Hct.fromInt(argb);
}

/**
 * HCT値からColorオブジェクトを生成
 *
 * @param hue 色相（0-360）
 * @param chroma 彩度
 * @param tone トーン（0-100、明度相当）
 * @returns Colorインスタンス
 */
function fromHct(hue: number, chroma: number, tone: number): Color {
	const hct = Hct.from(hue, chroma, tone);
	const hex = hexFromArgb(hct.toInt());
	return new Color(hex);
}

/**
 * 指定方向で目標コントラストを達成するトーンを探索
 *
 * バイナリサーチを使用して、目標コントラストに最も近いトーンを見つける。
 *
 * エッジケース対応:
 * - 極端なトーン値（0付近、100付近）でも動作
 * - 探索範囲が縮退している場合は反対方向も探索
 * - 目標コントラストが達成不可能な場合は最善値を返却
 *
 * @param hue 色相
 * @param chroma 彩度
 * @param bgColor 背景色
 * @param targetContrast 目標コントラスト比
 * @param searchDirection 探索方向（lighter/darker）
 * @param startTone 開始トーン（プライマリのトーン）
 * @returns 探索結果（トーン、カラー、コントラスト）またはnull
 */
function findToneForContrast(
	hue: number,
	chroma: number,
	bgColor: Color,
	targetContrast: number,
	searchDirection: "lighter" | "darker",
	startTone: number,
): { tone: number; color: Color; contrast: number } | null {
	// 探索範囲を定義
	let low: number;
	let high: number;

	if (searchDirection === "darker") {
		low = 0;
		high = startTone;
	} else {
		low = startTone;
		high = 100;
	}

	// エッジケース: 極端な開始トーンで探索範囲が縮退している場合
	// 縮退の閾値を2に設定（探索に最低限必要な範囲）
	const MIN_SEARCH_RANGE = 2;
	const initialRange = high - low;

	if (initialRange < MIN_SEARCH_RANGE) {
		// 探索範囲が狭すぎる場合、反対方向への探索を許可
		if (searchDirection === "darker") {
			// 暗い方向の範囲が狭い → 明るい方向に拡張
			high = Math.min(startTone + 20, 100);
		} else {
			// 明るい方向の範囲が狭い → 暗い方向に拡張
			low = Math.max(startTone - 20, 0);
		}
	} else if (high - low < 5) {
		// 範囲が狭い（5未満）が縮退はしていない場合、小さく拡張
		if (searchDirection === "darker") {
			high = Math.min(startTone + 10, 100);
		} else {
			low = Math.max(startTone - 10, 0);
		}
	}

	// 探索範囲の両端をまず評価（達成可能性チェック）
	const lowColor = fromHct(hue, chroma, low);
	const highColor = fromHct(hue, chroma, high);
	const lowContrast = lowColor.contrast(bgColor);
	const highContrast = highColor.contrast(bgColor);

	// 目標コントラストが探索範囲内で達成可能か確認
	const minContrast = Math.min(lowContrast, highContrast);
	const maxContrast = Math.max(lowContrast, highContrast);
	const isTargetAchievable =
		targetContrast >= minContrast && targetContrast <= maxContrast;

	let bestResult: { tone: number; color: Color; contrast: number } | null =
		null;
	let bestDiff = Infinity;

	// 両端を初期候補として評価
	const lowDiff = Math.abs(lowContrast - targetContrast);
	const highDiff = Math.abs(highContrast - targetContrast);

	if (lowDiff < bestDiff) {
		bestDiff = lowDiff;
		bestResult = { tone: low, color: lowColor, contrast: lowContrast };
	}
	if (highDiff < bestDiff) {
		bestDiff = highDiff;
		bestResult = { tone: high, color: highColor, contrast: highContrast };
	}

	// 目標が達成不可能な場合、最善の端点を返却
	if (!isTargetAchievable) {
		return bestResult;
	}

	// バイナリサーチで目標コントラストを探索
	for (let i = 0; i < 25; i++) {
		const midTone = (low + high) / 2;
		const candidate = fromHct(hue, chroma, midTone);
		const contrast = candidate.contrast(bgColor);
		const diff = Math.abs(contrast - targetContrast);

		if (diff < bestDiff) {
			bestDiff = diff;
			bestResult = { tone: midTone, color: candidate, contrast };
		}

		// 許容誤差内であれば終了
		if (diff < 0.1) {
			return bestResult;
		}

		// 収束判定: 探索範囲が十分狭くなった場合は終了
		if (high - low < 0.01) {
			return bestResult;
		}

		// 探索方向に基づいてバイナリサーチを調整
		if (searchDirection === "darker") {
			// 暗い方向: トーンが低いほどコントラストが高い（通常）
			if (contrast < targetContrast) {
				high = midTone;
			} else {
				low = midTone;
			}
		} else {
			// 明るい方向: トーンが高いほどコントラストが高い（ダーク背景の場合）
			if (contrast < targetContrast) {
				low = midTone;
			} else {
				high = midTone;
			}
		}
	}

	return bestResult;
}

/**
 * DADSステップの情報を保持する型
 */
interface DadsStepCandidate {
	step: DadsChromaScale;
	hex: string;
	tokenId: string;
	contrast: number;
	diff: number;
}

/**
 * DADSトークンから目標コントラストに最も近いステップを選択
 *
 * @param tokens DADSトークン配列
 * @param baseChromaName 基本クロマ名（例: "Blue", "Light Blue"）
 * @param bgColor 背景色
 * @param targetContrast 目標コントラスト比
 * @param excludeSteps 除外するステップ（重複回避用）
 * @returns 選択されたステップ情報、または null
 */
function findDadsStepForContrast(
	tokens: DadsToken[],
	baseChromaName: string,
	bgColor: Color,
	targetContrast: number,
	excludeSteps: Set<DadsChromaScale>,
): DadsStepCandidate | null {
	// 表示名からDADS色相を取得
	const dadsHue = getDadsHueFromDisplayName(baseChromaName);
	if (!dadsHue) {
		return null;
	}

	// 該当色相のカラースケールを取得
	const colorScale = getDadsColorsByHue(tokens, dadsHue);
	if (!colorScale.colors.length) {
		return null;
	}

	// 各ステップのコントラストを計算し、目標に最も近いものを選択
	const candidates: DadsStepCandidate[] = [];

	for (const colorEntry of colorScale.colors) {
		// 除外ステップはスキップ
		if (excludeSteps.has(colorEntry.scale)) {
			continue;
		}

		const stepColor = new Color(colorEntry.hex);
		const contrast = stepColor.contrast(bgColor);
		const diff = Math.abs(contrast - targetContrast);

		candidates.push({
			step: colorEntry.scale,
			hex: colorEntry.hex,
			tokenId: colorEntry.token.id,
			contrast,
			diff,
		});
	}

	if (candidates.length === 0) {
		return null;
	}

	// 目標コントラストを満たす候補がある場合は、超過分が最小のものを優先する。
	// （「近いが未達」の色を選ぶと UI 側の minContrast を下回りやすい）
	const meetsTarget = candidates.filter((c) => c.contrast >= targetContrast);
	if (meetsTarget.length > 0) {
		meetsTarget.sort((a, b) => {
			const aExcess = a.contrast - targetContrast;
			const bExcess = b.contrast - targetContrast;
			return aExcess - bExcess || a.diff - b.diff;
		});
		return meetsTarget[0] ?? null;
	}

	// 目標を満たす候補がない場合は、最も近い候補を返す（フォールバック）
	candidates.sort((a, b) => a.diff - b.diff);

	// 最も近い候補を返す
	return candidates[0] ?? null;
}

/**
 * DADSトークンからセカンダリ・ターシャリを導出
 *
 * 同じ色相（baseChromaName）のDADSトークンから、
 * 目標コントラストに最も近いステップを選択する。
 */
function deriveFromDadsTokens(
	primaryColor: Color,
	bgColor: Color,
	secondaryUiContrast: number,
	tertiaryContrast: number,
	dadsMode: NonNullable<DerivationConfig["dadsMode"]>,
): DerivedColorSet {
	const { tokens, baseChromaName, primaryStep } = dadsMode;

	// プライマリのHCT表現を取得
	const primaryHct = toHct(primaryColor);
	const hue = primaryHct.hue;
	const chroma = primaryHct.chroma;
	const primaryTone = primaryHct.tone;

	// 背景モードを判定
	const isLight = isLightBackground(bgColor);
	const primaryContrast = primaryColor.contrast(bgColor);

	// 除外ステップ（Primaryのステップは除外）
	const excludeSteps = new Set<DadsChromaScale>();
	if (primaryStep) {
		excludeSteps.add(primaryStep);
	}

	// Secondaryを探索
	const secondaryCandidate = findDadsStepForContrast(
		tokens,
		baseChromaName,
		bgColor,
		secondaryUiContrast,
		excludeSteps,
	);

	// Secondaryのステップを除外リストに追加（Tertiaryと重複しないように）
	if (secondaryCandidate) {
		excludeSteps.add(secondaryCandidate.step);
	}

	// Tertiaryを探索
	const tertiaryCandidate = findDadsStepForContrast(
		tokens,
		baseChromaName,
		bgColor,
		tertiaryContrast,
		excludeSteps,
	);

	// 方向を決定
	const needsLowerContrast = primaryContrast >= secondaryUiContrast;
	const secondaryDirection: "lighter" | "darker" =
		(isLight && needsLowerContrast) || (!isLight && !needsLowerContrast)
			? "lighter"
			: "darker";
	const tertiaryDirection: "lighter" | "darker" = isLight
		? "lighter"
		: "darker";

	// Secondary DerivedColor を構築
	let secondary: DerivedColor;
	if (secondaryCandidate) {
		// DADS tokens are already in sRGB gamut, skip clamping to preserve exact hex values
		const secondaryColor = new Color(secondaryCandidate.hex, {
			skipClamp: true,
		});
		const secondaryHct = toHct(secondaryColor);
		secondary = {
			color: secondaryColor,
			tone: secondaryHct.tone,
			contrastRatio: secondaryCandidate.contrast,
			lightnessDirection: secondaryDirection,
			step: secondaryCandidate.step,
			dadsTokenId: secondaryCandidate.tokenId,
		};
	} else {
		secondary = createFallbackColor(
			hue,
			chroma,
			primaryTone,
			secondaryDirection,
			bgColor,
		);
	}

	// Tertiary DerivedColor を構築
	let tertiary: DerivedColor;
	if (tertiaryCandidate) {
		// DADS tokens are already in sRGB gamut, skip clamping to preserve exact hex values
		const tertiaryColor = new Color(tertiaryCandidate.hex, { skipClamp: true });
		const tertiaryHct = toHct(tertiaryColor);
		tertiary = {
			color: tertiaryColor,
			tone: tertiaryHct.tone,
			contrastRatio: tertiaryCandidate.contrast,
			lightnessDirection: tertiaryDirection,
			step: tertiaryCandidate.step,
			dadsTokenId: tertiaryCandidate.tokenId,
		};
	} else {
		tertiary = createFallbackColor(
			hue,
			chroma,
			secondary.tone,
			tertiaryDirection,
			bgColor,
		);
	}

	return {
		primary: {
			color: primaryColor,
			tone: primaryTone,
			contrastRatio: primaryContrast,
		},
		secondary,
		tertiary,
		sharedHue: hue,
		sharedChroma: chroma,
		backgroundMode: isLight ? "light" : "dark",
	};
}

/**
 * プライマリカラーからセカンダリ・ターシャリを導出
 *
 * デジタル庁デザインシステムの仕様に基づき:
 * - セカンダリ: プライマリと同色相、異なる明度（UI用3:1コントラスト）
 * - ターシャリ: セカンダリと反対の明度方向
 *
 * DADSモードが設定されている場合、同じ色相のDADSトークンから選択する。
 *
 * @param config 導出設定
 * @returns 導出結果セット
 */
export function deriveSecondaryTertiary(
	config: DerivationConfig,
): DerivedColorSet {
	// 入力を正規化
	const primaryColor =
		typeof config.primaryColor === "string"
			? new Color(config.primaryColor)
			: config.primaryColor;
	const bgColor =
		typeof config.backgroundColor === "string"
			? new Color(config.backgroundColor)
			: config.backgroundColor;

	// デフォルト値を適用
	const secondaryUiContrast =
		config.secondaryUiContrast ?? DADS_CONTRAST_DEFAULTS.secondaryUi;
	const tertiaryContrast =
		config.tertiaryContrast ?? DADS_CONTRAST_DEFAULTS.tertiary;

	// DADSモードの場合、DADSトークンから選択
	if (config.dadsMode) {
		return deriveFromDadsTokens(
			primaryColor,
			bgColor,
			secondaryUiContrast,
			tertiaryContrast,
			config.dadsMode,
		);
	}

	// プライマリのHCT表現を取得
	const primaryHct = toHct(primaryColor);
	const hue = primaryHct.hue;
	const chroma = primaryHct.chroma;
	const primaryTone = primaryHct.tone;

	// 背景モードを判定
	const isLight = isLightBackground(bgColor);
	const primaryContrast = primaryColor.contrast(bgColor);

	// Secondaryの方向を決定（コントラストベース）
	const needsLowerContrast = primaryContrast >= secondaryUiContrast;
	const secondaryDirection: "lighter" | "darker" =
		(isLight && needsLowerContrast) || (!isLight && !needsLowerContrast)
			? "lighter"
			: "darker";

	// Tertiaryは常に背景に近づく方向（最低コントラスト）
	const tertiaryDirection: "lighter" | "darker" = isLight
		? "lighter"
		: "darker";

	// セカンダリを探索（3:1コントラスト）
	const secondaryResult = findToneForContrast(
		hue,
		chroma,
		bgColor,
		secondaryUiContrast,
		secondaryDirection,
		primaryTone,
	);

	// フォールバック用のオフセット
	const secondaryToneOffset =
		secondaryDirection === "lighter"
			? FALLBACK_TONE_OFFSET
			: -FALLBACK_TONE_OFFSET;
	const secondaryTone =
		secondaryResult?.tone ?? primaryTone + secondaryToneOffset;

	// ターシャリを探索（1.5:1コントラスト）
	// 起点はSecondaryのトーン（Primary→Secondary→Tertiaryの階層を確保）
	const tertiaryResult = findToneForContrast(
		hue,
		chroma,
		bgColor,
		tertiaryContrast,
		tertiaryDirection,
		secondaryTone,
	);

	const secondary: DerivedColor = secondaryResult
		? {
				color: secondaryResult.color,
				tone: secondaryResult.tone,
				contrastRatio: secondaryResult.contrast,
				lightnessDirection: secondaryDirection,
			}
		: createFallbackColor(
				hue,
				chroma,
				primaryTone,
				secondaryDirection,
				bgColor,
			);

	const tertiary: DerivedColor = tertiaryResult
		? {
				color: tertiaryResult.color,
				tone: tertiaryResult.tone,
				contrastRatio: tertiaryResult.contrast,
				lightnessDirection: tertiaryDirection,
			}
		: createFallbackColor(
				hue,
				chroma,
				secondaryTone,
				tertiaryDirection,
				bgColor,
			);

	return {
		primary: {
			color: primaryColor,
			tone: primaryTone,
			contrastRatio: primaryContrast,
		},
		secondary,
		tertiary,
		sharedHue: hue,
		sharedChroma: chroma,
		backgroundMode: isLight ? "light" : "dark",
	};
}

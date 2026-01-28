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
import { getAllCVDTypes, simulateCVD } from "../../accessibility/cvd-simulator";
import { calculateSimpleDeltaE } from "../../accessibility/distinguishability";
import { Color } from "../color";
import type { DadsChromaScale, DadsColorHue, DadsToken } from "../tokens/types";
import type { DerivationConfig, DerivedColor, DerivedColorSet } from "./types";
import { DADS_CONTRAST_DEFAULTS } from "./types";

type LightnessDirection = "lighter" | "darker";

const EN_TO_HUE: Record<string, DadsColorHue> = {
	Blue: "blue",
	"Light Blue": "light-blue",
	Cyan: "cyan",
	Green: "green",
	Lime: "lime",
	Yellow: "yellow",
	Orange: "orange",
	Red: "red",
	Magenta: "magenta",
	Purple: "purple",
};

const DADS_HUE_SET = new Set<DadsColorHue>(Object.values(EN_TO_HUE));

function getDadsHueFromBaseChromaName(
	baseChromaName: string,
): DadsColorHue | undefined {
	// Already a DadsColorHue (e.g. "blue", "light-blue")
	if (DADS_HUE_SET.has(baseChromaName as DadsColorHue)) {
		return baseChromaName as DadsColorHue;
	}
	return EN_TO_HUE[baseChromaName];
}

const DADS_SCALE_ORDER: readonly DadsChromaScale[] = [
	50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
] as const;

// NOTE: Keep key-color distinguishability checks independent from the UI toggle.
// (The toggle is for display; key-color derivation should remain stable and safe.)
const KEY_COLOR_DISTINGUISHABILITY_THRESHOLD = 5.0;

/**
 * フォールバック時のHCTトーンオフセット値
 *
 * バイナリサーチが失敗した場合に、プライマリまたはセカンダリの
 * トーンからこの値だけ明るい/暗い方向にずらしてフォールバック色を生成する。
 */
const FALLBACK_TONE_OFFSET = 15;

function flipDirection(direction: LightnessDirection): LightnessDirection {
	return direction === "lighter" ? "darker" : "lighter";
}

function getPreferredSecondaryDirection(
	isLightBackground: boolean,
	primaryContrast: number,
	secondaryUiContrast: number,
): LightnessDirection {
	const towardBackground: LightnessDirection = isLightBackground
		? "lighter"
		: "darker";
	return primaryContrast >= secondaryUiContrast
		? towardBackground
		: flipDirection(towardBackground);
}

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
	direction: LightnessDirection,
	bgColor: Color,
): DerivedColor {
	const toneOffset =
		direction === "lighter" ? FALLBACK_TONE_OFFSET : -FALLBACK_TONE_OFFSET;
	const tone = Math.min(100, Math.max(0, baseTone + toneOffset));
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

function isKeyColorPairDistinguishable(color1: Color, color2: Color): boolean {
	const normalDeltaE = calculateSimpleDeltaE(color1, color2);
	if (normalDeltaE < KEY_COLOR_DISTINGUISHABILITY_THRESHOLD) return false;

	for (const cvdType of getAllCVDTypes()) {
		const sim1 = simulateCVD(color1, cvdType);
		const sim2 = simulateCVD(color2, cvdType);
		const cvdDeltaE = calculateSimpleDeltaE(sim1, sim2);
		if (cvdDeltaE < KEY_COLOR_DISTINGUISHABILITY_THRESHOLD) return false;
	}

	return true;
}

function normalizeSeed(seed: DerivationConfig["seed"]): string {
	if (seed === undefined) return "";
	if (typeof seed === "number")
		return Number.isFinite(seed) ? String(seed) : "0";
	return seed;
}

function fnv1a32(input: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

function pickBySeed<T>(
	items: readonly T[],
	seed: DerivationConfig["seed"],
	salt: string,
): T {
	if (items.length === 0) {
		throw new Error("pickBySeed: items must not be empty");
	}
	if (items.length === 1) return items[0] as T;
	if (seed === undefined) return items[0] as T;

	const key = `${normalizeSeed(seed)}|${salt}`;
	const hash = fnv1a32(key);
	const index = hash % items.length;
	return items[index] as T;
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

	// 「目標を満たす候補」がある場合は、未達より優先する
	let bestMeet: { tone: number; color: Color; contrast: number } | null = null;
	let bestExcess = Infinity;

	const considerCandidate = (candidate: {
		tone: number;
		color: Color;
		contrast: number;
	}): void => {
		const diff = Math.abs(candidate.contrast - targetContrast);

		if (diff < bestDiff) {
			bestDiff = diff;
			bestResult = candidate;
		}

		if (candidate.contrast >= targetContrast) {
			const excess = candidate.contrast - targetContrast;
			if (excess < bestExcess) {
				bestExcess = excess;
				bestMeet = candidate;
			}
		}
	};

	// 両端を初期候補として評価
	considerCandidate({ tone: low, color: lowColor, contrast: lowContrast });
	considerCandidate({ tone: high, color: highColor, contrast: highContrast });

	// 目標が達成不可能な場合、最善の端点を返却
	if (!isTargetAchievable) {
		return bestMeet ?? bestResult;
	}

	// バイナリサーチで目標コントラストを探索
	for (let i = 0; i < 25; i++) {
		const midTone = (low + high) / 2;
		const candidate = fromHct(hue, chroma, midTone);
		const contrast = candidate.contrast(bgColor);
		const diff = Math.abs(contrast - targetContrast);

		considerCandidate({ tone: midTone, color: candidate, contrast });

		// 許容誤差内であれば終了
		if (diff < 0.1) {
			return bestMeet ?? bestResult;
		}

		// 収束判定: 探索範囲が十分狭くなった場合は終了
		if (high - low < 0.01) {
			return bestMeet ?? bestResult;
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

	return bestMeet ?? bestResult;
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
	seed: DerivationConfig["seed"],
): DerivedColorSet {
	const { tokens, baseChromaName } = dadsMode;

	// プライマリのHCT表現を取得
	const primaryHct = toHct(primaryColor);
	const hue = primaryHct.hue;
	const chroma = primaryHct.chroma;
	const primaryTone = primaryHct.tone;

	// 背景モードを判定
	const isLight = isLightBackground(bgColor);
	const primaryContrast = primaryColor.contrast(bgColor);

	const dadsHue = getDadsHueFromBaseChromaName(baseChromaName);
	if (!dadsHue) {
		// Defensive fallback: behave like non-DADS derivation when hue metadata is missing.
		return deriveSecondaryTertiary({
			primaryColor,
			backgroundColor: bgColor,
			secondaryUiContrast,
			tertiaryContrast,
		});
	}

	const tokenByScale = new Map<DadsChromaScale, DadsToken>();
	for (const token of tokens) {
		if (token.classification.category !== "chromatic") continue;
		if (token.classification.hue !== dadsHue) continue;
		const scale = token.classification.scale as DadsChromaScale | undefined;
		if (!scale) continue;
		tokenByScale.set(scale, token);
	}

	const primaryHex = primaryColor.toHex().toLowerCase();
	let resolvedPrimaryStep = dadsMode.primaryStep;
	if (resolvedPrimaryStep === undefined) {
		for (const [scale, token] of tokenByScale.entries()) {
			if (token.hex.toLowerCase() === primaryHex) {
				resolvedPrimaryStep = scale;
				break;
			}
		}
	}

	// 除外ステップ（Primaryのステップは除外）
	const excludeSteps = new Set<DadsChromaScale>();
	if (resolvedPrimaryStep !== undefined) {
		excludeSteps.add(resolvedPrimaryStep);
	}

	type DadsStepOption = {
		step: DadsChromaScale;
		hex: string;
		tokenId: string;
		color: Color;
		contrast: number;
		tone: number;
	};

	const candidates: DadsStepOption[] = [];
	for (const scale of DADS_SCALE_ORDER) {
		if (excludeSteps.has(scale)) continue;
		const token = tokenByScale.get(scale);
		if (!token) continue;

		// DADS tokens are already in sRGB gamut, skip clamping to preserve exact hex values
		const color = new Color(token.hex, { skipClamp: true });
		const contrast = color.contrast(bgColor);
		const tone = toHct(color).tone;

		candidates.push({
			step: scale,
			hex: token.hex,
			tokenId: token.id,
			color,
			contrast,
			tone,
		});
	}

	const preferredSecondaryDirection = getPreferredSecondaryDirection(
		isLight,
		primaryContrast,
		secondaryUiContrast,
	);

	const clampScale = (value: number): number =>
		Math.min(1200, Math.max(50, value));

	let desiredSecondaryScale: number | undefined;
	let desiredTertiaryScale: number | undefined;

	if (resolvedPrimaryStep !== undefined) {
		if (isLight) {
			if (resolvedPrimaryStep >= 800) {
				desiredSecondaryScale = clampScale(resolvedPrimaryStep - 200);
				desiredTertiaryScale = clampScale(resolvedPrimaryStep + 200);
			} else {
				// Primary が比較的明るい（例: 600）場合は、暗い側に寄せた組み合わせを優先する。
				// 600 -> Secondary 800 / Tertiary 1000 or 1100 が選ばれやすい。
				desiredSecondaryScale = clampScale(resolvedPrimaryStep + 200);
				desiredTertiaryScale = clampScale(resolvedPrimaryStep + 450);
			}
		} else {
			// ダーク背景では、明るい側（スケールが小さい側）を優先する。
			if (resolvedPrimaryStep <= 400) {
				desiredSecondaryScale = clampScale(resolvedPrimaryStep + 200);
				desiredTertiaryScale = clampScale(resolvedPrimaryStep + 450);
			} else {
				desiredSecondaryScale = clampScale(resolvedPrimaryStep - 200);
				desiredTertiaryScale = clampScale(resolvedPrimaryStep - 450);
			}
		}
	} else {
		// primaryStep が不明な場合のフォールバック（DADS例に寄せる）
		desiredSecondaryScale = isLight ? 600 : 400;
		desiredTertiaryScale = isLight ? 1000 : 200;
	}

	const scoreTriplet = (
		secondary: DadsStepOption,
		tertiary: DadsStepOption,
	) => {
		const targetDistance =
			Math.abs(secondary.step - (desiredSecondaryScale ?? secondary.step)) +
			Math.abs(tertiary.step - (desiredTertiaryScale ?? tertiary.step));

		// Prefer having one key on each side of the primary tone if possible.
		const secondaryDir: LightnessDirection =
			secondary.tone > primaryTone ? "lighter" : "darker";
		const tertiaryDir: LightnessDirection =
			tertiary.tone > primaryTone ? "lighter" : "darker";
		const directionBonus = secondaryDir !== tertiaryDir ? -30 : 0;

		// Penalize very close step pairs (e.g. Δ100) but allow if constraints are met.
		const stepGap = Math.abs(secondary.step - tertiary.step);
		const stepGapPenalty = Math.max(0, 200 - stepGap) * 0.5;

		return targetDistance + stepGapPenalty + directionBonus;
	};

	type TripletCandidate = {
		secondary: DadsStepOption;
		tertiary: DadsStepOption;
		passCount: number;
		score: number;
	};

	let bestPassCount = -1;
	let bestScore = Infinity;
	let best: TripletCandidate[] = [];

	for (const secondaryOption of candidates) {
		if (secondaryOption.contrast < secondaryUiContrast) continue;

		for (const tertiaryOption of candidates) {
			if (tertiaryOption.step === secondaryOption.step) continue;
			if (tertiaryOption.contrast < tertiaryContrast) continue;

			let passCount = 0;
			if (isKeyColorPairDistinguishable(primaryColor, secondaryOption.color))
				passCount += 1;
			if (isKeyColorPairDistinguishable(primaryColor, tertiaryOption.color))
				passCount += 1;
			if (
				isKeyColorPairDistinguishable(
					secondaryOption.color,
					tertiaryOption.color,
				)
			) {
				passCount += 1;
			}

			const score = scoreTriplet(secondaryOption, tertiaryOption);

			if (
				passCount > bestPassCount ||
				(passCount === bestPassCount && score < bestScore - 1e-9)
			) {
				bestPassCount = passCount;
				bestScore = score;
				best = [
					{
						secondary: secondaryOption,
						tertiary: tertiaryOption,
						passCount,
						score,
					},
				];
				continue;
			}

			if (passCount === bestPassCount && Math.abs(score - bestScore) <= 1e-9) {
				best.push({
					secondary: secondaryOption,
					tertiary: tertiaryOption,
					passCount,
					score,
				});
			}
		}
	}

	best.sort(
		(a, b) =>
			b.passCount - a.passCount ||
			a.score - b.score ||
			a.secondary.step - b.secondary.step ||
			a.tertiary.step - b.tertiary.step,
	);

	const chosen =
		best.length > 0
			? pickBySeed(
					best,
					seed,
					`dads-key-colors|${dadsHue}|${primaryHex}|${resolvedPrimaryStep ?? ""}|${secondaryUiContrast}|${tertiaryContrast}`,
				)
			: undefined;

	// Secondary DerivedColor を構築
	let secondary: DerivedColor;
	if (chosen) {
		const secondaryDirection: LightnessDirection =
			chosen.secondary.tone > primaryTone ? "lighter" : "darker";
		secondary = {
			color: chosen.secondary.color,
			tone: chosen.secondary.tone,
			contrastRatio: chosen.secondary.contrast,
			lightnessDirection: secondaryDirection,
			step: chosen.secondary.step,
			dadsTokenId: chosen.secondary.tokenId,
		};
	} else {
		secondary = createFallbackColor(
			hue,
			chroma,
			primaryTone,
			preferredSecondaryDirection,
			bgColor,
		);
	}

	// Tertiary DerivedColor を構築
	let tertiary: DerivedColor;
	if (chosen) {
		const tertiaryDirection: LightnessDirection =
			chosen.tertiary.tone > primaryTone ? "lighter" : "darker";
		tertiary = {
			color: chosen.tertiary.color,
			tone: chosen.tertiary.tone,
			contrastRatio: chosen.tertiary.contrast,
			lightnessDirection: tertiaryDirection,
			step: chosen.tertiary.step,
			dadsTokenId: chosen.tertiary.tokenId,
		};
	} else {
		const tertiaryDirection: LightnessDirection = flipDirection(
			preferredSecondaryDirection,
		);
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
			config.seed,
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

	const MIN_TONE_OFFSET = 1;

	const clampTone = (tone: number): number => Math.min(100, Math.max(0, tone));

	const startToneFor = (direction: LightnessDirection): number =>
		clampTone(
			direction === "lighter"
				? primaryTone + MIN_TONE_OFFSET
				: primaryTone - MIN_TONE_OFFSET,
		);

	const preferredSecondaryDirection = getPreferredSecondaryDirection(
		isLight,
		primaryContrast,
		secondaryUiContrast,
	);

	type HctPair = {
		secondaryDirection: LightnessDirection;
		tertiaryDirection: LightnessDirection;
		secondaryResult: { tone: number; color: Color; contrast: number } | null;
		tertiaryResult: { tone: number; color: Color; contrast: number } | null;
	};

	const pairA: HctPair = {
		secondaryDirection: "lighter",
		tertiaryDirection: "darker",
		secondaryResult: findToneForContrast(
			hue,
			chroma,
			bgColor,
			secondaryUiContrast,
			"lighter",
			startToneFor("lighter"),
		),
		tertiaryResult: findToneForContrast(
			hue,
			chroma,
			bgColor,
			tertiaryContrast,
			"darker",
			startToneFor("darker"),
		),
	};

	const pairB: HctPair = {
		secondaryDirection: "darker",
		tertiaryDirection: "lighter",
		secondaryResult: findToneForContrast(
			hue,
			chroma,
			bgColor,
			secondaryUiContrast,
			"darker",
			startToneFor("darker"),
		),
		tertiaryResult: findToneForContrast(
			hue,
			chroma,
			bgColor,
			tertiaryContrast,
			"lighter",
			startToneFor("lighter"),
		),
	};

	const meetsTarget = (
		result: { contrast: number } | null,
		target: number,
	): boolean => Boolean(result && result.contrast >= target);

	const pairMeetsBoth = (pair: HctPair): boolean =>
		meetsTarget(pair.secondaryResult, secondaryUiContrast) &&
		meetsTarget(pair.tertiaryResult, tertiaryContrast);

	const meetA = pairMeetsBoth(pairA);
	const meetB = pairMeetsBoth(pairB);

	const meetCount = (pair: HctPair): number =>
		(meetsTarget(pair.secondaryResult, secondaryUiContrast) ? 1 : 0) +
		(meetsTarget(pair.tertiaryResult, tertiaryContrast) ? 1 : 0);

	let chosen: HctPair = pairA;
	if (meetA && meetB) {
		chosen =
			pairA.secondaryDirection === preferredSecondaryDirection ? pairA : pairB;
	} else if (meetA) {
		chosen = pairA;
	} else if (meetB) {
		chosen = pairB;
	} else {
		const countA = meetCount(pairA);
		const countB = meetCount(pairB);
		if (countA !== countB) {
			chosen = countA > countB ? pairA : pairB;
		} else {
			chosen =
				pairA.secondaryDirection === preferredSecondaryDirection
					? pairA
					: pairB;
		}
	}

	const secondaryDirection = chosen.secondaryDirection;
	const tertiaryDirection = chosen.tertiaryDirection;
	const secondaryResult = chosen.secondaryResult;
	const tertiaryResult = chosen.tertiaryResult;

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
		: createFallbackColor(hue, chroma, primaryTone, tertiaryDirection, bgColor);

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

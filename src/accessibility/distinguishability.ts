/**
 * Distinguishability - 色の識別性検証
 *
 * パレット内の色ペアが色覚特性を持つユーザーにとって
 * 識別可能かどうかを検証します。
 */

import { Color } from "../core/color";
import { type CVDType, getAllCVDTypes, simulateCVD } from "./cvd-simulator";

// ============================================
// 共有定数
// ============================================

/**
 * 識別困難と判定する色差の閾値（ΔEOK = OKLabユークリッド距離 × 100）
 * GPT調査結果に基づき5.0を採用（「2色として認識しやすい」境界）
 *
 * この値は以下のモジュールで共有使用される:
 * - @/ui/accessibility/color-sorting（境界検証）
 * - @/ui/demo/views/accessibility-view（CVD混同検出）
 */
export const DISTINGUISHABILITY_THRESHOLD = 5.0;

/**
 * 識別性検証の重大度
 */
export type Severity = "ok" | "warning" | "error";

/**
 * 色ペアの識別性検証結果
 */
export interface DistinguishabilityResult {
	/** 色ペア（ID/名前） */
	colorPair: [string, string];
	/** 色ペア（Colorオブジェクト） */
	colors: [Color, Color];
	/** 通常の色差（ΔE） */
	normalDeltaE: number;
	/** シミュレーション後の色差（ΔE） */
	simulatedDeltaE: number;
	/** 色覚タイプ */
	visionType: CVDType;
	/** 識別可能かどうか */
	isDistinguishable: boolean;
	/** 重大度 */
	severity: Severity;
}

/**
 * パレット全体の識別性検証結果
 */
export interface PaletteDistinguishabilityResult {
	/** 全検証結果 */
	results: DistinguishabilityResult[];
	/** 識別困難な色ペア */
	problematicPairs: DistinguishabilityResult[];
	/** 各色覚タイプでの問題数 */
	issuesByType: Record<CVDType, number>;
	/** 全体のパス率（0-100） */
	passRate: number;
}

/**
 * 識別性検証オプション
 */
export interface DistinguishabilityOptions {
	/** 識別困難の閾値（ΔE）デフォルト: 3.0 */
	threshold?: number;
	/** 警告の閾値（ΔE）デフォルト: 5.0 */
	warningThreshold?: number;
	/** 検証する色覚タイプ */
	visionTypes?: CVDType[];
}

/**
 * OKLCH空間での色差（ΔE）を計算する
 *
 * ΔE = sqrt((ΔL)² + (ΔC)² + (ΔH')²)
 * ここでΔH'は色相差をChromaで重み付けした値
 *
 * @param color1 - 色1
 * @param color2 - 色2
 * @returns 色差（ΔE）
 */
export function calculateDeltaE(color1: Color, color2: Color): number {
	const oklch1 = color1.oklch;
	const oklch2 = color2.oklch;

	// Lightness差
	const deltaL = oklch2.l - oklch1.l;

	// Chroma差
	const deltaC = oklch2.c - oklch1.c;

	// Hue差（角度）
	const h1 = oklch1.h ?? 0;
	const h2 = oklch2.h ?? 0;
	let deltaH = h2 - h1;

	// 角度を-180〜180の範囲に正規化
	if (deltaH > 180) deltaH -= 360;
	if (deltaH < -180) deltaH += 360;

	// Hue差をラジアンに変換し、Chromaで重み付け
	const deltaHPrime =
		2 * Math.sqrt(oklch1.c * oklch2.c) * Math.sin((deltaH * Math.PI) / 360);

	// ΔE計算（Lightnessを100倍してスケール調整）
	const deltaE = Math.sqrt(
		(deltaL * 100) ** 2 + (deltaC * 100) ** 2 + (deltaHPrime * 100) ** 2,
	);

	return deltaE;
}

/**
 * 簡易色差計算（ユークリッド距離）
 *
 * @param color1 - 色1
 * @param color2 - 色2
 * @returns 色差
 */
export function calculateSimpleDeltaE(color1: Color, color2: Color): number {
	const oklch1 = color1.oklch;
	const oklch2 = color2.oklch;

	const deltaL = (oklch2.l - oklch1.l) * 100;

	// Hue差を直交座標に変換
	const h1 = ((oklch1.h ?? 0) * Math.PI) / 180;
	const h2 = ((oklch2.h ?? 0) * Math.PI) / 180;

	const a1 = oklch1.c * Math.cos(h1) * 100;
	const b1 = oklch1.c * Math.sin(h1) * 100;
	const a2 = oklch2.c * Math.cos(h2) * 100;
	const b2 = oklch2.c * Math.sin(h2) * 100;

	const deltaA = a2 - a1;
	const deltaB = b2 - b1;

	return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

/**
 * 色ペアの識別性を検証する
 *
 * @param color1 - 色1
 * @param color2 - 色2
 * @param name1 - 色1の名前/ID
 * @param name2 - 色2の名前/ID
 * @param visionType - 色覚タイプ
 * @param options - 検証オプション
 * @returns 識別性検証結果
 */
export function checkDistinguishability(
	color1: Color,
	color2: Color,
	name1: string,
	name2: string,
	visionType: CVDType,
	options: DistinguishabilityOptions = {},
): DistinguishabilityResult {
	const { threshold = 3.0, warningThreshold = 5.0 } = options;

	// 通常の色差を計算
	const normalDeltaE = calculateSimpleDeltaE(color1, color2);

	// シミュレーション後の色差を計算
	const simulated1 = simulateCVD(color1, visionType);
	const simulated2 = simulateCVD(color2, visionType);
	const simulatedDeltaE = calculateSimpleDeltaE(simulated1, simulated2);

	// 識別可能性と重大度を判定
	const isDistinguishable = simulatedDeltaE >= threshold;
	let severity: Severity;

	if (simulatedDeltaE >= warningThreshold) {
		severity = "ok";
	} else if (simulatedDeltaE >= threshold) {
		severity = "warning";
	} else {
		severity = "error";
	}

	return {
		colorPair: [name1, name2],
		colors: [color1, color2],
		normalDeltaE,
		simulatedDeltaE,
		visionType,
		isDistinguishable,
		severity,
	};
}

/**
 * 複数の色ペアの識別性を検証する
 *
 * @param colors - 色のレコード（名前 → Color）
 * @param options - 検証オプション
 * @returns パレット全体の識別性検証結果
 */
export function checkPaletteDistinguishability(
	colors: Record<string, Color>,
	options: DistinguishabilityOptions = {},
): PaletteDistinguishabilityResult {
	const { visionTypes = getAllCVDTypes() } = options;

	const results: DistinguishabilityResult[] = [];
	const problematicPairs: DistinguishabilityResult[] = [];
	const issuesByType: Record<CVDType, number> = {
		protanopia: 0,
		deuteranopia: 0,
		tritanopia: 0,
		achromatopsia: 0,
	};

	const colorEntries = Object.entries(colors);
	const totalPairs = (colorEntries.length * (colorEntries.length - 1)) / 2;

	// 全色ペアを検証
	for (let i = 0; i < colorEntries.length; i++) {
		for (let j = i + 1; j < colorEntries.length; j++) {
			const entry1 = colorEntries[i];
			const entry2 = colorEntries[j];
			if (!entry1 || !entry2) continue;
			const [name1, color1] = entry1;
			const [name2, color2] = entry2;

			// 各色覚タイプで検証
			for (const visionType of visionTypes) {
				const result = checkDistinguishability(
					color1,
					color2,
					name1,
					name2,
					visionType,
					options,
				);

				results.push(result);

				if (!result.isDistinguishable) {
					problematicPairs.push(result);
					issuesByType[visionType]++;
				}
			}
		}
	}

	// パス率を計算
	const totalChecks = totalPairs * visionTypes.length;
	const passedChecks = results.filter((r) => r.isDistinguishable).length;
	const passRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;

	return {
		results,
		problematicPairs,
		issuesByType,
		passRate,
	};
}

/**
 * 隣接シェード間の識別性を検証する
 *
 * @param shades - シェードの配列（順序付き）
 * @param options - 検証オプション
 * @returns パレット全体の識別性検証結果
 */
export function checkAdjacentShadesDistinguishability(
	shades: Array<{ name: string; color: Color }>,
	options: DistinguishabilityOptions = {},
): PaletteDistinguishabilityResult {
	const { visionTypes = getAllCVDTypes() } = options;

	const results: DistinguishabilityResult[] = [];
	const problematicPairs: DistinguishabilityResult[] = [];
	const issuesByType: Record<CVDType, number> = {
		protanopia: 0,
		deuteranopia: 0,
		tritanopia: 0,
		achromatopsia: 0,
	};

	// 隣接シェードのみを検証
	for (let i = 0; i < shades.length - 1; i++) {
		const shade1 = shades[i];
		const shade2 = shades[i + 1];
		if (!shade1 || !shade2) continue;

		for (const visionType of visionTypes) {
			const result = checkDistinguishability(
				shade1.color,
				shade2.color,
				shade1.name,
				shade2.name,
				visionType,
				options,
			);

			results.push(result);

			if (!result.isDistinguishable) {
				problematicPairs.push(result);
				issuesByType[visionType]++;
			}
		}
	}

	// パス率を計算
	const totalChecks = (shades.length - 1) * visionTypes.length;
	const passedChecks = results.filter((r) => r.isDistinguishable).length;
	const passRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;

	return {
		results,
		problematicPairs,
		issuesByType,
		passRate,
	};
}

/**
 * 背景色とテキスト色のペアの識別性を検証する
 *
 * @param backgroundColors - 背景色のレコード
 * @param textColors - テキスト色のレコード
 * @param options - 検証オプション
 * @returns パレット全体の識別性検証結果
 */
export function checkBackgroundTextDistinguishability(
	backgroundColors: Record<string, Color>,
	textColors: Record<string, Color>,
	options: DistinguishabilityOptions = {},
): PaletteDistinguishabilityResult {
	const { visionTypes = getAllCVDTypes() } = options;

	const results: DistinguishabilityResult[] = [];
	const problematicPairs: DistinguishabilityResult[] = [];
	const issuesByType: Record<CVDType, number> = {
		protanopia: 0,
		deuteranopia: 0,
		tritanopia: 0,
		achromatopsia: 0,
	};

	const bgEntries = Object.entries(backgroundColors);
	const textEntries = Object.entries(textColors);

	// 背景色×テキスト色の全組み合わせを検証
	for (const [bgName, bgColor] of bgEntries) {
		for (const [textName, textColor] of textEntries) {
			for (const visionType of visionTypes) {
				const result = checkDistinguishability(
					bgColor,
					textColor,
					`bg:${bgName}`,
					`text:${textName}`,
					visionType,
					options,
				);

				results.push(result);

				if (!result.isDistinguishable) {
					problematicPairs.push(result);
					issuesByType[visionType]++;
				}
			}
		}
	}

	// パス率を計算
	const totalChecks =
		bgEntries.length * textEntries.length * visionTypes.length;
	const passedChecks = results.filter((r) => r.isDistinguishable).length;
	const passRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;

	return {
		results,
		problematicPairs,
		issuesByType,
		passRate,
	};
}

/**
 * CVDスコア計算結果
 */
export interface CVDScoreResult {
	/** 総合スコア（0-100） */
	overallScore: number;
	/** 色覚タイプ別スコア */
	scoresByType: Record<CVDType, number>;
	/** 色覚タイプ別の重み */
	weights: Record<CVDType, number>;
	/** グレード（A/B/C/D/F） */
	grade: "A" | "B" | "C" | "D" | "F";
	/** 説明 */
	description: string;
}

/**
 * CVDスコア計算オプション
 */
export interface CVDScoreOptions {
	/** 色覚タイプ別の重み（デフォルトは均等） */
	weights?: Partial<Record<CVDType, number>>;
	/** 検証オプション */
	distinguishabilityOptions?: DistinguishabilityOptions;
}

/**
 * パレットのCVDスコアを計算する
 *
 * スコアは各色覚タイプでの識別可能率を加重平均して算出します。
 * デフォルトでは、より一般的な色覚特性（Protanopia/Deuteranopia）に
 * 高い重みを設定しています。
 *
 * @param colors - 色のレコード（名前 → Color）
 * @param options - スコア計算オプション
 * @returns CVDスコア計算結果
 */
export function calculateCVDScore(
	colors: Record<string, Color>,
	options: CVDScoreOptions = {},
): CVDScoreResult {
	// デフォルトの重み（人口比率を考慮）
	const defaultWeights: Record<CVDType, number> = {
		protanopia: 0.3, // 1型2色覚
		deuteranopia: 0.35, // 2型2色覚（最も一般的）
		tritanopia: 0.2, // 3型2色覚
		achromatopsia: 0.15, // 全色盲
	};

	const weights = { ...defaultWeights, ...options.weights };

	// パレットの識別性を検証
	const result = checkPaletteDistinguishability(
		colors,
		options.distinguishabilityOptions,
	);

	// 色覚タイプ別のスコアを計算
	const scoresByType: Record<CVDType, number> = {
		protanopia: 0,
		deuteranopia: 0,
		tritanopia: 0,
		achromatopsia: 0,
	};

	const colorEntries = Object.entries(colors);
	const totalPairs = (colorEntries.length * (colorEntries.length - 1)) / 2;

	if (totalPairs === 0) {
		// 色が1つ以下の場合は満点
		return {
			overallScore: 100,
			scoresByType: {
				protanopia: 100,
				deuteranopia: 100,
				tritanopia: 100,
				achromatopsia: 100,
			},
			weights,
			grade: "A",
			description: "色が1つ以下のため、識別性の問題はありません。",
		};
	}

	// 各色覚タイプでのパス率を計算
	for (const type of getAllCVDTypes()) {
		const typeResults = result.results.filter((r) => r.visionType === type);
		const passedCount = typeResults.filter((r) => r.isDistinguishable).length;
		scoresByType[type] = (passedCount / typeResults.length) * 100;
	}

	// 加重平均で総合スコアを計算
	let overallScore = 0;
	let totalWeight = 0;

	for (const type of getAllCVDTypes()) {
		overallScore += scoresByType[type] * weights[type];
		totalWeight += weights[type];
	}

	overallScore = overallScore / totalWeight;

	// グレードを決定
	let grade: "A" | "B" | "C" | "D" | "F";
	let description: string;

	if (overallScore >= 90) {
		grade = "A";
		description = "優秀: ほぼ全ての色覚特性で識別可能です。";
	} else if (overallScore >= 75) {
		grade = "B";
		description =
			"良好: 大部分の色覚特性で識別可能ですが、一部に注意が必要です。";
	} else if (overallScore >= 60) {
		grade = "C";
		description = "普通: いくつかの色ペアで識別困難な場合があります。";
	} else if (overallScore >= 40) {
		grade = "D";
		description = "要改善: 多くの色ペアで識別困難な問題があります。";
	} else {
		grade = "F";
		description =
			"不合格: 色覚特性を持つユーザーにとって深刻な識別問題があります。";
	}

	return {
		overallScore: Math.round(overallScore * 10) / 10,
		scoresByType: {
			protanopia: Math.round(scoresByType.protanopia * 10) / 10,
			deuteranopia: Math.round(scoresByType.deuteranopia * 10) / 10,
			tritanopia: Math.round(scoresByType.tritanopia * 10) / 10,
			achromatopsia: Math.round(scoresByType.achromatopsia * 10) / 10,
		},
		weights,
		grade,
		description,
	};
}

/**
 * CVDスコアの詳細レポートを生成する
 *
 * @param colors - 色のレコード
 * @param options - スコア計算オプション
 * @returns レポート文字列
 */
export function generateCVDScoreReport(
	colors: Record<string, Color>,
	options: CVDScoreOptions = {},
): string {
	const score = calculateCVDScore(colors, options);
	const result = checkPaletteDistinguishability(
		colors,
		options.distinguishabilityOptions,
	);

	const lines: string[] = [
		"=== CVD Accessibility Score Report ===",
		"",
		`Overall Score: ${score.overallScore}/100 (Grade: ${score.grade})`,
		score.description,
		"",
		"--- Scores by Vision Type ---",
		`  Protanopia (P型):    ${score.scoresByType.protanopia}%`,
		`  Deuteranopia (D型):  ${score.scoresByType.deuteranopia}%`,
		`  Tritanopia (T型):    ${score.scoresByType.tritanopia}%`,
		`  Achromatopsia:       ${score.scoresByType.achromatopsia}%`,
		"",
	];

	if (result.problematicPairs.length > 0) {
		lines.push("--- Problematic Color Pairs ---");

		// 重大度でソート
		const sorted = [...result.problematicPairs].sort((a, b) => {
			const severityOrder = { error: 0, warning: 1, ok: 2 };
			return severityOrder[a.severity] - severityOrder[b.severity];
		});

		// 最大10件まで表示
		const displayed = sorted.slice(0, 10);
		for (const pair of displayed) {
			lines.push(
				`  [${pair.severity.toUpperCase()}] ${pair.colorPair[0]} - ${pair.colorPair[1]} ` +
					`(${pair.visionType}, ΔE: ${pair.simulatedDeltaE.toFixed(1)})`,
			);
		}

		if (sorted.length > 10) {
			lines.push(`  ... and ${sorted.length - 10} more issues`);
		}
	} else {
		lines.push("No problematic color pairs found!");
	}

	return lines.join("\n");
}

// ============================================
// 改善提案生成
// ============================================

/**
 * 改善提案の調整タイプ
 */
export type AdjustmentType = "lightness" | "hue" | "chroma";

/**
 * 単一の改善提案
 */
export interface ImprovementSuggestion {
	/** 調整タイプ */
	type: AdjustmentType;
	/** 調整対象の色名 */
	targetColor: string;
	/** 元の色 */
	originalColor: Color;
	/** 提案された色 */
	suggestedColor: Color;
	/** 調整量（Lightness: 0-1, Hue: 度, Chroma: 0-1） */
	adjustmentAmount: number;
	/** 調整方向の説明 */
	direction: string;
	/** 期待される改善効果（ΔEの増加量） */
	expectedImprovement: number;
	/** 改善後のシミュレーションΔE */
	newDeltaE: number;
}

/**
 * 色ペアの改善提案結果
 */
export interface PairImprovementResult {
	/** 色ペア（名前） */
	colorPair: [string, string];
	/** 色覚タイプ */
	visionType: CVDType;
	/** 元のΔE */
	originalDeltaE: number;
	/** 目標ΔE（閾値） */
	targetDeltaE: number;
	/** 改善提案リスト（優先順位順） */
	suggestions: ImprovementSuggestion[];
	/** 改善が可能かどうか */
	isImprovable: boolean;
}

/**
 * 改善提案生成オプション
 */
export interface ImprovementOptions {
	/** 目標ΔE（デフォルト: 5.0） */
	targetDeltaE?: number;
	/** Lightness調整の最大量（デフォルト: 0.2 = 20%） */
	maxLightnessAdjustment?: number;
	/** Hue調整の最大量（デフォルト: 30度） */
	maxHueAdjustment?: number;
	/** Chroma調整の最大量（デフォルト: 0.1） */
	maxChromaAdjustment?: number;
	/** 生成する提案の最大数（デフォルト: 3） */
	maxSuggestions?: number;
}

/**
 * Lightness調整による改善提案を生成する
 *
 * @param color1 - 色1
 * @param color2 - 色2
 * @param name1 - 色1の名前
 * @param name2 - 色2の名前
 * @param visionType - 色覚タイプ
 * @param options - 改善オプション
 * @returns 改善提案（改善できない場合はnull）
 */
export function suggestLightnessAdjustment(
	color1: Color,
	color2: Color,
	name1: string,
	name2: string,
	visionType: CVDType,
	options: ImprovementOptions = {},
): ImprovementSuggestion | null {
	const { targetDeltaE = 5.0, maxLightnessAdjustment = 0.2 } = options;

	const simulated1 = simulateCVD(color1, visionType);
	const simulated2 = simulateCVD(color2, visionType);
	const currentDeltaE = calculateSimpleDeltaE(simulated1, simulated2);

	if (currentDeltaE >= targetDeltaE) {
		return null;
	}

	// どちらの色を調整するか決定（明るい方を優先）
	const l1 = color1.oklch.l;
	const l2 = color2.oklch.l;
	const [targetName, targetColor, otherColor] =
		l1 > l2 ? [name1, color1, color2] : [name2, color2, color1];

	// Lightness調整量を計算
	const targetL = targetColor.oklch.l;

	// 明度差を広げる方向を決定
	let bestAdjustment = 0;
	let bestDeltaE = currentDeltaE;
	let bestSuggestedColor: Color | null = null;

	// 増加方向と減少方向の両方を試す
	for (const direction of [1, -1]) {
		for (let step = 0.02; step <= maxLightnessAdjustment; step += 0.02) {
			const newL = Math.max(0, Math.min(1, targetL + direction * step));
			const newColor = new Color({
				mode: "oklch",
				l: newL,
				c: targetColor.oklch.c,
				h: targetColor.oklch.h ?? 0,
			});

			const newSimulated = simulateCVD(newColor, visionType);
			const otherSimulated = simulateCVD(otherColor, visionType);
			const newDeltaE = calculateSimpleDeltaE(newSimulated, otherSimulated);

			if (newDeltaE > bestDeltaE) {
				bestDeltaE = newDeltaE;
				bestAdjustment = direction * step;
				bestSuggestedColor = newColor;

				if (newDeltaE >= targetDeltaE) {
					break;
				}
			}
		}

		if (bestDeltaE >= targetDeltaE) {
			break;
		}
	}

	if (!bestSuggestedColor || bestDeltaE <= currentDeltaE) {
		return null;
	}

	return {
		type: "lightness",
		targetColor: targetName,
		originalColor: targetColor,
		suggestedColor: bestSuggestedColor,
		adjustmentAmount: bestAdjustment,
		direction: bestAdjustment > 0 ? "明るく" : "暗く",
		expectedImprovement: bestDeltaE - currentDeltaE,
		newDeltaE: bestDeltaE,
	};
}

/**
 * Hue調整による改善提案を生成する
 *
 * @param color1 - 色1
 * @param color2 - 色2
 * @param name1 - 色1の名前
 * @param name2 - 色2の名前
 * @param visionType - 色覚タイプ
 * @param options - 改善オプション
 * @returns 改善提案（改善できない場合はnull）
 */
export function suggestHueAdjustment(
	color1: Color,
	color2: Color,
	name1: string,
	name2: string,
	visionType: CVDType,
	options: ImprovementOptions = {},
): ImprovementSuggestion | null {
	const { targetDeltaE = 5.0, maxHueAdjustment = 30 } = options;

	const simulated1 = simulateCVD(color1, visionType);
	const simulated2 = simulateCVD(color2, visionType);
	const currentDeltaE = calculateSimpleDeltaE(simulated1, simulated2);

	if (currentDeltaE >= targetDeltaE) {
		return null;
	}

	// 彩度が低い方を調整対象にする（Hue調整が効きやすい）
	const c1 = color1.oklch.c;
	const c2 = color2.oklch.c;
	const [targetName, targetColor, otherColor] =
		c1 < c2 ? [name1, color1, color2] : [name2, color2, color1];

	const targetH = targetColor.oklch.h ?? 0;

	let bestAdjustment = 0;
	let bestDeltaE = currentDeltaE;
	let bestSuggestedColor: Color | null = null;

	// 正方向と負方向の両方を試す
	for (const direction of [1, -1]) {
		for (let step = 5; step <= maxHueAdjustment; step += 5) {
			let newH = targetH + direction * step;
			// Hueを0-360の範囲に正規化
			if (newH < 0) newH += 360;
			if (newH >= 360) newH -= 360;

			const newColor = new Color({
				mode: "oklch",
				l: targetColor.oklch.l,
				c: targetColor.oklch.c,
				h: newH,
			});

			const newSimulated = simulateCVD(newColor, visionType);
			const otherSimulated = simulateCVD(otherColor, visionType);
			const newDeltaE = calculateSimpleDeltaE(newSimulated, otherSimulated);

			if (newDeltaE > bestDeltaE) {
				bestDeltaE = newDeltaE;
				bestAdjustment = direction * step;
				bestSuggestedColor = newColor;

				if (newDeltaE >= targetDeltaE) {
					break;
				}
			}
		}

		if (bestDeltaE >= targetDeltaE) {
			break;
		}
	}

	if (!bestSuggestedColor || bestDeltaE <= currentDeltaE) {
		return null;
	}

	return {
		type: "hue",
		targetColor: targetName,
		originalColor: targetColor,
		suggestedColor: bestSuggestedColor,
		adjustmentAmount: bestAdjustment,
		direction:
			bestAdjustment > 0 ? `+${bestAdjustment}°` : `${bestAdjustment}°`,
		expectedImprovement: bestDeltaE - currentDeltaE,
		newDeltaE: bestDeltaE,
	};
}

/**
 * Chroma調整による改善提案を生成する
 *
 * @param color1 - 色1
 * @param color2 - 色2
 * @param name1 - 色1の名前
 * @param name2 - 色2の名前
 * @param visionType - 色覚タイプ
 * @param options - 改善オプション
 * @returns 改善提案（改善できない場合はnull）
 */
export function suggestChromaAdjustment(
	color1: Color,
	color2: Color,
	name1: string,
	name2: string,
	visionType: CVDType,
	options: ImprovementOptions = {},
): ImprovementSuggestion | null {
	const { targetDeltaE = 5.0, maxChromaAdjustment = 0.1 } = options;

	const simulated1 = simulateCVD(color1, visionType);
	const simulated2 = simulateCVD(color2, visionType);
	const currentDeltaE = calculateSimpleDeltaE(simulated1, simulated2);

	if (currentDeltaE >= targetDeltaE) {
		return null;
	}

	// Chromaが高い方を調整対象にする
	const c1 = color1.oklch.c;
	const c2 = color2.oklch.c;
	const [targetName, targetColor, otherColor] =
		c1 > c2 ? [name1, color1, color2] : [name2, color2, color1];

	const targetC = targetColor.oklch.c;

	let bestAdjustment = 0;
	let bestDeltaE = currentDeltaE;
	let bestSuggestedColor: Color | null = null;

	// 増加方向と減少方向の両方を試す
	for (const direction of [1, -1]) {
		for (let step = 0.02; step <= maxChromaAdjustment; step += 0.02) {
			const newC = Math.max(0, Math.min(0.4, targetC + direction * step));
			const newColor = new Color({
				mode: "oklch",
				l: targetColor.oklch.l,
				c: newC,
				h: targetColor.oklch.h ?? 0,
			});

			const newSimulated = simulateCVD(newColor, visionType);
			const otherSimulated = simulateCVD(otherColor, visionType);
			const newDeltaE = calculateSimpleDeltaE(newSimulated, otherSimulated);

			if (newDeltaE > bestDeltaE) {
				bestDeltaE = newDeltaE;
				bestAdjustment = direction * step;
				bestSuggestedColor = newColor;

				if (newDeltaE >= targetDeltaE) {
					break;
				}
			}
		}

		if (bestDeltaE >= targetDeltaE) {
			break;
		}
	}

	if (!bestSuggestedColor || bestDeltaE <= currentDeltaE) {
		return null;
	}

	return {
		type: "chroma",
		targetColor: targetName,
		originalColor: targetColor,
		suggestedColor: bestSuggestedColor,
		adjustmentAmount: bestAdjustment,
		direction: bestAdjustment > 0 ? "彩度を上げる" : "彩度を下げる",
		expectedImprovement: bestDeltaE - currentDeltaE,
		newDeltaE: bestDeltaE,
	};
}

/**
 * 識別困難な色ペアに対する改善提案を生成する
 *
 * 調整優先順位: Lightness → Hue → Chroma
 *
 * @param result - 識別性検証結果
 * @param options - 改善オプション
 * @returns 改善提案結果
 */
export function generateImprovementSuggestions(
	result: DistinguishabilityResult,
	options: ImprovementOptions = {},
): PairImprovementResult {
	const { maxSuggestions = 3 } = options;

	const [name1, name2] = result.colorPair;
	const [color1, color2] = result.colors;
	const visionType = result.visionType;

	const suggestions: ImprovementSuggestion[] = [];

	// 優先順位順に提案を生成
	// 1. Lightness調整（最も効果的で安全）
	const lightnessSuggestion = suggestLightnessAdjustment(
		color1,
		color2,
		name1,
		name2,
		visionType,
		options,
	);
	if (lightnessSuggestion) {
		suggestions.push(lightnessSuggestion);
	}

	// 2. Hue調整
	const hueSuggestion = suggestHueAdjustment(
		color1,
		color2,
		name1,
		name2,
		visionType,
		options,
	);
	if (hueSuggestion) {
		suggestions.push(hueSuggestion);
	}

	// 3. Chroma調整
	const chromaSuggestion = suggestChromaAdjustment(
		color1,
		color2,
		name1,
		name2,
		visionType,
		options,
	);
	if (chromaSuggestion) {
		suggestions.push(chromaSuggestion);
	}

	// 効果が高い順にソート
	suggestions.sort((a, b) => b.expectedImprovement - a.expectedImprovement);

	// 最大数に制限
	const limitedSuggestions = suggestions.slice(0, maxSuggestions);

	return {
		colorPair: [name1, name2],
		visionType,
		originalDeltaE: result.simulatedDeltaE,
		targetDeltaE: options.targetDeltaE ?? 5.0,
		suggestions: limitedSuggestions,
		isImprovable: limitedSuggestions.length > 0,
	};
}

/**
 * パレット全体の改善提案を生成する
 *
 * @param paletteResult - パレット識別性検証結果
 * @param options - 改善オプション
 * @returns 改善提案結果の配列
 */
export function generatePaletteImprovementSuggestions(
	paletteResult: PaletteDistinguishabilityResult,
	options: ImprovementOptions = {},
): PairImprovementResult[] {
	const results: PairImprovementResult[] = [];

	for (const problematicPair of paletteResult.problematicPairs) {
		const improvement = generateImprovementSuggestions(
			problematicPair,
			options,
		);
		results.push(improvement);
	}

	// 改善効果が高い順にソート
	results.sort((a, b) => {
		const aMaxImprovement = a.suggestions[0]?.expectedImprovement ?? 0;
		const bMaxImprovement = b.suggestions[0]?.expectedImprovement ?? 0;
		return bMaxImprovement - aMaxImprovement;
	});

	return results;
}

/**
 * 改善提案レポートを生成する
 *
 * @param improvements - 改善提案結果の配列
 * @returns レポート文字列
 */
export function generateImprovementReport(
	improvements: PairImprovementResult[],
): string {
	if (improvements.length === 0) {
		return "No improvement suggestions needed - all color pairs are distinguishable!";
	}

	const lines: string[] = ["=== CVD Improvement Suggestions ===", ""];

	for (const improvement of improvements) {
		lines.push(
			`Color Pair: ${improvement.colorPair[0]} - ${improvement.colorPair[1]}`,
		);
		lines.push(`Vision Type: ${improvement.visionType}`);
		lines.push(
			`Current ΔE: ${improvement.originalDeltaE.toFixed(1)} → Target: ${improvement.targetDeltaE.toFixed(1)}`,
		);

		if (improvement.suggestions.length === 0) {
			lines.push("  No effective adjustment found");
		} else {
			lines.push("  Suggestions:");
			for (let i = 0; i < improvement.suggestions.length; i++) {
				const suggestion = improvement.suggestions[i];
				if (!suggestion) continue;
				const priority = i + 1;
				lines.push(
					`    ${priority}. [${suggestion.type.toUpperCase()}] Adjust "${suggestion.targetColor}" ${suggestion.direction}`,
				);
				lines.push(
					`       ${suggestion.originalColor.toHex()} → ${suggestion.suggestedColor.toHex()}`,
				);
				lines.push(
					`       Expected ΔE: ${suggestion.newDeltaE.toFixed(1)} (+${suggestion.expectedImprovement.toFixed(1)})`,
				);
			}
		}
		lines.push("");
	}

	return lines.join("\n");
}

/**
 * CVD検出モジュール
 *
 * 色覚多様性（CVD）に関する検出ロジックを提供する。
 * - 色の衝突検出
 * - CVD混同リスクのあるペア検出
 * - CVDタイプの日本語ラベル
 *
 * @module @/ui/accessibility/cvd-detection
 */

import {
	type CVDType,
	getAllCVDTypes,
	simulateCVD,
} from "@/accessibility/cvd-simulator";
import {
	calculateSimpleDeltaE as calculateDeltaE,
	DISTINGUISHABILITY_THRESHOLD,
} from "@/accessibility/distinguishability";
import type { Color } from "@/core/color";

/**
 * CVD混同リスクのペア情報
 */
export interface CvdConfusionPair {
	/** ペアのインデックス（ソート後配列での位置） */
	index1: number;
	index2: number;
	/** CVDタイプ（全4タイプ対応） */
	cvdType: CVDType;
	/** シミュレーション後のdeltaE（OKLCH、100倍スケール） */
	cvdDeltaE: number;
}

/**
 * 名前付きカラー（CVD検出用）
 */
export interface NamedColorForDetection {
	name: string;
	color: Color;
}

/**
 * 一般色覚で十分に区別可能と判定する閾値（ΔEOK）
 * これ以上離れている色ペアのみCVD混同チェックを実施
 */
const NORMAL_DISTINGUISHABLE_THRESHOLD = DISTINGUISHABILITY_THRESHOLD;

/** CVDタイプの日本語名マッピング */
const cvdTypeLabelsJa: Record<CVDType, string> = {
	protanopia: "P型（1型2色覚）",
	deuteranopia: "D型（2型2色覚）",
	tritanopia: "T型（3型2色覚）",
	achromatopsia: "全色盲",
};

/**
 * CVDタイプを日本語名に変換
 *
 * @param cvdType - CVDタイプ
 * @returns 日本語名
 */
export function getCvdTypeLabelJa(cvdType: CVDType): string {
	return cvdTypeLabelsJa[cvdType];
}

/**
 * 色間の衝突を検出する
 *
 * 指定された閾値よりも小さいΔEを持つ色ペアを検出する。
 * 隣接ペアのみまたは全ペアの検証を選択可能。
 *
 * @param simulatedColors - シミュレーション済みの色配列
 * @param adjacentOnly - trueの場合は隣接ペアのみ、falseの場合は全ペアを検証
 * @param threshold - 衝突判定のΔE閾値
 * @returns 衝突インデックスの配列（境界位置）
 */
export function detectColorConflicts(
	simulatedColors: { name: string; color: Color }[],
	adjacentOnly: boolean,
	threshold: number,
): number[] {
	const conflicts: number[] = [];

	if (adjacentOnly) {
		// 隣接ペアのみ検証（シェード用）
		for (let i = 0; i < simulatedColors.length - 1; i++) {
			const item1 = simulatedColors[i];
			const item2 = simulatedColors[i + 1];
			if (!item1 || !item2) continue;
			const deltaE = calculateDeltaE(item1.color, item2.color);
			if (deltaE < threshold) {
				conflicts.push(i);
			}
		}
	} else {
		// 全ペア検証（キーカラー用）
		for (let i = 0; i < simulatedColors.length; i++) {
			for (let j = i + 1; j < simulatedColors.length; j++) {
				const item1 = simulatedColors[i];
				const item2 = simulatedColors[j];
				if (!item1 || !item2) continue;
				const deltaE = calculateDeltaE(item1.color, item2.color);
				if (deltaE < threshold) {
					// 境界位置で衝突を記録
					if (!conflicts.includes(i)) conflicts.push(i);
					if (!conflicts.includes(j - 1) && j === i + 1) conflicts.push(j - 1);
				}
			}
		}
	}

	return conflicts;
}

/**
 * CVD混同リスクのあるペアを検出する
 *
 * 全CVDタイプ（P型/D型/T型/全色盲）で識別困難なペアを検出。
 * 境界検証と同じΔEOK（OKLabユークリッド距離 × 100）を使用して一貫性を確保。
 *
 * @param colors - 色リスト
 * @returns CVD混同リスクのあるペアのリスト
 */
export function detectCvdConfusionPairs(
	colors: NamedColorForDetection[],
): CvdConfusionPair[] {
	const pairs: CvdConfusionPair[] = [];

	for (let i = 0; i < colors.length; i++) {
		for (let j = i + 1; j < colors.length; j++) {
			const color1 = colors[i];
			const color2 = colors[j];
			if (!color1 || !color2) continue;

			// 一般色覚でのdeltaE（ΔEOK、100倍スケール）
			const normalDeltaE = calculateDeltaE(color1.color, color2.color);

			// 一般色覚で十分に区別可能な場合のみCVDチェック
			// （既に識別困難なペアはCVD関係なく問題）
			if (normalDeltaE >= NORMAL_DISTINGUISHABLE_THRESHOLD) {
				// 全CVDタイプでシミュレーション（P型/D型/T型/全色盲）
				for (const cvdType of getAllCVDTypes()) {
					const sim1 = simulateCVD(color1.color, cvdType);
					const sim2 = simulateCVD(color2.color, cvdType);
					const cvdDeltaE = calculateDeltaE(sim1, sim2);

					// 境界検証と同じ閾値を使用
					if (cvdDeltaE < DISTINGUISHABILITY_THRESHOLD) {
						pairs.push({
							index1: i,
							index2: j,
							cvdType,
							cvdDeltaE,
						});
					}
				}
			}
		}
	}

	return pairs;
}

/**
 * CVDタイプごとにペアをグループ化する
 *
 * @param pairs - CVD混同ペアのリスト
 * @returns CVDタイプでグループ化されたMap
 */
export function groupPairsByCvdType(
	pairs: CvdConfusionPair[],
): Map<CVDType, CvdConfusionPair[]> {
	const grouped = new Map<CVDType, CvdConfusionPair[]>();

	for (const pair of pairs) {
		const existing = grouped.get(pair.cvdType) ?? [];
		existing.push(pair);
		grouped.set(pair.cvdType, existing);
	}

	return grouped;
}

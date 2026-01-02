/**
 * HarmonyFilterService
 * ハーモニーフィルタの適用とソート維持
 *
 * Task 3.2: フィルタ適用とソート維持の実装
 * Requirements: 3.3, 3.4, 6.3
 */

import type { ScoredCandidate } from "./accent-candidate-service";
import {
	calculateCircularDistance,
	getTargetHues,
	type HarmonyFilterType,
	isWithinHarmonyRange,
} from "./harmony-filter-calculator";

/**
 * ハーモニーフィルタ結果 (Requirement 3.4)
 */
export interface HarmonyFilterResult {
	/** フィルタ済み候補（該当あり） */
	candidates: ScoredCandidate[];
	/** 代替候補（フィルタ後0件時のみ、最大3件） */
	alternatives: ScoredCandidate[];
	/** 代替候補を表示中かどうか */
	isShowingAlternatives: boolean;
}

/**
 * デフォルトの代替候補数
 */
const DEFAULT_MAX_ALTERNATIVES = 3;

/**
 * フィルタ0件時の代替候補算出 (Requirement 3.4)
 *
 * @param allCandidates 全候補
 * @param targetHues ターゲット色相配列
 * @param maxCount 最大件数（デフォルト: 3）
 * @returns 最も近い色相の候補
 */
export function findNearestAlternatives(
	allCandidates: ScoredCandidate[],
	targetHues: number[],
	maxCount: number = DEFAULT_MAX_ALTERNATIVES,
): ScoredCandidate[] {
	if (allCandidates.length === 0) {
		return [];
	}

	// ターゲット色相がない場合は先頭からmaxCount件を返す
	if (targetHues.length === 0) {
		return allCandidates.slice(0, maxCount);
	}

	// ターゲット色相からの最小距離でソート
	const sorted = [...allCandidates].sort((a, b) => {
		const aMinDist = Math.min(
			...targetHues.map((t) => calculateCircularDistance(a.hue, t)),
		);
		const bMinDist = Math.min(
			...targetHues.map((t) => calculateCircularDistance(b.hue, t)),
		);
		return aMinDist - bMinDist;
	});

	return sorted.slice(0, maxCount);
}

/**
 * ハーモニーフィルタを適用する（スコア再計算なし）
 * Requirement 3.3: フィルタ後のスコア順ソート維持
 * Requirement 3.4: フィルタ後0件時は代替候補を返す
 * Requirement 6.3: フィルタ時の再計算回避
 *
 * @param candidates 既存候補リスト（スコア計算済み）
 * @param type フィルタタイプ
 * @param brandHue ブランドカラーの色相
 * @returns フィルタ結果
 */
export function filterByHarmonyType(
	candidates: ScoredCandidate[],
	type: HarmonyFilterType,
	brandHue: number,
): HarmonyFilterResult {
	// "all" の場合はフィルタリングをスキップ（早期リターン最適化）
	if (type === "all") {
		return {
			candidates: candidates,
			alternatives: [],
			isShowingAlternatives: false,
		};
	}

	// 空の候補リストの場合
	if (candidates.length === 0) {
		return {
			candidates: [],
			alternatives: [],
			isShowingAlternatives: false,
		};
	}

	// ターゲット色相を取得
	const targetHues = getTargetHues(brandHue, type);

	// フィルタリング（スコア再計算なし）
	const filtered = candidates.filter((c) =>
		isWithinHarmonyRange(c.hue, targetHues),
	);

	// 候補が0件の場合は代替候補を提供 (Requirement 3.4)
	if (filtered.length === 0) {
		return {
			candidates: [],
			alternatives: findNearestAlternatives(
				candidates,
				targetHues,
				DEFAULT_MAX_ALTERNATIVES,
			),
			isShowingAlternatives: true,
		};
	}

	// フィルタ後もスコア順を維持（既にソート済みのため、フィルタ時に順序を変更しない）
	// Requirement 3.3: 元の順序を維持
	return {
		candidates: filtered,
		alternatives: [],
		isShowingAlternatives: false,
	};
}

/**
 * HarmonyPaletteGenerator
 * ハーモニータイプに基づいて3色パレットを生成する
 *
 * Section 8: アクセント選定UI改善
 * - 各ハーモニータイプに対して3色のパレットを生成
 * - 補色: ブランド + 補色（明）+ 補色（暗）
 * - トライアド/類似色/分裂補色: ブランド + 各方向から1色ずつ
 */

import { toOklch } from "../../utils/color-space";
import {
	generateCandidates,
	type ScoredCandidate,
} from "./accent-candidate-service";
import {
	calculateCircularDistance,
	getTargetHues,
	type HarmonyFilterType,
} from "./harmony-filter-calculator";

/**
 * ハーモニーパレット生成結果
 */
export interface HarmonyPaletteResult {
	/** ブランドカラー */
	brandColor: string;
	/** アクセントカラー（常に2色） */
	accentColors: [string, string];
	/** 選定された候補の詳細 */
	candidates: ScoredCandidate[];
	/** ハーモニータイプ */
	harmonyType: HarmonyFilterType;
}

/**
 * ハーモニーパレット生成オプション
 */
export interface HarmonyPaletteOptions {
	/** 背景色（コントラスト計算用） */
	backgroundHex?: string;
}

/**
 * ハーモニーパレット生成結果またはエラー
 */
export type HarmonyPaletteResultOrError =
	| { ok: true; result: HarmonyPaletteResult }
	| { ok: false; error: { code: string; message: string } };

/**
 * 全ハーモニータイプのプレビュー用パレットを取得
 * カード表示用に各タイプの3色を一度に取得
 */
export interface AllHarmonyPalettesResult {
	complementary: HarmonyPaletteResult | null;
	triadic: HarmonyPaletteResult | null;
	analogous: HarmonyPaletteResult | null;
	"split-complementary": HarmonyPaletteResult | null;
}

/**
 * 特定の色相方向に最も近い候補を取得
 *
 * @param candidates 候補リスト
 * @param targetHue ターゲット色相
 * @param range 許容範囲（度）
 * @returns ターゲットに最も近いスコア順の候補
 */
function getCandidatesNearHue(
	candidates: ScoredCandidate[],
	targetHue: number,
	range = 30,
): ScoredCandidate[] {
	return candidates
		.filter((c) => calculateCircularDistance(c.hue, targetHue) <= range)
		.sort((a, b) => b.score.total - a.score.total);
}

/**
 * 補色パレットを生成（明暗バリエーション）
 * ブランド + 補色（明）+ 補色（暗）
 *
 * @param brandColorHex ブランドカラー
 * @param candidates 全候補
 * @returns 3色パレット
 */
function generateComplementaryPalette(
	brandColorHex: string,
	candidates: ScoredCandidate[],
): HarmonyPaletteResult | null {
	const brandOklch = toOklch(brandColorHex);
	if (!brandOklch) return null;

	const brandHue = brandOklch.h ?? 0;
	const targetHues = getTargetHues(brandHue, "complementary");

	const firstTargetHue = targetHues[0];
	if (firstTargetHue === undefined) return null;

	// 補色方向の候補を取得
	const complementaryCandidates = getCandidatesNearHue(
		candidates,
		firstTargetHue,
	);

	if (complementaryCandidates.length === 0) return null;

	// 異なるステップ（明暗）の2色を選定
	// ステップ番号が異なる候補を優先して選択
	const selectedCandidates: ScoredCandidate[] = [];
	const usedSteps = new Set<number>();

	for (const candidate of complementaryCandidates) {
		if (!usedSteps.has(candidate.step)) {
			selectedCandidates.push(candidate);
			usedSteps.add(candidate.step);
			if (selectedCandidates.length >= 2) break;
		}
	}

	// 2色未満の場合は同じ候補から追加
	while (selectedCandidates.length < 2 && complementaryCandidates.length > 0) {
		const next =
			complementaryCandidates[selectedCandidates.length] ??
			complementaryCandidates[0];
		if (next) {
			selectedCandidates.push(next);
		} else {
			break;
		}
	}

	if (selectedCandidates.length < 2) return null;

	// 明度順にソート（明るい方を先に）
	selectedCandidates.sort((a, b) => {
		const aOklch = toOklch(a.hex);
		const bOklch = toOklch(b.hex);
		return (bOklch?.l ?? 0) - (aOklch?.l ?? 0);
	});

	const first = selectedCandidates[0];
	const second = selectedCandidates[1];
	if (!first || !second) return null;

	return {
		brandColor: brandColorHex,
		accentColors: [first.hex, second.hex],
		candidates: selectedCandidates,
		harmonyType: "complementary",
	};
}

/**
 * 複数方向パレットを生成（トライアド/類似色/分裂補色）
 * 各方向から最高スコアの1色ずつ選定
 *
 * @param brandColorHex ブランドカラー
 * @param candidates 全候補
 * @param harmonyType ハーモニータイプ
 * @returns 3色パレット
 */
function generateMultiDirectionPalette(
	brandColorHex: string,
	candidates: ScoredCandidate[],
	harmonyType: Exclude<HarmonyFilterType, "all" | "complementary">,
): HarmonyPaletteResult | null {
	const brandOklch = toOklch(brandColorHex);
	if (!brandOklch) return null;

	const brandHue = brandOklch.h ?? 0;
	const targetHues = getTargetHues(brandHue, harmonyType);

	if (targetHues.length < 2) return null;

	// 各方向から最高スコアの1色を選定
	const selectedCandidates: ScoredCandidate[] = [];

	for (const targetHue of targetHues) {
		const directionCandidates = getCandidatesNearHue(candidates, targetHue);
		const firstCandidate = directionCandidates[0];
		if (firstCandidate) {
			selectedCandidates.push(firstCandidate);
		}
	}

	// 2色未満の場合はエラー
	if (selectedCandidates.length < 2) return null;

	const first = selectedCandidates[0];
	const second = selectedCandidates[1];
	if (!first || !second) return null;

	return {
		brandColor: brandColorHex,
		accentColors: [first.hex, second.hex],
		candidates: selectedCandidates,
		harmonyType,
	};
}

/**
 * 指定されたハーモニータイプで3色パレットを生成
 *
 * @param brandColorHex ブランドカラー
 * @param harmonyType ハーモニータイプ（"all"は無効）
 * @param options オプション
 * @returns パレット生成結果
 */
export async function getHarmonyPaletteColors(
	brandColorHex: string,
	harmonyType: HarmonyFilterType,
	options?: HarmonyPaletteOptions,
): Promise<HarmonyPaletteResultOrError> {
	// "all" は無効
	if (harmonyType === "all") {
		return {
			ok: false,
			error: {
				code: "INVALID_HARMONY_TYPE",
				message: '"all" はパレット生成に使用できません',
			},
		};
	}

	// 全候補を取得
	const candidatesResult = await generateCandidates(brandColorHex, {
		backgroundHex: options?.backgroundHex,
		limit: 130, // 全候補を取得
	});

	if (!candidatesResult.ok) {
		return {
			ok: false,
			error: candidatesResult.error,
		};
	}

	const candidates = candidatesResult.result.candidates;

	// ハーモニータイプに応じてパレットを生成
	let palette: HarmonyPaletteResult | null = null;

	switch (harmonyType) {
		case "complementary":
			palette = generateComplementaryPalette(brandColorHex, candidates);
			break;
		case "triadic":
		case "analogous":
		case "split-complementary":
			palette = generateMultiDirectionPalette(
				brandColorHex,
				candidates,
				harmonyType,
			);
			break;
	}

	if (!palette) {
		return {
			ok: false,
			error: {
				code: "PALETTE_GENERATION_FAILED",
				message: "パレット生成に失敗しました",
			},
		};
	}

	return { ok: true, result: palette };
}

/**
 * 全ハーモニータイプのプレビュー用パレットを取得
 * カード表示用に各タイプの3色を一度に取得
 *
 * @param brandColorHex ブランドカラー
 * @param options オプション
 * @returns 全ハーモニータイプのパレット
 */
export async function getAllHarmonyPalettes(
	brandColorHex: string,
	options?: HarmonyPaletteOptions,
): Promise<{
	ok: boolean;
	result?: AllHarmonyPalettesResult;
	error?: { code: string; message: string };
}> {
	// 全候補を一度だけ取得
	const candidatesResult = await generateCandidates(brandColorHex, {
		backgroundHex: options?.backgroundHex,
		limit: 130,
	});

	if (!candidatesResult.ok) {
		return {
			ok: false,
			error: candidatesResult.error,
		};
	}

	const candidates = candidatesResult.result.candidates;

	// 各ハーモニータイプのパレットを生成
	const result: AllHarmonyPalettesResult = {
		complementary: generateComplementaryPalette(brandColorHex, candidates),
		triadic: generateMultiDirectionPalette(
			brandColorHex,
			candidates,
			"triadic",
		),
		analogous: generateMultiDirectionPalette(
			brandColorHex,
			candidates,
			"analogous",
		),
		"split-complementary": generateMultiDirectionPalette(
			brandColorHex,
			candidates,
			"split-complementary",
		),
	};

	return { ok: true, result };
}

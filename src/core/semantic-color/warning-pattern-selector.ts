/**
 * Warning Pattern Selector
 *
 * 警告色パターン（黄色系/オレンジ系）のCUD分析に基づく自動選択
 * Error（赤）、Success（緑）との識別性を考慮して最適なパターンを推奨
 *
 * @module @/core/semantic-color/warning-pattern-selector
 */

import { calculateHarmonyScore } from "@/core/cud/harmony-score";
import {
	getDadsColorsByHue,
	loadDadsTokens,
} from "@/core/tokens/dads-data-provider";
import { deltaEok, toOklab } from "@/utils/color-space";

/**
 * パターンごとのスコア詳細
 */
export interface WarningPatternScoreDetails {
	/** Error色（赤）との識別性 deltaE */
	deltaEFromError: number;
	/** Success色（緑）との識別性 deltaE */
	deltaEFromSuccess: number;
	/** 正規化された識別性スコア（0-100） */
	distinguishabilityScore: number;
	/** ハーモニースコア（0-100） */
	harmonyScore: number;
}

/**
 * パターンスコア
 */
export interface WarningPatternScore {
	/** パターン種別 */
	pattern: "yellow" | "orange";
	/** 総合スコア（0-100） */
	score: number;
	/** 詳細 */
	details: WarningPatternScoreDetails;
}

/**
 * 警告パターン分析結果
 */
export interface WarningPatternAnalysis {
	/** 推奨パターン */
	recommended: "yellow" | "orange";
	/** 黄色パターンのスコア */
	yellowScore: WarningPatternScore;
	/** オレンジパターンのスコア */
	orangeScore: WarningPatternScore;
	/** 推奨理由 */
	reason: string;
}

/**
 * 自動選択アルゴリズムの重み設定
 *
 * 識別性を重視し、Error/Successとの区別を優先
 */
const AUTO_SELECTION_WEIGHTS = {
	/** Error色との識別性（最重要） */
	deltaEFromError: 0.4,
	/** Success色との識別性 */
	deltaEFromSuccess: 0.3,
	/** パレット全体との調和 */
	harmony: 0.3,
} as const;

/**
 * セマンティックカラーのDADSマッピング定義
 */
const SEMANTIC_DADS_MAPPING = {
	error: { hue: "red" as const, step: 800 },
	success: { hue: "green" as const, step: 600 },
	warningYellow: { hue: "yellow" as const, step: 700 },
	warningOrange: { hue: "orange" as const, step: 600 },
} as const;

/**
 * deltaEを0-100スコアに正規化
 *
 * deltaE 0.12以上で満点（CUD基準のOff zone以上で十分な識別性）
 *
 * @param deltaE - 色差
 * @returns 正規化スコア（0-100）
 */
function normalizeDeltaEToScore(deltaE: number): number {
	// CUD zone基準: Safe ≤0.05, Warning ≤0.12, Off >0.12
	// 0.12以上で100点とする
	const maxDeltaE = 0.15;
	const score = Math.min(100, (deltaE / maxDeltaE) * 100);
	return Math.round(score * 10) / 10;
}

/**
 * パターンのスコアを計算
 *
 * @param warningHex - 警告色のHEX値
 * @param errorHex - Error色のHEX値
 * @param successHex - Success色のHEX値
 * @param anchorHex - アンカーカラー（ブランドカラー）のHEX値
 * @param paletteHexes - パレット全体のHEX値配列
 * @param pattern - パターン種別
 * @returns パターンスコア
 */
function calculatePatternScore(
	warningHex: string,
	errorHex: string,
	successHex: string,
	anchorHex: string,
	paletteHexes: string[],
	pattern: "yellow" | "orange",
): WarningPatternScore {
	// OKLab色空間で色差を計算
	const warningOklab = toOklab(warningHex);
	const errorOklab = toOklab(errorHex);
	const successOklab = toOklab(successHex);

	if (!warningOklab || !errorOklab || !successOklab) {
		// 変換失敗時はデフォルトスコア
		return {
			pattern,
			score: 50,
			details: {
				deltaEFromError: 0,
				deltaEFromSuccess: 0,
				distinguishabilityScore: 50,
				harmonyScore: 50,
			},
		};
	}

	// deltaE計算
	const deltaEFromError = deltaEok(warningOklab, errorOklab);
	const deltaEFromSuccess = deltaEok(warningOklab, successOklab);

	// 識別性スコア（Error/Successの平均）
	const errorScore = normalizeDeltaEToScore(deltaEFromError);
	const successScore = normalizeDeltaEToScore(deltaEFromSuccess);
	const distinguishabilityScore = (errorScore + successScore) / 2;

	// ハーモニースコア（パレットが空でなければ計算）
	let harmonyScore = 50;
	const allColors = [warningHex, ...paletteHexes].filter(Boolean);
	if (allColors.length > 0) {
		try {
			const harmonyResult = calculateHarmonyScore(anchorHex, allColors);
			harmonyScore = harmonyResult.total;
		} catch {
			// エラー時は中間値
			harmonyScore = 50;
		}
	}

	// 加重スコア計算
	const weightedErrorScore =
		normalizeDeltaEToScore(deltaEFromError) *
		AUTO_SELECTION_WEIGHTS.deltaEFromError;
	const weightedSuccessScore =
		normalizeDeltaEToScore(deltaEFromSuccess) *
		AUTO_SELECTION_WEIGHTS.deltaEFromSuccess;
	const weightedHarmonyScore = harmonyScore * AUTO_SELECTION_WEIGHTS.harmony;

	const totalScore =
		weightedErrorScore + weightedSuccessScore + weightedHarmonyScore;

	return {
		pattern,
		score: Math.round(totalScore * 10) / 10,
		details: {
			deltaEFromError: Math.round(deltaEFromError * 1000) / 1000,
			deltaEFromSuccess: Math.round(deltaEFromSuccess * 1000) / 1000,
			distinguishabilityScore: Math.round(distinguishabilityScore * 10) / 10,
			harmonyScore: Math.round(harmonyScore * 10) / 10,
		},
	};
}

/**
 * 推奨理由テキストを生成
 *
 * @param yellowScore - 黄色パターンのスコア
 * @param orangeScore - オレンジパターンのスコア
 * @param recommended - 推奨パターン
 * @returns 推奨理由
 */
function generateReasonText(
	yellowScore: WarningPatternScore,
	orangeScore: WarningPatternScore,
	recommended: "yellow" | "orange",
): string {
	const winner = recommended === "yellow" ? yellowScore : orangeScore;
	const loser = recommended === "yellow" ? orangeScore : yellowScore;
	const patternName = recommended === "yellow" ? "黄色" : "オレンジ";

	// スコア差が大きい場合の理由
	const scoreDiff = winner.score - loser.score;
	if (scoreDiff > 10) {
		// 識別性で大きな差がある場合
		if (winner.details.deltaEFromError > loser.details.deltaEFromError + 0.02) {
			return `${patternName}パターンはエラー色との識別性が高いため推奨`;
		}
		if (
			winner.details.deltaEFromSuccess >
			loser.details.deltaEFromSuccess + 0.02
		) {
			return `${patternName}パターンは成功色との識別性が高いため推奨`;
		}
		if (winner.details.harmonyScore > loser.details.harmonyScore + 5) {
			return `${patternName}パターンはパレット全体との調和が良いため推奨`;
		}
	}

	// デフォルトの理由
	return `CUD分析に基づき${patternName}パターンを推奨（スコア: ${winner.score}）`;
}

/**
 * 警告色パターンを分析し、最適なパターンを推奨する
 *
 * DADSトークンからError、Success、Warning色を取得し、
 * CUD識別性とハーモニースコアに基づいて最適な警告パターンを判定
 *
 * @param anchorHex - アンカーカラー（ブランドカラー）のHEX値
 * @param paletteHexes - パレット全体のHEX値配列
 * @returns 分析結果
 *
 * @example
 * ```ts
 * const analysis = await analyzeWarningPatterns("#0066CC", ["#FF9900", "#35A16B"]);
 * console.log(analysis.recommended); // "yellow" or "orange"
 * console.log(analysis.reason); // "黄色パターンはエラー色との識別性が高いため推奨"
 * ```
 */
export async function analyzeWarningPatterns(
	anchorHex: string,
	paletteHexes: string[],
): Promise<WarningPatternAnalysis> {
	// DADSトークン読み込み
	const tokens = await loadDadsTokens();

	// セマンティックカラー取得
	const redScale = getDadsColorsByHue(tokens, SEMANTIC_DADS_MAPPING.error.hue);
	const greenScale = getDadsColorsByHue(
		tokens,
		SEMANTIC_DADS_MAPPING.success.hue,
	);
	const yellowScale = getDadsColorsByHue(
		tokens,
		SEMANTIC_DADS_MAPPING.warningYellow.hue,
	);
	const orangeScale = getDadsColorsByHue(
		tokens,
		SEMANTIC_DADS_MAPPING.warningOrange.hue,
	);

	// 各色のHEX取得
	const errorHex =
		redScale.colors.find((c) => c.scale === SEMANTIC_DADS_MAPPING.error.step)
			?.hex || "#c1272d";
	const successHex =
		greenScale.colors.find(
			(c) => c.scale === SEMANTIC_DADS_MAPPING.success.step,
		)?.hex || "#008000";
	const yellowWarningHex =
		yellowScale.colors.find(
			(c) => c.scale === SEMANTIC_DADS_MAPPING.warningYellow.step,
		)?.hex || "#ffd700";
	const orangeWarningHex =
		orangeScale.colors.find(
			(c) => c.scale === SEMANTIC_DADS_MAPPING.warningOrange.step,
		)?.hex || "#ff8c00";

	// 有効なアンカーカラーを使用（空の場合はデフォルト）
	const validAnchorHex = anchorHex || "#000000";
	const validPaletteHexes = paletteHexes.filter(Boolean);

	// 各パターンのスコア計算
	const yellowScore = calculatePatternScore(
		yellowWarningHex,
		errorHex,
		successHex,
		validAnchorHex,
		validPaletteHexes,
		"yellow",
	);

	const orangeScore = calculatePatternScore(
		orangeWarningHex,
		errorHex,
		successHex,
		validAnchorHex,
		validPaletteHexes,
		"orange",
	);

	// 推奨パターン決定
	const recommended: "yellow" | "orange" =
		yellowScore.score >= orangeScore.score ? "yellow" : "orange";

	// 理由生成
	const reason = generateReasonText(yellowScore, orangeScore, recommended);

	return {
		recommended,
		yellowScore,
		orangeScore,
		reason,
	};
}

/**
 * 現在のパレット状態に基づいて警告パターンを自動選択する
 *
 * analyzeWarningPatternsのラッパー関数。
 * 結果のrecommendedを返す。
 *
 * @param anchorHex - アンカーカラー
 * @param paletteHexes - パレット色配列
 * @returns 推奨パターン
 */
export async function autoSelectWarningPattern(
	anchorHex: string,
	paletteHexes: string[],
): Promise<"yellow" | "orange"> {
	const analysis = await analyzeWarningPatterns(anchorHex, paletteHexes);
	return analysis.recommended;
}

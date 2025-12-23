/**
 * CUD Optimizer
 * CUD距離と調和スコアを最適化する貪欲法アルゴリズム
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import type { DadsReference } from "../tokens/types";
import type { AnchorColorState } from "./anchor";
import type { CudColor } from "./colors";
import {
	calculateHarmonyScore,
	type HarmonyScoreResult,
} from "./harmony-score";
import { findNearestCudColor } from "./service";
import { type SoftSnapResult, softSnapToCudColor } from "./snapper";
import { type CudZone, classifyZone, type ZoneThresholds } from "./zone";

/**
 * デフォルトのλ（重み係数）
 * Requirement 3.3: λはモードに応じて調整可能
 */
export const DEFAULT_LAMBDA = 0.5;

/**
 * デフォルトの戻り係数
 */
const DEFAULT_RETURN_FACTOR = 0.5;

/**
 * deltaEを3桁の小数点でフォーマット
 */
const formatDeltaE = (deltaE: number): string => deltaE.toFixed(3);

/**
 * 最適化オプション
 * Requirement 3.3: モード別処理
 */
export interface OptimizationOptions {
	/** CUD/Harmony重み係数（0-1, 高いほどCUD優先） */
	lambda: number;
	/** CUDモード */
	mode: "soft" | "strict";
	/** ゾーン閾値（オプション） */
	zoneThresholds?: Partial<ZoneThresholds>;
	/** Soft Snap戻り係数（0-1, デフォルト: 0.5） */
	returnFactor?: number;
}

/**
 * ブランドトークン参照情報
 * Requirement 8.1, 8.2: brandTokenプロパティにsuggestedIdとdadsReferenceを含める
 */
export interface BrandTokenReference {
	/** 推奨されるトークンID */
	suggestedId: string;
	/** DADS参照情報 */
	dadsReference: DadsReference;
}

/**
 * 最適化された色
 * Requirement 3.5: 各色の最適化結果
 * Requirement 8.1, 8.2, 8.3: brandToken情報を追加（後方互換性維持）
 */
export interface OptimizedColor {
	/** 最適化後のHEX */
	hex: string;
	/** 元のHEX */
	originalHex: string;
	/** ゾーン判定 */
	zone: CudZone;
	/** CUD推奨色との距離 */
	deltaE: number;
	/** スナップ適用有無 */
	snapped: boolean;
	/** スナップ先CUD色情報（スナップ時） */
	cudTarget?: CudColor;
	/** ブランドトークン参照情報（Task 3.2追加） */
	brandToken?: BrandTokenReference;
}

/**
 * Off Zone色の代替候補
 * Requirement 3.6: Off Zone色が残る場合の代替候補提案
 */
export interface AlternativeSuggestion {
	/** 元のHEX（Off Zone色） */
	originalHex: string;
	/** 提案されるCUD推奨色のHEX */
	suggestedHex: string;
	/** 提案されるCUD色情報 */
	suggestedCudColor: CudColor;
	/** 提案理由 */
	reason: string;
}

/**
 * 最適化結果
 * Requirement 3.5: 目的関数値とCUD準拠率を結果に含める
 * Requirement 3.6: Off Zone色が残る場合の警告と代替候補提案
 */
export interface OptimizationResult {
	/** 最適化されたパレット */
	palette: OptimizedColor[];
	/** 目的関数値 */
	objectiveValue: number;
	/** CUD準拠率（Safe+Warning色の割合、0-100%） */
	cudComplianceRate: number;
	/** 調和スコア */
	harmonyScore: HarmonyScoreResult;
	/** 処理時間（ms） */
	processingTimeMs: number;
	/** 警告メッセージ（Off Zone色がある場合） - Requirement 3.6 */
	warnings: string[];
	/** Off Zone色に対する代替候補 - Requirement 3.6 */
	alternatives: AlternativeSuggestion[];
	/** Off Zone色の数 - Requirement 3.6 */
	offZoneCount: number;
}

/**
 * HEX値を正規化（大文字、#付き）
 */
const normalizeHex = (hex: string): string => {
	let normalized = hex.trim().toUpperCase();
	if (!normalized.startsWith("#")) {
		normalized = `#${normalized}`;
	}
	return normalized;
};

/**
 * インデックスからsuggestedIdを生成
 * 単純な番号ベースのID生成（将来のIdGenerator統合用）
 */
const generateSuggestedId = (index: number): string => {
	return `brand-color-${index + 1}`;
};

/**
 * Snapperのderivation情報からDadsReferenceを作成
 * Requirement 8.3: Snapper derivation → dadsReference変換
 */
const createDadsReferenceFromSnapResult = (
	snapResult: SoftSnapResult,
): DadsReference => {
	return {
		tokenId: snapResult.derivation.dadsTokenId,
		tokenHex: snapResult.derivation.dadsTokenHex,
		deltaE: snapResult.deltaE,
		derivationType: snapResult.derivation.type,
		zone: snapResult.zone,
	};
};

/**
 * BrandTokenReferenceを作成
 * Requirement 8.1, 8.2: suggestedIdとdadsReferenceを含む
 */
const createBrandTokenReference = (
	snapResult: SoftSnapResult,
	index: number,
): BrandTokenReference => {
	return {
		suggestedId: generateSuggestedId(index),
		dadsReference: createDadsReferenceFromSnapResult(snapResult),
	};
};

/**
 * 目的関数値を計算する
 * Requirement 3.3: 目的関数 = Σ(CUD距離) + λ × (1 - 調和スコア/100)
 *
 * @param palette - 最適化されたパレット
 * @param harmonyScore - 調和スコア（0-100）
 * @param lambda - 重み係数（0-1）
 * @returns 目的関数値（低いほど良い）
 *
 * @example
 * ```ts
 * const palette = [
 *   { hex: "#FF2800", deltaE: 0.0, ... },
 *   { hex: "#35A16B", deltaE: 0.0, ... },
 * ];
 * calculateObjective(palette, 80, 0.5);
 * // => 0.1 (= 0.0 + 0.5 × (1 - 0.8))
 * ```
 */
export const calculateObjective = (
	palette: OptimizedColor[],
	harmonyScore: number,
	lambda: number,
): number => {
	// Σ(CUD距離)
	const totalDeltaE = palette.reduce((sum, color) => sum + color.deltaE, 0);

	// λ × (1 - 調和スコア/100)
	const harmonyPenalty = lambda * (1 - harmonyScore / 100);

	return totalDeltaE + harmonyPenalty;
};

/**
 * CUD準拠率を計算する
 * Requirement 3.5: CUD準拠率を結果に含める
 *
 * @param palette - 最適化されたパレット
 * @returns CUD準拠率（0-100%）
 */
const calculateCudComplianceRate = (palette: OptimizedColor[]): number => {
	if (palette.length === 0) {
		return 0;
	}

	// Safe + Warning = 準拠
	const compliantCount = palette.filter(
		(color) => color.zone === "safe" || color.zone === "warning",
	).length;

	return (compliantCount / palette.length) * 100;
};

/**
 * Off Zone色を抽出する
 * @param palette - 最適化されたパレット
 * @returns Off Zone色の配列
 */
const getOffZoneColors = (palette: OptimizedColor[]): OptimizedColor[] => {
	return palette.filter((color) => color.zone === "off");
};

/**
 * Off Zone色に対する警告メッセージを生成する
 * Requirement 3.6: Off Zone色が残る場合の警告表示
 *
 * @param offZoneColors - Off Zone色の配列
 * @returns 警告メッセージの配列
 */
const generateWarnings = (offZoneColors: OptimizedColor[]): string[] => {
	if (offZoneColors.length === 0) {
		return [];
	}

	const warnings: string[] = [];

	// 全体の警告
	warnings.push(
		`CUD非準拠の色が${offZoneColors.length}色あります。代替候補の使用を検討してください。`,
	);

	// 個別の色に対する警告
	for (const color of offZoneColors) {
		warnings.push(
			`${color.originalHex}: Off Zone (ΔE=${formatDeltaE(color.deltaE)}) - CUD推奨色への変更を推奨`,
		);
	}

	return warnings;
};

/**
 * Off Zone色に対する代替候補を生成する
 * Requirement 3.6: 代替候補を提案する
 *
 * @param offZoneColors - Off Zone色の配列
 * @returns 代替候補の配列
 */
const generateAlternatives = (
	offZoneColors: OptimizedColor[],
): AlternativeSuggestion[] => {
	return offZoneColors.map((color) => {
		// cudTargetがある場合はそれを使用、なければ再検索
		const cudTarget =
			color.cudTarget ?? findNearestCudColor(color.originalHex).nearest;

		return {
			originalHex: color.originalHex,
			suggestedHex: cudTarget.hex,
			suggestedCudColor: cudTarget,
			reason: `最も近いCUD推奨色「${cudTarget.nameJa}」への変更を推奨します（ΔE=${formatDeltaE(color.deltaE)}）`,
		};
	});
};

/**
 * Softモードで色を最適化する
 * Requirement 3.4: Safe Zoneからの色選択を優先し、不足時はWarning Zoneから補充
 * Requirement 8.1, 8.2, 8.3: brandToken情報を追加
 */
const optimizeColorSoft = (
	hex: string,
	options: OptimizationOptions,
	index: number,
): OptimizedColor => {
	const { zoneThresholds, returnFactor = DEFAULT_RETURN_FACTOR } = options;
	const normalizedHex = normalizeHex(hex);

	// Soft Snapを適用
	const snapResult = softSnapToCudColor(normalizedHex, {
		mode: "soft",
		returnFactor,
		zoneThresholds,
	});

	return {
		hex: snapResult.hex,
		originalHex: snapResult.originalHex,
		zone: snapResult.zone,
		deltaE: snapResult.deltaE,
		snapped: snapResult.snapped,
		cudTarget: snapResult.cudColor,
		brandToken: createBrandTokenReference(snapResult, index),
	};
};

/**
 * Strictモードで色を最適化する
 * Requirement 3.3: Strictは完全スナップ
 * Requirement 8.1, 8.2, 8.3: brandToken情報を追加
 */
const optimizeColorStrict = (
	hex: string,
	options: OptimizationOptions,
	index: number,
): OptimizedColor => {
	const { zoneThresholds } = options;
	const normalizedHex = normalizeHex(hex);

	// Strictスナップを適用（SoftSnapResultを使用してderivation情報を取得）
	const snapResult = softSnapToCudColor(normalizedHex, {
		mode: "strict",
		zoneThresholds,
	});

	// ゾーン判定（スナップ前の色に対して）
	const nearest = findNearestCudColor(normalizedHex);
	const zone = classifyZone(nearest.deltaE, zoneThresholds);

	return {
		hex: snapResult.hex,
		originalHex: snapResult.originalHex,
		zone,
		deltaE: snapResult.deltaE,
		snapped: true,
		cudTarget: snapResult.cudColor,
		brandToken: createBrandTokenReference(snapResult, index),
	};
};

/**
 * パレットをCUD最適化する
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 *
 * @param candidates - 候補色の配列（HEX値）
 * @param anchor - アンカーカラー状態
 * @param options - 最適化オプション
 * @returns 最適化結果
 * @throws パレットが空の場合
 *
 * @example
 * ```ts
 * const anchor = createAnchorColor("#FF2800");
 * const candidates = ["#FF2800", "#35A16B", "#0041FF"];
 * const result = optimizePalette(candidates, anchor, {
 *   lambda: 0.5,
 *   mode: "soft",
 * });
 * // => { palette: [...], objectiveValue: 0.1, cudComplianceRate: 100, ... }
 * ```
 */
export const optimizePalette = (
	candidates: string[],
	anchor: AnchorColorState,
	options: OptimizationOptions,
): OptimizationResult => {
	// 開始時間を記録
	const startTime = performance.now();

	// 空パレットチェック
	if (candidates.length === 0) {
		throw new Error("Candidates must contain at least one color");
	}

	const { mode, lambda } = options;

	// 各色を最適化（indexを渡してbrandToken.suggestedId生成に使用）
	const optimizedPalette: OptimizedColor[] = candidates.map((hex, index) => {
		if (mode === "strict") {
			return optimizeColorStrict(hex, options, index);
		}
		return optimizeColorSoft(hex, options, index);
	});

	// 最適化後のHEX配列を取得
	const optimizedHexes = optimizedPalette.map((c) => c.hex);

	// 調和スコアを計算
	const harmonyScore = calculateHarmonyScore(
		anchor.effectiveHex,
		optimizedHexes,
	);

	// 目的関数値を計算
	const objectiveValue = calculateObjective(
		optimizedPalette,
		harmonyScore.total,
		lambda,
	);

	// CUD準拠率を計算
	const cudComplianceRate = calculateCudComplianceRate(optimizedPalette);

	// Off Zone色を抽出（Requirement 3.6）
	// Strictモードでは全てスナップされるのでOff Zone色はない
	const offZoneColors =
		mode === "strict" ? [] : getOffZoneColors(optimizedPalette);

	// 警告と代替候補を生成（Requirement 3.6）
	const warnings = generateWarnings(offZoneColors);
	const alternatives = generateAlternatives(offZoneColors);
	const offZoneCount = offZoneColors.length;

	// 終了時間を記録
	const endTime = performance.now();
	const processingTimeMs = endTime - startTime;

	return {
		palette: optimizedPalette,
		objectiveValue,
		cudComplianceRate,
		harmonyScore,
		processingTimeMs,
		warnings,
		alternatives,
		offZoneCount,
	};
};

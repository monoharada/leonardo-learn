/**
 * CUD パレットサービス
 * CUD推奨配色セット ver.4 の検索・取得API
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 9.1, 9.2, 9.3
 */

import { deltaEok, toOklab } from "../../utils/color-space";
import { generateBrandTokenId } from "../tokens/id-generator";
import type { BrandToken, DadsReference, DadsToken } from "../tokens/types";
import { createAnchorColor } from "./anchor";
import {
	CUD_ACCENT_COLORS,
	CUD_BASE_COLORS,
	CUD_COLOR_SET,
	CUD_NEUTRAL_COLORS,
	type CudColor,
	type CudGroup,
} from "./colors";
import type { HarmonyScoreResult } from "./harmony-score";
import { type OptimizedColor, optimizePalette } from "./optimizer";

/**
 * マッチレベル
 * - exact: 完全一致または非常に近い（deltaE ≤ 0.03）- CUD推奨色として扱う
 * - near: 近い色（0.03 < deltaE ≤ 0.10）- 参考情報レベル
 * - moderate: やや離れている（0.10 < deltaE ≤ 0.20）- 警告レベル
 * - off: 離れている（deltaE > 0.20）- 警告レベル（強調）
 */
export type MatchLevel = "exact" | "near" | "moderate" | "off";

/**
 * CUD色検索結果
 */
export interface CudSearchResult {
	/** 最も近いCUD色 */
	nearest: CudColor;
	/** deltaE（色差）*/
	deltaE: number;
	/** マッチレベル */
	matchLevel: MatchLevel;
}

/**
 * deltaEの閾値
 * - exact: 完全一致相当（≤ 0.03）
 * - near: 近い色（0.03 < x ≤ 0.10）- 参考情報として表示
 * - moderate: やや離れている（0.10 < x ≤ 0.20）- 警告として表示
 * - off: 離れている（> 0.20）- 警告として表示（強調）
 */
const DELTA_E_THRESHOLDS = {
	exact: 0.03,
	near: 0.1,
	moderate: 0.2,
} as const;

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
 * 全20色を取得する
 * Requirement 2.1: 全20色を取得する関数
 *
 * @returns 全CUD色の配列（readonly）
 */
export const getCudColorSet = (): readonly CudColor[] => {
	return CUD_COLOR_SET;
};

/**
 * グループ別にCUD色を取得する
 * Requirement 2.2: グループ別にフィルタリングする関数
 *
 * @param group - カラーグループ（accent, base, neutral）
 * @returns 指定グループのCUD色配列（readonly）
 */
export const getCudColorsByGroup = (group: CudGroup): readonly CudColor[] => {
	switch (group) {
		case "accent":
			return CUD_ACCENT_COLORS;
		case "base":
			return CUD_BASE_COLORS;
		case "neutral":
			return CUD_NEUTRAL_COLORS;
	}
};

/**
 * HEXでCUD色との完全一致を判定する
 * Requirement 2.3, 2.5: 完全一致検索
 *
 * @param hex - 検索するHEX値（#付き/なし、大文字/小文字どちらも可）
 * @returns 一致するCUD色、またはnull
 */
export const findExactCudColorByHex = (hex: string): CudColor | null => {
	const normalizedHex = normalizeHex(hex);
	return CUD_COLOR_SET.find((color) => color.hex === normalizedHex) ?? null;
};

/**
 * 最も近いCUD色を検索する
 * Requirement 2.4, 2.6: 最近接色検索
 *
 * @param hex - 検索するHEX値（#付き/なし、大文字/小文字どちらも可）
 * @returns 検索結果（nearest, deltaE, matchLevel）
 */
export const findNearestCudColor = (hex: string): CudSearchResult => {
	const normalizedHex = normalizeHex(hex);

	// 入力色をOKLabに変換
	const inputOklab = toOklab(normalizedHex);
	if (!inputOklab) {
		throw new Error(`Invalid hex color: ${hex}`);
	}

	// 全CUD色との距離を計算
	let minDeltaE = Number.POSITIVE_INFINITY;
	let nearestColor: CudColor | undefined;

	for (const cudColor of CUD_COLOR_SET) {
		// CudColorのoklabをculori互換の形式に変換
		const cudOklab = { mode: "oklab" as const, ...cudColor.oklab };
		const deltaE = deltaEok(inputOklab, cudOklab);
		if (deltaE < minDeltaE) {
			minDeltaE = deltaE;
			nearestColor = cudColor;
		}
	}

	// CUD_COLOR_SETは常に20色あるので、nearestColorは必ず設定される
	if (!nearestColor) {
		throw new Error("CUD_COLOR_SET is empty");
	}

	// マッチレベルを判定
	let matchLevel: MatchLevel;
	if (minDeltaE <= DELTA_E_THRESHOLDS.exact) {
		matchLevel = "exact";
	} else if (minDeltaE <= DELTA_E_THRESHOLDS.near) {
		matchLevel = "near";
	} else if (minDeltaE <= DELTA_E_THRESHOLDS.moderate) {
		matchLevel = "moderate";
	} else {
		matchLevel = "off";
	}

	return {
		nearest: nearestColor,
		deltaE: minDeltaE,
		matchLevel,
	};
};

// ============================================================================
// タスク4.1: processPaletteWithModeのv2対応
// Requirements: 9.1, 9.2, 9.3
// ============================================================================

/**
 * API バージョン
 * Requirement 9.1
 */
export type ApiVersion = "v1" | "v2";

/**
 * CUD互換モード（soft/strict）
 */
export type CudCompatibilityMode = "soft" | "strict";

/**
 * アンカー指定
 * Requirement 9.4
 */
export interface AnchorSpecification {
	/** アンカーカラー（HEX） */
	anchorHex?: string;
	/** アンカーのインデックス */
	anchorIndex?: number;
	/** 固定フラグ（false指定時は警告を出力してtrueとして扱う） */
	isFixed?: boolean;
}

/**
 * パレット生成コンテキスト
 * Requirement 9.6
 */
export interface PaletteGenerationContext {
	/** 名前空間（IDに含まれる） */
	namespace?: string;
	/** 既存のID（重複回避用） */
	usedIds?: Set<string>;
	/** ロール名配列（ID生成に使用） */
	roles?: string[];
}

/**
 * パレット処理オプション
 * Requirements: 9.1, 9.4, 9.5, 9.6
 */
export interface ProcessPaletteOptions {
	/** CUDモード（soft/strict） */
	mode: CudCompatibilityMode;
	/** APIバージョン（v1/v2, デフォルト: v1） */
	apiVersion?: ApiVersion;
	/** λ（重み係数） */
	lambda?: number;
	/** Soft Snap戻り係数 */
	returnFactor?: number;
	/** アンカーカラー（HEX）- 後方互換性のため維持 */
	anchorHex?: string;
	/** アンカー指定（Requirement 9.4） */
	anchor?: AnchorSpecification;
	/** 生成コンテキスト（Requirement 9.6） */
	generationContext?: PaletteGenerationContext;
}

/**
 * v1 API結果
 * Requirement 9.2
 */
export interface ProcessPaletteResultV1 {
	/** 最適化されたパレット */
	palette: OptimizedColor[];
	/** CUD準拠率 */
	cudComplianceRate: number;
	/** 調和スコア */
	harmonyScore: HarmonyScoreResult;
	/** 警告メッセージ */
	warnings: string[];
}

/**
 * v2 API結果
 * Requirement 9.3
 */
export interface ProcessPaletteResultV2 {
	/** ブランドトークン配列 */
	brandTokens: BrandToken[];
	/** 参照されたDADSトークンのMap */
	dadsReferences: Map<string, DadsToken>;
	/** CUD準拠率 */
	cudComplianceRate: number;
	/** 調和スコア */
	harmonyScore: HarmonyScoreResult;
	/** 警告メッセージ */
	warnings: string[];
}

/**
 * 条件付き戻り値型
 */
export type ProcessPaletteResult<V extends ApiVersion> = V extends "v2"
	? ProcessPaletteResultV2
	: ProcessPaletteResultV1;

/**
 * CUD色からDadsTokenを作成する
 * 注: これは簡易的な変換。将来的にはDADS公式インポート機能を使用
 */
const createDadsTokenFromCudColor = (cudColor: CudColor): DadsToken => {
	return {
		id: cudColor.id,
		hex: cudColor.hex,
		nameJa: cudColor.nameJa,
		nameEn: cudColor.nameEn,
		classification: {
			category: cudColor.group === "neutral" ? "neutral" : "chromatic",
		},
		source: "dads",
	};
};

/**
 * OptimizedColorからBrandTokenを作成する
 * @param optimizedColor - 最適化された色
 * @param index - パレット内のインデックス
 * @param existingIds - 既存のID（重複回避用）
 * @param context - 生成コンテキスト（オプション）
 */
const createBrandTokenFromOptimizedColor = (
	optimizedColor: OptimizedColor,
	index: number,
	existingIds: Set<string>,
	context?: PaletteGenerationContext,
): BrandToken => {
	// brandToken情報からdadsReferenceを取得
	const dadsReference: DadsReference = optimizedColor.brandToken
		?.dadsReference ?? {
		tokenId: optimizedColor.cudTarget?.id ?? "unknown",
		tokenHex: optimizedColor.cudTarget?.hex ?? optimizedColor.hex,
		deltaE: optimizedColor.deltaE,
		derivationType: optimizedColor.snapped ? "soft-snap" : "reference",
		zone: optimizedColor.zone,
	};

	// ロール名を決定（コンテキストにrolesが指定されていれば使用）
	const role = context?.roles?.[index] ?? `color-${index + 1}`;

	// ID生成
	const id = generateBrandTokenId({
		namespace: context?.namespace,
		role,
		existingIds,
	});
	existingIds.add(id);

	// コンテキストのusedIdsにも追加
	if (context?.usedIds) {
		context.usedIds.add(id);
	}

	return {
		id,
		hex: optimizedColor.hex,
		source: "brand",
		dadsReference,
		originalHex: optimizedColor.originalHex,
	};
};

/**
 * CUDモードでパレットを処理する（v1/v2対応版）
 *
 * Requirements:
 * - 9.1: apiVersionオプション
 * - 9.2: v1またはapiVersion未指定時はProcessPaletteResultV1を返却
 * - 9.3: v2指定時はProcessPaletteResultV2を返却
 * - 9.4: anchorオプション（anchorHex, anchorIndex, isFixed）
 * - 9.5: isFixed=false時の警告出力
 * - 9.6: generationContextオプション
 *
 * @param colors - 色のHEX配列
 * @param options - 処理オプション
 * @returns 処理結果（v1またはv2形式）
 *
 * @example
 * ```ts
 * // v1 API（デフォルト）
 * const resultV1 = processPaletteWithModeV2(colors, { mode: "soft" });
 * console.log(resultV1.palette); // OptimizedColor[]
 *
 * // v2 API
 * const resultV2 = processPaletteWithModeV2(colors, { mode: "soft", apiVersion: "v2" });
 * console.log(resultV2.brandTokens); // BrandToken[]
 *
 * // v2 API with anchor and context
 * const resultV2WithContext = processPaletteWithModeV2(colors, {
 *   mode: "soft",
 *   apiVersion: "v2",
 *   anchor: { anchorIndex: 0, isFixed: true },
 *   generationContext: { namespace: "brand", roles: ["primary", "secondary"] }
 * });
 * ```
 */
export function processPaletteWithModeV2<V extends ApiVersion = "v1">(
	colors: string[],
	options: ProcessPaletteOptions & { apiVersion?: V },
): ProcessPaletteResult<V> {
	const {
		mode,
		apiVersion = "v1" as V,
		lambda = 0.5,
		returnFactor = 0.5,
		anchorHex,
		anchor,
		generationContext,
	} = options;

	// 警告配列（Optimizer警告に追加する分）
	const additionalWarnings: string[] = [];

	// 空パレットチェック
	if (colors.length === 0) {
		throw new Error("Colors must contain at least one color");
	}

	// 正規化
	const normalizedColors = colors.map(normalizeHex);

	// アンカーカラーを決定
	// 優先順位: anchor.anchorHex > anchor.anchorIndex > 旧anchorHex > 先頭色
	let effectiveAnchorHex: string;
	if (anchor?.anchorHex) {
		effectiveAnchorHex = normalizeHex(anchor.anchorHex);
	} else if (
		anchor?.anchorIndex !== undefined &&
		anchor.anchorIndex >= 0 &&
		anchor.anchorIndex < normalizedColors.length
	) {
		effectiveAnchorHex = normalizedColors[anchor.anchorIndex];
	} else if (anchorHex) {
		effectiveAnchorHex = normalizeHex(anchorHex);
	} else {
		effectiveAnchorHex = normalizedColors[0];
	}

	// isFixed=false の場合の警告（Requirement 9.5）
	if (anchor?.isFixed === false) {
		additionalWarnings.push(
			"isFixed=false は現在未実装のため、isFixed=true として扱います",
		);
	}

	const anchorColor = createAnchorColor(effectiveAnchorHex);

	// Optimizerで最適化
	const optimizationResult = optimizePalette(normalizedColors, anchorColor, {
		lambda,
		mode,
		returnFactor,
	});

	// 警告を結合
	const allWarnings = [...optimizationResult.warnings, ...additionalWarnings];

	// v1結果を作成
	const v1Result: ProcessPaletteResultV1 = {
		palette: optimizationResult.palette,
		cudComplianceRate: optimizationResult.cudComplianceRate,
		harmonyScore: optimizationResult.harmonyScore,
		warnings: allWarnings,
	};

	// apiVersionに応じて結果を返す
	if (apiVersion === "v2") {
		// v2結果に変換
		// generationContextのusedIdsを使用するか、新規作成
		const existingIds = generationContext?.usedIds
			? new Set<string>(generationContext.usedIds)
			: new Set<string>();
		const dadsReferences = new Map<string, DadsToken>();

		const brandTokens = optimizationResult.palette.map(
			(optimizedColor, index) => {
				const brandToken = createBrandTokenFromOptimizedColor(
					optimizedColor,
					index,
					existingIds,
					generationContext,
				);

				// DADSトークンをMapに追加
				if (optimizedColor.cudTarget) {
					const dadsToken = createDadsTokenFromCudColor(
						optimizedColor.cudTarget,
					);
					dadsReferences.set(dadsToken.id, dadsToken);
				}

				return brandToken;
			},
		);

		const v2Result: ProcessPaletteResultV2 = {
			brandTokens,
			dadsReferences,
			cudComplianceRate: optimizationResult.cudComplianceRate,
			harmonyScore: optimizationResult.harmonyScore,
			warnings: allWarnings,
		};

		return v2Result as ProcessPaletteResult<V>;
	}

	return v1Result as ProcessPaletteResult<V>;
}

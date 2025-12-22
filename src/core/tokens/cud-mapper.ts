/**
 * CUDマッピング付加機能
 *
 * DADSトークンに対してCUD推奨20色との距離情報を付加する。
 * 各トークンについて最も近いCUD色を検索し、deltaEを計算して
 * classification.cudMappingプロパティに設定する。
 *
 * Requirements: 4.1, 4.2, 4.3
 */

import { deltaEok, toOklab } from "../../utils/color-space";
import type { CudColor } from "../cud/colors";
import type { DadsColorClassification, DadsToken } from "./types";

/**
 * CUDマッピング付加結果
 */
export interface EnrichWithCudMappingResult {
	/** CUDマッピング付加後のDadsToken配列 */
	tokens: DadsToken[];
	/** 処理中に発生した警告メッセージ */
	warnings: string[];
}

/**
 * HEX値が有効な色値かどうかを判定する
 *
 * var()参照は#で始まらないため、これによりスキップ対象を判定できる
 *
 * @param hex HEX値またはvar()参照
 * @returns #で始まる場合はtrue
 */
function isValidHexColor(hex: string): boolean {
	return hex.startsWith("#");
}

/**
 * DadsToken配列にCUDマッピング情報を付加する
 *
 * Requirement 4.1: 各トークンについて最も近いCUD色を検索しdeltaEを計算
 * Requirement 4.2: classification.cudMappingにnearestCudIdとdeltaEを設定
 * Requirement 4.3: var()参照を持つトークン（hex値が#で始まらない）はスキップ
 *
 * @param tokens DadsToken配列
 * @param cudColors CUD推奨色配列
 * @returns CUDマッピング付加結果
 *
 * @example
 * ```ts
 * const result = enrichWithCudMapping(dadsTokens, CUD_COLOR_SET);
 * for (const token of result.tokens) {
 *   if (token.classification.cudMapping) {
 *     console.log(`${token.id}: nearest CUD = ${token.classification.cudMapping.nearestCudId}`);
 *   }
 * }
 * ```
 */
export function enrichWithCudMapping(
	tokens: DadsToken[],
	cudColors: readonly CudColor[],
): EnrichWithCudMappingResult {
	const warnings: string[] = [];
	const enrichedTokens: DadsToken[] = [];

	// CUD色が空の場合は、cudMappingなしのトークンをそのまま返す
	if (cudColors.length === 0) {
		return {
			tokens: tokens.map((token) => ({
				...token,
				classification: { ...token.classification },
			})),
			warnings,
		};
	}

	// CUD色のOKLab値を事前計算（パフォーマンス最適化）
	const cudColorsWithOklab = cudColors.map((cudColor) => ({
		...cudColor,
		oklab: toOklab(cudColor.hex),
	}));

	for (const token of tokens) {
		// var()参照（#で始まらない）はスキップ
		if (!isValidHexColor(token.hex)) {
			// cudMappingなしで新しいトークンオブジェクトを作成（イミュータビリティ維持）
			enrichedTokens.push({
				...token,
				classification: { ...token.classification },
			});
			continue;
		}

		// トークンのOKLab値を計算
		const tokenOklab = toOklab(token.hex);
		if (!tokenOklab) {
			warnings.push(`OKLab変換失敗: ${token.id} (${token.hex})`);
			enrichedTokens.push({
				...token,
				classification: { ...token.classification },
			});
			continue;
		}

		// 最も近いCUD色を検索
		let nearestCudId: string | null = null;
		let minDeltaE = Infinity;

		for (const cudColor of cudColorsWithOklab) {
			if (!cudColor.oklab) {
				continue;
			}

			const deltaE = deltaEok(tokenOklab, cudColor.oklab);

			if (deltaE < minDeltaE) {
				minDeltaE = deltaE;
				nearestCudId = cudColor.id;
			}
		}

		// 新しいclassificationオブジェクトを作成（イミュータビリティ維持）
		const newClassification: DadsColorClassification = {
			...token.classification,
		};

		if (nearestCudId !== null) {
			newClassification.cudMapping = {
				nearestCudId,
				deltaE: minDeltaE,
			};
		}

		// 新しいトークンオブジェクトを作成
		enrichedTokens.push({
			...token,
			classification: newClassification,
		});
	}

	return {
		tokens: enrichedTokens,
		warnings,
	};
}

/**
 * Migration Utility
 * OptimizedColor配列をBrandToken配列に変換するユーティリティ
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import type { OptimizedColor } from "../core/cud/optimizer";
import { generateBrandTokenId } from "../core/tokens/id-generator";
import type { BrandToken, DadsReference } from "../core/tokens/types";

/**
 * マイグレーション結果
 * Requirement 13.2
 */
export interface MigrationResult {
	/** 変換されたBrandToken配列 */
	brandTokens: BrandToken[];
	/** 警告メッセージ（推定時など） */
	warnings: string[];
	/** 変換できなかった色のHEX値 */
	unmigrated: string[];
}

/**
 * マイグレーションオプション
 * Requirement 13.4
 */
export interface MigrationOptions {
	/** ブランドプレフィックス（namespaceとして使用） */
	brandPrefix?: string;
	/** ロール名配列（ID生成時に使用） */
	roles?: string[];
}

/**
 * OptimizedColorからDadsReferenceを取得・推定する
 *
 * @param optimizedColor - 最適化された色
 * @returns DadsReferenceまたはnull（推定不能な場合）
 */
function extractDadsReference(
	optimizedColor: OptimizedColor,
): { dadsReference: DadsReference; inferred: boolean } | null {
	// 1. brandToken.dadsReferenceがあればそれを使用
	if (optimizedColor.brandToken?.dadsReference) {
		return {
			dadsReference: optimizedColor.brandToken.dadsReference,
			inferred: false,
		};
	}

	// 2. cudTargetから推定
	if (optimizedColor.cudTarget) {
		const dadsReference: DadsReference = {
			tokenId: optimizedColor.cudTarget.id,
			tokenHex: optimizedColor.cudTarget.hex,
			deltaE: optimizedColor.deltaE,
			derivationType: optimizedColor.snapped ? "soft-snap" : "reference",
			zone: optimizedColor.zone,
		};
		return {
			dadsReference,
			inferred: true,
		};
	}

	// 3. 推定不能
	return null;
}

/**
 * OptimizedColor配列をBrandToken配列に変換する
 *
 * Requirements:
 * - 13.1: OptimizedColor配列をBrandToken配列に変換
 * - 13.2: MigrationResult型（brandTokens, warnings, unmigrated）を返却
 * - 13.3: DADS参照を特定できない色はunmigratedに追加
 * - 13.4: brandPrefixとrolesオプションでID生成をカスタマイズ可能
 *
 * @param colors - 最適化されたパレット
 * @param options - マイグレーションオプション
 * @returns マイグレーション結果
 *
 * @example
 * ```ts
 * const optimizedColors = processPaletteWithModeV2(colors, { mode: "soft" }).palette;
 * const result = migrateOptimizedColors(optimizedColors, {
 *   brandPrefix: "acme",
 *   roles: ["primary", "secondary", "accent"]
 * });
 * console.log(result.brandTokens); // BrandToken[]
 * console.log(result.warnings);    // 推定時の警告
 * console.log(result.unmigrated);  // 変換できなかった色のHEX値
 * ```
 */
export function migrateOptimizedColors(
	colors: OptimizedColor[],
	options?: MigrationOptions,
): MigrationResult {
	const { brandPrefix, roles } = options ?? {};

	const brandTokens: BrandToken[] = [];
	const warnings: string[] = [];
	const unmigrated: string[] = [];

	// ID重複回避用のSet
	const existingIds = new Set<string>();

	// 変換されたトークン数（role index計算用）
	let convertedIndex = 0;

	for (const optimizedColor of colors) {
		// DadsReferenceを取得・推定
		const referenceResult = extractDadsReference(optimizedColor);

		if (!referenceResult) {
			// 推定不能 → unmigratedに追加
			unmigrated.push(optimizedColor.hex);
			continue;
		}

		const { dadsReference, inferred } = referenceResult;

		// 推定時は警告を追加
		if (inferred) {
			warnings.push(
				`${optimizedColor.hex}: DADS参照をcudTargetから推定しました（tokenId: ${dadsReference.tokenId}）`,
			);
		}

		// ロール名を決定
		const role = roles?.[convertedIndex] ?? `color-${convertedIndex + 1}`;

		// ID生成
		const id = generateBrandTokenId({
			namespace: brandPrefix,
			role,
			existingIds,
		});
		existingIds.add(id);

		// BrandTokenを作成
		const brandToken: BrandToken = {
			id,
			hex: optimizedColor.hex,
			source: "brand",
			dadsReference,
			originalHex: optimizedColor.originalHex,
		};

		brandTokens.push(brandToken);
		convertedIndex++;
	}

	return {
		brandTokens,
		warnings,
		unmigrated,
	};
}

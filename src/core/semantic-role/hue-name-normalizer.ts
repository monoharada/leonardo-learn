/**
 * HueNameNormalizer - 色相名の正規化ユーティリティ
 *
 * DADS_CHROMAS.displayName（例: "Light Blue"）と
 * DADS_CHROMAS.name（例: "cyan"）から
 * DadsColorHue（例: "light-blue"）への変換を提供する
 *
 * Requirements: 1.2
 */

import { DADS_CHROMAS } from "@/core/base-chroma";
import { getDadsHueFromDisplayName } from "@/core/tokens/dads-data-provider";
import type { DadsColorHue } from "@/core/tokens/types";

/**
 * DADS_CHROMAS.displayNameからDadsColorHueへ変換
 *
 * @param displayName - 表示名（例: "Light Blue"）
 * @returns DadsColorHue または undefined
 *
 * @example
 * ```ts
 * normalizeToDadsHue("Light Blue"); // "light-blue"
 * normalizeToDadsHue("Blue"); // "blue"
 * normalizeToDadsHue("Unknown"); // undefined
 * ```
 */
export function normalizeToDadsHue(
	displayName: string,
): DadsColorHue | undefined {
	return getDadsHueFromDisplayName(displayName);
}

/**
 * DADS_CHROMAS.name（chromaName）からDadsColorHueへ変換
 *
 * harmony.tsのDADS_COLORS.chromaNameはDADS_CHROMAS.nameを参照するため、
 * この関数でDadsColorHueに正規化する必要がある
 *
 * @param chromaName - クロマ名（例: "cyan"）
 * @returns DadsColorHue または undefined
 *
 * @example
 * ```ts
 * chromaNameToDadsHue("cyan"); // "light-blue"
 * chromaNameToDadsHue("teal"); // "cyan"
 * chromaNameToDadsHue("blue"); // "blue"
 * chromaNameToDadsHue("unknown"); // undefined
 * ```
 */
export function chromaNameToDadsHue(
	chromaName: string,
): DadsColorHue | undefined {
	const chroma = DADS_CHROMAS.find((c) => c.name === chromaName);
	if (!chroma) return undefined;
	return getDadsHueFromDisplayName(chroma.displayName);
}

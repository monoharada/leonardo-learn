/**
 * CVD（色覚多様性）シミュレーター拡張
 * 既存のCVDシミュレーション機能を利用し、複数形式での出力を提供
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { type CVDType, simulateCVD } from "../../accessibility/cvd-simulator";
import { Color } from "../../core/color";
import { toOklab, toOklch } from "../../utils/color-space";
import type { OklabColor, OklchColor } from "./colors";

/**
 * シミュレーションタイプ（簡略化された名前）
 * - protan: protanopia（1型2色覚）
 * - deutan: deuteranopia（2型2色覚）
 * - tritan: tritanopia（3型2色覚） - 将来拡張用
 */
export type CvdSimulationType = "protan" | "deutan" | "tritan";

/**
 * CVDシミュレーション結果
 * Requirements 3.2: hex, oklab, oklchの3形式で返却
 */
export interface CvdSimulationResult {
	/** シミュレーション後のHEXカラー */
	hex: string;
	/** シミュレーション後のOKLab値 */
	oklab: OklabColor;
	/** シミュレーション後のOKLCH値 */
	oklch: OklchColor;
}

/**
 * シミュレーションタイプをCVDTypeに変換
 */
const toInternalCvdType = (type: CvdSimulationType): CVDType => {
	switch (type) {
		case "protan":
			return "protanopia";
		case "deutan":
			return "deuteranopia";
		case "tritan":
			return "tritanopia";
	}
};

/**
 * HEX値を正規化（#付き、大文字）
 */
const normalizeHex = (hex: string): string => {
	let normalized = hex.trim();
	if (!normalized.startsWith("#")) {
		normalized = `#${normalized}`;
	}
	return normalized.toUpperCase();
};

/**
 * CVDシミュレーションを行い、複数形式で結果を返却する
 *
 * Requirements 3.1, 3.2, 3.3, 3.4:
 * - 既存CVDシミュレーション機能を内部利用
 * - protan/deutan型のシミュレーション結果をhex, oklab, oklchの3形式で返却
 * - sRGB空間でBrettel行列を適用後、OKLab/OKLCHに変換
 * - tritan型サポートを将来追加できるようオプション引数を設計
 *
 * @param hex - シミュレーション対象のHEXカラー
 * @param type - シミュレーションタイプ（protan, deutan, tritan）
 * @returns シミュレーション結果（hex, oklab, oklch形式）
 */
export const simulateCvdWithFormats = (
	hex: string,
	type: CvdSimulationType,
): CvdSimulationResult => {
	const normalizedHex = normalizeHex(hex);

	// 入力色からColorオブジェクトを作成
	const inputColor = new Color(normalizedHex);

	// 既存のCVDシミュレーション関数を使用
	const internalType = toInternalCvdType(type);
	const simulatedColor = simulateCVD(inputColor, internalType);

	// シミュレーション後のHEXを取得
	const simulatedHex = simulatedColor.toHex().toUpperCase();

	// HEXからOKLab/OKLCHに変換
	const oklab = toOklab(simulatedHex);
	const oklch = toOklch(simulatedHex);

	return {
		hex: simulatedHex,
		oklab: {
			l: oklab?.l ?? 0,
			a: oklab?.a ?? 0,
			b: oklab?.b ?? 0,
		},
		oklch: {
			l: oklch?.l ?? 0,
			c: oklch?.c ?? 0,
			h: oklch?.h ?? 0,
		},
	};
};

/**
 * CVDSimulator - 色覚特性シミュレーター
 *
 * 色覚多様性（Color Vision Deficiency）のシミュレーションを提供します。
 * Brettel 1997法に基づいた正確な色変換を行います。
 */

import { Color } from "../core/color";

/**
 * 色覚タイプ
 */
export type CVDType =
	| "protanopia" // 1型2色覚（赤を知覚できない）
	| "deuteranopia" // 2型2色覚（緑を知覚できない）
	| "tritanopia" // 3型2色覚（青を知覚できない）
	| "achromatopsia"; // 全色盲（グレースケール）

/**
 * RGB値（0-255）
 */
interface RGB {
	r: number;
	g: number;
	b: number;
}

/**
 * Linear RGB値（0-1）
 */
interface LinearRGB {
	r: number;
	g: number;
	b: number;
}

/**
 * sRGBからLinear RGBに変換する（ガンマ補正を解除）
 */
function srgbToLinear(value: number): number {
	const v = value / 255;
	if (v <= 0.04045) {
		return v / 12.92;
	}
	return ((v + 0.055) / 1.055) ** 2.4;
}

/**
 * Linear RGBからsRGBに変換する（ガンマ補正を適用）
 */
function linearToSrgb(value: number): number {
	if (value <= 0.0031308) {
		return Math.round(value * 12.92 * 255);
	}
	return Math.round((1.055 * value ** (1 / 2.4) - 0.055) * 255);
}

/**
 * sRGB to Linear RGB変換
 */
function rgbToLinearRgb(rgb: RGB): LinearRGB {
	return {
		r: srgbToLinear(rgb.r),
		g: srgbToLinear(rgb.g),
		b: srgbToLinear(rgb.b),
	};
}

/**
 * Linear RGB to sRGB変換
 */
function linearRgbToRgb(linear: LinearRGB): RGB {
	return {
		r: Math.max(0, Math.min(255, linearToSrgb(linear.r))),
		g: Math.max(0, Math.min(255, linearToSrgb(linear.g))),
		b: Math.max(0, Math.min(255, linearToSrgb(linear.b))),
	};
}

/**
 * 色覚シミュレーション行列
 *
 * Viénot 1999 / Machado 2009に基づく行列を使用
 * Chromeの開発者ツールで使用されているものと同様のアプローチ
 */

/**
 * Protanopia（1型2色覚）シミュレーション行列
 * Brettel, Viénot & Mollon 1997 - 標準的なシミュレーション行列
 */
const PROTANOPIA_MATRIX = [
	[0.56667, 0.43333, 0.0],
	[0.55833, 0.44167, 0.0],
	[0.0, 0.24167, 0.75833],
];

/**
 * Deuteranopia（2型2色覚）シミュレーション行列
 */
const DEUTERANOPIA_MATRIX = [
	[0.625, 0.375, 0.0],
	[0.7, 0.3, 0.0],
	[0.0, 0.3, 0.7],
];

/**
 * Tritanopia（3型2色覚）シミュレーション行列
 */
const TRITANOPIA_MATRIX = [
	[0.95, 0.05, 0.0],
	[0.0, 0.43333, 0.56667],
	[0.0, 0.475, 0.525],
];

/**
 * 行列をLinear RGBに適用
 */
function applyMatrix(rgb: LinearRGB, matrix: number[][]): LinearRGB {
	const r =
		matrix[0]![0]! * rgb.r + matrix[0]![1]! * rgb.g + matrix[0]![2]! * rgb.b;
	const g =
		matrix[1]![0]! * rgb.r + matrix[1]![1]! * rgb.g + matrix[1]![2]! * rgb.b;
	const b =
		matrix[2]![0]! * rgb.r + matrix[2]![1]! * rgb.g + matrix[2]![2]! * rgb.b;
	return { r, g, b };
}

/**
 * Protanopia（1型2色覚）のシミュレーション
 */
function simulateProtanopia(rgb: LinearRGB): LinearRGB {
	return applyMatrix(rgb, PROTANOPIA_MATRIX);
}

/**
 * Deuteranopia（2型2色覚）のシミュレーション
 */
function simulateDeuteranopia(rgb: LinearRGB): LinearRGB {
	return applyMatrix(rgb, DEUTERANOPIA_MATRIX);
}

/**
 * Tritanopia（3型2色覚）のシミュレーション
 */
function simulateTritanopia(rgb: LinearRGB): LinearRGB {
	return applyMatrix(rgb, TRITANOPIA_MATRIX);
}

/**
 * Achromatopsia（全色盲）のシミュレーション
 * 輝度のみを知覚
 */
function simulateAchromatopsia(rgb: LinearRGB): LinearRGB {
	// ITU-R BT.709の輝度係数
	const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
	return {
		r: luminance,
		g: luminance,
		b: luminance,
	};
}

/**
 * 色覚シミュレーションを適用する
 *
 * @param color - シミュレーション対象の色
 * @param type - 色覚タイプ
 * @returns シミュレーション後の色
 */
export function simulateCVD(color: Color, type: CVDType): Color {
	// Colorオブジェクトから RGB値を取得
	const hex = color.toHex();
	const rgb = hexToRgb(hex);

	// sRGB → Linear RGB
	const linearRgb = rgbToLinearRgb(rgb);

	// 色覚タイプに応じてシミュレーション（Linear RGB空間で直接適用）
	let simulatedLinearRgb: LinearRGB;
	switch (type) {
		case "protanopia":
			simulatedLinearRgb = simulateProtanopia(linearRgb);
			break;
		case "deuteranopia":
			simulatedLinearRgb = simulateDeuteranopia(linearRgb);
			break;
		case "tritanopia":
			simulatedLinearRgb = simulateTritanopia(linearRgb);
			break;
		case "achromatopsia":
			simulatedLinearRgb = simulateAchromatopsia(linearRgb);
			break;
		default:
			simulatedLinearRgb = linearRgb;
	}

	// Linear RGB → sRGB
	const simulatedRgb = linearRgbToRgb(simulatedLinearRgb);

	// RGB to Hex to Color
	const simulatedHex = rgbToHex(simulatedRgb);
	return new Color(simulatedHex);
}

/**
 * Hex文字列からRGBに変換
 */
function hexToRgb(hex: string): RGB {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result || !result[1] || !result[2] || !result[3]) {
		return { r: 0, g: 0, b: 0 };
	}
	return {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16),
	};
}

/**
 * RGBからHex文字列に変換
 */
function rgbToHex(rgb: RGB): string {
	const toHex = (n: number) => {
		const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
		return hex.length === 1 ? "0" + hex : hex;
	};
	return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * 全ての色覚タイプでシミュレーションを行う
 *
 * @param color - シミュレーション対象の色
 * @returns 各色覚タイプでのシミュレーション結果
 */
export function simulateAllCVDTypes(color: Color): Record<CVDType, Color> {
	return {
		protanopia: simulateCVD(color, "protanopia"),
		deuteranopia: simulateCVD(color, "deuteranopia"),
		tritanopia: simulateCVD(color, "tritanopia"),
		achromatopsia: simulateCVD(color, "achromatopsia"),
	};
}

/**
 * 色覚タイプの表示名を取得する
 */
export function getCVDTypeName(type: CVDType): string {
	const names: Record<CVDType, string> = {
		protanopia: "1型2色覚（P型）",
		deuteranopia: "2型2色覚（D型）",
		tritanopia: "3型2色覚（T型）",
		achromatopsia: "全色盲",
	};
	return names[type];
}

/**
 * 全ての色覚タイプを取得する
 */
export function getAllCVDTypes(): CVDType[] {
	return ["protanopia", "deuteranopia", "tritanopia", "achromatopsia"];
}

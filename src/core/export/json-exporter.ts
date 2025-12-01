/**
 * JSONExporter - JSON形式でカラーデータをエクスポート
 *
 * OKLCH、sRGB、Display P3形式での色値を提供するJSONエクスポーターです。
 * CUDメタデータオプション付き。
 *
 * Requirements: 8.1, 8.2
 */

import { formatCss, oklch, p3 } from "culori";
import type { Color } from "../color";
import { findNearestCudColor, type MatchLevel } from "../cud/service";

/**
 * エクスポートオプション
 */
export interface JSONExportOptions {
	/** プレフィックス */
	prefix?: string;
	/** インデント */
	indent?: number;
	/**
	 * CUDメタデータを含めるか
	 * Requirement 8.2: デフォルトはfalseで後方互換性を維持
	 */
	includeCudMetadata?: boolean;
}

/**
 * CUDメタデータ
 * Requirement 8.1: 各色にcudMetadata（nearestId、deltaE、group、matchLevel）を付加
 */
export interface CudMetadata {
	/** 最も近いCUD色のID */
	nearestId: string;
	/** CUD色との色差（deltaE） */
	deltaE: number;
	/** CUD色のグループ */
	group: string;
	/** マッチレベル（exact/near/off） */
	matchLevel: MatchLevel;
}

/**
 * OKLCH色値
 */
export interface OklchValue {
	l: number;
	c: number;
	h: number | null;
}

/**
 * sRGB色値
 */
export interface SrgbValue {
	hex: string;
	r: number;
	g: number;
	b: number;
}

/**
 * Display P3色値
 */
export interface P3Value {
	css: string;
	r: number;
	g: number;
	b: number;
}

/**
 * エクスポートされた色データ
 */
export interface ExportedColorData {
	oklch: OklchValue;
	srgb: SrgbValue;
	p3: P3Value;
	/** CUDメタデータ（オプション） */
	cudMetadata?: CudMetadata;
}

/**
 * エクスポート結果のメタデータ
 */
export interface ExportMetadata {
	version: string;
	generatedAt: string;
	colorSpace: string;
	prefix?: string;
	indent?: number;
}

/**
 * JSONエクスポート結果
 */
export interface JSONExportResult {
	colors: Record<string, ExportedColorData>;
	metadata: ExportMetadata;
}

/**
 * ColorをエクスポートデータにExport変換する
 * @param color - 変換する色
 * @param includeCudMetadata - CUDメタデータを含めるか
 */
function colorToExportData(
	color: Color,
	includeCudMetadata = false,
): ExportedColorData {
	const colorOklch = color.oklch;
	const hex = color.toHex();

	// OKLCH値
	const oklchValue: OklchValue = {
		l: colorOklch.l,
		c: colorOklch.c,
		h: colorOklch.h ?? null,
	};

	// sRGB値（hexから計算）
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);

	const srgbValue: SrgbValue = {
		hex,
		r,
		g,
		b,
	};

	// Display P3値
	const oklchColor = oklch({
		mode: "oklch",
		l: colorOklch.l,
		c: colorOklch.c,
		h: colorOklch.h,
	});

	const p3Color = p3(oklchColor);
	const p3Css =
		formatCss(p3Color) ??
		`color(display-p3 ${p3Color?.r ?? 0} ${p3Color?.g ?? 0} ${p3Color?.b ?? 0})`;

	const p3Value: P3Value = {
		css: p3Css,
		r: p3Color?.r ?? 0,
		g: p3Color?.g ?? 0,
		b: p3Color?.b ?? 0,
	};

	const result: ExportedColorData = {
		oklch: oklchValue,
		srgb: srgbValue,
		p3: p3Value,
	};

	// CUDメタデータを追加（オプション）
	if (includeCudMetadata) {
		const cudResult = findNearestCudColor(hex);
		result.cudMetadata = {
			nearestId: cudResult.nearest.id,
			deltaE: cudResult.deltaE,
			group: cudResult.nearest.group,
			matchLevel: cudResult.matchLevel,
		};
	}

	return result;
}

/**
 * カラーをJSON形式でエクスポートする
 *
 * @param colors - エクスポートする色のレコード
 * @param options - エクスポートオプション
 * @returns JSONエクスポート結果
 */
export function exportToJSON(
	colors: Record<string, Color>,
	options: JSONExportOptions = {},
): JSONExportResult {
	const exportedColors: Record<string, ExportedColorData> = {};
	const includeCudMetadata = options.includeCudMetadata ?? false;

	for (const [name, color] of Object.entries(colors)) {
		exportedColors[name] = colorToExportData(color, includeCudMetadata);
	}

	const metadata: ExportMetadata = {
		version: "1.0.0",
		generatedAt: new Date().toISOString(),
		colorSpace: "oklch",
		...(options.prefix && { prefix: options.prefix }),
		...(options.indent && { indent: options.indent }),
	};

	return {
		colors: exportedColors,
		metadata,
	};
}

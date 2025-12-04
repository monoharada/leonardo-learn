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
import { type CudZone, classifyZone } from "../cud/zone";

/**
 * CUD互換モード
 * Requirement 7.4: 使用モード情報を含める
 */
export type CudCompatibilityMode = "off" | "guide" | "soft" | "strict";

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
	/**
	 * CUDサマリーを含めるか
	 * Requirement 7.1, 7.2, 7.4: パレット全体のCUD準拠率とモード情報を含める
	 */
	includeCudSummary?: boolean;
	/**
	 * 使用したCUDモード
	 * Requirement 7.4: 使用したモード情報を含める
	 */
	cudMode?: CudCompatibilityMode;
}

/**
 * CUDメタデータ
 * Requirement 8.1: 各色にcudMetadata（nearestId、deltaE、group、matchLevel）を付加
 * Requirement 7.1: 各色のCUD推奨色ID/名称、deltaE値、ゾーン判定を含める
 */
export interface CudMetadata {
	/** 最も近いCUD色のID */
	nearestId: string;
	/** 最も近いCUD色の名称（日本語） */
	nearestName: string;
	/** CUD色との色差（deltaE） */
	deltaE: number;
	/** CUD色のグループ */
	group: string;
	/** マッチレベル（exact/near/off） */
	matchLevel: MatchLevel;
	/** ゾーン判定（safe/warning/off） */
	zone: CudZone;
}

/**
 * CUDエクスポートサマリー
 * Requirement 7.1, 7.2, 7.4: パレット全体のCUD情報
 */
export interface CudExportSummary {
	/** CUD準拠率（%） */
	complianceRate: number;
	/** 使用モード */
	mode: CudCompatibilityMode;
	/** ゾーン別色数 */
	zoneDistribution: Record<CudZone, number>;
	/** Strict時の完全準拠フラグ */
	isFullyCompliant: boolean;
}

/**
 * CUD検証サマリー（エクスポート前表示用）
 * Requirement 7.5: エクスポート前に警告数・エラー数のサマリーを表示
 */
export interface CudValidationSummary {
	/** 総色数 */
	totalColors: number;
	/** 警告数（Warning Zone） */
	warningCount: number;
	/** エラー数（Off Zone） */
	errorCount: number;
	/** ゾーン別色数 */
	zoneDistribution: Record<CudZone, number>;
	/** エクスポート準備完了フラグ（エラーなし） */
	isExportReady: boolean;
	/** 人間が読めるメッセージ */
	message: string;
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
	/** CUDサマリー（オプション） */
	cudSummary?: CudExportSummary;
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
		const zone = classifyZone(cudResult.deltaE);
		result.cudMetadata = {
			nearestId: cudResult.nearest.id,
			nearestName: cudResult.nearest.nameJa,
			deltaE: cudResult.deltaE,
			group: cudResult.nearest.group,
			matchLevel: cudResult.matchLevel,
			zone,
		};
	}

	return result;
}

/**
 * CUDサマリーを計算する
 * Requirement 7.1, 7.2, 7.4
 *
 * @param exportedColors - エクスポートされた色データ
 * @param mode - CUDモード
 * @returns CUDサマリー
 */
function calculateCudSummary(
	exportedColors: Record<string, ExportedColorData>,
	mode: CudCompatibilityMode,
): CudExportSummary {
	const colorEntries = Object.values(exportedColors);
	const total = colorEntries.length;

	// ゾーン別色数をカウント
	const zoneDistribution: Record<CudZone, number> = {
		safe: 0,
		warning: 0,
		off: 0,
	};

	for (const colorData of colorEntries) {
		const zone = colorData.cudMetadata?.zone ?? "off";
		zoneDistribution[zone]++;
	}

	// CUD準拠率（Safe + Warning = 準拠）
	const compliantCount = zoneDistribution.safe + zoneDistribution.warning;
	const complianceRate = total > 0 ? (compliantCount / total) * 100 : 0;

	// 完全準拠フラグ（全てsafe）
	const isFullyCompliant =
		zoneDistribution.off === 0 && zoneDistribution.warning === 0;

	return {
		complianceRate,
		mode,
		zoneDistribution,
		isFullyCompliant,
	};
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
	const includeCudSummary = options.includeCudSummary ?? false;
	const cudMode = options.cudMode ?? "off";

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

	const result: JSONExportResult = {
		colors: exportedColors,
		metadata,
	};

	// CUDサマリーを追加（オプション）
	if (includeCudSummary) {
		result.cudSummary = calculateCudSummary(exportedColors, cudMode);
	}

	return result;
}

/**
 * CUD検証サマリーメッセージを生成する
 * @param warningCount - 警告数
 * @param errorCount - エラー数
 * @param totalColors - 総色数
 * @returns 人間が読めるメッセージ
 */
function generateValidationMessage(
	warningCount: number,
	errorCount: number,
	totalColors: number,
): string {
	if (totalColors === 0) {
		return "パレットが空です。";
	}

	if (warningCount === 0 && errorCount === 0) {
		return `${totalColors}色すべてがCUD準拠です。エクスポート可能です。`;
	}

	const parts: string[] = [];
	if (errorCount > 0) {
		parts.push(`${errorCount}色がCUD非準拠（Off Zone）`);
	}
	if (warningCount > 0) {
		parts.push(`${warningCount}色が要確認（Warning Zone）`);
	}

	return `${parts.join("、")}です。`;
}

/**
 * エクスポート前にCUD検証サマリーを生成する
 * Requirement 7.5: エクスポート前に警告数・エラー数のサマリーを表示
 *
 * @param colors - 検証する色のレコード
 * @returns CUD検証サマリー
 */
export function generateCudValidationSummary(
	colors: Record<string, Color>,
): CudValidationSummary {
	const colorEntries = Object.values(colors);
	const totalColors = colorEntries.length;

	// ゾーン別色数をカウント
	const zoneDistribution: Record<CudZone, number> = {
		safe: 0,
		warning: 0,
		off: 0,
	};

	for (const color of colorEntries) {
		const hex = color.toHex();
		const cudResult = findNearestCudColor(hex);
		const zone = classifyZone(cudResult.deltaE);
		zoneDistribution[zone]++;
	}

	const warningCount = zoneDistribution.warning;
	const errorCount = zoneDistribution.off;
	const isExportReady = errorCount === 0;
	const message = generateValidationMessage(
		warningCount,
		errorCount,
		totalColors,
	);

	return {
		totalColors,
		warningCount,
		errorCount,
		zoneDistribution,
		isExportReady,
		message,
	};
}

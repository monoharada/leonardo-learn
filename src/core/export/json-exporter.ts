/**
 * JSONExporter - JSON形式でカラーデータをエクスポート
 *
 * OKLCH、sRGB、Display P3形式での色値を提供するJSONエクスポーターです。
 * CUDメタデータオプション付き。
 * v2 APIでは、DADSトークン/ブランドトークン構造をサポート。
 *
 * Requirements: 8.1, 8.2, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import { formatCss, oklch, p3 } from "culori";
import type { Color } from "../color";
import { findNearestCudColor, type MatchLevel } from "../cud/service";
import { type CudZone, classifyZone } from "../cud/zone";
import type { BrandToken, DadsReference, DadsToken } from "../tokens/types";

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

// ============================================
// v2 API: DADS/Brand Token Export Functions
// ============================================

/**
 * JSONエクスポートv2オプション
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */
export interface JSONExportOptionsV2 {
	/** 出力バージョン（デフォルト: "v2"） */
	outputVersion?: "v1" | "v2";
	/** DADSトークンを含めるか（デフォルト: true） */
	includeDadsTokens?: boolean;
	/** DADSトークン配列 */
	dadsTokens?: DadsToken[];
	/** ブランド名前空間 */
	brandNamespace?: string;
	/** CUDモード */
	cudMode?: CudCompatibilityMode;
}

/**
 * エクスポートされたDADSトークンデータ
 * Requirement 11.1
 */
export interface ExportedDadsTokenData {
	/** トークンID */
	id: string;
	/** HEX値 */
	hex: string;
	/** 日本語名 */
	nameJa: string;
	/** 英語名 */
	nameEn: string;
	/** ソース種別 */
	source: "dads";
	/** 不変フラグ（常にtrue） */
	immutable: boolean;
	/** alpha値（オプショナル） */
	alpha?: number;
}

/**
 * エクスポートされたブランドトークンデータ
 * Requirements: 11.3, 11.4
 */
export interface ExportedBrandTokenData {
	/** トークンID */
	id: string;
	/** HEX値 */
	hex: string;
	/** ソース種別 */
	source: "brand";
	/** 最適化前の入力色 */
	originalHex?: string;
	/** alpha値（オプショナル） */
	alpha?: number;
	/** DADS参照情報 */
	dadsReference: DadsReference;
}

/**
 * CUDサマリーv2
 * Requirement 11.5
 */
export interface CudSummaryV2 {
	/** CUD準拠率（%） */
	complianceRate: number;
	/** 使用モード */
	mode: string;
	/** ゾーン別色数 */
	zoneDistribution: Record<CudZone, number>;
}

/**
 * メタデータv2
 * Requirement 11.6
 */
export interface MetadataV2 {
	/** バージョン */
	version: string;
	/** 生成日時（ISO形式） */
	generatedAt: string;
	/** トークンスキーマ */
	tokenSchema: string;
	/** ブランド名前空間（オプショナル） */
	brandNamespace?: string;
}

/**
 * JSONエクスポート結果v2
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */
export interface JSONExportResultV2 {
	/** メタデータ */
	metadata: MetadataV2;
	/** DADSトークン（オプショナル） */
	dadsTokens?: Record<string, ExportedDadsTokenData>;
	/** ブランドトークン */
	brandTokens: Record<string, ExportedBrandTokenData>;
	/** CUDサマリー */
	cudSummary: CudSummaryV2;
}

/**
 * JSONエクスポート結果v1互換（colors形式）
 */
export interface JSONExportResultV1Compat {
	/** メタデータ */
	metadata: MetadataV2;
	/** カラー（v1形式） */
	colors: Record<string, ExportedBrandTokenData>;
}

/**
 * DADSトークンをエクスポートデータに変換する
 *
 * @param token - DADSトークン
 * @returns エクスポートされたDADSトークンデータ
 */
function convertDadsTokenToExportData(token: DadsToken): ExportedDadsTokenData {
	const result: ExportedDadsTokenData = {
		id: token.id,
		hex: token.hex,
		nameJa: token.nameJa,
		nameEn: token.nameEn,
		source: "dads",
		immutable: true,
	};

	// alpha値がある場合は追加
	if (token.alpha !== undefined && token.alpha !== 1) {
		result.alpha = token.alpha;
	}

	return result;
}

/**
 * ブランドトークンをエクスポートデータに変換する
 *
 * @param token - ブランドトークン
 * @returns エクスポートされたブランドトークンデータ
 */
function convertBrandTokenToExportData(
	token: BrandToken,
): ExportedBrandTokenData {
	const result: ExportedBrandTokenData = {
		id: token.id,
		hex: token.hex,
		source: "brand",
		dadsReference: token.dadsReference,
	};

	// originalHexがある場合は追加
	if (token.originalHex) {
		result.originalHex = token.originalHex;
	}

	// alpha値がある場合は追加
	if (token.alpha !== undefined && token.alpha !== 1) {
		result.alpha = token.alpha;
	}

	return result;
}

/**
 * ブランドトークン配列からCUDサマリーを計算する
 *
 * @param brandTokens - ブランドトークン配列
 * @param mode - CUDモード
 * @returns CUDサマリー
 */
function calculateCudSummaryFromBrandTokens(
	brandTokens: BrandToken[],
	mode: CudCompatibilityMode,
): CudSummaryV2 {
	const total = brandTokens.length;

	// ゾーン別色数をカウント
	const zoneDistribution: Record<CudZone, number> = {
		safe: 0,
		warning: 0,
		off: 0,
	};

	for (const token of brandTokens) {
		const zone = token.dadsReference.zone;
		zoneDistribution[zone]++;
	}

	// CUD準拠率（Safe + Warning = 準拠）
	const compliantCount = zoneDistribution.safe + zoneDistribution.warning;
	const complianceRate = total > 0 ? (compliantCount / total) * 100 : 100;

	return {
		complianceRate,
		mode,
		zoneDistribution,
	};
}

/**
 * DADS/Brandトークンを機械可読なJSON形式でエクスポートする（v2 API）
 *
 * Requirements:
 * - 11.1: dadsTokensオブジェクトにid, hex, nameJa, nameEn, source, immutableプロパティを含める
 * - 11.2: alpha値を持つDadsTokenにはalphaプロパティを追加
 * - 11.3: brandTokensオブジェクトにid, hex, source, originalHex, dadsReferenceを含める
 * - 11.4: dadsReferenceにtokenId, tokenHex, tokenAlpha, deltaE, derivationType, zoneを含める
 * - 11.5: cudSummaryにcomplianceRate, mode, zoneDistributionを出力
 * - 11.6: metadataにversion, generatedAt, tokenSchemaを含める
 *
 * @param brandTokens - ブランドトークン配列
 * @param options - エクスポートオプション
 * @returns JSONエクスポート結果
 *
 * @example
 * ```ts
 * const result = exportToJSONv2(
 *   [{ id: "brand-primary-500", hex: "#1a73e8", ... }],
 *   {
 *     includeDadsTokens: true,
 *     dadsTokens: [{ id: "dads-blue-500", hex: "#0066cc", ... }],
 *     cudMode: "soft"
 *   }
 * );
 * ```
 */
export function exportToJSONv2(
	brandTokens: BrandToken[],
	options: JSONExportOptionsV2 = {},
): JSONExportResultV2 | JSONExportResultV1Compat {
	const {
		outputVersion = "v2",
		includeDadsTokens = true,
		dadsTokens = [],
		brandNamespace,
		cudMode = "off",
	} = options;

	// メタデータを生成
	const metadata: MetadataV2 = {
		version: "2.0.0",
		generatedAt: new Date().toISOString(),
		tokenSchema: "dads-brand-v1",
	};

	if (brandNamespace) {
		metadata.brandNamespace = brandNamespace;
	}

	// v1互換形式の場合
	if (outputVersion === "v1") {
		const colors: Record<string, ExportedBrandTokenData> = {};

		for (const token of brandTokens) {
			colors[token.id] = convertBrandTokenToExportData(token);
		}

		return {
			metadata,
			colors,
		} as JSONExportResultV1Compat;
	}

	// v2形式
	const result: JSONExportResultV2 = {
		metadata,
		brandTokens: {},
		cudSummary: calculateCudSummaryFromBrandTokens(brandTokens, cudMode),
	};

	// DADSトークンを変換（オプション）
	if (includeDadsTokens && dadsTokens.length > 0) {
		result.dadsTokens = {};
		for (const token of dadsTokens) {
			result.dadsTokens[token.id] = convertDadsTokenToExportData(token);
		}
	}

	// ブランドトークンを変換
	for (const token of brandTokens) {
		result.brandTokens[token.id] = convertBrandTokenToExportData(token);
	}

	return result;
}

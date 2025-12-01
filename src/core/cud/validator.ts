/**
 * CUD パレット検証エンジン
 * パレット全体のCUD準拠性を検証し、問題点を報告する
 *
 * Requirements: 4.1-4.10
 */

import { deltaEok, toOklab } from "../../utils/color-space";
import { classifyColor, classifyHue, type HueCluster } from "./classifier";
import type { OklchColor } from "./colors";
import { simulateCvdWithFormats } from "./cvd";
import { findExactCudColorByHex, findNearestCudColor } from "./service";

/**
 * パレット色の役割
 */
export type ColorRole = "accent" | "base" | "text" | "background" | "neutral";

/**
 * パレット内の色
 */
export interface PaletteColor {
	/** HEXカラーコード */
	hex: string;
	/** 色の役割 */
	role: ColorRole;
	/** OKLCH値（オプション、内部で計算される） */
	oklch?: OklchColor;
}

/**
 * 検証コンテキスト
 */
export type ValidationContext = "chart" | "map" | "ui" | "text-heavy";

/**
 * 検証オプション
 */
export interface ValidationOptions {
	/** 使用コンテキスト */
	context?: ValidationContext;
	/** 小さい文字を想定するか */
	assumeSmallText?: boolean;
}

/**
 * 問題の深刻度
 */
export type IssueSeverity = "error" | "warning" | "info";

/**
 * 問題の種類
 */
export type IssueType =
	| "not_in_cud_set"
	| "low_contrast"
	| "small_text_low_contrast"
	| "cvd_confusion_risk"
	| "too_similar"
	| "confusable_yellow_green"
	| "ambiguous_role"
	| "cud_good_example_like";

/**
 * 検証問題
 */
export interface ValidationIssue {
	/** 問題の種類 */
	type: IssueType;
	/** 深刻度 */
	severity: IssueSeverity;
	/** メッセージ */
	message: string;
	/** 関連する色のHEX値 */
	colors: string[];
	/** 詳細情報 */
	details?: Record<string, unknown>;
}

/**
 * 検証結果
 */
export interface ValidationResult {
	/** 検証合否（errorがなければtrue） */
	ok: boolean;
	/** 概要メッセージ */
	summary: string;
	/** 問題リスト */
	issues: ValidationIssue[];
}

/**
 * deltaEの閾値
 */
const THRESHOLDS = {
	/** CUD色との完全一致とみなす閾値 */
	cudExact: 0.03,
	/** 類似色とみなす閾値 */
	similar: 0.04,
	/** 一般色覚での区別可能な閾値 */
	distinguishable: 0.15,
	/** CVDシミュレーション後の混同閾値 */
	cvdConfusion: 0.1,
	/** コントラスト比（通常テキスト） */
	contrastNormal: 4.5,
	/** コントラスト比（小さいテキスト） */
	contrastSmall: 7.0,
} as const;

/**
 * HEXを正規化
 */
const normalizeHex = (hex: string): string => {
	let normalized = hex.trim();
	if (!normalized.startsWith("#")) {
		normalized = `#${normalized}`;
	}
	return normalized.toUpperCase();
};

/**
 * 相対輝度を計算
 */
const getRelativeLuminance = (hex: string): number => {
	const normalized = normalizeHex(hex);
	const r = parseInt(normalized.slice(1, 3), 16) / 255;
	const g = parseInt(normalized.slice(3, 5), 16) / 255;
	const b = parseInt(normalized.slice(5, 7), 16) / 255;

	const srgbToLinear = (c: number) =>
		c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

	return (
		0.2126 * srgbToLinear(r) +
		0.7152 * srgbToLinear(g) +
		0.0722 * srgbToLinear(b)
	);
};

/**
 * コントラスト比を計算
 */
const getContrastRatio = (hex1: string, hex2: string): number => {
	const l1 = getRelativeLuminance(hex1);
	const l2 = getRelativeLuminance(hex2);
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
};

/**
 * 暖色系かどうかを判定
 */
const isWarmHue = (cluster: HueCluster): boolean => {
	return ["warm_red_orange", "yellow", "brown"].includes(cluster);
};

/**
 * 寒色系かどうかを判定
 */
const isCoolHue = (cluster: HueCluster): boolean => {
	return ["green", "cyan_sky", "blue", "magenta_purple"].includes(cluster);
};

/**
 * CUDセット外チェック（タスク6.2）
 */
const checkNotInCudSet = (palette: PaletteColor[]): ValidationIssue[] => {
	const issues: ValidationIssue[] = [];

	for (const color of palette) {
		const hex = normalizeHex(color.hex);
		const exactMatch = findExactCudColorByHex(hex);

		if (!exactMatch) {
			const nearest = findNearestCudColor(hex);
			if (nearest.matchLevel !== "exact") {
				issues.push({
					type: "not_in_cud_set",
					severity: "warning",
					message: `${hex} はCUD推奨色セットに含まれていません。最も近いCUD色は ${nearest.nearest.nameJa}（${nearest.nearest.hex}）です。`,
					colors: [hex],
					details: {
						nearestId: nearest.nearest.id,
						nearestHex: nearest.nearest.hex,
						deltaE: nearest.deltaE,
					},
				});
			}
		}
	}

	return issues;
};

/**
 * コントラストチェック（タスク6.3）
 */
const checkContrast = (
	palette: PaletteColor[],
	options: ValidationOptions,
): ValidationIssue[] => {
	const issues: ValidationIssue[] = [];

	const textColors = palette.filter(
		(c) => c.role === "text" || c.role === "accent",
	);
	const backgrounds = palette.filter((c) => c.role === "background");

	if (backgrounds.length === 0) {
		return issues; // 背景色がない場合はスキップ
	}

	const threshold =
		options.assumeSmallText || options.context === "chart"
			? THRESHOLDS.contrastSmall
			: THRESHOLDS.contrastNormal;

	for (const textColor of textColors) {
		for (const bgColor of backgrounds) {
			const ratio = getContrastRatio(textColor.hex, bgColor.hex);

			if (ratio < threshold) {
				const issueType =
					options.assumeSmallText || options.context === "chart"
						? "small_text_low_contrast"
						: "low_contrast";

				issues.push({
					type: issueType,
					severity: "error",
					message: `${textColor.hex} と ${bgColor.hex} のコントラスト比が ${ratio.toFixed(2)}:1 で、基準（${threshold}:1）を下回っています。`,
					colors: [textColor.hex, bgColor.hex],
					details: {
						contrastRatio: ratio,
						threshold,
					},
				});
			}
		}
	}

	return issues;
};

/**
 * CVD混同リスクチェック（タスク6.4）
 */
const checkCvdConfusionRisk = (palette: PaletteColor[]): ValidationIssue[] => {
	const issues: ValidationIssue[] = [];

	// 色のペアを生成
	for (let i = 0; i < palette.length; i++) {
		for (let j = i + 1; j < palette.length; j++) {
			const color1 = palette[i];
			const color2 = palette[j];
			if (!color1 || !color2) continue;

			const hex1 = normalizeHex(color1.hex);
			const hex2 = normalizeHex(color2.hex);

			// 一般色覚でのdeltaE
			const oklab1 = toOklab(hex1);
			const oklab2 = toOklab(hex2);
			if (!oklab1 || !oklab2) continue;

			const normalDeltaE = deltaEok(oklab1, oklab2);

			// 十分に区別可能な場合のみCVDチェック
			if (normalDeltaE >= THRESHOLDS.distinguishable) {
				// Protan/Deutanシミュレーション
				for (const cvdType of ["protan", "deutan"] as const) {
					const sim1 = simulateCvdWithFormats(hex1, cvdType);
					const sim2 = simulateCvdWithFormats(hex2, cvdType);

					const simOklab1 = { mode: "oklab" as const, ...sim1.oklab };
					const simOklab2 = { mode: "oklab" as const, ...sim2.oklab };
					const cvdDeltaE = deltaEok(simOklab1, simOklab2);

					if (cvdDeltaE < THRESHOLDS.cvdConfusion) {
						issues.push({
							type: "cvd_confusion_risk",
							severity: "warning",
							message: `${hex1} と ${hex2} は ${cvdType === "protan" ? "P型" : "D型"}色覚では混同される可能性があります（シミュレーション後ΔE=${cvdDeltaE.toFixed(3)}）。`,
							colors: [hex1, hex2],
							details: {
								cvdType,
								normalDeltaE,
								cvdDeltaE,
								simulated1: sim1.hex,
								simulated2: sim2.hex,
							},
						});
					}
				}
			}
		}
	}

	return issues;
};

/**
 * 類似色チェック（タスク6.5）
 */
const checkSimilarColors = (palette: PaletteColor[]): ValidationIssue[] => {
	const issues: ValidationIssue[] = [];

	for (let i = 0; i < palette.length; i++) {
		for (let j = i + 1; j < palette.length; j++) {
			const color1 = palette[i];
			const color2 = palette[j];
			if (!color1 || !color2) continue;

			const hex1 = normalizeHex(color1.hex);
			const hex2 = normalizeHex(color2.hex);

			const oklab1 = toOklab(hex1);
			const oklab2 = toOklab(hex2);
			if (!oklab1 || !oklab2) continue;

			const deltaE = deltaEok(oklab1, oklab2);

			// 非常に類似している場合
			if (deltaE < THRESHOLDS.similar) {
				issues.push({
					type: "too_similar",
					severity: "warning",
					message: `${hex1} と ${hex2} は非常に類似しています（ΔE=${deltaE.toFixed(3)}）。`,
					colors: [hex1, hex2],
					details: { deltaE },
				});
			}
		}
	}

	// yellow/yellow_green + 高明度の組み合わせチェック
	const classifications = palette.map((c) => {
		const nearest = findNearestCudColor(c.hex);
		return {
			...c,
			classification: classifyColor(nearest.nearest.oklch),
		};
	});

	const yellowHighLight = classifications.filter(
		(c) =>
			(c.classification.hueCluster === "yellow" ||
				c.classification.hueCluster === "yellow_green") &&
			(c.classification.lightnessBucket === "very_light" ||
				c.classification.lightnessBucket === "light"),
	);

	if (yellowHighLight.length >= 2) {
		issues.push({
			type: "confusable_yellow_green",
			severity: "warning",
			message: `黄色系・黄緑系の高明度色が${yellowHighLight.length}色あり、混同リスクがあります。`,
			colors: yellowHighLight.map((c) => normalizeHex(c.hex)),
			details: {
				count: yellowHighLight.length,
			},
		});
	}

	return issues;
};

/**
 * 役割・良い例チェック（タスク6.6）
 */
const checkRoleAndGoodExample = (
	palette: PaletteColor[],
): ValidationIssue[] => {
	const issues: ValidationIssue[] = [];

	// 分類情報を取得
	const classifications = palette.map((c) => {
		const nearest = findNearestCudColor(c.hex);
		return {
			...c,
			hueCluster: classifyHue(nearest.nearest.oklch),
			lightness: nearest.nearest.oklch.l,
		};
	});

	// 暖色アクセント + 寒色ベース + 明度差の良い例パターンをチェック
	const accents = classifications.filter((c) => c.role === "accent");
	const bases = classifications.filter((c) => c.role === "base");

	const warmAccents = accents.filter((c) => isWarmHue(c.hueCluster));
	const coolBases = bases.filter((c) => isCoolHue(c.hueCluster));

	if (warmAccents.length > 0 && coolBases.length > 0) {
		// 明度差をチェック
		const accentLightness = warmAccents.map((c) => c.lightness);
		const baseLightness = coolBases.map((c) => c.lightness);

		const minAccentL = Math.min(...accentLightness);
		const maxBaseL = Math.max(...baseLightness);

		if (Math.abs(maxBaseL - minAccentL) >= 0.2) {
			issues.push({
				type: "cud_good_example_like",
				severity: "info",
				message:
					"暖色アクセント + 寒色ベース + 適切な明度差があり、CUD推奨パターンに近い構成です。",
				colors: [
					...warmAccents.map((c) => normalizeHex(c.hex)),
					...coolBases.map((c) => normalizeHex(c.hex)),
				],
				details: {
					warmAccentCount: warmAccents.length,
					coolBaseCount: coolBases.length,
					lightnessDiff: Math.abs(maxBaseL - minAccentL),
				},
			});
		}
	}

	return issues;
};

/**
 * パレットを検証する
 *
 * @param palette - 検証対象のパレット
 * @param options - 検証オプション
 * @returns 検証結果
 */
export const validatePalette = (
	palette: PaletteColor[],
	options: ValidationOptions = {},
): ValidationResult => {
	const issues: ValidationIssue[] = [];

	// 各チェックを実行
	issues.push(...checkNotInCudSet(palette));
	issues.push(...checkContrast(palette, options));
	issues.push(...checkCvdConfusionRisk(palette));
	issues.push(...checkSimilarColors(palette));
	issues.push(...checkRoleAndGoodExample(palette));

	// 結果を集計
	const errorCount = issues.filter((i) => i.severity === "error").length;
	const warningCount = issues.filter((i) => i.severity === "warning").length;
	const infoCount = issues.filter((i) => i.severity === "info").length;

	const ok = errorCount === 0;

	let summary: string;
	if (ok && warningCount === 0) {
		summary = "パレットはCUD推奨基準を満たしています。";
	} else if (ok) {
		summary = `${warningCount}件の警告があります。`;
	} else {
		summary = `${errorCount}件のエラーと${warningCount}件の警告があります。`;
	}

	if (infoCount > 0) {
		summary += ` ${infoCount}件の情報があります。`;
	}

	return {
		ok,
		summary,
		issues,
	};
};

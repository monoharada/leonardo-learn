/**
 * ThemePreview - テーマ切替と修正提案表示
 *
 * ライト/ダークモードのプレビュー切り替えと
 * アクセシビリティ違反箇所のハイライト・修正提案を提供します。
 */

import { Color } from "../color";
import type { ToneScale } from "../strategies/m3-generator";
import type { AccessibilityWarning, ScalePreviewData } from "./scale-preview";
import { generateScalePreview } from "./scale-preview";

/**
 * テーマモード
 */
export type ThemeMode = "light" | "dark";

/**
 * テーマプレビュー設定
 */
export interface ThemePreviewConfig {
	/** テーマモード */
	mode: ThemeMode;
	/** 背景色 */
	backgroundColor: Color;
	/** 前景色（テキスト） */
	foregroundColor: Color;
	/** サーフェス色 */
	surfaceColor: Color;
}

/**
 * テーマプレビューデータ
 */
export interface ThemePreviewData {
	/** テーマモード */
	mode: ThemeMode;
	/** 設定 */
	config: ThemePreviewConfig;
	/** スケールプレビュー */
	scales: ScalePreviewData[];
	/** 全体の警告 */
	warnings: AccessibilityWarning[];
	/** 修正提案 */
	suggestions: FixSuggestion[];
}

/**
 * 修正提案
 */
export interface FixSuggestion {
	/** 対象ロール */
	role: string;
	/** 対象トーン */
	tone: number;
	/** 問題の説明 */
	issue: string;
	/** 提案内容 */
	suggestion: string;
	/** 推奨される新しい値 */
	recommendedValue?: {
		l?: number;
		c?: number;
		h?: number;
	};
	/** 優先度 */
	priority: "high" | "medium" | "low";
}

/**
 * デフォルトのライトテーマ設定
 */
export const DEFAULT_LIGHT_THEME: ThemePreviewConfig = {
	mode: "light",
	backgroundColor: new Color({ mode: "oklch", l: 0.99, c: 0, h: 0 }),
	foregroundColor: new Color({ mode: "oklch", l: 0.1, c: 0, h: 0 }),
	surfaceColor: new Color({ mode: "oklch", l: 0.95, c: 0, h: 0 }),
};

/**
 * デフォルトのダークテーマ設定
 */
export const DEFAULT_DARK_THEME: ThemePreviewConfig = {
	mode: "dark",
	backgroundColor: new Color({ mode: "oklch", l: 0.1, c: 0, h: 0 }),
	foregroundColor: new Color({ mode: "oklch", l: 0.95, c: 0, h: 0 }),
	surfaceColor: new Color({ mode: "oklch", l: 0.2, c: 0, h: 0 }),
};

/**
 * テーマプレビューを生成する
 *
 * @param scales - トーンスケールのレコード
 * @param mode - テーマモード
 * @returns テーマプレビューデータ
 */
export function generateThemePreview(
	scales: Record<string, ToneScale>,
	mode: ThemeMode = "light",
): ThemePreviewData {
	const config = mode === "light" ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME;

	// 各スケールのプレビューを生成
	const scalePreviewData: ScalePreviewData[] =
		Object.values(scales).map(generateScalePreview);

	// 全体の警告を収集
	const allWarnings: AccessibilityWarning[] = [];
	for (const preview of scalePreviewData) {
		allWarnings.push(...preview.warnings);
	}

	// 修正提案を生成
	const suggestions = generateFixSuggestions(scalePreviewData, config);

	return {
		mode,
		config,
		scales: scalePreviewData,
		warnings: allWarnings,
		suggestions,
	};
}

/**
 * 修正提案を生成する
 */
function generateFixSuggestions(
	scales: ScalePreviewData[],
	config: ThemePreviewConfig,
): FixSuggestion[] {
	const suggestions: FixSuggestion[] = [];

	for (const scale of scales) {
		for (const shade of scale.shades) {
			const shadeSuggestions = generateShadeSuggestions(
				scale.role,
				shade,
				config,
			);
			suggestions.push(...shadeSuggestions);
		}
	}

	// 優先度でソート
	suggestions.sort((a, b) => {
		const priorityOrder = { high: 0, medium: 1, low: 2 };
		return priorityOrder[a.priority] - priorityOrder[b.priority];
	});

	return suggestions;
}

/**
 * シェードの修正提案を生成する
 */
function generateShadeSuggestions(
	role: string,
	shade: {
		tone: number;
		color: Color;
		primaryUsage: string;
		contrastWithWhite: number;
		contrastWithBlack: number;
	},
	config: ThemePreviewConfig,
): FixSuggestion[] {
	const suggestions: FixSuggestion[] = [];
	const { tone, color, primaryUsage, contrastWithWhite, contrastWithBlack } =
		shade;
	const currentL = color.oklch.l;

	// ライトモードでのテキスト用途
	if (config.mode === "light") {
		if (
			(primaryUsage === "text" || primaryUsage === "icon") &&
			contrastWithWhite < 4.5
		) {
			// コントラスト比を4.5以上にするためのLightness計算
			const targetL = calculateTargetLightness(
				contrastWithWhite,
				4.5,
				currentL,
				"darker",
			);

			suggestions.push({
				role,
				tone,
				issue: `白背景でのコントラストが不足（${contrastWithWhite.toFixed(2)}:1）`,
				suggestion: `Lightnessを${(currentL * 100).toFixed(0)}%から${(targetL * 100).toFixed(0)}%に下げることを推奨`,
				recommendedValue: { l: targetL },
				priority: "high",
			});
		}
	}

	// ダークモードでの背景用途
	if (config.mode === "dark") {
		if (
			(primaryUsage === "background" || primaryUsage === "surface") &&
			contrastWithBlack < 4.5
		) {
			const targetL = calculateTargetLightness(
				contrastWithBlack,
				4.5,
				currentL,
				"lighter",
			);

			suggestions.push({
				role,
				tone,
				issue: `黒背景でのコントラストが不足（${contrastWithBlack.toFixed(2)}:1）`,
				suggestion: `Lightnessを${(currentL * 100).toFixed(0)}%から${(targetL * 100).toFixed(0)}%に上げることを推奨`,
				recommendedValue: { l: targetL },
				priority: "high",
			});
		}
	}

	// 中間コントラストの警告
	if (contrastWithWhite < 3 && contrastWithBlack < 3) {
		suggestions.push({
			role,
			tone,
			issue: "白黒どちらの背景でも十分なコントラストがない",
			suggestion:
				"このシェードは大きなテキストや装飾要素にのみ使用してください",
			priority: "medium",
		});
	}

	return suggestions;
}

/**
 * 目標コントラスト比を達成するためのLightnessを計算する
 *
 * 注: 簡略化した計算。実際のコントラスト比はより複雑
 */
function calculateTargetLightness(
	currentContrast: number,
	targetContrast: number,
	currentL: number,
	direction: "lighter" | "darker",
): number {
	// コントラスト比の比率から調整量を推定
	const ratio = targetContrast / Math.max(currentContrast, 0.1);
	const adjustment = (ratio - 1) * 0.15;

	if (direction === "darker") {
		return Math.max(currentL - adjustment, 0.05);
	}
	return Math.min(currentL + adjustment, 0.95);
}

/**
 * テーマを切り替える
 *
 * @param currentPreview - 現在のプレビュー
 * @param newMode - 新しいテーマモード
 * @param scales - トーンスケールのレコード
 * @returns 新しいテーマプレビューデータ
 */
export function switchTheme(
	scales: Record<string, ToneScale>,
	newMode: ThemeMode,
): ThemePreviewData {
	return generateThemePreview(scales, newMode);
}

/**
 * アクセシビリティ違反をハイライトする情報を取得
 *
 * @param preview - テーマプレビューデータ
 * @returns ハイライト情報
 */
export function getAccessibilityHighlights(preview: ThemePreviewData): Array<{
	role: string;
	tone: number;
	level: "error" | "warning" | "info";
}> {
	const highlights: Array<{
		role: string;
		tone: number;
		level: "error" | "warning" | "info";
	}> = [];

	for (const scale of preview.scales) {
		for (const warning of scale.warnings) {
			highlights.push({
				role: scale.role,
				tone: warning.tone,
				level: warning.level,
			});
		}
	}

	return highlights;
}

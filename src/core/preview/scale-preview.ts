/**
 * ScalePreview - スケールプレビューとアクセシビリティ表示
 *
 * 生成されたカラースケールの視覚的プレビューデータと
 * WCAG準拠状態のインジケーターを提供します。
 */

import type { Color } from "../color";
import type { ToneScale } from "../strategies/m3-generator";
import type { RoleAssignment, UsageRole } from "../system/role-assigner";
import { RoleAssigner } from "../system/role-assigner";

/**
 * WCAG準拠レベル
 */
export type WCAGLevel = "AAA" | "AA" | "AA-Large" | "Fail";

/**
 * シェードプレビュー情報
 */
export interface ShadePreview {
	/** トーン値 */
	tone: number;
	/** カラー */
	color: Color;
	/** hex値 */
	hex: string;
	/** OKLCH値 */
	oklch: {
		l: number;
		c: number;
		h: number | null;
	};
	/** 白背景でのWCAG準拠レベル */
	wcagOnWhite: WCAGLevel;
	/** 黒背景でのWCAG準拠レベル */
	wcagOnBlack: WCAGLevel;
	/** 白に対するコントラスト比 */
	contrastWithWhite: number;
	/** 黒に対するコントラスト比 */
	contrastWithBlack: number;
	/** プライマリ用途 */
	primaryUsage: UsageRole;
	/** セカンダリ用途 */
	secondaryUsage?: UsageRole;
}

/**
 * スケールプレビュー情報
 */
export interface ScalePreviewData {
	/** ロール名 */
	role: string;
	/** ソースカラー */
	sourceColor: Color;
	/** シェードプレビュー配列 */
	shades: ShadePreview[];
	/** アクセシビリティ警告 */
	warnings: AccessibilityWarning[];
}

/**
 * アクセシビリティ警告
 */
export interface AccessibilityWarning {
	/** 警告タイプ */
	type: "contrast" | "collision" | "gamut";
	/** 警告レベル */
	level: "error" | "warning" | "info";
	/** 対象トーン */
	tone: number;
	/** メッセージ */
	message: string;
	/** 修正提案 */
	suggestion?: string;
}

/**
 * コントラスト比からWCAGレベルを判定する
 */
function getWCAGLevel(contrast: number): WCAGLevel {
	if (contrast >= 7) return "AAA";
	if (contrast >= 4.5) return "AA";
	if (contrast >= 3) return "AA-Large";
	return "Fail";
}

/**
 * スケールプレビューを生成する
 *
 * @param scale - トーンスケール
 * @returns スケールプレビューデータ
 */
export function generateScalePreview(scale: ToneScale): ScalePreviewData {
	const assigner = new RoleAssigner();
	const assignments = assigner.assign(scale);

	const shades: ShadePreview[] = [];
	const warnings: AccessibilityWarning[] = [];

	for (const assignment of assignments) {
		const shade = createShadePreview(assignment);
		shades.push(shade);

		// アクセシビリティ警告をチェック
		const shadeWarnings = checkAccessibilityWarnings(assignment);
		warnings.push(...shadeWarnings);
	}

	return {
		role: scale.role,
		sourceColor: scale.sourceColor,
		shades,
		warnings,
	};
}

/**
 * RoleAssignmentからShadePreviewを作成する
 */
function createShadePreview(assignment: RoleAssignment): ShadePreview {
	const { tone, color, primaryUsage, secondaryUsage } = assignment;
	const oklch = color.oklch;

	return {
		tone,
		color,
		hex: color.toHex(),
		oklch: {
			l: oklch.l,
			c: oklch.c,
			h: oklch.h ?? null,
		},
		wcagOnWhite: getWCAGLevel(assignment.contrastWithWhite),
		wcagOnBlack: getWCAGLevel(assignment.contrastWithBlack),
		contrastWithWhite: assignment.contrastWithWhite,
		contrastWithBlack: assignment.contrastWithBlack,
		primaryUsage,
		secondaryUsage,
	};
}

/**
 * アクセシビリティ警告をチェックする
 */
function checkAccessibilityWarnings(
	assignment: RoleAssignment,
): AccessibilityWarning[] {
	const warnings: AccessibilityWarning[] = [];
	const { tone, primaryUsage, contrastWithWhite, contrastWithBlack } =
		assignment;

	// テキスト用途で白背景との十分なコントラストがない場合
	if (
		(primaryUsage === "text" || primaryUsage === "icon") &&
		contrastWithWhite < 4.5
	) {
		warnings.push({
			type: "contrast",
			level: "error",
			tone,
			message: `トーン${tone}は白背景でのテキスト用途に十分なコントラストがありません（${contrastWithWhite.toFixed(2)}:1）`,
			suggestion: "より暗いシェードを使用するか、Lightnessを下げてください",
		});
	}

	// 背景用途で黒テキストとの十分なコントラストがない場合
	if (
		(primaryUsage === "background" || primaryUsage === "surface") &&
		contrastWithBlack < 4.5
	) {
		warnings.push({
			type: "contrast",
			level: "error",
			tone,
			message: `トーン${tone}は黒テキストとの十分なコントラストがありません（${contrastWithBlack.toFixed(2)}:1）`,
			suggestion: "より明るいシェードを使用するか、Lightnessを上げてください",
		});
	}

	// 中間トーンでのコントラスト警告
	if (
		tone >= 40 &&
		tone <= 60 &&
		contrastWithWhite < 3 &&
		contrastWithBlack < 3
	) {
		warnings.push({
			type: "contrast",
			level: "warning",
			tone,
			message: `トーン${tone}は白黒どちらの背景でも十分なコントラストがありません`,
			suggestion: "大きなテキストや装飾要素にのみ使用することを推奨します",
		});
	}

	return warnings;
}

/**
 * 複数スケールのプレビューを生成する
 *
 * @param scales - ロール名とトーンスケールのレコード
 * @returns スケールプレビューデータの配列
 */
export function generateMultiScalePreview(
	scales: Record<string, ToneScale>,
): ScalePreviewData[] {
	return Object.values(scales).map(generateScalePreview);
}

/**
 * シェードの詳細情報を取得する
 *
 * @param shade - シェードプレビュー
 * @returns 詳細情報の文字列
 */
export function getShadeDetails(shade: ShadePreview): string {
	const lines = [
		`トーン: ${shade.tone}`,
		`Hex: ${shade.hex}`,
		`OKLCH: L=${(shade.oklch.l * 100).toFixed(1)}% C=${shade.oklch.c.toFixed(3)} H=${shade.oklch.h?.toFixed(1) ?? "N/A"}`,
		`白背景コントラスト: ${shade.contrastWithWhite.toFixed(2)}:1 (${shade.wcagOnWhite})`,
		`黒背景コントラスト: ${shade.contrastWithBlack.toFixed(2)}:1 (${shade.wcagOnBlack})`,
		`推奨用途: ${shade.primaryUsage}${shade.secondaryUsage ? `, ${shade.secondaryUsage}` : ""}`,
	];

	return lines.join("\n");
}

/**
 * デモ機能の型定義
 *
 * demo機能で使用する全型定義を一元管理する。
 * 他モジュールから参照される基盤モジュール。
 *
 * @module @/ui/demo/types
 * Requirements: 6.1
 */

import type { CVDType } from "@/accessibility/cvd-simulator";
import type { HarmonyFilterType } from "@/core/accent/harmony-filter-calculator";
import type { Color } from "@/core/color";
import type { HarmonyType } from "@/core/harmony";
import type { CudCompatibilityMode } from "@/ui/cud-components";
import type { ContrastIntensity } from "@/ui/style-constants";

/** キーカラーとステップの組み合わせ（ステップは50, 100, 200, ..., 1200） */
export interface KeyColorWithStep {
	color: string;
	step?: number;
}

export interface PaletteConfig {
	id: string;
	name: string;
	/** キーカラー配列 Format: "#hex" or "#hex@step" (e.g., "#b3e5fc@300") */
	keyColors: string[];
	ratios: number[];
	harmony: HarmonyType;
	/** 基本クロマ名（セマンティックカラー用） */
	baseChromaName?: string;
	/** DADSモード用のステップ番号（600, 800等） */
	step?: number;
	/**
	 * 導出元情報（Secondary/Tertiaryパレット用）
	 * Primaryから派生したパレットの場合に設定
	 */
	derivedFrom?: {
		/** 派生元のプライマリパレットID */
		primaryPaletteId: string;
		/** 導出タイプ（secondary または tertiary） */
		derivationType: "secondary" | "tertiary";
	};
}

export type LightnessDistribution = "linear" | "easeIn" | "easeOut";

/** 背景色のモード。OKLCH明度（L値）で自動判定: L > 0.5 → light, L <= 0.5 → dark */
export type ColorMode = "light" | "dark";

/** 背景色入力のバリデーション結果 */
export interface BackgroundColorValidationResult {
	valid: boolean;
	error?: string;
	hex?: string;
}

export type StudioPresetType =
	| "default"
	| "high-contrast"
	| "pastel"
	| "vibrant"
	| "dark";

/**
 * Studioテーマタイプ
 *
 * - pinpoint: 最小限の色使い（ボタンのみPrimary、リンクはDADS青）
 * - hero: ヒーローエリアに薄い色（現状・デフォルト）
 * - branding: ブランドカラーをふんだんに使う
 */
export type StudioTheme = "pinpoint" | "hero" | "branding";

export interface LockedColorsState {
	background: boolean;
	text: boolean;
	primary: boolean;
	accent: boolean;
	error: boolean;
	success: boolean;
	warning: boolean;
}

export interface PreviewKvState {
	locked: boolean;
	seed: number;
}

export type ViewMode =
	| "harmony"
	| "palette"
	| "shades"
	| "accessibility"
	| "studio";

/** 警告色パターン: yellow, orange, or auto (CUD分析に基づく自動選択) */
export type WarningPatternType = "yellow" | "orange" | "auto";

export interface WarningPatternAutoDetails {
	yellowScore: number;
	orangeScore: number;
	reason: string;
}

export interface SemanticColorConfig {
	warningPattern: WarningPatternType;
	resolvedWarningPattern?: "yellow" | "orange";
	autoSelectionDetails?: WarningPatternAutoDetails;
}

/** @deprecated Section 7以降はAccentHarmonyTypeConfigを使用 */
export interface HarmonyTypeConfig {
	id: string;
	name: string;
	description: string;
	harmonyType: HarmonyType;
	detail: string;
}

/** アクセント選定用ハーモニータイプ設定 */
export interface AccentHarmonyTypeConfig {
	id: HarmonyFilterType;
	name: string;
	description: string;
}

/** CVDシミュレーションタイプ。"normal"はシミュレーションなし。 */
export type CVDSimulationType = "normal" | CVDType;

/** デモ機能のグローバル状態 */
export interface DemoState {
	palettes: PaletteConfig[];
	shadesPalettes: PaletteConfig[];
	activeId: string;
	activeHarmonyIndex: number;
	contrastIntensity: ContrastIntensity;
	lightnessDistribution: LightnessDistribution;
	viewMode: ViewMode;
	cvdSimulation: CVDSimulationType;
	/** @deprecated Section 7以降はselectedAccentFilterを使用 */
	selectedHarmonyConfig: HarmonyTypeConfig | null;
	selectedAccentFilter: HarmonyFilterType;
	cudMode: CudCompatibilityMode;
	lightBackgroundColor: string;
	darkBackgroundColor: string;
	accentCount: 1 | 2 | 3;
	studioAccentCount: 2 | 3 | 4;
	semanticColorConfig: SemanticColorConfig;
	lockedColors: LockedColorsState;
	activePreset: StudioPresetType;
	studioSeed: number;
	previewKv: PreviewKvState;
	studioTheme: StudioTheme;
}

/** 色詳細モーダルのオプション */
export interface ColorDetailModalOptions {
	stepColor: Color;
	keyColor: Color;
	index: number;
	fixedScale: {
		colors: Color[];
		keyIndex: number;
		hexValues?: string[];
		names?: string[];
	};
	paletteInfo: {
		name: string;
		baseChromaName?: string;
		paletteId?: string;
		step?: number;
	};
	readOnly?: boolean;
	originalHex?: string;
}

/** キーカラーから@stepサフィックスを除去してHEX値のみを返す */
export function stripStepSuffix(keyColor: string): string {
	if (!keyColor) return "";
	return keyColor.split("@")[0] ?? keyColor;
}

// Re-exports for module convenience
export type { CVDType } from "@/accessibility/cvd-simulator";
export type { HarmonyFilterType } from "@/core/accent/harmony-filter-calculator";
export type { Color } from "@/core/color";
export type { HarmonyType } from "@/core/harmony";
export type { CudCompatibilityMode } from "@/ui/cud-components";
export type { ContrastIntensity } from "@/ui/style-constants";

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

/**
 * キーカラーとステップの組み合わせ
 * ステップは50, 100, 200, ..., 1200のトークン番号
 */
export interface KeyColorWithStep {
	color: string;
	step?: number;
}

/**
 * パレット設定
 */
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
}

/**
 * 明度分布タイプ
 */
export type LightnessDistribution = "linear" | "easeIn" | "easeOut";

/**
 * 背景色のモード（light/dark）
 * OKLCH明度（L値）で自動判定: L > 0.5 → light, L ≤ 0.5 → dark
 */
export type ColorMode = "light" | "dark";

/**
 * 背景色入力のバリデーション結果
 * @see Requirements: 1.4, 1.5
 */
export interface BackgroundColorValidationResult {
	/** バリデーション成功フラグ */
	valid: boolean;
	/** エラーメッセージ（valid=false時） */
	error?: string;
	/** 変換されたHEX値（valid=true時） */
	hex?: string;
}

/**
 * ビューモード
 */
export type ViewMode = "harmony" | "palette" | "shades" | "accessibility";

/**
 * 警告色パターンタイプ
 * - "yellow": 黄色系（Warning-YL1/YL2: yellow-700/900）
 * - "orange": オレンジ系（Warning-OR1/OR2: orange-600/800）
 * - "auto": CUD分析に基づく自動選択
 */
export type WarningPatternType = "yellow" | "orange" | "auto";

/**
 * 自動選択の詳細情報
 */
export interface WarningPatternAutoDetails {
	/** 黄色パターンのスコア（0-100） */
	yellowScore: number;
	/** オレンジパターンのスコア（0-100） */
	orangeScore: number;
	/** 選択理由の説明 */
	reason: string;
}

/**
 * セマンティックカラー設定
 * 警告色のパターン選択状態を管理
 */
export interface SemanticColorConfig {
	/** 選択された警告色パターン */
	warningPattern: WarningPatternType;
	/** 自動選択時に解決されたパターン（auto時のみ使用） */
	resolvedWarningPattern?: "yellow" | "orange";
	/** 自動選択の詳細情報（auto時のみ使用） */
	autoSelectionDetails?: WarningPatternAutoDetails;
}

/**
 * ハーモニータイプの設定（カード表示用）
 * @deprecated Section 7以降はAccentHarmonyTypeConfigを使用
 */
export interface HarmonyTypeConfig {
	id: string;
	name: string;
	description: string;
	harmonyType: HarmonyType;
	detail: string;
}

/**
 * アクセント選定用ハーモニータイプ設定
 * HarmonyFilterTypeベースのUI表示用メタデータ
 */
export interface AccentHarmonyTypeConfig {
	id: HarmonyFilterType;
	name: string;
	description: string;
}

/**
 * CVDシミュレーションタイプ
 * "normal"はシミュレーションなし、他はCVDType
 */
export type CVDSimulationType = "normal" | CVDType;

/**
 * デモ機能のグローバル状態
 */
export interface DemoState {
	palettes: PaletteConfig[];
	shadesPalettes: PaletteConfig[];
	activeId: string;
	activeHarmonyIndex: number;
	contrastIntensity: ContrastIntensity;
	lightnessDistribution: LightnessDistribution;
	viewMode: ViewMode;
	cvdSimulation: CVDSimulationType;
	/**
	 * @deprecated Section 7以降はselectedAccentFilterを使用
	 */
	selectedHarmonyConfig: HarmonyTypeConfig | null;
	/** 選択されたアクセントハーモニーフィルタ */
	selectedAccentFilter: HarmonyFilterType;
	cudMode: CudCompatibilityMode;
	/** ライト背景色（HEX形式、デフォルト: #ffffff） */
	lightBackgroundColor: string;
	/** ダーク背景色（HEX形式、デフォルト: #000000） */
	darkBackgroundColor: string;
	/** アクセントカラー数（2-5）。ブランド+アクセント=3-6色 */
	accentCount: 2 | 3 | 4 | 5;
	/** セマンティックカラー設定（警告色パターン選択） */
	semanticColorConfig: SemanticColorConfig;
}

/**
 * 色詳細モーダルのオプション
 * View→Feature間のコールバック型として共有層に配置
 */
export interface ColorDetailModalOptions {
	stepColor: Color;
	keyColor: Color;
	index: number;
	fixedScale: {
		colors: Color[];
		keyIndex: number;
		hexValues?: string[];
	};
	paletteInfo: {
		name: string;
		baseChromaName?: string;
		/** パレットID（名前編集時に必要） */
		paletteId?: string;
		/** DADSステップ番号（50, 100, ..., 1200） */
		step?: number;
	};
	readOnly?: boolean;
	/** クリックした色の元のHEX値 */
	originalHex?: string;
}

export type { CVDType } from "@/accessibility/cvd-simulator";
export type { HarmonyFilterType } from "@/core/accent/harmony-filter-calculator";
export type { Color } from "@/core/color";
/**
 * 外部型の再エクスポート
 * モジュール間の依存を簡潔にするため
 */
export type { HarmonyType } from "@/core/harmony";
export type { CudCompatibilityMode } from "@/ui/cud-components";
export type { ContrastIntensity } from "@/ui/style-constants";

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
 * ビューモード
 */
export type ViewMode = "harmony" | "palette" | "shades" | "accessibility";

/**
 * ハーモニータイプの設定（カード表示用）
 */
export interface HarmonyTypeConfig {
	id: string;
	name: string;
	description: string;
	harmonyType: HarmonyType;
	detail: string;
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
	selectedHarmonyConfig: HarmonyTypeConfig | null;
	cudMode: CudCompatibilityMode;
	/** 背景色（HEX形式、例: #ffffff） */
	backgroundColor: string;
	/** 背景色モード（light/dark） */
	backgroundMode: ColorMode;
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
	};
	readOnly?: boolean;
	/** クリックした色の元のHEX値 */
	originalHex?: string;
}

export type { CVDType } from "@/accessibility/cvd-simulator";
export type { Color } from "@/core/color";
/**
 * 外部型の再エクスポート
 * モジュール間の依存を簡潔にするため
 */
export type { HarmonyType } from "@/core/harmony";
export type { CudCompatibilityMode } from "@/ui/cud-components";
export type { ContrastIntensity } from "@/ui/style-constants";

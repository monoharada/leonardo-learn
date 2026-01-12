/**
 * デモ機能の定数定義
 *
 * ACCENT_HARMONY_TYPESとDEFAULT_STATEオブジェクトを一元管理する。
 * types.tsから型をインポートして型安全性を確保。
 *
 * @module @/ui/demo/constants
 * Requirements: 6.2, 4.2, 4.3
 */

import { HarmonyType } from "@/core/harmony";
import type {
	AccentHarmonyTypeConfig,
	DemoState,
	HarmonyTypeConfig,
	SemanticColorConfig,
} from "./types";

/**
 * アクセント選定用ハーモニータイプの設定一覧
 * HarmonyFilterTypeベースのUI表示用メタデータ
 *
 * Section 7: ハーモニービュー → アクセント選定ビュー置換
 */
export const ACCENT_HARMONY_TYPES: AccentHarmonyTypeConfig[] = [
	{
		id: "all",
		name: "すべて",
		description: "全てのアクセント候補を表示",
	},
	{
		id: "complementary",
		name: "補色",
		description: "色相環で正反対に位置する色",
	},
	{
		id: "triadic",
		name: "トライアド",
		description: "色相環で等間隔に配置された3色",
	},
	{
		id: "analogous",
		name: "類似色",
		description: "色相環で隣り合う色",
	},
	{
		id: "split-complementary",
		name: "分裂補色",
		description: "補色の両隣の色",
	},
];

/**
 * ハーモニータイプの設定一覧
 * UI表示用のメタデータを含む
 *
 * @deprecated Section 7以降はACCENT_HARMONY_TYPESを使用
 */
export const HARMONY_TYPES: HarmonyTypeConfig[] = [
	{
		id: "complementary",
		name: "Complementary",
		description: "補色",
		harmonyType: HarmonyType.COMPLEMENTARY,
		detail:
			"色相環で正反対に位置する色の組み合わせ。高いコントラストでインパクトのある配色を作れます。",
	},
	{
		id: "analogous",
		name: "Analogous",
		description: "類似色",
		harmonyType: HarmonyType.ANALOGOUS,
		detail:
			"色相環で隣り合う色の組み合わせ。自然で調和のとれた落ち着いた印象を与えます。",
	},
	{
		id: "triadic",
		name: "Triadic",
		description: "三角配色",
		harmonyType: HarmonyType.TRIADIC,
		detail:
			"色相環で等間隔に配置された3色の組み合わせ。バランスが良くバリエーション豊かな配色。",
	},
	{
		id: "split",
		name: "Split Comp.",
		description: "分裂補色",
		harmonyType: HarmonyType.SPLIT_COMPLEMENTARY,
		detail:
			"補色の両隣の色を使う配色。補色よりも柔らかいコントラストで使いやすい組み合わせ。",
	},
	{
		id: "tetradic",
		name: "Tetradic",
		description: "四角形",
		harmonyType: HarmonyType.TETRADIC,
		detail:
			"色相環で長方形を形成する4色の組み合わせ。2組の補色ペアで豊かな色彩表現が可能。",
	},
	{
		id: "square",
		name: "Square",
		description: "正方形",
		harmonyType: HarmonyType.SQUARE,
		detail:
			"色相環で正方形を形成する4色の組み合わせ。均等に配置された色でバランスの取れた配色。",
	},
	{
		id: "m3",
		name: "Material 3",
		description: "Material Design",
		harmonyType: HarmonyType.M3,
		detail:
			"Googleのデザインシステムに基づいたトーナルパレット。Primary、Secondary、Tertiaryの役割別カラー。",
	},
	{
		id: "dads",
		name: "DADS",
		description: "12色相",
		harmonyType: HarmonyType.DADS,
		detail:
			"12色相をベースにしたセマンティックカラーシステム。Success、Error、Warningなど用途別の色を自動生成。",
	},
];

/**
 * 色相名の英語表示名マッピング（DADS hue → display name）
 * palette-generator.ts と harmony-view.ts で共有
 */
export const HUE_DISPLAY_NAMES: Record<string, string> = {
	blue: "Blue",
	"light-blue": "Light Blue",
	cyan: "Cyan",
	green: "Green",
	lime: "Lime",
	yellow: "Yellow",
	orange: "Orange",
	red: "Red",
	magenta: "Magenta",
	purple: "Purple",
};

/**
 * セマンティックカラー設定のデフォルト値
 * 警告色はCUD分析に基づく自動選択をデフォルトとする
 */
export const DEFAULT_SEMANTIC_COLOR_CONFIG: SemanticColorConfig = {
	warningPattern: "auto",
};

/**
 * デモ機能の初期状態
 * state.tsのシングルトン初期化に使用
 */
export const DEFAULT_STATE: DemoState = {
	palettes: [],
	shadesPalettes: [],
	activeId: "",
	activeHarmonyIndex: 0,
	contrastIntensity: "moderate",
	lightnessDistribution: "linear",
	viewMode: "harmony",
	cvdSimulation: "normal",
	selectedHarmonyConfig: null,
	selectedAccentFilter: "all",
	cudMode: "guide",
	lightBackgroundColor: "#ffffff",
	darkBackgroundColor: "#000000",
	accentCount: 1,
	semanticColorConfig: DEFAULT_SEMANTIC_COLOR_CONFIG,
};

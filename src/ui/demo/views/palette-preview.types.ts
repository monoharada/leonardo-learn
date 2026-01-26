import type { PreviewKvState, StudioPresetType, StudioTheme } from "../types";

/**
 * プレビューセクションの種類
 */
export type PreviewSection = "nav" | "hero" | "cards" | "form" | "footer";

/**
 * プレビュー用カラーマッピング
 */
export interface PalettePreviewColors {
	// 基本色
	background: string;
	text: string;

	// Primary役割（ヘッドライン、CTAボタン）
	headline: string;
	headlineText: string; // コントラスト調整済みヘッドライン色
	button: string;
	buttonText: string;

	// Accent役割（カードアクセント）
	card: string;
	cardAccent: string;
	cardAccentText: string; // コントラスト調整済みカードタイトル色

	// セマンティック役割（正しい用途）
	link: string;
	linkText: string; // コントラスト調整済みリンク色
	error: string;
	success: string;
	warning: string;

	// Logo（装飾的）
	logo: string;
	logoText: string; // コントラスト調整済みロゴ色

	// UI要素
	border: string;
	inputBackground: string;
	footerBackground: string;
	footerText: string;
}

export interface PalettePreviewOptions {
	/** 表示用のHEX変換関数（例: CVDシミュレーション） */
	getDisplayHex?: (hex: string) => string;
	/** ヒーロー右側KV（装飾）の表示制御 */
	kv?: PreviewKvState;
	/** 複数アクセントの表示用（任意）。先頭がAccent 1想定。 */
	accentHexes?: string[];
	/** ターシャリーカラー（ヒーロー背景用） */
	tertiaryHex?: string;
	/** テーマタイプ（pinpoint / hero / branding） */
	theme?: StudioTheme;
	/** プリセットタイプ（パステル用の色調整に使用） */
	preset?: StudioPresetType;
}

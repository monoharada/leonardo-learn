import { wcagContrast } from "culori";
import { getContrastTextColor } from "@/ui/semantic-role/circular-swatch-transformer";
import type { StudioPresetType } from "../types";
import {
	adjustLightnessForContrast,
	createPastelColorPair,
	createSoftBorderColor,
} from "../utils/dads-snap";
import type { PalettePreviewColors } from "./palette-preview.types";

/**
 * WCAG AA準拠のコントラスト比閾値
 * - 4.5:1 for normal text
 * - 3:1 for large text (18pt+ or 14pt bold)
 */
const WCAG_AA_CONTRAST_THRESHOLD = 4.5;
const WCAG_AA_LARGE_TEXT_THRESHOLD = 3;

/**
 * イラスト内手元カードの最小コントラスト比
 * - 2.0: 同色で完全に消えるケースを確実に回避しつつ、過度に強い差にならない推奨値
 */
export const ILLUSTRATION_MIN_CONTRAST = 2.0;

/**
 * テキストに使用する色がコントラスト要件を満たすかチェックし、
 * 不十分な場合はフォールバック色を返す
 *
 * @param textColor - 使用したいテキスト色（HEX）
 * @param backgroundColor - 背景色（HEX）
 * @param isLargeText - 大きいテキストかどうか（ヘッドライン等）
 * @returns コントラストが十分な色、または調整後の色
 */
export function getTextSafeColor(
	textColor: string,
	backgroundColor: string,
	isLargeText = false,
): string {
	const threshold = isLargeText
		? WCAG_AA_LARGE_TEXT_THRESHOLD
		: WCAG_AA_CONTRAST_THRESHOLD;

	const contrast = wcagContrast(backgroundColor, textColor);

	// コントラストが十分なら元の色を使用
	if (contrast >= threshold) {
		return textColor;
	}

	// コントラスト不足の場合、背景に応じた適切な色を返す
	// 背景が明るい場合は黒系、暗い場合は白系にフォールバック
	const bgTextColor = getContrastTextColor(backgroundColor);
	return bgTextColor === "black" ? "#1A1A1A" : "#F5F5F5";
}

/**
 * イラスト内の手元カード色に対するコントラスト保証
 *
 * SVGイラスト（illustration-people.svg）内の手元カード（rgb(254,151,126) → accent3）が
 * テーブル面（--iv-accent）と同化して消える現象を防ぐため、
 * 背景に対する最小コントラストを確保するように色を調整する。
 *
 * 色相・彩度を維持し、明度のみを調整することで、配色の美しさを損なわない。
 *
 * 重要: CVDシミュレーションモードでは、cardColor と backgroundColor の両方が
 * getDisplayHex() で変換された表示色である必要がある。
 *
 * @param cardColor - イラスト用カード色（HEX、表示色変換済み）
 * @param backgroundColor - カードが載る背景色（HEX、表示色変換済み）。通常はテーブル面（--iv-accent）
 * @param minContrast - 最小コントラスト比（デフォルト: 2.0）
 * @returns 調整後の色（HEX）。既にコントラストを満たしている場合は元の色を返す
 */
export function ensureIllustrationCardContrast(
	cardColor: string,
	backgroundColor: string,
	minContrast: number,
): string {
	const contrast = wcagContrast(backgroundColor, cardColor) ?? 0;

	// 既にコントラストを満たしている場合は元の色を返す
	if (contrast >= minContrast) {
		return cardColor;
	}

	// コントラスト不足 → 明度調整で補正（色相・彩度は維持）
	return adjustLightnessForContrast(cardColor, backgroundColor, minContrast);
}

/**
 * カラーマッピング用入力
 */
export interface ColorMappingInput {
	primaryHex: string;
	accentHex: string;
	semanticColors: {
		error: string;
		success: string;
		warning: string;
		link: string;
	};
	backgroundColor: string;
	/** プリセットタイプ（パステル用の特別処理に使用） */
	preset?: StudioPresetType;
}

/**
 * パレット状態からプレビュー用カラーにマッピング
 *
 * 薄い色がテキストに使われても読めるよう、コントラスト自動調整を適用
 *
 * パステルプリセットの場合は「スマートカラーロール」を適用:
 * - パステル色を背景・装飾要素に使用
 * - 同じ色相の濃い色をテキスト・インタラクティブ要素に使用
 */
export function mapPaletteToPreviewColors(
	input: ColorMappingInput,
): PalettePreviewColors {
	const { primaryHex, accentHex, semanticColors, backgroundColor, preset } =
		input;

	// 背景色に対するテキスト色を計算
	const textColorName = getContrastTextColor(backgroundColor);

	// "black" / "white" を HEX に変換
	const textColor = textColorName === "black" ? "#000000" : "#FFFFFF";

	// フッター用の暗い色（テキスト色をベースに）
	const footerBg = textColorName === "black" ? "#1A1A1A" : "#F5F5F5";
	const footerText = textColorName === "black" ? "#FFFFFF" : "#1A1A1A";

	// パステルプリセット用のスマートカラーロール
	if (preset === "pastel") {
		// パステル色から背景用/テキスト用のペアを生成
		const primaryPair = createPastelColorPair(primaryHex, backgroundColor, 4.5);
		const accentPair = createPastelColorPair(accentHex, backgroundColor, 4.5);
		const linkPair = createPastelColorPair(
			semanticColors.link,
			backgroundColor,
			4.5,
		);

		// カード背景: パステル色を薄くして使用
		const cardBg = primaryPair.background;

		// ボタンテキスト色を計算（濃い色に対して）
		const buttonTextColorName = getContrastTextColor(primaryPair.text);
		const buttonTextColor =
			buttonTextColorName === "black" ? "#000000" : "#FFFFFF";

		// リンク色をカード背景に対してもコントラスト確認
		// ストリップ内のリンク行はカード背景上に表示されるため
		const linkOnCardContrast = wcagContrast(cardBg, linkPair.text);
		const safeLinkColor =
			linkOnCardContrast >= WCAG_AA_CONTRAST_THRESHOLD
				? linkPair.text
				: adjustLightnessForContrast(
						linkPair.text,
						cardBg,
						WCAG_AA_CONTRAST_THRESHOLD,
					);

		// 見出し色もカード背景に対してコントラスト確認（カード内見出し用）
		const headlineOnCardContrast = wcagContrast(cardBg, primaryPair.text);
		const safeHeadlineColor =
			headlineOnCardContrast >= WCAG_AA_LARGE_TEXT_THRESHOLD
				? primaryPair.text
				: adjustLightnessForContrast(
						primaryPair.text,
						cardBg,
						WCAG_AA_LARGE_TEXT_THRESHOLD,
					);

		return {
			// 基本色
			background: backgroundColor,
			text: textColor,

			// Primary役割: テキストには濃い色、背景にはパステル色
			headline: safeHeadlineColor, // カード背景にも対応した濃い色
			headlineText: safeHeadlineColor,
			button: primaryPair.text, // ボタンはページ背景上なので元のまま
			buttonText: buttonTextColor,

			// Accent役割: カード背景にパステル色
			card: cardBg,
			cardAccent: accentPair.text, // 濃い色
			cardAccentText: accentPair.text,

			// セマンティック役割
			link: safeLinkColor, // カード背景にも対応した濃い色
			linkText: safeLinkColor,
			error: semanticColors.error,
			success: semanticColors.success,
			warning: semanticColors.warning,

			// Logo: 濃い色
			logo: primaryPair.text,
			logoText: primaryPair.text,

			// UI要素: パステル色から柔らかいボーダー色を生成
			border: createSoftBorderColor(primaryPair.background),
			inputBackground: backgroundColor,
			footerBackground: footerBg,
			footerText,
		};
	}

	// 通常のマッピング（パステル以外のプリセット）
	const buttonTextColorName = getContrastTextColor(primaryHex);
	const buttonTextColor =
		buttonTextColorName === "black" ? "#000000" : "#FFFFFF";

	// カード背景色
	// DADS neutralに寄せる（白背景ならgray-50をカード/ボックスの面に使用）
	const cardBg = backgroundColor === "#FFFFFF" ? "#F2F2F2" : "#FFFFFF";

	// コントラスト調整済みのテキスト色を計算
	// - headlineText: ヘッドライン（大きいテキスト）用
	// - cardAccentText: カードタイトル用
	// - linkText: リンクテキスト用
	// - logoText: ロゴ用
	const headlineText = getTextSafeColor(primaryHex, backgroundColor, true);
	const cardAccentText = getTextSafeColor(accentHex, cardBg, false);
	const linkText = getTextSafeColor(
		semanticColors.link,
		backgroundColor,
		false,
	);
	const logoText = getTextSafeColor(primaryHex, backgroundColor, true);

	return {
		// 基本色
		background: backgroundColor,
		text: textColor,

		// Primary役割
		headline: primaryHex,
		headlineText,
		button: primaryHex,
		buttonText: buttonTextColor,

		// Accent役割
		card: cardBg,
		cardAccent: accentHex,
		cardAccentText,

		// セマンティック役割（正しい用途）
		link: semanticColors.link,
		linkText,
		error: semanticColors.error,
		success: semanticColors.success,
		warning: semanticColors.warning,

		// Logo
		logo: primaryHex,
		logoText,

		// UI要素
		border: backgroundColor === "#FFFFFF" ? "#E0E0E0" : "#3A3A3A",
		inputBackground: backgroundColor,
		footerBackground: footerBg,
		footerText,
	};
}

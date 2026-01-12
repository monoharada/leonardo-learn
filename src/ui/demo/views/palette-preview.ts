/**
 * パレットプレビュー（擬似ファーストビュー）
 * Happy Hues風の実用的なWebサイトプレビューを生成
 *
 * セマンティックカラーの役割:
 * - Error → エラーメッセージ、バリデーションエラー
 * - Success → 成功メッセージ
 * - Warning → 警告表示
 * - Link → リンクテキスト
 * - Primary → ヘッドライン、CTAボタン
 * - Accent → カード背景、アクセント要素
 */

import { wcagContrast } from "culori";
import { getContrastTextColor } from "@/ui/semantic-role/circular-swatch-transformer";

/**
 * WCAG AA準拠のコントラスト比閾値
 * - 4.5:1 for normal text
 * - 3:1 for large text (18pt+ or 14pt bold)
 */
const WCAG_AA_CONTRAST_THRESHOLD = 4.5;
const WCAG_AA_LARGE_TEXT_THRESHOLD = 3;

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
}

/**
 * パレット状態からプレビュー用カラーにマッピング
 *
 * 薄い色がテキストに使われても読めるよう、コントラスト自動調整を適用
 */
export function mapPaletteToPreviewColors(
	input: ColorMappingInput,
): PalettePreviewColors {
	const { primaryHex, accentHex, semanticColors, backgroundColor } = input;

	// 背景色に対するテキスト色を計算
	const textColorName = getContrastTextColor(backgroundColor);
	const buttonTextColorName = getContrastTextColor(primaryHex);

	// "black" / "white" を HEX に変換
	const textColor = textColorName === "black" ? "#000000" : "#FFFFFF";
	const buttonTextColor =
		buttonTextColorName === "black" ? "#000000" : "#FFFFFF";

	// フッター用の暗い色（テキスト色をベースに）
	const footerBg = textColorName === "black" ? "#1A1A1A" : "#F5F5F5";
	const footerText = textColorName === "black" ? "#FFFFFF" : "#1A1A1A";

	// カード背景色
	const cardBg = backgroundColor === "#FFFFFF" ? "#F8F8F8" : "#FFFFFF";

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
		headlineText: headlineText,
		button: primaryHex,
		buttonText: buttonTextColor,

		// Accent役割
		card: cardBg,
		cardAccent: accentHex,
		cardAccentText: cardAccentText,

		// セマンティック役割（正しい用途）
		link: semanticColors.link,
		linkText: linkText,
		error: semanticColors.error,
		success: semanticColors.success,
		warning: semanticColors.warning,

		// Logo
		logo: primaryHex,
		logoText: logoText,

		// UI要素
		border: backgroundColor === "#FFFFFF" ? "#E0E0E0" : "#3A3A3A",
		inputBackground: backgroundColor,
		footerBackground: footerBg,
		footerText: footerText,
	};
}

/**
 * ナビゲーションセクションを作成
 */
function createNavSection(colors: PalettePreviewColors): HTMLElement {
	const nav = document.createElement("nav");
	nav.className = "dads-preview__nav";
	nav.style.backgroundColor = colors.background;
	nav.style.borderBottom = `1px solid ${colors.border}`;

	// ロゴ - コントラスト調整済みの色を使用
	const logo = document.createElement("div");
	logo.className = "dads-preview__logo";
	logo.textContent = "ColorPal";
	logo.style.color = colors.logoText;
	logo.style.fontWeight = "bold";

	// ナビリンク - コントラスト調整済みの色を使用
	const links = document.createElement("div");
	links.className = "dads-preview__nav-links";

	for (const linkText of ["Home", "About", "Contact"]) {
		const link = document.createElement("a");
		link.href = "#";
		link.textContent = linkText;
		link.style.color = colors.linkText;
		link.className = "dads-preview__nav-link";
		links.appendChild(link);
	}

	nav.appendChild(logo);
	nav.appendChild(links);

	return nav;
}

/**
 * ヒーローセクションを作成
 */
function createHeroSection(colors: PalettePreviewColors): HTMLElement {
	const hero = document.createElement("section");
	hero.className = "dads-preview__hero";
	hero.style.backgroundColor = colors.background;

	// タグライン（小さいテキスト）
	const tagline = document.createElement("span");
	tagline.className = "dads-preview__tagline";
	tagline.textContent = "Color System Preview";
	tagline.style.color = colors.headlineText;

	// ヘッドライン - コントラスト調整済みの色を使用
	const headline = document.createElement("h1");
	headline.className = "dads-preview__headline";
	headline.textContent = "Beautiful colors, crafted for your brand";
	headline.style.color = colors.headlineText;

	// 本文
	const body = document.createElement("p");
	body.className = "dads-preview__body";
	body.textContent =
		"See how your palette looks in a real design. This preview helps you visualize your color choices in context.";
	body.style.color = colors.text;

	// CTAボタン
	const cta = document.createElement("button");
	cta.className = "dads-preview__cta";
	cta.textContent = "Get Started";
	cta.style.backgroundColor = colors.button;
	cta.style.color = colors.buttonText;

	hero.appendChild(tagline);
	hero.appendChild(headline);
	hero.appendChild(body);
	hero.appendChild(cta);

	return hero;
}

/**
 * カードセクションを作成
 */
function createCardsSection(colors: PalettePreviewColors): HTMLElement {
	const section = document.createElement("section");
	section.className = "dads-preview__cards";
	section.style.backgroundColor = colors.background;

	const cardData = [
		{
			icon: "🎨",
			title: "Design Systems",
			description: "Build consistent, scalable color palettes for your brand",
		},
		{
			icon: "♿",
			title: "Accessibility First",
			description: "WCAG compliant colors that work for everyone",
		},
		{
			icon: "⚡",
			title: "Fast & Easy",
			description: "Generate beautiful palettes in seconds",
		},
	];

	for (const data of cardData) {
		const card = document.createElement("div");
		card.className = "dads-preview__card";
		card.style.backgroundColor = colors.card;
		card.style.borderLeft = `4px solid ${colors.cardAccent}`;

		// アイコン
		const icon = document.createElement("span");
		icon.className = "dads-preview__card-icon";
		icon.textContent = data.icon;

		// タイトル - コントラスト調整済みの色を使用
		const title = document.createElement("h3");
		title.textContent = data.title;
		title.style.color = colors.cardAccentText;

		const desc = document.createElement("p");
		desc.textContent = data.description;
		desc.style.color = colors.text;

		card.appendChild(icon);
		card.appendChild(title);
		card.appendChild(desc);
		section.appendChild(card);
	}

	return section;
}

/**
 * フォームセクションを作成（エラー/成功/警告メッセージ含む）
 */
function createFormSection(colors: PalettePreviewColors): HTMLElement {
	const section = document.createElement("section");
	section.className = "dads-preview__form";
	section.style.backgroundColor = colors.background;

	// フォームコンテナ
	const form = document.createElement("div");
	form.className = "dads-preview__form-container";

	// 入力フィールド
	const input = document.createElement("input");
	input.type = "email";
	input.placeholder = "Enter your email";
	input.className = "dads-preview__input";
	input.style.backgroundColor = colors.inputBackground;
	input.style.borderColor = colors.border;
	input.style.color = colors.text;

	// 送信ボタン
	const submit = document.createElement("button");
	submit.textContent = "Subscribe";
	submit.className = "dads-preview__submit";
	submit.style.backgroundColor = colors.button;
	submit.style.color = colors.buttonText;

	form.appendChild(input);
	form.appendChild(submit);

	// メッセージ表示エリア（セマンティックカラーを正しい用途で使用）
	const messages = document.createElement("div");
	messages.className = "dads-preview__messages";

	// エラーメッセージ
	const errorMsg = document.createElement("div");
	errorMsg.className = "dads-preview__message dads-preview__message--error";
	errorMsg.textContent = "Please enter a valid email";
	errorMsg.style.color = colors.error;

	// 成功メッセージ
	const successMsg = document.createElement("div");
	successMsg.className = "dads-preview__message dads-preview__message--success";
	successMsg.textContent = "Successfully subscribed!";
	successMsg.style.color = colors.success;

	// 警告メッセージ
	const warningMsg = document.createElement("div");
	warningMsg.className = "dads-preview__message dads-preview__message--warning";
	warningMsg.textContent = "This email is already registered";
	warningMsg.style.color = colors.warning;

	messages.appendChild(errorMsg);
	messages.appendChild(successMsg);
	messages.appendChild(warningMsg);

	section.appendChild(form);
	section.appendChild(messages);

	return section;
}

/**
 * フッターセクションを作成
 */
function createFooterSection(colors: PalettePreviewColors): HTMLElement {
	const footer = document.createElement("footer");
	footer.className = "dads-preview__footer";
	footer.style.backgroundColor = colors.footerBackground;
	footer.style.color = colors.footerText;

	const copyright = document.createElement("p");
	copyright.textContent = "© 2024 Color Token Generator";

	const links = document.createElement("div");
	links.className = "dads-preview__footer-links";

	for (const linkText of ["Privacy", "Terms", "Contact"]) {
		const link = document.createElement("a");
		link.href = "#";
		link.textContent = linkText;
		link.style.color = colors.link;
		links.appendChild(link);
	}

	footer.appendChild(copyright);
	footer.appendChild(links);

	return footer;
}

/**
 * パレットプレビューを作成
 */
export function createPalettePreview(
	colors: PalettePreviewColors,
): HTMLElement {
	const container = document.createElement("div");
	container.className = "dads-preview";

	// 各セクションを追加
	container.appendChild(createNavSection(colors));
	container.appendChild(createHeroSection(colors));
	container.appendChild(createCardsSection(colors));
	container.appendChild(createFormSection(colors));
	container.appendChild(createFooterSection(colors));

	return container;
}

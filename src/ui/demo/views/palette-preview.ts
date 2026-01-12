/**
 * パレットプレビュー（DADS HTML / 擬似サイト）
 *
 * DADS（デジタル庁デザインシステム）HTML版のコンポーネント実装（Storybookのコードスニペット）を参照し、
 * 生成した色を適用した擬似サイトを、アプリ内DOMとして構成する。
 *
 * セマンティックカラーの役割:
 * - Error → エラーメッセージ、バリデーションエラー
 * - Success → 成功メッセージ
 * - Warning → 警告表示
 * - Link → リンクテキスト
 * - Primary → ヘッドライン、CTAボタン
 * - Accent → カード背景、アクセント要素
 */

import { formatHex, oklch, parse, wcagContrast } from "culori";
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

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function adjustOklchLightness(hex: string, deltaL: number): string {
	const parsed = parse(hex);
	if (!parsed) return hex;

	const color = oklch(parsed);
	if (!color) return hex;

	const next = { ...color, l: clamp01(color.l + deltaL) };
	return formatHex(next) || hex;
}

function deriveButtonStateColors(primaryHex: string): {
	hover: string;
	active: string;
	outlineHoverBg: string;
	outlineActiveBg: string;
} {
	return {
		hover: adjustOklchLightness(primaryHex, -0.06),
		active: adjustOklchLightness(primaryHex, -0.12),
		outlineHoverBg: adjustOklchLightness(primaryHex, 0.35),
		outlineActiveBg: adjustOklchLightness(primaryHex, 0.25),
	};
}

function createPreviewIdPrefix(): string {
	const uuid =
		typeof crypto !== "undefined" && "randomUUID" in crypto
			? crypto.randomUUID()
			: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

	return `palette-preview-${uuid}`;
}

function buildDadsPreviewMarkup(ids: {
	emailInputId: string;
	supportTextId: string;
	errorTextId: string;
	infoCloseLabelId: string;
	successCloseLabelId: string;
	warningCloseLabelId: string;
	errorCloseLabelId: string;
}): string {
	return `
<div class="preview-page">
	<div class="preview-surface">
		<header class="preview-header">
			<a class="preview-brand" href="#" aria-label="ブランドサイト（プレビュー）">
				<span aria-hidden="true" class="preview-brand__dot"></span>
				ブランドサイト
			</a>
			<nav class="preview-nav" aria-label="サイト内ナビゲーション">
				<a class="dads-link" href="#">ホーム</a>
				<a class="dads-link" href="#">サービス</a>
				<a class="dads-link" href="#">お問い合わせ</a>
			</nav>
		</header>

		<main class="preview-main">
			<section class="preview-announcement" aria-label="お知らせ">
				<div class="dads-notification-banner" data-style="color-chip" data-type="info-1">
					<h2 class="dads-notification-banner__heading">
						<svg class="dads-notification-banner__icon" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="お知らせ">
							<circle cx="12" cy="12" r="10" fill="currentcolor" />
							<circle cx="12" cy="8" r="1" fill="Canvas" />
							<path d="M11 11h2v6h-2z" fill="Canvas" />
						</svg>
						<span class="dads-notification-banner__heading-text">次のアップデートを準備中です</span>
					</h2>
					<button class="dads-notification-banner__close" type="button" aria-labelledby="${ids.infoCloseLabelId}">
						<svg class="dads-notification-banner__close-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
							<path d="m6.4 18.6-1-1 5.5-5.6-5.6-5.6 1.1-1 5.6 5.5 5.6-5.6 1 1.1L13 12l5.6 5.6-1 1L12 13l-5.6 5.6Z" fill="currentcolor" />
						</svg>
						<span id="${ids.infoCloseLabelId}" class="dads-notification-banner__close-label">閉じる</span>
					</button>
					<div class="dads-notification-banner__body">
						<p class="preview-announcement__meta">
							<time datetime="2026-01-12">2026年1月12日</time>・ベータ
						</p>
						<p>配色の「使われ方」をもっと確かめられるよう、トップページの見せ方を磨いています。</p>
					</div>
					<div class="dads-notification-banner__actions">
						<button class="dads-button" data-size="md" data-type="outline" type="button">詳しく見る</button>
						<button class="dads-button" data-size="md" data-type="solid-fill" type="button">通知設定</button>
					</div>
				</div>
			</section>

			<section class="preview-hero" aria-label="ヒーロー">
				<div class="preview-hero__layout">
					<div class="preview-hero__copy">
						<hgroup class="dads-heading" data-size="45" data-chip>
							<p class="dads-heading__shoulder">カラープレビュー</p>
							<h1 class="dads-heading__heading">DADSコンポーネントで配色を確認</h1>
						</hgroup>
						<p class="preview-lead">
							生成したプライマリ／アクセントを、DADS（デジタル庁デザインシステム）のHTMLコンポーネントへ当てはめたときの見え方を確認します。
						</p>
						<p class="preview-kicker">その色は、本当に「押したくなる」ボタンになっていますか？</p>
						<div class="preview-actions" aria-label="操作">
							<button class="dads-button" data-size="lg" data-type="solid-fill" type="button">主要操作</button>
							<button class="dads-button" data-size="lg" data-type="outline" type="button">副次操作</button>
							<button class="dads-button" data-size="lg" data-type="text" type="button">詳細を見る</button>
						</div>
						<div class="preview-hero__link">
							<a class="dads-link" href="#preview-pickup">ピックアップを見る</a>
						</div>
					</div>
					<div class="preview-hero__visual" aria-hidden="true">
						<div class="preview-kv" role="img" aria-label="キービジュアル（装飾）">
							<div class="preview-kv__shape preview-kv__shape--primary"></div>
							<div class="preview-kv__shape preview-kv__shape--accent"></div>
							<div class="preview-kv__ring"></div>
						</div>
					</div>
				</div>
			</section>

			<section id="preview-pickup" class="preview-section" aria-label="ピックアップ">
				<hgroup class="dads-heading" data-size="20" data-rule="2">
					<h2 class="dads-heading__heading">ピックアップ</h2>
				</hgroup>
				<div class="preview-section__content">
					<ul class="preview-resource-grid">
						<li>
							<div class="dads-resource-list" data-style="frame">
								<div class="dads-resource-list__body">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="currentcolor" aria-hidden="true">
										<path d="M4.6 20.5c-.5-.1-1-.6-1.1-1l16-16c.5.1.9.6 1 1l-16 16Zm-1.1-6.4v-2L12 3.4h2.1L3.5 14.1Zm0-7.4V5.3c0-1 .8-1.8 1.8-1.8h1.4L3.5 6.7Zm13.8 13.8 3.2-3.2v1.4c0 1-.8 1.8-1.8 1.8h-1.4Zm-7.4 0L20.5 9.9v2L12 20.6H9.9Z" />
									</svg>
									<div class="dads-resource-list__contents">
										<h3 class="dads-resource-list__title">デザイントークン</h3>
										<div class="dads-resource-list__label">
											<p>基礎</p>
										</div>
										<div class="dads-resource-list__support">
											<p>色・余白・タイポグラフィなどの共通値</p>
										</div>
									</div>
								</div>
							</div>
						</li>
						<li>
							<div class="dads-resource-list" data-style="frame">
								<div class="dads-resource-list__body">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="currentcolor" aria-hidden="true">
										<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" />
									</svg>
									<div class="dads-resource-list__contents">
										<h3 class="dads-resource-list__title">アクセシビリティ</h3>
										<div class="dads-resource-list__label">
											<p>必須</p>
										</div>
										<div class="dads-resource-list__support">
											<p>コントラストや状態表示の見え方を確認</p>
										</div>
									</div>
								</div>
							</div>
						</li>
						<li>
							<div class="dads-resource-list" data-style="frame">
								<div class="dads-resource-list__body">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="currentcolor" aria-hidden="true">
										<path d="M6 2h9l3 3v17H6V2Zm2 5h8V5H8v2Zm0 4h8V9H8v2Zm0 4h8v-2H8v2Z" />
									</svg>
									<div class="dads-resource-list__contents">
										<h3 class="dads-resource-list__title">ガイドライン</h3>
										<div class="dads-resource-list__label">
											<p>近日公開</p>
										</div>
										<div class="dads-resource-list__support">
											<p>配色の使い分け・ルール設計のヒント</p>
										</div>
									</div>
								</div>
							</div>
						</li>
					</ul>
				</div>
			</section>

			<section class="preview-section" aria-label="フォーム">
				<hgroup class="dads-heading" data-size="20" data-rule="2">
					<h2 class="dads-heading__heading">入力フォーム</h2>
				</hgroup>
				<div class="preview-section__content preview-form">
					<div class="dads-form-control-label" data-size="md">
						<label class="dads-form-control-label__label" for="${ids.emailInputId}">
							メールアドレス
							<span class="dads-form-control-label__requirement" data-required="true">※必須</span>
						</label>
						<p id="${ids.supportTextId}" class="dads-form-control-label__support-text">
							確認用の通知を送付します。
						</p>
						<div>
							<span class="dads-input-text">
								<input id="${ids.emailInputId}" class="dads-input-text__input" type="email" data-size="md" aria-invalid="true" aria-describedby="${ids.errorTextId} ${ids.supportTextId}" value="example@" />
								<span id="${ids.errorTextId}" class="dads-input-text__error-text">＊メールアドレスの形式で入力してください。</span>
							</span>
						</div>
					</div>
				</div>
			</section>

			<section class="preview-section" aria-label="通知">
				<hgroup class="dads-heading" data-size="20" data-rule="2">
					<h2 class="dads-heading__heading">通知（セマンティックカラー）</h2>
				</hgroup>
				<div class="preview-section__content preview-notifications">
					<div class="dads-notification-banner" data-style="standard" data-type="success">
						<h2 class="dads-notification-banner__heading">
							<svg class="dads-notification-banner__icon" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="成功">
								<circle cx="12" cy="12" r="10" fill="currentcolor" />
								<path d="m17.6 9.6-7 7-4.3-4.3L7.7 11l2.9 2.9 5.7-5.6 1.3 1.4Z" fill="Canvas" />
							</svg>
							<span class="dads-notification-banner__heading-text">完了しました</span>
						</h2>
						<button class="dads-notification-banner__close" type="button" aria-labelledby="${ids.successCloseLabelId}">
							<svg class="dads-notification-banner__close-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
								<path d="m6.4 18.6-1-1 5.5-5.6-5.6-5.6 1.1-1 5.6 5.5 5.6-5.6 1 1.1L13 12l5.6 5.6-1 1L12 13l-5.6 5.6Z" fill="currentcolor" />
							</svg>
							<span id="${ids.successCloseLabelId}" class="dads-notification-banner__close-label">閉じる</span>
						</button>
					</div>

					<div class="dads-notification-banner" data-style="standard" data-type="warning">
						<h2 class="dads-notification-banner__heading">
							<svg class="dads-notification-banner__icon" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="警告">
								<path d="M1 21 12 2l11 19H1Z" fill="currentcolor" />
								<path d="M13 15h-2v-5h2v5Z" fill="Canvas" />
								<circle cx="12" cy="17" r="1" fill="Canvas" />
							</svg>
							<span class="dads-notification-banner__heading-text">入力内容を確認してください</span>
						</h2>
						<button class="dads-notification-banner__close" type="button" aria-labelledby="${ids.warningCloseLabelId}">
							<svg class="dads-notification-banner__close-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
								<path d="m6.4 18.6-1-1 5.5-5.6-5.6-5.6 1.1-1 5.6 5.5 5.6-5.6 1 1.1L13 12l5.6 5.6-1 1L12 13l-5.6 5.6Z" fill="currentcolor" />
							</svg>
							<span id="${ids.warningCloseLabelId}" class="dads-notification-banner__close-label">閉じる</span>
						</button>
					</div>

					<div class="dads-notification-banner" data-style="standard" data-type="error">
						<h2 class="dads-notification-banner__heading">
							<svg class="dads-notification-banner__icon" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="エラー">
								<path d="M8.25 21 3 15.75v-7.5L8.25 3h7.5L21 8.25v7.5L15.75 21h-7.5Z" fill="currentcolor" />
								<path d="m12 13.4-2.85 2.85-1.4-1.4L10.6 12 7.75 9.15l1.4-1.4L12 10.6l2.85-2.85 1.4 1.4L13.4 12l2.85 2.85-1.4 1.4L12 13.4Z" fill="Canvas" />
							</svg>
							<span class="dads-notification-banner__heading-text">エラーが発生しました</span>
						</h2>
						<button class="dads-notification-banner__close" type="button" aria-labelledby="${ids.errorCloseLabelId}">
							<svg class="dads-notification-banner__close-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
								<path d="m6.4 18.6-1-1 5.5-5.6-5.6-5.6 1.1-1 5.6 5.5 5.6-5.6 1 1.1L13 12l5.6 5.6-1 1L12 13l-5.6 5.6Z" fill="currentcolor" />
							</svg>
							<span id="${ids.errorCloseLabelId}" class="dads-notification-banner__close-label">閉じる</span>
						</button>
					</div>
				</div>
			</section>
		</main>

		<footer class="preview-footer">
			<small>© 2026 カラートークン生成ツール（プレビュー）</small>
		</footer>
	</div>
</div>
`;
}

/**
 * パレットプレビューを作成
 */
export function createPalettePreview(
	colors: PalettePreviewColors,
): HTMLElement {
	const container = document.createElement("div");
	container.className = "dads-preview dads-preview--dads-html";

	const buttonState = deriveButtonStateColors(colors.button);
	container.style.setProperty("--preview-bg", colors.background);
	container.style.setProperty("--preview-text", colors.text);
	container.style.setProperty("--preview-primary", colors.button);
	container.style.setProperty("--preview-primary-hover", buttonState.hover);
	container.style.setProperty("--preview-primary-active", buttonState.active);
	container.style.setProperty("--preview-on-primary", colors.buttonText);
	container.style.setProperty(
		"--preview-outline-hover-bg",
		buttonState.outlineHoverBg,
	);
	container.style.setProperty(
		"--preview-outline-active-bg",
		buttonState.outlineActiveBg,
	);
	container.style.setProperty("--preview-heading", colors.headlineText);
	container.style.setProperty("--preview-accent", colors.cardAccent);
	container.style.setProperty("--preview-success", colors.success);
	container.style.setProperty("--preview-warning", colors.warning);
	container.style.setProperty("--preview-error", colors.error);

	const prefix = createPreviewIdPrefix();
	container.innerHTML = buildDadsPreviewMarkup({
		emailInputId: `${prefix}-email`,
		supportTextId: `${prefix}-support-text`,
		errorTextId: `${prefix}-error-text`,
		infoCloseLabelId: `${prefix}-info-close-label`,
		successCloseLabelId: `${prefix}-success-close-label`,
		warningCloseLabelId: `${prefix}-warning-close-label`,
		errorCloseLabelId: `${prefix}-error-close-label`,
	});
	return container;
}

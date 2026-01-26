/**
 * NOTE: Render implementation for palette preview (split from palette-preview.ts).
 *
 * Contains markup builders + DOM wiring for the in-app DADS HTML preview.
 *
 * @module @/ui/demo/views/palette-preview
 */

import { formatHex, interpolate, oklch, parse } from "culori";
import type { StudioTheme } from "../types";
import {
	iconAuthSvg,
	iconChildSvg,
	iconFamilySvg,
	iconHealthSvg,
	iconHouseSvg,
	iconMotherChildSvg,
	illustrationM10Svg,
	illustrationM11Svg,
	illustrationM12Svg,
	illustrationM14Svg,
	illustrationPeopleSvgText,
} from "./palette-preview.assets";
import {
	ensureIllustrationCardContrast,
	ILLUSTRATION_MIN_CONTRAST,
} from "./palette-preview.color-mapping";
import { initializeKvElement } from "./palette-preview.kv";
import type {
	PalettePreviewColors,
	PalettePreviewOptions,
} from "./palette-preview.types";

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

type ThemeColorsInput = {
	primaryHex: string;
	tertiaryHex: string;
	dadsLinkColor: string;
};

type ThemeColorsOutput = {
	linkColor: string;
	headingColor: string;
	heroBg: string;
	stripBg: string;
};

/**
 * 色を白と混ぜて薄い色を作る
 *
 * @param hex 元の色（HEX形式）
 * @param ratio 混合比率（0-1、0=白、1=元の色）
 * @returns 薄くなった色（HEX形式）
 */
function tintColor(hex: string, ratio: number): string {
	const color = parse(hex);
	if (!color) return hex;

	const white = parse("#ffffff");
	if (!white) return hex;

	const tint = interpolate([white, color], "oklch");
	const result = tint(ratio);
	return formatHex(result) || hex;
}

/**
 * 薄い色の比率（40%の色 + 60%の白、oklch(0.97 0 0)相当）
 */
const TINT_RATIO = 0.4;

/**
 * イラスト背景用の薄い色の比率（25%の色 + 75%の白）
 * KV背景(0.4)より明らかに薄い色
 */
const ILLUSTRATION_TINT_RATIO = 0.25;

/**
 * アイコンSVGの色を currentColor に統一（CSS側で色を制御する）
 *
 * @param svgText - 元のSVGテキスト
 * @returns currentColor 化したSVGテキスト
 */
function replaceIconColor(svgText: string): string {
	return svgText
		.replace(/fill="#1A1A1C"/gi, 'fill="currentColor"')
		.replace(/stroke="#1A1A1C"/gi, 'stroke="currentColor"');
}

/**
 * イラストSVGの色をCSS変数に置き換える
 *
 * @param svgText - SVGテキスト
 * @param primaryVar - プライマリ色のCSS変数名
 * @param secondaryVar - セカンダリ色のCSS変数名
 * @returns 色が置き換えられたSVGテキスト
 */
function replaceIllustrationColors(
	svgText: string,
	primaryVar: string,
	secondaryVar: string,
): string {
	if (typeof DOMParser === "undefined") return svgText;

	const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
	const svg = doc.querySelector("svg");
	if (!svg) return svgText;

	const setFill = (selector: string, fill: string) => {
		for (const el of svg.querySelectorAll(selector)) {
			el.setAttribute("fill", fill);
		}
	};

	setFill(".illustration-colorizable", `var(${primaryVar})`);
	setFill(".illustration-colorizable-secondary", `var(${secondaryVar})`);
	setFill(".illustration-colorizable-tertiary", "var(--preview-text)");

	return svg.outerHTML || svgText;
}

/**
 * ラベルの折返しヒント（・の直後にwbr）をDOMとして付与
 *
 * @param target - ラベル要素
 * @param label - 表示用ラベル（プレーンテキスト）
 */
function applyLabelWbrHints(target: HTMLElement, label: string): void {
	const fragment = document.createDocumentFragment();
	let buffer = "";

	for (const char of label) {
		buffer += char;
		if (char === "・") {
			fragment.append(document.createTextNode(buffer));
			buffer = "";
			fragment.append(document.createElement("wbr"));
		}
	}

	if (buffer) {
		fragment.append(document.createTextNode(buffer));
	}

	target.replaceChildren(fragment);
}

/**
 * アイコンデータ（表示用）
 */
const FACILITY_TILES = [
	{ svg: iconChildSvg, label: "子育て・教育", href: "#" },
	{ svg: iconFamilySvg, label: "戸籍・家族", href: "#" },
	{ svg: iconHealthSvg, label: "健康・医療", href: "#" },
	{ svg: iconHouseSvg, label: "住まい・引っ越し", href: "#" },
	{ svg: iconMotherChildSvg, label: "妊娠・出産", href: "#" },
	{ svg: iconAuthSvg, label: "申請・認証", href: "#" },
] as const;

/**
 * イラストカードセクション用の設定
 */
const ILLUSTRATION_CARDS = [
	{
		svg: illustrationM10Svg,
		title: "申請・届出（オンライン）",
		description: "各種申請や届出を、いつでもオンラインで手続きできます。",
		href: "#",
	},
	{
		svg: illustrationM11Svg,
		title: "郵送での書類提出",
		description: "申請書類をポストへ投函して提出。郵送での受付も案内します。",
		href: "#",
	},
	{
		svg: illustrationM12Svg,
		title: "窓口相談・予約",
		description: "来庁前に相談や予約ができ、必要書類も事前に確認できます。",
		href: "#",
	},
	{
		svg: illustrationM14Svg,
		title: "自宅に届く通知",
		description: "通知書や交付書類が自宅に届き、大切なお知らせを受け取れます。",
		href: "#",
	},
] as const;

/**
 * イラストカードに適用するパレット色のCSS変数（循環させる）
 */
const ILLUSTRATION_CARD_COLOR_VARS = [
	"--preview-accent",
	"--preview-accent-2",
	"--preview-accent-3",
	"--preview-tertiary",
] as const;

/**
 * Get color variable at cyclic index (modulo guarantees valid index)
 */
function getIllustrationColorVar(
	index: number,
): (typeof ILLUSTRATION_CARD_COLOR_VARS)[number] {
	return ILLUSTRATION_CARD_COLOR_VARS[
		index % ILLUSTRATION_CARD_COLOR_VARS.length
	] as (typeof ILLUSTRATION_CARD_COLOR_VARS)[number];
}

/**
 * テーマに応じた色設定を返す
 *
 * - pinpoint: 最小限の色使い（リンクはDADS青、見出しは黒）
 * - hero: ヒーロー背景に薄い色（現状・デフォルト）
 * - branding: 色をふんだんに使う（Strip背景にTertiary）
 */
function getThemeColors(
	theme: StudioTheme,
	input: ThemeColorsInput,
): ThemeColorsOutput {
	const { primaryHex, tertiaryHex, dadsLinkColor } = input;

	// 背景が白の場合のニュートラル黒
	const neutralBlack = "#1A1A1A";

	switch (theme) {
		case "pinpoint":
			// 最小限の色使い: リンクはDADS青、見出しは黒、背景は透明
			return {
				linkColor: dadsLinkColor,
				headingColor: neutralBlack,
				heroBg: "transparent",
				stripBg: "transparent",
			};

		case "branding":
			// ブランドカラーをふんだんに使う: Strip背景にTertiary（薄い色）
			return {
				linkColor: primaryHex,
				headingColor: primaryHex,
				heroBg: "transparent",
				stripBg: tintColor(tertiaryHex, TINT_RATIO),
			};
		default:
			// ヒーロー背景に薄い色（現状維持）
			return {
				linkColor: primaryHex,
				headingColor: primaryHex,
				heroBg: tintColor(tertiaryHex, TINT_RATIO),
				stripBg: "transparent",
			};
	}
}

export function buildDadsPreviewMarkup(): string {
	return [
		buildDadsPreviewShellOpen(),
		buildDadsPreviewHeaderMarkup(),
		buildDadsPreviewMainMarkup(),
		buildDadsPreviewFooterMarkup(),
		buildDadsPreviewShellClose(),
	].join("");
}

function buildDadsPreviewShellOpen(): string {
	return `
<div class="preview-page">
	<div class="preview-surface">`;
}

function buildDadsPreviewShellClose(): string {
	return `
	</div>
</div>
`;
}

function buildDadsPreviewHeaderMarkup(): string {
	return `
		<header class="preview-header">
			<div class="preview-container preview-header__inner">
				<a class="preview-brand" href="#" aria-label="ブランドサイト（プレビュー）">
					<span aria-hidden="true" class="preview-brand__dot"></span>
					ブランドサイト
				</a>
				<nav class="preview-nav" aria-label="サイト内ナビゲーション">
					<a class="dads-link" href="#">ホーム</a>
					<a class="dads-link" href="#">ガイド</a>
					<a class="dads-link" href="#">お問い合わせ</a>
				</nav>
			</div>
		</header>`;
}

function buildDadsPreviewMainMarkup(): string {
	return [
		`

		<main class="preview-main">`,
		buildDadsPreviewHeroSectionMarkup(),
		buildDadsPreviewTwoColSectionMarkup(),
		buildDadsPreviewFacilitiesSectionMarkup(),
		buildDadsPreviewIllustrationCardsSectionMarkup(),
		buildDadsPreviewEditorialSectionMarkup(),
		`
		</main>`,
	].join("");
}

function buildDadsPreviewHeroSectionMarkup(): string {
	return `
			<section class="preview-hero" aria-label="ヒーロー">
				<div class="preview-container">
					<div class="preview-hero__layout">
						<div class="preview-hero__copy">
							<hgroup class="dads-heading" data-size="57">
								<h1 class="dads-heading__heading">
									配色を設計し<br />
									実装して<br />
									運用する。
								</h1>
							</hgroup>
							<p class="preview-lead">
								生成したプライマリ／アクセントを、DADS（デジタル庁デザインシステム）のHTMLコンポーネントへ当てはめたときの「空気感」を、ページ全体で確かめられます。
							</p>
							<p class="preview-kicker">配色は、ルールと運用で強くなります。</p>
							<div class="preview-actions" aria-label="操作">
								<button class="dads-button" data-size="lg" data-type="solid-fill" type="button">プレビューを更新</button>
								<button class="dads-button" data-size="lg" data-type="outline" type="button">設計のヒント</button>
							</div>
							<p class="preview-hero__meta">
								<time datetime="2026-01-17">2026年1月17日</time>・スタジオプレビュー
							</p>
						</div>
						<div class="preview-hero__visual" aria-hidden="true">
							<div class="preview-kv" data-preview-kv="1" role="img" aria-label="キービジュアル（装飾）"></div>
						</div>
					</div>
				</div>
			</section>`;
}

function buildDadsPreviewTwoColSectionMarkup(): string {
	return `

			<section class="preview-section preview-section--twocol" aria-label="行政サービス案内">
				<div class="preview-container">
					<div class="preview-twocol__header">
						<hgroup class="dads-heading" data-size="45">
							<h2 class="dads-heading__heading">行政サービス案内</h2>
						</hgroup>
					</div>
					<div class="preview-twocol">
						<div class="preview-twocol__left">
							<hgroup class="dads-heading" data-size="18">
								<h3 class="dads-heading__heading">手続きカテゴリ</h3>
							</hgroup>
							<div class="preview-list" aria-label="手続きカテゴリ一覧">
								<a class="preview-list-item dads-link" href="#">
									<span class="preview-list-item__text">住民票・証明書</span>
									<span class="preview-list-item__arrow" aria-hidden="true">→</span>
								</a>
								<a class="preview-list-item dads-link" href="#">
									<span class="preview-list-item__text">引っ越し（転入・転出）</span>
									<span class="preview-list-item__arrow" aria-hidden="true">→</span>
								</a>
								<a class="preview-list-item dads-link" href="#">
									<span class="preview-list-item__text">子育て（手当・医療）</span>
									<span class="preview-list-item__arrow" aria-hidden="true">→</span>
								</a>
								<a class="preview-list-item dads-link" href="#">
									<span class="preview-list-item__text">税・納付（オンライン）</span>
									<span class="preview-list-item__arrow" aria-hidden="true">→</span>
								</a>
							</div>
						</div>
						<div class="preview-twocol__right">
							<hgroup class="dads-heading" data-size="18">
								<h3 class="dads-heading__heading">注目のオンライン手続き</h3>
							</hgroup>
							<article class="preview-card-illustration">
								<div class="preview-card-illustration__image" data-preview-illustration="1" aria-label="サービス紹介イラスト">
									<!-- SVG illustration will be inserted here -->
								</div>
								<div class="preview-card-illustration__body">
									<hgroup class="dads-heading" data-size="18">
										<h4 class="dads-heading__heading"><a class="dads-link" href="#">行政サービス室のデジタル化推進 ↗</a></h4>
									</hgroup>
									<p>窓口手続きのオンライン化により、24時間いつでも申請・届出が可能です。</p>
								</div>
							</article>
						</div>
					</div>
				</div>
			</section>`;
}

function buildDadsPreviewFacilitiesSectionMarkup(): string {
	return `

			<section class="preview-section preview-section--facilities" aria-label="カテゴリ案内">
				<div class="preview-container">
					<div class="preview-facilities">
						<hgroup class="dads-heading preview-facilities__heading" data-size="45">
							<h2 class="dads-heading__heading">手続き案内</h2>
						</hgroup>
						<div class="preview-facilities__left">
							<hgroup class="dads-heading" data-size="45">
								<p class="dads-heading__shoulder">行政サービス案内</p>
								<h2 class="dads-heading__heading">桜川市 オンライン窓口</h2>
							</hgroup>
							<p class="preview-facilities__meta">市民課（架空）</p>
							<hgroup class="dads-heading" data-size="20">
								<p class="dads-heading__heading">
									カテゴリから、必要な手続きを探せます。
								</p>
							</hgroup>
							<div class="preview-facilities__body">
								<p>
									住民票、引っ越し、子育て、税など、よくある手続きをカテゴリ別にまとめています。
								</p>
								<p>
									オンライン申請が可能なものは、24時間いつでも手続きできます（架空の案内です）。
								</p>
							</div>
						</div>
						<nav class="preview-facilities__grid" data-preview-icons="1" aria-label="カテゴリ一覧">
							<!-- Icons will be inserted dynamically -->
						</nav>
					</div>
				</div>
			</section>`;
}

function buildDadsPreviewIllustrationCardsSectionMarkup(): string {
	return `

			<section class="preview-section preview-section--illustration-cards" aria-label="市民サービスの利用シーン">
				<div class="preview-container">
					<div class="preview-section-head">
						<hgroup class="dads-heading" data-size="45">
							<h2 class="dads-heading__heading">市民サービスの利用シーン</h2>
						</hgroup>
						<div class="preview-section-head__body">
							<p class="preview-section-head__desc">
								申請・窓口・郵送など、行政サービスの代表的な場面に配色を当てはめて印象を確認できます。
							</p>
						</div>
					</div>
					<div class="preview-topics preview-illustration-grid" data-illustration-grid="1">
						<!-- Illustration cards will be inserted dynamically -->
					</div>
				</div>
			</section>`;
}

function buildDadsPreviewEditorialSectionMarkup(): string {
	return `

			<section class="preview-section preview-section--editorial" aria-label="設計">
				<div class="preview-container">
					<div class="preview-section-head">
						<hgroup class="dads-heading" data-size="45">
							<h2 class="dads-heading__heading">設計</h2>
						</hgroup>
						<div class="preview-section-head__body">
							<p class="preview-section-head__desc">
								配色を「単発の見た目」ではなく、運用できるルールとして扱うための要点をまとめます。
							</p>
							<div class="preview-tags" aria-label="トピック">
								<span class="preview-tag" data-tone="accent-1">アクセシビリティ</span>
								<span class="preview-tag" data-tone="accent-2">状態設計</span>
								<span class="preview-tag" data-tone="accent-3">ガバナンス</span>
								<span class="preview-tag" data-tone="neutral">運用</span>
							</div>
						</div>
					</div>

					<hr class="preview-divider" />

					<div class="preview-topics" aria-label="設計の要点">
						<article class="preview-topic" data-tone="accent-1">
							<hgroup class="dads-heading" data-size="18">
								<h3 class="dads-heading__heading">役割を固定する</h3>
							</hgroup>
							<p class="preview-topic__desc">
								Primary / Accent / Semantic の責務を混ぜないことで、ページが「市場」っぽく崩れません。
							</p>
						</article>
						<article class="preview-topic" data-tone="accent-2">
							<hgroup class="dads-heading" data-size="18">
								<h3 class="dads-heading__heading">面はニュートラル</h3>
							</hgroup>
							<p class="preview-topic__desc">
								白を土台に、カードやボックスはニュートラルで面を作ります。アクセントは使いすぎない。
							</p>
						</article>
						<article class="preview-topic" data-tone="accent-3">
							<hgroup class="dads-heading" data-size="18">
								<h3 class="dads-heading__heading">強弱を作る</h3>
							</hgroup>
							<p class="preview-topic__desc">
								見出し、区切り、誘導。小さな差分の積み重ねが、読みやすいページを作ります。
							</p>
						</article>
						<article class="preview-topic" data-tone="neutral">
							<hgroup class="dads-heading" data-size="18">
								<h3 class="dads-heading__heading">検証して残す</h3>
							</hgroup>
							<p class="preview-topic__desc">
								コントラストや状態色の検証結果を「ルール」として残すと、チームで継続できます。
							</p>
						</article>
					</div>

					<div class="preview-media-layout" aria-label="読み物">
						<div class="preview-media" aria-label="メディア（プレビュー）">
							<button class="preview-play" type="button" aria-label="再生（ダミー）">
								<span class="preview-play__icon" aria-hidden="true">▶</span>
							</button>
							<p class="preview-media__caption">
								<strong>短い動画</strong>：配色ルールを決めるための3つの質問
							</p>
						</div>

						<div class="preview-articles" aria-label="記事一覧">
							<article class="preview-article">
								<p class="preview-article__meta">2025年10月29日・検証</p>
								<a class="preview-article__title dads-link" href="#">
									大規模言語モデルにおける内省の兆候
								</a>
								<p class="preview-article__desc">
									ルール化の前に、観察する。配色を「状態」として扱うための見取り図。
								</p>
							</article>
							<article class="preview-article">
								<p class="preview-article__meta">2025年3月27日・運用</p>
								<a class="preview-article__title dads-link" href="#">
									アクセントを増やしすぎないための手順
								</a>
								<p class="preview-article__desc">
									2色目、3色目は「使いどころ」を先に決める。迷わないための分岐。
								</p>
							</article>
							<article class="preview-article">
								<p class="preview-article__meta">2025年2月3日・設計</p>
								<a class="preview-article__title dads-link" href="#">
									ボタンのhover/activeを「色の差」で管理する
								</a>
								<p class="preview-article__desc">
									濃淡のルールを決めると、配色が「運用できるUI」になります。
								</p>
							</article>
						</div>
					</div>
				</div>
			</section>`;
}

function buildDadsPreviewFooterMarkup(): string {
	return `

		<footer class="preview-footer">
			<div class="preview-container">
				<small>© 2026 カラートークン生成ツール（プレビュー）</small>
			</div>
		</footer>`;
}

/**
 * パレットプレビューを作成
 */
export function createPalettePreview(
	colors: PalettePreviewColors,
	options: PalettePreviewOptions = {},
): HTMLElement {
	const container = document.createElement("div");
	container.className = "dads-preview dads-preview--dads-html";
	const containerStyle = container.style;

	const getDisplayHex = options.getDisplayHex ?? ((hex) => hex);

	const buttonState = deriveButtonStateColors(colors.button);
	const accentHex2 = options.accentHexes?.[1] ?? colors.cardAccent;
	const accentHex3 = options.accentHexes?.[2] ?? accentHex2;
	const tertiaryHex = options.tertiaryHex ?? colors.cardAccent;
	const theme = options.theme ?? "hero";
	const preset = options.preset;

	// DADS標準のリンク色（青）
	const DADS_LINK_COLOR = "#0017C1";

	// テーマ別の色設定を計算
	const themeColors = getThemeColors(theme, {
		primaryHex: colors.headline,
		tertiaryHex,
		dadsLinkColor: DADS_LINK_COLOR,
	});

	// パステルプリセット時はmapPaletteToPreviewColorsで計算したリンク色を使用
	// （カード背景に対するコントラストも確認済み）
	// 他のプリセットはテーマ別のリンク色を使用
	const resolvedLinkColor =
		preset === "pastel" ? colors.linkText : themeColors.linkColor;

	const kvBgBase = tintColor(tertiaryHex, TINT_RATIO);
	const illustrationBgBase = tintColor(tertiaryHex, ILLUSTRATION_TINT_RATIO);
	const previewVars: Record<string, string> = {
		"--preview-bg": colors.background,
		"--preview-text": colors.text,
		"--preview-card": colors.card,
		"--preview-border": colors.border,
		"--preview-primary": colors.button,
		"--preview-primary-hover": buttonState.hover,
		"--preview-primary-active": buttonState.active,
		"--preview-on-primary": colors.buttonText,
		"--preview-outline-hover-bg": buttonState.outlineHoverBg,
		"--preview-outline-active-bg": buttonState.outlineActiveBg,
		"--preview-heading": themeColors.headingColor,
		"--preview-accent": colors.cardAccent,
		"--preview-accent-2": accentHex2,
		"--preview-accent-3": accentHex3,
		"--preview-tertiary": tertiaryHex,
		"--preview-success": colors.success,
		"--preview-warning": colors.warning,
		"--preview-error": colors.error,
		// テーマ別CSS変数（パステル時はコントラスト確保済みリンク色を使用）
		"--preview-link": resolvedLinkColor,
		"--preview-hero-bg": themeColors.heroBg,
		"--preview-strip-bg": themeColors.stripBg,
		// KV背景は常にターシャリー色（テーマに関係なく薄い色）
		"--preview-kv-bg": kvBgBase,
		// イラスト背景はKVより薄い色（ILLUSTRATION_TINT_RATIO = 0.25）
		"--preview-illustration-bg": illustrationBgBase,
	};
	for (const [name, value] of Object.entries(previewVars)) {
		// "transparent" や空文字列の場合はCSS変数を設定しない（フォールバック値が使われる）
		if (value && value !== "transparent") {
			containerStyle.setProperty(name, getDisplayHex(value));
		}
	}

	// テーマクラスを設定（CSS側でのスタイル切り替え用）
	container.dataset.theme = theme;

	// パステルプリセット用クラスを追加（CSS側でのスタイル切り替え用）
	if (preset === "pastel") {
		container.classList.add("dads-preview--pastel");
	}

	container.innerHTML = buildDadsPreviewMarkup();

	// ---- Hero KV (main visual) ----
	const kv = container.querySelector<HTMLElement>(".preview-kv");
	if (kv) {
		initializeKvElement(kv, colors, options);
	}

	// ---- Illustration card (two-column section) ----
	const illustrationContainer = container.querySelector<HTMLElement>(
		'[data-preview-illustration="1"]',
	);
	if (illustrationContainer) {
		// SVGをそのまま挿入（CSS変数で色を制御）
		illustrationContainer.innerHTML = illustrationPeopleSvgText;

		const getDisplayVarOrFallback = (name: string, fallbackHex: string) =>
			containerStyle.getPropertyValue(name).trim() ||
			getDisplayHex(fallbackHex);

		// 表示色（CVD変換後）をCSS変数の値から取得して単一ソース化
		const textDisplay = getDisplayVarOrFallback("--preview-text", colors.text);
		const tableSurfaceDisplay = getDisplayVarOrFallback(
			"--preview-accent",
			colors.cardAccent,
		);
		const accent3Display = getDisplayVarOrFallback(
			"--preview-accent-3",
			accentHex3,
		);
		const illustrationBgDisplay = getDisplayVarOrFallback(
			"--preview-illustration-bg",
			illustrationBgBase,
		);

		// 手元カード（--iv-accent3）はテーブル面（--iv-accent）の上に重なるため、
		// コントラストチェックはテーブル面に対して行う
		const illustrationStyle = illustrationContainer.style;
		illustrationStyle.setProperty("--iv-text", textDisplay);
		illustrationStyle.setProperty("--iv-accent", tableSurfaceDisplay);
		illustrationStyle.setProperty(
			"--iv-accent3",
			ensureIllustrationCardContrast(
				accent3Display,
				tableSurfaceDisplay,
				ILLUSTRATION_MIN_CONTRAST,
			),
		);
		illustrationStyle.setProperty("--iv-background", illustrationBgDisplay);
	}

	// ---- Facility icons grid ----
	const iconsContainer = container.querySelector<HTMLElement>(
		'[data-preview-icons="1"]',
	);
	if (iconsContainer) {
		// アクセントは2つおき（0始まりで奇数index）に適用
		iconsContainer.replaceChildren(
			...FACILITY_TILES.map((tile, index) => {
				const hasAccent = index % 2 === 1;
				const iconSvg = replaceIconColor(tile.svg);

				const wrapper = document.createElement("a");
				wrapper.className = `preview-facility-tile dads-link${hasAccent ? " preview-facility-tile--accent" : ""}`;
				wrapper.href = tile.href;

				const box = document.createElement("span");
				box.className = "preview-facility-tile__box";
				box.setAttribute("aria-hidden", "true");

				const icon = document.createElement("span");
				icon.className = "preview-facility-tile__icon";
				icon.innerHTML = iconSvg;

				const label = document.createElement("span");
				label.className = "preview-facility-tile__label";
				applyLabelWbrHints(label, tile.label);

				box.append(icon);
				wrapper.append(box, label);
				return wrapper;
			}),
		);
	}

	// ---- Illustration cards grid ----
	const illustrationGridContainer = container.querySelector<HTMLElement>(
		'[data-illustration-grid="1"]',
	);
	if (illustrationGridContainer) {
		illustrationGridContainer.replaceChildren(
			...ILLUSTRATION_CARDS.map((card, index) => {
				const primaryVar = getIllustrationColorVar(index);
				const secondaryVar = getIllustrationColorVar(index + 1);
				const colorizedSvg = replaceIllustrationColors(
					card.svg,
					primaryVar,
					secondaryVar,
				);

				const cardElement = document.createElement("article");
				cardElement.className = "preview-illustration-card";

				const imageWrapper = document.createElement("div");
				imageWrapper.className = "preview-illustration-card__image";
				imageWrapper.innerHTML = colorizedSvg;

				// Add aria attributes for decorative SVG
				const svg = imageWrapper.querySelector("svg");
				if (svg) {
					svg.setAttribute("aria-hidden", "true");
					svg.setAttribute("focusable", "false");
				}

				const title = document.createElement("h3");
				title.className = "preview-illustration-card__title";
				const link = document.createElement("a");
				link.href = card.href;
				link.textContent = card.title;
				title.appendChild(link);

				const description = document.createElement("p");
				description.className = "preview-illustration-card__description";
				description.textContent = card.description;

				cardElement.append(imageWrapper, title, description);
				return cardElement;
			}),
		);
	}

	return container;
}

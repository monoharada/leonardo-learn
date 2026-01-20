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

import { formatHex, interpolate, oklch, parse, wcagContrast } from "culori";
import { getContrastTextColor } from "@/ui/semantic-role/circular-swatch-transformer";
import bundledMainVisualSvgText from "../assets/main-visual.svg" with {
	type: "text",
};
import type { PreviewKvState } from "../types";

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

export interface PalettePreviewOptions {
	/** 表示用のHEX変換関数（例: CVDシミュレーション） */
	getDisplayHex?: (hex: string) => string;
	/** ヒーロー右側KV（装飾）の表示制御 */
	kv?: PreviewKvState;
	/** 複数アクセントの表示用（任意）。先頭がAccent 1想定。 */
	accentHexes?: string[];
}

function hashStringToSeed(value: string): number {
	let hash = 5381;
	for (let i = 0; i < value.length; i++) {
		hash = (hash * 33) ^ value.charCodeAt(i);
	}
	return hash >>> 0;
}

export function createSeededRandom(seed: number): () => number {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

function pickOne<T>(rnd: () => number, items: readonly [T, ...T[]]): T {
	const index = Math.floor(rnd() * items.length);
	return items[index]!;
}

const MAIN_VISUAL_SVG_PATHS: readonly [string, ...string[]] = [
	// Prefer user-generated source of truth.
	"./.context/generated/main-visual.svg",
	// Fallback for servers that block dot-directories: copy during build.
	"./dist/assets/main-visual.svg",
	// Optional variant (already normalized) for local experiments.
	"./.context/generated/main-visual.inline-for-app.svg",
];

let bundledMainVisualSvgTextNormalized: string | null = null;
function getBundledMainVisualSvgText(): string {
	if (!bundledMainVisualSvgTextNormalized) {
		bundledMainVisualSvgTextNormalized = normalizeMainVisualSvg(
			bundledMainVisualSvgText,
		);
	}
	return bundledMainVisualSvgTextNormalized;
}

let cachedMainVisualOverrideSvg: string | null = null;
let mainVisualOverridePromise: Promise<string | null> | null = null;
let mainVisualOverrideNextRetryAt = 0;
const MAIN_VISUAL_OVERRIDE_RETRY_MS = 10_000;
const MAIN_VISUAL_BUNDLED_FALLBACK_DELAY_MS = 200;
let bundledMainVisualSvgTemplate: SVGElement | null = null;
let mainVisualOverrideSvgTemplate: SVGElement | null = null;
let mainVisualOverrideSvgTemplateSource: string | null = null;

function resolveAssetUrl(path: string): string | null {
	if (typeof location === "undefined") return null;
	const url = new URL(path, location.href);
	// KV override is intentionally limited to same-origin assets.
	if (url.origin !== location.origin) return null;
	return url.toString();
}

function isSvgDocument(svgText: string): boolean {
	const trimmed = svgText.trim();
	if (!trimmed) return false;

	if (typeof DOMParser !== "undefined") {
		try {
			const parsed = new DOMParser().parseFromString(trimmed, "image/svg+xml");
			const root = parsed.documentElement;
			return Boolean(root && root.tagName.toLowerCase() === "svg");
		} catch {
			return false;
		}
	}

	// Fallback: tolerate XML declarations / comments / BOM.
	return /^[\s\uFEFF]*(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg\b/i.test(
		svgText,
	);
}

function normalizeMainVisualSvg(svgText: string): string {
	let svg = svgText.trim();

	// Ensure the root <svg> has preview classes for layout rules.
	svg = svg.replace(/<svg\b([^>]*)>/, (match, attrs: string) => {
		if (/\bclass=/.test(attrs)) {
			return match.replace(
				/\bclass="([^"]*)"/,
				(_m, value: string) =>
					`class="${value} preview-kv__svg preview-kv__svg--mv"`,
			);
		}
		return `<svg class="preview-kv__svg preview-kv__svg--mv"${attrs}>`;
	});

	// Keep the SVG from cropping when the KV uses a wide aspect ratio.
	svg = svg.replace(/<svg\b([^>]*)>/, (match, attrs: string) => {
		if (/\bpreserveAspectRatio=/.test(attrs)) return match;
		return `<svg preserveAspectRatio="xMidYMid meet"${attrs}>`;
	});

	// Normalize the viewBox to 4:3 by adding padding (never cropping).
	const targetAspect = 4 / 3;
	const aspectEpsilon = 0.01;
	svg = svg.replace(/\bviewBox="([^"]+)"/, (match, value: string) => {
		const parts = value
			.trim()
			.split(/[\s,]+/)
			.filter(Boolean);
		if (parts.length !== 4) return match;

		const [minX, minY, width, height] = parts.map((part) => Number(part)) as [
			number,
			number,
			number,
			number,
		];
		if (
			!Number.isFinite(minX) ||
			!Number.isFinite(minY) ||
			!Number.isFinite(width) ||
			!Number.isFinite(height) ||
			width <= 0 ||
			height <= 0
		) {
			return match;
		}

		const aspect = width / height;
		if (Math.abs(aspect - targetAspect) <= aspectEpsilon) return match;

		const format = (num: number) => {
			const rounded = Math.round(num * 1000) / 1000;
			return Number.isFinite(rounded) ? String(rounded) : String(num);
		};

		if (aspect < targetAspect) {
			const nextWidth = height * targetAspect;
			const pad = (nextWidth - width) / 2;
			return `viewBox="${format(minX - pad)} ${format(minY)} ${format(
				nextWidth,
			)} ${format(height)}"`;
		}

		const nextHeight = width / targetAspect;
		const pad = (nextHeight - height) / 2;
		return `viewBox="${format(minX)} ${format(minY - pad)} ${format(width)} ${format(
			nextHeight,
		)}"`;
	});

	// Make the first full-canvas white rect transparent so the KV background can show through.
	svg = svg.replace(
		/(<rect\b[^>]*?)fill="#FFFFFF"/,
		(_m, prefix: string) => `${prefix}fill="transparent"`,
	);

	return svg;
}

async function loadMainVisualOverrideSvg(): Promise<string | null> {
	if (cachedMainVisualOverrideSvg) return cachedMainVisualOverrideSvg;
	if (mainVisualOverridePromise) return mainVisualOverridePromise;

	// Browsers generally block `fetch(file://...)`, so skip runtime override attempts.
	if (typeof location !== "undefined" && location.protocol === "file:") {
		return null;
	}

	if (Date.now() < mainVisualOverrideNextRetryAt) {
		return null;
	}

	mainVisualOverridePromise = (async () => {
		for (const candidatePath of MAIN_VISUAL_SVG_PATHS) {
			const url = resolveAssetUrl(candidatePath);
			if (!url) continue;

			try {
				const res = await fetch(url, { mode: "same-origin" });
				if (!res.ok) continue;
				const text = await res.text();
				// Guard: some static servers may return an HTML error page with 200 OK.
				// Only accept an actual inline SVG that contains our mv variables.
				if (!text.includes("--mv-") || !isSvgDocument(text)) {
					continue;
				}
				cachedMainVisualOverrideSvg = normalizeMainVisualSvg(text);
				return cachedMainVisualOverrideSvg;
			} catch {
				// Try next candidate.
			}
		}

		mainVisualOverrideNextRetryAt = Date.now() + MAIN_VISUAL_OVERRIDE_RETRY_MS;
		return null;
	})().finally(() => {
		mainVisualOverridePromise = null;
	});

	return mainVisualOverridePromise;
}

function toSafeInlineSvg(svgText: string): SVGElement | null {
	if (typeof DOMParser === "undefined") return null;
	if (typeof document === "undefined") return null;

	const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
	const root = parsed.documentElement;
	if (!root || root.tagName.toLowerCase() !== "svg") return null;

	// Strip known-dangerous nodes (SVG supports active content).
	for (const node of root.querySelectorAll(
		"script,style,foreignObject,iframe,object,embed",
	)) {
		node.remove();
	}

	const elements = [root, ...Array.from(root.querySelectorAll("*"))];
	for (const el of elements) {
		for (const attr of Array.from(el.attributes)) {
			const name = attr.name;
			if (/^on/i.test(name)) {
				el.removeAttribute(name);
				continue;
			}
			if (/^(href|xlink:href)$/i.test(name)) {
				const value = attr.value.trim();
				if (!value.startsWith("#")) {
					el.removeAttribute(name);
				}
				continue;
			}

			const value = attr.value;
			if (/\burl\s*\(/i.test(value)) {
				const urlPattern = /url\s*\(\s*(['"]?)([^'")\s]+)\1\s*\)/gi;
				let match = urlPattern.exec(value);
				let hasExternalUrl = false;
				while (match !== null) {
					const target = match[2] ?? "";
					if (!target.startsWith("#")) {
						hasExternalUrl = true;
						break;
					}
					match = urlPattern.exec(value);
				}
				if (hasExternalUrl) {
					el.removeAttribute(name);
				}
			}
		}
	}

	return document.importNode(root, true) as unknown as SVGElement;
}

function getBundledMainVisualSvgClone(): SVGElement | null {
	if (!bundledMainVisualSvgTemplate) {
		const parsed = toSafeInlineSvg(getBundledMainVisualSvgText());
		if (!parsed) return null;
		bundledMainVisualSvgTemplate = parsed;
	}

	if (
		typeof document !== "undefined" &&
		bundledMainVisualSvgTemplate.ownerDocument !== document
	) {
		bundledMainVisualSvgTemplate = document.importNode(
			bundledMainVisualSvgTemplate,
			true,
		) as unknown as SVGElement;
	}

	return bundledMainVisualSvgTemplate.cloneNode(true) as SVGElement;
}

function getMainVisualOverrideSvgClone(svgText: string): SVGElement | null {
	if (
		mainVisualOverrideSvgTemplate &&
		mainVisualOverrideSvgTemplateSource === svgText
	) {
		if (
			typeof document !== "undefined" &&
			mainVisualOverrideSvgTemplate.ownerDocument !== document
		) {
			mainVisualOverrideSvgTemplate = document.importNode(
				mainVisualOverrideSvgTemplate,
				true,
			) as unknown as SVGElement;
		}
		return mainVisualOverrideSvgTemplate.cloneNode(true) as SVGElement;
	}

	const parsed = toSafeInlineSvg(svgText);
	if (!parsed) {
		cachedMainVisualOverrideSvg = null;
		mainVisualOverrideSvgTemplate = null;
		mainVisualOverrideSvgTemplateSource = null;
		mainVisualOverrideNextRetryAt = Date.now() + MAIN_VISUAL_OVERRIDE_RETRY_MS;
		return null;
	}
	mainVisualOverrideSvgTemplate = parsed;
	mainVisualOverrideSvgTemplateSource = svgText;
	return mainVisualOverrideSvgTemplate.cloneNode(true) as SVGElement;
}

function applyMainVisualVars(kv: HTMLElement, seed: number): void {
	const rnd = createSeededRandom(seed ^ 0x9e3779b9);

	const hairColor = parse("#FEFAF9");
	const whiteColor = parse("#FFFFFF");
	const minHairContrast = 1.9;
	const tintSteps = [
		0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
		0.95, 1,
	] as const;

	const bgBases = [
		"--preview-accent",
		"--preview-accent-2",
		"--preview-accent-3",
	] as const;

	const previewRoot = kv.closest<HTMLElement>(".dads-preview") ?? kv;
	const getVarValue = (name: string) => {
		const inline = previewRoot.style.getPropertyValue(name).trim();
		if (inline) return inline;
		if (typeof getComputedStyle !== "function") return "";
		return getComputedStyle(previewRoot).getPropertyValue(name).trim();
	};

	const shuffledBases = [...bgBases] as (typeof bgBases)[number][];
	for (let i = shuffledBases.length - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1));
		[shuffledBases[i], shuffledBases[j]] = [
			shuffledBases[j]!,
			shuffledBases[i]!,
		];
	}

	let resolvedBgHex: string | null = null;
	if (hairColor && whiteColor) {
		for (const baseVar of shuffledBases) {
			const baseValue = getVarValue(baseVar);
			if (!baseValue) continue;
			const baseColor = parse(baseValue);
			if (!baseColor) continue;

			const tint = interpolate([whiteColor, baseColor], "oklch");
			let chosenT: number | null = null;
			for (const t of tintSteps) {
				const candidate = tint(t);
				if (wcagContrast(candidate, hairColor) >= minHairContrast) {
					chosenT = t;
					break;
				}
			}
			if (chosenT === null) continue;

			// Add a small deterministic variation, never reducing contrast.
			const t = Math.min(1, chosenT + pickOne(rnd, [0, 0.05, 0.1] as const));
			const hex = formatHex(tint(t));
			if (hex) {
				resolvedBgHex = hex;
				break;
			}
		}
	}

	if (resolvedBgHex) {
		kv.style.setProperty("--mv-bg", resolvedBgHex);
	} else {
		const fallbackBase = pickOne(rnd, bgBases);
		kv.style.setProperty(
			"--mv-bg",
			`color-mix(in oklch, var(${fallbackBase}) 55%, var(--color-neutral-white))`,
		);
	}
	kv.style.setProperty("--mv-cloth-1", "var(--preview-primary)");
	kv.style.setProperty("--mv-cloth-2", "var(--preview-accent-2)");
	kv.style.setProperty("--mv-accent", "var(--preview-accent)");
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

function buildDadsPreviewMarkup(): string {
	return `
<div class="preview-page">
	<div class="preview-surface">
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
		</header>

		<main class="preview-main">
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
			</section>

			<section class="preview-section preview-section--strip" aria-label="まとめ">
				<div class="preview-container">
					<div class="preview-strip">
						<div class="preview-strip__layout">
							<div class="preview-strip__lead">
								<hgroup class="dads-heading" data-size="24">
									<h2 class="dads-heading__heading">アクセントは、最大3色まで。</h2>
								</hgroup>
								<p class="preview-strip__desc">
									ニュートラルは「面」に、アクセントは「サイン」に。ページ全体のリズムを崩さずに、情報の強弱を作ります。
								</p>
								<div class="preview-strip__actions">
									<button class="dads-button" data-size="md" data-type="outline" type="button">ルールを確認</button>
									<button class="dads-button" data-size="md" data-type="solid-fill" type="button">設定を開く</button>
								</div>
								<div class="preview-strip__legend" aria-label="アクセントのサンプル">
									<span class="preview-pill" data-tone="accent-1">Accent 1</span>
									<span class="preview-pill" data-tone="accent-2">Accent 2</span>
									<span class="preview-pill" data-tone="accent-3">Accent 3</span>
								</div>
							</div>

							<div class="preview-strip__links" aria-label="関連リンク">
								<a class="preview-link-row dads-link" href="#">
									<span class="preview-link-row__text">配色のコントラスト（AA）</span>
									<span aria-hidden="true" class="preview-link-row__arrow">→</span>
								</a>
								<a class="preview-link-row dads-link" href="#">
									<span class="preview-link-row__text">ボタンの状態（hover / active）</span>
									<span aria-hidden="true" class="preview-link-row__arrow">→</span>
								</a>
								<a class="preview-link-row dads-link" href="#">
									<span class="preview-link-row__text">カード面と余白のバランス</span>
									<span aria-hidden="true" class="preview-link-row__arrow">→</span>
								</a>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section class="preview-section preview-section--editorial" aria-label="設計">
				<div class="preview-container">
					<div class="preview-section-head">
						<hgroup class="dads-heading" data-size="36">
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
			</section>
		</main>

		<footer class="preview-footer">
			<div class="preview-container">
				<small>© 2026 カラートークン生成ツール（プレビュー）</small>
			</div>
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
	options: PalettePreviewOptions = {},
): HTMLElement {
	const container = document.createElement("div");
	container.className = "dads-preview dads-preview--dads-html";

	const getDisplayHex = options.getDisplayHex ?? ((hex) => hex);

	const buttonState = deriveButtonStateColors(colors.button);
	const accentHex2 = options.accentHexes?.[1] ?? colors.cardAccent;
	const accentHex3 = options.accentHexes?.[2] ?? accentHex2;
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
		"--preview-heading": colors.headlineText,
		"--preview-accent": colors.cardAccent,
		"--preview-accent-2": accentHex2,
		"--preview-accent-3": accentHex3,
		"--preview-success": colors.success,
		"--preview-warning": colors.warning,
		"--preview-error": colors.error,
	};
	for (const [name, value] of Object.entries(previewVars)) {
		container.style.setProperty(name, getDisplayHex(value));
	}

	container.innerHTML = buildDadsPreviewMarkup();

	// ---- Hero KV (main visual) ----
	const kv = container.querySelector<HTMLElement>(".preview-kv");
	if (kv) {
		const seed =
			options.kv?.locked && typeof options.kv.seed === "number"
				? options.kv.seed
				: hashStringToSeed(
						[
							colors.background,
							colors.button,
							colors.cardAccent,
							colors.success,
							colors.warning,
							colors.error,
						].join("|"),
					);
		kv.dataset.kvBg = "card";
		kv.dataset.kvMode = options.kv?.locked ? "locked" : "auto";
		// Page background is fixed (white); use neutral "surface" for the KV box.
		kv.style.setProperty("--preview-kv-bg", "var(--preview-card)");

		// Main visual (inline SVG). Runtime override is attempted, but we always
		// show a bundled fallback so the KV is visible even on file://.
		applyMainVisualVars(kv, seed);
		kv.dataset.kvVariant = "main-visual";

		let didRenderBundled = false;
		const renderBundled = (): void => {
			if (didRenderBundled) return;
			didRenderBundled = true;
			const bundledSvg = getBundledMainVisualSvgClone();
			if (bundledSvg) {
				kv.replaceChildren(bundledSvg);
			} else {
				kv.innerHTML = getBundledMainVisualSvgText();
			}
		};

		const renderOverride = (svgText: string): void => {
			const safeSvg = getMainVisualOverrideSvgClone(svgText);
			if (safeSvg) {
				kv.replaceChildren(safeSvg);
			} else {
				renderBundled();
			}
		};

		// file:// cannot fetch override assets; render bundled immediately.
		if (typeof location !== "undefined" && location.protocol === "file:") {
			renderBundled();
		} else if (cachedMainVisualOverrideSvg) {
			// If we already resolved an override, prefer it (avoid bundled parse cost).
			renderOverride(cachedMainVisualOverrideSvg);
		} else {
			let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
			if (typeof setTimeout === "function") {
				fallbackTimer = setTimeout(() => {
					if (!kv.isConnected) return;
					renderBundled();
				}, MAIN_VISUAL_BUNDLED_FALLBACK_DELAY_MS);
			} else {
				renderBundled();
			}

			void loadMainVisualOverrideSvg().then((svg) => {
				if (!kv.isConnected) return;
				if (fallbackTimer) clearTimeout(fallbackTimer);
				if (svg) {
					renderOverride(svg);
				} else {
					renderBundled();
				}
			});
		}
	}

	return container;
}

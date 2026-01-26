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
// イラストカードセクション用SVG
import illustrationM10Svg from "../../../../public/images/illustrations/m_10_white.svg" with {
	type: "text",
};
import illustrationM11Svg from "../../../../public/images/illustrations/m_11_warmgray.svg" with {
	type: "text",
};
import illustrationM12Svg from "../../../../public/images/illustrations/m_12_white.svg" with {
	type: "text",
};
import illustrationM14Svg from "../../../../public/images/illustrations/m_14_white.svg" with {
	type: "text",
};
import iconAuthSvg from "../assets/icons/authentication_line.svg" with {
	type: "text",
};
import iconChildSvg from "../assets/icons/child_line.svg" with { type: "text" };
import iconFamilySvg from "../assets/icons/family_line.svg" with {
	type: "text",
};
import iconHealthSvg from "../assets/icons/health_line.svg" with {
	type: "text",
};
import iconHouseSvg from "../assets/icons/house_line.svg" with { type: "text" };
import iconMotherChildSvg from "../assets/icons/mother_and_child_line.svg" with {
	type: "text",
};
import illustrationPeopleSvgText from "../assets/illustration-people.svg" with {
	type: "text",
};
import bundledMainVisualSvgText from "../assets/main-visual.svg" with {
	type: "text",
};
import type { PreviewKvState, StudioPresetType, StudioTheme } from "../types";
import {
	adjustLightnessForContrast,
	createPastelColorPair,
	createSoftBorderColor,
} from "../utils/dads-snap";

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
const ILLUSTRATION_MIN_CONTRAST = 2.0;

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
function ensureIllustrationCardContrast(
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
	return items[index] ?? items[0];
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

function hasExternalUrlReference(value: string): boolean {
	const urlPattern = /url\s*\(\s*(['"]?)([^'")\s]+)\1\s*\)/gi;
	let match = urlPattern.exec(value);
	while (match !== null) {
		const target = match[2] ?? "";
		if (!target.startsWith("#")) return true;
		match = urlPattern.exec(value);
	}
	return false;
}

function sanitizeSvgAttribute(el: Element, attr: Attr): void {
	const name = attr.name;

	// Remove event handlers (onclick, onload, etc.)
	if (/^on/i.test(name)) {
		el.removeAttribute(name);
		return;
	}

	// Remove external href/xlink:href references
	if (/^(href|xlink:href)$/i.test(name)) {
		if (!attr.value.trim().startsWith("#")) {
			el.removeAttribute(name);
		}
		return;
	}

	// Remove attributes with external url() references
	if (/\burl\s*\(/i.test(attr.value) && hasExternalUrlReference(attr.value)) {
		el.removeAttribute(name);
	}
}

function toSafeInlineSvg(svgText: string): SVGElement | null {
	if (typeof DOMParser === "undefined" || typeof document === "undefined") {
		return null;
	}

	const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
	const root = parsed.documentElement;
	if (!root || root.tagName.toLowerCase() !== "svg") return null;

	// Strip known-dangerous nodes (SVG supports active content)
	for (const node of root.querySelectorAll(
		"script,style,foreignObject,iframe,object,embed",
	)) {
		node.remove();
	}

	// Sanitize attributes on all elements
	const elements = [root, ...Array.from(root.querySelectorAll("*"))];
	for (const el of elements) {
		for (const attr of Array.from(el.attributes)) {
			sanitizeSvgAttribute(el, attr);
		}
	}

	return document.importNode(root, true) as unknown as SVGElement;
}

function ensureDocumentOwnership(template: SVGElement): SVGElement {
	if (typeof document !== "undefined" && template.ownerDocument !== document) {
		return document.importNode(template, true) as unknown as SVGElement;
	}
	return template;
}

function getBundledMainVisualSvgClone(): SVGElement | null {
	if (!bundledMainVisualSvgTemplate) {
		const parsed = toSafeInlineSvg(getBundledMainVisualSvgText());
		if (!parsed) return null;
		bundledMainVisualSvgTemplate = parsed;
	}

	bundledMainVisualSvgTemplate = ensureDocumentOwnership(
		bundledMainVisualSvgTemplate,
	);
	return bundledMainVisualSvgTemplate.cloneNode(true) as SVGElement;
}

function getMainVisualOverrideSvgClone(svgText: string): SVGElement | null {
	// Return cached clone if same source
	if (
		mainVisualOverrideSvgTemplate &&
		mainVisualOverrideSvgTemplateSource === svgText
	) {
		mainVisualOverrideSvgTemplate = ensureDocumentOwnership(
			mainVisualOverrideSvgTemplate,
		);
		return mainVisualOverrideSvgTemplate.cloneNode(true) as SVGElement;
	}

	// Parse new override SVG
	const parsed = toSafeInlineSvg(svgText);
	if (!parsed) {
		// Reset override state on parse failure
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

const ACCENT_VAR_NAMES = [
	"--preview-accent",
	"--preview-accent-2",
	"--preview-accent-3",
] as const;

const TINT_STEPS = [
	0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
	0.95, 1,
] as const;

const HAIR_COLOR_HEX = "#FEFAF9";
const WHITE_COLOR_HEX = "#FFFFFF";
const MIN_HAIR_CONTRAST = 1.9;

function shuffleArray<T>(array: T[], rnd: () => number): T[] {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1));
		const left = result[i];
		const right = result[j];
		if (left === undefined || right === undefined) continue;
		result[i] = right;
		result[j] = left;
	}
	return result;
}

function getCssVarValue(root: HTMLElement, name: string): string {
	const inline = root.style.getPropertyValue(name).trim();
	if (inline) return inline;
	if (typeof getComputedStyle !== "function") return "";
	return getComputedStyle(root).getPropertyValue(name).trim();
}

function findContrastingTintHex(
	baseColorValue: string,
	rnd: () => number,
): string | null {
	const hairColor = parse(HAIR_COLOR_HEX);
	const whiteColor = parse(WHITE_COLOR_HEX);
	const baseColor = parse(baseColorValue);

	if (!hairColor || !whiteColor || !baseColor) return null;

	const tint = interpolate([whiteColor, baseColor], "oklch");

	// Find first tint step that meets contrast requirement
	let chosenT: number | null = null;
	for (const t of TINT_STEPS) {
		if (wcagContrast(tint(t), hairColor) >= MIN_HAIR_CONTRAST) {
			chosenT = t;
			break;
		}
	}
	if (chosenT === null) return null;

	// Add small variation without reducing contrast
	const finalT = Math.min(1, chosenT + pickOne(rnd, [0, 0.05, 0.1] as const));
	return formatHex(tint(finalT)) || null;
}

function applyMainVisualVars(kv: HTMLElement, seed: number): void {
	const rnd = createSeededRandom(seed ^ 0x9e3779b9);
	const previewRoot = kv.closest<HTMLElement>(".dads-preview") ?? kv;
	const shuffledVars = shuffleArray([...ACCENT_VAR_NAMES], rnd);

	// Try each accent color to find one with sufficient hair contrast
	let resolvedBgHex: string | null = null;
	for (const varName of shuffledVars) {
		const colorValue = getCssVarValue(previewRoot, varName);
		if (!colorValue) continue;

		const hex = findContrastingTintHex(colorValue, rnd);
		if (hex) {
			resolvedBgHex = hex;
			break;
		}
	}

	// Set --mv-bg with resolved hex or fallback to color-mix
	if (resolvedBgHex) {
		kv.style.setProperty("--mv-bg", resolvedBgHex);
	} else {
		const fallbackVar = pickOne(rnd, ACCENT_VAR_NAMES);
		kv.style.setProperty(
			"--mv-bg",
			`color-mix(in oklch, var(${fallbackVar}) 55%, var(--color-neutral-white))`,
		);
	}

	// Set remaining main visual CSS variables
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

/**
 * テーマ別カラー設定のインターフェース
 */
interface ThemeColorsInput {
	primaryHex: string;
	tertiaryHex: string;
	dadsLinkColor: string;
}

/**
 * テーマ別カラー設定の出力
 */
interface ThemeColorsOutput {
	linkColor: string;
	headingColor: string;
	heroBg: string;
	stripBg: string;
}

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

			<section class="preview-section preview-section--twocol" aria-label="行政サービス案内">
				<div class="preview-container">
					<div class="preview-twocol__header">
						<hgroup class="dads-heading" data-size="24">
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
			</section>

			<section class="preview-section preview-section--facilities" aria-label="カテゴリ案内">
				<div class="preview-container">
					<div class="preview-facilities">
						<hgroup class="dads-heading preview-facilities__heading" data-size="45">
							<h2 class="dads-heading__heading">手続き案内</h2>
						</hgroup>
						<div class="preview-facilities__left">
							<hgroup class="dads-heading" data-size="36">
								<p class="dads-heading__heading">行政サービス案内</p>
							</hgroup>
							<hgroup class="dads-heading" data-size="45">
								<p class="dads-heading__heading">桜川市 オンライン窓口</p>
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
			</section>

			<section class="preview-section preview-section--illustration-cards" aria-label="市民サービスの利用シーン">
				<div class="preview-container">
					<div class="preview-section-head">
						<hgroup class="dads-heading" data-size="36">
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

		// 表示色（CVD変換後）をCSS変数の値から取得して単一ソース化
		const textDisplay =
			containerStyle.getPropertyValue("--preview-text").trim() ||
			getDisplayHex(colors.text);
		const tableSurfaceDisplay =
			containerStyle.getPropertyValue("--preview-accent").trim() ||
			getDisplayHex(colors.cardAccent);
		const accent3Display =
			containerStyle.getPropertyValue("--preview-accent-3").trim() ||
			getDisplayHex(accentHex3);
		const illustrationBgDisplay =
			containerStyle.getPropertyValue("--preview-illustration-bg").trim() ||
			getDisplayHex(illustrationBgBase);

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
				// Non-null assertions safe: modulo guarantees valid index
				const primaryVar =
					ILLUSTRATION_CARD_COLOR_VARS[
						index % ILLUSTRATION_CARD_COLOR_VARS.length
					]!;
				const secondaryVar =
					ILLUSTRATION_CARD_COLOR_VARS[
						(index + 1) % ILLUSTRATION_CARD_COLOR_VARS.length
					]!;
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

function computeKvSeed(
	colors: PalettePreviewColors,
	kvOptions: PreviewKvState | undefined,
): number {
	if (kvOptions?.locked && typeof kvOptions.seed === "number") {
		return kvOptions.seed;
	}
	const colorKey = [
		colors.background,
		colors.button,
		colors.cardAccent,
		colors.success,
		colors.warning,
		colors.error,
	].join("|");
	return hashStringToSeed(colorKey);
}

function renderBundledSvg(kv: HTMLElement): void {
	const bundledSvg = getBundledMainVisualSvgClone();
	if (bundledSvg) {
		kv.replaceChildren(bundledSvg);
	} else {
		kv.innerHTML = getBundledMainVisualSvgText();
	}
}

function renderOverrideSvg(kv: HTMLElement, svgText: string): boolean {
	const safeSvg = getMainVisualOverrideSvgClone(svgText);
	if (safeSvg) {
		kv.replaceChildren(safeSvg);
		return true;
	}
	return false;
}

function initializeKvElement(
	kv: HTMLElement,
	colors: PalettePreviewColors,
	options: PalettePreviewOptions,
): void {
	const seed = computeKvSeed(colors, options.kv);

	kv.dataset.kvBg = "tertiary";
	kv.dataset.kvMode = options.kv?.locked ? "locked" : "auto";
	kv.dataset.kvVariant = "main-visual";
	// --preview-kv-bg はcreate関数で既に設定済み（ターシャリー薄い色）

	applyMainVisualVars(kv, seed);

	// file:// cannot fetch override assets; render bundled immediately
	const isFileProtocol =
		typeof location !== "undefined" && location.protocol === "file:";

	if (isFileProtocol) {
		renderBundledSvg(kv);
		return;
	}

	// If override is already cached, use it directly
	if (cachedMainVisualOverrideSvg) {
		if (!renderOverrideSvg(kv, cachedMainVisualOverrideSvg)) {
			renderBundledSvg(kv);
		}
		return;
	}

	// Attempt async override load with fallback timer
	let didRender = false;
	let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

	const renderWithFallback = (overrideSvg: string | null): void => {
		if (didRender || !kv.isConnected) return;
		didRender = true;
		if (fallbackTimer) clearTimeout(fallbackTimer);

		if (overrideSvg && renderOverrideSvg(kv, overrideSvg)) {
			return;
		}
		renderBundledSvg(kv);
	};

	if (typeof setTimeout === "function") {
		fallbackTimer = setTimeout(() => {
			renderWithFallback(null);
		}, MAIN_VISUAL_BUNDLED_FALLBACK_DELAY_MS);
	} else {
		renderBundledSvg(kv);
		didRender = true;
	}

	void loadMainVisualOverrideSvg().then(renderWithFallback);
}

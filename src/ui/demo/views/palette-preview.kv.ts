import { formatHex, interpolate, parse, wcagContrast } from "culori";
import type { PreviewKvState } from "../types";
import { createSeededRandom } from "../utils/seeded-random";
import { bundledMainVisualSvgText } from "./palette-preview.assets";
import type {
	PalettePreviewColors,
	PalettePreviewOptions,
} from "./palette-preview.types";

function hashStringToSeed(value: string): number {
	let hash = 5381;
	for (let i = 0; i < value.length; i++) {
		hash = (hash * 33) ^ value.charCodeAt(i);
	}
	return hash >>> 0;
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

export function initializeKvElement(
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

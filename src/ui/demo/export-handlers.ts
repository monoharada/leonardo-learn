/**
 * エクスポートハンドラモジュール
 *
 * CSS/Tailwind/JSONエクスポート機能を提供する。
 * state.palettesまたはstate.shadesPalettesから色を生成してエクスポートする。
 *
 * @module @/ui/demo/export-handlers
 * Requirements: 3.1, 3.2, 3.3
 */

import { Color } from "@/core/color";
import { hexToRgba } from "@/core/export/css-exporter";
import {
	exportDadsSemanticLinkColorsSync,
	exportDadsSemanticLinkTokensSync,
	exportToDTCG,
} from "@/core/export/dtcg-exporter";
import { exportToTailwind } from "@/core/export/tailwind-exporter";
import { findColorForContrast, isWarmYellowHue } from "@/core/solver";
import {
	findDadsColorByHex,
	getCachedDadsTokens,
	getDadsHueFromDisplayName,
} from "@/core/tokens/dads-data-provider";
import type { DadsToken } from "@/core/tokens/types";
import {
	getContrastRatios,
	STEP_NAMES,
	setButtonActive,
} from "@/ui/style-constants";
import { syncModalOpenState } from "./modal-scroll-lock";
import { parseKeyColor, state } from "./state";
import type { PaletteConfig } from "./types";
import { resolveKeyBackgroundColor } from "./utils/key-background";

let exportDialogTriggerClickHandler: ((e: MouseEvent) => void) | null = null;
let exportDialogWithCloseHandler: HTMLDialogElement | null = null;
let exportDialogCloseHandler: ((e: Event) => void) | null = null;

/**
 * エクスポートフォーマット
 */
export type ExportFormat = "css" | "tailwind" | "json";

/**
 * 現在の有効な警告パターンを取得
 *
 * 自動選択の場合はresolvedWarningPatternを使用
 */
function getActiveWarningPattern(): "yellow" | "orange" {
	const config = state.semanticColorConfig;
	if (config.warningPattern === "auto") {
		return config.resolvedWarningPattern || "yellow";
	}
	return config.warningPattern;
}

type ExportRoleAssignment = {
	roleKey: string;
	palette: PaletteConfig;
};

function getPalettesToExport(): PaletteConfig[] {
	return state.shadesPalettes.length > 0
		? state.shadesPalettes
		: state.palettes;
}

function getExportRoleAssignments(
	palettes: PaletteConfig[],
): ExportRoleAssignment[] {
	const assignments: ExportRoleAssignment[] = [];

	let primaryAssigned = false;
	let accentIndex = 1;

	for (const palette of palettes) {
		const keyColorInput = palette.keyColors[0];
		if (!keyColorInput) continue;

		const lowerName = palette.name.toLowerCase();
		let roleKey: string | null = null;

		// 明示的な役割（名前/derivedFrom優先）
		if (
			palette.derivedFrom?.derivationType === "secondary" ||
			lowerName === "secondary"
		) {
			roleKey = "secondary";
		} else if (
			palette.derivedFrom?.derivationType === "tertiary" ||
			lowerName === "tertiary"
		) {
			roleKey = "tertiary";
		} else if (lowerName === "primary") {
			roleKey = "primary";
			primaryAssigned = true;
		} else {
			const accentMatch = lowerName.match(/^accent\s*(\d+)$/);
			if (accentMatch?.[1]) {
				roleKey = `accent-${accentMatch[1]}`;
			} else if (!primaryAssigned) {
				// フォールバック: 先頭の非derivedをPrimary扱い
				roleKey = "primary";
				primaryAssigned = true;
			} else {
				// フォールバック: 残りはAccentとして連番付与
				roleKey = `accent-${accentIndex}`;
				accentIndex++;
			}
		}

		if (!roleKey) continue;
		assignments.push({ roleKey, palette });
	}

	return assignments;
}

function getSemanticLinkAliasVarRefEntries(
	warningPattern: "yellow" | "orange",
): Array<[cssVar: string, value: string]> {
	const warningHue = warningPattern === "yellow" ? "yellow" : "orange";
	const warningDefaultStep = warningPattern === "yellow" ? 700 : 600;
	const warningStrongStep = warningPattern === "yellow" ? 900 : 800;

	return [
		["--color-success", "var(--color-primitive-green-600)"],
		["--color-success-strong", "var(--color-primitive-green-800)"],
		["--color-error", "var(--color-primitive-red-800)"],
		["--color-error-strong", "var(--color-primitive-red-900)"],
		[
			"--color-warning",
			`var(--color-primitive-${warningHue}-${warningDefaultStep})`,
		],
		[
			"--color-warning-strong",
			`var(--color-primitive-${warningHue}-${warningStrongStep})`,
		],
		["--color-link", "var(--color-primitive-blue-1000)"],
		["--color-link-visited", "var(--color-primitive-magenta-900)"],
		["--color-link-active", "var(--color-primitive-orange-800)"],
	];
}

/**
 * 現在の選択状態（Primary/Secondary/Tertiary/Accent）を
 * 1ロール=1トークンとしてエクスポート用に取得する。
 */
export function generateExportRoleColors(): Record<string, Color> {
	const colors: Record<string, Color> = {};

	for (const { roleKey, palette } of getExportRoleAssignments(
		getPalettesToExport(),
	)) {
		const keyColorInput = palette.keyColors[0];
		if (!keyColorInput) continue;
		const { color: hex } = parseKeyColor(keyColorInput);
		const keyColor = new Color(hex);
		colors[roleKey] = keyColor;
	}

	const keySurface = resolveKeyBackgroundExportValue();
	if (keySurface) {
		colors["key-surface"] = new Color(keySurface.hex);
	}

	return colors;
}

function getDadsCssVariableName(token: DadsToken): string {
	const suffix = token.id.replace(/^dads-/, "");
	if (token.classification.category === "chromatic") {
		return `--color-primitive-${suffix}`;
	}
	return `--color-${suffix}`;
}

function getDadsCssValue(token: DadsToken): string {
	if (token.alpha !== undefined && token.alpha !== 1) {
		return hexToRgba(token.hex, token.alpha);
	}
	return token.hex;
}

function resolveKeyBackgroundExportValue(): {
	hex: string;
	cssValue: string;
} | null {
	const assignments = getExportRoleAssignments(getPalettesToExport());
	const primaryPalette = assignments.find(
		(a) => a.roleKey === "primary",
	)?.palette;
	const primaryKeyColor = primaryPalette?.keyColors[0];
	if (!primaryKeyColor) return null;

	const { color: primaryHex } = parseKeyColor(primaryKeyColor);
	const backgroundHex = state.lightBackgroundColor || "#ffffff";
	const textHex = state.darkBackgroundColor || "#000000";

	const cachedTokens = getCachedDadsTokens();
	const result = resolveKeyBackgroundColor({
		primaryHex,
		backgroundHex,
		textHex,
		preset: state.activePreset,
		dadsTokens: cachedTokens ?? undefined,
		primaryBaseChromaName: primaryPalette?.baseChromaName,
	});

	const cssValue = result.tokenRef
		? `var(--color-primitive-${result.tokenRef.hue}-${result.tokenRef.step})`
		: result.hex;

	return { hex: result.hex, cssValue };
}

/** Nested token tree structure for DADS tokens */
type TokenGroup<TLeaf> = Record<string, TLeaf>;
type NestedTokenGroup<TLeaf> = Record<string, TLeaf | TokenGroup<TLeaf>>;
type DeeplyNestedTokenGroup<TLeaf> = Record<
	string,
	TLeaf | NestedTokenGroup<TLeaf>
>;

type DadsTokenTree<TLeaf> = {
	primitive: Record<string, TokenGroup<TLeaf>>;
	neutral: NestedTokenGroup<TLeaf>;
	semantic: DeeplyNestedTokenGroup<TLeaf>;
};

function buildDadsTokenTree<TLeaf>(
	dadsTokens: DadsToken[],
	makeLeaf: (token: DadsToken) => TLeaf,
): DadsTokenTree<TLeaf> {
	const primitive: DadsTokenTree<TLeaf>["primitive"] = {};
	const neutral: DadsTokenTree<TLeaf>["neutral"] = {};
	const semantic: DadsTokenTree<TLeaf>["semantic"] = {};

	for (const token of dadsTokens) {
		const category = token.classification.category;
		if (category === "chromatic") {
			const hue = token.classification.hue;
			const scale = token.classification.scale;
			if (!hue || !scale) continue;
			if (!primitive[hue]) primitive[hue] = {};
			primitive[hue][String(scale)] = makeLeaf(token);
			continue;
		}

		if (category === "neutral") {
			const suffix = token.id.replace(/^dads-neutral-/, "");
			const scale = token.classification.scale;

			// white/black などスケールを持たないものはフラットで保持
			if (!scale) {
				neutral[suffix] = makeLeaf(token);
				continue;
			}

			const groupKey = suffix.replace(new RegExp(`-${scale}$`), "");
			const group = neutral[groupKey];
			if (!group || typeof group !== "object") {
				neutral[groupKey] = {};
			}
			(neutral[groupKey] as Record<string, TLeaf>)[String(scale)] =
				makeLeaf(token);
			continue;
		}

		if (category === "semantic") {
			const suffix = token.id.replace(/^dads-semantic-/, "");
			const parts = suffix.split("-");
			const kind = parts[0];

			// success-1 / error-2
			if (kind === "success" || kind === "error") {
				const index = parts[1];
				if (!index) {
					semantic[suffix] = makeLeaf(token);
					continue;
				}
				if (!semantic[kind] || typeof semantic[kind] !== "object") {
					semantic[kind] = {};
				}
				(semantic[kind] as Record<string, TLeaf>)[index] = makeLeaf(token);
				continue;
			}

			// warning-yellow-1 / warning-orange-2
			if (kind === "warning") {
				const pattern = parts[1];
				const index = parts[2];
				if (!pattern || !index) {
					semantic[suffix] = makeLeaf(token);
					continue;
				}
				if (!semantic.warning || typeof semantic.warning !== "object") {
					semantic.warning = {};
				}
				const warningGroup = semantic.warning as Record<
					string,
					TLeaf | Record<string, TLeaf>
				>;
				if (
					!warningGroup[pattern] ||
					typeof warningGroup[pattern] !== "object"
				) {
					warningGroup[pattern] = {};
				}
				(warningGroup[pattern] as Record<string, TLeaf>)[index] =
					makeLeaf(token);
				continue;
			}

			// それ以外はフラット
			semantic[suffix] = makeLeaf(token);
		}
	}

	return { primitive, neutral, semantic };
}

function getPaletteDadsPrimitiveRef(palette: {
	baseChromaName?: string;
	step?: number;
	keyColors: string[];
}): string | null {
	const keyColorInput = palette.keyColors[0];
	if (!keyColorInput) return null;

	const cachedTokens = getCachedDadsTokens();
	if (!cachedTokens) return null;

	const { color: hex } = parseKeyColor(keyColorInput);

	// 1) baseChromaName + step があればそれを優先（Studio/Derived/Accent候補で付与される）
	if (palette.baseChromaName && palette.step) {
		const hue = getDadsHueFromDisplayName(palette.baseChromaName);
		if (hue) {
			return `var(--color-primitive-${hue}-${palette.step})`;
		}
	}

	// 2) HEX がDADSプリミティブと完全一致する場合はそれを参照
	const dadsInfo = findDadsColorByHex(cachedTokens, hex);
	if (dadsInfo) {
		return `var(--color-primitive-${dadsInfo.hue}-${dadsInfo.scale})`;
	}

	return null;
}

function exportCssWithDadsTokens(): string {
	const dadsTokens = getCachedDadsTokens();
	if (!dadsTokens || dadsTokens.length === 0) {
		return "";
	}

	const lines: string[] = [];
	lines.push(":root {");

	// DADS tokens（公式プリミティブ+セマンティックをそのまま展開）
	for (const token of dadsTokens) {
		const varName = getDadsCssVariableName(token);
		const value = getDadsCssValue(token);
		lines.push(`  ${varName}: ${value};`);
	}

	lines.push("");

	// Role tokens（Primary/Secondary/Tertiary/Accent）: 1ロール=1トークン
	for (const { roleKey, palette } of getExportRoleAssignments(
		getPalettesToExport(),
	)) {
		const dadsRef = getPaletteDadsPrimitiveRef(palette);
		if (dadsRef) {
			lines.push(`  --color-${roleKey}: ${dadsRef};`);
			continue;
		}

		const keyColorInput = palette.keyColors[0];
		if (!keyColorInput) continue;
		const { color: hex } = parseKeyColor(keyColorInput);
		lines.push(`  --color-${roleKey}: ${hex};`);
	}

	// Key Surface（ヒーロー/KV/ストリップ背景のベース）
	const keySurface = resolveKeyBackgroundExportValue();
	if (keySurface) {
		lines.push(`  --color-key-surface: ${keySurface.cssValue};`);
	}

	lines.push("");

	// Semantic/link tokens（アプリ向け短縮エイリアス）
	for (const [cssVar, value] of getSemanticLinkAliasVarRefEntries(
		getActiveWarningPattern(),
	)) {
		lines.push(`  ${cssVar}: ${value};`);
	}

	lines.push("}");

	return lines.join("\n");
}

function buildExportCssVariableMap(): Record<string, string> {
	const vars: Record<string, string> = {};

	const dadsTokens = getCachedDadsTokens();
	const hasDadsTokens = !!(dadsTokens && dadsTokens.length > 0);

	if (hasDadsTokens && dadsTokens) {
		for (const token of dadsTokens) {
			const varName = getDadsCssVariableName(token);
			vars[varName] = getDadsCssValue(token);
		}
	}

	// Role tokens（Primary/Secondary/Tertiary/Accent）: 1ロール=1トークン
	for (const { roleKey, palette } of getExportRoleAssignments(
		getPalettesToExport(),
	)) {
		const dadsRef = getPaletteDadsPrimitiveRef(palette);
		if (dadsRef) {
			vars[`--color-${roleKey}`] = dadsRef;
			continue;
		}

		const keyColorInput = palette.keyColors[0];
		if (!keyColorInput) continue;
		const { color: hex } = parseKeyColor(keyColorInput);
		vars[`--color-${roleKey}`] = hex;
	}

	// Key Surface（ヒーロー/KV/ストリップ背景のベース）
	const keySurface = resolveKeyBackgroundExportValue();
	if (keySurface) {
		vars["--color-key-surface"] = keySurface.cssValue;
	}

	// Semantic/link tokens（アプリ向け短縮エイリアス）
	if (hasDadsTokens) {
		for (const [cssVar, value] of getSemanticLinkAliasVarRefEntries(
			getActiveWarningPattern(),
		)) {
			vars[cssVar] = value;
		}
	}

	return vars;
}

function exportTailwindConfigWithCssVars(
	colors: Parameters<typeof exportToTailwind>[0],
	rootVariables: Record<string, string>,
	options: { indent?: number; esModule?: boolean } = {},
): string {
	const { indent = 2, esModule = false } = options;
	const indentStr = " ".repeat(indent);

	const tailwindColors = exportToTailwind(colors, {
		esModule,
	}).colors;

	const colorsJson = JSON.stringify(tailwindColors, null, indent);
	const rootVarsJson = JSON.stringify(rootVariables, null, indent);

	const colorsBlock = colorsJson
		.split("\n")
		.join(`\n${indentStr}${indentStr}${indentStr}`);
	const rootVarsBlock = rootVarsJson
		.split("\n")
		.join(`\n${indentStr}${indentStr}${indentStr}${indentStr}`);

	if (esModule) {
		return `export default {
${indentStr}theme: {
${indentStr}${indentStr}extend: {
${indentStr}${indentStr}${indentStr}colors: ${colorsBlock}
${indentStr}${indentStr}}
${indentStr}},
${indentStr}plugins: [
${indentStr}${indentStr}function ({ addBase }) {
${indentStr}${indentStr}${indentStr}addBase({
${indentStr}${indentStr}${indentStr}${indentStr}":root": ${rootVarsBlock}
${indentStr}${indentStr}${indentStr}});
${indentStr}${indentStr}}
${indentStr}]
}`;
	}

	return `module.exports = {
${indentStr}theme: {
${indentStr}${indentStr}extend: {
${indentStr}${indentStr}${indentStr}colors: ${colorsBlock}
${indentStr}${indentStr}}
${indentStr}},
${indentStr}plugins: [
${indentStr}${indentStr}function ({ addBase }) {
${indentStr}${indentStr}${indentStr}addBase({
${indentStr}${indentStr}${indentStr}${indentStr}":root": ${rootVarsBlock}
${indentStr}${indentStr}${indentStr}});
${indentStr}${indentStr}}
${indentStr}]
}`;
}

function buildDtcgRoleTokenValues(
	baseColors: Record<string, Color>,
): Record<string, Color | string> {
	const dadsTokens = getCachedDadsTokens();
	if (!dadsTokens || dadsTokens.length === 0) {
		return baseColors;
	}

	const cssVars = buildExportCssVariableMap();
	const output: Record<string, Color | string> = {};

	for (const [name, color] of Object.entries(baseColors)) {
		const varValue = cssVars[`--color-${name}`];
		const match = varValue?.match(
			/^var\(--color-primitive-([a-z0-9-]+)-(\d+)\)$/,
		);
		if (match?.[1] && match[2]) {
			output[name] = `{color.dads.primitive.${match[1]}.${match[2]}}`;
			continue;
		}
		output[name] = color;
	}

	return output;
}

function generateDadsSemanticLinkExportColors(): Record<string, Color> {
	const warningPattern = getActiveWarningPattern();
	const { semantic, link } = exportDadsSemanticLinkColorsSync(warningPattern);

	const colors: Record<string, Color> = {};

	const add = (key: string, color: Color | undefined) => {
		if (!color) return;
		colors[key] = color;
	};

	add("success", semantic["Success-1"]);
	add("success-strong", semantic["Success-2"]);
	add("error", semantic["Error-1"]);
	add("error-strong", semantic["Error-2"]);
	add("warning", semantic["Warning-YL1"] ?? semantic["Warning-OR1"]);
	add("warning-strong", semantic["Warning-YL2"] ?? semantic["Warning-OR2"]);

	add("link", link["Link-Default"]);
	add("link-visited", link["Link-Visited"]);
	add("link-active", link["Link-Active"]);

	return colors;
}

/**
 * パレット名が現在の警告パターンに含まれるかを判定
 *
 * Warning-YL* / Warning-OR* のフィルタリングに使用
 *
 * @param paletteName - パレット名
 * @returns 含まれる場合true
 */
function shouldIncludePalette(paletteName: string): boolean {
	const lowerName = paletteName.toLowerCase();
	const activePattern = getActiveWarningPattern();

	// Warning-YL* / Warning-OR* のパターンチェック
	if (lowerName.includes("warning-yl")) {
		// 黄色パターンが選択されている場合のみ含める
		return activePattern === "yellow";
	}
	if (lowerName.includes("warning-or")) {
		// オレンジパターンが選択されている場合のみ含める
		return activePattern === "orange";
	}

	// Warning以外は常に含める
	return true;
}

/**
 * エクスポート関連DOM要素
 */
export interface ExportElements {
	exportBtn: HTMLElement | null;
	exportDialog: HTMLDialogElement | null;
	exportArea: HTMLTextAreaElement | null;
	exportFormatButtons: NodeListOf<Element>;
	exportCopyBtn: HTMLElement | null;
	exportDownloadBtn: HTMLElement | null;
}

/**
 * 全パレットから色を生成する
 *
 * shadesPalettesが存在する場合はそちらを使用、
 * ない場合はpalettesを使用する。
 *
 * @returns パレット名-ステップ番号 をキーとした色のRecord
 */
export function generateExportColors(): Record<string, Color> {
	const colors: Record<string, Color> = {};
	const bgColor = new Color("#ffffff");

	// エクスポートは全13色パレットを使用
	const palettesToExport =
		state.shadesPalettes.length > 0 ? state.shadesPalettes : state.palettes;

	for (const p of palettesToExport) {
		// 警告パターンフィルタ: 選択されていないパターンはスキップ
		if (!shouldIncludePalette(p.name)) continue;

		const keyColorInput = p.keyColors[0];
		if (!keyColorInput) continue;

		const { color: hex } = parseKeyColor(keyColorInput);
		const keyColor = new Color(hex);

		const baseRatios = getContrastRatios(state.contrastIntensity);

		const keyContrastRatio = keyColor.contrast(bgColor);
		let keyColorIndex = -1;
		let minDiff = Number.POSITIVE_INFINITY;

		for (let i = 0; i < baseRatios.length; i++) {
			const diff = Math.abs((baseRatios[i] ?? 0) - keyContrastRatio);
			if (diff < minDiff) {
				minDiff = diff;
				keyColorIndex = i;
			}
		}

		if (keyColorIndex >= 0) {
			baseRatios[keyColorIndex] = keyContrastRatio;
		}

		// 黄色系かどうかを判定
		const keyHue = keyColor.oklch.h ?? 0;
		const isYellowish = isWarmYellowHue(keyHue);

		const scaleColors: Color[] = baseRatios.map((ratio, i) => {
			// 黄色系以外はキーカラーをそのまま使用
			if (i === keyColorIndex && !isYellowish) return keyColor;
			// 黄色系はキーカラーも含めて全て変換（UIと一致させる）
			const solved = findColorForContrast(keyColor, bgColor, ratio);
			return solved || keyColor;
		});
		scaleColors.reverse();

		// Generate color name from palette name
		const paletteName = p.name.toLowerCase().replace(/\s+/g, "-");

		for (let index = 0; index < scaleColors.length; index++) {
			const color = scaleColors[index];
			if (!color) continue;
			const stepName = STEP_NAMES[index] ?? index * 100 + 50;
			colors[`${paletteName}-${stepName}`] = color;
		}
	}

	return colors;
}

/**
 * ファイルをダウンロードする
 *
 * @param content ファイル内容
 * @param filename ファイル名
 * @param mimeType MIMEタイプ
 */
export function downloadFile(
	content: string,
	filename: string,
	mimeType: string,
): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * 指定フォーマットでエクスポート内容を取得する
 *
 * @param format エクスポートフォーマット
 * @returns エクスポート内容の文字列
 */
export function getExportContent(format: ExportFormat): string {
	const baseColors = generateExportRoleColors();

	switch (format) {
		case "css": {
			const css = exportCssWithDadsTokens();
			if (css) return css;

			// フォールバック（DADS未ロード時）
			const colors = {
				...baseColors,
				...generateDadsSemanticLinkExportColors(),
			};
			const lines: string[] = [];
			lines.push(":root {");
			for (const [name, color] of Object.entries(colors)) {
				lines.push(`  --color-${name}: ${color.toHex()};`);
			}
			lines.push("}");
			return lines.join("\n");
		}
		case "tailwind": {
			const colors: Parameters<typeof exportToTailwind>[0] = {};

			for (const name of Object.keys(baseColors)) {
				colors[name] = `var(--color-${name})`;
			}

			const dadsTokens = getCachedDadsTokens();
			const hasDadsTokens = !!(dadsTokens && dadsTokens.length > 0);

			// Semantic/link tokens as nested sections (Tailwind "DEFAULT" pattern)
			if (hasDadsTokens) {
				colors.success = {
					DEFAULT: "var(--color-success)",
					strong: "var(--color-success-strong)",
				};
				colors.error = {
					DEFAULT: "var(--color-error)",
					strong: "var(--color-error-strong)",
				};
				colors.warning = {
					DEFAULT: "var(--color-warning)",
					strong: "var(--color-warning-strong)",
				};
				colors.link = {
					DEFAULT: "var(--color-link)",
					visited: "var(--color-link-visited)",
					active: "var(--color-link-active)",
				};

				const tree = buildDadsTokenTree(dadsTokens, (t) => {
					const varName = getDadsCssVariableName(t);
					return `var(${varName})`;
				});
				colors.dads = tree;
			}

			const rootVars = buildExportCssVariableMap();
			return exportTailwindConfigWithCssVars(colors, rootVars, {
				esModule: false,
			});
		}
		case "json": {
			const baseResult = exportToDTCG(buildDtcgRoleTokenValues(baseColors));

			// Warning パターンを取得
			const warningPattern = getActiveWarningPattern();

			// DADS semantic/link トークンを追加
			const dadsSemanticLink = exportDadsSemanticLinkTokensSync(warningPattern);

			const output: Record<string, unknown> = {
				...baseResult.tokens,
				...dadsSemanticLink,
			};

			const dadsTokens = getCachedDadsTokens();
			if (dadsTokens && dadsTokens.length > 0) {
				const tree = buildDadsTokenTree(dadsTokens, (t) => ({
					$value: getDadsCssValue(t),
					$type: "color" as const,
				}));
				const colorGroup =
					(output.color as Record<string, unknown> | undefined) ?? {};
				colorGroup.dads = tree;
				output.color = colorGroup;
			}

			return JSON.stringify(output, null, 2);
		}
	}
}

/**
 * エクスポートハンドラのセットアップ
 *
 * @param elements エクスポート関連DOM要素
 */
export function setupExportHandlers(elements: ExportElements): void {
	const {
		exportBtn,
		exportDialog,
		exportArea,
		exportFormatButtons,
		exportCopyBtn,
		exportDownloadBtn,
	} = elements;

	let currentExportFormat: ExportFormat = "css";

	const updateExportPreview = () => {
		const content = getExportContent(currentExportFormat);
		if (exportArea) {
			exportArea.value = content;
		}
	};

	const openExportDialog = () => {
		updateExportPreview();
		if (!exportDialog) return;

		const isOpen = exportDialog.open || exportDialog.hasAttribute("open");
		if (!isOpen) {
			try {
				if (typeof exportDialog.showModal === "function") {
					exportDialog.showModal();
				} else {
					exportDialog.setAttribute("open", "");
				}
			} catch {
				// JSDOMなどでshowModalが未実装の場合でもプレビュー表示は維持する
				exportDialog.setAttribute("open", "");
			}
		}
		syncModalOpenState();
	};

	if (exportDialog) {
		if (exportDialogWithCloseHandler && exportDialogCloseHandler) {
			exportDialogWithCloseHandler.removeEventListener(
				"close",
				exportDialogCloseHandler,
			);
		}

		exportDialogCloseHandler = () => {
			syncModalOpenState();
		};
		exportDialogWithCloseHandler = exportDialog;

		exportDialog.addEventListener("close", exportDialogCloseHandler);
	} else if (exportDialogWithCloseHandler && exportDialogCloseHandler) {
		exportDialogWithCloseHandler.removeEventListener(
			"close",
			exportDialogCloseHandler,
		);
		exportDialogWithCloseHandler = null;
		exportDialogCloseHandler = null;
	}

	if (exportBtn) {
		exportBtn.onclick = openExportDialog;
	}

	if (typeof document !== "undefined") {
		if (exportDialogTriggerClickHandler) {
			document.removeEventListener("click", exportDialogTriggerClickHandler);
		}

		exportDialogTriggerClickHandler = (event: MouseEvent) => {
			const target = event.target as
				| (EventTarget & { closest?: (selector: string) => Element | null })
				| null;
			if (!target?.closest) return;

			const trigger = target.closest(".studio-export-btn");
			if (!trigger) return;

			openExportDialog();
		};

		document.addEventListener("click", exportDialogTriggerClickHandler);
	}

	exportFormatButtons.forEach((btn) => {
		btn.addEventListener("click", () => {
			const format = (btn as HTMLElement).dataset.format as ExportFormat;
			if (!format) return;

			currentExportFormat = format;

			// Update button states
			exportFormatButtons.forEach((b) => {
				setButtonActive(b as HTMLElement, false);
			});
			setButtonActive(btn as HTMLElement, true);

			updateExportPreview();
		});
	});

	if (exportCopyBtn && exportArea) {
		exportCopyBtn.onclick = () => {
			navigator.clipboard.writeText(exportArea.value).then(() => {
				const originalText = exportCopyBtn.textContent;
				exportCopyBtn.textContent = "Copied!";
				setTimeout(() => {
					exportCopyBtn.textContent = originalText;
				}, 2000);
			});
		};
	}

	if (exportDownloadBtn && exportArea) {
		exportDownloadBtn.onclick = () => {
			const extensions: Record<ExportFormat, string> = {
				css: "colors.css",
				tailwind: "tailwind.colors.js",
				json: "colors.tokens.json",
			};
			const mimeTypes: Record<ExportFormat, string> = {
				css: "text/css",
				tailwind: "application/javascript",
				json: "application/json",
			};
			downloadFile(
				exportArea.value,
				extensions[currentExportFormat],
				mimeTypes[currentExportFormat],
			);
		};
	}
}

/**
 * 直接エクスポートボタン用のセットアップ（ヘッダー以外の個別ボタン）
 *
 * @param cssBtn CSSエクスポートボタン
 * @param tailwindBtn Tailwindエクスポートボタン
 * @param jsonBtn JSONエクスポートボタン
 */
export function setupDirectExportButtons(
	cssBtn: HTMLElement | null,
	tailwindBtn: HTMLElement | null,
	jsonBtn: HTMLElement | null,
): void {
	if (cssBtn) {
		cssBtn.onclick = () => {
			downloadFile(getExportContent("css"), "colors.css", "text/css");
		};
	}

	if (tailwindBtn) {
		tailwindBtn.onclick = () => {
			downloadFile(
				getExportContent("tailwind"),
				"tailwind.colors.js",
				"application/javascript",
			);
		};
	}

	if (jsonBtn) {
		jsonBtn.onclick = () => {
			downloadFile(
				getExportContent("json"),
				"colors.tokens.json",
				"application/json",
			);
		};
	}
}

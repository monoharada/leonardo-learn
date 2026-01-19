/**
 * パレットビューモジュール
 *
 * 新UI: 擬似ファーストビュー + トークンテーブル形式
 * セマンティックカラーは正しい役割で使用
 *
 * @module @/ui/demo/views/palette-view
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 5.1, 6.3, 6.4
 */

import { findNearestChroma } from "@/core/base-chroma";
import {
	getDadsColorsByHue,
	loadDadsTokens,
} from "@/core/tokens/dads-data-provider";
import type { DadsColorHue } from "@/core/tokens/types";
import { snapToCudColor } from "@/ui/cud-components";
import { parseColor } from "@/utils/color-space";
import { createBackgroundColorSelector } from "../background-color-selector";
import { getDisplayHex } from "../cvd-controls";
import { parseKeyColor, persistBackgroundColors, state } from "../state";
import { type ColorDetailModalOptions, stripStepSuffix } from "../types";
import {
	isValidHexColor,
	resolveAccentSourcePalette,
	resolveWarningPattern,
} from "../utils/palette-utils";
import {
	createPalettePreview,
	mapPaletteToPreviewColors,
	type PalettePreviewColors,
} from "./palette-preview";
import { createTokenTable, type TokenTableRow } from "./palette-token-table";

/**
 * パレットビューのコールバック
 */
export interface PaletteViewCallbacks {
	/** 色クリック時のコールバック（モーダル表示用） */
	onColorClick: (options: ColorDetailModalOptions) => void;
}

/**
 * リンクカラースタイル定義（DADS仕様）
 * スタイル1: 濃い青系（暗めのPrimary向け）
 * スタイル2: 中間の青系（標準）
 * スタイル3: 明るい青系（明るめのPrimary向け）
 */
type LinkStyleId = 1 | 2 | 3;

const LINK_STYLES: Record<
	LinkStyleId,
	{
		default: { hue: "blue" | "light-blue"; step: number };
		visited: { hue: "magenta"; step: number };
		active: { hue: "orange"; step: number };
	}
> = {
	1: {
		default: { hue: "blue", step: 1000 },
		visited: { hue: "magenta", step: 900 },
		active: { hue: "orange", step: 800 },
	},
	2: {
		default: { hue: "light-blue", step: 900 },
		visited: { hue: "magenta", step: 1000 },
		active: { hue: "orange", step: 800 },
	},
	3: {
		default: { hue: "light-blue", step: 800 },
		visited: { hue: "magenta", step: 1100 },
		active: { hue: "orange", step: 800 },
	},
};

/**
 * セマンティックカラーカテゴリ定義
 * UX順序に基づいて配置: Success → Warning → Error（稀）
 */
interface SemanticCategory {
	id: string;
	name: string;
	hue: DadsColorHue;
	steps: number[];
	tokenNames: string[];
}

/**
 * 固定セマンティックカテゴリ（Success, Error）
 */
const SEMANTIC_CATEGORIES = {
	success: {
		id: "success",
		name: "Success",
		hue: "green" as const,
		steps: [600, 800],
		tokenNames: ["サクセス1", "サクセス2"],
	},
	error: {
		id: "error",
		name: "Error",
		hue: "red" as const,
		steps: [800, 900],
		tokenNames: ["エラー1", "エラー2"],
	},
} satisfies Record<string, SemanticCategory>;

/**
 * 警告色パターン定義
 */
const WARNING_PATTERNS = {
	yellow: {
		id: "warning",
		name: "Warning",
		hue: "yellow" as const,
		steps: [700, 900],
		tokenNames: ["ワーニング1", "ワーニング2"],
	},
	orange: {
		id: "warning",
		name: "Warning",
		hue: "orange" as const,
		steps: [600, 800],
		tokenNames: ["ワーニング1", "ワーニング2"],
	},
} satisfies Record<"yellow" | "orange", SemanticCategory>;

/**
 * Primary/Accentカラーに基づいてリンクスタイルを自動選択
 *
 * 選択ロジック:
 * - Primaryの色相がBlue系（230-270）に近い場合 → Light Blue系（Style 2/3）で区別
 * - Primaryの明度が暗い（L < 0.4）→ Style 1（濃い青）
 * - Primaryの明度が中間（0.4-0.6）→ Style 2（中間）
 * - Primaryの明度が明るい（L > 0.6）→ Style 3（明るい青）
 */
function selectLinkStyle(primaryHex: string): LinkStyleId {
	const oklch = parseColor(primaryHex);
	if (!oklch) return 1;

	const hue = oklch.h ?? 0;
	const lightness = oklch.l ?? 0.5;
	const isBlueHue = hue >= 230 && hue <= 270;

	if (isBlueHue) {
		return lightness > 0.5 ? 3 : 2;
	}
	if (lightness < 0.4) return 1;
	if (lightness > 0.6) return 3;
	return 2;
}

/**
 * 選択されたリンクスタイルからセマンティックカテゴリを生成
 */
function getLinkCategories(styleId: LinkStyleId): SemanticCategory[] {
	const style = LINK_STYLES[styleId];
	return [
		{
			id: "link-default",
			name: "Link Default",
			hue: style.default.hue as DadsColorHue,
			steps: [style.default.step],
			tokenNames: ["リンク"],
		},
		{
			id: "link-visited",
			name: "Link Visited",
			hue: style.visited.hue as DadsColorHue,
			steps: [style.visited.step],
			tokenNames: ["リンク:visited"],
		},
		{
			id: "link-active",
			name: "Link Active",
			hue: style.active.hue as DadsColorHue,
			steps: [style.active.step],
			tokenNames: ["リンク:active"],
		},
	];
}

/**
 * 空状態のメッセージを表示する
 */
function renderEmptyState(container: HTMLElement, viewName: string): void {
	const empty = document.createElement("div");
	empty.className = "dads-empty-state";
	empty.innerHTML = `
		<p>${viewName}が生成されていません</p>
		<p>ハーモニービューでスタイルを選択してパレットを生成してください。</p>
	`;
	container.innerHTML = "";
	container.appendChild(empty);
}

function inferBaseChromaNameFromHex(hex: string): string | null {
	const oklch = parseColor(hex);
	if (!oklch) return null;
	const nearest = findNearestChroma(oklch.h ?? 0);
	return nearest.displayName;
}

function getPrimaryPalette() {
	const primaryByName = state.palettes.find((p) =>
		p.name.startsWith("Primary"),
	);
	if (primaryByName) return primaryByName;

	const derivedPrimaryId = state.palettes.find(
		(p) => p.derivedFrom?.primaryPaletteId,
	)?.derivedFrom?.primaryPaletteId;
	if (derivedPrimaryId) {
		const primaryById = state.palettes.find((p) => p.id === derivedPrimaryId);
		if (primaryById) return primaryById;
	}

	return state.palettes[0];
}

/**
 * カテゴリからトークン行を生成するヘルパー
 */
function buildTokenRowsFromCategory(
	dadsTokens: Awaited<ReturnType<typeof loadDadsTokens>>,
	category: SemanticCategory,
): TokenTableRow[] {
	const colorScale = getDadsColorsByHue(dadsTokens, category.hue);
	const rows: TokenTableRow[] = [];

	for (let i = 0; i < category.steps.length; i++) {
		const step = category.steps[i];
		const tokenName = category.tokenNames[i];
		const colorEntry = colorScale.colors.find((c) => c.scale === step);
		if (colorEntry && tokenName) {
			rows.push({
				colorSwatch: getDisplayHex(colorEntry.hex),
				tokenName,
				primitiveName: `${category.hue}-${step}`,
				hex: colorEntry.hex,
				category: "semantic",
			});
		}
	}
	return rows;
}

/**
 * セマンティックカラーのトークン行を抽出
 * UX順序: Link → Success → Warning → Error
 */
async function extractSemanticTokenRows(
	dadsTokens: Awaited<ReturnType<typeof loadDadsTokens>>,
	primaryHex: string,
): Promise<TokenTableRow[]> {
	const linkStyleId = selectLinkStyle(primaryHex);
	const linkCategories = getLinkCategories(linkStyleId);
	const warningCategory =
		WARNING_PATTERNS[resolveWarningPattern(state.semanticColorConfig)];

	// カテゴリを順序通りに処理: Link → Success → Warning → Error
	const allCategories: SemanticCategory[] = [
		...linkCategories,
		SEMANTIC_CATEGORIES.success,
		warningCategory,
		SEMANTIC_CATEGORIES.error,
	];

	return allCategories.flatMap((category) =>
		buildTokenRowsFromCategory(dadsTokens, category),
	);
}

function getSwatchHexWithCudMode(hex: string): {
	baseHex: string;
	swatchHex: string;
} {
	let baseHex = hex;
	if (state.cudMode === "strict") {
		const snapResult = snapToCudColor(hex, { mode: "strict" });
		baseHex = snapResult.hex;
	}
	return { baseHex, swatchHex: getDisplayHex(baseHex) };
}

/**
 * Primary/Secondary/Tertiary/Accentのトークン行を抽出
 */
function extractPaletteTokenRows(): TokenTableRow[] {
	const rows: TokenTableRow[] = [];
	const primaryPaletteId = getPrimaryPalette()?.id;

	for (const palette of state.palettes) {
		const keyColorInput = palette.keyColors[0];
		if (!keyColorInput) continue;

		const { color: hex, step: definedStep } = parseKeyColor(keyColorInput);
		const paletteName = palette.name;
		const derivationType = palette.derivedFrom?.derivationType;

		const isPrimary = primaryPaletteId
			? palette.id === primaryPaletteId
			: paletteName.startsWith("Primary");
		const isSecondary =
			derivationType === "secondary" || paletteName.startsWith("Secondary");
		const isTertiary =
			derivationType === "tertiary" || paletteName.startsWith("Tertiary");
		const isAccent = paletteName.startsWith("Accent");

		const { baseHex, swatchHex } = getSwatchHexWithCudMode(hex);

		const step = definedStep ?? palette.step ?? 600;
		const chromaName = (
			palette.baseChromaName ||
			inferBaseChromaNameFromHex(baseHex) ||
			paletteName
		)
			.toLowerCase()
			.replace(/\s+/g, "-");

		let primaryRoleLabel: "プライマリ" | "セカンダリ" | "ターシャリ" | null =
			null;
		if (isPrimary) primaryRoleLabel = "プライマリ";
		else if (isSecondary) primaryRoleLabel = "セカンダリ";
		else if (isTertiary) primaryRoleLabel = "ターシャリ";

		if (primaryRoleLabel) {
			rows.push({
				colorSwatch: swatchHex,
				tokenName: primaryRoleLabel,
				primitiveName: isPrimary ? "brand-color" : `${chromaName}-${step}`,
				hex: baseHex,
				category: "primary",
			});
			continue;
		}

		if (!isAccent) continue;

		// Accent-1, Accent-2 などの番号を抽出
		const accentMatch = paletteName.match(/Accent.*?(\d+)/);
		const accentNum = accentMatch ? accentMatch[1] : "1";
		rows.push({
			colorSwatch: swatchHex,
			tokenName: `アクセント${accentNum}`,
			primitiveName: `${chromaName}-${step}`,
			hex: baseHex,
			category: "accent",
		});
	}

	// Accent* が存在しない場合でも、最低1色はアクセントを表示する
	// ロジック上はアクセントが必ず存在する想定だが、旧フロー等の保険としてSecondaryを流用する
	if (!rows.some((row) => row.category === "accent")) {
		const fallbackPalette = resolveAccentSourcePalette(state.palettes);
		const keyColorInput = fallbackPalette?.keyColors[0];
		const { color: hex, step: definedStep } = keyColorInput
			? parseKeyColor(keyColorInput)
			: { color: "#259063", step: undefined };

		const { baseHex, swatchHex } = getSwatchHexWithCudMode(hex);

		const step = definedStep ?? fallbackPalette?.step ?? 600;
		const chromaName = (
			fallbackPalette?.baseChromaName ||
			inferBaseChromaNameFromHex(baseHex) ||
			fallbackPalette?.name ||
			"accent-fallback"
		)
			.toLowerCase()
			.replace(/\s+/g, "-");

		rows.push({
			colorSwatch: swatchHex,
			tokenName: "アクセント1",
			primitiveName: `${chromaName}-${step}`,
			hex: baseHex,
			category: "accent",
		});
	}

	return rows;
}

/**
 * Primaryパレットを検索してHEX値を抽出する
 * "@step"形式の場合はHEX部分のみを返す
 */
function getPrimaryHex(): string {
	const primaryPalette = getPrimaryPalette();
	return stripStepSuffix(primaryPalette?.keyColors[0] ?? "") || "#00A3BF";
}

/**
 * プレビュー用カラーを抽出
 */
async function extractPreviewColors(
	dadsTokens: Awaited<ReturnType<typeof loadDadsTokens>>,
	primaryHex: string,
): Promise<PalettePreviewColors> {
	const accentPalette = resolveAccentSourcePalette(state.palettes);
	const accentHex =
		stripStepSuffix(accentPalette?.keyColors[0] ?? "") || "#259063";

	const warningDef =
		WARNING_PATTERNS[resolveWarningPattern(state.semanticColorConfig)];
	const warningScale = getDadsColorsByHue(dadsTokens, warningDef.hue);
	const warningStep = warningDef.steps[0] || 700;

	const semanticColors = {
		error:
			getDadsColorsByHue(dadsTokens, "red").colors.find((c) => c.scale === 800)
				?.hex || "#FF2800",
		success:
			getDadsColorsByHue(dadsTokens, "green").colors.find(
				(c) => c.scale === 600,
			)?.hex || "#35A16B",
		warning:
			warningScale.colors.find((c) => c.scale === warningStep)?.hex ||
			"#D7C447",
		link:
			getDadsColorsByHue(dadsTokens, "blue").colors.find(
				(c) => c.scale === 1000,
			)?.hex || "#0091FF",
	};

	return mapPaletteToPreviewColors({
		primaryHex,
		accentHex,
		semanticColors,
		backgroundColor: state.lightBackgroundColor,
	});
}

/**
 * パレットビューをレンダリングする
 *
 * 新UI構成:
 * 1. 背景色セレクター
 * 2. 擬似ファーストビュー（プレビュー）
 * 3. トークンテーブル
 * 4. CUD検証パネル
 *
 * @param container レンダリング先のコンテナ要素
 * @param callbacks コールバック関数
 */
export async function renderPaletteView(
	container: HTMLElement,
	callbacks: PaletteViewCallbacks,
): Promise<void> {
	container.className = "dads-section";

	// パレットが生成されていない場合
	if (state.palettes.length === 0) {
		renderEmptyState(container, "パレット");
		return;
	}

	// DADSトークンを読み込む
	let dadsTokens: Awaited<ReturnType<typeof loadDadsTokens>> | null = null;
	try {
		dadsTokens = await loadDadsTokens();
	} catch (error) {
		console.error("Failed to load DADS tokens for palette view:", error);
	}

	// コンテナをクリア
	container.innerHTML = "";

	// 背景色セレクター
	const backgroundSelectorSection = document.createElement("section");
	backgroundSelectorSection.className = "background-color-selector-wrapper";
	const backgroundSelector = createBackgroundColorSelector({
		lightColor: state.lightBackgroundColor,
		darkColor: state.darkBackgroundColor,
		onLightColorChange: (hex: string) => {
			state.lightBackgroundColor = hex;
			persistBackgroundColors(
				state.lightBackgroundColor,
				state.darkBackgroundColor,
			);
			container.style.backgroundColor = hex;
			void renderPaletteView(container, callbacks).catch((err) => {
				console.error("Failed to re-render palette view:", err);
			});
		},
		onDarkColorChange: (hex: string) => {
			state.darkBackgroundColor = hex;
			persistBackgroundColors(
				state.lightBackgroundColor,
				state.darkBackgroundColor,
			);
			void renderPaletteView(container, callbacks).catch((err) => {
				console.error("Failed to re-render palette view:", err);
			});
		},
	});
	backgroundSelectorSection.appendChild(backgroundSelector);
	container.appendChild(backgroundSelectorSection);

	// 背景色を設定
	container.style.backgroundColor = state.lightBackgroundColor;

	// DADSトークンが利用可能な場合のみプレビューとテーブルを表示
	if (dadsTokens) {
		// 擬似ファーストビュー（プレビュー）
		const previewSection = document.createElement("section");
		previewSection.className = "dads-preview-section";

		const previewHeading = document.createElement("h2");
		previewHeading.className = "dads-section__heading";
		previewHeading.textContent = "カラープレビュー";
		previewSection.appendChild(previewHeading);

		// Primaryカラーを取得（プレビューとリンクスタイル自動選択で共有）
		const primaryHex = getPrimaryHex();

		const previewColors = await extractPreviewColors(dadsTokens, primaryHex);
		const accentHexes = state.palettes
			.filter((p) => p.name.startsWith("Accent"))
			.map((p) => stripStepSuffix(p.keyColors[0] ?? ""))
			.filter((hex) => isValidHexColor(hex));
		const preview = createPalettePreview(previewColors, {
			getDisplayHex,
			kv: state.previewKv,
			accentHexes,
		});
		previewSection.appendChild(preview);
		container.appendChild(previewSection);

		// トークンテーブル
		const tableSection = document.createElement("section");
		tableSection.className = "dads-token-table-section";

		const tableHeading = document.createElement("h2");
		tableHeading.className = "dads-section__heading";
		tableHeading.textContent = "トークン一覧";
		tableSection.appendChild(tableHeading);

		// Primary/Secondary/Tertiary/Accent を先に、セマンティックトークンを後に配置
		// UX順序: Primary → Secondary → Tertiary → Accent → Link → Success → Warning → Error
		const paletteRows = extractPaletteTokenRows();
		const semanticRows = await extractSemanticTokenRows(dadsTokens, primaryHex);
		const allRows = [...paletteRows, ...semanticRows];

		const table = createTokenTable(allRows);
		tableSection.appendChild(table);
		container.appendChild(tableSection);
	}
}

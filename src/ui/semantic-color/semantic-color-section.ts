/**
 * セマンティックカラーセクション
 *
 * パレットビュー内でセマンティックカラー（Error, Success, Warning, Link）を
 * 表示し、警告色パターンの選択UIを提供する
 *
 * @module @/ui/semantic-color/semantic-color-section
 */

import { analyzeWarningPatterns } from "@/core/semantic-color/warning-pattern-selector";
import {
	getDadsColorsByHue,
	loadDadsTokens,
} from "@/core/tokens/dads-data-provider";
import { persistSemanticColorConfig, state } from "@/ui/demo/state";
import type { SemanticColorConfig, WarningPatternType } from "@/ui/demo/types";

/**
 * セマンティックカラーセクションのコールバック
 */
export interface SemanticColorSectionCallbacks {
	/** 警告パターン変更時のコールバック */
	onWarningPatternChange: (pattern: WarningPatternType) => void;
}

/**
 * セマンティックカラーカテゴリの定義
 */
interface SemanticColorCategory {
	/** カテゴリID */
	id: string;
	/** 表示名 */
	name: string;
	/** 日本語名 */
	nameJa: string;
	/** DADSの色相 */
	hue: "red" | "green" | "yellow" | "orange" | "blue";
	/** トークンステップ */
	steps: number[];
	/** トークン名 */
	tokenNames: string[];
}

/**
 * セマンティックカラーカテゴリ定義
 * 警告色はパターンに応じて動的に決定
 */
const SEMANTIC_CATEGORIES: SemanticColorCategory[] = [
	{
		id: "error",
		name: "Error",
		nameJa: "エラー",
		hue: "red",
		steps: [800, 900],
		tokenNames: ["Error-1", "Error-2"],
	},
	{
		id: "success",
		name: "Success",
		nameJa: "成功",
		hue: "green",
		steps: [600, 800],
		tokenNames: ["Success-1", "Success-2"],
	},
	{
		id: "link",
		name: "Link",
		nameJa: "リンク",
		hue: "blue",
		steps: [1000],
		tokenNames: ["Link-Default"],
	},
];

/**
 * 警告色のパターン定義
 */
const WARNING_PATTERNS = {
	yellow: {
		hue: "yellow" as const,
		steps: [700, 900],
		tokenNames: ["Warning-YL1", "Warning-YL2"],
	},
	orange: {
		hue: "orange" as const,
		steps: [600, 800],
		tokenNames: ["Warning-OR1", "Warning-OR2"],
	},
};

/**
 * 警告色カテゴリを取得
 */
function getWarningCategory(): SemanticColorCategory {
	const pattern = state.semanticColorConfig.warningPattern;
	const resolvedPattern =
		pattern === "auto"
			? state.semanticColorConfig.resolvedWarningPattern || "yellow"
			: pattern;

	const warningDef = WARNING_PATTERNS[resolvedPattern];
	return {
		id: "warning",
		name: "Warning",
		nameJa: "警告",
		hue: warningDef.hue,
		steps: warningDef.steps,
		tokenNames: warningDef.tokenNames,
	};
}

/**
 * セマンティックカラーセクションを作成
 *
 * @param callbacks - コールバック
 * @returns セクション要素
 */
export async function createSemanticColorSection(
	callbacks: SemanticColorSectionCallbacks,
): Promise<HTMLElement> {
	const section = document.createElement("section");
	section.className = "dads-semantic-section";
	section.dataset.testid = "semantic-color-section";

	// セクション見出し（モダンスタイル）
	const heading = document.createElement("h2");
	heading.className = "dads-semantic-section__heading";
	heading.textContent = "セマンティックカラー";
	section.appendChild(heading);

	// 警告パターン選択UI
	const patternSelector = createWarningPatternSelector(callbacks);
	section.appendChild(patternSelector);

	// セマンティックカラーカード
	const cardsContainer = document.createElement("div");
	cardsContainer.className = "dads-semantic-cards";
	cardsContainer.dataset.testid = "semantic-color-cards";

	await renderSemanticColors(cardsContainer);
	section.appendChild(cardsContainer);

	return section;
}

/**
 * 警告パターン選択UIを作成
 */
function createWarningPatternSelector(
	callbacks: SemanticColorSectionCallbacks,
): HTMLElement {
	const container = document.createElement("div");
	container.className = "dads-warning-pattern-selector";
	container.dataset.testid = "warning-pattern-selector";

	// ラベル
	const label = document.createElement("span");
	label.className = "dads-label";
	label.textContent = "警告色パターン:";
	container.appendChild(label);

	// ラジオグループ
	const radioGroup = document.createElement("div");
	radioGroup.className = "dads-radio-group";
	radioGroup.setAttribute("role", "radiogroup");
	radioGroup.setAttribute("aria-label", "警告色パターン選択");

	const options: Array<{ value: WarningPatternType; label: string }> = [
		{ value: "yellow", label: "黄色系 (Pattern 1)" },
		{ value: "orange", label: "オレンジ系 (Pattern 2)" },
		{ value: "auto", label: "自動選択 (CUD推奨)" },
	];

	for (const opt of options) {
		const radioWrapper = document.createElement("label");
		radioWrapper.className = "dads-radio-label";

		const radio = document.createElement("input");
		radio.type = "radio";
		radio.name = "warningPattern";
		radio.value = opt.value;
		radio.checked = state.semanticColorConfig.warningPattern === opt.value;
		radio.className = "dads-radio";
		radio.dataset.testid = `warning-pattern-${opt.value}`;

		radio.addEventListener("change", () => {
			if (radio.checked) {
				callbacks.onWarningPatternChange(opt.value);
			}
		});

		const text = document.createElement("span");
		text.textContent = opt.label;

		radioWrapper.appendChild(radio);
		radioWrapper.appendChild(text);
		radioGroup.appendChild(radioWrapper);
	}

	container.appendChild(radioGroup);

	// 自動選択時の情報表示
	const autoInfo = document.createElement("div");
	autoInfo.className = "dads-auto-selection-info";
	autoInfo.dataset.testid = "auto-selection-info";
	autoInfo.hidden = state.semanticColorConfig.warningPattern !== "auto";

	if (state.semanticColorConfig.autoSelectionDetails) {
		const details = state.semanticColorConfig.autoSelectionDetails;
		autoInfo.textContent = details.reason;
	}

	container.appendChild(autoInfo);

	return container;
}

/**
 * セマンティックカラーカードをレンダリング
 */
async function renderSemanticColors(container: HTMLElement): Promise<void> {
	const tokens = await loadDadsTokens();

	// 全カテゴリ（警告色を動的に追加）
	const allCategories = [...SEMANTIC_CATEGORIES, getWarningCategory()];

	container.innerHTML = "";

	for (const category of allCategories) {
		const colorScale = getDadsColorsByHue(tokens, category.hue);

		const card = document.createElement("div");
		card.className = "dads-semantic-category-card";
		card.dataset.category = category.id;
		card.dataset.testid = `semantic-category-${category.id}`;

		// カテゴリラベル
		const categoryLabel = document.createElement("h3");
		categoryLabel.className = "dads-semantic-category-label";
		categoryLabel.textContent = `${category.name} (${category.nameJa})`;
		card.appendChild(categoryLabel);

		// スウォッチ行
		const swatchRow = document.createElement("div");
		swatchRow.className = "dads-semantic-swatch-row";

		for (let i = 0; i < category.steps.length; i++) {
			const step = category.steps[i];
			const tokenName = category.tokenNames[i];
			const colorEntry = colorScale.colors.find((c) => c.scale === step);

			if (colorEntry) {
				const swatch = createSemanticSwatch(
					colorEntry.hex,
					tokenName || `${category.name}-${step}`,
					`${category.hue}-${step}`,
				);
				swatchRow.appendChild(swatch);
			}
		}

		card.appendChild(swatchRow);
		container.appendChild(card);
	}
}

/**
 * セマンティックスウォッチを作成
 */
function createSemanticSwatch(
	hex: string,
	tokenName: string,
	dadsId: string,
): HTMLElement {
	const swatch = document.createElement("button");
	swatch.type = "button";
	swatch.className = "dads-semantic-swatch";
	swatch.style.backgroundColor = hex;
	swatch.dataset.hex = hex;
	swatch.dataset.tokenName = tokenName;
	swatch.dataset.dadsId = dadsId;
	swatch.dataset.testid = `semantic-swatch-${tokenName}`;

	// テキスト色を自動調整（明度に基づく）
	const textColor = getContrastTextColor(hex);
	swatch.style.color = textColor;

	// トークン名
	const nameLabel = document.createElement("span");
	nameLabel.className = "dads-semantic-swatch__name";
	nameLabel.textContent = tokenName;
	swatch.appendChild(nameLabel);

	// HEX値
	const hexLabel = document.createElement("code");
	hexLabel.className = "dads-semantic-swatch__hex";
	hexLabel.textContent = hex.toUpperCase();
	swatch.appendChild(hexLabel);

	// アクセシビリティ
	swatch.setAttribute("aria-label", `${tokenName}: ${hex}`);
	swatch.title = `${tokenName}\n${hex}`;

	return swatch;
}

/**
 * 背景色に対するコントラストテキスト色を取得
 */
function getContrastTextColor(bgHex: string): string {
	// 簡易的な明度判定（より正確にはOKLCH変換を使用すべき）
	const hex = bgHex.replace("#", "");
	const r = Number.parseInt(hex.slice(0, 2), 16);
	const g = Number.parseInt(hex.slice(2, 4), 16);
	const b = Number.parseInt(hex.slice(4, 6), 16);

	// 相対輝度の簡易計算
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * 警告パターン変更時の処理
 *
 * @param pattern - 選択されたパターン
 * @param anchorHex - アンカーカラー（自動選択時のCUD分析用）
 * @param paletteHexes - パレット色配列（自動選択時のCUD分析用）
 */
export async function handleWarningPatternChange(
	pattern: WarningPatternType,
	anchorHex: string,
	paletteHexes: string[],
): Promise<void> {
	const config: SemanticColorConfig = {
		warningPattern: pattern,
	};

	// 自動選択の場合はCUD分析を実行
	if (pattern === "auto") {
		const analysis = await analyzeWarningPatterns(anchorHex, paletteHexes);
		config.resolvedWarningPattern = analysis.recommended;
		config.autoSelectionDetails = {
			yellowScore: analysis.yellowScore.score,
			orangeScore: analysis.orangeScore.score,
			reason: analysis.reason,
		};
	}

	// 状態更新
	state.semanticColorConfig = config;

	// 永続化
	persistSemanticColorConfig(config);
}

/**
 * 自動選択情報の表示を更新
 */
export function updateAutoSelectionInfo(container: HTMLElement): void {
	const infoElement = container.querySelector(
		'[data-testid="auto-selection-info"]',
	) as HTMLElement | null;

	if (!infoElement) return;

	const isAutoMode = state.semanticColorConfig.warningPattern === "auto";
	infoElement.hidden = !isAutoMode;

	if (isAutoMode && state.semanticColorConfig.autoSelectionDetails) {
		infoElement.textContent =
			state.semanticColorConfig.autoSelectionDetails.reason;
	}
}

/**
 * CUD UIコンポーネント
 * DADSハーモニーUIへのCUD機能統合
 *
 * Requirements: 6.1-6.4, 7.1-7.3
 */

import {
	type CudSearchResult,
	findNearestCudColor,
	type MatchLevel,
} from "../core/cud/service";
import {
	type IssueSeverity,
	type PaletteColor,
	type ValidationIssue,
	type ValidationResult,
	validatePalette,
} from "../core/cud/validator";

// Re-export types for convenience
export type { PaletteColor, ValidationResult, ValidationIssue, IssueSeverity };

/**
 * CUDバッジの設定
 */
interface CudBadgeConfig {
	/** バッジのテキスト */
	text: string;
	/** バッジの背景色 */
	backgroundColor: string;
	/** バッジのテキスト色 */
	textColor: string;
	/** ツールチップテキスト */
	tooltip: string;
}

/**
 * マッチレベル別のバッジ設定
 */
const BADGE_CONFIGS: Record<MatchLevel, CudBadgeConfig> = {
	exact: {
		text: "CUD",
		backgroundColor: "#35A16B", // CUD green
		textColor: "#FFFFFF",
		tooltip: "CUD推奨色と完全一致",
	},
	near: {
		text: "≈CUD",
		backgroundColor: "#FF9900", // CUD orange
		textColor: "#000000",
		tooltip: "CUD推奨色に近い",
	},
	off: {
		text: "!CUD",
		backgroundColor: "#84919E", // CUD gray
		textColor: "#FFFFFF",
		tooltip: "CUD推奨色セット外",
	},
};

/**
 * 深刻度別の表示設定
 */
const SEVERITY_STYLES: Record<
	IssueSeverity,
	{ icon: string; color: string; label: string }
> = {
	error: {
		icon: "×",
		color: "#FF2800", // CUD red
		label: "エラー",
	},
	warning: {
		icon: "!",
		color: "#FF9900", // CUD orange
		label: "警告",
	},
	info: {
		icon: "i",
		color: "#0041FF", // CUD blue
		label: "情報",
	},
};

/**
 * CUDバッジを生成する
 * Requirement 6.1: 各色にCUDバッジ（exact/near/off）を表示
 *
 * @param hex - 色のHEX値
 * @returns バッジのHTML要素
 */
export const createCudBadge = (hex: string): HTMLElement => {
	const result = findNearestCudColor(hex);
	const config = BADGE_CONFIGS[result.matchLevel];

	const badge = document.createElement("span");
	badge.className = "cud-badge";
	badge.textContent = config.text;
	badge.title = `${config.tooltip}\n最近接: ${result.nearest.nameJa} (${result.nearest.hex})\nΔE: ${result.deltaE.toFixed(3)}`;
	badge.style.cssText = `
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2px 6px;
		font-size: 10px;
		font-weight: bold;
		border-radius: 3px;
		background-color: ${config.backgroundColor};
		color: ${config.textColor};
		cursor: help;
		margin-left: 4px;
	`;

	badge.setAttribute("data-match-level", result.matchLevel);
	badge.setAttribute("data-nearest-id", result.nearest.id);
	badge.setAttribute("data-delta-e", result.deltaE.toString());

	return badge;
};

/**
 * CUD検索結果を取得する（バッジなしで結果のみ必要な場合）
 *
 * @param hex - 色のHEX値
 * @returns CUD検索結果
 */
export const getCudMatchInfo = (hex: string): CudSearchResult => {
	return findNearestCudColor(hex);
};

/**
 * 診断結果パネルを生成する
 * Requirement 6.2, 6.4: 検証結果を問題/注意/推奨例の3カラムで表示
 *
 * @param result - 検証結果
 * @returns 診断パネルのHTML要素
 */
export const createDiagnosticPanel = (
	result: ValidationResult,
): HTMLElement => {
	const panel = document.createElement("div");
	panel.className = "cud-diagnostic-panel";
	panel.style.cssText = `
		padding: 16px;
		border-radius: 8px;
		background: #f8f9fa;
		margin-top: 16px;
	`;

	// サマリーヘッダー
	const header = document.createElement("div");
	header.className = "cud-diagnostic-header";
	header.style.cssText = `
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
		padding-bottom: 12px;
		border-bottom: 1px solid #dee2e6;
	`;

	const statusIcon = document.createElement("span");
	statusIcon.textContent = result.ok ? "✓" : "×";
	statusIcon.style.cssText = `
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		font-weight: bold;
		background: ${result.ok ? "#35A16B" : "#FF2800"};
		color: white;
	`;

	const summaryText = document.createElement("span");
	summaryText.textContent = result.summary;
	summaryText.style.fontWeight = "500";

	header.appendChild(statusIcon);
	header.appendChild(summaryText);
	panel.appendChild(header);

	// 問題がない場合
	if (result.issues.length === 0) {
		const noIssues = document.createElement("p");
		noIssues.textContent = "問題は検出されませんでした。";
		noIssues.style.color = "#6c757d";
		panel.appendChild(noIssues);
		return panel;
	}

	// 3カラムレイアウト
	const columns = document.createElement("div");
	columns.style.cssText = `
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	`;

	// 深刻度別に分類
	const errors = result.issues.filter((i) => i.severity === "error");
	const warnings = result.issues.filter((i) => i.severity === "warning");
	const infos = result.issues.filter((i) => i.severity === "info");

	// エラーカラム
	columns.appendChild(createIssueColumn("エラー", errors, "error"));
	// 警告カラム
	columns.appendChild(createIssueColumn("警告", warnings, "warning"));
	// 情報カラム
	columns.appendChild(createIssueColumn("情報", infos, "info"));

	panel.appendChild(columns);
	return panel;
};

/**
 * 問題カラムを生成する
 */
const createIssueColumn = (
	title: string,
	issues: ValidationIssue[],
	severity: IssueSeverity,
): HTMLElement => {
	const column = document.createElement("div");
	column.className = `cud-issue-column cud-issue-column--${severity}`;
	column.style.cssText = `
		background: white;
		border-radius: 6px;
		padding: 12px;
		border-left: 3px solid ${SEVERITY_STYLES[severity].color};
	`;

	const columnHeader = document.createElement("h4");
	columnHeader.style.cssText = `
		margin: 0 0 8px 0;
		font-size: 14px;
		color: ${SEVERITY_STYLES[severity].color};
		display: flex;
		align-items: center;
		gap: 6px;
	`;

	const icon = document.createElement("span");
	icon.textContent = SEVERITY_STYLES[severity].icon;
	icon.style.cssText = `
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: ${SEVERITY_STYLES[severity].color};
		color: white;
		font-size: 12px;
		font-weight: bold;
	`;

	columnHeader.appendChild(icon);
	columnHeader.appendChild(
		document.createTextNode(`${title} (${issues.length})`),
	);
	column.appendChild(columnHeader);

	if (issues.length === 0) {
		const empty = document.createElement("p");
		empty.textContent = "なし";
		empty.style.cssText = "color: #6c757d; font-size: 12px; margin: 0;";
		column.appendChild(empty);
	} else {
		const list = document.createElement("ul");
		list.style.cssText = `
			margin: 0;
			padding: 0 0 0 16px;
			font-size: 12px;
		`;

		// 多い場合はアコーディオン形式
		const displayIssues = issues.length > 3 ? issues.slice(0, 3) : issues;

		for (const issue of displayIssues) {
			const item = document.createElement("li");
			item.style.marginBottom = "4px";
			item.textContent = issue.message;
			list.appendChild(item);
		}

		if (issues.length > 3) {
			const more = document.createElement("li");
			more.style.cssText = "color: #6c757d; cursor: pointer;";
			more.textContent = `他 ${issues.length - 3} 件...`;
			more.onclick = () => {
				// 展開処理
				list.innerHTML = "";
				for (const issue of issues) {
					const item = document.createElement("li");
					item.style.marginBottom = "4px";
					item.textContent = issue.message;
					list.appendChild(item);
				}
			};
			list.appendChild(more);
		}

		column.appendChild(list);
	}

	return column;
};

/**
 * CUDサブモード切り替えボタンを生成する
 * Requirement 6.3: CUDサブモードの切り替え
 *
 * @param onToggle - 切り替え時のコールバック
 * @param initialState - 初期状態
 * @returns ボタン要素
 */
export const createCudSubModeToggle = (
	onToggle: (enabled: boolean) => void,
	initialState = false,
): HTMLElement => {
	const container = document.createElement("div");
	container.className = "cud-submode-toggle";
	container.style.cssText = `
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: #f0f4f8;
		border-radius: 6px;
		margin-bottom: 12px;
	`;

	const label = document.createElement("label");
	label.style.cssText = `
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		font-size: 14px;
	`;

	const checkbox = document.createElement("input");
	checkbox.type = "checkbox";
	checkbox.checked = initialState;
	checkbox.style.cssText = `
		width: 18px;
		height: 18px;
		cursor: pointer;
	`;

	checkbox.onchange = () => {
		onToggle(checkbox.checked);
		updateLabelText();
	};

	const labelText = document.createElement("span");
	const updateLabelText = () => {
		labelText.innerHTML = checkbox.checked
			? "<strong>DADS + CUD安全域ガイド</strong> 有効"
			: "CUDサブモードを有効化";
	};
	updateLabelText();

	label.appendChild(checkbox);
	label.appendChild(labelText);
	container.appendChild(label);

	return container;
};

/**
 * CUD推奨色範囲のビジュアルガイドを生成する
 * Requirement 6.3: CUD推奨色の範囲をビジュアルガイドとして表示
 *
 * @returns ガイド要素
 */
export const createCudRangeGuide = (): HTMLElement => {
	const guide = document.createElement("div");
	guide.className = "cud-range-guide";
	guide.style.cssText = `
		padding: 12px;
		background: linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 100%);
		border-radius: 8px;
		border: 1px solid #c8e6c9;
		margin-bottom: 16px;
	`;

	const title = document.createElement("h4");
	title.textContent = "CUD推奨配色セット ver.4";
	title.style.cssText = "margin: 0 0 8px 0; font-size: 14px; color: #1b5e20;";
	guide.appendChild(title);

	const description = document.createElement("p");
	description.textContent =
		"アクセント9色 + ベース7色 + 無彩色4色の計20色。色覚多様性に配慮した推奨配色です。";
	description.style.cssText =
		"margin: 0 0 12px 0; font-size: 12px; color: #2e7d32;";
	guide.appendChild(description);

	// バッジ凡例
	const legend = document.createElement("div");
	legend.style.cssText = "display: flex; gap: 12px; flex-wrap: wrap;";

	for (const [, config] of Object.entries(BADGE_CONFIGS)) {
		const item = document.createElement("div");
		item.style.cssText = "display: flex; align-items: center; gap: 4px;";

		const badge = document.createElement("span");
		badge.textContent = config.text;
		badge.style.cssText = `
			display: inline-flex;
			padding: 2px 6px;
			font-size: 10px;
			font-weight: bold;
			border-radius: 3px;
			background-color: ${config.backgroundColor};
			color: ${config.textColor};
		`;

		const text = document.createElement("span");
		text.textContent = config.tooltip;
		text.style.cssText = "font-size: 11px; color: #37474f;";

		item.appendChild(badge);
		item.appendChild(text);
		legend.appendChild(item);
	}

	guide.appendChild(legend);
	return guide;
};

/**
 * パレットを検証してUIに結果を表示する
 *
 * @param colors - パレットの色配列（HEX値とrole）
 * @param container - 結果を表示するコンテナ
 */
export const showPaletteValidation = (
	colors: PaletteColor[],
	container: HTMLElement,
): void => {
	const result = validatePalette(colors);
	const panel = createDiagnosticPanel(result);
	container.innerHTML = "";
	container.appendChild(panel);
};

/**
 * 色のHEX値配列にCUDバッジを追加する
 *
 * @param hexColors - HEX値の配列
 * @returns バッジ付きの情報配列
 */
export const addCudBadgesToColors = (
	hexColors: string[],
): Array<{ hex: string; badge: HTMLElement; matchInfo: CudSearchResult }> => {
	return hexColors.map((hex) => ({
		hex,
		badge: createCudBadge(hex),
		matchInfo: getCudMatchInfo(hex),
	}));
};

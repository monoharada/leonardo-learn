/**
 * CUD UIコンポーネント
 * DADSハーモニーUIへのCUD機能統合
 *
 * Requirements: 6.1-6.4, 7.1-7.3
 */

import { createAnchorColor } from "../core/cud/anchor";
import {
	DEFAULT_LAMBDA,
	type OptimizationResult,
	type OptimizedColor,
	optimizePalette,
} from "../core/cud/optimizer";
import {
	type CudSearchResult,
	findNearestCudColor,
	type MatchLevel,
} from "../core/cud/service";
import {
	type SnapOptions,
	type SnapResult,
	snapPaletteToCud,
	snapPaletteUnique,
	snapToCudColor,
} from "../core/cud/snapper";
import {
	type IssueSeverity,
	type PaletteColor,
	type ValidationIssue,
	type ValidationResult,
	validatePalette,
} from "../core/cud/validator";
import { type CudZone, classifyZone } from "../core/cud/zone";

// Re-export for test convenience
export type { OptimizedColor } from "../core/cud/optimizer";

// Re-export types and functions for convenience
export type { PaletteColor, ValidationResult, ValidationIssue, IssueSeverity };
export type { SnapOptions, SnapResult };
export { snapToCudColor, snapPaletteToCud, snapPaletteUnique };

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
		backgroundColor: "#66CCFF", // CUD sky blue - info level
		textColor: "#000000",
		tooltip: "CUD推奨色に近い",
	},
	moderate: {
		text: "~CUD",
		backgroundColor: "#FF9900", // CUD orange - warning level
		textColor: "#000000",
		tooltip: "CUD推奨色からやや離れている",
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

/**
 * CUD互換モード設定
 * Requirements 6.1: Off/Guide/Soft Snap/Strictの4モード
 */
export type CudCompatibilityMode = "off" | "guide" | "soft" | "strict";

/**
 * CUDモード設定の型定義
 */
export interface CudModeConfig {
	/** 日本語ラベル */
	label: string;
	/** 説明文 */
	description: string;
	/** アイコン（視覚的識別用） */
	icon: string;
}

/**
 * CUD互換モードの設定
 * Requirements 6.1:
 * - モード名とアイコン（○/◐/◉/●）による視覚的識別
 * - 日本語ラベルと説明文の表示
 */
export const CUD_MODE_CONFIGS: Record<CudCompatibilityMode, CudModeConfig> = {
	off: {
		label: "通常モード",
		description: "CUD検証なし",
		icon: "○",
	},
	guide: {
		label: "ガイドモード",
		description: "参考表示のみ",
		icon: "◐",
	},
	soft: {
		label: "ソフトスナップ",
		description: "自動補正",
		icon: "◉",
	},
	strict: {
		label: "CUD互換",
		description: "完全準拠",
		icon: "●",
	},
};

/**
 * @deprecated CUD_MODE_DESCRIPTIONSはCUD_MODE_CONFIGSに置き換えられました
 * 後方互換性のためにエクスポート
 */
export const CUD_MODE_DESCRIPTIONS = CUD_MODE_CONFIGS;

// ============================================================================
// タスク6.4: モード設定のLocalStorage永続化
// Requirements: 6.7
// ============================================================================

/**
 * LocalStorageキー
 * Requirement 6.7: 選択されたモードをローカルストレージに保存
 */
export const CUD_MODE_STORAGE_KEY = "leonardo-cud-mode";

/**
 * 有効なCUDモード値のセット
 */
const VALID_CUD_MODES: readonly CudCompatibilityMode[] = [
	"off",
	"guide",
	"soft",
	"strict",
];

/**
 * デフォルトのCUDモード
 */
const DEFAULT_CUD_MODE: CudCompatibilityMode = "guide";

/**
 * 値がCudCompatibilityModeかどうかを判定する型ガード
 * Requirement 6.7: 旧3モード値との後方互換性対応
 *
 * @param value - 判定する値
 * @returns 有効なCudCompatibilityModeならtrue
 *
 * @example
 * ```ts
 * isCudCompatibilityMode("soft"); // => true
 * isCudCompatibilityMode("invalid"); // => false
 * isCudCompatibilityMode(null); // => false
 * ```
 */
export const isCudCompatibilityMode = (
	value: unknown,
): value is CudCompatibilityMode => {
	return (
		typeof value === "string" &&
		(VALID_CUD_MODES as readonly string[]).includes(value)
	);
};

/**
 * CUDモードをLocalStorageに保存する
 * Requirement 6.7: 選択されたモードをローカルストレージに保存
 *
 * @param mode - 保存するCUDモード
 *
 * @example
 * ```ts
 * saveCudMode("soft"); // LocalStorageに "soft" を保存
 * saveCudMode("strict"); // LocalStorageに "strict" を保存
 * ```
 */
export const saveCudMode = (mode: CudCompatibilityMode): void => {
	try {
		localStorage.setItem(CUD_MODE_STORAGE_KEY, mode);
	} catch {
		// LocalStorageが利用できない場合（プライベートモードなど）は無視
		// エラーをスローせず、静かに失敗する
	}
};

/**
 * LocalStorageからCUDモードを読み込む
 * Requirement 6.7: 次回起動時に復元
 *
 * @returns 保存されていたCUDモード、または無効な場合はデフォルト値（guide）
 *
 * @example
 * ```ts
 * // LocalStorageに "strict" が保存されている場合
 * loadCudMode(); // => "strict"
 *
 * // LocalStorageが空または無効な値の場合
 * loadCudMode(); // => "guide"
 * ```
 */
export const loadCudMode = (): CudCompatibilityMode => {
	try {
		const stored = localStorage.getItem(CUD_MODE_STORAGE_KEY);
		if (stored !== null && isCudCompatibilityMode(stored)) {
			return stored;
		}
	} catch {
		// LocalStorageが利用できない場合はデフォルト値を返す
	}
	return DEFAULT_CUD_MODE;
};

/**
 * CUD互換モード切り替えセレクターを生成する（LocalStorage永続化対応版）
 * Requirement 6.7: 選択されたモードをローカルストレージに保存し、次回起動時に復元
 *
 * @param onModeChange - モード変更時のコールバック
 * @param initialMode - 初期モード（省略時はLocalStorageから復元、なければguide）
 * @returns セレクター要素
 *
 * @example
 * ```ts
 * // LocalStorageから復元するパターン
 * const selector = createCudModeSelectorWithPersistence((mode) => {
 *   console.log(`Mode changed to: ${mode}`);
 * });
 *
 * // 明示的に初期モードを指定するパターン（LocalStorageより優先）
 * const selectorWithMode = createCudModeSelectorWithPersistence(
 *   (mode) => console.log(mode),
 *   "strict"
 * );
 * ```
 */
export const createCudModeSelectorWithPersistence = (
	onModeChange: (mode: CudCompatibilityMode) => void,
	initialMode?: CudCompatibilityMode,
): HTMLElement => {
	// 初期モード: 明示的指定 > LocalStorage > デフォルト
	const effectiveInitialMode = initialMode ?? loadCudMode();

	// 永続化対応のコールバック
	const persistentCallback = (mode: CudCompatibilityMode): void => {
		saveCudMode(mode);
		onModeChange(mode);
	};

	return createCudModeSelector(persistentCallback, effectiveInitialMode);
};

/**
 * CUD互換モード切り替えセレクターを生成する
 * Requirements 6.1:
 * - Off/Guide/Soft Snap/Strictの4モード選択UI
 * - モード名とアイコン（○/◐/◉/●）による視覚的識別
 * - 日本語ラベルと説明文の表示
 * - 既存createCudModeSelectorの4モード対応拡張
 *
 * @param onModeChange - モード変更時のコールバック
 * @param initialMode - 初期モード（デフォルト: guide）
 * @returns セレクター要素
 */
export const createCudModeSelector = (
	onModeChange: (mode: CudCompatibilityMode) => void,
	initialMode: CudCompatibilityMode = "guide",
): HTMLElement => {
	const container = document.createElement("div");
	container.className = "cud-mode-selector";
	container.style.cssText = `
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		background: #f0f4f8;
		border-radius: 8px;
		margin-bottom: 12px;
	`;

	const label = document.createElement("label");
	label.textContent = "CUD対応モード";
	label.style.cssText = "font-weight: 600; font-size: 14px;";
	container.appendChild(label);

	const select = document.createElement("select");
	select.className = "cud-mode-select";
	select.style.cssText = `
		padding: 8px 12px;
		border: 1px solid #ccc;
		border-radius: 6px;
		font-size: 14px;
		background: white;
		cursor: pointer;
	`;

	// 4モードのオプションを追加（アイコン付き）
	const modeOrder: CudCompatibilityMode[] = ["off", "guide", "soft", "strict"];
	for (const mode of modeOrder) {
		const config = CUD_MODE_CONFIGS[mode];
		const option = document.createElement("option");
		option.value = mode;
		option.textContent = `${config.icon} ${config.label}`;
		if (mode === initialMode) {
			option.selected = true;
		}
		select.appendChild(option);
	}

	const description = document.createElement("p");
	description.className = "cud-mode-description";
	description.style.cssText = "margin: 0; font-size: 12px; color: #666;";
	description.textContent = CUD_MODE_CONFIGS[initialMode].description;

	select.onchange = () => {
		const mode = select.value as CudCompatibilityMode;
		description.textContent = CUD_MODE_CONFIGS[mode].description;
		onModeChange(mode);
	};

	container.appendChild(select);
	container.appendChild(description);

	return container;
};

/**
 * CUD互換モードに基づいてパレットを処理する
 *
 * @param palette - 元のパレット（HEX配列）
 * @param mode - CUD互換モード
 * @returns 処理後のパレット（strict時はスナップ、それ以外は元のまま）
 */
export const processPaletteWithCudMode = (
	palette: string[],
	mode: CudCompatibilityMode,
): { processed: string[]; snapResults?: SnapResult[] } => {
	if (mode === "strict") {
		const results = snapPaletteUnique(palette, { mode: "strict" });
		return {
			processed: results.map((r) => r.hex),
			snapResults: results,
		};
	}
	return { processed: palette };
};

// ============================================================================
// タスク6.2: モード切替とプレビュー更新
// Requirements: 6.2
// ============================================================================

/**
 * ゾーン情報
 * guideモードで表示するゾーン情報
 */
export interface ZoneInfo {
	/** HEX色 */
	hex: string;
	/** ゾーン判定 */
	zone: CudZone;
	/** CUD推奨色との距離 */
	deltaE: number;
	/** 最近接CUD色情報 */
	nearestCud: CudSearchResult;
}

/**
 * パレット処理オプション
 */
export interface PaletteProcessOptions {
	/** アンカーカラー（HEX） */
	anchorHex?: string;
	/** CUD/Harmony重み係数（0-1, 高いほどCUD優先） */
	lambda?: number;
	/** Soft Snap戻り係数（0-1, デフォルト: 0.5） */
	returnFactor?: number;
}

/**
 * パレット処理結果
 */
export interface PaletteProcessResult {
	/** 処理後のパレット（HEX配列） */
	processed: string[];
	/** 最適化結果（soft/strictモード時） */
	optimizationResult?: OptimizationResult;
	/** ゾーン情報（guideモード時） */
	zoneInfos?: ZoneInfo[];
}

/**
 * HEX値を正規化（大文字、#付き）
 */
const normalizeHex = (hex: string): string => {
	let normalized = hex.trim().toUpperCase();
	if (!normalized.startsWith("#")) {
		normalized = `#${normalized}`;
	}
	return normalized;
};

/**
 * パレットのゾーン情報を取得する
 * guideモードで使用
 *
 * @param palette - パレット（HEX配列）
 * @returns ゾーン情報配列
 */
const getZoneInfos = (palette: string[]): ZoneInfo[] => {
	return palette.map((hex) => {
		const normalizedHex = normalizeHex(hex);
		const nearest = findNearestCudColor(normalizedHex);
		const zone = classifyZone(nearest.deltaE);

		return {
			hex: normalizedHex,
			zone,
			deltaE: nearest.deltaE,
			nearestCud: nearest,
		};
	});
};

/**
 * CUDモードに基づいてパレットを処理する（Optimizer統合版）
 * Requirement 6.2: モード変更時のパレット即時再計算
 *
 * @param palette - 元のパレット（HEX配列）
 * @param mode - CUD互換モード
 * @param options - 処理オプション
 * @returns パレット処理結果
 *
 * @example
 * ```ts
 * // Offモード: 元のパレットをそのまま返す
 * processPaletteWithMode(["#FF2800", "#35A16B"], "off");
 * // => { processed: ["#FF2800", "#35A16B"] }
 *
 * // Guideモード: ゾーン情報のみ付加
 * processPaletteWithMode(["#FF2800", "#35A16B"], "guide");
 * // => { processed: [...], zoneInfos: [...] }
 *
 * // Softモード: Soft Snapを適用
 * processPaletteWithMode(["#FF2800", "#35A16B"], "soft");
 * // => { processed: [...], optimizationResult: {...} }
 *
 * // Strictモード: 完全スナップ
 * processPaletteWithMode(["#FF2800", "#35A16B"], "strict");
 * // => { processed: [...], optimizationResult: {...} }
 * ```
 */
export const processPaletteWithMode = (
	palette: string[],
	mode: CudCompatibilityMode,
	options: PaletteProcessOptions = {},
): PaletteProcessResult => {
	const { anchorHex, lambda = DEFAULT_LAMBDA, returnFactor = 0.5 } = options;

	// パレットが空の場合は早期リターン
	if (palette.length === 0) {
		return { processed: [] };
	}

	// 正規化されたパレット
	const normalizedPalette = palette.map(normalizeHex);

	// Offモード: 元のパレットをそのまま返す
	if (mode === "off") {
		return { processed: normalizedPalette };
	}

	// Guideモード: ゾーン情報のみ付加、パレットはそのまま
	if (mode === "guide") {
		const zoneInfos = getZoneInfos(normalizedPalette);
		return {
			processed: normalizedPalette,
			zoneInfos,
		};
	}

	// Soft/Strictモード: Optimizerを使用して最適化
	// アンカーカラーを決定（指定がない場合はパレットの最初の色を使用）
	// Note: パレットが空の場合は早期リターンしているため、normalizedPalette[0]は必ず存在
	const effectiveAnchorHex = anchorHex ?? normalizedPalette[0] ?? "#000000";
	const anchor = createAnchorColor(effectiveAnchorHex);

	// 最適化を実行
	const optimizationResult = optimizePalette(normalizedPalette, anchor, {
		lambda,
		mode: mode === "strict" ? "strict" : "soft",
		returnFactor,
	});

	return {
		processed: optimizationResult.palette.map((c) => c.hex),
		optimizationResult,
	};
};

/**
 * パレットプロセッサのインターフェース
 */
export interface PaletteProcessor {
	/** モードを変更する */
	setMode(mode: CudCompatibilityMode): void;
	/** パレットを更新する */
	updatePalette(palette: string[]): void;
	/** 現在のモードを取得する */
	getMode(): CudCompatibilityMode;
	/** 現在の処理結果を取得する */
	getResult(): PaletteProcessResult;
	/** オプションを更新する */
	setOptions(options: PaletteProcessOptions): void;
}

/**
 * パレットプロセッサを作成する
 * モード変更時にコールバックを呼び出し、パレットを即時再計算する
 *
 * Requirement 6.2: モード変更時のパレット即時再計算
 *
 * @param initialPalette - 初期パレット
 * @param onUpdate - 更新時のコールバック
 * @param initialMode - 初期モード（デフォルト: guide）
 * @param initialOptions - 初期オプション
 * @returns パレットプロセッサ
 *
 * @example
 * ```ts
 * const processor = createPaletteProcessor(
 *   ["#FF2800", "#35A16B"],
 *   (result) => console.log(result),
 *   "soft"
 * );
 *
 * processor.setMode("strict"); // コールバックが呼ばれる
 * processor.updatePalette(["#0041FF"]); // コールバックが呼ばれる
 * processor.getResult(); // 現在の結果を取得
 * ```
 */
export const createPaletteProcessor = (
	initialPalette: string[],
	onUpdate: (result: PaletteProcessResult) => void,
	initialMode: CudCompatibilityMode = "guide",
	initialOptions: PaletteProcessOptions = {},
): PaletteProcessor => {
	let currentPalette = initialPalette;
	let currentMode = initialMode;
	let currentOptions = initialOptions;
	let currentResult = processPaletteWithMode(
		currentPalette,
		currentMode,
		currentOptions,
	);

	const update = () => {
		currentResult = processPaletteWithMode(
			currentPalette,
			currentMode,
			currentOptions,
		);
		onUpdate(currentResult);
	};

	return {
		setMode(mode: CudCompatibilityMode): void {
			currentMode = mode;
			update();
		},

		updatePalette(palette: string[]): void {
			currentPalette = palette;
			update();
		},

		getMode(): CudCompatibilityMode {
			return currentMode;
		},

		getResult(): PaletteProcessResult {
			return currentResult;
		},

		setOptions(options: PaletteProcessOptions): void {
			currentOptions = { ...currentOptions, ...options };
			update();
		},
	};
};

// ============================================================================
// タスク6.3: モード別バッジ表示
// Requirements: 6.4, 6.5, 6.6
// ============================================================================

/**
 * ゾーンバッジの設定
 * Requirement 6.4: Guideモードでゾーン（Safe/Warning/Off）バッジ表示
 */
export interface ZoneBadgeConfig {
	/** バッジのテキスト */
	label: string;
	/** バッジの背景色 */
	backgroundColor: string;
	/** バッジのテキスト色 */
	textColor: string;
	/** ツールチップテキスト */
	tooltip: string;
}

/**
 * ゾーン別のバッジ設定
 * Requirement 6.4: ゾーン（Safe/Warning/Off）の視覚的表現
 */
export const ZONE_BADGE_CONFIGS: Record<CudZone, ZoneBadgeConfig> = {
	safe: {
		label: "Safe",
		backgroundColor: "#35A16B", // CUD緑色
		textColor: "#FFFFFF",
		tooltip: "Safe Zone: CUD推奨色と同等（ΔE ≤ 0.05）",
	},
	warning: {
		label: "Warning",
		backgroundColor: "#FF9900", // CUDオレンジ
		textColor: "#000000",
		tooltip: "Warning Zone: 許容範囲内（0.05 < ΔE ≤ 0.12）",
	},
	off: {
		label: "Off",
		backgroundColor: "#84919E", // CUDグレー
		textColor: "#FFFFFF",
		tooltip: "Off Zone: CUD非準拠（ΔE > 0.12）",
	},
};

/**
 * ゾーンバッジを生成する
 * Requirement 6.4: Guideモードでゾーン（Safe/Warning/Off）バッジ表示
 *
 * @param zone - ゾーン判定結果
 * @param deltaE - CUD推奨色との距離（オプション、ツールチップ用）
 * @returns ゾーンバッジのHTML要素
 *
 * @example
 * ```ts
 * const badge = createZoneBadge("safe");
 * // => <span class="cud-zone-badge">Safe</span>
 *
 * const badgeWithDelta = createZoneBadge("warning", 0.08);
 * // => <span class="cud-zone-badge" title="...ΔE=0.080...">Warning</span>
 * ```
 */
export const createZoneBadge = (
	zone: CudZone,
	deltaE?: number,
): HTMLElement => {
	const config = ZONE_BADGE_CONFIGS[zone];

	const badge = document.createElement("span");
	badge.className = "cud-zone-badge";
	badge.textContent = config.label;

	// ツールチップにdeltaE情報を追加
	let tooltip = config.tooltip;
	if (deltaE !== undefined) {
		tooltip += `\nΔE: ${deltaE.toFixed(3)}`;
	}
	badge.title = tooltip;

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

	badge.setAttribute("data-zone", zone);
	if (deltaE !== undefined) {
		badge.setAttribute("data-delta-e", deltaE.toString());
	}

	return badge;
};

/**
 * ΔE変化量バッジを生成する
 * Requirement 6.5: Soft Snapモードでスナップ適用色にΔE変化量をバッジで表示
 *
 * @param deltaEChange - スナップ前後のΔE変化量
 * @returns ΔE変化量バッジのHTML要素
 *
 * @example
 * ```ts
 * const badge = createDeltaEChangeBadge(0.05);
 * // => <span class="cud-delta-badge">ΔE -0.050</span>
 *
 * const noBadge = createDeltaEChangeBadge(0);
 * // => <span class="cud-delta-badge">補正なし</span>
 * ```
 */
export const createDeltaEChangeBadge = (deltaEChange: number): HTMLElement => {
	const badge = document.createElement("span");
	badge.className = "cud-delta-badge";

	// 変化量が0の場合は「補正なし」
	if (deltaEChange === 0 || Math.abs(deltaEChange) < 0.001) {
		badge.textContent = "補正なし";
		badge.title = "スナップは適用されませんでした";
	} else {
		// 負の値として表示（CUD距離が減少したことを示す）
		badge.textContent = `ΔE -${deltaEChange.toFixed(3)}`;
		badge.title = `CUD距離が ${deltaEChange.toFixed(3)} 減少しました`;
	}

	badge.style.cssText = `
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2px 6px;
		font-size: 10px;
		font-weight: bold;
		border-radius: 3px;
		background-color: #66CCFF;
		color: #000000;
		cursor: help;
		margin-left: 4px;
	`;

	badge.setAttribute("data-delta-e", deltaEChange.toString());

	return badge;
};

/**
 * Strictモード用緑チェックバッジを生成する
 * Requirement 6.6: Strictモードで全色がCUD推奨色であることを緑色のチェックマークで表示
 *
 * @param cudColorName - CUD推奨色の名前（オプション、ツールチップ用）
 * @returns 緑チェックバッジのHTML要素
 *
 * @example
 * ```ts
 * const badge = createStrictComplianceBadge();
 * // => <span class="cud-strict-badge">✓</span>
 *
 * const badgeWithName = createStrictComplianceBadge("赤");
 * // => <span class="cud-strict-badge" title="CUD推奨色: 赤">✓</span>
 * ```
 */
export const createStrictComplianceBadge = (
	cudColorName?: string,
): HTMLElement => {
	const badge = document.createElement("span");
	badge.className = "cud-strict-badge";
	badge.textContent = "✓";

	// ツールチップにCUD色名を追加
	let tooltip = "CUD推奨色に完全準拠";
	if (cudColorName) {
		tooltip = `CUD推奨色: ${cudColorName}`;
	}
	badge.title = tooltip;

	badge.style.cssText = `
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2px 6px;
		font-size: 10px;
		font-weight: bold;
		border-radius: 3px;
		background-color: #35A16B;
		color: #FFFFFF;
		cursor: help;
		margin-left: 4px;
	`;

	return badge;
};

/**
 * モード別バッジ生成用のパラメータ
 */
export interface ModeBadgeParams {
	/** guideモード用: ゾーン情報 */
	zoneInfo?: ZoneInfo;
	/** soft/strictモード用: 最適化された色 */
	optimizedColor?: OptimizedColor & { deltaEChange?: number };
}

/**
 * モードに応じたバッジを生成する統合関数
 * Requirements: 6.4, 6.5, 6.6
 *
 * @param mode - CUD互換モード
 * @param params - バッジ生成パラメータ
 * @returns バッジのHTML要素、またはnull（offモードの場合）
 *
 * @example
 * ```ts
 * // guideモード: ゾーンバッジ
 * createModeBadge("guide", { zoneInfo });
 *
 * // softモード: ΔE変化量バッジ
 * createModeBadge("soft", { optimizedColor });
 *
 * // strictモード: 緑チェックバッジ
 * createModeBadge("strict", { optimizedColor });
 *
 * // offモード: null
 * createModeBadge("off", {});
 * ```
 */
export const createModeBadge = (
	mode: CudCompatibilityMode,
	params: ModeBadgeParams,
): HTMLElement | null => {
	switch (mode) {
		case "off":
			// Offモードではバッジなし
			return null;

		case "guide":
			// Guideモード: ゾーンバッジを表示
			if (!params.zoneInfo) {
				return null;
			}
			return createZoneBadge(params.zoneInfo.zone, params.zoneInfo.deltaE);

		case "soft":
			// Softモード: ΔE変化量バッジを表示
			if (!params.optimizedColor) {
				return null;
			}
			return createDeltaEChangeBadge(params.optimizedColor.deltaEChange ?? 0);

		case "strict":
			// Strictモード: 緑チェックバッジを表示
			if (!params.optimizedColor) {
				return null;
			}
			return createStrictComplianceBadge(
				params.optimizedColor.cudTarget?.nameJa,
			);

		default:
			return null;
	}
};

// ============================================================================
// タスク8.2: 長時間処理のUXフィードバック
// Requirements: 8.2, 8.6
// ============================================================================

/**
 * 長時間処理の閾値（ミリ秒）
 * Requirement 8.6: 500ms超過時に「計算中...」メッセージを表示
 */
export const LONG_PROCESS_THRESHOLD_MS = 500;

/**
 * 最適化処理の進捗状態
 */
export type OptimizationProgressState =
	| "idle"
	| "running"
	| "completed"
	| "cancelled";

/**
 * 最適化処理の進捗情報
 * Requirement 8.2: 最適化処理中はプログレス表示を行い、ユーザーにフィードバックを提供
 */
export interface OptimizationProgress {
	/** 処理状態 */
	status: OptimizationProgressState;
	/** 経過時間（ミリ秒） */
	elapsedMs: number;
	/** 長時間処理メッセージ表示フラグ */
	showMessage: boolean;
}

/**
 * 最適化コントローラ
 * 処理の開始・キャンセル・完了を管理
 */
export interface OptimizationController {
	/** 処理を開始する */
	start(): void;
	/** 処理をキャンセルする */
	cancel(): void;
	/** 処理を完了する */
	complete(): void;
	/** 現在の進捗を取得する */
	getProgress(): OptimizationProgress;
}

/**
 * 最適化コントローラを作成する
 * Requirement 8.2: 最適化処理中のプログレス表示
 * Requirement 8.6: 500ms超過時の「計算中...」メッセージ表示
 *
 * @param onProgress - 進捗変更時のコールバック
 * @returns 最適化コントローラ
 *
 * @example
 * ```ts
 * const controller = createOptimizationController((progress) => {
 *   if (progress.showMessage) {
 *     console.log("計算中...");
 *   }
 * });
 *
 * controller.start();
 * // ... 処理実行 ...
 * controller.complete();
 * ```
 */
export const createOptimizationController = (
	onProgress: (progress: OptimizationProgress) => void,
): OptimizationController => {
	let status: OptimizationProgressState = "idle";
	let startTime: number | null = null;
	let intervalId: ReturnType<typeof setInterval> | null = null;

	const getProgress = (): OptimizationProgress => {
		const elapsedMs = startTime !== null ? Date.now() - startTime : 0;
		return {
			status,
			elapsedMs,
			showMessage: elapsedMs >= LONG_PROCESS_THRESHOLD_MS,
		};
	};

	const notifyProgress = () => {
		onProgress(getProgress());
	};

	const stopTimer = () => {
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	};

	return {
		start(): void {
			status = "running";
			startTime = Date.now();
			// 100msごとに進捗を通知
			intervalId = setInterval(notifyProgress, 100);
			notifyProgress();
		},

		cancel(): void {
			stopTimer();
			status = "cancelled";
			notifyProgress();
		},

		complete(): void {
			stopTimer();
			status = "completed";
			notifyProgress();
		},

		getProgress,
	};
};

/**
 * プログレスインジケーターコンポーネント
 */
export interface ProgressIndicator {
	/** DOM要素 */
	element: HTMLElement;
	/** 表示する */
	show(): void;
	/** 非表示にする */
	hide(): void;
	/** メッセージを設定する */
	setMessage(message: string): void;
}

/**
 * プログレスインジケーターを作成する
 * Requirement 8.2: 最適化処理中のプログレス表示
 *
 * @returns プログレスインジケーター
 *
 * @example
 * ```ts
 * const indicator = createProgressIndicator();
 * indicator.show();
 * indicator.setMessage("計算中...");
 * // ...
 * indicator.hide();
 * ```
 */
export const createProgressIndicator = (): ProgressIndicator => {
	const element = document.createElement("div");
	element.className = "cud-progress-indicator";
	element.style.cssText = `
		display: none;
		align-items: center;
		justify-content: center;
		padding: 8px 16px;
		background: #f0f4f8;
		border-radius: 6px;
		font-size: 14px;
		color: #333;
		gap: 8px;
	`;

	const spinner = document.createElement("span");
	spinner.className = "cud-progress-spinner";
	spinner.textContent = "⏳";
	spinner.style.cssText = `
		animation: spin 1s linear infinite;
	`;
	element.appendChild(spinner);

	const messageSpan = document.createElement("span");
	messageSpan.className = "cud-progress-message";
	element.appendChild(messageSpan);

	return {
		element,
		show(): void {
			element.style.display = "flex";
		},
		hide(): void {
			element.style.display = "none";
		},
		setMessage(message: string): void {
			messageSpan.textContent = message;
		},
	};
};

/**
 * キャンセルボタンコンポーネント
 */
export interface CancelButton {
	/** DOM要素 */
	element: HTMLButtonElement;
	/** 有効化する */
	enable(): void;
	/** 無効化する */
	disable(): void;
}

/**
 * キャンセルボタンを作成する
 * Requirement 8.6: キャンセルボタンの有効化
 *
 * @param onCancel - キャンセル時のコールバック
 * @returns キャンセルボタン
 *
 * @example
 * ```ts
 * const button = createCancelButton(() => {
 *   controller.cancel();
 * });
 * button.enable();
 * ```
 */
export const createCancelButton = (onCancel: () => void): CancelButton => {
	const element = document.createElement("button");
	element.className = "cud-cancel-button";
	element.textContent = "キャンセル";
	element.disabled = true;
	element.style.cssText = `
		padding: 6px 12px;
		font-size: 12px;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		transition: all 0.2s;
	`;

	element.addEventListener("click", () => {
		if (!element.disabled) {
			onCancel();
		}
	});

	return {
		element,
		enable(): void {
			element.disabled = false;
			element.style.opacity = "1";
			element.style.cursor = "pointer";
		},
		disable(): void {
			element.disabled = true;
			element.style.opacity = "0.5";
			element.style.cursor = "not-allowed";
		},
	};
};

/**
 * プログレスUIコンポーネント
 */
export interface ProgressUI {
	/** コンテナ要素 */
	container: HTMLElement;
	/** プログレスインジケーター */
	indicator: ProgressIndicator;
	/** キャンセルボタン */
	cancelButton: CancelButton;
	/** 進捗を更新する */
	update(progress: OptimizationProgress): void;
}

/**
 * プログレスUI（インジケーター + キャンセルボタン）を作成する
 * Requirements: 8.2, 8.6
 *
 * @param onCancel - キャンセル時のコールバック
 * @returns プログレスUI
 *
 * @example
 * ```ts
 * const ui = createProgressUI(() => controller.cancel());
 * document.body.appendChild(ui.container);
 *
 * controller.start();
 * // コントローラのコールバックでUIを更新
 * const ctrl = createOptimizationController((progress) => {
 *   ui.update(progress);
 * });
 * ```
 */
export const createProgressUI = (onCancel: () => void): ProgressUI => {
	const container = document.createElement("div");
	container.className = "cud-progress-ui";
	container.style.cssText = `
		display: none;
		flex-direction: row;
		align-items: center;
		gap: 12px;
		padding: 8px;
		background: #f8f9fa;
		border-radius: 6px;
		margin: 8px 0;
	`;

	const indicator = createProgressIndicator();
	const cancelButton = createCancelButton(onCancel);

	container.appendChild(indicator.element);
	container.appendChild(cancelButton.element);

	return {
		container,
		indicator,
		cancelButton,
		update(progress: OptimizationProgress): void {
			if (progress.status === "running") {
				container.style.display = "flex";
				indicator.show();

				if (progress.showMessage) {
					indicator.setMessage("計算中...");
					cancelButton.enable();
				} else {
					indicator.setMessage("");
					cancelButton.disable();
				}
			} else {
				container.style.display = "none";
				indicator.hide();
				cancelButton.disable();
			}
		},
	};
};

/**
 * 状態管理モジュール
 *
 * デモ機能のグローバル状態を管理するシングルトンモジュール。
 * 状態アクセス用のヘルパー関数を提供する。
 *
 * @module @/ui/demo/state
 * Requirements: 1.1, 1.2, 1.3, 1.4, 5.3, 5.4
 */

import { formatHex, oklch, parse } from "culori";
import { DEFAULT_SEMANTIC_COLOR_CONFIG, DEFAULT_STATE } from "./constants";
import { applyDemoTextColor } from "./theme";
import type {
	BackgroundColorValidationResult,
	ColorMode,
	DemoState,
	KeyColorWithStep,
	ManualColorSelection,
	PaletteConfig,
	SemanticColorConfig,
} from "./types";

/**
 * 背景色のlocalStorageキー
 * @see Requirements: 5.3
 */
export const BACKGROUND_COLOR_STORAGE_KEY = "leonardo-backgroundColor";

/**
 * セマンティックカラー設定のlocalStorageキー
 */
export const SEMANTIC_COLOR_CONFIG_STORAGE_KEY = "leonardo-semanticColorConfig";

/**
 * マニュアル選択の色設定のlocalStorageキー
 */
export const MANUAL_COLOR_SELECTION_STORAGE_KEY =
	"leonardo-manualColorSelection";

/**
 * 背景色の永続化データ形式（ライト/ダーク両方）
 */
interface BackgroundColorsData {
	light: string;
	dark: string;
}

/**
 * HEX形式のバリデーション
 * @param hex 検証する文字列
 * @returns 有効な6文字HEX形式の場合true
 */
function isValidHex(hex: string): boolean {
	return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/**
 * OKLCH形式の正規表現パターン
 * oklch(L C H) 形式をマッチ（スペース区切り）
 */
const OKLCH_PATTERN = /^oklch\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\)$/i;

/**
 * OKLCH値の範囲制約
 */
const OKLCH_CONSTRAINTS = {
	L: { min: 0, max: 1 },
	C: { min: 0, max: 0.4 },
	H: { min: 0, max: 360 },
} as const;

/**
 * 背景色入力のバリデーション
 *
 * HEX形式（#RRGGBB）またはOKLCH形式（oklch(L C H)）を検証し、
 * 有効な場合はHEX値に正規化して返す。
 *
 * @param input 入力文字列（HEXまたはOKLCH形式）
 * @returns バリデーション結果
 * @see Requirements: 1.4, 1.5
 */
export function validateBackgroundColor(
	input: string,
): BackgroundColorValidationResult {
	// 空文字チェック
	if (!input || input.trim() === "") {
		return { valid: false, error: "色を入力してください" };
	}

	const trimmed = input.trim();

	// HEX形式のチェック
	if (trimmed.startsWith("#")) {
		if (isValidHex(trimmed)) {
			return { valid: true, hex: trimmed.toLowerCase() };
		}
		return {
			valid: false,
			error: "HEX形式が不正です（#RRGGBB の6桁）",
		};
	}

	// OKLCH形式のチェック
	const oklchMatch = trimmed.match(OKLCH_PATTERN);
	if (oklchMatch?.[1] && oklchMatch[2] && oklchMatch[3]) {
		const l = Number.parseFloat(oklchMatch[1]);
		const c = Number.parseFloat(oklchMatch[2]);
		const h = Number.parseFloat(oklchMatch[3]);

		// NaNチェック
		if (Number.isNaN(l) || Number.isNaN(c) || Number.isNaN(h)) {
			return { valid: false, error: "OKLCH の値は数値で入力してください" };
		}

		// 範囲チェック
		if (l < OKLCH_CONSTRAINTS.L.min || l > OKLCH_CONSTRAINTS.L.max) {
			return {
				valid: false,
				error: `L は ${OKLCH_CONSTRAINTS.L.min}〜${OKLCH_CONSTRAINTS.L.max} の範囲で入力してください`,
			};
		}
		if (c < OKLCH_CONSTRAINTS.C.min || c > OKLCH_CONSTRAINTS.C.max) {
			return {
				valid: false,
				error: `C は ${OKLCH_CONSTRAINTS.C.min}〜${OKLCH_CONSTRAINTS.C.max} の範囲で入力してください`,
			};
		}
		if (h < OKLCH_CONSTRAINTS.H.min || h > OKLCH_CONSTRAINTS.H.max) {
			return {
				valid: false,
				error: `H は ${OKLCH_CONSTRAINTS.H.min}〜${OKLCH_CONSTRAINTS.H.max} の範囲で入力してください`,
			};
		}

		// culori.jsでOKLCH→HEXに変換
		const color = parse(trimmed);
		if (!color) {
			return { valid: false, error: "OKLCH の解析に失敗しました" };
		}

		const hex = formatHex(color);
		if (!hex) {
			return {
				valid: false,
				error: "OKLCH から HEX への変換に失敗しました",
			};
		}

		return { valid: true, hex: hex.toLowerCase() };
	}

	// どちらの形式でもない場合
	return {
		valid: false,
		error: "色の形式が不正です（#RRGGBB または oklch(L C H)）",
	};
}

/**
 * OKLCH明度からカラーモードを判定する
 *
 * culori.jsのoklch()関数を使用してHEXをOKLCH（D65白色点準拠）に変換し、
 * L値が0.5超ならlightモード、0.5以下ならdarkモードを判定する。
 *
 * @param hex HEX形式の色
 * @returns カラーモード（light/dark）
 * @see Requirements: 2.3, 2.4, 2.5
 */
export function determineColorMode(hex: string): ColorMode {
	const color = parse(hex);
	if (!color) {
		return "light";
	}
	// culori.jsのoklch()でOKLCH色空間に変換（CSS Color 4 / D65白色点準拠）
	const oklchColor = oklch(color);
	if (!oklchColor) {
		return "light";
	}
	// L > 0.5 → light, L ≤ 0.5 → dark
	return oklchColor.l > 0.5 ? "light" : "dark";
}

/**
 * 背景色をlocalStorageに永続化する
 *
 * @param lightHex ライト背景色（HEX形式）
 * @param darkHex ダーク背景色（HEX形式）
 * @see Requirements: 5.3
 */
export function persistBackgroundColors(
	lightHex: string,
	darkHex: string,
): void {
	try {
		const data: BackgroundColorsData = { light: lightHex, dark: darkHex };
		localStorage.setItem(BACKGROUND_COLOR_STORAGE_KEY, JSON.stringify(data));
	} catch {
		// localStorageが利用できない場合は無視
	}
}

/**
 * localStorageから背景色を読み込む
 *
 * 保存されたHEX値を検証し、無効な値の場合はデフォルト値を返す。
 *
 * @returns 背景色データ（light, dark）
 * @see Requirements: 5.3, 5.4
 */
export function loadBackgroundColors(): BackgroundColorsData {
	const defaultValue: BackgroundColorsData = {
		light: DEFAULT_STATE.lightBackgroundColor,
		dark: DEFAULT_STATE.darkBackgroundColor,
	};

	try {
		const stored = localStorage.getItem(BACKGROUND_COLOR_STORAGE_KEY);
		if (stored === null) {
			return defaultValue;
		}

		const parsed = JSON.parse(stored) as Record<string, unknown>;

		// 新形式 {light, dark} の場合（片方のみでも対応）
		if ("light" in parsed || "dark" in parsed) {
			const light =
				typeof parsed.light === "string" && isValidHex(parsed.light)
					? parsed.light
					: defaultValue.light;
			const dark =
				typeof parsed.dark === "string" && isValidHex(parsed.dark)
					? parsed.dark
					: defaultValue.dark;
			return { light, dark };
		}

		// 旧形式 {hex, mode} からの移行
		if (
			"hex" in parsed &&
			typeof parsed.hex === "string" &&
			isValidHex(parsed.hex)
		) {
			const hex = parsed.hex;
			const mode = parsed.mode === "dark" ? "dark" : "light";
			// 旧形式: hexをmodeに応じてlight/darkに割り当て
			if (mode === "light") {
				// ライトモードの背景色として保存されていた
				return { light: hex, dark: defaultValue.dark };
			}
			// ダークモードの背景色として保存されていた
			return { light: defaultValue.light, dark: hex };
		}

		return defaultValue;
	} catch {
		// JSON.parseエラーやlocalStorageエラー
		return defaultValue;
	}
}

/**
 * セマンティックカラー設定をlocalStorageに永続化する
 *
 * @param config セマンティックカラー設定
 */
export function persistSemanticColorConfig(config: SemanticColorConfig): void {
	try {
		localStorage.setItem(
			SEMANTIC_COLOR_CONFIG_STORAGE_KEY,
			JSON.stringify(config),
		);
	} catch {
		// localStorageが利用できない場合は無視
	}
}

/**
 * localStorageからセマンティックカラー設定を読み込む
 *
 * 保存された設定を検証し、無効な値の場合はデフォルト値を返す。
 *
 * @returns セマンティックカラー設定
 */
export function loadSemanticColorConfig(): SemanticColorConfig {
	try {
		const stored = localStorage.getItem(SEMANTIC_COLOR_CONFIG_STORAGE_KEY);
		if (stored === null) {
			return { ...DEFAULT_SEMANTIC_COLOR_CONFIG };
		}

		const parsed = JSON.parse(stored) as Record<string, unknown>;

		// warningPatternのバリデーション
		const validPatterns = ["yellow", "orange", "auto"];
		if (
			"warningPattern" in parsed &&
			typeof parsed.warningPattern === "string" &&
			validPatterns.includes(parsed.warningPattern)
		) {
			const config: SemanticColorConfig = {
				warningPattern:
					parsed.warningPattern as SemanticColorConfig["warningPattern"],
			};

			// resolvedWarningPatternがあれば追加
			if (
				"resolvedWarningPattern" in parsed &&
				typeof parsed.resolvedWarningPattern === "string" &&
				(parsed.resolvedWarningPattern === "yellow" ||
					parsed.resolvedWarningPattern === "orange")
			) {
				config.resolvedWarningPattern = parsed.resolvedWarningPattern;
			}

			return config;
		}

		return { ...DEFAULT_SEMANTIC_COLOR_CONFIG };
	} catch {
		// JSON.parseエラーやlocalStorageエラー
		return { ...DEFAULT_SEMANTIC_COLOR_CONFIG };
	}
}

/**
 * マニュアルビュー用の色選択状態をlocalStorageに永続化する
 *
 * @param selection マニュアル色選択状態
 */
export function persistManualColorSelection(
	selection: ManualColorSelection,
): void {
	try {
		localStorage.setItem(
			MANUAL_COLOR_SELECTION_STORAGE_KEY,
			JSON.stringify(selection),
		);
	} catch {
		// localStorageが利用できない場合は無視
	}
}

/**
 * デモ機能のグローバル状態（シングルトン）
 *
 * DEFAULT_STATEから初期化し、単一ソースを維持。
 * resetState()で同じDEFAULT_STATEにリセットされる。
 */
export const state: DemoState = {
	...DEFAULT_STATE,
	palettes: [...DEFAULT_STATE.palettes],
	shadesPalettes: [...DEFAULT_STATE.shadesPalettes],
	semanticColorConfig: { ...DEFAULT_STATE.semanticColorConfig },
	lockedColors: { ...DEFAULT_STATE.lockedColors },
	previewKv: { ...DEFAULT_STATE.previewKv },
	manualColorSelection: {
		...DEFAULT_STATE.manualColorSelection,
		accentColors: [...DEFAULT_STATE.manualColorSelection.accentColors],
	},
};

/**
 * `state.darkBackgroundColor` 変更時に、CSS変数（--demo-text-color）へ同期する。
 *
 * NOTE: 既存コードの `state.darkBackgroundColor = ...` を維持しつつ、
 * View側での `applyDemoTextColor(...)` 呼び出しを不要にするためのアクセサ。
 */
let darkBackgroundColorValue = DEFAULT_STATE.darkBackgroundColor;
Object.defineProperty(state, "darkBackgroundColor", {
	get: () => darkBackgroundColorValue,
	set: (value: string) => {
		darkBackgroundColorValue = value;
		applyDemoTextColor(value);
	},
	enumerable: true,
});

/**
 * 現在アクティブなパレットを取得する
 *
 * activeIdに一致するパレットを返す。
 * 一致するものがない場合は最初のパレットを返す。
 * パレットが空の場合はundefinedを返す。
 *
 * @returns アクティブなパレット、または最初のパレット、またはundefined
 */
export function getActivePalette(): PaletteConfig | undefined {
	const found = state.palettes.find((p) => p.id === state.activeId);
	return found || state.palettes[0];
}

/**
 * キーカラー入力をパースする
 *
 * 入力形式: "#hex" または "#hex@step" (例: "#b3e5fc@300")
 * ステップは50, 100, 200, ..., 1200のトークン番号
 *
 * @param input キーカラー入力文字列
 * @returns パース結果（color: HEX値, step?: ステップ番号）
 */
export function parseKeyColor(input: string): KeyColorWithStep {
	const parts = input.split("@");
	const color = parts[0] || "#000000";
	const stepStr = parts[1];
	const step = stepStr ? Number.parseInt(stepStr, 10) : undefined;
	return { color, step };
}

/**
 * 状態をデフォルト値にリセットする
 *
 * テスト間での状態リークを防止するために使用。
 * すべてのプロパティをDEFAULT_STATEの値にリセットする。
 */
export function resetState(): void {
	// Spread primitive properties from DEFAULT_STATE
	Object.assign(state, DEFAULT_STATE);
	// Deep copy array and object properties to prevent shared references
	state.palettes = [...DEFAULT_STATE.palettes];
	state.shadesPalettes = [...DEFAULT_STATE.shadesPalettes];
	state.semanticColorConfig = { ...DEFAULT_STATE.semanticColorConfig };
	state.lockedColors = { ...DEFAULT_STATE.lockedColors };
	state.previewKv = { ...DEFAULT_STATE.previewKv };
	state.manualColorSelection = {
		...DEFAULT_STATE.manualColorSelection,
		accentColors: [...DEFAULT_STATE.manualColorSelection.accentColors],
	};
}

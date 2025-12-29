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
import { DEFAULT_STATE } from "./constants";
import type {
	BackgroundColorValidationResult,
	ColorMode,
	DemoState,
	KeyColorWithStep,
	PaletteConfig,
} from "./types";

/**
 * 背景色のlocalStorageキー
 * @see Requirements: 5.3
 */
export const BACKGROUND_COLOR_STORAGE_KEY = "leonardo-backgroundColor";

/**
 * 背景色の永続化データ形式
 */
interface BackgroundColorData {
	hex: string;
	mode: ColorMode;
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
		return { valid: false, error: "Color input is required" };
	}

	const trimmed = input.trim();

	// HEX形式のチェック
	if (trimmed.startsWith("#")) {
		if (isValidHex(trimmed)) {
			return { valid: true, hex: trimmed.toLowerCase() };
		}
		return {
			valid: false,
			error: "Invalid HEX format. Use #RRGGBB (6 hex digits)",
		};
	}

	// OKLCH形式のチェック
	const oklchMatch = trimmed.match(OKLCH_PATTERN);
	if (oklchMatch && oklchMatch[1] && oklchMatch[2] && oklchMatch[3]) {
		const l = Number.parseFloat(oklchMatch[1]);
		const c = Number.parseFloat(oklchMatch[2]);
		const h = Number.parseFloat(oklchMatch[3]);

		// NaNチェック
		if (Number.isNaN(l) || Number.isNaN(c) || Number.isNaN(h)) {
			return { valid: false, error: "OKLCH values must be valid numbers" };
		}

		// 範囲チェック
		if (l < OKLCH_CONSTRAINTS.L.min || l > OKLCH_CONSTRAINTS.L.max) {
			return {
				valid: false,
				error: `L value must be between ${OKLCH_CONSTRAINTS.L.min} and ${OKLCH_CONSTRAINTS.L.max}`,
			};
		}
		if (c < OKLCH_CONSTRAINTS.C.min || c > OKLCH_CONSTRAINTS.C.max) {
			return {
				valid: false,
				error: `C value must be between ${OKLCH_CONSTRAINTS.C.min} and ${OKLCH_CONSTRAINTS.C.max}`,
			};
		}
		if (h < OKLCH_CONSTRAINTS.H.min || h > OKLCH_CONSTRAINTS.H.max) {
			return {
				valid: false,
				error: `H value must be between ${OKLCH_CONSTRAINTS.H.min} and ${OKLCH_CONSTRAINTS.H.max}`,
			};
		}

		// culori.jsでOKLCH→HEXに変換
		const color = parse(trimmed);
		if (!color) {
			return { valid: false, error: "Failed to parse OKLCH color" };
		}

		const hex = formatHex(color);
		if (!hex) {
			return { valid: false, error: "Failed to convert OKLCH to HEX" };
		}

		return { valid: true, hex: hex.toLowerCase() };
	}

	// どちらの形式でもない場合
	return {
		valid: false,
		error: "Invalid color format. Use #RRGGBB or oklch(L C H)",
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
 * @param hex HEX形式の背景色
 * @param mode カラーモード
 * @see Requirements: 5.3
 */
export function persistBackgroundColor(hex: string, mode: ColorMode): void {
	try {
		const data: BackgroundColorData = { hex, mode };
		localStorage.setItem(BACKGROUND_COLOR_STORAGE_KEY, JSON.stringify(data));
	} catch {
		// localStorageが利用できない場合は無視
	}
}

/**
 * localStorageから背景色を読み込む
 *
 * 保存されたHEX値を検証し、モードをdetermineColorModeで再計算する。
 * 無効な値の場合はデフォルト値（#ffffff, light）を返す。
 *
 * @returns 背景色データ（hex, mode）
 * @see Requirements: 5.3, 5.4
 */
export function loadBackgroundColor(): BackgroundColorData {
	const defaultValue: BackgroundColorData = {
		hex: DEFAULT_STATE.backgroundColor,
		mode: DEFAULT_STATE.backgroundMode,
	};

	try {
		const stored = localStorage.getItem(BACKGROUND_COLOR_STORAGE_KEY);
		if (stored === null) {
			return defaultValue;
		}

		const parsed = JSON.parse(stored) as Partial<BackgroundColorData>;

		// hexプロパティの存在とフォーマットを検証
		if (typeof parsed.hex !== "string" || !isValidHex(parsed.hex)) {
			return defaultValue;
		}

		// モードをHEX値から再計算
		const recalculatedMode = determineColorMode(parsed.hex);

		return {
			hex: parsed.hex,
			mode: recalculatedMode,
		};
	} catch {
		// JSON.parseエラーやlocalStorageエラー
		return defaultValue;
	}
}

/**
 * デモ機能のグローバル状態（シングルトン）
 *
 * DEFAULT_STATEから初期化し、単一ソースを維持。
 * resetState()で同じDEFAULT_STATEにリセットされる。
 *
 * 既存のstate構造を完全に維持:
 * - palettes: パレット設定配列
 * - shadesPalettes: Shadesビュー用の全13色パレット
 * - activeId: 現在選択中のパレットID
 * - activeHarmonyIndex: 現在選択中のハーモニーインデックス（0 = Primary, 1+ = Derived）
 * - contrastIntensity: コントラスト強度
 * - lightnessDistribution: 明度分布
 * - viewMode: 現在のビューモード
 * - cvdSimulation: CVDシミュレーションタイプ
 * - selectedHarmonyConfig: 選択されたハーモニー設定
 * - cudMode: CUD対応モード
 * - backgroundColor: 背景色（HEX形式）
 * - backgroundMode: 背景色モード（light/dark）
 */
export const state: DemoState = {
	palettes: [...DEFAULT_STATE.palettes],
	shadesPalettes: [...DEFAULT_STATE.shadesPalettes],
	activeId: DEFAULT_STATE.activeId,
	activeHarmonyIndex: DEFAULT_STATE.activeHarmonyIndex,
	contrastIntensity: DEFAULT_STATE.contrastIntensity,
	lightnessDistribution: DEFAULT_STATE.lightnessDistribution,
	viewMode: DEFAULT_STATE.viewMode,
	cvdSimulation: DEFAULT_STATE.cvdSimulation,
	selectedHarmonyConfig: DEFAULT_STATE.selectedHarmonyConfig,
	cudMode: DEFAULT_STATE.cudMode,
	backgroundColor: DEFAULT_STATE.backgroundColor,
	backgroundMode: DEFAULT_STATE.backgroundMode,
};

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
	state.palettes = [...DEFAULT_STATE.palettes];
	state.shadesPalettes = [...DEFAULT_STATE.shadesPalettes];
	state.activeId = DEFAULT_STATE.activeId;
	state.activeHarmonyIndex = DEFAULT_STATE.activeHarmonyIndex;
	state.contrastIntensity = DEFAULT_STATE.contrastIntensity;
	state.lightnessDistribution = DEFAULT_STATE.lightnessDistribution;
	state.viewMode = DEFAULT_STATE.viewMode;
	state.cvdSimulation = DEFAULT_STATE.cvdSimulation;
	state.selectedHarmonyConfig = DEFAULT_STATE.selectedHarmonyConfig;
	state.cudMode = DEFAULT_STATE.cudMode;
	state.backgroundColor = DEFAULT_STATE.backgroundColor;
	state.backgroundMode = DEFAULT_STATE.backgroundMode;
}

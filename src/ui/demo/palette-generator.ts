/**
 * パレット生成モジュール
 *
 * ハーモニーパレット生成とShadesパレット生成のロジックを実装する。
 * state.palettesとstate.shadesPalettesを更新する。
 *
 * @module @/ui/demo/palette-generator
 * Requirements: 9.1, 9.2, 9.3
 */

import { Color } from "@/core/color";
import {
	generateFullChromaPalette,
	generateSystemPalette,
	HarmonyType,
} from "@/core/harmony";
import { state } from "./state";
import type { PaletteConfig } from "./types";

/**
 * パレット生成完了後のコールバック
 */
export interface PaletteGeneratorCallbacks {
	onComplete: () => void;
}

/**
 * パレット生成のメイン関数
 *
 * ハーモニーベースのパレット（state.palettes）と
 * 全13色パレット（state.shadesPalettes）を生成する。
 *
 * @param keyColorHex キーカラーのHEX値（例: "#0066CC"）
 * @param harmonyType ハーモニータイプ
 * @param callbacks 完了時のコールバック
 */
export function handleGenerate(
	keyColorHex: string,
	harmonyType: HarmonyType,
	callbacks: PaletteGeneratorCallbacks,
): void {
	const primaryColor = new Color(keyColorHex);

	// Paletteビュー用: ハーモニーベースのパレット
	const harmonyColors = generateSystemPalette(primaryColor, harmonyType);

	// Convert to PaletteConfigs
	state.palettes = harmonyColors.map((sc, index) => {
		// For the Primary palette (index 0), preserve the harmony type
		// For others, set to NONE as they are derived
		const paletteHarmony = index === 0 ? harmonyType : HarmonyType.NONE;

		// Primaryの場合は元の入力HEX値を使用（丸め誤差を防ぐ）
		const hexValue = sc.role === "primary" ? keyColorHex : sc.keyColor.toHex();

		// DADSモードの場合のみ@stepを付与、それ以外はHEXのみ
		const keyColorString = sc.step ? `${hexValue}@${sc.step}` : hexValue;

		return {
			id: `sys-${index}-${sc.name.toLowerCase().replace(/\s+/g, "-")}`,
			name: sc.name,
			keyColors: [keyColorString],
			ratios: [21, 15, 10, 7, 4.5, 3, 1],
			harmony: paletteHarmony,
			baseChromaName: sc.baseChromaName,
			step: sc.step, // DADSモード用
		} satisfies PaletteConfig;
	});

	// Shadesビュー用: 全13色パレット（ハーモニーパレットを渡して一貫性を確保）
	const fullChromaColors = generateFullChromaPalette(
		primaryColor,
		harmonyColors,
	);

	// ハーモニーパレットの役割名をbaseChromaNameでマッピング
	const harmonyRoleMap = new Map<string, string>();
	for (const hc of harmonyColors) {
		if (hc.baseChromaName && hc.name) {
			harmonyRoleMap.set(hc.baseChromaName, hc.name);
		}
	}

	state.shadesPalettes = fullChromaColors.map((sc, index) => {
		// ハーモニーパレットで使われている場合はその役割名を使用
		// それ以外はセマンティック名（Success, Warning等）またはデフォルト
		let displayName = sc.name;
		if (sc.baseChromaName && harmonyRoleMap.has(sc.baseChromaName)) {
			displayName = harmonyRoleMap.get(sc.baseChromaName) || sc.name;
		}

		// Primaryの場合は元の入力HEX値を使用（丸め誤差を防ぐ）
		const hexValue = sc.role === "primary" ? keyColorHex : sc.keyColor.toHex();

		return {
			id: `shades-${index}-${sc.baseChromaName?.toLowerCase().replace(/\s+/g, "-") || displayName.toLowerCase().replace(/\s+/g, "-")}`,
			name: displayName,
			keyColors: [hexValue],
			ratios: [21, 15, 10, 7, 4.5, 3, 1],
			harmony: HarmonyType.NONE,
			baseChromaName: sc.baseChromaName,
			step: sc.step, // DADSモード用
		} satisfies PaletteConfig;
	});

	// アクティブパレットの設定
	if (state.palettes.length > 0 && state.palettes[0]) {
		state.activeId = state.palettes[0].id;
	}
	state.activeHarmonyIndex = 0;

	// 完了コールバック
	callbacks.onComplete();
}

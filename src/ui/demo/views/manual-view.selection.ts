import type { HarmonyType } from "@/core/harmony";
import { parseKeyColor, persistManualColorSelection, state } from "../state";
import type { ManualApplyTarget, PaletteConfig } from "../types";
import { clampAccentCount } from "../utils/palette-utils";

/**
 * マニュアル選択ツールバーに色を適用する
 * スタジオビューのパレットとも連動する
 *
 * @param target 適用先
 * @param hex 適用する色のHEX値
 * @param onUpdate 状態更新後のコールバック
 */
export function applyColorToManualSelection(
	target: ManualApplyTarget,
	hex: string,
	onUpdate?: () => void,
): void {
	const selection = state.manualColorSelection;

	switch (target) {
		case "key":
			selection.keyColor = hex;
			// スタジオビューのPrimaryパレットも更新
			syncToStudioPalette("Primary", hex);
			break;
		case "secondary":
			selection.secondaryColor = hex;
			// スタジオビューのSecondaryパレットも更新
			syncToStudioPalette("Secondary", hex);
			break;
		case "tertiary":
			selection.tertiaryColor = hex;
			// スタジオビューのTertiaryパレットも更新
			syncToStudioPalette("Tertiary", hex);
			break;
		case "accent-1":
		case "accent-2":
		case "accent-3":
		case "accent-4": {
			const index = parseInt(target.split("-")[1] ?? "1", 10) - 1;
			// 配列を必要な長さまで拡張
			while (selection.accentColors.length <= index) {
				selection.accentColors.push(null);
			}
			selection.accentColors[index] = hex;
			// スタジオビューのAccentパレットも更新
			syncToStudioPalette(`Accent ${index + 1}`, hex);
			break;
		}
	}

	// 永続化
	persistManualColorSelection(selection);

	// 更新コールバック
	if (onUpdate) {
		onUpdate();
	}
}

/**
 * マニュアル選択からアクセントカラーを削除する
 *
 * 指定されたインデックスのアクセントをnullに設定し、
 * 対応するパレットも削除する。
 *
 * @param index アクセントのインデックス（0-3）
 * @param onUpdate 状態更新後のコールバック
 */
export function deleteAccentFromManualSelection(
	index: number,
	onUpdate?: () => void,
): void {
	const selection = state.manualColorSelection;

	// インデックス範囲チェック
	if (index < 0 || index >= selection.accentColors.length) {
		return;
	}

	// スロットをクリア
	selection.accentColors[index] = null;

	// state.palettesからも削除
	const accentName = `Accent ${index + 1}`;
	const paletteIndex = state.palettes.findIndex(
		(p) => p.name.toLowerCase() === accentName.toLowerCase(),
	);
	if (paletteIndex >= 0) {
		state.palettes.splice(paletteIndex, 1);
	}

	// studioAccentCount も同期（残っているアクセントの数を計算）
	const remainingAccents = selection.accentColors.filter(
		(c) => c !== null,
	).length;
	state.studioAccentCount = clampAccentCount(remainingAccents);

	// 永続化
	persistManualColorSelection(selection);

	// 更新コールバック
	if (onUpdate) {
		onUpdate();
	}
}

/**
 * スタジオパレットからマニュアル選択状態に同期する
 *
 * state.palettes に存在する Primary/Secondary/Tertiary/Accent パレットの
 * keyColors[0] を manualColorSelection に反映する。
 * これにより、スタジオビューで生成されたパレットがマニュアルビューに反映される。
 */
export function syncFromStudioPalettes(): void {
	const selection = state.manualColorSelection;

	// 背景色と文字色を同期
	selection.backgroundColor = state.lightBackgroundColor;
	selection.textColor = state.darkBackgroundColor;

	// Primary/Secondary/Tertiary
	selection.keyColor = getPaletteKeyColorHex("primary");
	selection.secondaryColor = getPaletteKeyColorHex("secondary");
	selection.tertiaryColor = getPaletteKeyColorHex("tertiary");

	// Accents: studioAccentCount に従って制限（常に4要素の配列として維持、超過分はnull）
	const accentCount = state.studioAccentCount;
	selection.accentColors = [1, 2, 3, 4].map((i) =>
		i <= accentCount ? getPaletteKeyColorHex(`accent ${i}`) : null,
	);

	// 永続化
	persistManualColorSelection(selection);
}

/**
 * パレット挿入位置を計算する
 *
 * パレット順序を維持するための挿入位置を返す:
 * Primary → Secondary → Tertiary → Accent 1-4
 *
 * @param paletteName パレット名
 * @returns 挿入インデックス（-1の場合は末尾にpush）
 */
function calculatePaletteInsertIndex(paletteName: string): number {
	// Accentパレットは末尾に追加
	if (paletteName.startsWith("Accent")) {
		return -1;
	}

	// 優先度順に検索する基準パレット名を定義
	// 各パレットは、その前に来るべきパレットの後に挿入される
	const insertionRules: Record<string, string[]> = {
		Primary: [], // Primary は常に先頭
		Secondary: ["primary"], // Secondary は Primary の後
		Tertiary: ["secondary", "primary"], // Tertiary は Secondary の後、なければ Primary の後
	};

	const searchOrder = insertionRules[paletteName];
	if (!searchOrder) {
		return 0; // 未知のパレットは先頭に
	}

	// 優先順位の高い基準パレットから順に検索
	for (const prefix of searchOrder) {
		const refIndex = state.palettes.findIndex((p) =>
			p.name.toLowerCase().startsWith(prefix),
		);
		if (refIndex >= 0) {
			return refIndex + 1;
		}
	}

	// 基準パレットが見つからない場合は先頭に
	return 0;
}

/**
 * スタジオビューのパレットにキーカラーを同期する
 *
 * @param paletteName パレット名（"Primary", "Secondary", "Tertiary", "Accent 1"など）
 * @param hex 同期する色のHEX値
 */
function syncToStudioPalette(paletteName: string, hex: string): void {
	const existingPalette = state.palettes.find((p) =>
		p.name.toLowerCase().startsWith(paletteName.toLowerCase()),
	);

	if (existingPalette) {
		// 既存パレットのkeyColorsを更新
		existingPalette.keyColors = [hex];
		// 色が変わったのでbaseChromaName/stepをクリア（renderManualViewで再計算される）
		existingPalette.baseChromaName = undefined;
		existingPalette.step = undefined;
		return;
	}

	// 新しいパレットを作成
	const timestamp = Date.now();
	const newPalette: PaletteConfig = {
		id: `manual-${paletteName.toLowerCase().replace(/\s+/g, "-")}-${timestamp}`,
		name: paletteName,
		keyColors: [hex],
		ratios: [21, 15, 10, 7, 4.5, 3, 1],
		harmony: "none" as HarmonyType,
	};

	// 挿入位置を計算
	const insertIndex = calculatePaletteInsertIndex(paletteName);

	if (insertIndex === -1) {
		// Accentパレットは末尾に追加
		state.palettes.push(newPalette);

		// studioAccentCountも更新（アクセント番号が現在のカウントより大きい場合）
		const accentNumber = parseInt(paletteName.replace("Accent ", ""), 10);
		if (!Number.isNaN(accentNumber) && accentNumber > state.studioAccentCount) {
			state.studioAccentCount = Math.min(4, accentNumber) as 2 | 3 | 4;
		}
	} else {
		// 計算された位置に挿入
		state.palettes.splice(insertIndex, 0, newPalette);
	}
}

/**
 * パレット名プレフィックスからキーカラーHEXを取得
 */
function getPaletteKeyColorHex(namePrefix: string): string | null {
	const palette = state.palettes.find((p) =>
		p.name.toLowerCase().startsWith(namePrefix.toLowerCase()),
	);
	if (!palette?.keyColors[0]) return null;
	return parseKeyColor(palette.keyColors[0]).color;
}

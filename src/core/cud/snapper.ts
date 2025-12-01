/**
 * CUD スナッパー
 * 生成された色を最も近いCUD推奨色にスナップする機能
 *
 * CUD互換モードでは、生成されたすべての色が20色のCUD推奨色セットの
 * いずれかにマッピングされる
 */

import { deltaEok, toOklab } from "../../utils/color-space";
import type { CudColor } from "./colors";
import { findNearestCudColor, getCudColorSet } from "./service";

/**
 * スナップオプション
 */
export interface SnapOptions {
	/**
	 * スナップの強度
	 * - "strict": 常にCUD色にスナップ
	 * - "prefer": 近い場合のみスナップ（deltaE ≤ threshold）
	 */
	mode: "strict" | "prefer";
	/**
	 * preferモードでのスナップ閾値（デフォルト: 0.15）
	 */
	threshold?: number;
}

/**
 * スナップ結果
 */
export interface SnapResult {
	/** スナップ後の色（HEX） */
	hex: string;
	/** 元の色（HEX） */
	originalHex: string;
	/** スナップされたCUD色情報 */
	cudColor: CudColor;
	/** スナップが適用されたかどうか */
	snapped: boolean;
	/** 元の色との距離 */
	deltaE: number;
}

const DEFAULT_THRESHOLD = 0.15;

/**
 * 単一の色をCUD推奨色にスナップする
 *
 * @param hex - 入力色のHEX値
 * @param options - スナップオプション
 * @returns スナップ結果
 */
export function snapToCudColor(
	hex: string,
	options: SnapOptions = { mode: "strict" },
): SnapResult {
	const { mode, threshold = DEFAULT_THRESHOLD } = options;

	const nearest = findNearestCudColor(hex);

	// strictモード: 常にスナップ
	if (mode === "strict") {
		return {
			hex: nearest.nearest.hex,
			originalHex: hex,
			cudColor: nearest.nearest,
			snapped: true,
			deltaE: nearest.deltaE,
		};
	}

	// preferモード: 閾値以下の場合のみスナップ
	if (nearest.deltaE <= threshold) {
		return {
			hex: nearest.nearest.hex,
			originalHex: hex,
			cudColor: nearest.nearest,
			snapped: true,
			deltaE: nearest.deltaE,
		};
	}

	// スナップしない
	return {
		hex: hex.toUpperCase(),
		originalHex: hex,
		cudColor: nearest.nearest,
		snapped: false,
		deltaE: nearest.deltaE,
	};
}

/**
 * パレット全体をCUD推奨色にスナップする
 *
 * @param palette - HEX色の配列
 * @param options - スナップオプション
 * @returns スナップ結果の配列
 */
export function snapPaletteToCud(
	palette: string[],
	options: SnapOptions = { mode: "strict" },
): SnapResult[] {
	return palette.map((hex) => snapToCudColor(hex, options));
}

/**
 * 色相に基づいて最適なCUD色を選択する
 * ハーモニー生成で特定の色相が必要な場合に使用
 *
 * @param targetHue - 目標の色相（0-360度）
 * @param preferGroup - 優先するグループ（accent, base, neutral）
 * @returns 最適なCUD色
 */
export function findCudColorByHue(
	targetHue: number,
	preferGroup?: "accent" | "base" | "neutral",
): CudColor {
	const cudColors = getCudColorSet();

	// 正規化
	const normalizedHue = ((targetHue % 360) + 360) % 360;

	let bestMatch: CudColor | undefined;
	let minHueDiff = Infinity;

	for (const cudColor of cudColors) {
		// グループフィルタ
		if (preferGroup && cudColor.group !== preferGroup) {
			continue;
		}

		const cudHue = cudColor.oklch.h ?? 0;
		// 色相の差（円周上の最短距離）
		const hueDiff = Math.min(
			Math.abs(cudHue - normalizedHue),
			360 - Math.abs(cudHue - normalizedHue),
		);

		if (hueDiff < minHueDiff) {
			minHueDiff = hueDiff;
			bestMatch = cudColor;
		}
	}

	// グループフィルタで見つからない場合は全体から探す
	if (!bestMatch) {
		return findCudColorByHue(targetHue);
	}

	return bestMatch;
}

/**
 * CUD互換ハーモニーパレットを生成する
 * 指定されたハーモニータイプに基づいてCUD推奨色のみで構成されるパレットを返す
 *
 * @param baseHex - ベースカラーのHEX
 * @param harmonyAngles - ハーモニーの角度配列（例: [0, 180]は補色）
 * @returns CUD色のみで構成されるパレット
 */
export function generateCudHarmonyPalette(
	baseHex: string,
	harmonyAngles: number[],
): SnapResult[] {
	// ベースカラーをCUD色にスナップ
	const baseResult = snapToCudColor(baseHex, { mode: "strict" });
	const baseHue = baseResult.cudColor.oklch.h ?? 0;

	const results: SnapResult[] = [baseResult];

	for (const angle of harmonyAngles) {
		if (angle === 0) continue; // ベースカラーはすでに追加済み

		const targetHue = (baseHue + angle) % 360;
		const cudColor = findCudColorByHue(targetHue);

		results.push({
			hex: cudColor.hex,
			originalHex: cudColor.hex,
			cudColor,
			snapped: true,
			deltaE: 0,
		});
	}

	return results;
}

/**
 * CUD推奨色セットから重複を避けて色を選択する
 * パレット内で同じCUD色が複数回使われることを防ぐ
 *
 * @param palette - 元のHEX色配列
 * @param _options - スナップオプション（将来の拡張用、現在は常にstrictモード）
 * @returns 重複のないスナップ結果配列
 */
export function snapPaletteUnique(
	palette: string[],
	_options: SnapOptions = { mode: "strict" },
): SnapResult[] {
	const usedCudIds = new Set<string>();
	const results: SnapResult[] = [];
	const cudColors = getCudColorSet();

	for (const hex of palette) {
		const nearest = findNearestCudColor(hex);

		// まだ使われていないCUD色を探す
		if (!usedCudIds.has(nearest.nearest.id)) {
			usedCudIds.add(nearest.nearest.id);
			results.push({
				hex: nearest.nearest.hex,
				originalHex: hex,
				cudColor: nearest.nearest,
				snapped: true,
				deltaE: nearest.deltaE,
			});
			continue;
		}

		// 使われている場合、次に近いCUD色を探す
		const inputOklab = toOklab(hex);
		if (!inputOklab) {
			results.push({
				hex: hex.toUpperCase(),
				originalHex: hex,
				cudColor: nearest.nearest,
				snapped: false,
				deltaE: nearest.deltaE,
			});
			continue;
		}

		let bestAlternative: CudColor | undefined;
		let minDeltaE = Infinity;

		for (const cudColor of cudColors) {
			if (usedCudIds.has(cudColor.id)) continue;

			const cudOklab = { mode: "oklab" as const, ...cudColor.oklab };
			const dE = deltaEok(inputOklab, cudOklab);

			if (dE < minDeltaE) {
				minDeltaE = dE;
				bestAlternative = cudColor;
			}
		}

		if (bestAlternative) {
			usedCudIds.add(bestAlternative.id);
			results.push({
				hex: bestAlternative.hex,
				originalHex: hex,
				cudColor: bestAlternative,
				snapped: true,
				deltaE: minDeltaE,
			});
		} else {
			// 全てのCUD色が使われている場合（20色以上のパレット）
			results.push({
				hex: nearest.nearest.hex,
				originalHex: hex,
				cudColor: nearest.nearest,
				snapped: true,
				deltaE: nearest.deltaE,
			});
		}
	}

	return results;
}

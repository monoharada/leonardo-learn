/**
 * CUD スナッパー
 * 生成された色を最も近いCUD推奨色にスナップする機能
 *
 * CUD互換モードでは、生成されたすべての色が20色のCUD推奨色セットの
 * いずれかにマッピングされる
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.1, 7.2, 7.3
 */

import {
	clampChroma,
	deltaEok,
	toHex,
	toOklab,
	toOklch,
} from "../../utils/color-space";
import type { DerivationType } from "../tokens/types";
import type { CudColor } from "./colors";
import { findNearestCudColor, getCudColorSet } from "./service";
import {
	type CudZone,
	classifyZone,
	DEFAULT_ZONE_THRESHOLDS,
	type ZoneThresholds,
} from "./zone";

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

// ============================================================================
// Soft Snap機能（タスク4.1）
// ============================================================================

/**
 * Soft Snapオプション（既存SnapOptionsを拡張）
 * Requirements: 5.1, 5.2, 5.3, 5.5
 */
export interface SoftSnapOptions {
	/** スナップモード */
	mode: "strict" | "prefer" | "soft";
	/** 戻り係数（0.0-1.0, デフォルト: 0.5） */
	returnFactor?: number;
	/** ゾーン閾値 */
	zoneThresholds?: Partial<ZoneThresholds>;
}

/**
 * 派生情報
 * Requirements: 7.1, 7.2
 */
export interface SnapDerivation {
	/** 派生タイプ（strict-snap/soft-snap/reference） */
	type: DerivationType;
	/** 参照先DADSトークンID（CUD色ID形式） */
	dadsTokenId: string;
	/** 参照先DADSトークンHEX */
	dadsTokenHex: string;
	/** 結果のブランドトークンHEX */
	brandTokenHex: string;
}

/**
 * Soft Snap結果（既存SnapResultを拡張）
 * Requirements: 5.4, 5.6, 7.1, 7.2, 7.3
 */
export interface SoftSnapResult {
	/** スナップ後のHEX */
	hex: string;
	/** 元のHEX */
	originalHex: string;
	/** スナップ先CUD色 */
	cudColor: CudColor;
	/** スナップ適用有無 */
	snapped: boolean;
	/** 元の色との距離（deltaE） */
	deltaE: number;
	/** ゾーン判定 */
	zone: CudZone;
	/** deltaE変化量（スナップ前後） */
	deltaEChange: number;
	/** 説明文（UI表示用） - Requirement 5.4 */
	explanation: string;
	/** 派生情報 - Requirement 7.1, 7.2 */
	derivation: SnapDerivation;
}

const DEFAULT_RETURN_FACTOR = 0.5;

/**
 * スナップモードとスナップ状態に基づいて派生タイプを決定
 * Requirements: 7.1, 7.2
 */
const determineDerivationType = (
	mode: "strict" | "prefer" | "soft",
	snapped: boolean,
): DerivationType => {
	if (mode === "strict") {
		return "strict-snap";
	}
	if (snapped) {
		return "soft-snap";
	}
	return "reference";
};

/**
 * 派生情報を生成
 * Requirements: 7.1, 7.2
 */
const createDerivation = (
	mode: "strict" | "prefer" | "soft",
	snapped: boolean,
	cudColor: CudColor,
	resultHex: string,
): SnapDerivation => {
	return {
		type: determineDerivationType(mode, snapped),
		dadsTokenId: cudColor.id,
		dadsTokenHex: cudColor.hex,
		brandTokenHex: resultHex,
	};
};

/**
 * deltaEを3桁の小数点でフォーマット
 */
const formatDeltaE = (deltaE: number): string => {
	return deltaE.toFixed(3);
};

/**
 * Soft Snap説明文を生成する
 * Requirements: 5.4, 5.6
 *
 * @param zone - ゾーン判定結果
 * @param cudColorName - CUD色の日本語名
 * @param deltaE - 元のCUD色との距離
 * @param snapped - スナップが適用されたか
 * @param mode - スナップモード
 * @returns 説明文
 *
 * @example
 * // Safe Zone
 * "CUD準拠: 赤 (ΔE=0.000)"
 *
 * // Warning Zone
 * "この色はブランド維持のためCUDからΔE=0.080で許容: 赤"
 *
 * // Off Zone
 * "CUD非準拠を補正: 緑 (ΔE=0.250)"
 *
 * // Strict mode
 * "CUD色にスナップ: 赤 (ΔE=0.150)"
 */
const generateExplanation = (
	zone: CudZone,
	cudColorName: string,
	deltaE: number,
	snapped: boolean,
	mode: "strict" | "prefer" | "soft",
): string => {
	const formattedDeltaE = formatDeltaE(deltaE);

	// Strictモード: 常にCUD色にスナップ
	if (mode === "strict") {
		return `CUD色にスナップ: ${cudColorName} (ΔE=${formattedDeltaE})`;
	}

	// ゾーン別の説明文生成
	switch (zone) {
		case "safe":
			// Safe Zone: CUD準拠を示す
			return `CUD準拠: ${cudColorName} (ΔE=${formattedDeltaE})`;

		case "warning":
			if (snapped) {
				// Warning Zone + スナップあり: ブランド維持のため許容
				return `この色はブランド維持のためCUDからΔE=${formattedDeltaE}で許容: ${cudColorName}`;
			}
			// Warning Zone + スナップなし
			return `CUD許容範囲内: ${cudColorName} (ΔE=${formattedDeltaE})`;

		case "off":
			if (snapped) {
				// Off Zone + スナップあり: 補正済み
				return `CUD非準拠を補正: ${cudColorName} (ΔE=${formattedDeltaE})`;
			}
			// Off Zone + スナップなし: 警告
			return `CUD非準拠: ${cudColorName} (ΔE=${formattedDeltaE})`;

		default:
			return `${cudColorName} (ΔE=${formattedDeltaE})`;
	}
};

/**
 * returnFactorを検証する
 */
const validateReturnFactor = (factor: number): void => {
	if (factor < 0 || factor > 1) {
		throw new Error(
			`Invalid returnFactor: ${factor}. Must be between 0 and 1.`,
		);
	}
};

/**
 * OKLab空間で線形補間を行う
 * @param fromOklab - 開始色（OKLab）
 * @param toOklab - 終了色（OKLab）
 * @param factor - 補間係数（0-1, 0=from, 1=to）
 * @returns 補間結果のHEX
 */
const interpolateInOklab = (
	fromOklab: { l: number; a: number; b: number },
	toOklab: { l: number; a: number; b: number },
	factor: number,
): string => {
	// OKLab空間で線形補間
	const interpolatedL = fromOklab.l + (toOklab.l - fromOklab.l) * factor;
	const interpolatedA = fromOklab.a + (toOklab.a - fromOklab.a) * factor;
	const interpolatedB = fromOklab.b + (toOklab.b - fromOklab.b) * factor;

	// OKLCHに変換（ガマットクランプのため）
	const oklch = toOklch({
		mode: "oklab",
		l: interpolatedL,
		a: interpolatedA,
		b: interpolatedB,
	});

	if (!oklch) {
		throw new Error("Failed to convert interpolated color to OKLCH");
	}

	// ガマットクランプを適用
	const clamped = clampChroma(oklch);

	// HEXに変換
	return toHex(clamped);
};

/**
 * HEXを正規化（大文字、#付き）
 */
const normalizeHex = (hex: string): string => {
	let normalized = hex.trim().toUpperCase();
	if (!normalized.startsWith("#")) {
		normalized = `#${normalized}`;
	}
	return normalized;
};

/**
 * 単一の色にSoft Snapを適用する
 * Requirements: 5.1, 5.2, 5.3, 5.5
 *
 * @param hex - 入力色のHEX値
 * @param options - Soft Snapオプション
 * @returns Soft Snap結果
 *
 * @example
 * ```ts
 * // Safe Zone（deltaE <= 0.05）: スナップなし
 * softSnapToCudColor("#FF2800", { mode: "soft" });
 * // => { hex: "#FF2800", snapped: false, zone: "safe", ... }
 *
 * // Warning Zone（0.05 < deltaE <= 0.12）: 部分スナップ
 * softSnapToCudColor("#FF3500", { mode: "soft", returnFactor: 0.5 });
 * // => { hex: "...", snapped: true, zone: "warning", ... }
 *
 * // Off Zone（deltaE > 0.12）: Warning境界までスナップ
 * softSnapToCudColor("#123456", { mode: "soft" });
 * // => { hex: "...", snapped: true, zone: "off", ... }
 * ```
 */
export function softSnapToCudColor(
	hex: string,
	options: SoftSnapOptions,
): SoftSnapResult {
	const {
		mode,
		returnFactor = DEFAULT_RETURN_FACTOR,
		zoneThresholds,
	} = options;
	const normalizedHex = normalizeHex(hex);

	// returnFactorの検証
	validateReturnFactor(returnFactor);

	// 最近接CUD色を検索
	const nearest = findNearestCudColor(normalizedHex);
	const deltaE = nearest.deltaE;

	// ゾーンを判定
	const zone = classifyZone(deltaE, zoneThresholds);

	// 入力色のOKLab
	const inputOklab = toOklab(normalizedHex);
	if (!inputOklab) {
		throw new Error(`Invalid hex color: ${hex}`);
	}

	// CUD色のOKLab
	const cudOklab = nearest.nearest.oklab;

	// strictモード: 常にCUD色にスナップ
	if (mode === "strict") {
		const resultHex = nearest.nearest.hex;
		return {
			hex: resultHex,
			originalHex: normalizedHex,
			cudColor: nearest.nearest,
			snapped: true,
			deltaE,
			zone,
			deltaEChange: deltaE,
			explanation: generateExplanation(
				zone,
				nearest.nearest.nameJa,
				deltaE,
				true,
				mode,
			),
			derivation: createDerivation(mode, true, nearest.nearest, resultHex),
		};
	}

	// preferモード: 閾値以下の場合のみスナップ（既存互換）
	if (mode === "prefer") {
		const threshold =
			zoneThresholds?.warning ?? DEFAULT_ZONE_THRESHOLDS.warning;
		if (deltaE <= threshold) {
			// Warning Zone以内ならスナップ
			const resultHex = interpolateInOklab(
				{ l: inputOklab.l ?? 0, a: inputOklab.a ?? 0, b: inputOklab.b ?? 0 },
				cudOklab,
				returnFactor,
			);
			const resultOklab = toOklab(resultHex);
			const newDeltaE = resultOklab
				? deltaEok(resultOklab, { mode: "oklab", ...cudOklab })
				: deltaE;

			return {
				hex: resultHex,
				originalHex: normalizedHex,
				cudColor: nearest.nearest,
				snapped: true,
				deltaE,
				zone,
				deltaEChange: deltaE - newDeltaE,
				explanation: generateExplanation(
					zone,
					nearest.nearest.nameJa,
					deltaE,
					true,
					mode,
				),
				derivation: createDerivation(mode, true, nearest.nearest, resultHex),
			};
		}
		// 閾値超過: スナップなし
		return {
			hex: normalizedHex,
			originalHex: normalizedHex,
			cudColor: nearest.nearest,
			snapped: false,
			deltaE,
			zone,
			deltaEChange: 0,
			explanation: generateExplanation(
				zone,
				nearest.nearest.nameJa,
				deltaE,
				false,
				mode,
			),
			derivation: createDerivation(mode, false, nearest.nearest, normalizedHex),
		};
	}

	// softモード: ゾーンに応じたスナップ
	// Requirement 5.1: Safe Zone - スナップなし
	if (zone === "safe") {
		return {
			hex: normalizedHex,
			originalHex: normalizedHex,
			cudColor: nearest.nearest,
			snapped: false,
			deltaE,
			zone,
			deltaEChange: 0,
			explanation: generateExplanation(
				zone,
				nearest.nearest.nameJa,
				deltaE,
				false,
				mode,
			),
			derivation: createDerivation(mode, false, nearest.nearest, normalizedHex),
		};
	}

	// Requirement 5.2: Warning Zone - 戻り係数付き部分スナップ
	if (zone === "warning") {
		// returnFactorが0なら補間しない
		if (returnFactor === 0) {
			return {
				hex: normalizedHex,
				originalHex: normalizedHex,
				cudColor: nearest.nearest,
				snapped: false,
				deltaE,
				zone,
				deltaEChange: 0,
				explanation: generateExplanation(
					zone,
					nearest.nearest.nameJa,
					deltaE,
					false,
					mode,
				),
				derivation: createDerivation(
					mode,
					false,
					nearest.nearest,
					normalizedHex,
				),
			};
		}

		// OKLab空間で線形補間
		const resultHex = interpolateInOklab(
			{ l: inputOklab.l ?? 0, a: inputOklab.a ?? 0, b: inputOklab.b ?? 0 },
			cudOklab,
			returnFactor,
		);

		const resultOklab = toOklab(resultHex);
		const newDeltaE = resultOklab
			? deltaEok(resultOklab, { mode: "oklab", ...cudOklab })
			: deltaE;

		return {
			hex: resultHex,
			originalHex: normalizedHex,
			cudColor: nearest.nearest,
			snapped: true,
			deltaE,
			zone,
			deltaEChange: deltaE - newDeltaE,
			explanation: generateExplanation(
				zone,
				nearest.nearest.nameJa,
				deltaE,
				true,
				mode,
			),
			derivation: createDerivation(mode, true, nearest.nearest, resultHex),
		};
	}

	// Requirement 5.3: Off Zone - Warning境界までスナップ
	// Off ZoneからWarning Zone境界までの距離を計算してスナップ
	const warningThreshold =
		zoneThresholds?.warning ?? DEFAULT_ZONE_THRESHOLDS.warning;

	// deltaEがwarningThresholdになるように補間係数を計算
	// interpolationFactor = 1 - (warningThreshold / deltaE)
	// ただし、最低でも少しはスナップする
	const targetDeltaE = warningThreshold;
	const interpolationFactor = Math.min(
		1,
		Math.max(0, 1 - targetDeltaE / deltaE),
	);

	const resultHex = interpolateInOklab(
		{ l: inputOklab.l ?? 0, a: inputOklab.a ?? 0, b: inputOklab.b ?? 0 },
		cudOklab,
		interpolationFactor,
	);

	const resultOklab = toOklab(resultHex);
	const newDeltaE = resultOklab
		? deltaEok(resultOklab, { mode: "oklab", ...cudOklab })
		: deltaE;

	return {
		hex: resultHex,
		originalHex: normalizedHex,
		cudColor: nearest.nearest,
		snapped: true,
		deltaE,
		zone,
		deltaEChange: deltaE - newDeltaE,
		explanation: generateExplanation(
			zone,
			nearest.nearest.nameJa,
			deltaE,
			true,
			mode,
		),
		derivation: createDerivation(mode, true, nearest.nearest, resultHex),
	};
}

/**
 * パレット全体にSoft Snapを適用する
 * Requirements: 5.1, 5.2, 5.3, 5.5
 *
 * @param palette - HEX色の配列
 * @param options - Soft Snapオプション
 * @returns Soft Snap結果の配列
 */
export function softSnapPalette(
	palette: string[],
	options: SoftSnapOptions,
): SoftSnapResult[] {
	return palette.map((hex) => softSnapToCudColor(hex, options));
}

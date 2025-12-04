/**
 * CUD Zone Classification
 * CUD許容ゾーン（Safe/Warning/Off）の判定と閾値管理
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

/**
 * CUDゾーン
 * - safe: CUD推奨色と同等とみなす（スナップ不要）
 * - warning: 許容範囲内だが補正推奨（ソフトスナップ適用可）
 * - off: CUD非準拠（警告表示、Strictモードでハードスナップ）
 */
export type CudZone = "safe" | "warning" | "off";

/**
 * ゾーン閾値設定
 */
export interface ZoneThresholds {
	/** Safe Zone上限（デフォルト: 0.05） */
	safe: number;
	/** Warning Zone上限（デフォルト: 0.12） */
	warning: number;
}

/**
 * ゾーン判定結果
 */
export interface ZoneClassification {
	/** 判定されたゾーン */
	zone: CudZone;
	/** 入力されたdeltaE値 */
	deltaE: number;
	/** 使用された閾値 */
	thresholds: ZoneThresholds;
}

/**
 * デフォルトゾーン閾値
 * Requirement 2.1: Safe Zone: ΔE ≤ 0.05, Warning Zone: 0.05 < ΔE ≤ 0.12
 */
export const DEFAULT_ZONE_THRESHOLDS: Readonly<ZoneThresholds> = {
	safe: 0.05,
	warning: 0.12,
};

/**
 * deltaE値からゾーンを判定する
 * Requirements: 2.3, 2.4, 2.5
 *
 * @param deltaE - CUD推奨色との色差（deltaEok値）
 * @param thresholds - カスタム閾値（オプション）
 * @returns 判定されたゾーン
 *
 * @example
 * ```ts
 * classifyZone(0.03);  // => "safe"
 * classifyZone(0.08);  // => "warning"
 * classifyZone(0.15);  // => "off"
 * ```
 */
export const classifyZone = (
	deltaE: number,
	thresholds?: Partial<ZoneThresholds>,
): CudZone => {
	const effectiveThresholds: ZoneThresholds = {
		...DEFAULT_ZONE_THRESHOLDS,
		...thresholds,
	};

	if (deltaE <= effectiveThresholds.safe) {
		return "safe";
	}
	if (deltaE <= effectiveThresholds.warning) {
		return "warning";
	}
	return "off";
};

/**
 * 詳細なゾーン分類結果を取得する
 * Requirement 2.6: 各色のゾーン判定結果をメタデータとして出力
 *
 * @param deltaE - CUD推奨色との色差（deltaEok値）
 * @param thresholds - カスタム閾値（オプション）
 * @returns ゾーン判定結果（ゾーン、deltaE、使用閾値を含む）
 *
 * @example
 * ```ts
 * const result = getZoneClassification(0.07);
 * // => { zone: "warning", deltaE: 0.07, thresholds: { safe: 0.05, warning: 0.12 } }
 * ```
 */
export const getZoneClassification = (
	deltaE: number,
	thresholds?: Partial<ZoneThresholds>,
): ZoneClassification => {
	const effectiveThresholds: ZoneThresholds = {
		...DEFAULT_ZONE_THRESHOLDS,
		...thresholds,
	};

	return {
		zone: classifyZone(deltaE, effectiveThresholds),
		deltaE,
		thresholds: effectiveThresholds,
	};
};

/**
 * カスタム閾値を検証する
 * Requirement 2.2: ゾーン閾値をユーザーがカスタマイズできるようにする
 *
 * @param thresholds - 検証する閾値設定
 * @returns 閾値が有効な場合はtrue
 *
 * @example
 * ```ts
 * validateThresholds({ safe: 0.05, warning: 0.12 }); // => true
 * validateThresholds({ safe: 0.12, warning: 0.05 }); // => false (順序違反)
 * validateThresholds({ safe: -0.01, warning: 0.12 }); // => false (負の値)
 * ```
 */
export const validateThresholds = (thresholds: ZoneThresholds): boolean => {
	// 閾値は正の値である必要がある
	if (thresholds.safe <= 0 || thresholds.warning <= 0) {
		return false;
	}

	// safe閾値はwarning閾値より小さい必要がある
	if (thresholds.safe >= thresholds.warning) {
		return false;
	}

	return true;
};

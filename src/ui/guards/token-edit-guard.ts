/**
 * トークン編集保護機能
 *
 * DADSトークンの不変性を保護し、ブランドトークンのみ編集を許可する。
 *
 * Requirements: 12.1, 12.2
 */

import type { ColorToken } from "../../core/tokens/types";
import { isDadsToken } from "../../core/tokens/types";

/**
 * トークン編集保護の判定結果
 *
 * @property canEdit - 編集可能かどうか
 * @property reason - 編集不可の場合の理由
 * @property suggestion - 代替案の提示
 */
export interface TokenEditGuard {
	/** 編集可能フラグ */
	canEdit: boolean;
	/** 編集不可の理由（DADSトークンの場合に設定） */
	reason?: string;
	/** 代替案の提示（DADSトークンの場合に設定） */
	suggestion?: string;
}

/**
 * トークンの編集可否を判定する
 *
 * DADSトークンは不変であり編集不可。
 * ブランドトークンは派生トークンとして編集可能。
 *
 * @param token - 判定対象のカラートークン
 * @returns 編集可否の判定結果
 *
 * @example
 * ```ts
 * const guard = checkTokenEditability(token);
 * if (!guard.canEdit) {
 *   console.log(guard.reason);     // "DADSプリミティブカラーは変更できません"
 *   console.log(guard.suggestion); // "独自の色が必要な場合は..."
 * }
 * ```
 */
export function checkTokenEditability(token: ColorToken): TokenEditGuard {
	if (isDadsToken(token)) {
		return {
			canEdit: false,
			reason: "DADSプリミティブカラーは変更できません",
			suggestion:
				"独自の色が必要な場合は「ブランドトークンを作成」を選択してください",
		};
	}

	// ブランドトークンは編集可能
	return {
		canEdit: true,
	};
}

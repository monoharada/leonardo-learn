/**
 * AccentPaletteIntegration
 * 候補選択とパレット連携
 *
 * Task 4.3: 候補選択とパレット連携の実装
 * Requirements: 4.3, 4.4
 *
 * 選択したアクセントの管理:
 * - パレットへの追加
 * - 削除
 * - 別候補への変更
 */

import type { ScoredCandidate } from "../../core/accent/accent-candidate-service";
import type { BalanceScoreResult } from "../../core/accent/balance-score-calculator";

/**
 * 選択済みアクセント
 */
export interface SelectedAccent {
	/** DADSトークンID */
	tokenId: string;
	/** HEX値 */
	hex: string;
	/** DADSソース名 */
	dadsSourceName: string;
	/** 選択時のスコア */
	score: BalanceScoreResult;
}

/**
 * アクセント変更時のコールバック型
 */
export type AccentsChangeCallback = (accents: SelectedAccent[]) => void;

/**
 * AccentPaletteIntegration クラス
 * 候補選択とパレット連携を管理
 */
export class AccentPaletteIntegration {
	private selectedAccents: SelectedAccent[] = [];
	private changeCallback: AccentsChangeCallback | null = null;

	/**
	 * 選択済みアクセントのリストを取得
	 */
	getSelectedAccents(): SelectedAccent[] {
		return [...this.selectedAccents];
	}

	/**
	 * 候補を選択してパレットに追加
	 *
	 * @param candidate 選択する候補
	 */
	selectCandidate(candidate: ScoredCandidate): void {
		// 既に選択済みの場合は何もしない
		if (this.isSelected(candidate.tokenId)) {
			return;
		}

		const selectedAccent: SelectedAccent = {
			tokenId: candidate.tokenId,
			hex: candidate.hex,
			dadsSourceName: candidate.dadsSourceName,
			score: candidate.score,
		};

		this.selectedAccents.push(selectedAccent);
		this.notifyChange();
	}

	/**
	 * 選択済みアクセントを削除
	 *
	 * @param tokenId 削除するアクセントのトークンID
	 */
	removeSelectedAccent(tokenId: string): void {
		const index = this.selectedAccents.findIndex((a) => a.tokenId === tokenId);
		if (index === -1) {
			return;
		}

		this.selectedAccents.splice(index, 1);
		this.notifyChange();
	}

	/**
	 * 選択済みアクセントを別の候補に変更
	 *
	 * @param oldTokenId 変更するアクセントのトークンID
	 * @param newCandidate 新しい候補
	 */
	replaceSelectedAccent(
		oldTokenId: string,
		newCandidate: ScoredCandidate,
	): void {
		const index = this.selectedAccents.findIndex(
			(a) => a.tokenId === oldTokenId,
		);
		if (index === -1) {
			return;
		}

		const newAccent: SelectedAccent = {
			tokenId: newCandidate.tokenId,
			hex: newCandidate.hex,
			dadsSourceName: newCandidate.dadsSourceName,
			score: newCandidate.score,
		};

		this.selectedAccents[index] = newAccent;
		this.notifyChange();
	}

	/**
	 * 全ての選択済みアクセントをクリア
	 */
	clearAllAccents(): void {
		this.selectedAccents = [];
		this.notifyChange();
	}

	/**
	 * 指定したトークンIDが選択済みかどうか
	 *
	 * @param tokenId トークンID
	 * @returns 選択済みの場合true
	 */
	isSelected(tokenId: string): boolean {
		return this.selectedAccents.some((a) => a.tokenId === tokenId);
	}

	/**
	 * アクセント変更時のコールバックを登録
	 *
	 * @param callback 変更時に呼ばれるコールバック
	 */
	onAccentsChange(callback: AccentsChangeCallback): void {
		this.changeCallback = callback;
	}

	/**
	 * 変更を通知
	 */
	private notifyChange(): void {
		if (this.changeCallback) {
			this.changeCallback(this.getSelectedAccents());
		}
	}
}

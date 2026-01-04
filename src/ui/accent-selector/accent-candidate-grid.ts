/**
 * AccentCandidateGrid
 * 候補カードのグリッド表示
 *
 * Task 4.2: AccentCandidateGrid 候補表示UIの実装
 * Requirements: 4.2, 2.5
 *
 * 各カードに以下を表示:
 * - カラースウォッチ（大）
 * - DADSソース名（例: "Blue 600"）
 * - 総合スコア
 * - スコア内訳（ホバー時またはクリック時）
 */

import type { ScoredCandidate } from "../../core/accent/accent-candidate-service";

/**
 * 候補選択時のコールバック型
 */
export type CandidateSelectCallback = (candidate: ScoredCandidate) => void;

/**
 * AccentCandidateGrid クラス
 * 候補カードのグリッド表示コンポーネント
 */
export class AccentCandidateGrid {
	private container: HTMLElement;
	private candidates: ScoredCandidate[] = [];
	private selectCallback: CandidateSelectCallback | null = null;

	constructor(container: HTMLElement) {
		this.container = container;
	}

	/**
	 * 候補リストを取得
	 */
	getCandidates(): ScoredCandidate[] {
		return [...this.candidates];
	}

	/**
	 * 候補リストを設定
	 *
	 * @param candidates 候補リスト
	 */
	setCandidates(candidates: ScoredCandidate[]): void {
		this.candidates = [...candidates];
		this.render();
	}

	/**
	 * 候補選択時のコールバックを登録
	 *
	 * @param callback 選択時に呼ばれるコールバック
	 */
	onSelectCandidate(callback: CandidateSelectCallback): void {
		this.selectCallback = callback;
	}

	/**
	 * 候補を選択する
	 *
	 * @param tokenId 選択する候補のトークンID
	 */
	selectCandidate(tokenId: string): void {
		const candidate = this.candidates.find((c) => c.tokenId === tokenId);
		if (candidate && this.selectCallback) {
			this.selectCallback(candidate);
		}
	}

	/**
	 * スコアをフォーマットする
	 *
	 * @param score スコア値
	 * @returns 整数文字列
	 */
	formatScore(score: number): string {
		return Math.round(score).toString();
	}

	/**
	 * スコア内訳テキストを取得
	 *
	 * @param candidate 候補
	 * @returns スコア内訳テキスト
	 */
	getScoreBreakdownText(candidate: ScoredCandidate): string {
		const { breakdown } = candidate.score;
		return `ハーモニー: ${this.formatScore(breakdown.harmonyScore)} / CUD: ${this.formatScore(breakdown.cudScore)} / コントラスト: ${this.formatScore(breakdown.contrastScore)}`;
	}

	/**
	 * グリッドをレンダリング
	 *
	 * NOTE: DOM環境がない場合（テストなど）は何もしない
	 */
	render(): void {
		// DOM環境がない場合は何もしない（テスト環境対応）
		if (typeof document === "undefined") {
			return;
		}

		// グリッド要素を取得または作成
		let gridElement = this.container.querySelector(".accent-candidate-grid");
		if (!gridElement) {
			gridElement = document.createElement("div");
			gridElement.className = "accent-candidate-grid";
			this.container.appendChild(gridElement);
		}

		// 内容をクリア
		gridElement.replaceChildren();

		// 候補がない場合
		if (this.candidates.length === 0) {
			const emptyMessage = document.createElement("p");
			emptyMessage.className = "accent-candidate-grid__empty";
			emptyMessage.textContent = "候補がありません";
			gridElement.appendChild(emptyMessage);
			return;
		}

		// 候補カードを生成
		for (const candidate of this.candidates) {
			const card = this.createCandidateCard(candidate);
			gridElement.appendChild(card);
		}
	}

	/**
	 * 候補カードを生成
	 *
	 * @param candidate 候補
	 * @returns カード要素
	 */
	private createCandidateCard(candidate: ScoredCandidate): HTMLElement {
		const card = document.createElement("div");
		card.className = "accent-candidate-card";
		card.dataset.tokenId = candidate.tokenId;

		// カラースウォッチ
		const swatch = document.createElement("div");
		swatch.className = "accent-candidate-card__swatch";
		swatch.style.backgroundColor = candidate.hex;
		card.appendChild(swatch);

		// 情報エリア
		const info = document.createElement("div");
		info.className = "accent-candidate-card__info";

		// DADSソース名
		const name = document.createElement("span");
		name.className = "accent-candidate-card__name";
		name.textContent = candidate.dadsSourceName;
		info.appendChild(name);

		// 総合スコア
		const score = document.createElement("span");
		score.className = "accent-candidate-card__score";
		score.textContent = this.formatScore(candidate.score.total);
		info.appendChild(score);

		card.appendChild(info);

		// スコア内訳（ホバー時表示用のtooltip）
		const tooltipId = `tooltip-${candidate.tokenId}`;
		const tooltip = document.createElement("div");
		tooltip.className = "accent-candidate-card__tooltip";
		tooltip.id = tooltipId;
		tooltip.setAttribute("role", "tooltip");
		tooltip.textContent = this.getScoreBreakdownText(candidate);
		card.appendChild(tooltip);

		// クリックイベント
		card.addEventListener("click", () => {
			this.selectCandidate(candidate.tokenId);
		});

		// アクセシビリティ
		card.setAttribute("role", "button");
		card.setAttribute("tabindex", "0");
		card.setAttribute("aria-describedby", tooltipId);
		card.setAttribute(
			"aria-label",
			`${candidate.dadsSourceName}、スコア${this.formatScore(candidate.score.total)}点、${this.getScoreBreakdownText(candidate)}`,
		);

		// キーボードイベント
		card.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				this.selectCandidate(candidate.tokenId);
			}
		});

		return card;
	}
}

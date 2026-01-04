/**
 * LowScoreWarning
 * 低スコア警告の判定と表示
 *
 * Task 5.2: 低スコア警告の実装
 * Requirements: 5.4
 *
 * - 総合スコア50未満の判定機能
 * - 低スコア警告トースト表示（追加は許可）
 */

import type { ScoredCandidate } from "../../core/accent/accent-candidate-service";

/**
 * 低スコア警告の閾値（総合スコア）
 * Requirement 5.4: 手動追加した色のスコアが低い（50未満）場合
 */
export const LOW_SCORE_THRESHOLD = 50;

/**
 * 候補が低スコアかどうかを判定
 *
 * @param candidate スコア付き候補
 * @returns スコアが閾値未満ならtrue
 */
export function isLowScoreCandidate(candidate: ScoredCandidate): boolean {
	return candidate.score.total < LOW_SCORE_THRESHOLD;
}

/**
 * 低スコア警告メッセージを作成
 *
 * @param score 総合スコア
 * @returns 警告メッセージ
 */
export function createLowScoreWarningMessage(score: number): string {
	const roundedScore = Math.round(score);
	return `スコアが低めです（${roundedScore}点）。推奨色との差が大きい可能性があります。`;
}

/**
 * トースト表示オプション
 */
export interface ToastOptions {
	/** 自動非表示までのミリ秒（0で無効） */
	autoHideMs?: number;
}

/**
 * 続行時のコールバック型
 */
export type ProceedCallback = () => void;

/**
 * LowScoreWarningToast
 * 低スコア警告のトースト表示コンポーネント
 */
export class LowScoreWarningToast {
	private container: HTMLElement;
	private visible: boolean = false;
	private message: string = "";
	private proceedCallback: ProceedCallback | null = null;
	private autoHideTimeout: ReturnType<typeof setTimeout> | null = null;
	private toastElement: HTMLElement | null = null;

	constructor(container: HTMLElement) {
		this.container = container;
	}

	/**
	 * トーストが表示中かどうか
	 */
	isVisible(): boolean {
		return this.visible;
	}

	/**
	 * 現在のメッセージを取得
	 */
	getMessage(): string {
		return this.message;
	}

	/**
	 * トーストを表示
	 *
	 * @param score 総合スコア
	 * @param options 表示オプション
	 */
	show(score: number, options?: ToastOptions): void {
		this.message = createLowScoreWarningMessage(score);
		this.visible = true;
		this.render();

		// 自動非表示
		if (options?.autoHideMs && options.autoHideMs > 0) {
			this.clearAutoHideTimeout();
			this.autoHideTimeout = setTimeout(() => {
				this.hide();
			}, options.autoHideMs);
		}
	}

	/**
	 * トーストを非表示
	 */
	hide(): void {
		this.clearAutoHideTimeout();
		this.visible = false;
		this.message = "";
		this.removeToastElement();
	}

	/**
	 * 「続行して追加」ボタンクリック時のコールバックを登録
	 */
	onProceedAnyway(callback: ProceedCallback): void {
		this.proceedCallback = callback;
	}

	/**
	 * 追加を続行
	 */
	proceedWithAdd(): void {
		if (this.proceedCallback) {
			this.proceedCallback();
		}
		this.hide();
	}

	/**
	 * キャンセル（非表示にするだけ）
	 */
	cancel(): void {
		this.hide();
	}

	/**
	 * 自動非表示タイマーをクリア
	 */
	private clearAutoHideTimeout(): void {
		if (this.autoHideTimeout) {
			clearTimeout(this.autoHideTimeout);
			this.autoHideTimeout = null;
		}
	}

	/**
	 * トースト要素を削除
	 */
	private removeToastElement(): void {
		if (this.toastElement && typeof document !== "undefined") {
			try {
				this.toastElement.remove();
			} catch {
				// Ignore removal errors
			}
			this.toastElement = null;
		}
	}

	/**
	 * レンダリング
	 */
	private render(): void {
		// DOM環境がない場合は何もしない（テスト環境対応）
		if (typeof document === "undefined") {
			return;
		}

		// 既存のトーストを削除
		this.removeToastElement();

		if (!this.visible) {
			return;
		}

		// トースト要素を作成
		this.toastElement = document.createElement("div");
		this.toastElement.className = "low-score-warning-toast";
		this.toastElement.setAttribute("role", "alert");
		this.toastElement.setAttribute("aria-live", "polite");

		// アイコン
		const icon = document.createElement("span");
		icon.className = "low-score-warning-toast__icon";
		icon.textContent = "⚠️";
		icon.setAttribute("aria-hidden", "true");
		this.toastElement.appendChild(icon);

		// メッセージ
		const messageEl = document.createElement("span");
		messageEl.className = "low-score-warning-toast__message";
		messageEl.textContent = this.message;
		this.toastElement.appendChild(messageEl);

		// ボタンコンテナ
		const buttons = document.createElement("div");
		buttons.className = "low-score-warning-toast__buttons";

		// キャンセルボタン
		const cancelButton = document.createElement("button");
		cancelButton.className = "low-score-warning-toast__cancel";
		cancelButton.textContent = "キャンセル";
		cancelButton.addEventListener("click", () => this.cancel());
		buttons.appendChild(cancelButton);

		// 続行ボタン
		const proceedButton = document.createElement("button");
		proceedButton.className = "low-score-warning-toast__proceed";
		proceedButton.textContent = "追加する";
		proceedButton.addEventListener("click", () => this.proceedWithAdd());
		buttons.appendChild(proceedButton);

		this.toastElement.appendChild(buttons);

		// コンテナに追加
		this.container.appendChild(this.toastElement);
	}
}

/**
 * 低スコア警告を表示し、ユーザーの確認を待つ
 * Requirement 5.4: 警告を表示しつつ追加を許可
 *
 * Note: auto-hide時は「追加を許可」として扱う（設計の「警告は出すが追加は許可」に準拠）
 *
 * @param candidate 候補
 * @param container トーストを表示するコンテナ
 * @param options オプション
 * @returns 追加を続行するならtrue、キャンセルならfalse
 */
export async function showLowScoreWarningAndConfirm(
	candidate: ScoredCandidate,
	container: HTMLElement,
	options?: ToastOptions,
): Promise<boolean> {
	return new Promise((resolve) => {
		let resolved = false;
		const toast = new LowScoreWarningToast(container);

		const safeResolve = (value: boolean) => {
			if (!resolved) {
				resolved = true;
				resolve(value);
			}
		};

		toast.onProceedAnyway(() => {
			safeResolve(true);
		});

		// キャンセル時はfalseを返す
		const originalCancel = toast.cancel.bind(toast);
		toast.cancel = () => {
			originalCancel();
			safeResolve(false);
		};

		// auto-hide時のhideをオーバーライドして確実にPromiseを解決
		const originalHide = toast.hide.bind(toast);
		toast.hide = () => {
			originalHide();
			// auto-hide時は「追加を許可」として扱う（設計に準拠）
			safeResolve(true);
		};

		toast.show(candidate.score.total, options);
	});
}

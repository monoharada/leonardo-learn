/**
 * CopyToast コンポーネント
 *
 * コピー成功時のToast通知を表示するコンポーネント
 *
 * @module @/ui/components/copy-toast
 */

/**
 * Toastの表示時間（ミリ秒）
 */
export const TOAST_DURATION_MS = 2000;

/**
 * CopyToast インターフェース
 */
export interface CopyToast {
	/** Toast要素 */
	element: HTMLElement;
	/** Toastを表示する */
	show: (hex: string) => void;
	/** Toastを非表示にする */
	hide: () => void;
	/** コンポーネントを破棄する */
	destroy: () => void;
}

/**
 * CopyToast コンポーネントを作成する
 *
 * @returns CopyToastインスタンス
 */
export function createCopyToast(): CopyToast {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	const element = document.createElement("div");
	element.className = "copy-toast";

	// アクセシビリティ属性
	element.setAttribute("role", "alert");
	element.setAttribute("aria-live", "polite");

	// スタイル
	element.style.position = "fixed";
	element.style.bottom = "24px";
	element.style.left = "50%";
	element.style.transform = "translateX(-50%)";
	element.style.zIndex = "1000";
	element.style.display = "none";
	element.style.padding = "12px 24px";
	element.style.borderRadius = "8px";
	element.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
	element.style.color = "#ffffff";
	element.style.fontSize = "14px";
	element.style.fontWeight = "500";
	element.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
	element.style.transition = "opacity 0.2s ease";

	/**
	 * Toastを表示する
	 */
	function show(hex: string): void {
		// 既存のタイマーをクリア
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}

		// メッセージを更新
		element.textContent = `${hex} をコピーしました`;
		element.style.display = "block";
		element.style.opacity = "1";

		// 自動非表示タイマーを設定
		timeoutId = setTimeout(() => {
			hide();
		}, TOAST_DURATION_MS);
	}

	/**
	 * Toastを非表示にする
	 */
	function hide(): void {
		element.style.display = "none";
		element.style.opacity = "0";
	}

	/**
	 * コンポーネントを破棄する
	 */
	function destroy(): void {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	}

	return {
		element,
		show,
		hide,
		destroy,
	};
}

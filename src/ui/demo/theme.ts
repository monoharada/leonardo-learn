/**
 * デモUIのテーマ反映ヘルパー
 *
 * - CSSカスタムプロパティに状態を流し込み、全Viewで共通の見た目を揃える。
 *
 * @module @/ui/demo/theme
 */

/**
 * アプリ全体の「テキスト色」を反映する
 *
 * `--demo-text-color` はCSS側で `var(--demo-text-color, ...)` として参照する。
 */
export function applyDemoTextColor(textHex: string): void {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	if (!root) return;
	root.style.setProperty("--demo-text-color", textHex);
}

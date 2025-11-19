/**
 * leonardo-learn - OKLCH色空間を使用したカラーパレット生成ツール
 *
 * @packageDocumentation
 */

export * from "./core";
export * from "./utils";
export * from "./accessibility/wcag2";
export * from "./accessibility/apca";

// バージョン情報
export const VERSION = "0.1.0";

console.log(`leonardo-learn v${VERSION} - OKLCH Color Palette Generator`);

// Run demo if in browser environment
if (typeof document !== 'undefined') {
    import('./ui/demo').then(({ runDemo }) => {
        runDemo();
    });
}

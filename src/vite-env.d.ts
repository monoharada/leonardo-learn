/// <reference types="vite/client" />

// Viteの?rawインポートに対応
declare module "*?raw" {
	const content: string;
	export default content;
}

// CSSファイルの?rawインポート
declare module "*.css?raw" {
	const content: string;
	export default content;
}

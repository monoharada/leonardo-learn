/**
 * デモ機能の後方互換性re-export
 *
 * 既存のインポートパス `import { runDemo } from "@/ui/demo"` を維持するため、
 * 新しいモジュール構造からre-exportする。
 *
 * @module @/ui/demo
 * Requirements: 10.2, 10.3, 11.2
 */

export * from "./demo/index";

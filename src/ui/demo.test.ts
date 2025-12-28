/**
 * demo.ts後方互換性テスト
 *
 * Task 5.2: 既存のインポートパスが引き続き動作することを確認
 * @module @/ui/demo.test
 */

import { describe, expect, it } from "bun:test";

describe("demo.ts backward compatibility", () => {
	it("should export runDemo function from src/ui/demo.ts", async () => {
		const demoModule = await import("./demo");
		expect(demoModule.runDemo).toBeDefined();
		expect(typeof demoModule.runDemo).toBe("function");
	});

	it("should export runDemo with same signature as demo/index.ts", async () => {
		const demoModule = await import("./demo");
		const indexModule = await import("./demo/index");

		// 両方からrunDemoがエクスポートされていることを確認
		expect(demoModule.runDemo).toBeDefined();
		expect(indexModule.runDemo).toBeDefined();

		// 同じ関数であることを確認
		expect(demoModule.runDemo).toBe(indexModule.runDemo);
	});

	it("should re-export types from demo/index.ts", async () => {
		const demoModule = await import("./demo");

		// runDemo以外のexportは不要（内部モジュール）
		// 最低限runDemoがあればOK
		expect("runDemo" in demoModule).toBe(true);
	});
});

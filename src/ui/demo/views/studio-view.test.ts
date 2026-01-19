/**
 * スタジオビューモジュールのテスト
 *
 * NOTE: DOM操作を伴う詳細な検証はE2Eでカバー。
 * このファイルでは、公開APIの存在・非同期関数であること・依存方針を最小限確認する。
 */

import { describe, expect, it } from "bun:test";

describe("studio-view module", () => {
	describe("exports", () => {
		it("should export renderStudioView function", async () => {
			const { renderStudioView } = await import("./studio-view");
			expect(renderStudioView).toBeDefined();
			expect(typeof renderStudioView).toBe("function");
		});

		it("should be an async function (returns Promise)", async () => {
			const { renderStudioView } = await import("./studio-view");
			expect(renderStudioView.constructor.name).toBe("AsyncFunction");
		});
	});

	describe("guardrails", () => {
		it("should rely on DADS tokens (no invented colors) for random generation", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const filePath = path.join(import.meta.dir, "studio-view.ts");
			const content = fs.readFileSync(filePath, "utf-8");

			// DADSトークン読み込みを使用
			expect(content).toContain("loadDadsTokens");

			// アクセント候補はDADS由来のgenerateCandidatesを使用
			expect(content).toContain("generateCandidates");

			// 既存の「任意色生成」系の依存を増やしていないことを確認（方針チェック）
			expect(content).not.toContain("Math.random() * 360");
			expect(content).not.toContain("oklch(");
		});
	});
});

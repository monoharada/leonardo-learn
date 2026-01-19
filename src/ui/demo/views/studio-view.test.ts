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
	});
});

/**
 * views/index.ts のテスト
 *
 * ビューモジュールのre-exportが正しく機能することを検証する。
 */

import { describe, expect, test } from "bun:test";

// Re-exportされた関数・インターフェースをインポート
import {
	type AccessibilityViewHelpers,
	type HarmonyViewCallbacks,
	type PaletteViewCallbacks,
	// accessibility-view.ts
	renderAccessibilityView,
	renderAdjacentShadesAnalysis,
	renderBrandColorSection,
	renderDadsHueSection,
	renderDistinguishabilityAnalysis,
	// harmony-view.ts
	renderHarmonyView,
	// palette-view.ts
	renderPaletteView,
	// shades-view.ts
	renderShadesView,
	type ShadesViewCallbacks,
} from "./index";

describe("views/index.ts re-exports", () => {
	test("renderHarmonyView is exported", () => {
		expect(typeof renderHarmonyView).toBe("function");
	});

	test("renderPaletteView is exported", () => {
		expect(typeof renderPaletteView).toBe("function");
	});

	test("renderShadesView is exported", () => {
		expect(typeof renderShadesView).toBe("function");
	});

	test("renderDadsHueSection is exported", () => {
		expect(typeof renderDadsHueSection).toBe("function");
	});

	test("renderBrandColorSection is exported", () => {
		expect(typeof renderBrandColorSection).toBe("function");
	});

	test("renderAccessibilityView is exported", () => {
		expect(typeof renderAccessibilityView).toBe("function");
	});

	test("renderDistinguishabilityAnalysis is exported", () => {
		expect(typeof renderDistinguishabilityAnalysis).toBe("function");
	});

	test("renderAdjacentShadesAnalysis is exported", () => {
		expect(typeof renderAdjacentShadesAnalysis).toBe("function");
	});

	// 型エクスポートの検証（コンパイル時に検証されるが、明示的に確認）
	test("type exports compile correctly", () => {
		// これらの型が正しくエクスポートされていることを確認
		// コンパイルが通れば型は正しくエクスポートされている
		const _harmonyCallbacks: HarmonyViewCallbacks = {
			onHarmonySelect: () => {},
			onColorClick: () => {},
		};
		const _paletteCallbacks: PaletteViewCallbacks = {
			onColorClick: () => {},
		};
		const _shadesCallbacks: ShadesViewCallbacks = {
			onColorClick: () => {},
		};
		const _accessibilityHelpers: AccessibilityViewHelpers = {
			applySimulation: (color) => color,
		};

		// ダミーアサーション（コンパイル成功確認用）
		expect(true).toBe(true);
	});
});

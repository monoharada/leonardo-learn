/**
 * views/index.ts のテスト
 *
 * ビューモジュールのre-exportが正しく機能することを検証する。
 */

import { describe, expect, test } from "bun:test";

// Re-exportされた関数・インターフェースをインポート
import {
	type AccessibilityViewHelpers,
	// studio-view.ts
	generateNewStudioPalette,
	type ManualViewCallbacks,
	// accessibility-view.ts
	renderAccessibilityView,
	renderAdjacentShadesAnalysis,
	renderDadsHueSection,
	renderDistinguishabilityAnalysis,
	// manual-view.ts
	renderManualView,
	renderPrimaryBrandSection,
	renderStudioView,
	type StudioViewCallbacks,
} from "./index";

describe("views/index.ts re-exports", () => {
	test("renderManualView is exported", () => {
		expect(typeof renderManualView).toBe("function");
	});

	test("renderStudioView is exported", () => {
		expect(typeof renderStudioView).toBe("function");
	});

	test("generateNewStudioPalette is exported", () => {
		expect(typeof generateNewStudioPalette).toBe("function");
	});

	test("renderDadsHueSection is exported", () => {
		expect(typeof renderDadsHueSection).toBe("function");
	});

	test("renderPrimaryBrandSection is exported", () => {
		expect(typeof renderPrimaryBrandSection).toBe("function");
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
		const _manualCallbacks: ManualViewCallbacks = {
			onColorClick: () => {},
		};
		const _accessibilityHelpers: AccessibilityViewHelpers = {
			applySimulation: (color) => color,
		};
		const _studioCallbacks: StudioViewCallbacks = {
			onColorClick: () => {},
		};

		// ダミーアサーション（コンパイル成功確認用）
		expect(true).toBe(true);
	});
});

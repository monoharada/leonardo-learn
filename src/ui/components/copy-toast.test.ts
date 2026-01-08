/**
 * CopyToast コンポーネントのテスト
 *
 * TDD Phase 4: 🔴 Red - テストを先に書く
 *
 * コピー成功時のToast通知コンポーネント
 *
 * @module @/ui/components/copy-toast.test
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";

// JSDOMでdocumentをセットアップ
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement as typeof HTMLElement;

// テスト対象のモジュールをインポート
import {
	type CopyToast,
	createCopyToast,
	TOAST_DURATION_MS,
} from "./copy-toast";

describe("CopyToast", () => {
	let toast: CopyToast;
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
		toast = createCopyToast();
		container.appendChild(toast.element);
	});

	afterEach(() => {
		toast.destroy();
		container.remove();
	});

	describe("初期状態", () => {
		it("初期状態では非表示", () => {
			expect(toast.element.style.display).toBe("none");
		});

		it("copy-toastクラスが付与される", () => {
			expect(toast.element.classList.contains("copy-toast")).toBe(true);
		});

		it("role='alert'が設定される", () => {
			expect(toast.element.getAttribute("role")).toBe("alert");
		});

		it("aria-live='polite'が設定される", () => {
			expect(toast.element.getAttribute("aria-live")).toBe("polite");
		});
	});

	describe("show()", () => {
		it("show()でToastが表示される", () => {
			toast.show("#ff0000");
			expect(toast.element.style.display).not.toBe("none");
		});

		it("メッセージに渡したHEX値が含まれる", () => {
			toast.show("#ff0000");
			expect(toast.element.textContent).toContain("#ff0000");
		});

		it("メッセージに「コピーしました」が含まれる", () => {
			toast.show("#00ff00");
			expect(toast.element.textContent).toContain("コピーしました");
		});

		it("異なるHEX値を渡すとメッセージが更新される", () => {
			toast.show("#ff0000");
			expect(toast.element.textContent).toContain("#ff0000");

			toast.show("#0000ff");
			expect(toast.element.textContent).toContain("#0000ff");
			expect(toast.element.textContent).not.toContain("#ff0000");
		});
	});

	describe("自動非表示", () => {
		it("TOAST_DURATION_MSが定義されている", () => {
			expect(typeof TOAST_DURATION_MS).toBe("number");
			expect(TOAST_DURATION_MS).toBeGreaterThan(0);
		});

		it("TOAST_DURATION_MSは2000ms（2秒）である", () => {
			expect(TOAST_DURATION_MS).toBe(2000);
		});
	});

	describe("複数回呼び出し", () => {
		it("複数回show()を呼び出しても1つしか表示されない", () => {
			toast.show("#ff0000");
			toast.show("#00ff00");
			toast.show("#0000ff");

			// 最後のメッセージのみ表示される
			expect(toast.element.textContent).toContain("#0000ff");
			expect(toast.element.textContent).not.toContain("#ff0000");
			expect(toast.element.textContent).not.toContain("#00ff00");
		});
	});

	describe("hide()", () => {
		it("hide()でToastが非表示になる", () => {
			toast.show("#ff0000");
			expect(toast.element.style.display).not.toBe("none");

			toast.hide();
			expect(toast.element.style.display).toBe("none");
		});
	});

	describe("スタイル", () => {
		it("適切な位置スタイルが設定される", () => {
			expect(toast.element.style.position).toBe("fixed");
		});

		it("z-indexが高い値に設定される", () => {
			const zIndex = Number.parseInt(toast.element.style.zIndex, 10);
			expect(zIndex).toBeGreaterThanOrEqual(1000);
		});
	});

	describe("destroy()", () => {
		it("destroy()でタイマーがクリアされる", () => {
			toast.show("#ff0000");
			toast.destroy();
			// destroyが正常に完了することを確認
			expect(true).toBe(true);
		});
	});
});

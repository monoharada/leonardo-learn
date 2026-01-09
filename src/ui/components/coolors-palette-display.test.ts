/**
 * CoolorsPaletteDisplay コンポーネントのテスト
 *
 * TDD Phase 2: 🔴 Red - テストを先に書く
 *
 * Coolors風のフルブリードカラム表示コンポーネント
 * カラークリックでモーダル表示（コピー機能は削除）
 *
 * @module @/ui/components/coolors-palette-display.test
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";

// JSDOMでdocumentをセットアップ
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement as typeof HTMLElement;

// テスト対象のモジュールをインポート
import {
	type CoolorsPaletteDisplayProps,
	createCoolorsPaletteDisplay,
} from "./coolors-palette-display";

describe("CoolorsPaletteDisplay", () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	describe("基本レンダリング", () => {
		it("colors配列を受け取り、同数のカラムを生成する", () => {
			const props: CoolorsPaletteDisplayProps = {
				colors: ["#ff0000", "#00ff00", "#0000ff"],
				onColorClick: () => {},
			};

			const element = createCoolorsPaletteDisplay(props);
			container.appendChild(element);

			const columns = element.querySelectorAll(".coolors-column");
			expect(columns.length).toBe(3);
		});

		it("各カラムに正しい背景色が設定される", () => {
			const colors = ["#ff0000", "#00ff00", "#0000ff"];
			// JSDOMはHEXをRGBに変換するため、期待値もRGB形式で指定
			const expectedRgb = [
				"rgb(255, 0, 0)",
				"rgb(0, 255, 0)",
				"rgb(0, 0, 255)",
			];
			const props: CoolorsPaletteDisplayProps = {
				colors,
				onColorClick: () => {},
			};

			const element = createCoolorsPaletteDisplay(props);
			container.appendChild(element);

			const columns = element.querySelectorAll(
				".coolors-column",
			) as NodeListOf<HTMLElement>;
			columns.forEach((col, i) => {
				expect(col.style.backgroundColor).toBe(expectedRgb[i]);
			});
		});

		it("各カラムにHEX値が表示される", () => {
			const colors = ["#ff0000", "#00ff00"];
			const props: CoolorsPaletteDisplayProps = {
				colors,
				onColorClick: () => {},
			};

			const element = createCoolorsPaletteDisplay(props);
			container.appendChild(element);

			const hexLabels = element.querySelectorAll(".coolors-column__hex");
			expect(hexLabels.length).toBe(2);
			expect(hexLabels[0]?.textContent?.toLowerCase()).toBe("#ff0000");
			expect(hexLabels[1]?.textContent?.toLowerCase()).toBe("#00ff00");
		});

		it("空の配列を渡すとカラムが生成されない", () => {
			const props: CoolorsPaletteDisplayProps = {
				colors: [],
				onColorClick: () => {},
			};

			const element = createCoolorsPaletteDisplay(props);
			container.appendChild(element);

			const columns = element.querySelectorAll(".coolors-column");
			expect(columns.length).toBe(0);
		});
	});

	describe("コンテナスタイル", () => {
		it("コンテナにcoolors-displayクラスが付与される", () => {
			const props: CoolorsPaletteDisplayProps = {
				colors: ["#ff0000"],
				onColorClick: () => {},
			};

			const element = createCoolorsPaletteDisplay(props);
			expect(element.classList.contains("coolors-display")).toBe(true);
		});

		it("コンテナ高さはCSSで管理される（インラインスタイルなし）", () => {
			const props: CoolorsPaletteDisplayProps = {
				colors: ["#ff0000"],
				onColorClick: () => {},
			};

			const element = createCoolorsPaletteDisplay(props);
			// 高さはCSSで min(50vh, 400px) として定義されているため、
			// インラインスタイルは設定されない
			expect(element.style.height).toBe("");
		});
	});

	describe("インタラクション", () => {
		it("カラムクリックでonColorClickコールバックが呼ばれる", () => {
			const onColorClickMock = mock(() => {});
			const colors = ["#ff0000", "#00ff00"];
			const props: CoolorsPaletteDisplayProps = {
				colors,
				onColorClick: onColorClickMock,
			};

			const element = createCoolorsPaletteDisplay(props);
			container.appendChild(element);

			const columns = element.querySelectorAll(
				".coolors-column",
			) as NodeListOf<HTMLElement>;

			// 最初のカラムをクリック
			columns[0]?.click();
			expect(onColorClickMock).toHaveBeenCalledWith("#ff0000", 0);

			// 2番目のカラムをクリック
			columns[1]?.click();
			expect(onColorClickMock).toHaveBeenCalledWith("#00ff00", 1);
		});

		it("カラムにcoolors-columnクラスが付与される（CSSでスタイル適用）", () => {
			const props: CoolorsPaletteDisplayProps = {
				colors: ["#ff0000"],
				onColorClick: () => {},
			};

			const element = createCoolorsPaletteDisplay(props);
			container.appendChild(element);

			const column = element.querySelector(".coolors-column");
			expect(column).not.toBeNull();
			expect(column?.classList.contains("coolors-column")).toBe(true);
		});
	});

	describe("ホバー効果", () => {
		it("カラムにdata-hoverable属性が設定される（CSS用）", () => {
			const props: CoolorsPaletteDisplayProps = {
				colors: ["#ff0000"],
				onColorClick: () => {},
			};

			const element = createCoolorsPaletteDisplay(props);
			container.appendChild(element);

			const column = element.querySelector(".coolors-column");
			expect(column?.getAttribute("data-hoverable")).toBe("true");
		});
	});

	describe("アクセシビリティ", () => {
		it("各カラムにrole='button'が設定される", () => {
			const props: CoolorsPaletteDisplayProps = {
				colors: ["#ff0000"],
				onColorClick: () => {},
			};

			const element = createCoolorsPaletteDisplay(props);
			container.appendChild(element);

			const column = element.querySelector(".coolors-column");
			expect(column?.getAttribute("role")).toBe("button");
		});

		it("各カラムにaria-labelが設定される", () => {
			const props: CoolorsPaletteDisplayProps = {
				colors: ["#ff0000"],
				onColorClick: () => {},
			};

			const element = createCoolorsPaletteDisplay(props);
			container.appendChild(element);

			const column = element.querySelector(".coolors-column");
			const ariaLabel = column?.getAttribute("aria-label");
			expect(ariaLabel).toContain("#ff0000");
			expect(ariaLabel).toContain("詳細");
		});

		it("各カラムにtabindex='0'が設定される", () => {
			const props: CoolorsPaletteDisplayProps = {
				colors: ["#ff0000"],
				onColorClick: () => {},
			};

			const element = createCoolorsPaletteDisplay(props);
			container.appendChild(element);

			const column = element.querySelector(".coolors-column");
			expect(column?.getAttribute("tabindex")).toBe("0");
		});
	});

	describe("トークン名表示", () => {
		it("tokenNamesが提供された場合、トークン名が表示される", () => {
			const props: CoolorsPaletteDisplayProps = {
				colors: ["#ff0000", "#00ff00"],
				tokenNames: ["Brand", "Accent-1"],
				onColorClick: () => {},
			};

			const element = createCoolorsPaletteDisplay(props);
			container.appendChild(element);

			const tokenLabels = element.querySelectorAll(
				".coolors-column__token-name",
			);
			expect(tokenLabels.length).toBe(2);
			expect(tokenLabels[0]?.textContent).toBe("Brand");
			expect(tokenLabels[1]?.textContent).toBe("Accent-1");
		});

		it("tokenNamesが提供されない場合、トークン名は表示されない", () => {
			const props: CoolorsPaletteDisplayProps = {
				colors: ["#ff0000"],
				onColorClick: () => {},
			};

			const element = createCoolorsPaletteDisplay(props);
			container.appendChild(element);

			const tokenLabels = element.querySelectorAll(
				".coolors-column__token-name",
			);
			expect(tokenLabels.length).toBe(0);
		});
	});
});

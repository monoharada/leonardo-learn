/**
 * HarmonySidebar コンポーネントのテスト
 *
 * TDD Phase 3: 🔴 Red - テストを先に書く
 *
 * 全8種類のハーモニータイプをサイドバーに表示するコンポーネント
 *
 * @module @/ui/components/harmony-sidebar.test
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";

// JSDOMでdocumentをセットアップ
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement as typeof HTMLElement;
global.KeyboardEvent = dom.window.KeyboardEvent;

// テスト対象のモジュールをインポート
import type { HarmonyFilterType } from "@/core/accent/harmony-filter-calculator";
import {
	createHarmonySidebar,
	HARMONY_TYPE_LABELS,
	type HarmonySidebarProps,
} from "./harmony-sidebar";

describe("HarmonySidebar", () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	describe("基本レンダリング", () => {
		it("8種類のハーモニーカードを表示する", () => {
			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews: new Map(),
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const cards = element.querySelectorAll(".harmony-sidebar__card");
			expect(cards.length).toBe(8);
		});

		it("各カードにharmony-sidebar__cardクラスが付与される", () => {
			const props: HarmonySidebarProps = {
				selectedType: "triadic",
				previews: new Map(),
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const cards = element.querySelectorAll(".harmony-sidebar__card");
			expect(cards.length).toBeGreaterThan(0);
			cards.forEach((card) => {
				expect(card.classList.contains("harmony-sidebar__card")).toBe(true);
			});
		});

		it("コンテナにharmony-sidebarクラスが付与される", () => {
			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews: new Map(),
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			expect(element.classList.contains("harmony-sidebar")).toBe(true);
		});
	});

	describe("ハーモニー名表示", () => {
		it("各カードにハーモニー名が表示される", () => {
			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews: new Map(),
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const nameLabels = element.querySelectorAll(
				".harmony-sidebar__card-name",
			);
			expect(nameLabels.length).toBe(8);

			// 少なくとも1つのラベルにテキストがある
			const firstLabel = nameLabels[0];
			expect(firstLabel?.textContent?.length).toBeGreaterThan(0);
		});

		it("HARMONY_TYPE_LABELSにすべてのハーモニータイプのラベルが定義されている", () => {
			const expectedTypes: HarmonyFilterType[] = [
				"complementary",
				"triadic",
				"analogous",
				"split-complementary",
				"monochromatic",
				"shades",
				"compound",
				"square",
			];

			for (const type of expectedTypes) {
				expect(HARMONY_TYPE_LABELS[type]).toBeDefined();
				expect(HARMONY_TYPE_LABELS[type].length).toBeGreaterThan(0);
			}
		});
	});

	describe("ミニスウォッチ表示", () => {
		it("各カードにミニスウォッチコンテナが表示される", () => {
			const previews = new Map<HarmonyFilterType, string[]>();
			previews.set("complementary", ["#ff0000", "#00ffff"]);
			previews.set("triadic", ["#ff0000", "#00ff00", "#0000ff"]);

			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews,
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const swatchContainers = element.querySelectorAll(
				".harmony-sidebar__swatches",
			);
			expect(swatchContainers.length).toBe(8);
		});

		it("previewsがある場合、ミニスウォッチにカラーが設定される", () => {
			const previews = new Map<HarmonyFilterType, string[]>();
			previews.set("complementary", ["#ff0000", "#00ffff"]);

			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews,
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			// complementaryカードを探す
			const cards = element.querySelectorAll(".harmony-sidebar__card");
			const complementaryCard = Array.from(cards).find(
				(card) => card.getAttribute("data-harmony-type") === "complementary",
			);

			const swatches = complementaryCard?.querySelectorAll(
				".harmony-sidebar__swatch",
			);
			expect(swatches?.length).toBe(2);
		});
	});

	describe("選択状態", () => {
		it("選択中のカードにaria-selected='true'が付与される", () => {
			const props: HarmonySidebarProps = {
				selectedType: "triadic",
				previews: new Map(),
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const selectedCard = element.querySelector('[aria-selected="true"]');
			expect(selectedCard).not.toBeNull();
			expect(selectedCard?.getAttribute("data-harmony-type")).toBe("triadic");
		});

		it("選択されていないカードにaria-selected='false'が付与される", () => {
			const props: HarmonySidebarProps = {
				selectedType: "triadic",
				previews: new Map(),
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const unselectedCards = element.querySelectorAll(
				'[aria-selected="false"]',
			);
			expect(unselectedCards.length).toBe(7); // 8 - 1 = 7
		});

		it("選択中のカードにharmony-sidebar__card--selectedクラスが付与される", () => {
			const props: HarmonySidebarProps = {
				selectedType: "analogous",
				previews: new Map(),
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const selectedCard = element.querySelector(
				".harmony-sidebar__card--selected",
			);
			expect(selectedCard).not.toBeNull();
			expect(selectedCard?.getAttribute("data-harmony-type")).toBe("analogous");
		});
	});

	describe("インタラクション", () => {
		it("カードクリックでonSelectコールバックが呼ばれる", () => {
			const onSelectMock = mock(() => {});
			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews: new Map(),
				onSelect: onSelectMock,
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const cards = element.querySelectorAll(
				".harmony-sidebar__card",
			) as NodeListOf<HTMLElement>;

			// triadicカードをクリック
			const triadicCard = Array.from(cards).find(
				(card) => card.getAttribute("data-harmony-type") === "triadic",
			);
			triadicCard?.click();

			expect(onSelectMock).toHaveBeenCalledWith("triadic");
		});

		it("カードにcursor: pointerスタイルが設定される", () => {
			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews: new Map(),
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const card = element.querySelector(
				".harmony-sidebar__card",
			) as HTMLElement | null;
			expect(card?.style.cursor).toBe("pointer");
		});
	});

	describe("キーボードナビゲーション", () => {
		it("各カードにtabindex='0'が設定される", () => {
			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews: new Map(),
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const cards = element.querySelectorAll(".harmony-sidebar__card");
			cards.forEach((card) => {
				expect(card.getAttribute("tabindex")).toBe("0");
			});
		});

		it("各カードにrole='option'が設定される", () => {
			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews: new Map(),
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const cards = element.querySelectorAll(".harmony-sidebar__card");
			cards.forEach((card) => {
				expect(card.getAttribute("role")).toBe("option");
			});
		});

		it("コンテナにrole='listbox'が設定される", () => {
			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews: new Map(),
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			expect(element.getAttribute("role")).toBe("listbox");
		});

		it("Enterキーで選択が確定する", () => {
			const onSelectMock = mock(() => {});
			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews: new Map(),
				onSelect: onSelectMock,
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const cards = element.querySelectorAll(
				".harmony-sidebar__card",
			) as NodeListOf<HTMLElement>;
			const triadicCard = Array.from(cards).find(
				(card) => card.getAttribute("data-harmony-type") === "triadic",
			);

			// Enterキーイベントを発火
			const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
			triadicCard?.dispatchEvent(enterEvent);

			expect(onSelectMock).toHaveBeenCalledWith("triadic");
		});

		it("Spaceキーで選択が確定する", () => {
			const onSelectMock = mock(() => {});
			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews: new Map(),
				onSelect: onSelectMock,
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const cards = element.querySelectorAll(
				".harmony-sidebar__card",
			) as NodeListOf<HTMLElement>;
			const analogousCard = Array.from(cards).find(
				(card) => card.getAttribute("data-harmony-type") === "analogous",
			);

			// Spaceキーイベントを発火
			const spaceEvent = new KeyboardEvent("keydown", { key: " " });
			analogousCard?.dispatchEvent(spaceEvent);

			expect(onSelectMock).toHaveBeenCalledWith("analogous");
		});
	});

	describe("アクセシビリティ", () => {
		it("各カードにaria-labelが設定される", () => {
			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews: new Map(),
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			container.appendChild(element);

			const cards = element.querySelectorAll(".harmony-sidebar__card");
			cards.forEach((card) => {
				const ariaLabel = card.getAttribute("aria-label");
				expect(ariaLabel).toBeTruthy();
				expect(ariaLabel).toContain("ハーモニー");
			});
		});

		it("コンテナにaria-label='ハーモニータイプ選択'が設定される", () => {
			const props: HarmonySidebarProps = {
				selectedType: "complementary",
				previews: new Map(),
				onSelect: () => {},
			};

			const element = createHarmonySidebar(props);
			expect(element.getAttribute("aria-label")).toBe("ハーモニータイプ選択");
		});
	});
});

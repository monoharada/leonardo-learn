/**
 * HarmonyTypeCard Tests
 * Section 8: アクセント選定UI改善
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import {
	createHarmonyTypeCardGrid,
	DetailSelectCard,
	HARMONY_TYPE_CARD_CONFIGS,
	HarmonyTypeCard,
} from "./harmony-type-card";

// JSDOMセットアップ
let dom: JSDOM;
let document: Document;
let container: HTMLElement;

beforeEach(() => {
	dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
	document = dom.window.document;
	global.document = document as unknown as Document;
	container = document.createElement("div");
	document.body.appendChild(container);
});

describe("HarmonyTypeCard", () => {
	it("カードが正しくレンダリングされる", () => {
		const onClick = mock(() => {});
		const card = new HarmonyTypeCard(
			container,
			HARMONY_TYPE_CARD_CONFIGS[0],
			onClick,
		);

		const cardElement = container.querySelector(".harmony-type-card");
		expect(cardElement).not.toBeNull();
		expect(cardElement?.getAttribute("data-harmony-type")).toBe(
			"complementary",
		);
	});

	it("タイトルと説明が表示される", () => {
		const onClick = mock(() => {});
		const config = HARMONY_TYPE_CARD_CONFIGS[0];
		const card = new HarmonyTypeCard(container, config, onClick);

		const title = container.querySelector(".harmony-type-card__title");
		const description = container.querySelector(
			".harmony-type-card__description",
		);

		expect(title?.textContent).toBe(config.name);
		expect(description?.textContent).toBe(config.description);
	});

	it("3つのプレビュースウォッチが表示される", () => {
		const onClick = mock(() => {});
		const card = new HarmonyTypeCard(
			container,
			HARMONY_TYPE_CARD_CONFIGS[0],
			onClick,
		);

		const swatches = container.querySelectorAll(".harmony-type-card__swatch");
		expect(swatches.length).toBe(3);
	});

	it("クリックでコールバックが呼ばれる", () => {
		const onClick = mock(() => {});
		const card = new HarmonyTypeCard(
			container,
			HARMONY_TYPE_CARD_CONFIGS[0],
			onClick,
		);

		const cardElement = container.querySelector(
			".harmony-type-card",
		) as HTMLButtonElement;
		cardElement.click();

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(onClick).toHaveBeenCalledWith("complementary");
	});

	it("setPreviewColorsで色を設定できる", () => {
		const onClick = mock(() => {});
		const card = new HarmonyTypeCard(
			container,
			HARMONY_TYPE_CARD_CONFIGS[0],
			onClick,
		);

		card.setPreviewColors(["#FF0000", "#00FF00", "#0000FF"]);

		const swatches = container.querySelectorAll(
			".harmony-type-card__swatch",
		) as NodeListOf<HTMLElement>;
		expect(swatches[0].style.backgroundColor).toBe("rgb(255, 0, 0)");
		expect(swatches[1].style.backgroundColor).toBe("rgb(0, 255, 0)");
		expect(swatches[2].style.backgroundColor).toBe("rgb(0, 0, 255)");
	});

	it("setLoadingでローディング状態を設定できる", () => {
		const onClick = mock(() => {});
		const card = new HarmonyTypeCard(
			container,
			HARMONY_TYPE_CARD_CONFIGS[0],
			onClick,
		);

		card.setLoading(true);
		const cardElement = container.querySelector(".harmony-type-card");
		expect(cardElement?.classList.contains("harmony-type-card--loading")).toBe(
			true,
		);
		expect(cardElement?.getAttribute("aria-busy")).toBe("true");

		card.setLoading(false);
		expect(cardElement?.classList.contains("harmony-type-card--loading")).toBe(
			false,
		);
		expect(cardElement?.getAttribute("aria-busy")).toBeNull();
	});

	it("setDisabledで無効状態を設定できる", () => {
		const onClick = mock(() => {});
		const card = new HarmonyTypeCard(
			container,
			HARMONY_TYPE_CARD_CONFIGS[0],
			onClick,
		);

		card.setDisabled(true);
		const cardElement = container.querySelector(
			".harmony-type-card",
		) as HTMLButtonElement;
		expect(cardElement.disabled).toBe(true);
		expect(cardElement.classList.contains("harmony-type-card--disabled")).toBe(
			true,
		);
	});

	it("destroyでコンポーネントを破棄できる", () => {
		const onClick = mock(() => {});
		const card = new HarmonyTypeCard(
			container,
			HARMONY_TYPE_CARD_CONFIGS[0],
			onClick,
		);

		card.destroy();
		const cardElement = container.querySelector(".harmony-type-card");
		expect(cardElement).toBeNull();
	});
});

describe("DetailSelectCard", () => {
	it("詳細選択カードがレンダリングされる", () => {
		const onClick = mock(() => {});
		const card = new DetailSelectCard(container, onClick);

		const cardElement = container.querySelector(".harmony-type-card--detail");
		expect(cardElement).not.toBeNull();
	});

	it("クリックでコールバックが呼ばれる", () => {
		const onClick = mock(() => {});
		const card = new DetailSelectCard(container, onClick);

		const cardElement = container.querySelector(
			".harmony-type-card--detail",
		) as HTMLButtonElement;
		cardElement.click();

		expect(onClick).toHaveBeenCalledTimes(1);
	});
});

describe("createHarmonyTypeCardGrid", () => {
	it("8つのハーモニーカードと1つの詳細カードを作成する", () => {
		const onCardClick = mock(() => {});
		const onDetailClick = mock(() => {});

		const { cards, detailCard } = createHarmonyTypeCardGrid(
			container,
			onCardClick,
			onDetailClick,
		);

		expect(cards.length).toBe(8);
		expect(detailCard).toBeDefined();

		const allCards = container.querySelectorAll(".harmony-type-card");
		expect(allCards.length).toBe(9); // 8 + 1
	});

	it("グリッドコンテナが作成される", () => {
		const onCardClick = mock(() => {});
		const onDetailClick = mock(() => {});

		createHarmonyTypeCardGrid(container, onCardClick, onDetailClick);

		const grid = container.querySelector(".harmony-type-cards");
		expect(grid).not.toBeNull();
	});
});

describe("HARMONY_TYPE_CARD_CONFIGS", () => {
	it("8つのハーモニータイプが定義されている", () => {
		expect(HARMONY_TYPE_CARD_CONFIGS.length).toBe(8);
	});

	it("必要なプロパティが定義されている", () => {
		for (const config of HARMONY_TYPE_CARD_CONFIGS) {
			expect(config.type).toBeDefined();
			expect(config.name).toBeDefined();
			expect(config.description).toBeDefined();
		}
	});

	it("正しいハーモニータイプが含まれている", () => {
		const types = HARMONY_TYPE_CARD_CONFIGS.map((c) => c.type);
		// 既存の4タイプ
		expect(types).toContain("complementary");
		expect(types).toContain("triadic");
		expect(types).toContain("analogous");
		expect(types).toContain("split-complementary");
		// 新しい3タイプ
		expect(types).toContain("monochromatic");
		expect(types).toContain("shades");
		expect(types).toContain("compound");
		// 追加のタイプ
		expect(types).toContain("square");
	});
});

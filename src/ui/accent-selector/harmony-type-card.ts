/**
 * HarmonyTypeCard
 * ハーモニータイプ選択カードコンポーネント
 *
 * Section 8: アクセント選定UI改善
 * - 各ハーモニータイプをカード形式で表示
 * - 3色のプレビュースウォッチを表示
 * - クリックでパレット生成
 */

import type { HarmonyFilterType } from "../../core/accent/harmony-filter-calculator";

/**
 * ハーモニータイプカード設定
 */
export interface HarmonyTypeCardConfig {
	/** ハーモニータイプID */
	type: HarmonyFilterType;
	/** 表示名（日本語） */
	name: string;
	/** 説明文 */
	description: string;
}

/**
 * 詳細選択カード設定
 */
export interface DetailSelectCardConfig {
	/** 表示名 */
	name: string;
	/** 説明文 */
	description: string;
}

/**
 * ハーモニータイプカードのデフォルト設定
 */
export const HARMONY_TYPE_CARD_CONFIGS: HarmonyTypeCardConfig[] = [
	{
		type: "complementary",
		name: "補色",
		description: "色相環で正反対の色",
	},
	{
		type: "triadic",
		name: "トライアド",
		description: "色相環を3等分した配色",
	},
	{
		type: "analogous",
		name: "類似色",
		description: "色相環で隣り合う色",
	},
	{
		type: "split-complementary",
		name: "分裂補色",
		description: "補色の両隣の色",
	},
];

/**
 * ハーモニータイプカードコンポーネント
 */
export class HarmonyTypeCard {
	private container: HTMLElement;
	private config: HarmonyTypeCardConfig;
	private onClick: (type: HarmonyFilterType) => void;
	private cardElement: HTMLButtonElement | null = null;
	private previewContainer: HTMLElement | null = null;
	private swatchElements: HTMLElement[] = [];

	constructor(
		container: HTMLElement,
		config: HarmonyTypeCardConfig,
		onClick: (type: HarmonyFilterType) => void,
	) {
		this.container = container;
		this.config = config;
		this.onClick = onClick;
		this.render();
	}

	/**
	 * カードをレンダリング
	 */
	private render(): void {
		// カードボタン要素を作成
		this.cardElement = document.createElement("button");
		this.cardElement.type = "button";
		this.cardElement.className = "harmony-type-card";
		this.cardElement.setAttribute("data-harmony-type", this.config.type);
		this.cardElement.setAttribute(
			"aria-label",
			`${this.config.name}パレットを作成`,
		);

		// タイトル
		const title = document.createElement("div");
		title.className = "harmony-type-card__title";
		title.textContent = this.config.name;

		// 説明
		const description = document.createElement("div");
		description.className = "harmony-type-card__description";
		description.textContent = this.config.description;

		// プレビュースウォッチコンテナ
		this.previewContainer = document.createElement("div");
		this.previewContainer.className = "harmony-type-card__preview";

		// 3つのスウォッチを作成（初期状態はプレースホルダー）
		for (let i = 0; i < 3; i++) {
			const swatch = document.createElement("div");
			swatch.className = "harmony-type-card__swatch";
			swatch.style.backgroundColor = "#e0e0e0";
			this.swatchElements.push(swatch);
			this.previewContainer.appendChild(swatch);
		}

		// パレットラベル
		const label = document.createElement("div");
		label.className = "harmony-type-card__label";
		label.textContent = "3色パレット";

		// 要素を組み立て
		this.cardElement.appendChild(title);
		this.cardElement.appendChild(description);
		this.cardElement.appendChild(this.previewContainer);
		this.cardElement.appendChild(label);

		// クリックイベント
		this.cardElement.addEventListener("click", () => {
			this.onClick(this.config.type);
		});

		this.container.appendChild(this.cardElement);
	}

	/**
	 * プレビュー色を設定
	 *
	 * @param colors 3色の配列（ブランドカラー + 2アクセント）
	 */
	setPreviewColors(colors: [string, string, string]): void {
		if (this.swatchElements.length >= 3 && colors.length >= 3) {
			const [color0, color1, color2] = colors;
			const [swatch0, swatch1, swatch2] = this.swatchElements;
			if (swatch0 && swatch1 && swatch2) {
				swatch0.style.backgroundColor = color0;
				swatch1.style.backgroundColor = color1;
				swatch2.style.backgroundColor = color2;
			}
		}
	}

	/**
	 * ローディング状態を設定
	 */
	setLoading(loading: boolean): void {
		if (this.cardElement) {
			if (loading) {
				this.cardElement.classList.add("harmony-type-card--loading");
				this.cardElement.setAttribute("aria-busy", "true");
			} else {
				this.cardElement.classList.remove("harmony-type-card--loading");
				this.cardElement.removeAttribute("aria-busy");
			}
		}
	}

	/**
	 * 無効状態を設定
	 */
	setDisabled(disabled: boolean): void {
		if (this.cardElement) {
			this.cardElement.disabled = disabled;
			if (disabled) {
				this.cardElement.classList.add("harmony-type-card--disabled");
			} else {
				this.cardElement.classList.remove("harmony-type-card--disabled");
			}
		}
	}

	/**
	 * コンポーネントを破棄
	 */
	destroy(): void {
		if (this.cardElement) {
			this.cardElement.remove();
			this.cardElement = null;
		}
		this.swatchElements = [];
		this.previewContainer = null;
	}
}

/**
 * 詳細選択カードコンポーネント
 */
export class DetailSelectCard {
	private container: HTMLElement;
	private onClick: () => void;
	private cardElement: HTMLButtonElement | null = null;

	constructor(container: HTMLElement, onClick: () => void) {
		this.container = container;
		this.onClick = onClick;
		this.render();
	}

	/**
	 * カードをレンダリング
	 */
	private render(): void {
		this.cardElement = document.createElement("button");
		this.cardElement.type = "button";
		this.cardElement.className = "harmony-type-card harmony-type-card--detail";
		this.cardElement.setAttribute("aria-label", "詳細選択モードを開く");

		// タイトル
		const title = document.createElement("div");
		title.className = "harmony-type-card__title";
		title.textContent = "詳細選択...";

		// 説明
		const description = document.createElement("div");
		description.className = "harmony-type-card__description";
		description.textContent = "全候補から選択";

		// アイコン
		const icon = document.createElement("div");
		icon.className = "harmony-type-card__icon";
		icon.innerHTML = "→";
		icon.style.fontSize = "2rem";
		icon.style.textAlign = "center";
		icon.style.margin = "1rem 0";

		// 要素を組み立て
		this.cardElement.appendChild(title);
		this.cardElement.appendChild(description);
		this.cardElement.appendChild(icon);

		// クリックイベント
		this.cardElement.addEventListener("click", () => {
			this.onClick();
		});

		this.container.appendChild(this.cardElement);
	}

	/**
	 * コンポーネントを破棄
	 */
	destroy(): void {
		if (this.cardElement) {
			this.cardElement.remove();
			this.cardElement = null;
		}
	}
}

/**
 * ハーモニータイプカードグリッドを作成
 *
 * @param container コンテナ要素
 * @param onCardClick カードクリック時のコールバック
 * @param onDetailClick 詳細選択クリック時のコールバック
 * @returns カードインスタンスの配列
 */
export function createHarmonyTypeCardGrid(
	container: HTMLElement,
	onCardClick: (type: HarmonyFilterType) => void,
	onDetailClick: () => void,
): { cards: HarmonyTypeCard[]; detailCard: DetailSelectCard } {
	// グリッドコンテナを作成
	const grid = document.createElement("div");
	grid.className = "harmony-type-cards";
	container.appendChild(grid);

	// ハーモニータイプカードを作成
	const cards: HarmonyTypeCard[] = [];
	for (const config of HARMONY_TYPE_CARD_CONFIGS) {
		const card = new HarmonyTypeCard(grid, config, onCardClick);
		cards.push(card);
	}

	// 詳細選択カードを作成
	const detailCard = new DetailSelectCard(grid, onDetailClick);

	return { cards, detailCard };
}

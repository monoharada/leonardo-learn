/**
 * HarmonyFilterUI
 * ハーモニータイプ選択ドロップダウンUI
 *
 * Task 4.4: HarmonyFilter UI の実装
 * Requirements: 3.1, 2.3
 *
 * ハーモニータイプ選択:
 * - all（すべて）
 * - complementary（補色）
 * - triadic（トライアド）
 * - analogous（類似色）
 * - split-complementary（分裂補色）
 */

import type { HarmonyFilterType } from "../../core/accent/harmony-filter-calculator";

/**
 * ハーモニータイプオプション
 */
export interface HarmonyTypeOption {
	/** タイプID */
	id: HarmonyFilterType;
	/** 日本語名 */
	nameJa: string;
	/** 英語名 */
	nameEn: string;
}

/**
 * フィルタ変更時のコールバック型
 */
export type HarmonyFilterChangeCallback = (type: HarmonyFilterType) => void;

/**
 * ハーモニータイプオプション定義
 */
const HARMONY_TYPE_OPTIONS: readonly HarmonyTypeOption[] = [
	{ id: "all", nameJa: "すべて", nameEn: "All" },
	{ id: "complementary", nameJa: "補色", nameEn: "Complementary" },
	{ id: "triadic", nameJa: "トライアド", nameEn: "Triadic" },
	{ id: "analogous", nameJa: "類似色", nameEn: "Analogous" },
	{
		id: "split-complementary",
		nameJa: "分裂補色",
		nameEn: "Split Complementary",
	},
] as const;

/**
 * HarmonyFilterUI クラス
 * ハーモニータイプ選択ドロップダウンコンポーネント
 */
export class HarmonyFilterUI {
	private container: HTMLElement;
	private selectedType: HarmonyFilterType = "all";
	private changeCallback: HarmonyFilterChangeCallback | null = null;

	constructor(container: HTMLElement) {
		this.container = container;
	}

	/**
	 * 現在選択されているハーモニータイプを取得
	 */
	getSelectedType(): HarmonyFilterType {
		return this.selectedType;
	}

	/**
	 * ハーモニータイプを設定
	 *
	 * @param type 新しいハーモニータイプ
	 */
	setSelectedType(type: HarmonyFilterType): void {
		this.selectedType = type;
		this.notifyChange();
		this.render();
	}

	/**
	 * フィルタ変更時のコールバックを登録
	 *
	 * @param callback 変更時に呼ばれるコールバック
	 */
	onFilterChange(callback: HarmonyFilterChangeCallback): void {
		this.changeCallback = callback;
	}

	/**
	 * ハーモニータイプオプション一覧を取得
	 */
	getHarmonyTypeOptions(): readonly HarmonyTypeOption[] {
		return HARMONY_TYPE_OPTIONS;
	}

	/**
	 * 変更を通知
	 */
	private notifyChange(): void {
		if (this.changeCallback) {
			this.changeCallback(this.selectedType);
		}
	}

	/**
	 * UIをレンダリング
	 *
	 * NOTE: DOM環境がない場合（テストなど）は何もしない
	 */
	render(): void {
		// DOM環境がない場合は何もしない（テスト環境対応）
		if (typeof document === "undefined") {
			return;
		}

		// フィルタ要素を取得または作成
		let filterElement = this.container.querySelector(".harmony-filter");
		if (!filterElement) {
			filterElement = document.createElement("div");
			filterElement.className = "harmony-filter";
			this.container.appendChild(filterElement);
		}

		// 内容をクリア
		filterElement.innerHTML = "";

		// ラベル
		const label = document.createElement("label");
		label.className = "harmony-filter__label";
		label.textContent = "ハーモニータイプ";
		label.htmlFor = "harmony-filter-select";
		filterElement.appendChild(label);

		// セレクトボックス
		const select = document.createElement("select");
		select.className = "harmony-filter__select";
		select.id = "harmony-filter-select";
		select.setAttribute("aria-label", "ハーモニータイプを選択");

		for (const option of HARMONY_TYPE_OPTIONS) {
			const optionElement = document.createElement("option");
			optionElement.value = option.id;
			optionElement.textContent = option.nameJa;
			optionElement.selected = option.id === this.selectedType;
			select.appendChild(optionElement);
		}

		// 変更イベント
		select.addEventListener("change", (e) => {
			const target = e.target as HTMLSelectElement;
			this.setSelectedType(target.value as HarmonyFilterType);
		});

		filterElement.appendChild(select);
	}
}

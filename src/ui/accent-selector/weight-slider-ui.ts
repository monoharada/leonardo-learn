/**
 * WeightSliderUI
 * 重み調整スライダーUI
 *
 * Task 4.4: WeightSlider UI の実装
 * Requirements: 2.3
 *
 * 3つのスライダーで重み調整:
 * - ハーモニー（デフォルト: 40）
 * - CUD（デフォルト: 30）
 * - コントラスト（デフォルト: 30）
 *
 * 合計は常に100になるように自動正規化
 */

/**
 * スコア重み
 */
export interface ScoreWeights {
	/** ハーモニー重み（0-100） */
	harmony: number;
	/** CUD重み（0-100） */
	cud: number;
	/** コントラスト重み（0-100） */
	contrast: number;
}

/**
 * 重みラベル定義
 */
export interface WeightLabel {
	/** 日本語名 */
	nameJa: string;
	/** 英語名 */
	nameEn: string;
}

/**
 * 重みラベル一覧
 */
export interface WeightLabels {
	harmony: WeightLabel;
	cud: WeightLabel;
	contrast: WeightLabel;
}

/**
 * 重み変更時のコールバック型
 */
export type WeightsChangeCallback = (weights: ScoreWeights) => void;

/**
 * デフォルト重み（合計100）
 */
const DEFAULT_WEIGHTS: Readonly<ScoreWeights> = {
	harmony: 40,
	cud: 30,
	contrast: 30,
} as const;

/**
 * 重みラベル定義
 */
const WEIGHT_LABELS: Readonly<WeightLabels> = {
	harmony: { nameJa: "ハーモニー", nameEn: "Harmony" },
	cud: { nameJa: "CUD", nameEn: "CUD" },
	contrast: { nameJa: "コントラスト", nameEn: "Contrast" },
} as const;

/**
 * 重みを正規化（合計100に）
 *
 * @param weights 入力重み
 * @returns 正規化済み重み
 */
function normalizeWeights(weights: ScoreWeights): ScoreWeights {
	const total = weights.harmony + weights.cud + weights.contrast;

	// 合計が0の場合はデフォルト値を返す
	if (total === 0) {
		return { ...DEFAULT_WEIGHTS };
	}

	// 合計が100の場合はそのまま返す
	if (total === 100) {
		return { ...weights };
	}

	// 比率を維持しながら正規化
	const factor = 100 / total;
	const normalized = {
		harmony: Math.round(weights.harmony * factor),
		cud: Math.round(weights.cud * factor),
		contrast: Math.round(weights.contrast * factor),
	};

	// 丸め誤差の調整（合計が100になるように）
	const newTotal = normalized.harmony + normalized.cud + normalized.contrast;
	if (newTotal !== 100) {
		// 最大の値に差分を加算
		const diff = 100 - newTotal;
		if (
			normalized.harmony >= normalized.cud &&
			normalized.harmony >= normalized.contrast
		) {
			normalized.harmony += diff;
		} else if (normalized.cud >= normalized.contrast) {
			normalized.cud += diff;
		} else {
			normalized.contrast += diff;
		}
	}

	return normalized;
}

/**
 * 値をクランプ
 *
 * @param value 入力値
 * @param min 最小値
 * @param max 最大値
 * @returns クランプされた値
 */
function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * WeightSliderUI クラス
 * 重み調整スライダーコンポーネント
 */
export class WeightSliderUI {
	private container: HTMLElement;
	private weights: ScoreWeights;
	private changeCallback: WeightsChangeCallback | null = null;

	constructor(container: HTMLElement) {
		this.container = container;
		this.weights = { ...DEFAULT_WEIGHTS };
	}

	/**
	 * 現在の重みを取得
	 */
	getWeights(): ScoreWeights {
		return { ...this.weights };
	}

	/**
	 * 重みを設定（自動正規化）
	 *
	 * @param weights 新しい重み
	 */
	setWeights(weights: ScoreWeights): void {
		this.weights = normalizeWeights(weights);
		this.notifyChange();
		this.render();
	}

	/**
	 * ハーモニー重みを設定（他の重みは自動調整）
	 *
	 * @param value 新しいハーモニー重み（0-100）
	 */
	setHarmonyWeight(value: number): void {
		const clamped = clamp(value, 0, 100);
		const remaining = 100 - clamped;
		const currentOthers = this.weights.cud + this.weights.contrast;

		if (currentOthers === 0) {
			// 他の重みが0の場合は均等分配
			this.weights = {
				harmony: clamped,
				cud: remaining / 2,
				contrast: remaining / 2,
			};
		} else {
			// 比率を維持しながら調整
			const factor = remaining / currentOthers;
			this.weights = {
				harmony: clamped,
				cud: Math.round(this.weights.cud * factor),
				contrast: Math.round(this.weights.contrast * factor),
			};
			// 丸め誤差調整
			this.weights = normalizeWeights(this.weights);
		}

		this.notifyChange();
		this.render();
	}

	/**
	 * CUD重みを設定（他の重みは自動調整）
	 *
	 * @param value 新しいCUD重み（0-100）
	 */
	setCudWeight(value: number): void {
		const clamped = clamp(value, 0, 100);
		const remaining = 100 - clamped;
		const currentOthers = this.weights.harmony + this.weights.contrast;

		if (currentOthers === 0) {
			this.weights = {
				harmony: remaining / 2,
				cud: clamped,
				contrast: remaining / 2,
			};
		} else {
			const factor = remaining / currentOthers;
			this.weights = {
				harmony: Math.round(this.weights.harmony * factor),
				cud: clamped,
				contrast: Math.round(this.weights.contrast * factor),
			};
			this.weights = normalizeWeights(this.weights);
		}

		this.notifyChange();
		this.render();
	}

	/**
	 * コントラスト重みを設定（他の重みは自動調整）
	 *
	 * @param value 新しいコントラスト重み（0-100）
	 */
	setContrastWeight(value: number): void {
		const clamped = clamp(value, 0, 100);
		const remaining = 100 - clamped;
		const currentOthers = this.weights.harmony + this.weights.cud;

		if (currentOthers === 0) {
			this.weights = {
				harmony: remaining / 2,
				cud: remaining / 2,
				contrast: clamped,
			};
		} else {
			const factor = remaining / currentOthers;
			this.weights = {
				harmony: Math.round(this.weights.harmony * factor),
				cud: Math.round(this.weights.cud * factor),
				contrast: clamped,
			};
			this.weights = normalizeWeights(this.weights);
		}

		this.notifyChange();
		this.render();
	}

	/**
	 * 重み変更時のコールバックを登録
	 *
	 * @param callback 変更時に呼ばれるコールバック
	 */
	onWeightsChange(callback: WeightsChangeCallback): void {
		this.changeCallback = callback;
	}

	/**
	 * デフォルト重みにリセット
	 */
	resetToDefault(): void {
		this.weights = { ...DEFAULT_WEIGHTS };
		this.notifyChange();
		this.render();
	}

	/**
	 * 重みラベルを取得
	 */
	getWeightLabels(): WeightLabels {
		return { ...WEIGHT_LABELS };
	}

	/**
	 * 変更を通知
	 */
	private notifyChange(): void {
		if (this.changeCallback) {
			this.changeCallback(this.getWeights());
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

		// スライダーコンテナを取得または作成
		let sliderContainer = this.container.querySelector(".weight-sliders");
		if (!sliderContainer) {
			sliderContainer = document.createElement("div");
			sliderContainer.className = "weight-sliders";
			this.container.appendChild(sliderContainer);
		}

		// 内容をクリア
		sliderContainer.innerHTML = "";

		// タイトル
		const title = document.createElement("h4");
		title.className = "weight-sliders__title";
		title.textContent = "スコア重み調整";
		sliderContainer.appendChild(title);

		// 各スライダーを生成
		this.createSlider(
			sliderContainer as HTMLElement,
			"harmony",
			WEIGHT_LABELS.harmony.nameJa,
			this.weights.harmony,
			(value) => this.setHarmonyWeight(value),
		);

		this.createSlider(
			sliderContainer as HTMLElement,
			"cud",
			WEIGHT_LABELS.cud.nameJa,
			this.weights.cud,
			(value) => this.setCudWeight(value),
		);

		this.createSlider(
			sliderContainer as HTMLElement,
			"contrast",
			WEIGHT_LABELS.contrast.nameJa,
			this.weights.contrast,
			(value) => this.setContrastWeight(value),
		);

		// リセットボタン
		const resetButton = document.createElement("button");
		resetButton.className = "weight-sliders__reset";
		resetButton.textContent = "デフォルトに戻す";
		resetButton.type = "button";
		resetButton.addEventListener("click", () => this.resetToDefault());
		sliderContainer.appendChild(resetButton);
	}

	/**
	 * スライダー要素を生成
	 */
	private createSlider(
		container: HTMLElement,
		id: string,
		label: string,
		value: number,
		onChange: (value: number) => void,
	): void {
		const sliderGroup = document.createElement("div");
		sliderGroup.className = "weight-slider";

		// ラベル
		const labelElement = document.createElement("label");
		labelElement.className = "weight-slider__label";
		labelElement.htmlFor = `weight-slider-${id}`;
		labelElement.textContent = label;
		sliderGroup.appendChild(labelElement);

		// スライダー入力
		const input = document.createElement("input");
		input.className = "weight-slider__input";
		input.id = `weight-slider-${id}`;
		input.type = "range";
		input.min = "0";
		input.max = "100";
		input.value = value.toString();
		input.setAttribute("aria-label", `${label}の重み`);

		input.addEventListener("input", (e) => {
			const target = e.target as HTMLInputElement;
			onChange(Number.parseInt(target.value, 10));
		});

		sliderGroup.appendChild(input);

		// 値表示
		const valueDisplay = document.createElement("span");
		valueDisplay.className = "weight-slider__value";
		valueDisplay.textContent = `${value}`;
		sliderGroup.appendChild(valueDisplay);

		container.appendChild(sliderGroup);
	}
}

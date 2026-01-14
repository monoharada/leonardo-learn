/**
 * AccentSelectorPanel
 * アクセント選定パネルの統括コンポーネント
 *
 * Task 4.1: AccentSelectorPanel 基本UIの実装
 * Requirements: 4.1, 7.1
 *
 * パネルの開閉制御、ローディング/エラー状態の管理を担当
 */

import type {
	AccentSelectionError,
	ScoredCandidate,
} from "../../core/accent/accent-candidate-service";
import { generateCandidates } from "../../core/accent/accent-candidate-service";
import type { ScoreWeights } from "../../core/accent/balance-score-calculator";
import {
	clearErrorState,
	getErrorState,
	setErrorState,
} from "../../core/accent/error-state";
import type { HarmonyFilterType } from "../../core/accent/harmony-filter-calculator";
import { filterByHarmonyType } from "../../core/accent/harmony-filter-service";
import { toOklch } from "../../utils/color-space";
import { AccentCandidateGrid } from "./accent-candidate-grid";
import { AccentPaletteIntegration } from "./accent-palette-integration";
import { HarmonyFilterUI } from "./harmony-filter-ui";
import {
	type ScoreWeights as UIScoreWeights,
	WeightSliderUI,
} from "./weight-slider-ui";

export interface AccentSelectorPanelOptions {
	/**
	 * スウォッチ表示用のHEX変換関数
	 * 候補データ（candidate.hex）自体は変更せず、塗りだけ変える。
	 */
	getDisplayHex?: (hex: string) => string;
}

/**
 * パネル状態
 */
export interface AccentSelectorPanelState {
	/** パネル表示状態 */
	isOpen: boolean;
	/** ローディング状態 */
	isLoading: boolean;
	/** エラー状態 */
	error: AccentSelectionError | null;
	/** ブランドカラー（HEX形式） */
	brandColorHex: string | null;
	/** 現在の候補リスト */
	candidates: ScoredCandidate[];
	/** 選択されたハーモニーフィルタ */
	selectedFilter: HarmonyFilterType;
	/** 現在の重み設定 */
	weights: ScoreWeights;
}

/**
 * デフォルト重み（Phase 3: vibrancy追加）
 */
const DEFAULT_WEIGHTS: ScoreWeights = {
	harmony: 30,
	cud: 20,
	contrast: 25,
	vibrancy: 25,
};

/**
 * AccentSelectorPanel クラス
 * アクセント選定パネルの統括コンポーネント
 */
export class AccentSelectorPanel {
	private container: HTMLElement;
	private state: AccentSelectorPanelState;
	private readonly getDisplayHex: (hex: string) => string;

	// 子コンポーネント
	private grid: AccentCandidateGrid | null = null;
	private paletteIntegration: AccentPaletteIntegration;
	private harmonyFilter: HarmonyFilterUI | null = null;
	private weightSlider: WeightSliderUI | null = null;

	// 全候補（フィルタ前）
	private allCandidates: ScoredCandidate[] = [];

	constructor(
		container: HTMLElement,
		options: AccentSelectorPanelOptions = {},
	) {
		this.container = container;
		this.getDisplayHex = options.getDisplayHex ?? ((hex) => hex);
		this.state = {
			isOpen: false,
			isLoading: false,
			error: null,
			brandColorHex: null,
			candidates: [],
			selectedFilter: "all",
			weights: { ...DEFAULT_WEIGHTS },
		};

		// パレット統合は常にインスタンス化
		this.paletteIntegration = new AccentPaletteIntegration();
	}

	/**
	 * パレット統合を取得（選択済みアクセントへのアクセス用）
	 */
	getPaletteIntegration(): AccentPaletteIntegration {
		return this.paletteIntegration;
	}

	/**
	 * 現在の状態を取得
	 */
	getState(): AccentSelectorPanelState {
		return { ...this.state };
	}

	/**
	 * ブランドカラーを設定
	 *
	 * @param hex ブランドカラー（HEX形式）
	 */
	setBrandColor(hex: string): void {
		this.state.brandColorHex = hex;
		// ブランドカラー設定時にエラーをクリア（ローカル＋グローバル）
		if (this.state.error?.code === "BRAND_COLOR_NOT_SET") {
			this.clearError();
		}
	}

	/**
	 * エラーを設定
	 *
	 * @param error エラー情報
	 */
	setError(error: AccentSelectionError): void {
		this.state.error = error;
		// グローバルエラー状態も更新
		setErrorState(error);
	}

	/**
	 * エラーをクリア
	 */
	clearError(): void {
		this.state.error = null;
		clearErrorState();
	}

	/**
	 * ローディング状態を設定（テスト用）
	 */
	setLoading(isLoading: boolean): void {
		this.state.isLoading = isLoading;
	}

	/**
	 * パネルが無効化されているか
	 *
	 * DADS_LOAD_FAILEDまたはBRAND_COLOR_NOT_SETエラー時は無効化
	 */
	isDisabled(): boolean {
		const errorState = getErrorState();
		return (
			errorState.autoSelectionDisabled || errorState.manualSelectionDisabled
		);
	}

	/**
	 * パネルを開く
	 *
	 * ブランドカラー未設定時はエラーを設定して表示
	 * 設定済みの場合は候補を生成
	 */
	async openPanel(): Promise<void> {
		// ブランドカラー未設定チェック
		if (!this.state.brandColorHex) {
			this.setError({
				code: "BRAND_COLOR_NOT_SET",
				message: "ブランドカラーを設定してください",
			});
			// パネルを開いてエラー状態を表示
			this.state.isOpen = true;
			this.render();
			return;
		}

		// ローディング開始
		this.state.isLoading = true;
		this.state.isOpen = true;
		this.render();

		try {
			// 候補を生成
			const result = await generateCandidates(this.state.brandColorHex, {
				weights: this.state.weights,
				limit: 10,
			});

			if (result.ok) {
				// 全候補を保存（フィルタ前）
				this.allCandidates = result.result.candidates;
				this.state.candidates = result.result.candidates;
				// 成功時はエラーをクリア（ローカル＋グローバル）
				this.clearError();
			} else {
				this.setError(result.error);
			}
		} catch (error) {
			this.setError({
				code: "SCORE_CALCULATION_FAILED",
				message:
					error instanceof Error
						? error.message
						: "スコア計算中にエラーが発生しました",
			});
		} finally {
			this.state.isLoading = false;
			this.render();
		}
	}

	/**
	 * パネルを閉じる
	 */
	closePanel(): void {
		this.state.isOpen = false;
		this.render();
	}

	/**
	 * パネルの開閉を切り替える
	 */
	async togglePanel(): Promise<void> {
		if (this.state.isOpen) {
			this.closePanel();
		} else {
			await this.openPanel();
		}
	}

	/**
	 * パネルをレンダリング
	 *
	 * NOTE: DOM環境がない場合（テストなど）は何もしない
	 */
	render(): void {
		// DOM環境がない場合は何もしない（テスト環境対応）
		if (typeof document === "undefined") {
			return;
		}

		// パネル要素を取得または作成
		let panelElement = this.container.querySelector(".accent-selector-panel");
		if (!panelElement) {
			panelElement = document.createElement("div");
			panelElement.className = "accent-selector-panel";
			this.container.appendChild(panelElement);
		}

		// 開閉状態を設定
		panelElement.setAttribute("data-open", String(this.state.isOpen));

		// 内容をクリア
		panelElement.replaceChildren();

		// ヘッダー
		const header = document.createElement("div");
		header.className = "accent-selector-panel__header";
		header.innerHTML = `
			<h3>アクセントカラー選定</h3>
			<button class="accent-selector-panel__close" aria-label="閉じる">×</button>
		`;

		// 閉じるボタンのイベント
		const closeButton = header.querySelector(".accent-selector-panel__close");
		if (closeButton) {
			closeButton.addEventListener("click", () => this.closePanel());
		}

		panelElement.appendChild(header);

		// エラー表示
		if (this.state.error) {
			const errorElement = document.createElement("div");
			errorElement.className = "accent-selector-panel__error";
			errorElement.setAttribute("role", "alert");
			errorElement.textContent = this.state.error.message;
			panelElement.appendChild(errorElement);
			return;
		}

		// ローディング表示
		if (this.state.isLoading) {
			const loadingElement = document.createElement("div");
			loadingElement.className = "accent-selector-panel__loading";
			loadingElement.innerHTML = `
				<span class="accent-selector-panel__loading-spinner"></span>
				<span>候補を生成中...</span>
			`;
			panelElement.appendChild(loadingElement);
			return;
		}

		// コンテンツエリア
		const content = document.createElement("div");
		content.className = "accent-selector-panel__content";

		// コントロールエリア（フィルタ＋スライダー）
		const controlsArea = document.createElement("div");
		controlsArea.className = "accent-selector-panel__controls";

		// ハーモニーフィルタ
		const filterContainer = document.createElement("div");
		filterContainer.className = "accent-selector-panel__filter";
		controlsArea.appendChild(filterContainer);
		this.harmonyFilter = new HarmonyFilterUI(filterContainer);
		this.harmonyFilter.setSelectedType(this.state.selectedFilter);
		this.harmonyFilter.onFilterChange((type) => {
			this.handleFilterChange(type);
		});
		this.harmonyFilter.render();

		// 重みスライダー
		const sliderContainer = document.createElement("div");
		sliderContainer.className = "accent-selector-panel__sliders";
		controlsArea.appendChild(sliderContainer);
		this.weightSlider = new WeightSliderUI(sliderContainer);
		// UIスライダーには3つの調整可能重みのみを渡す（vibrancyは内部用）
		const { harmony, cud, contrast } = this.state.weights;
		this.weightSlider.setWeights({ harmony, cud, contrast });
		this.weightSlider.onWeightsChange((weights) => {
			this.handleWeightsChange(weights);
		});
		this.weightSlider.render();

		content.appendChild(controlsArea);

		// 候補グリッド
		const gridContainer = document.createElement("div");
		gridContainer.className = "accent-selector-panel__grid";
		content.appendChild(gridContainer);
		this.grid = new AccentCandidateGrid(gridContainer, {
			getDisplayHex: this.getDisplayHex,
		});
		this.grid.setCandidates(this.state.candidates);
		this.grid.onSelectCandidate((candidate) => {
			this.handleCandidateSelect(candidate);
		});
		this.grid.render();

		panelElement.appendChild(content);
	}

	/**
	 * フィルタ変更ハンドラ
	 */
	private handleFilterChange(type: HarmonyFilterType): void {
		this.state.selectedFilter = type;

		// ブランドカラーの色相を取得
		if (!this.state.brandColorHex) {
			return;
		}

		const oklch = toOklch(this.state.brandColorHex);
		const brandHue = oklch?.h ?? 0;

		// フィルタを適用
		const filterResult = filterByHarmonyType(
			this.allCandidates,
			type,
			brandHue,
		);

		// 候補を更新
		if (filterResult.isShowingAlternatives) {
			this.state.candidates = filterResult.alternatives;
		} else {
			this.state.candidates = filterResult.candidates;
		}

		// グリッドを更新
		if (this.grid) {
			this.grid.setCandidates(this.state.candidates);
		}
	}

	/**
	 * 重み変更ハンドラ
	 * UIから受け取る3つの重みに、内部用vibrancy重みを追加
	 */
	private async handleWeightsChange(uiWeights: UIScoreWeights): Promise<void> {
		// UIの3重み + 内部vibrancy = 4重み
		this.state.weights = {
			...uiWeights,
			vibrancy: DEFAULT_WEIGHTS.vibrancy,
		};

		// ブランドカラーがあれば再計算
		if (this.state.brandColorHex && this.state.isOpen) {
			try {
				const result = await generateCandidates(this.state.brandColorHex, {
					weights: this.state.weights,
					limit: 10,
				});

				if (result.ok) {
					this.allCandidates = result.result.candidates;

					// 現在のフィルタを適用
					const oklch = toOklch(this.state.brandColorHex);
					const brandHue = oklch?.h ?? 0;
					const filterResult = filterByHarmonyType(
						this.allCandidates,
						this.state.selectedFilter,
						brandHue,
					);

					if (filterResult.isShowingAlternatives) {
						this.state.candidates = filterResult.alternatives;
					} else {
						this.state.candidates = filterResult.candidates;
					}

					// グリッドを更新
					if (this.grid) {
						this.grid.setCandidates(this.state.candidates);
					}
				}
			} catch {
				// エラーはサイレントに処理（既存の候補を維持）
			}
		}
	}

	/**
	 * 候補選択ハンドラ
	 */
	private handleCandidateSelect(candidate: ScoredCandidate): void {
		this.paletteIntegration.selectCandidate(candidate);
	}
}

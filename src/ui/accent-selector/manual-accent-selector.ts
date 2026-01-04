/**
 * ManualAccentSelector
 * DADSシェード一覧からの手動アクセント選択
 *
 * Task 5.1: ManualAccentSelector の実装
 * Requirements: 5.1, 5.2, 5.3, 7.2
 *
 * - 手動選択パネルの開閉制御
 * - カテゴリタブ表示（Chromatic/Neutral/Semantic の3種）
 * - Chromaticカテゴリでの色相タブ表示
 * - Neutral/Semanticカテゴリでのトークン一覧表示
 * - トークン選択時のプレビューとスコア自動計算（エラー時はスコア非表示）
 * - 選択したトークンの追加機能
 */

import type { ScoredCandidate } from "../../core/accent/accent-candidate-service";
import { calculateSingleScore } from "../../core/accent/accent-candidate-service";
import type {
	BalanceScoreResult,
	ScoreWeights,
} from "../../core/accent/balance-score-calculator";
import {
	getHueOrder,
	loadDadsTokens,
} from "../../core/tokens/dads-data-provider";
import type {
	DadsColorCategory,
	DadsColorHue,
	DadsToken,
} from "../../core/tokens/types";
import {
	createLowScoreWarningMessage,
	isLowScoreCandidate,
} from "./low-score-warning";

/**
 * DADSトークンカテゴリ（手動選択用）
 * chromatic, neutral, semantic の3種をサポート
 */
export type DadsTokenCategory = DadsColorCategory;

/**
 * カテゴリ別トークングループ
 */
export interface CategorizedTokens {
	chromatic: DadsToken[];
	neutral: DadsToken[];
	semantic: DadsToken[];
}

/**
 * DADSトークンをカテゴリ別にグループ化
 * ★ 手動選択では全カテゴリを対象とする（Requirement 5.2）
 */
export function groupTokensByCategory(
	allTokens: DadsToken[],
): CategorizedTokens {
	return {
		chromatic: allTokens.filter(
			(t) => t.classification.category === "chromatic",
		),
		neutral: allTokens.filter((t) => t.classification.category === "neutral"),
		semantic: allTokens.filter((t) => t.classification.category === "semantic"),
	};
}

/**
 * 手動選択パネルの状態
 */
export interface ManualSelectorState {
	/** パネル表示状態 */
	isOpen: boolean;
	/** DADSトークン一覧（全カテゴリ、キャッシュ） */
	allDadsTokens: DadsToken[];
	/** カテゴリ別トークン */
	categorizedTokens: CategorizedTokens | null;
	/** 選択中のカテゴリ */
	selectedCategory: DadsTokenCategory;
	/** 選択中の色相（chromaticカテゴリのみ有効） */
	selectedHue: DadsColorHue | null;
	/** 選択中のトークン */
	selectedToken: DadsToken | null;
	/** 計算済みスコア */
	calculatedScore: BalanceScoreResult | null;
	/** ローディング状態 */
	isLoading: boolean;
	/** ブランドカラー（HEX形式） */
	brandColorHex: string | null;
	/** 背景色（HEX形式） */
	backgroundHex: string;
	/** 自動選定が無効化されているか（エラー時） */
	autoSelectionDisabled: boolean;
	/** スコア計算用重み設定 */
	weights: Partial<ScoreWeights>;
	/** 低スコア警告メッセージ（警告中の場合） */
	lowScoreWarningMessage: string | null;
}

/**
 * アクセント追加時のコールバック型
 */
export type AddAccentCallback = (
	token: DadsToken,
	score: BalanceScoreResult | null,
) => void;

/**
 * 初期状態
 */
const INITIAL_STATE: ManualSelectorState = {
	isOpen: false,
	allDadsTokens: [],
	categorizedTokens: null,
	selectedCategory: "chromatic",
	selectedHue: null,
	selectedToken: null,
	calculatedScore: null,
	isLoading: false,
	brandColorHex: null,
	backgroundHex: "#FFFFFF",
	autoSelectionDisabled: false,
	weights: {},
	lowScoreWarningMessage: null,
};

/**
 * ManualAccentSelector クラス
 * DADSシェード一覧からの手動アクセント選択コンポーネント
 */
export class ManualAccentSelector {
	private container: HTMLElement;
	private state: ManualSelectorState;
	private addAccentCallback: AddAccentCallback | null = null;

	constructor(container: HTMLElement) {
		this.container = container;
		this.state = { ...INITIAL_STATE };
	}

	/**
	 * 現在の状態を取得
	 */
	getState(): ManualSelectorState {
		return { ...this.state };
	}

	/**
	 * パネルの開閉状態を設定
	 * パネルを開く際にDADSトークンを自動読み込み（Requirement 5.2）
	 */
	async setIsOpen(isOpen: boolean): Promise<void> {
		this.state.isOpen = isOpen;

		// パネルを開く際にトークンを読み込み
		if (isOpen && !this.state.categorizedTokens) {
			await this.loadTokens();
		}

		this.render();
	}

	/**
	 * DADSトークンを読み込み（Requirement 5.2）
	 * 全カテゴリ（chromatic/neutral/semantic）を対象
	 */
	async loadTokens(): Promise<void> {
		if (this.state.isLoading) {
			return;
		}

		this.state.isLoading = true;
		this.render();

		try {
			const tokens = await loadDadsTokens();
			this.state.allDadsTokens = tokens;
			this.state.categorizedTokens = groupTokensByCategory(tokens);
		} catch {
			// エラー時は空のまま（手動選択は許可）
			this.state.categorizedTokens = {
				chromatic: [],
				neutral: [],
				semantic: [],
			};
		} finally {
			this.state.isLoading = false;
			this.render();
		}
	}

	/**
	 * ブランドカラーを設定
	 */
	setBrandColor(hex: string): void {
		this.state.brandColorHex = hex;
		// 既に選択済みのトークンがあればスコアを再計算
		if (this.state.selectedToken && !this.state.autoSelectionDisabled) {
			this.calculateScoreForSelectedToken();
		}
	}

	/**
	 * 背景色を設定
	 */
	setBackgroundColor(hex: string): void {
		this.state.backgroundHex = hex;
		// 既に選択済みのトークンがあればスコアを再計算
		if (this.state.selectedToken && !this.state.autoSelectionDisabled) {
			this.calculateScoreForSelectedToken();
		}
	}

	/**
	 * 重み設定を更新
	 * Requirement 5.3: 手動追加色のスコア計算で重みを使用
	 */
	setWeights(weights: Partial<ScoreWeights>): void {
		this.state.weights = weights;
		// 既に選択済みのトークンがあればスコアを再計算
		if (this.state.selectedToken && !this.state.autoSelectionDisabled) {
			this.calculateScoreForSelectedToken();
		}
	}

	/**
	 * 自動選定無効化フラグを設定
	 * Requirement 7.2: エラー時はスコア非表示で色選択のみ許可
	 */
	setAutoSelectionDisabled(disabled: boolean): void {
		this.state.autoSelectionDisabled = disabled;
		if (disabled) {
			// スコアをクリア
			this.state.calculatedScore = null;
		}
	}

	/**
	 * トークンをテスト用に設定
	 */
	setTokensForTesting(tokens: DadsToken[]): void {
		this.state.allDadsTokens = tokens;
		this.state.categorizedTokens = groupTokensByCategory(tokens);
	}

	/**
	 * カテゴリを選択
	 */
	selectCategory(category: DadsTokenCategory): void {
		this.state.selectedCategory = category;
		// chromatic以外ではhueをクリア
		if (category !== "chromatic") {
			this.state.selectedHue = null;
		}
		// トークン選択をクリア
		this.state.selectedToken = null;
		this.state.calculatedScore = null;
		this.render();
	}

	/**
	 * 色相を選択（chromaticカテゴリのみ）
	 */
	selectHue(hue: DadsColorHue): void {
		if (this.state.selectedCategory === "chromatic") {
			this.state.selectedHue = hue;
			// トークン選択をクリア
			this.state.selectedToken = null;
			this.state.calculatedScore = null;
			this.render();
		}
	}

	/**
	 * トークンを選択
	 */
	selectToken(token: DadsToken): void {
		this.state.selectedToken = token;

		// ブランドカラーがあり、自動選定が有効ならスコアを計算
		if (this.state.brandColorHex && !this.state.autoSelectionDisabled) {
			this.calculateScoreForSelectedToken();
		} else {
			this.state.calculatedScore = null;
		}
		this.render();
	}

	/**
	 * 選択中トークンのスコアを計算
	 * Requirement 5.3: 手動追加色のスコア計算（重みを反映）
	 */
	private calculateScoreForSelectedToken(): void {
		if (!this.state.selectedToken || !this.state.brandColorHex) {
			this.state.calculatedScore = null;
			return;
		}

		try {
			// calculateSingleScoreを使用（重みを含む設計に準拠）
			const score = calculateSingleScore(
				this.state.selectedToken.hex,
				this.state.brandColorHex,
				this.state.backgroundHex,
				this.state.weights,
			);
			this.state.calculatedScore = score;
		} catch {
			// スコア計算エラー時はnull
			this.state.calculatedScore = null;
		}
	}

	/**
	 * 現在のカテゴリのトークンを取得
	 */
	getCurrentCategoryTokens(): DadsToken[] {
		if (!this.state.categorizedTokens) {
			return [];
		}

		const categoryTokens =
			this.state.categorizedTokens[this.state.selectedCategory];

		// chromaticカテゴリで色相が選択されている場合はフィルタ
		if (this.state.selectedCategory === "chromatic" && this.state.selectedHue) {
			return categoryTokens.filter(
				(t) => t.classification.hue === this.state.selectedHue,
			);
		}

		return categoryTokens;
	}

	/**
	 * 利用可能な色相のリストを取得（chromaticカテゴリ用）
	 */
	getAvailableHues(): DadsColorHue[] {
		if (!this.state.categorizedTokens) {
			return [];
		}

		const chromaticTokens = this.state.categorizedTokens.chromatic;
		const hues = new Set<DadsColorHue>();

		for (const token of chromaticTokens) {
			if (token.classification.hue) {
				hues.add(token.classification.hue);
			}
		}

		// 定義順にソート
		const hueOrder = getHueOrder();
		return hueOrder.filter((hue) => hues.has(hue));
	}

	/**
	 * アクセント追加時のコールバックを登録
	 */
	onAddAccent(callback: AddAccentCallback): void {
		this.addAccentCallback = callback;
	}

	/**
	 * 選択したアクセントを追加
	 * Requirement 5.4: 低スコア警告の判定と表示
	 *
	 * 設計書に従い「警告を表示しつつ追加を許可」する:
	 * - 低スコア（50未満）の場合は警告メッセージを表示
	 * - 追加操作自体は許可する（ブロックしない）
	 */
	addSelectedAccent(): void {
		if (!this.state.selectedToken) {
			return;
		}

		// 低スコア警告の判定（Requirement 5.4）
		if (this.state.calculatedScore && !this.state.autoSelectionDisabled) {
			// ScoredCandidate互換のオブジェクトを作成
			const mockCandidate: ScoredCandidate = {
				tokenId: this.state.selectedToken.id,
				hex: this.state.selectedToken.hex,
				nameJa: this.state.selectedToken.nameJa,
				nameEn: this.state.selectedToken.nameEn,
				dadsSourceName: `${this.state.selectedToken.classification.hue ?? "Unknown"} ${this.state.selectedToken.classification.scale ?? 500}`,
				step: this.state.selectedToken.classification.scale ?? 500,
				hue: 0,
				score: this.state.calculatedScore,
			};

			if (isLowScoreCandidate(mockCandidate)) {
				// 警告メッセージを設定（追加は許可）
				this.state.lowScoreWarningMessage = createLowScoreWarningMessage(
					this.state.calculatedScore.total,
				);
			} else {
				this.state.lowScoreWarningMessage = null;
			}
		}

		// コールバックを呼び出し（警告有無に関係なく追加を許可）
		if (this.addAccentCallback) {
			this.addAccentCallback(
				this.state.selectedToken,
				this.state.calculatedScore,
			);
		}

		// 選択をクリア
		this.state.selectedToken = null;
		this.state.calculatedScore = null;
		// 警告メッセージは追加完了後にクリア（UIで表示後）
		this.render();

		// 少し遅延して警告メッセージをクリア
		if (this.state.lowScoreWarningMessage) {
			setTimeout(() => {
				this.state.lowScoreWarningMessage = null;
				this.render();
			}, 3000);
		}
	}

	/**
	 * 現在の低スコア警告メッセージを取得
	 */
	getLowScoreWarningMessage(): string | null {
		return this.state.lowScoreWarningMessage;
	}

	/**
	 * レンダリング
	 */
	render(): void {
		// DOM環境がない場合は何もしない（テスト環境対応）
		if (typeof document === "undefined") {
			return;
		}

		// パネル要素を取得または作成
		let panelElement = this.container.querySelector(".manual-accent-selector");
		if (!panelElement) {
			panelElement = document.createElement("div");
			panelElement.className = "manual-accent-selector";
			this.container.appendChild(panelElement);
		}

		// 開閉状態を設定
		panelElement.setAttribute("data-open", String(this.state.isOpen));

		if (!this.state.isOpen) {
			panelElement.innerHTML = "";
			return;
		}

		// 内容をクリア
		panelElement.innerHTML = "";

		// ヘッダー
		const header = this.createHeader();
		panelElement.appendChild(header);

		// カテゴリタブ
		const categoryTabs = this.createCategoryTabs();
		panelElement.appendChild(categoryTabs);

		// Chromaticカテゴリの場合は色相タブを表示
		if (this.state.selectedCategory === "chromatic") {
			const hueTabs = this.createHueTabs();
			panelElement.appendChild(hueTabs);
		}

		// トークングリッド
		const tokenGrid = this.createTokenGrid();
		panelElement.appendChild(tokenGrid);

		// プレビュー＆スコア表示
		if (this.state.selectedToken) {
			const preview = this.createPreview();
			panelElement.appendChild(preview);
		}

		// 追加ボタン
		const addButton = this.createAddButton();
		panelElement.appendChild(addButton);
	}

	/**
	 * ヘッダーを作成
	 */
	private createHeader(): HTMLElement {
		const header = document.createElement("div");
		header.className = "manual-accent-selector__header";
		header.innerHTML = `
			<h4>カスタムアクセント追加</h4>
			<button class="manual-accent-selector__close" aria-label="閉じる">×</button>
		`;

		const closeButton = header.querySelector(".manual-accent-selector__close");
		if (closeButton) {
			closeButton.addEventListener("click", () => this.setIsOpen(false));
		}

		return header;
	}

	/**
	 * カテゴリタブを作成
	 */
	private createCategoryTabs(): HTMLElement {
		const tabsContainer = document.createElement("div");
		tabsContainer.className = "manual-accent-selector__category-tabs";
		tabsContainer.setAttribute("role", "tablist");

		const categories: { id: DadsTokenCategory; label: string }[] = [
			{ id: "chromatic", label: "カラー" },
			{ id: "neutral", label: "グレー" },
			{ id: "semantic", label: "セマンティック" },
		];

		for (const cat of categories) {
			const tab = document.createElement("button");
			tab.className = "manual-accent-selector__category-tab";
			tab.setAttribute("role", "tab");
			tab.setAttribute(
				"aria-selected",
				String(this.state.selectedCategory === cat.id),
			);
			tab.dataset.category = cat.id;
			tab.textContent = cat.label;

			if (this.state.selectedCategory === cat.id) {
				tab.classList.add("manual-accent-selector__category-tab--active");
			}

			tab.addEventListener("click", () => this.selectCategory(cat.id));
			tabsContainer.appendChild(tab);
		}

		return tabsContainer;
	}

	/**
	 * 色相タブを作成（Chromaticカテゴリ用）
	 */
	private createHueTabs(): HTMLElement {
		const tabsContainer = document.createElement("div");
		tabsContainer.className = "manual-accent-selector__hue-tabs";
		tabsContainer.setAttribute("role", "tablist");

		const hues = this.getAvailableHues();

		const hueLabels: Record<DadsColorHue, string> = {
			blue: "青",
			"light-blue": "水色",
			cyan: "シアン",
			green: "緑",
			lime: "ライム",
			yellow: "黄",
			orange: "オレンジ",
			red: "赤",
			magenta: "マゼンタ",
			purple: "紫",
		};

		for (const hue of hues) {
			const tab = document.createElement("button");
			tab.className = "manual-accent-selector__hue-tab";
			tab.setAttribute("role", "tab");
			tab.setAttribute("aria-selected", String(this.state.selectedHue === hue));
			tab.dataset.hue = hue;
			tab.textContent = hueLabels[hue];

			if (this.state.selectedHue === hue) {
				tab.classList.add("manual-accent-selector__hue-tab--active");
			}

			tab.addEventListener("click", () => this.selectHue(hue));
			tabsContainer.appendChild(tab);
		}

		return tabsContainer;
	}

	/**
	 * トークングリッドを作成
	 */
	private createTokenGrid(): HTMLElement {
		const gridContainer = document.createElement("div");
		gridContainer.className = "manual-accent-selector__token-grid";

		const tokens = this.getCurrentCategoryTokens();

		if (tokens.length === 0) {
			const emptyMessage = document.createElement("p");
			emptyMessage.className = "manual-accent-selector__empty";
			emptyMessage.textContent = "トークンがありません";
			gridContainer.appendChild(emptyMessage);
			return gridContainer;
		}

		for (const token of tokens) {
			const card = this.createTokenCard(token);
			gridContainer.appendChild(card);
		}

		return gridContainer;
	}

	/**
	 * トークンカードを作成
	 */
	private createTokenCard(token: DadsToken): HTMLElement {
		const card = document.createElement("div");
		card.className = "manual-accent-selector__token-card";
		card.dataset.tokenId = token.id;

		const isSelected = this.state.selectedToken?.id === token.id;
		if (isSelected) {
			card.classList.add("manual-accent-selector__token-card--selected");
		}

		// カラースウォッチ
		const swatch = document.createElement("div");
		swatch.className = "manual-accent-selector__token-swatch";
		swatch.style.backgroundColor = token.hex;
		card.appendChild(swatch);

		// トークン名
		const name = document.createElement("span");
		name.className = "manual-accent-selector__token-name";
		name.textContent = token.nameJa;
		card.appendChild(name);

		// クリックイベント
		card.addEventListener("click", () => this.selectToken(token));

		// アクセシビリティ
		card.setAttribute("role", "button");
		card.setAttribute("tabindex", "0");
		card.setAttribute("aria-selected", String(isSelected));
		card.setAttribute("aria-label", `${token.nameJa}（${token.hex}）`);

		// キーボードイベント
		card.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				this.selectToken(token);
			}
		});

		return card;
	}

	/**
	 * プレビューを作成
	 */
	private createPreview(): HTMLElement {
		const preview = document.createElement("div");
		preview.className = "manual-accent-selector__preview";

		const token = this.state.selectedToken;
		if (!token) {
			return preview;
		}

		// プレビュースウォッチ
		const swatch = document.createElement("div");
		swatch.className = "manual-accent-selector__preview-swatch";
		swatch.style.backgroundColor = token.hex;
		preview.appendChild(swatch);

		// プレビュー情報
		const info = document.createElement("div");
		info.className = "manual-accent-selector__preview-info";

		const name = document.createElement("span");
		name.className = "manual-accent-selector__preview-name";
		name.textContent = token.nameJa;
		info.appendChild(name);

		const hex = document.createElement("span");
		hex.className = "manual-accent-selector__preview-hex";
		hex.textContent = token.hex;
		info.appendChild(hex);

		// スコア表示（自動選定が有効な場合のみ）
		if (!this.state.autoSelectionDisabled && this.state.calculatedScore) {
			const scoreDisplay = this.createScoreDisplay();
			info.appendChild(scoreDisplay);
		} else if (this.state.autoSelectionDisabled) {
			const noScoreMessage = document.createElement("span");
			noScoreMessage.className = "manual-accent-selector__preview-no-score";
			noScoreMessage.textContent = "スコアを計算できません";
			info.appendChild(noScoreMessage);
		}

		preview.appendChild(info);

		return preview;
	}

	/**
	 * スコア表示を作成
	 */
	private createScoreDisplay(): HTMLElement {
		const scoreContainer = document.createElement("div");
		scoreContainer.className = "manual-accent-selector__score-display";

		const score = this.state.calculatedScore;
		if (!score) {
			return scoreContainer;
		}

		// 総合スコア
		const totalScore = document.createElement("span");
		totalScore.className = "manual-accent-selector__score-total";
		totalScore.textContent = `スコア: ${Math.round(score.total)}`;
		scoreContainer.appendChild(totalScore);

		// スコア内訳
		const breakdown = document.createElement("span");
		breakdown.className = "manual-accent-selector__score-breakdown";
		breakdown.textContent = `ハーモニー: ${Math.round(score.breakdown.harmonyScore)} / CUD: ${Math.round(score.breakdown.cudScore)} / コントラスト: ${Math.round(score.breakdown.contrastScore)}`;
		scoreContainer.appendChild(breakdown);

		return scoreContainer;
	}

	/**
	 * 追加ボタンを作成
	 */
	private createAddButton(): HTMLElement {
		const buttonContainer = document.createElement("div");
		buttonContainer.className = "manual-accent-selector__add-container";

		const addButton = document.createElement("button");
		addButton.className = "manual-accent-selector__add-button";
		addButton.textContent = "アクセントに追加";
		addButton.disabled = !this.state.selectedToken;

		addButton.addEventListener("click", () => this.addSelectedAccent());

		buttonContainer.appendChild(addButton);

		return buttonContainer;
	}
}

/**
 * アクセント選定ビューモジュール
 *
 * Section 8: アクセント選定UI改善
 * - ハーモニータイプカード形式でパレットを選択
 * - カードクリックで3色パレットを生成→パレットビューへ遷移
 * - 「詳細選択」で従来のグリッドUIを表示
 *
 * @module @/ui/demo/views/harmony-view
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import type { ScoredCandidate } from "@/core/accent/accent-candidate-service";
import { generateCandidates } from "@/core/accent/accent-candidate-service";
import type { HarmonyFilterType } from "@/core/accent/harmony-filter-calculator";
import { filterByHarmonyType } from "@/core/accent/harmony-filter-service";
import { getAllHarmonyPalettes } from "@/core/accent/harmony-palette-generator";
import { getRandomDadsColor } from "@/core/tokens/random-color-picker";
import { toOklch } from "@/utils/color-space";
import { AccentCandidateGrid } from "../../accent-selector/accent-candidate-grid";
import { HarmonyFilterUI } from "../../accent-selector/harmony-filter-ui";
import {
	createHarmonyTypeCardGrid,
	type HarmonyTypeCard,
} from "../../accent-selector/harmony-type-card";
import { state } from "../state";
import type { ColorDetailModalOptions } from "../types";

/**
 * アクセント選定ビューのコールバック
 */
export interface AccentSelectionViewCallbacks {
	/** ハーモニーカードクリック時のコールバック（パレット生成） */
	onHarmonyCardClick: (
		harmonyType: HarmonyFilterType,
		paletteColors: string[],
		candidates?: ScoredCandidate[],
	) => void;
	/** 詳細選択でのアクセント選択時のコールバック */
	onAccentSelect: (candidate: ScoredCandidate) => void;
	/** 色クリック時のコールバック（モーダル表示用） */
	onColorClick: (options: ColorDetailModalOptions) => void;
}

/**
 * ビュー内部状態
 */
interface ViewState {
	brandColorHex: string;
	isDetailMode: boolean;
	selectedFilter: HarmonyFilterType;
	allCandidates: ScoredCandidate[];
	filteredCandidates: ScoredCandidate[];
	isLoading: boolean;
	error: string | null;
	/** アクセントカラーの数（2-5、デフォルト2）ブランド+アクセント=3-6色 */
	accentCount: 2 | 3 | 4 | 5;
}

/**
 * @deprecated renderHarmonyView は renderAccentSelectionView に置き換わりました
 * 後方互換性のために維持
 */
export function renderHarmonyView(
	container: HTMLElement,
	keyColorHex: string,
	callbacks: {
		onHarmonySelect?: unknown;
		onColorClick?: (options: ColorDetailModalOptions) => void;
	},
): void {
	renderAccentSelectionView(container, keyColorHex, {
		onHarmonyCardClick: () => {},
		onAccentSelect: () => {},
		onColorClick: callbacks.onColorClick ?? (() => {}),
	});
}

/**
 * アクセント選定ビューをレンダリングする
 *
 * @param container レンダリング先のコンテナ要素
 * @param keyColorHex キーカラーのHEX値
 * @param callbacks コールバック関数
 */
export function renderAccentSelectionView(
	container: HTMLElement,
	keyColorHex: string,
	callbacks: AccentSelectionViewCallbacks,
): void {
	// 入力カラーをパース（無効な場合はデフォルト色）
	const inputHex = /^#[0-9A-Fa-f]{6}$/.test(keyColorHex)
		? keyColorHex
		: "#3366cc";

	// ビュー内部状態
	const viewState: ViewState = {
		brandColorHex: inputHex,
		isDetailMode: false,
		selectedFilter: state.selectedAccentFilter,
		allCandidates: [],
		filteredCandidates: [],
		isLoading: true,
		error: null,
		accentCount: state.accentCount, // グローバル状態から取得
	};

	// コンテナをクリア
	container.replaceChildren();

	// ヘッダーセクション（Brand Color入力）
	const header = createHeader(inputHex, container, callbacks, viewState);
	container.appendChild(header);

	// 説明文
	const description = document.createElement("div");
	description.className = "dads-section__description";
	description.innerHTML = "<p>ハーモニーを選択してパレットを作成します。</p>";
	container.appendChild(description);

	// カードモードの表示
	renderCardMode(container, viewState, callbacks);
}

/**
 * カードモードを表示
 */
function renderCardMode(
	container: HTMLElement,
	viewState: ViewState,
	callbacks: AccentSelectionViewCallbacks,
): void {
	// カードエリア
	const cardArea = document.createElement("div");
	cardArea.className = "harmony-card-area";
	container.appendChild(cardArea);

	// ハーモニーカードグリッドを作成
	const { cards } = createHarmonyTypeCardGrid(
		cardArea,
		// カードクリック時のハンドラ
		async (type: HarmonyFilterType) => {
			// ローディング状態にする
			for (const card of cards) {
				card.setLoading(true);
			}

			// パレット色を取得（accentCountを渡す）
			const result = await getAllHarmonyPalettes(viewState.brandColorHex, {
				accentCount: viewState.accentCount,
			});
			if (result.ok && result.result) {
				const palette = result.result[type as keyof typeof result.result];
				if (palette) {
					// ブランドカラー + 全アクセントカラーを配列で渡す
					// candidates配列も渡す（DADSメタデータ抽出用）
					callbacks.onHarmonyCardClick(
						type,
						[palette.brandColor, ...palette.accentColors],
						palette.candidates,
					);
				}
			}

			// ローディング解除
			for (const card of cards) {
				card.setLoading(false);
			}
		},
		// 詳細選択クリック時のハンドラ
		() => {
			viewState.isDetailMode = true;
			// カードエリアを削除して詳細モードを表示
			cardArea.remove();
			renderDetailMode(container, viewState, callbacks);
		},
	);

	// カードにプレビュー色を設定（accentCountを渡す）
	loadCardPreviews(cards, viewState.brandColorHex, viewState.accentCount);
}

/**
 * カードのプレビュー色を読み込む
 */
async function loadCardPreviews(
	cards: HarmonyTypeCard[],
	brandColorHex: string,
	accentCount: 2 | 3 | 4 | 5 = 2,
): Promise<void> {
	// 全ハーモニータイプのパレットを取得（accentCountを渡す）
	const result = await getAllHarmonyPalettes(brandColorHex, { accentCount });

	if (result.ok && result.result) {
		const harmonyTypes: HarmonyFilterType[] = [
			"complementary",
			"triadic",
			"analogous",
			"split-complementary",
			"monochromatic",
			"shades",
			"compound",
			"square",
		];

		for (let i = 0; i < cards.length && i < harmonyTypes.length; i++) {
			const type = harmonyTypes[i];
			const card = cards[i];
			if (!type || !card) continue;
			const palette = result.result[type as keyof typeof result.result];
			if (palette) {
				// ブランドカラー + 全アクセントカラーを設定
				card.setPreviewColors([palette.brandColor, ...palette.accentColors]);
			}
		}
	}
}

/**
 * 詳細選択モードを表示
 */
function renderDetailMode(
	container: HTMLElement,
	viewState: ViewState,
	callbacks: AccentSelectionViewCallbacks,
): void {
	// 戻るボタン
	const backButton = document.createElement("button");
	backButton.type = "button";
	backButton.className = "dads-button dads-button--secondary";
	backButton.innerHTML = "← カード選択に戻る";
	backButton.addEventListener("click", () => {
		// 詳細モードの要素を削除
		detailArea.remove();
		backButton.remove();
		// カードモードを再表示
		renderCardMode(container, viewState, callbacks);
	});
	container.appendChild(backButton);

	// 詳細エリア
	const detailArea = document.createElement("div");
	detailArea.className = "accent-detail-area";
	container.appendChild(detailArea);

	// コントロールエリア（ハーモニーフィルタ）
	const controlsArea = document.createElement("div");
	controlsArea.className = "accent-selection-controls";

	const filterContainer = document.createElement("div");
	filterContainer.className = "accent-selection-controls__filter";
	controlsArea.appendChild(filterContainer);

	detailArea.appendChild(controlsArea);

	// 候補グリッドエリア
	const gridContainer = document.createElement("div");
	gridContainer.className = "accent-selection-grid";
	detailArea.appendChild(gridContainer);

	// ローディング表示
	const loadingElement = document.createElement("div");
	loadingElement.className = "accent-selection-loading";
	loadingElement.innerHTML = `
		<span class="accent-selection-loading__spinner"></span>
		<span>アクセント候補を生成中...</span>
	`;
	gridContainer.appendChild(loadingElement);

	// HarmonyFilterUI を初期化
	const harmonyFilter = new HarmonyFilterUI(filterContainer);
	harmonyFilter.setSelectedType(viewState.selectedFilter);

	// AccentCandidateGrid を初期化
	const candidateGrid = new AccentCandidateGrid(gridContainer);
	candidateGrid.onSelectCandidate((candidate) => {
		callbacks.onAccentSelect(candidate);
	});

	// フィルタ変更時のハンドラ
	harmonyFilter.onFilterChange((type) => {
		viewState.selectedFilter = type;
		state.selectedAccentFilter = type;
		applyFilter(viewState, candidateGrid, gridContainer);
	});

	// 候補を非同期で生成
	loadCandidates(viewState, candidateGrid, gridContainer);
}

/**
 * ヘッダーセクションを作成する
 */
function createHeader(
	inputHex: string,
	container: HTMLElement,
	callbacks: AccentSelectionViewCallbacks,
	viewState: ViewState,
): HTMLElement {
	const header = document.createElement("div");
	header.className = "dads-harmony-header";

	// Brand Color入力
	const colorInput = document.createElement("div");
	colorInput.className = "dads-harmony-header__input";

	const colorLabel = document.createElement("label");
	colorLabel.className = "dads-label";
	colorLabel.textContent = "Brand Color";
	colorLabel.htmlFor = "harmony-color-input";

	const inputRow = document.createElement("div");
	inputRow.className = "dads-form-row";

	// テキスト入力
	const colorText = document.createElement("input");
	colorText.type = "text";
	colorText.id = "harmony-color-input";
	colorText.className = "dads-input";
	colorText.value = inputHex;
	colorText.placeholder = "#3366cc";
	colorText.pattern = "^#[0-9A-Fa-f]{6}$";

	// カラーピッカー
	const colorPicker = document.createElement("input");
	colorPicker.type = "color";
	colorPicker.id = "harmony-color-picker";
	colorPicker.className = "dads-input dads-input--color";
	colorPicker.value = inputHex;

	// カラー入力の同期とカード更新
	const updateColor = (hex: string, source: "picker" | "text") => {
		if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;

		if (source === "picker") {
			colorText.value = hex;
		} else {
			colorPicker.value = hex;
		}

		// hidden inputも更新
		const keyColorsInput = document.getElementById(
			"keyColors",
		) as HTMLInputElement | null;
		if (keyColorsInput) {
			keyColorsInput.value = hex;
		}

		// ビュー全体を再レンダリング
		renderAccentSelectionView(container, hex, callbacks);
	};

	// カラーピッカーのイベント
	colorPicker.addEventListener("input", (e) => {
		e.stopPropagation();
		const hex = (e.target as HTMLInputElement).value;
		colorText.value = hex;
	});

	colorPicker.addEventListener("change", (e) => {
		e.stopPropagation();
		updateColor((e.target as HTMLInputElement).value, "picker");
	});

	colorPicker.addEventListener("click", (e) => {
		e.stopPropagation();
	});

	colorPicker.addEventListener("mousedown", (e) => {
		e.stopPropagation();
	});

	colorText.addEventListener("input", (e) => {
		const value = (e.target as HTMLInputElement).value;
		if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
			updateColor(value, "text");
		}
	});

	// ランダム選択ボタン
	const randomButton = document.createElement("button");
	randomButton.type = "button";
	randomButton.className = "dads-button dads-button--secondary dads-button--random";
	randomButton.innerHTML = "🎲 ランダム";
	randomButton.dataset.testid = "random-color-button";
	randomButton.title = "DADSカラーからランダムに選択";

	randomButton.addEventListener("click", async (e) => {
		e.stopPropagation();
		try {
			// ボタンを無効化してローディング状態にする
			randomButton.disabled = true;
			randomButton.innerHTML = "⏳ 選択中...";

			const randomHex = await getRandomDadsColor();
			updateColor(randomHex, "picker");
		} catch (error) {
			console.error("Failed to get random color:", error);
			alert("ランダムカラーの取得に失敗しました");
		} finally {
			// ボタンを元に戻す
			randomButton.disabled = false;
			randomButton.innerHTML = "🎲 ランダム";
		}
	});

	// 要素の組み立て
	inputRow.appendChild(colorText);
	inputRow.appendChild(colorPicker);
	inputRow.appendChild(randomButton);
	colorInput.appendChild(colorLabel);
	colorInput.appendChild(inputRow);
	header.appendChild(colorInput);

	// アクセントカラー数選択プルダウン
	const accentCountInput = document.createElement("div");
	accentCountInput.className = "dads-harmony-header__accent-count";

	const accentCountLabel = document.createElement("label");
	accentCountLabel.className = "dads-label";
	accentCountLabel.textContent = "パレット色数";
	accentCountLabel.htmlFor = "accent-count-select";

	const accentCountSelect = document.createElement("select");
	accentCountSelect.id = "accent-count-select";
	accentCountSelect.dataset.testid = "accent-count-select";
	accentCountSelect.className = "dads-select";

	// 3〜6色（アクセント2〜5 + ブランド1）
	const options = [
		{ value: 2, label: "3色パレット" },
		{ value: 3, label: "4色パレット" },
		{ value: 4, label: "5色パレット" },
		{ value: 5, label: "6色パレット" },
	];

	for (const opt of options) {
		const option = document.createElement("option");
		option.value = String(opt.value);
		option.textContent = opt.label;
		if (opt.value === viewState.accentCount) {
			option.selected = true;
		}
		accentCountSelect.appendChild(option);
	}

	// プルダウン変更時のハンドラ
	accentCountSelect.addEventListener("change", (e) => {
		const value = Number.parseInt((e.target as HTMLSelectElement).value, 10) as
			| 2
			| 3
			| 4
			| 5;
		state.accentCount = value; // グローバル状態に保存
		viewState.accentCount = value;
		// ビュー全体を再レンダリング
		renderAccentSelectionView(container, viewState.brandColorHex, callbacks);
	});

	accentCountInput.appendChild(accentCountLabel);
	accentCountInput.appendChild(accentCountSelect);
	header.appendChild(accentCountInput);

	return header;
}

/**
 * 候補を非同期で読み込む
 */
async function loadCandidates(
	viewState: ViewState,
	candidateGrid: AccentCandidateGrid,
	gridContainer: HTMLElement,
): Promise<void> {
	try {
		const result = await generateCandidates(viewState.brandColorHex, {
			limit: 130, // 全候補を取得してフィルタリング
		});

		if (result.ok) {
			viewState.allCandidates = result.result.candidates;
			viewState.isLoading = false;
			viewState.error = null;

			// フィルタを適用
			applyFilter(viewState, candidateGrid, gridContainer);
		} else {
			viewState.isLoading = false;
			viewState.error = result.error.message;
			showError(gridContainer, result.error.message);
		}
	} catch (error) {
		viewState.isLoading = false;
		viewState.error =
			error instanceof Error
				? error.message
				: "候補の生成中にエラーが発生しました";
		showError(gridContainer, viewState.error);
	}
}

/**
 * フィルタを適用して候補を更新
 */
function applyFilter(
	viewState: ViewState,
	candidateGrid: AccentCandidateGrid,
	gridContainer: HTMLElement,
): void {
	// ローディング表示をクリア
	const loadingEl = gridContainer.querySelector(".accent-selection-loading");
	if (loadingEl) {
		loadingEl.remove();
	}

	// エラー表示をクリア
	const errorEl = gridContainer.querySelector(".accent-selection-error");
	if (errorEl) {
		errorEl.remove();
	}

	// ブランドカラーの色相を取得
	const oklch = toOklch(viewState.brandColorHex);
	const brandHue = oklch?.h ?? 0;

	// フィルタを適用
	const filterResult = filterByHarmonyType(
		viewState.allCandidates,
		viewState.selectedFilter,
		brandHue,
	);

	// 候補を更新（上位10件を表示）
	if (filterResult.isShowingAlternatives) {
		viewState.filteredCandidates = filterResult.alternatives.slice(0, 10);
	} else {
		viewState.filteredCandidates = filterResult.candidates.slice(0, 10);
	}

	// グリッドを更新
	candidateGrid.setCandidates(viewState.filteredCandidates);
}

/**
 * エラー表示
 */
function showError(container: HTMLElement, message: string): void {
	// ローディング表示をクリア
	const loadingEl = container.querySelector(".accent-selection-loading");
	if (loadingEl) {
		loadingEl.remove();
	}

	// 既存のエラー表示をクリア
	const existingError = container.querySelector(".accent-selection-error");
	if (existingError) {
		existingError.remove();
	}

	const errorElement = document.createElement("div");
	errorElement.className = "accent-selection-error";
	errorElement.setAttribute("role", "alert");
	errorElement.textContent = message;
	container.appendChild(errorElement);
}

// 後方互換性のためのexport
export type { AccentSelectionViewCallbacks as HarmonyViewCallbacks };

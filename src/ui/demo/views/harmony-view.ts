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
import { Color } from "@/core/color";
import { getRandomDadsColor } from "@/core/tokens/random-color-picker";
import { toOklch } from "@/utils/color-space";
import { AccentCandidateGrid } from "../../accent-selector/accent-candidate-grid";
import { HarmonyFilterUI } from "../../accent-selector/harmony-filter-ui";
import {
	createHarmonyTypeCardGrid,
	type HarmonyTypeCard,
} from "../../accent-selector/harmony-type-card";
import { createCoolorsPaletteDisplay } from "../../components/coolors-palette-display";
import { createHarmonySidebar } from "../../components/harmony-sidebar";
import {
	addHistoryEntry,
	clearBrandColorHistory,
	createHistoryEntry,
	formatHistoryTimestamp,
	loadBrandColorHistory,
	persistBrandColorHistory,
} from "../brand-color-history";
import {
	ALL_HARMONY_TYPES,
	createHarmonyStateManager,
	type HarmonyPreviewData,
	type HarmonyStateManager,
} from "../harmony-state-manager";
import { createPalettesFromHarmonyColors } from "../palette-generator";
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
	/** ハーモニー状態管理（セッション記憶対応） */
	harmonyManager: HarmonyStateManager;
	/** Coolorsモードを使用するかどうか */
	useCoolorsMode: boolean;
}

/**
 * セッション内で共有するハーモニー状態マネージャー
 * ビューの再レンダリング間で状態を保持する
 */
let sharedHarmonyManager: HarmonyStateManager | null = null;

/**
 * 共有ハーモニーマネージャーを取得または作成する
 */
function getSharedHarmonyManager(): HarmonyStateManager {
	if (!sharedHarmonyManager) {
		sharedHarmonyManager = createHarmonyStateManager();
	}
	return sharedHarmonyManager;
}

/**
 * グローバルstate.palettesをハーモニープレビュー色から同期する
 *
 * パレットビュー・アクセシビリティビューが読み取る state.palettes を
 * ハーモニービューのプレビュー色から自動的に更新する。
 *
 * @param harmonyType 選択されたハーモニータイプ
 * @param colors プレビュー色配列 [brandColor, accent1, accent2, ...]
 * @param candidates アクセント候補（DADSメタデータ抽出用）
 */
function syncStatePalettes(
	harmonyType: HarmonyFilterType,
	colors: string[],
	candidates?: ScoredCandidate[],
): void {
	state.palettes = createPalettesFromHarmonyColors(
		harmonyType,
		colors,
		candidates,
	);
	if (state.palettes.length > 0 && state.palettes[0]) {
		state.activeId = state.palettes[0].id;
	}
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

	// 共有ハーモニーマネージャーを取得
	const harmonyManager = getSharedHarmonyManager();

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
		harmonyManager,
		useCoolorsMode: true, // デフォルトでCoolorsモードを使用
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

	// Coolorsモードまたは従来のカードモードで表示
	if (viewState.useCoolorsMode) {
		renderCoolorsMode(container, viewState, callbacks);
	} else {
		renderCardMode(container, viewState, callbacks);
	}
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
 * Coolorsスタイルのモードを表示
 * メイン表示 + サイドバーの2カラムレイアウト
 */
function renderCoolorsMode(
	container: HTMLElement,
	viewState: ViewState,
	callbacks: AccentSelectionViewCallbacks,
): void {
	// レイアウトコンテナ
	const layout = document.createElement("div");
	layout.className = "coolors-layout";
	container.appendChild(layout);

	// メインエリア
	const mainArea = document.createElement("div");
	mainArea.className = "coolors-layout__main";
	layout.appendChild(mainArea);

	// サイドバーエリア
	const sidebarArea = document.createElement("div");
	sidebarArea.className = "coolors-layout__sidebar";
	layout.appendChild(sidebarArea);

	// ローディング表示
	const loadingEl = document.createElement("div");
	loadingEl.className = "accent-selection-loading";
	loadingEl.innerHTML = `
		<span class="accent-selection-loading__spinner"></span>
		<span>パレットを生成中...</span>
	`;
	mainArea.appendChild(loadingEl);

	// 全ハーモニープレビューを読み込み、メイン表示を更新
	loadCoolorsPreviews(viewState, mainArea, sidebarArea, callbacks);
}

/**
 * Coolorsモードのプレビューを読み込み、UIを更新する
 */
async function loadCoolorsPreviews(
	viewState: ViewState,
	mainArea: HTMLElement,
	sidebarArea: HTMLElement,
	callbacks: AccentSelectionViewCallbacks,
): Promise<void> {
	const { harmonyManager, brandColorHex, accentCount } = viewState;

	// 全ハーモニータイプのパレットを取得
	const result = await getAllHarmonyPalettes(brandColorHex, { accentCount });

	// ローディング表示を削除
	const loadingEl = mainArea.querySelector(".accent-selection-loading");
	if (loadingEl) loadingEl.remove();

	if (!result.ok || !result.result) {
		showError(mainArea, "パレットの生成に失敗しました");
		return;
	}

	// HarmonyPreviewData を構築
	const previewData: HarmonyPreviewData = {};
	const paletteCandidatesMap = new Map<HarmonyFilterType, ScoredCandidate[]>();

	for (const type of ALL_HARMONY_TYPES) {
		const palette = result.result[type as keyof typeof result.result];
		if (palette) {
			previewData[type] = [palette.brandColor, ...palette.accentColors];
			paletteCandidatesMap.set(type, palette.candidates);
		}
	}

	// プレビューデータをマネージャーに設定
	harmonyManager.setHarmonyPreviews(previewData);

	// ハーモニータイプを取得（ユーザー選択済みならそれ、未選択ならランダム）
	const selectedType = harmonyManager.getOrSelectHarmony();
	const currentColors = harmonyManager.getPreviewColors(selectedType) ?? [];

	// トークン名を生成
	const tokenNames = generateTokenNames(currentColors.length);

	// メイン表示を作成
	const mainDisplay = createCoolorsPaletteDisplay({
		colors: currentColors,
		tokenNames,
		onColorClick: (hex, index) => {
			// カラー詳細モーダルを開く（読み取り専用モード）
			const color = new Color(hex);
			callbacks.onColorClick({
				stepColor: color,
				keyColor: color,
				index: 0,
				fixedScale: {
					colors: [color],
					keyIndex: 0,
					hexValues: [hex],
				},
				paletteInfo: {
					name: tokenNames[index] ?? `Color ${index + 1}`,
				},
				readOnly: true,
				originalHex: hex,
			});
		},
	});
	mainArea.appendChild(mainDisplay);

	// ★ 初回ロード時にグローバル状態を同期
	// パレットビュー・アクセシビリティビューがこのデータを参照する
	syncStatePalettes(
		selectedType,
		currentColors,
		paletteCandidatesMap.get(selectedType),
	);

	// サイドバーを作成
	const sidebar = createHarmonySidebar({
		selectedType,
		previews: harmonyManager.getHarmonyPreviews(),
		onSelect: (type) => {
			// ユーザー選択を記録
			harmonyManager.selectHarmony(type);

			// メイン表示を更新
			const newColors = harmonyManager.getPreviewColors(type) ?? [];
			const newTokenNames = generateTokenNames(newColors.length);

			// 既存のメイン表示を削除して再作成
			mainArea.replaceChildren();
			const newMainDisplay = createCoolorsPaletteDisplay({
				colors: newColors,
				tokenNames: newTokenNames,
				onColorClick: (hex, index) => {
					// カラー詳細モーダルを開く（読み取り専用モード）
					const color = new Color(hex);
					callbacks.onColorClick({
						stepColor: color,
						keyColor: color,
						index: 0,
						fixedScale: {
							colors: [color],
							keyIndex: 0,
							hexValues: [hex],
						},
						paletteInfo: {
							name: newTokenNames[index] ?? `Color ${index + 1}`,
						},
						readOnly: true,
						originalHex: hex,
					});
				},
			});
			mainArea.appendChild(newMainDisplay);

			// ★ サイドバー選択時にグローバル状態を同期
			// パレットビュー・アクセシビリティビューがこのデータを参照する
			syncStatePalettes(type, newColors, paletteCandidatesMap.get(type));

			// サイドバーも更新（選択状態を反映）
			sidebarArea.replaceChildren();
			const newSidebar = createHarmonySidebar({
				selectedType: type,
				previews: harmonyManager.getHarmonyPreviews(),
				onSelect: (t) => {
					// 再帰的に同じ処理を実行（簡易実装）
					harmonyManager.selectHarmony(t);
					// 全体を再レンダリング
					const container =
						sidebarArea.closest(".coolors-layout")?.parentElement;
					if (container) {
						const layoutEl = container.querySelector(".coolors-layout");
						if (layoutEl) layoutEl.remove();
						renderCoolorsMode(container as HTMLElement, viewState, callbacks);
					}
				},
			});
			sidebarArea.appendChild(newSidebar);

			// サイドバー選択ではパレットビューへの遷移を行わない
			// メイン表示の切り替えのみ
		},
	});
	sidebarArea.appendChild(sidebar);
}

/**
 * トークン名を生成する
 */
function generateTokenNames(colorCount: number): string[] {
	const names = ["Brand"];
	for (let i = 1; i < colorCount; i++) {
		names.push(`Accent-${i}`);
	}
	return names;
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
	const updateColor = (
		hex: string,
		source: "picker" | "text" | "history",
		fromHistory = false,
	) => {
		if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;

		if (source === "picker" || source === "history") {
			colorText.value = hex;
		}
		if (source === "text" || source === "history") {
			colorPicker.value = hex;
		}

		// hidden inputも更新
		const keyColorsInput = document.getElementById(
			"keyColors",
		) as HTMLInputElement | null;
		if (keyColorsInput) {
			keyColorsInput.value = hex;
		}

		// 履歴に保存（履歴から復元した場合は除外）
		if (!fromHistory) {
			const currentHistory = loadBrandColorHistory();
			const entry = createHistoryEntry(hex, viewState.accentCount);
			const newHistory = addHistoryEntry(currentHistory, entry);
			persistBrandColorHistory(newHistory);
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
	randomButton.className =
		"dads-button dads-button--secondary dads-button--random";
	randomButton.textContent = "ランダム";
	randomButton.dataset.testid = "random-color-button";
	randomButton.title = "DADSカラーからランダムに選択";

	randomButton.addEventListener("click", async (e) => {
		e.stopPropagation();
		try {
			// ボタンを無効化してローディング状態にする
			randomButton.disabled = true;
			randomButton.textContent = "⏳ 選択中...";

			const randomHex = await getRandomDadsColor();
			updateColor(randomHex, "picker");
		} catch (error) {
			console.error("Failed to get random color:", error);
			alert("ランダムカラーの取得に失敗しました");
		} finally {
			// ボタンを元に戻す
			randomButton.disabled = false;
			randomButton.textContent = "ランダム";
		}
	});

	// 履歴ドロップダウン
	const historyContainer = document.createElement("div");
	historyContainer.className = "dads-history-container";

	const historySelect = document.createElement("select");
	historySelect.id = "brand-color-history-select";
	historySelect.dataset.testid = "brand-color-history-select";
	historySelect.className = "dads-select dads-history-dropdown";
	historySelect.title = "履歴から選択";

	// 履歴ドロップダウンの選択肢を更新する関数
	const updateHistoryOptions = () => {
		const history = loadBrandColorHistory();

		// 既存のオプションをクリア
		historySelect.replaceChildren();

		// プレースホルダーオプション
		const placeholder = document.createElement("option");
		placeholder.value = "";
		placeholder.textContent =
			history.length > 0 ? `履歴 (${history.length})` : "履歴なし";
		placeholder.disabled = true;
		placeholder.selected = true;
		historySelect.appendChild(placeholder);

		// 履歴エントリを追加
		for (const entry of history) {
			const option = document.createElement("option");
			option.value = JSON.stringify({
				hex: entry.brandColorHex,
				accentCount: entry.accentCount,
			});
			option.textContent = `${entry.brandColorHex.toUpperCase()} | ${entry.accentCount + 1}色 | ${formatHistoryTimestamp(entry.timestamp)}`;
			option.style.setProperty("--option-color", entry.brandColorHex);
			historySelect.appendChild(option);
		}

		// 履歴がない場合は非表示
		historySelect.disabled = history.length === 0;
	};

	// 初期化時に履歴を読み込み
	updateHistoryOptions();

	// 履歴選択時のハンドラ
	historySelect.addEventListener("change", (e) => {
		const value = (e.target as HTMLSelectElement).value;
		if (!value) return;

		try {
			const { hex, accentCount } = JSON.parse(value) as {
				hex: string;
				accentCount: 2 | 3 | 4 | 5;
			};

			// アクセント数を更新
			state.accentCount = accentCount;
			viewState.accentCount = accentCount;

			// 色を更新（履歴からの復元なので fromHistory = true）
			updateColor(hex, "history", true);
		} catch {
			// JSONパースエラーは無視
		}

		// プレースホルダーに戻す
		historySelect.selectedIndex = 0;
	});

	// クリアボタン
	const clearButton = document.createElement("button");
	clearButton.type = "button";
	clearButton.className = "dads-button dads-button--icon dads-history-clear";
	clearButton.textContent = "×";
	clearButton.dataset.testid = "brand-color-history-clear";
	clearButton.title = "履歴をクリア";

	clearButton.addEventListener("click", (e) => {
		e.stopPropagation();
		if (confirm("履歴をクリアしますか？")) {
			clearBrandColorHistory();
			updateHistoryOptions();
		}
	});

	historyContainer.appendChild(historySelect);
	historyContainer.appendChild(clearButton);

	// 要素の組み立て
	inputRow.appendChild(colorText);
	inputRow.appendChild(colorPicker);
	inputRow.appendChild(randomButton);
	inputRow.appendChild(historyContainer);
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

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
import { deriveSecondaryTertiary } from "@/core/key-color-derivation";
import {
	findDadsColorByHex,
	getDadsColorsByHue,
	getDadsHueFromDisplayName,
	loadDadsTokens,
} from "@/core/tokens/dads-data-provider";
import {
	checkContrastCompliance,
	getRandomDadsColor,
} from "@/core/tokens/random-color-picker";
import type { DadsToken } from "@/core/tokens/types";
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
import { HUE_DISPLAY_NAMES } from "../constants";
import {
	ALL_HARMONY_TYPES,
	createHarmonyStateManager,
	getRandomHarmonyType,
	type HarmonyPreviewData,
	type HarmonyStateManager,
} from "../harmony-state-manager";
import { createPalettesFromHarmonyColors } from "../palette-generator";
import {
	persistBackgroundColors,
	state,
	validateBackgroundColor,
} from "../state";
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
	/** アクセントカラーの数（1-3、デフォルト1）P+S+T+アクセント=4-6色 */
	accentCount: 1 | 2 | 3;
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
 * プレビューリクエストの識別子
 * レースコンディション防止のため、古いリクエストの結果を破棄する
 */
let currentPreviewRequestId = 0;

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
 * @param dadsTokens DADSトークン配列（Secondary/Tertiary導出用）
 */
function syncStatePalettes(
	harmonyType: HarmonyFilterType,
	colors: string[],
	candidates?: ScoredCandidate[],
	dadsTokens?: DadsToken[],
): void {
	// 現在の背景色を取得（ライトモードのデフォルト）
	const backgroundColor = state.lightBackgroundColor || "#ffffff";
	state.palettes = createPalettesFromHarmonyColors(
		harmonyType,
		colors,
		candidates,
		backgroundColor,
		dadsTokens,
	);
	if (state.palettes.length > 0 && state.palettes[0]) {
		state.activeId = state.palettes[0].id;
	}
}

/**
 * P/S/Tで使用されるステップを計算し、除外リストを作成する
 *
 * brandColorからSecondary/Tertiaryを導出し、
 * それらのhue-step（例: "blue-600"）を除外リストとして返す。
 *
 * @param brandColorHex ブランドカラー（HEX形式）
 * @param dadsTokens DADSトークン配列
 * @returns 除外するステップの配列（例: ["blue-600", "blue-500", "blue-200"]）
 */
function computeExcludeSteps(
	brandColorHex: string,
	dadsTokens: DadsToken[],
): string[] {
	const excludeSteps: string[] = [];

	// プライマリのDADS情報を取得
	const primaryDadsInfo = findDadsColorByHex(dadsTokens, brandColorHex);
	if (!primaryDadsInfo) {
		// DADSトークンでない場合は除外なし
		return [];
	}

	// プライマリのステップを除外リストに追加
	excludeSteps.push(`${primaryDadsInfo.hue}-${primaryDadsInfo.scale}`);

	// Secondary/Tertiaryを導出
	const backgroundColor = state.lightBackgroundColor || "#ffffff";
	const baseChromaName =
		HUE_DISPLAY_NAMES[primaryDadsInfo.hue] || primaryDadsInfo.hue;

	const derived = deriveSecondaryTertiary({
		primaryColor: brandColorHex,
		backgroundColor,
		dadsMode: {
			tokens: dadsTokens,
			baseChromaName,
			primaryStep: primaryDadsInfo.scale,
		},
	});

	// Secondary/Tertiaryのステップを除外リストに追加
	if (derived.secondary.step) {
		excludeSteps.push(`${primaryDadsInfo.hue}-${derived.secondary.step}`);
	}
	if (derived.tertiary.step) {
		excludeSteps.push(`${primaryDadsInfo.hue}-${derived.tertiary.step}`);
	}

	return excludeSteps;
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

	// 背景色をコンテナ全体と親要素に適用
	const bgColor = state.lightBackgroundColor || "#ffffff";
	container.style.backgroundColor = bgColor;

	// 親要素にも背景色を適用（#main-content, .dads-main, body）
	const mainContent = document.getElementById("main-content");
	if (mainContent) {
		mainContent.style.backgroundColor = bgColor;
	}
	const dadsMain = document.querySelector(".dads-main");
	if (dadsMain instanceof HTMLElement) {
		dadsMain.style.backgroundColor = bgColor;
	}
	document.body.style.backgroundColor = bgColor;

	// ヘッダーセクション（プライマリーカラー入力）
	const header = createHeader(inputHex, container, callbacks, viewState);
	container.appendChild(header);

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
	// 背景色をレイアウト全体に適用
	const bgColor = state.lightBackgroundColor || "#ffffff";
	layout.style.backgroundColor = bgColor;
	container.appendChild(layout);

	// メインエリア
	const mainArea = document.createElement("div");
	mainArea.className = "coolors-layout__main";
	// 背景色を継承（transparent）
	mainArea.style.backgroundColor = "transparent";
	layout.appendChild(mainArea);

	// サイドバーエリア
	const sidebarArea = document.createElement("div");
	sidebarArea.className = "coolors-layout__sidebar";
	// 背景色を継承（transparent）
	sidebarArea.style.backgroundColor = "transparent";
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
	// リクエストIDを発行（古いリクエストの結果を破棄するため）
	const requestId = ++currentPreviewRequestId;

	const { harmonyManager, brandColorHex, accentCount } = viewState;

	// DADSトークンをキャッシュ（プライマリーカラー検索用）
	const dadsTokensCache = await loadDadsTokens();

	// P/S/Tで使用されるステップを特定して除外リストを作成
	const excludeSteps = computeExcludeSteps(brandColorHex, dadsTokensCache);

	// 全ハーモニータイプのパレットを取得（P/S/Tステップを除外）
	const result = await getAllHarmonyPalettes(brandColorHex, {
		accentCount,
		excludeSteps,
	});

	// 古いリクエストの場合は処理を中断（レースコンディション防止）
	if (requestId !== currentPreviewRequestId) {
		return;
	}

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
	const currentCandidates = paletteCandidatesMap.get(selectedType) ?? [];

	// ★ 先にグローバル状態を同期（Secondary/Tertiaryを含むstate.palettesを生成）
	// パレットビュー・アクセシビリティビューがこのデータを参照する
	// DADSトークンを渡してSecondary/TertiaryもDADSステップから選択
	syncStatePalettes(
		selectedType,
		currentColors,
		currentCandidates,
		dadsTokensCache,
	);

	// state.palettesから表示用データを取得（Secondary/Tertiaryを含む）
	// keyColorsには@step suffix（例: "#3366cc@500"）が含まれる可能性があるため除去
	const displayColors = state.palettes.map((p) => {
		const keyColor = p.keyColors[0] ?? "";
		return keyColor.split("@")[0] ?? keyColor;
	});
	const tokenNames = state.palettes.map((p) => p.name);
	// state.palettesからプリミティブ名を生成（Secondary/Tertiaryも含む）
	const primitiveNames = generatePrimitiveNamesFromPalettes();

	// メイン表示を作成
	const mainDisplay = createCoolorsPaletteDisplay({
		colors: displayColors,
		tokenNames,
		primitiveNames,
		onColorClick: createColorClickHandler(
			paletteCandidatesMap,
			selectedType,
			tokenNames,
			callbacks,
		),
	});
	mainArea.appendChild(mainDisplay);

	// サイドバーを作成
	const sidebar = createHarmonySidebar({
		selectedType,
		previews: harmonyManager.getHarmonyPreviews(),
		onSelect: (type) => {
			// ユーザー選択を記録
			harmonyManager.selectHarmony(type);

			// メイン表示を更新
			const newColors = harmonyManager.getPreviewColors(type) ?? [];
			const newCandidates = paletteCandidatesMap.get(type) ?? [];

			// ★ 先にグローバル状態を同期（Secondary/Tertiaryを含むstate.palettesを生成）
			// DADSトークンを渡してSecondary/TertiaryもDADSステップから選択
			syncStatePalettes(type, newColors, newCandidates, dadsTokensCache);

			// state.palettesから表示用データを取得（Secondary/Tertiaryを含む）
			// keyColorsには@step suffix（例: "#3366cc@500"）が含まれる可能性があるため除去
			const newDisplayColors = state.palettes.map((p) => {
				const keyColor = p.keyColors[0] ?? "";
				return keyColor.split("@")[0] ?? keyColor;
			});
			const newTokenNames = state.palettes.map((p) => p.name);
			// state.palettesからプリミティブ名を生成（Secondary/Tertiaryも含む）
			const newPrimitiveNames = generatePrimitiveNamesFromPalettes();

			// 既存のメイン表示を削除して再作成
			mainArea.replaceChildren();
			const newMainDisplay = createCoolorsPaletteDisplay({
				colors: newDisplayColors,
				tokenNames: newTokenNames,
				primitiveNames: newPrimitiveNames,
				onColorClick: createColorClickHandler(
					paletteCandidatesMap,
					type,
					newTokenNames,
					callbacks,
				),
			});
			mainArea.appendChild(newMainDisplay);

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
			sidebarArea.appendChild(createSidebarSection(newSidebar));

			// サイドバー選択ではパレットビューへの遷移を行わない
			// メイン表示の切り替えのみ
		},
	});
	sidebarArea.appendChild(createSidebarSection(sidebar));
}

/**
 * サイドバーセクション（見出し＋サイドバー）を作成する
 */
function createSidebarSection(sidebar: HTMLElement): HTMLElement {
	const section = document.createElement("div");
	section.className = "harmony-sidebar-section";
	// 背景色を継承（transparent）
	section.style.backgroundColor = "transparent";

	// ハーモニー見出し
	const heading = document.createElement("h3");
	heading.className = "harmony-sidebar-section__heading";
	heading.textContent = "ハーモニー";
	section.appendChild(heading);

	// サイドバー（背景色を継承）
	sidebar.style.backgroundColor = "transparent";
	section.appendChild(sidebar);

	return section;
}

/**
 * state.palettesからプリミティブトークン名を生成する
 *
 * Secondary/Tertiaryを含む全パレットに対して、
 * baseChromaNameとstepからプリミティブ名を生成する。
 *
 * @returns プリミティブトークン名の配列（例: "blue-600", "blue-500", "blue-200"）
 */
function generatePrimitiveNamesFromPalettes(): string[] {
	return state.palettes.map((palette) => {
		if (!palette.baseChromaName || !palette.step) {
			return "";
		}
		// "Blue" → "blue", "Light Blue" → "light-blue"
		const hueLower = palette.baseChromaName.toLowerCase().replace(/\s+/g, "-");
		return `${hueLower}-${palette.step}`;
	});
}

/**
 * HEX値からScoredCandidateを検索する
 */
function findCandidateByHex(
	hex: string,
	candidates: ScoredCandidate[],
): ScoredCandidate | undefined {
	return candidates.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
}

/**
 * シンプルな単色モーダルオプションを生成する（フォールバック用）
 */
function createSimpleColorDetailOptions(
	hex: string,
	tokenName: string,
): ColorDetailModalOptions {
	const color = new Color(hex);
	return {
		stepColor: color,
		keyColor: color,
		index: 0,
		fixedScale: {
			colors: [color],
			keyIndex: 0,
			hexValues: [hex],
		},
		paletteInfo: { name: tokenName },
		readOnly: true,
		originalHex: hex,
	};
}

/**
 * DADSシェードスケールを含むColorDetailModalOptionsを構築する
 *
 * @param hex クリックされた色のHEX値
 * @param index パレット内のインデックス
 * @param candidates 現在のパレットのScoredCandidate配列
 * @param tokenName 表示用トークン名（Brand, Accent-1等）
 */
async function buildDadsColorDetailOptions(
	hex: string,
	index: number,
	candidates: ScoredCandidate[],
	tokenName: string,
): Promise<ColorDetailModalOptions> {
	const color = new Color(hex);

	// DADSトークンを読み込み
	const tokens = await loadDadsTokens();

	// アクセントカラー（index > 0）の場合、ScoredCandidateからDADS情報を取得
	// ブランドカラー（index === 0）の場合、DADSトークンから直接検索
	let dadsHue: ReturnType<typeof getDadsHueFromDisplayName> | undefined;
	let dadsStep: number | undefined;

	if (index > 0) {
		// アクセントカラー: candidatesから検索
		const candidate = findCandidateByHex(hex, candidates);
		if (candidate) {
			const hueNameMatch = candidate.dadsSourceName.match(/^(.+?)\s+\d+$/);
			const hueDisplayName = hueNameMatch ? hueNameMatch[1] : undefined;
			dadsHue = hueDisplayName
				? getDadsHueFromDisplayName(hueDisplayName)
				: undefined;
			dadsStep = candidate.step;
		}
	} else {
		// プライマリーカラー: DADSトークンから直接検索
		const found = findDadsColorByHex(tokens, hex);
		if (found) {
			dadsHue = found.hue;
			dadsStep = found.scale;
		}
	}

	if (dadsHue && dadsStep !== undefined) {
		try {
			const colorScale = getDadsColorsByHue(tokens, dadsHue);

			// colorScale.colorsは50→1200の順（明→暗）
			// ミニスケールで表示するために逆順にする（1200→50: 暗→明）
			const reversedColors = [...colorScale.colors].reverse();
			const scaleColors = reversedColors.map((c) => new Color(c.hex));
			const hexValues = reversedColors.map((c) => c.hex);

			// クリックされた色のインデックスを計算（reverse後）
			const originalIndex = colorScale.colors.findIndex(
				(c) => c.scale === dadsStep,
			);
			const scaleIndex =
				originalIndex >= 0 ? colorScale.colors.length - 1 - originalIndex : 0;

			// 代表色としてステップ600を使用（なければクリックした色）
			const keyColorItem =
				colorScale.colors.find((c) => c.scale === 600) ||
				colorScale.colors.find((c) => c.scale === dadsStep);
			const keyColor = keyColorItem ? new Color(keyColorItem.hex) : color;

			return {
				stepColor: color,
				keyColor,
				index: scaleIndex,
				fixedScale: {
					colors: scaleColors,
					keyIndex: scaleIndex,
					hexValues,
				},
				paletteInfo: {
					name: tokenName,
					baseChromaName: colorScale.hueName.en,
					step: dadsStep,
				},
				readOnly: true,
				originalHex: hex,
			};
		} catch (error) {
			console.warn("Failed to load DADS scale for modal:", error);
		}
	}

	// DADSカラーでない場合（ブランドカラーまたはフォールバック）
	return createSimpleColorDetailOptions(hex, tokenName);
}

/**
 * カラークリック時のハンドラを作成する（共通関数）
 *
 * DADSシェードモーダルの表示とフォールバック処理を担当。
 */
function createColorClickHandler(
	paletteCandidatesMap: Map<HarmonyFilterType, ScoredCandidate[]>,
	harmonyType: HarmonyFilterType,
	tokenNames: string[],
	callbacks: AccentSelectionViewCallbacks,
): (hex: string, index: number) => void {
	return (hex, index) => {
		const tokenName = tokenNames[index] ?? `Color ${index + 1}`;
		const candidates = paletteCandidatesMap.get(harmonyType) ?? [];
		buildDadsColorDetailOptions(hex, index, candidates, tokenName)
			.then((options) => callbacks.onColorClick(options))
			.catch((error) => {
				console.error("Failed to build modal options:", error);
				callbacks.onColorClick(createSimpleColorDetailOptions(hex, tokenName));
			});
	};
}

/**
 * カードのプレビュー色を読み込む
 */
async function loadCardPreviews(
	cards: HarmonyTypeCard[],
	brandColorHex: string,
	accentCount: 1 | 2 | 3 = 1,
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

	// プライマリーカラー入力
	const colorInput = document.createElement("div");
	colorInput.className = "dads-harmony-header__input";

	const colorLabel = document.createElement("label");
	colorLabel.className = "dads-label";
	colorLabel.textContent = "プライマリーカラー";
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

			// ハーモニータイプもランダムに選択
			const randomHarmonyType = getRandomHarmonyType();
			viewState.harmonyManager.selectHarmony(randomHarmonyType);

			// 背景色に対してWCAG AA（4.5:1）以上のコントラストを持つ色のみを候補とする
			const backgroundHex = state.lightBackgroundColor || "#ffffff";
			const randomHex = await getRandomDadsColor({ backgroundHex });
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
				accentCount: 1 | 2 | 3;
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

	// コントラスト警告要素
	const contrastWarning = document.createElement("div");
	contrastWarning.className = "dads-contrast-warning";
	contrastWarning.style.display = "none";
	contrastWarning.dataset.testid = "contrast-warning";

	/**
	 * コントラスト警告を更新する
	 * ユーザー入力の場合のみ警告を表示（4.5:1未満）
	 */
	const updateContrastWarning = (hex: string) => {
		const backgroundHex = state.lightBackgroundColor || "#ffffff";
		const { ratio, isCompliant } = checkContrastCompliance(hex, backgroundHex);
		const formattedRatio = ratio.toFixed(2);

		if (!isCompliant) {
			contrastWarning.innerHTML = `
				<span class="dads-contrast-warning__icon">⚠️</span>
				<span class="dads-contrast-warning__text">
					プライマリーカラーのコントラスト比が${formattedRatio}:1です。（推奨: 4.5:1以上）
				</span>
			`;
			contrastWarning.style.display = "flex";
		} else {
			contrastWarning.style.display = "none";
		}
	};

	// 初期表示時にコントラストをチェック
	updateContrastWarning(inputHex);

	// 要素の組み立て（UX改善: タスクフロー順に配置）
	// プライマリーカラー入力行（hex + picker のみ）
	inputRow.appendChild(colorText);
	inputRow.appendChild(colorPicker);
	colorInput.appendChild(colorLabel);
	colorInput.appendChild(inputRow);
	// contrastWarning は下の行に配置するため、ここでは追加しない

	// 左グループ（コントラスト関連: 背景色 → プライマリー → ランダム）
	const leftGroup = document.createElement("div");
	leftGroup.className = "dads-harmony-header__left-group";

	// 右グループ（設定項目: 履歴 → パレット色数）
	const rightGroup = document.createElement("div");
	rightGroup.className = "dads-harmony-header__right-group";

	// アクセントカラー数選択（ラジオボタン）
	const accentCountInput = document.createElement("div");
	accentCountInput.className = "dads-harmony-header__accent-count";

	const accentCountLabel = document.createElement("span");
	accentCountLabel.className = "dads-label";
	accentCountLabel.textContent = "パレット色数";

	const radioGroup = document.createElement("div");
	radioGroup.className = "dads-segmented-control";
	radioGroup.setAttribute("role", "radiogroup");
	radioGroup.setAttribute("aria-label", "パレット色数");
	radioGroup.dataset.testid = "accent-count-radio-group";

	// 4〜6色（P+S+T + アクセント1〜3）
	const radioOptions = [
		{ value: 1, label: "4色" },
		{ value: 2, label: "5色" },
		{ value: 3, label: "6色" },
	];

	for (const opt of radioOptions) {
		const radioLabel = document.createElement("label");
		radioLabel.className = "dads-radio-label";
		if (opt.value === viewState.accentCount) {
			radioLabel.classList.add("dads-radio-label--selected");
		}

		const radioInput = document.createElement("input");
		radioInput.type = "radio";
		radioInput.name = "accent-count";
		radioInput.value = String(opt.value);
		radioInput.className = "dads-radio-input";
		radioInput.checked = opt.value === viewState.accentCount;
		radioInput.dataset.testid = `accent-count-${opt.value}`;

		radioInput.addEventListener("change", (e) => {
			const value = Number.parseInt((e.target as HTMLInputElement).value, 10) as
				| 1
				| 2
				| 3;
			state.accentCount = value;
			viewState.accentCount = value;
			renderAccentSelectionView(container, viewState.brandColorHex, callbacks);
		});

		const labelText = document.createElement("span");
		labelText.textContent = opt.label;

		radioLabel.appendChild(radioInput);
		radioLabel.appendChild(labelText);
		radioGroup.appendChild(radioLabel);
	}

	accentCountInput.appendChild(accentCountLabel);
	accentCountInput.appendChild(radioGroup);
	// 右グループに追加（後で履歴の後に配置）

	// 背景色セレクター
	const bgColorInput = document.createElement("div");
	bgColorInput.className = "dads-harmony-header__bg-color";

	const bgColorLabel = document.createElement("label");
	bgColorLabel.className = "dads-label";
	bgColorLabel.textContent = "背景色";
	bgColorLabel.htmlFor = "background-color-input";

	const bgInputRow = document.createElement("div");
	bgInputRow.className = "dads-form-row";

	// 背景色テキスト入力
	const bgColorText = document.createElement("input");
	bgColorText.type = "text";
	bgColorText.id = "background-color-input";
	bgColorText.className = "dads-input dads-input--bg-color";
	bgColorText.value = state.lightBackgroundColor || "#ffffff";
	bgColorText.placeholder = "#ffffff";
	bgColorText.dataset.testid = "background-color-input";

	// 背景色カラーピッカー
	const bgColorPicker = document.createElement("input");
	bgColorPicker.type = "color";
	bgColorPicker.id = "background-color-picker";
	bgColorPicker.className = "dads-input dads-input--color";
	bgColorPicker.value = state.lightBackgroundColor || "#ffffff";
	bgColorPicker.dataset.testid = "background-color-picker";

	/**
	 * 背景色を更新する
	 */
	const updateBackgroundColor = (hex: string) => {
		// バリデーション
		const validation = validateBackgroundColor(hex);
		if (!validation.valid || !validation.hex) {
			return;
		}

		const normalizedHex = validation.hex;

		// グローバル状態を更新
		state.lightBackgroundColor = normalizedHex;

		// 入力フィールドを同期
		bgColorText.value = normalizedHex;
		bgColorPicker.value = normalizedHex;

		// localStorageに保存
		persistBackgroundColors(normalizedHex, state.darkBackgroundColor);

		// コントラスト警告を更新
		updateContrastWarning(viewState.brandColorHex);

		// ビュー全体を再レンダリング（パレット色の再計算のため）
		renderAccentSelectionView(container, viewState.brandColorHex, callbacks);
	};

	// 背景色カラーピッカーのイベント
	bgColorPicker.addEventListener("input", (e) => {
		e.stopPropagation();
		const hex = (e.target as HTMLInputElement).value;
		bgColorText.value = hex;
	});

	bgColorPicker.addEventListener("change", (e) => {
		e.stopPropagation();
		updateBackgroundColor((e.target as HTMLInputElement).value);
	});

	bgColorPicker.addEventListener("click", (e) => {
		e.stopPropagation();
	});

	bgColorPicker.addEventListener("mousedown", (e) => {
		e.stopPropagation();
	});

	// 背景色テキスト入力のイベント
	bgColorText.addEventListener("input", (e) => {
		const value = (e.target as HTMLInputElement).value;
		const validation = validateBackgroundColor(value);
		if (validation.valid && validation.hex) {
			bgColorPicker.value = validation.hex;
		}
	});

	bgColorText.addEventListener("change", (e) => {
		const value = (e.target as HTMLInputElement).value;
		updateBackgroundColor(value);
	});

	bgInputRow.appendChild(bgColorText);
	bgInputRow.appendChild(bgColorPicker);
	bgColorInput.appendChild(bgColorLabel);
	bgColorInput.appendChild(bgInputRow);

	// 最終組み立て（UX改善: タスクフロー順）
	// 左グループ: 背景色 → プライマリーカラー → ランダム
	leftGroup.appendChild(bgColorInput);
	leftGroup.appendChild(colorInput);
	leftGroup.appendChild(randomButton);

	// 右グループ: パレット色数 → 履歴（履歴は最も使用頻度が低いため右端）
	rightGroup.appendChild(accentCountInput);
	rightGroup.appendChild(historyContainer);

	// メインコントロール行（左右グループを横並び）
	const controlsRow = document.createElement("div");
	controlsRow.className = "dads-harmony-header__controls-row";
	controlsRow.appendChild(leftGroup);
	controlsRow.appendChild(rightGroup);

	// ヘッダーに追加（2行構成: コントロール行 + アラート行）
	header.appendChild(controlsRow);
	header.appendChild(contrastWarning);

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

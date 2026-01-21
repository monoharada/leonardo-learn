/**
 * デモ機能のエントリポイント
 *
 * 真のエントリポイントとして、初期化・イベントハンドラ登録・ビューのルーティングを担当。
 * View→Featureのコールバック接続（循環依存回避）を行う。
 *
 * @module @/ui/demo/index
 * Requirements: 2.4, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { HarmonyType, initializeHarmonyDads } from "@/core/harmony";
import { loadDadsTokens } from "@/core/tokens/dads-data-provider";
import { getRandomDadsColor } from "@/core/tokens/random-color-picker";
import type { DadsToken } from "@/core/tokens/types";

import {
	refreshA11yDrawer,
	setupA11yDrawer,
	updateA11yIssueBadge,
} from "./a11y-drawer";
import { openColorDetailModal } from "./color-detail-modal";
import { setupCVDControls, updateCVDScoreDisplay } from "./cvd-controls";
import { updateEditor } from "./editor";
import {
	setupDirectExportButtons,
	setupExportHandlers,
} from "./export-handlers";
import { fromManualUrlState, parseManualUrlHash } from "./manual-url-state";
import { setupNavigation, updateViewButtons } from "./navigation";
import { createDerivedPalettes, handleGenerate } from "./palette-generator";
import { renderSidebar } from "./sidebar";
import { loadBackgroundColors, loadSemanticColorConfig, state } from "./state";
import { parseStudioUrlHash } from "./studio-url-state";
import type { ColorDetailModalOptions, ManualColorSelection } from "./types";
import {
	generateNewStudioPalette,
	renderManualView,
	renderStudioView,
} from "./views";

/** Default HEX color used as fallback */
const DEFAULT_HEX_COLOR = "#3366cc";

/** Default ratios for palette generation */
const DEFAULT_RATIOS = [21, 15, 10, 7, 4.5, 3, 1];

/**
 * Get input HEX value from keyColorsInput or return default
 */
function getKeyColorHex(input: HTMLInputElement | null): string {
	return input?.value.trim() || DEFAULT_HEX_COLOR;
}

/**
 * Get harmony type from harmony input element
 */
function getHarmonyType(): HarmonyType {
	const harmonyInput = document.getElementById(
		"harmony",
	) as HTMLInputElement | null;
	return harmonyInput
		? (harmonyInput.value as HarmonyType)
		: HarmonyType.COMPLEMENTARY;
}

/**
 * Initialize DADS harmony system and load tokens
 * Falls back to HCT if initialization fails
 */
async function initializeDadsSystem(): Promise<DadsToken[]> {
	try {
		await initializeHarmonyDads();
		return await loadDadsTokens();
	} catch (error) {
		console.warn("DADS initialization failed, using HCT fallback:", error);
		return [];
	}
}

/**
 * Restore state from localStorage
 */
function restorePersistedState(): void {
	const restoredBackground = loadBackgroundColors();
	state.lightBackgroundColor = restoredBackground.light;
	state.darkBackgroundColor = restoredBackground.dark;
	state.semanticColorConfig = loadSemanticColorConfig();
}

/**
 * Clamp accent count to valid range (2-4)
 */
function clampAccentCount(count: number): 2 | 3 | 4 {
	if (count < 2) return 2;
	if (count > 4) return 4;
	return count as 2 | 3 | 4;
}

/**
 * デモ機能を初期化して実行する
 *
 * 必須DOM要素の取得と存在確認を行い、
 * 各モジュールのsetup関数を呼び出して初期化する。
 */
export async function runDemo(): Promise<void> {
	const dadsTokensCache = await initializeDadsSystem();

	// 必須DOM要素の取得
	const app = document.getElementById("app");
	const paletteListEl = document.getElementById("palette-list");
	const keyColorsInput = document.getElementById(
		"keyColors",
	) as HTMLInputElement | null;
	const generateSystemBtn = document.getElementById("generate-system");

	if (!app || !paletteListEl) return;

	// Reassign to const with narrowed type for use in nested functions
	const appEl: HTMLElement = app;
	const paletteList: HTMLElement = paletteListEl;

	restorePersistedState();

	// URL状態の復元: Studio優先、次にManual
	const studioUrlState = parseStudioUrlHash(window.location.hash);
	const manualUrlState = parseManualUrlHash(window.location.hash);

	if (studioUrlState && keyColorsInput) {
		restoreStudioState(studioUrlState, keyColorsInput, dadsTokensCache);
	} else if (manualUrlState) {
		restoreManualState(manualUrlState);
	} else if (keyColorsInput) {
		await initializeRandomBrandColor(keyColorsInput);
		// 初期パレット生成（URL状態がない場合）
		state.studioSeed = Date.now();
		try {
			await generateNewStudioPalette(dadsTokensCache);
		} catch (error) {
			console.error("Failed to generate initial studio palette:", error);
		}
	}

	/**
	 * Restore Studio state from URL hash
	 */
	function restoreStudioState(
		urlState: NonNullable<typeof studioUrlState>,
		input: HTMLInputElement,
		tokens: DadsToken[],
	): void {
		const timestamp = Date.now();
		const backgroundHex = "#ffffff";

		state.activePreset = urlState.preset;
		state.studioAccentCount = clampAccentCount(urlState.accentCount);
		state.lockedColors = {
			...state.lockedColors,
			primary: urlState.locks.primary,
			accent: urlState.locks.accent,
		};
		state.previewKv = urlState.kv;
		state.studioSeed = urlState.studioSeed;
		state.studioTheme = urlState.theme ?? "hero";
		state.viewMode = "studio";

		input.value = urlState.primary;

		const primaryPalette = {
			id: `studio-primary-${timestamp}`,
			name: "Primary",
			keyColors: [urlState.primary],
			ratios: DEFAULT_RATIOS,
			harmony: HarmonyType.NONE,
		};

		const derived = createDerivedPalettes(
			primaryPalette,
			backgroundHex,
			tokens,
		);

		const accentPalettes = urlState.accents
			.slice(0, state.studioAccentCount)
			.map((hex, index) => ({
				id: `studio-accent-${timestamp}-${index + 1}`,
				name: `Accent ${index + 1}`,
				keyColors: [hex],
				ratios: DEFAULT_RATIOS,
				harmony: HarmonyType.NONE,
			}));

		state.palettes = [primaryPalette, ...derived, ...accentPalettes];
		state.shadesPalettes = [];
		state.activeId = primaryPalette.id;
		state.activeHarmonyIndex = 0;
	}

	/**
	 * Restore Manual View state from URL hash
	 */
	function restoreManualState(
		urlState: NonNullable<typeof manualUrlState>,
	): void {
		// ManualUrlState → ManualColorSelection に変換
		const selection: ManualColorSelection = fromManualUrlState(urlState);

		// 状態を復元
		state.manualColorSelection = selection;
		state.lightBackgroundColor = selection.backgroundColor;
		state.darkBackgroundColor = selection.textColor;

		// Manual View に切り替え
		state.viewMode = "manual";

		// パレット生成（選択された色からパレットを生成）
		const timestamp = Date.now();
		const palettes: Array<{
			id: string;
			name: string;
			keyColors: string[];
			ratios: number[];
			harmony: HarmonyType;
		}> = [];

		if (selection.keyColor) {
			palettes.push({
				id: `manual-primary-${timestamp}`,
				name: "Primary",
				keyColors: [selection.keyColor],
				ratios: DEFAULT_RATIOS,
				harmony: HarmonyType.NONE,
			});
		}

		if (selection.secondaryColor) {
			palettes.push({
				id: `manual-secondary-${timestamp}`,
				name: "Secondary",
				keyColors: [selection.secondaryColor],
				ratios: DEFAULT_RATIOS,
				harmony: HarmonyType.NONE,
			});
		}

		if (selection.tertiaryColor) {
			palettes.push({
				id: `manual-tertiary-${timestamp}`,
				name: "Tertiary",
				keyColors: [selection.tertiaryColor],
				ratios: DEFAULT_RATIOS,
				harmony: HarmonyType.NONE,
			});
		}

		// アクセントカラーをパレットに追加
		for (let i = 0; i < selection.accentColors.length; i++) {
			const accentColor = selection.accentColors[i];
			if (accentColor) {
				palettes.push({
					id: `manual-accent-${timestamp}-${i + 1}`,
					name: `Accent ${i + 1}`,
					keyColors: [accentColor],
					ratios: DEFAULT_RATIOS,
					harmony: HarmonyType.NONE,
				});
			}
		}

		state.palettes = palettes;
		state.shadesPalettes = [];
		state.activeId = palettes[0]?.id ?? "";
		state.activeHarmonyIndex = 0;
	}

	/**
	 * Initialize random brand color if using default value
	 */
	async function initializeRandomBrandColor(
		input: HTMLInputElement,
	): Promise<void> {
		const currentValue = input.value.trim();
		if (currentValue !== DEFAULT_HEX_COLOR && currentValue !== "") return;

		try {
			const backgroundHex = state.lightBackgroundColor || "#ffffff";
			input.value = await getRandomDadsColor({ backgroundHex });
		} catch (error) {
			console.warn("Failed to get random initial color, using default:", error);
			input.value = DEFAULT_HEX_COLOR;
		}
	}

	// ========================================
	// コールバック定義（View→Feature接続）
	// ========================================

	/** Common UI update after palette changes */
	function refreshUI(): void {
		renderSidebar(paletteList, handlePaletteSelect);
		updateEditor(triggerGenerate);
		updateCVDScoreDisplay();
		updateA11yIssueBadge();
	}

	/** Refresh UI and re-render main view */
	function refreshUIAndRender(): void {
		refreshUI();
		renderMain();
	}

	function handleColorClick(options: ColorDetailModalOptions): void {
		openColorDetailModal(options, renderMain);
	}

	function handlePaletteSelect(id: string): void {
		state.activeId = id;
		state.activeHarmonyIndex = 0;
		updateEditor(triggerGenerate);
		renderSidebar(paletteList, handlePaletteSelect);
		renderMain();
	}

	function triggerGenerate(): void {
		handleGenerate(getKeyColorHex(keyColorsInput), getHarmonyType(), {
			onComplete: refreshUIAndRender,
		});
	}

	// ========================================
	// renderMain: ビューのルーティング
	// ========================================

	/**
	 * 現在のビューモードに応じてメインコンテンツをレンダリング
	 */
	function renderMain(): void {
		const mainContentEl = document.getElementById("main-content");
		if (mainContentEl) {
			mainContentEl.dataset.view = state.viewMode;
		}

		const contentContainer = document.getElementById("demo-content") ?? appEl;
		if (!contentContainer) return;

		// アプリコンテナを表示
		appEl.style.display = "";
		contentContainer.innerHTML = "";

		switch (state.viewMode) {
			case "studio":
				renderStudioView(contentContainer, {
					onColorClick: handleColorClick,
				}).catch(console.error);
				break;

			case "manual":
				renderManualView(contentContainer, {
					onColorClick: handleColorClick,
				}).catch(console.error);
				break;
		}

		updateCVDScoreDisplay();
		refreshA11yDrawer();
		updateA11yIssueBadge();
	}

	// ========================================
	// モジュール初期化
	// ========================================

	setupNavigation(renderMain);
	renderSidebar(paletteList, handlePaletteSelect);
	updateEditor(triggerGenerate);
	setupGenerateButton();
	setupExportControls();
	setupCVDControls(document.querySelectorAll("#cvdTypeButtons button"), () => {
		updateCVDScoreDisplay();
		renderMain();
	});
	setupAddPaletteButton();
	setupA11yDrawer();

	// Initial render based on URL state
	if (studioUrlState) {
		updateViewButtons("studio", renderMain);
	} else if (manualUrlState) {
		updateViewButtons("manual", renderMain);
	} else {
		renderMain();
	}

	function setupGenerateButton(): void {
		if (!generateSystemBtn) return;

		generateSystemBtn.onclick = () => {
			const inputHex = getKeyColorHex(keyColorsInput);
			if (!/^#[0-9A-Fa-f]{6}$/.test(inputHex)) {
				alert("Please enter a valid hex color (e.g., #0066CC)");
				return;
			}
			handleGenerate(inputHex, getHarmonyType(), {
				onComplete: refreshUIAndRender,
			});
		};
	}

	function setupExportControls(): void {
		setupExportHandlers({
			exportBtn: document.getElementById("export-btn"),
			exportDialog: document.getElementById(
				"export-dialog",
			) as HTMLDialogElement | null,
			exportArea: document.getElementById(
				"export-area",
			) as HTMLTextAreaElement | null,
			exportFormatButtons: document.querySelectorAll(
				"#export-format-buttons button",
			),
			exportCopyBtn: document.getElementById("export-copy-btn"),
			exportDownloadBtn: document.getElementById("export-download-btn"),
		});

		setupDirectExportButtons(
			document.getElementById("export-css"),
			document.getElementById("export-tailwind"),
			document.getElementById("export-json"),
		);
	}

	function setupAddPaletteButton(): void {
		const addPaletteBtn = document.getElementById("add-palette");
		if (!addPaletteBtn) return;

		addPaletteBtn.onclick = () => {
			const id = `custom-${Date.now()}`;
			state.palettes.push({
				id,
				name: `Custom Palette ${state.palettes.length + 1}`,
				keyColors: ["#000", "#fff"],
				ratios: DEFAULT_RATIOS,
				harmony: HarmonyType.NONE,
			});
			state.activeId = id;
			refreshUI();
			renderMain();
		};
	}
}

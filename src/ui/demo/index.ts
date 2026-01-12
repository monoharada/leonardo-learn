/**
 * デモ機能のエントリポイント
 *
 * 真のエントリポイントとして、初期化・イベントハンドラ登録・ビューのルーティングを担当。
 * View→Featureのコールバック接続（循環依存回避）を行う。
 *
 * @module @/ui/demo/index
 * Requirements: 2.4, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import type { ScoredCandidate } from "@/core/accent/accent-candidate-service";
import type { HarmonyFilterType } from "@/core/accent/harmony-filter-calculator";
import { HarmonyType, initializeHarmonyDads } from "@/core/harmony";
import { loadDadsTokens } from "@/core/tokens/dads-data-provider";
import { getRandomDadsColor } from "@/core/tokens/random-color-picker";
import type { DadsToken } from "@/core/tokens/types";

/**
 * Regex pattern to extract base chroma name from DADS source name
 * Removes trailing step number (e.g., "Light Blue 600" -> "Light Blue")
 */
const DADS_STEP_SUFFIX_PATTERN = /\s+\d+$/;

import { openColorDetailModal } from "./color-detail-modal";
import {
	applySimulation,
	setupCVDControls,
	updateCVDScoreDisplay,
} from "./cvd-controls";
import { updateEditor } from "./editor";
import {
	setupDirectExportButtons,
	setupExportHandlers,
} from "./export-handlers";
import { setupNavigation, updateViewButtons } from "./navigation";
import {
	createPalettesFromHarmonyColors,
	handleGenerate,
} from "./palette-generator";
import { renderSidebar } from "./sidebar";
import { state } from "./state";
import type { ColorDetailModalOptions } from "./types";
import {
	renderAccentSelectionView,
	renderAccessibilityView,
	renderPaletteView,
	renderShadesView,
} from "./views";

/**
 * デモ機能を初期化して実行する
 *
 * 必須DOM要素の取得と存在確認を行い、
 * 各モジュールのsetup関数を呼び出して初期化する。
 */
export async function runDemo(): Promise<void> {
	// DADS Harmony Selectorの初期化
	// これによりハーモニー生成でDADSトークン選択が使用される
	// 初期化に失敗してもUIは表示される（HCTフォールバック使用）
	let dadsTokensCache: DadsToken[] = [];
	try {
		await initializeHarmonyDads();
		// DADSトークンをキャッシュ（Secondary/Tertiary導出用）
		dadsTokensCache = await loadDadsTokens();
	} catch (error) {
		console.warn("DADS initialization failed, using HCT fallback:", error);
	}

	// 必須DOM要素の取得
	const app = document.getElementById("app");
	const paletteListEl = document.getElementById("palette-list");
	const keyColorsInput = document.getElementById(
		"keyColors",
	) as HTMLInputElement | null;
	const generateSystemBtn = document.getElementById("generate-system");
	const harmonyViewEl = document.getElementById("harmony-view");

	// 必須要素のガード
	if (!app || !paletteListEl) return;

	// ========================================
	// 初期ブランドカラーのランダム選択
	// ========================================
	// keyColorsInputが存在し、デフォルト値（#3366cc）のままの場合はランダム選択
	if (keyColorsInput) {
		const currentValue = keyColorsInput.value.trim();
		// デフォルト値の場合はランダムに選択
		if (currentValue === "#3366cc" || currentValue === "") {
			try {
				const randomHex = await getRandomDadsColor();
				keyColorsInput.value = randomHex;
			} catch (error) {
				console.warn(
					"Failed to get random initial color, using default:",
					error,
				);
				// エラー時はデフォルト値を使用
				keyColorsInput.value = "#3366cc";
			}
		}
	}

	// ========================================
	// コールバック定義（View→Feature接続）
	// ========================================

	/**
	 * 色クリック時のハンドラ（モーダル表示）
	 */
	const handleColorClick = (options: ColorDetailModalOptions): void => {
		openColorDetailModal(options, renderMain);
	};

	/**
	 * ハーモニーカードクリック時のハンドラ
	 * Section 8: 可変長パレットを生成してパレットビューへ遷移
	 */
	const handleHarmonyCardClick = (
		harmonyType: HarmonyFilterType,
		paletteColors: string[],
		candidates?: ScoredCandidate[],
	): void => {
		// 現在の背景色を取得（ライトモードのデフォルト）
		const backgroundColor = state.lightBackgroundColor || "#ffffff";
		// 新しい共通関数を使用してパレットを生成
		// DADSトークンを渡してSecondary/TertiaryもDADSステップから選択
		state.palettes = createPalettesFromHarmonyColors(
			harmonyType,
			paletteColors,
			candidates,
			backgroundColor,
			dadsTokensCache,
		);

		// アクティブIDを設定（最初のパレットを選択）
		const firstPalette = state.palettes[0];
		if (firstPalette) {
			state.activeId = firstPalette.id;
		}

		// UIを更新
		renderSidebar(paletteListEl, handlePaletteSelect);
		updateEditor(triggerGenerate);
		updateCVDScoreDisplay();

		// パレットビューに自動遷移
		updateViewButtons("palette", renderMain);
	};

	/**
	 * アクセント選択時のハンドラ
	 * Section 7: 選択したアクセント候補をパレットに反映（詳細選択モード用）
	 */
	const handleAccentSelect = (candidate: ScoredCandidate): void => {
		// キーカラーを取得
		const inputHex = keyColorsInput?.value.trim() || "#3366cc";

		// DADSハーモニーでパレットを生成（アクセント付き）
		handleGenerate(inputHex, HarmonyType.DADS, {
			onComplete: () => {
				// アクセントカラーとしてパレットに追加
				// dadsSourceName (例: "Light Blue 600") からステップを除去してbaseChromaNameを取得
				const baseChromaName = candidate.dadsSourceName.replace(
					DADS_STEP_SUFFIX_PATTERN,
					"",
				);
				const accentPalette = {
					id: `accent-${Date.now()}`,
					name: `Accent: ${candidate.dadsSourceName}`,
					keyColors: [candidate.hex],
					ratios: [21, 15, 10, 7, 4.5, 3, 1],
					harmony: HarmonyType.DADS,
					baseChromaName,
					step: candidate.step,
				};

				// パレットに追加
				state.palettes.push(accentPalette);
				state.activeId = accentPalette.id;

				renderSidebar(paletteListEl, handlePaletteSelect);
				updateEditor(triggerGenerate);
				updateCVDScoreDisplay();

				// パレットビューに切り替え
				updateViewButtons("palette", renderMain);
			},
		});
	};

	/**
	 * パレット選択時のハンドラ
	 */
	const handlePaletteSelect = (id: string): void => {
		state.activeId = id;
		state.activeHarmonyIndex = 0;
		updateEditor(triggerGenerate);
		renderSidebar(paletteListEl, handlePaletteSelect);
		renderMain();
	};

	/**
	 * パレット生成をトリガーするハンドラ（エディタから呼び出し）
	 */
	const triggerGenerate = (): void => {
		const inputHex = keyColorsInput?.value.trim() || "#3366cc";

		const harmonyInput = document.getElementById(
			"harmony",
		) as HTMLInputElement | null;
		const harmonyType = harmonyInput
			? (harmonyInput.value as HarmonyType)
			: HarmonyType.COMPLEMENTARY;

		handleGenerate(inputHex, harmonyType, {
			onComplete: () => {
				renderSidebar(paletteListEl, handlePaletteSelect);
				updateEditor(triggerGenerate);
				updateCVDScoreDisplay();
				renderMain();
			},
		});
	};

	// ========================================
	// renderMain: ビューのルーティング
	// ========================================

	/**
	 * 現在のビューモードに応じてメインコンテンツをレンダリング
	 */
	function renderMain(): void {
		// パレット/シェード/アクセシビリティビューのコンテナを取得
		let contentContainer = document.getElementById("demo-content");
		if (!contentContainer) {
			contentContainer = app;
		}

		if (!contentContainer) return;

		const keyColorHex = keyColorsInput?.value.trim() || "#3366cc";

		switch (state.viewMode) {
			case "harmony":
				// アクセント選定ビュー表示、app非表示
				// NOTE: .dads-sectionのdisplay:flexがhidden属性を上書きするため、style.displayを直接操作
				if (harmonyViewEl) harmonyViewEl.style.display = "";
				if (app) app.style.display = "none";
				// アクセント選定ビューはharmony-view要素に直接レンダリング
				if (harmonyViewEl) {
					renderAccentSelectionView(harmonyViewEl, keyColorHex, {
						onHarmonyCardClick: handleHarmonyCardClick,
						onAccentSelect: handleAccentSelect,
						onColorClick: handleColorClick,
					});
				}
				break;

			case "palette":
				// ハーモニービュー非表示、app表示
				// NOTE: .dads-sectionのdisplay:flexがhidden属性を上書きするため、style.displayを直接操作
				if (harmonyViewEl) harmonyViewEl.style.display = "none";
				if (app) app.style.display = "";
				// 再レンダリング時のDOM重複を防ぐためコンテナをクリア
				contentContainer.innerHTML = "";
				renderPaletteView(contentContainer, {
					onColorClick: handleColorClick,
				}).catch(console.error);
				break;

			case "shades":
				// ハーモニービュー非表示、app表示
				// NOTE: .dads-sectionのdisplay:flexがhidden属性を上書きするため、style.displayを直接操作
				if (harmonyViewEl) harmonyViewEl.style.display = "none";
				if (app) app.style.display = "";
				// 再レンダリング時のDOM重複を防ぐためコンテナをクリア
				contentContainer.innerHTML = "";
				renderShadesView(contentContainer, {
					onColorClick: handleColorClick,
				}).catch(console.error);
				break;

			case "accessibility":
				// ハーモニービュー非表示、app表示
				// NOTE: .dads-sectionのdisplay:flexがhidden属性を上書きするため、style.displayを直接操作
				if (harmonyViewEl) harmonyViewEl.style.display = "none";
				if (app) app.style.display = "";
				// 再レンダリング時のDOM重複を防ぐためコンテナをクリア
				contentContainer.innerHTML = "";
				renderAccessibilityView(contentContainer, {
					applySimulation,
				});
				break;
		}

		// ビュー更新後にCVDスコア表示を更新
		updateCVDScoreDisplay();
	}

	// ========================================
	// モジュール初期化
	// ========================================

	// ナビゲーションのセットアップ
	setupNavigation(renderMain);

	// サイドバーの初期レンダリング
	renderSidebar(paletteListEl, handlePaletteSelect);

	// エディタの初期化
	updateEditor(triggerGenerate);

	// 生成ボタンのセットアップ
	if (generateSystemBtn) {
		generateSystemBtn.onclick = () => {
			const inputHex = keyColorsInput?.value.trim() || "#3366cc";
			if (!/^#[0-9A-Fa-f]{6}$/.test(inputHex)) {
				alert("Please enter a valid hex color (e.g., #0066CC)");
				return;
			}

			const harmonyInput = document.getElementById(
				"harmony",
			) as HTMLInputElement | null;
			const harmonyType = harmonyInput
				? (harmonyInput.value as HarmonyType)
				: HarmonyType.COMPLEMENTARY;

			handleGenerate(inputHex, harmonyType, {
				onComplete: () => {
					renderSidebar(paletteListEl, handlePaletteSelect);
					updateEditor(triggerGenerate);
					updateCVDScoreDisplay();
					renderMain();
				},
			});
		};
	}

	// エクスポートハンドラのセットアップ
	const exportElements = {
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
	};
	setupExportHandlers(exportElements);

	// ダイレクトエクスポートボタンのセットアップ
	setupDirectExportButtons(
		document.getElementById("export-css"),
		document.getElementById("export-tailwind"),
		document.getElementById("export-json"),
	);

	// CVDコントロールのセットアップ
	const cvdButtons = document.querySelectorAll("#cvdTypeButtons button");
	setupCVDControls(cvdButtons, () => {
		updateCVDScoreDisplay();
		renderMain();
	});

	// Add Palette ボタンのセットアップ
	const addPaletteBtn = document.getElementById("add-palette");
	if (addPaletteBtn) {
		addPaletteBtn.onclick = () => {
			const id = `custom-${Date.now()}`;
			state.palettes.push({
				id,
				name: `Custom Palette ${state.palettes.length + 1}`,
				keyColors: ["#000", "#fff"],
				ratios: [21, 15, 10, 7, 4.5, 3, 1],
				harmony: HarmonyType.NONE,
			});
			state.activeId = id;
			renderSidebar(paletteListEl, handlePaletteSelect);
			updateEditor(triggerGenerate);
			renderMain();
		};
	}

	// ========================================
	// 初期レンダリング
	// ========================================

	// 初期状態でharmonyビューを表示
	renderMain();
}

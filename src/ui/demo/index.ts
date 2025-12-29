/**
 * デモ機能のエントリポイント
 *
 * 真のエントリポイントとして、初期化・イベントハンドラ登録・ビューのルーティングを担当。
 * View→Featureのコールバック接続（循環依存回避）を行う。
 *
 * @module @/ui/demo/index
 * Requirements: 2.4, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { HarmonyType } from "@/core/harmony";
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
import { handleGenerate } from "./palette-generator";
import { renderSidebar } from "./sidebar";
import { state } from "./state";
import type { ColorDetailModalOptions, HarmonyTypeConfig } from "./types";
import {
	renderAccessibilityView,
	renderHarmonyView,
	renderPaletteView,
	renderShadesView,
} from "./views";

/**
 * デモ機能を初期化して実行する
 *
 * 必須DOM要素の取得と存在確認を行い、
 * 各モジュールのsetup関数を呼び出して初期化する。
 */
export function runDemo(): void {
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
	// コールバック定義（View→Feature接続）
	// ========================================

	/**
	 * 色クリック時のハンドラ（モーダル表示）
	 */
	const handleColorClick = (options: ColorDetailModalOptions): void => {
		openColorDetailModal(options, renderMain);
	};

	/**
	 * ハーモニー選択時のハンドラ
	 */
	const handleHarmonySelect = (config: HarmonyTypeConfig): void => {
		state.selectedHarmonyConfig = config;

		// キーカラーを取得
		const inputHex = keyColorsInput?.value.trim() || "#3366cc";

		// パレットを生成
		handleGenerate(inputHex, config.harmonyType, {
			onComplete: () => {
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
				// ハーモニービュー表示、app非表示
				// NOTE: .dads-sectionのdisplay:flexがhidden属性を上書きするため、style.displayを直接操作
				if (harmonyViewEl) harmonyViewEl.style.display = "";
				if (app) app.style.display = "none";
				// ハーモニービューはharmony-view要素に直接レンダリング
				if (harmonyViewEl) {
					renderHarmonyView(harmonyViewEl, keyColorHex, {
						onHarmonySelect: handleHarmonySelect,
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

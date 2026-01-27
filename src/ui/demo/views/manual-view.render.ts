/**
 * NOTE: Render implementation (split from manual-view.ts).
 *
 * マニュアル選択ビューモジュール
 *
 * マニュアル選択画面のレンダリングを担当する。
 * DADSカラーの各色相セクションとブランドカラーセクションを表示する。
 * カードクリック時はonColorClickコールバック経由でcolor-detail-modalと接続する。
 *
 * @module @/ui/demo/views/manual-view
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.5, 5.6, 6.3, 6.4
 */

import { Color } from "@/core/color";
import { generateHarmonyPalette, HarmonyType } from "@/core/harmony";
import { DEBOUNCE_DELAY_MS, debounce } from "../background-color-selector";
import {
	DEFAULT_MANUAL_KEY_COLOR,
	DEFAULT_MANUAL_SECONDARY_COLOR,
	DEFAULT_MANUAL_TERTIARY_COLOR,
} from "../constants";
import { buildManualShareUrl } from "../manual-url-state";
import {
	persistBackgroundColors,
	persistManualColorSelection,
	state,
	validateBackgroundColor,
} from "../state";
import type { ColorDetailModalOptions, ManualApplyTarget } from "../types";
import { setTemporaryButtonText } from "../utils/button-feedback";
import {
	EXPORT_BUTTON_CONTENT_HTML,
	LINK_ICON_SVG,
} from "../utils/button-markup";
import { copyTextToClipboard } from "../utils/clipboard";
import {
	getSelectedApplyTarget,
	setSelectedApplyTarget,
} from "./manual-view.apply-target";
import { renderManualDadsContent } from "./manual-view.dads-content";
import {
	createSwatchLabel,
	createSwatchWrapper,
} from "./manual-view.render-utils";
import {
	applyColorToManualSelection,
	deleteAccentFromManualSelection,
	syncFromStudioPalettes,
} from "./manual-view.selection";

/**
 * マニュアル選択ビューのコールバック
 */
export interface ManualViewCallbacks {
	/** 色クリック時のコールバック（モーダル表示用） */
	onColorClick: (options: ColorDetailModalOptions) => void;
}

/**
 * Stored reference for document-level popover click handler cleanup (prevents memory leak)
 */
let manualViewClickHandler: ((e: MouseEvent) => void) | null = null;

/**
 * シェードビューをレンダリングする
 *
 * Requirements: 1.1, 5.5, 5.6 - シェードビューに背景色セレクターを統合する
 *
 * @param container レンダリング先のコンテナ要素
 * @param callbacks コールバック関数
 */
export async function renderManualView(
	container: HTMLElement,
	callbacks: ManualViewCallbacks,
): Promise<void> {
	// Studio View パレットから Manual View の選択状態を同期
	// これにより、Studio View で生成されたパレットがツールバーに反映される
	// Bug 1 対応: URL から復元された場合は同期をスキップ（初回のみ）
	if (state.manualColorRestoredFromUrl) {
		// フラグをリセット（次回以降は通常の同期を行う）
		state.manualColorRestoredFromUrl = false;
	} else {
		syncFromStudioPalettes();
	}

	// コンテナをクリアして前のビューのDOMが残らないようにする
	container.innerHTML = "";
	container.className = "dads-section";

	// Cleanup orphaned popovers from previous render (prevents DOM accumulation)
	for (const orphan of document.querySelectorAll(
		'.studio-swatch-popover[data-manual-view="true"]',
	)) {
		orphan.remove();
	}

	// Requirements: 5.5, 5.6 - ライト背景色をコンテナに適用
	container.style.backgroundColor = state.lightBackgroundColor;

	// アクティブなポップオーバーを追跡
	let activePopover: HTMLElement | null = null;

	// ポップオーバーを閉じるヘルパー
	const closeActivePopover = () => {
		if (activePopover) {
			activePopover.dataset.open = "false";
			activePopover = null;
		}
	};

	// Remove previous click handler to prevent memory leak from accumulating listeners
	if (manualViewClickHandler) {
		document.removeEventListener("click", manualViewClickHandler);
	}

	// ドキュメントクリックでポップオーバーを閉じる
	manualViewClickHandler = (e: MouseEvent) => {
		if (activePopover && !activePopover.contains(e.target as Node)) {
			closeActivePopover();
		}
	};
	document.addEventListener("click", manualViewClickHandler);

	// 色変更ハンドラを作成
	const handleBackgroundColorChange = (hex: string) => {
		state.lightBackgroundColor = hex;
		persistBackgroundColors(
			state.lightBackgroundColor,
			state.darkBackgroundColor,
		);
		container.style.backgroundColor = hex;

		// Update parent #main-content as well
		const mainContentEl = document.getElementById("main-content");
		if (mainContentEl) {
			mainContentEl.style.backgroundColor = hex;
		}

		void renderManualView(container, callbacks).catch((err) => {
			console.error("Failed to re-render manual view:", err);
		});
	};

	const handleTextColorChange = (hex: string) => {
		state.darkBackgroundColor = hex;
		persistBackgroundColors(
			state.lightBackgroundColor,
			state.darkBackgroundColor,
		);
		void renderManualView(container, callbacks).catch((err) => {
			console.error("Failed to re-render manual view:", err);
		});
	};

	// キーカラー変更ハンドラ（セカンダリー・ターシャリーを自動生成）
	const handleKeyColorChange = (hex: string) => {
		const keyColor = new Color(hex);
		// TRIADICハーモニーでセカンダリー・ターシャリーを生成
		const palette = generateHarmonyPalette(keyColor, HarmonyType.TRIADIC);

		// パレットからセカンダリー・ターシャリーを取得
		// Note: TRIADICハーモニーでは「Secondary」と「Accent」が返される
		// マニュアル選択モデルでは「Accent」を「Tertiary」として使用
		const secondary = palette.find((c) => c.name === "Secondary");
		const tertiary = palette.find((c) => c.name === "Accent");

		// マニュアル選択状態を更新
		const selection = state.manualColorSelection;
		selection.keyColor = hex;
		selection.secondaryColor =
			secondary?.keyColor.toHex() ?? DEFAULT_MANUAL_SECONDARY_COLOR;
		selection.tertiaryColor =
			tertiary?.keyColor.toHex() ?? DEFAULT_MANUAL_TERTIARY_COLOR;

		// パレット同期
		applyColorToManualSelection("key", hex);
		if (selection.secondaryColor) {
			applyColorToManualSelection("secondary", selection.secondaryColor);
		}
		if (selection.tertiaryColor) {
			applyColorToManualSelection("tertiary", selection.tertiaryColor);
		}

		// 永続化
		persistManualColorSelection(selection);

		// ビューを再描画
		void renderManualView(container, callbacks).catch((err) => {
			console.error("Failed to re-render manual view:", err);
		});
	};

	// ====================================
	// 上部ヘッダーセクション（ラベル付きスウォッチ）
	// ====================================
	const headerSection = document.createElement("section");
	headerSection.className = "manual-header-swatches";
	headerSection.setAttribute("role", "region");
	headerSection.setAttribute("aria-label", "選択カラースウォッチ");
	headerSection.style.backgroundColor = state.lightBackgroundColor;

	// ヘッダーセクションの見出しを追加
	const headerHeading = document.createElement("h2");
	headerHeading.className = "manual-header-swatches__heading";
	headerHeading.textContent = "選択中カラー";
	headerSection.appendChild(headerHeading);

	// スウォッチを配置するコンテナを作成
	const swatchesContainer = document.createElement("div");
	swatchesContainer.className = "manual-header-swatches__swatches-container";

	// ====================================
	// 下部ツールバー（小さいスウォッチ + コントロール）
	// ====================================
	const toolbar = document.createElement("section");
	toolbar.className = "studio-toolbar studio-toolbar--manual";
	toolbar.setAttribute("role", "region");
	toolbar.setAttribute("aria-label", "マニュアル選択ツールバー");

	// ツールバーのスウォッチコンテナ
	const swatches = document.createElement("div");
	swatches.className = "studio-toolbar__swatches";

	// アクティブ状態を更新するヘルパー
	const updateActiveState = (
		clickedWrapper: HTMLElement,
		target: ManualApplyTarget | null,
	) => {
		// 全スウォッチからアクティブ状態を解除（ヘッダーセクション内を検索）
		for (const el of headerSection.querySelectorAll(
			".studio-toolbar-swatch--active",
		)) {
			el.classList.remove("studio-toolbar-swatch--active");
		}
		// クリックされたスウォッチをアクティブに
		if (target) {
			clickedWrapper.classList.add("studio-toolbar-swatch--active");
			setSelectedApplyTarget(target);
		} else {
			setSelectedApplyTarget(null);
		}
	};

	// 背景色・テキスト色用ポップオーバー付きスウォッチを作成
	const createColorSwatchWithPopover = (
		label: string,
		hex: string,
		onColorChange: (newHex: string) => void,
		isZoneEnd = false,
	): HTMLElement => {
		const outerWrapper = createSwatchWrapper(isZoneEnd);

		const swatch = document.createElement("div");
		swatch.className = "studio-toolbar-swatch";
		swatch.setAttribute("role", "button");
		swatch.setAttribute("tabindex", "0");
		swatch.setAttribute(
			"aria-label",
			`${label}: ${hex.toUpperCase()} - クリックして編集`,
		);
		swatch.style.cursor = "pointer";

		const circle = document.createElement("span");
		circle.className = "studio-toolbar-swatch__circle";
		circle.style.backgroundColor = hex;
		swatch.appendChild(circle);

		// ポップオーバー
		const popover = document.createElement("div");
		popover.className = "studio-swatch-popover";
		popover.dataset.open = "false";
		popover.dataset.manualView = "true"; // Mark for cleanup on re-render

		// ロールラベル
		const roleLabel = document.createElement("div");
		roleLabel.className = "studio-swatch-popover__role";
		roleLabel.textContent = label;
		popover.appendChild(roleLabel);

		// カラーピッカー行
		const colorRow = document.createElement("div");
		colorRow.className = "studio-swatch-popover__color-row";

		const colorPicker = document.createElement("input");
		colorPicker.type = "color";
		colorPicker.value = hex;
		colorPicker.className = "studio-swatch-popover__color-picker";
		colorPicker.setAttribute("aria-label", `${label}の色を選択`);
		colorPicker.onclick = (e) => e.stopPropagation();

		const hexInput = document.createElement("input");
		hexInput.type = "text";
		hexInput.className = "studio-swatch-popover__hex-input";
		hexInput.value = hex.toUpperCase();
		hexInput.setAttribute("aria-label", `${label}のカラーコード`);
		hexInput.onclick = (e) => e.stopPropagation();

		// エラー表示
		const errorArea = document.createElement("div");
		errorArea.className = "studio-swatch-popover__error";
		errorArea.setAttribute("role", "alert");

		// デバウンス付きHEX入力ハンドラ
		const handleHexChange = (input: unknown) => {
			const inputStr = String(input);
			const result = validateBackgroundColor(inputStr);
			if (result.valid && result.hex) {
				circle.style.backgroundColor = result.hex;
				colorPicker.value = result.hex;
				hexInput.classList.remove("studio-swatch-popover__hex-input--invalid");
				errorArea.textContent = "";
				onColorChange(result.hex);
			} else if (result.error) {
				hexInput.classList.add("studio-swatch-popover__hex-input--invalid");
				errorArea.textContent = result.error;
			}
		};
		const debouncedHexInput = debounce(handleHexChange, DEBOUNCE_DELAY_MS);

		colorPicker.oninput = (e) => {
			e.stopPropagation();
			const newHex = colorPicker.value;
			circle.style.backgroundColor = newHex;
			hexInput.value = newHex.toUpperCase();
			hexInput.classList.remove("studio-swatch-popover__hex-input--invalid");
			errorArea.textContent = "";
			onColorChange(newHex);
		};

		hexInput.oninput = (e) => {
			e.stopPropagation();
			debouncedHexInput(hexInput.value.trim());
		};

		hexInput.onblur = () => {
			const result = validateBackgroundColor(hexInput.value.trim());
			if (result.valid && result.hex) {
				hexInput.value = result.hex.toUpperCase();
				hexInput.classList.remove("studio-swatch-popover__hex-input--invalid");
			}
		};

		colorRow.appendChild(colorPicker);
		colorRow.appendChild(hexInput);
		popover.appendChild(colorRow);
		popover.appendChild(errorArea);

		// ポップオーバーをbodyに追加（position: fixedのため）
		document.body.appendChild(popover);

		// スウォッチクリックでポップオーバー表示
		swatch.onclick = (e) => {
			e.stopPropagation();
			if (activePopover === popover) {
				closeActivePopover();
				return;
			}
			closeActivePopover();
			const rect = swatch.getBoundingClientRect();
			// 一旦表示してサイズを取得
			popover.dataset.open = "true";
			const popoverRect = popover.getBoundingClientRect();
			const popoverWidth = popoverRect.width || 180; // フォールバック幅

			// 中央配置を基本として、画面端でクリップしないように調整
			let leftPos = rect.left + rect.width / 2 - popoverWidth / 2;
			const rightEdge = leftPos + popoverWidth;
			const viewportWidth = window.innerWidth;

			// 左端がはみ出す場合
			if (leftPos < 8) {
				leftPos = 8;
			}
			// 右端がはみ出す場合
			if (rightEdge > viewportWidth - 8) {
				leftPos = viewportWidth - popoverWidth - 8;
			}

			popover.style.top = `${rect.bottom + 8}px`;
			popover.style.left = `${leftPos}px`;
			activePopover = popover;
		};

		outerWrapper.appendChild(swatch);
		outerWrapper.appendChild(createSwatchLabel(label));

		return outerWrapper;
	};

	// 選択済みスウォッチを作成（ラベル付き）
	const createFilledSwatch = (
		label: string,
		hex: string,
		isZoneEnd = false,
		target?: ManualApplyTarget,
		onDelete?: () => void,
	): HTMLElement => {
		const outerWrapper = createSwatchWrapper(isZoneEnd);

		const swatch = document.createElement("div");
		swatch.className = "studio-toolbar-swatch";

		// ターゲットがある場合はクリック可能に
		if (target) {
			swatch.setAttribute("role", "button");
			swatch.setAttribute("tabindex", "0");
			swatch.setAttribute(
				"aria-label",
				`${label}: ${hex.toUpperCase()} - クリックして適用先に設定`,
			);
			swatch.title = `${label}: ${hex.toUpperCase()} - クリックして適用先に設定`;
			swatch.style.cursor = "pointer";
			// クリックハンドラ
			swatch.addEventListener("click", (e) => {
				// 削除ボタンがクリックされた場合は無視
				if (
					(e.target as HTMLElement).closest(".studio-toolbar-swatch__delete")
				) {
					return;
				}
				if (getSelectedApplyTarget() === target) {
					// 同じターゲットを再クリックで解除
					updateActiveState(swatch, null);
				} else {
					updateActiveState(swatch, target);
				}
			});
			// 初期アクティブ状態を設定
			if (getSelectedApplyTarget() === target) {
				swatch.classList.add("studio-toolbar-swatch--active");
			}
		} else {
			swatch.setAttribute("role", "img");
			swatch.setAttribute("aria-label", `${label}: ${hex.toUpperCase()}`);
			swatch.title = `${label}: ${hex.toUpperCase()}`;
		}

		const circle = document.createElement("span");
		circle.className = "studio-toolbar-swatch__circle";
		circle.style.backgroundColor = hex;
		swatch.appendChild(circle);

		// 削除ボタンを追加（コールバックが提供されている場合）
		if (onDelete) {
			const deleteBtn = document.createElement("button");
			deleteBtn.type = "button";
			deleteBtn.className = "studio-toolbar-swatch__delete";
			deleteBtn.setAttribute("aria-label", `${label}を削除`);
			deleteBtn.onclick = (e) => {
				e.stopPropagation();
				onDelete();
			};
			swatch.appendChild(deleteBtn);
		}

		outerWrapper.appendChild(swatch);
		outerWrapper.appendChild(createSwatchLabel(label));

		return outerWrapper;
	};

	// 未選択プレースホルダーを作成（ラベル付き）
	const createPlaceholderSwatch = (
		label: string,
		isZoneEnd = false,
		target?: ManualApplyTarget,
		isDisabled = false,
	): HTMLElement => {
		const outerWrapper = createSwatchWrapper(isZoneEnd);

		const swatch = document.createElement("div");
		swatch.className =
			"studio-toolbar-swatch studio-toolbar-swatch--placeholder";
		if (isDisabled) {
			swatch.classList.add("studio-toolbar-swatch--disabled");
		}

		// 無効化時とそうでない場合で属性を分ける
		if (!isDisabled && target) {
			swatch.setAttribute("role", "button");
			swatch.setAttribute("tabindex", "0");
			swatch.setAttribute(
				"aria-label",
				`${label}（未選択）- クリックして適用先に設定`,
			);
			swatch.title = `${label}（未選択）- クリックして適用先に設定`;
			swatch.style.cursor = "pointer";

			// クリックハンドラ
			swatch.addEventListener("click", () => {
				if (getSelectedApplyTarget() === target) {
					// 同じターゲットを再クリックで解除
					updateActiveState(swatch, null);
				} else {
					updateActiveState(swatch, target);
				}
			});
			// 初期アクティブ状態を設定
			if (getSelectedApplyTarget() === target) {
				swatch.classList.add("studio-toolbar-swatch--active");
			}
		} else {
			// 無効化時はクリック不可
			swatch.setAttribute("role", "img");
			swatch.setAttribute(
				"aria-label",
				`${label}（選択不可 - 前のスロットを先に選択してください）`,
			);
			swatch.title = `${label}（前のスロットを先に選択してください）`;
		}

		outerWrapper.appendChild(swatch);
		outerWrapper.appendChild(createSwatchLabel(label));

		return outerWrapper;
	};

	// ====================================
	// ヘッダーセクションにラベル付きスウォッチを追加
	// ====================================

	// 背景色スウォッチ（ポップオーバー付き）
	swatchesContainer.appendChild(
		createColorSwatchWithPopover(
			"背景色",
			state.lightBackgroundColor || "#ffffff",
			handleBackgroundColorChange,
			false,
		),
	);

	// テキスト色スウォッチ（ポップオーバー付き、zone-end）
	swatchesContainer.appendChild(
		createColorSwatchWithPopover(
			"文字色",
			state.darkBackgroundColor || "#000000",
			handleTextColorChange,
			true,
		),
	);

	// キーカラースウォッチ（ポップオーバー付き、編集可能）
	// キーカラーがない場合はデフォルト色を使用
	const primaryHex =
		state.manualColorSelection.keyColor || DEFAULT_MANUAL_KEY_COLOR;
	swatchesContainer.appendChild(
		createColorSwatchWithPopover(
			"キーカラー",
			primaryHex,
			handleKeyColorChange,
			false,
		),
	);

	// セカンダリースウォッチ（表示のみ、キーカラーから自動生成）
	const secondaryHex =
		state.manualColorSelection.secondaryColor || DEFAULT_MANUAL_SECONDARY_COLOR;
	swatchesContainer.appendChild(
		createFilledSwatch("セカンダリ", secondaryHex, false),
	);

	// ターシャリースウォッチ（表示のみ、キーカラーから自動生成、zone-end）
	const tertiaryHex =
		state.manualColorSelection.tertiaryColor || DEFAULT_MANUAL_TERTIARY_COLOR;
	swatchesContainer.appendChild(
		createFilledSwatch("ターシャリ", tertiaryHex, true),
	);

	// Accent 1〜4 スウォッチ（選択済み or プレースホルダー）
	// 連続選択制約: 常に4スロット表示、最初の空きスロットのみクリック可能
	const firstEmptyAccentIndex =
		state.manualColorSelection.accentColors.indexOf(null);

	// 常に4スロット表示（Studio Viewと統一）
	// 削除可能条件の計算用: 埋まっているアクセントの数と最後のインデックス
	const filledAccentIndices = state.manualColorSelection.accentColors
		.map((c, idx) => (c !== null ? idx : -1))
		.filter((idx) => idx !== -1);
	const filledAccentCount = filledAccentIndices.length;
	const lastFilledIndex =
		filledAccentIndices.length > 0
			? filledAccentIndices[filledAccentIndices.length - 1]
			: -1;

	for (let i = 1; i <= 4; i++) {
		const accentTarget = `accent-${i}` as ManualApplyTarget;
		// state.manualColorSelectionを直接参照（パレットは遅延生成される場合があるため）
		const accentHex = state.manualColorSelection.accentColors[i - 1];
		if (accentHex) {
			// 削除可能条件: 最後の非nullアクセント かつ アクセント数 > 2
			// (Studio Viewと同じルール: アクセント1,2は削除不可)
			const isLastFilled = i - 1 === lastFilledIndex;
			const canDelete = isLastFilled && filledAccentCount > 2;

			// 削除ハンドラを作成（クロージャでindexをキャプチャ）
			const deleteHandler = canDelete
				? () => {
						deleteAccentFromManualSelection(i - 1, () => {
							void renderManualView(container, callbacks);
						});
					}
				: undefined;
			swatchesContainer.appendChild(
				createFilledSwatch(
					`Acc${i}`,
					accentHex,
					false,
					accentTarget,
					deleteHandler,
				),
			);
		} else {
			// 連続選択制約: 最初の空きスロットのみクリック可能、それ以降は無効化
			const isDisabled =
				firstEmptyAccentIndex !== -1 && i - 1 > firstEmptyAccentIndex;
			swatchesContainer.appendChild(
				createPlaceholderSwatch(
					`Acc${i}`,
					false,
					isDisabled ? undefined : accentTarget,
					isDisabled,
				),
			);
		}
	}

	// スウォッチコンテナをヘッダーセクションに追加
	headerSection.appendChild(swatchesContainer);

	// ====================================
	// ヘッダーセクションをコンテナに追加
	// ====================================
	container.appendChild(headerSection);

	// ====================================
	// ツールバーに小さいスウォッチを追加（インジケーター用）
	// ====================================

	// 小さいスウォッチ作成ヘルパー（ラベルなし）
	const createSmallSwatch = (hex: string | null, isPlaceholder = false) => {
		const swatch = document.createElement("div");
		swatch.className = `studio-toolbar-swatch${isPlaceholder ? " studio-toolbar-swatch--placeholder" : ""}`;
		swatch.setAttribute("role", "img");
		const circle = document.createElement("span");
		circle.className = "studio-toolbar-swatch__circle";
		if (hex) {
			circle.style.backgroundColor = hex;
		}
		swatch.appendChild(circle);
		return swatch;
	};

	// 背景色・文字色インジケーター
	swatches.appendChild(
		createSmallSwatch(state.lightBackgroundColor || "#ffffff"),
	);
	swatches.appendChild(
		createSmallSwatch(state.darkBackgroundColor || "#000000"),
	);

	// キーカラー・セカンダリ・ターシャリインジケーター
	swatches.appendChild(
		createSmallSwatch(
			state.manualColorSelection.keyColor,
			!state.manualColorSelection.keyColor,
		),
	);
	swatches.appendChild(
		createSmallSwatch(
			state.manualColorSelection.secondaryColor,
			!state.manualColorSelection.secondaryColor,
		),
	);
	swatches.appendChild(
		createSmallSwatch(
			state.manualColorSelection.tertiaryColor,
			!state.manualColorSelection.tertiaryColor,
		),
	);

	// アクセントインジケーター
	for (const accentHex of state.manualColorSelection.accentColors) {
		swatches.appendChild(createSmallSwatch(accentHex, !accentHex));
	}

	// スウォッチとコントロール間のスペーサー
	const swatchSpacer = document.createElement("div");
	swatchSpacer.className = "studio-toolbar__swatch-spacer";
	swatchSpacer.setAttribute("aria-hidden", "true");
	swatches.appendChild(swatchSpacer);

	const controls = document.createElement("div");
	controls.className = "studio-toolbar__controls";

	// 共有リンクボタン
	const shareBtn = document.createElement("button");
	shareBtn.type = "button";
	shareBtn.className = "studio-share-btn dads-button";
	shareBtn.dataset.size = "sm";
	shareBtn.dataset.type = "text";
	shareBtn.innerHTML = `${LINK_ICON_SVG}共有リンク`;
	shareBtn.onclick = async () => {
		const url = buildManualShareUrl(state.manualColorSelection);
		const originalHTML = shareBtn.innerHTML;
		const ok = await copyTextToClipboard(url);
		setTemporaryButtonText(shareBtn, ok ? "コピー完了" : "コピー失敗", {
			resetHTML: originalHTML,
		});
	};

	// エクスポートボタン（Material Symbolアイコン付き）
	const exportBtn = document.createElement("button");
	exportBtn.type = "button";
	exportBtn.className = "studio-export-btn dads-button";
	exportBtn.dataset.size = "sm";
	exportBtn.dataset.type = "outline";
	exportBtn.innerHTML = EXPORT_BUTTON_CONTENT_HTML;

	controls.appendChild(shareBtn);
	controls.appendChild(exportBtn);
	toolbar.appendChild(swatches);
	toolbar.appendChild(controls);
	container.appendChild(toolbar);

	await renderManualDadsContent(container, callbacks);
}

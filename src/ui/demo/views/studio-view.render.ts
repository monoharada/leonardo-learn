import { findDadsColorByHex } from "@/core/tokens/dads-data-provider";
import type { DadsToken } from "@/core/tokens/types";
import { updateA11yIssueBadge } from "../a11y-drawer";
import { getDisplayHex, updateCVDScoreDisplay } from "../cvd-controls";
import { state, validateBackgroundColor } from "../state";
import type { StudioPresetType, StudioTheme } from "../types";
import { setTemporaryButtonText } from "../utils/button-feedback";
import {
	EXPORT_BUTTON_CONTENT_HTML,
	LINK_ICON_SVG,
} from "../utils/button-markup";
import { copyTextToClipboard } from "../utils/clipboard";
import type { DadsSnapResult } from "../utils/dads-snap";
import type { StudioViewCallbacks } from "./studio-view";
import {
	computePaletteColors,
	DEFAULT_STUDIO_BACKGROUND,
	getDadsInfoWithChromaName,
	getDadsTokens,
	isValidHex6,
	STUDIO_PRESET_LABELS,
	STUDIO_THEME_LABELS,
	setLockedColors,
} from "./studio-view.core";
import {
	generateNewStudioPalette,
	rebuildStudioPalettes,
	selectRandomAccentCandidates,
} from "./studio-view.generation";
import {
	appendAccentPlaceholders,
	appendPreviewAndA11ySummary,
} from "./studio-view.render-sections";
import {
	buildShareUrl,
	cloneValue,
	getLockStateForType,
	hasUndoSnapshot,
	popUndoSnapshot,
	pushUndoSnapshot,
	renderEmptyState,
} from "./studio-view.render-utils";
import { studioViewDeps } from "./studio-view-deps";

const studioRenderGeneration = new WeakMap<HTMLElement, number>();

// Stored reference for document-level popover click handler cleanup (prevents memory leak)
let popoverClickHandler: ((e: MouseEvent) => void) | null = null;

// Stored reference for document-level escape key handler cleanup (prevents memory leak)
let popoverEscapeHandler: ((e: KeyboardEvent) => void) | null = null;

export async function renderStudioView(
	container: HTMLElement,
	callbacks: StudioViewCallbacks,
): Promise<void> {
	// Cleanup orphaned popovers from previous render (prevents DOM accumulation)
	for (const orphan of document.querySelectorAll(
		'.studio-swatch-popover:not([data-manual-view="true"])',
	)) {
		orphan.remove();
	}

	const renderGeneration = (studioRenderGeneration.get(container) ?? 0) + 1;
	studioRenderGeneration.set(container, renderGeneration);
	const isCurrentRender = () =>
		studioRenderGeneration.get(container) === renderGeneration;

	let dadsTokens: DadsToken[];
	try {
		dadsTokens = await getDadsTokens();
	} catch (error) {
		console.error("Failed to load DADS tokens for studio view:", error);
		dadsTokens = [];
	}

	if (!isCurrentRender()) return;

	container.className = "dads-section dads-studio";
	container.innerHTML = "";
	container.style.backgroundColor = DEFAULT_STUDIO_BACKGROUND;

	const toolbar = document.createElement("section");
	toolbar.className = "studio-toolbar";
	toolbar.setAttribute("role", "region");
	toolbar.setAttribute("aria-label", "スタジオツールバー");

	const swatches = document.createElement("div");
	swatches.className = "studio-toolbar__swatches";

	const controls = document.createElement("div");
	controls.className = "studio-toolbar__controls";

	const settingsDetails = document.createElement("details");
	settingsDetails.className = "studio-settings";

	const settingsSummary = document.createElement("summary");
	settingsSummary.className = "studio-settings__summary dads-button";
	settingsSummary.dataset.size = "sm";
	settingsSummary.dataset.type = "text";
	settingsSummary.textContent = "設定";
	settingsDetails.style.marginLeft = "16px";

	const settingsPanel = document.createElement("div");
	settingsPanel.className = "studio-settings__panel";

	const createSettingGroup = (
		labelText: string,
		content: HTMLElement,
	): HTMLElement => {
		const row = document.createElement("div");
		row.className = "studio-settings__row";

		const label = document.createElement("span");
		label.className = "dads-label";
		label.textContent = labelText;

		row.appendChild(label);
		row.appendChild(content);
		return row;
	};

	const accentCountButtons = document.createElement("div");
	accentCountButtons.className = "dads-button-group";
	accentCountButtons.setAttribute("aria-label", "アクセント色数");

	([2, 3, 4] as const).forEach((count) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "dads-button";
		btn.dataset.size = "sm";
		btn.dataset.type = "text";
		btn.dataset.active = String(state.studioAccentCount === count);
		btn.textContent = String(count);
		btn.onclick = async () => {
			state.studioAccentCount = count;
			try {
				// 既存Primaryを維持しつつ、アクセントだけ再生成（必要な場合のみ）
				if (state.palettes.length > 0) {
					const current = computePaletteColors(dadsTokens, state.activePreset);
					const backgroundHex = DEFAULT_STUDIO_BACKGROUND;
					const existing = current.accentHexes;
					const desired = Math.max(2, Math.min(4, state.studioAccentCount));

					const keep = existing.slice(0, desired);
					const missing = desired - keep.length;

					let extra: DadsSnapResult[] = [];
					if (missing > 0) {
						const seed = (state.studioSeed || 0) ^ desired;
						const rnd = studioViewDeps.createSeededRandom(seed);
						const picked = await selectRandomAccentCandidates(
							current.primaryHex,
							state.activePreset,
							backgroundHex,
							desired,
							rnd,
						);
						const keepSet = new Set(keep.map((h) => h.toLowerCase()));
						extra = picked
							.filter((p) => !keepSet.has(p.hex.toLowerCase()))
							.slice(0, missing);
					}

					const accentCandidates = [
						...keep.map((hex) => {
							const dadsInfo = findDadsColorByHex(dadsTokens, hex);
							return { hex, step: dadsInfo?.scale };
						}),
						...extra,
					].slice(0, desired);

					const { baseChromaName: primaryBaseChromaName } =
						getDadsInfoWithChromaName(dadsTokens, current.primaryHex);
					await rebuildStudioPalettes({
						dadsTokens,
						primaryHex: current.primaryHex,
						primaryStep: current.primaryStep,
						primaryBaseChromaName,
						accentCandidates,
					});
				}
			} finally {
				void renderStudioView(container, callbacks);
			}
		};
		accentCountButtons.appendChild(btn);
	});

	const presetButtons = document.createElement("div");
	presetButtons.className = "dads-button-group";
	presetButtons.setAttribute("aria-label", "ジェネレートプリセット");

	(Object.keys(STUDIO_PRESET_LABELS) as StudioPresetType[]).forEach(
		(preset) => {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "dads-button";
			btn.dataset.size = "sm";
			btn.dataset.type = "text";
			btn.dataset.active = String(state.activePreset === preset);
			btn.textContent = STUDIO_PRESET_LABELS[preset];
			btn.onclick = () => {
				state.activePreset = preset;
				void renderStudioView(container, callbacks);
			};
			presetButtons.appendChild(btn);
		},
	);

	// テーマ選択ボタン
	const themeButtons = document.createElement("div");
	themeButtons.className = "dads-button-group";
	themeButtons.setAttribute("aria-label", "テーマ");

	(Object.keys(STUDIO_THEME_LABELS) as StudioTheme[]).forEach((theme) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "dads-button";
		btn.dataset.size = "sm";
		btn.dataset.type = "text";
		btn.dataset.active = String(state.studioTheme === theme);
		btn.textContent = STUDIO_THEME_LABELS[theme];
		btn.onclick = () => {
			state.studioTheme = theme;
			void renderStudioView(container, callbacks);
		};
		themeButtons.appendChild(btn);
	});

	settingsPanel.appendChild(
		createSettingGroup("アクセント色数", accentCountButtons),
	);
	settingsPanel.appendChild(createSettingGroup("テーマ", themeButtons));
	settingsPanel.appendChild(createSettingGroup("プリセット", presetButtons));

	settingsDetails.onkeydown = (event) => {
		if (event.key !== "Escape") return;
		event.preventDefault();
		settingsDetails.open = false;
		settingsSummary.focus();
	};

	settingsDetails.appendChild(settingsSummary);
	settingsDetails.appendChild(settingsPanel);

	const toast = document.createElement("div");
	toast.className = "studio-toast";
	toast.setAttribute("role", "status");
	toast.setAttribute("aria-live", "polite");
	toast.textContent = "これ以上履歴はありません";

	let toastTimeout: ReturnType<typeof setTimeout> | null = null;
	const showToast = () => {
		if (toastTimeout) clearTimeout(toastTimeout);
		toast.dataset.visible = "true";
		toastTimeout = setTimeout(() => {
			toast.dataset.visible = "false";
		}, 2000);
	};

	const undoBtn = document.createElement("button");
	undoBtn.type = "button";
	undoBtn.className = "studio-undo-btn dads-button";
	undoBtn.dataset.size = "sm";
	undoBtn.dataset.type = "outline";
	undoBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 2px;"><polyline points="15 18 9 12 15 6"></polyline></svg>戻る`;
	undoBtn.onclick = () => {
		if (!hasUndoSnapshot()) {
			showToast();
			return;
		}

		const snapshot = popUndoSnapshot();
		if (!snapshot) return;

		state.palettes = cloneValue(snapshot.palettes);
		state.activeId = snapshot.activeId;
		state.lockedColors = cloneValue(snapshot.lockedColors);
		state.activePreset = snapshot.activePreset;
		state.previewKv = cloneValue(snapshot.previewKv);
		state.studioSeed = snapshot.studioSeed;
		state.studioAccentCount = snapshot.studioAccentCount;

		const restored = computePaletteColors(dadsTokens, state.activePreset);
		const keyColorsInput = document.getElementById(
			"keyColors",
		) as HTMLInputElement | null;
		if (keyColorsInput) keyColorsInput.value = restored.primaryHex;

		updateCVDScoreDisplay();
		updateA11yIssueBadge();
		void renderStudioView(container, callbacks);
	};

	const generateBtn = document.createElement("button");
	generateBtn.type = "button";
	generateBtn.className = "studio-generate-btn dads-button";
	generateBtn.dataset.size = "sm";
	generateBtn.dataset.type = "solid-fill";
	generateBtn.innerHTML = `生成<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-left: 2px;"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
	generateBtn.onclick = async () => {
		try {
			pushUndoSnapshot();
			state.studioSeed = Date.now();
			await generateNewStudioPalette(dadsTokens);
			await renderStudioView(container, callbacks);
		} catch (error) {
			console.error("Failed to generate palette:", error);
		}
	};

	// Share button (moved from header to toolbar)
	const shareBtn = document.createElement("button");
	shareBtn.type = "button";
	shareBtn.className = "studio-share-btn dads-button";
	shareBtn.dataset.size = "sm";
	shareBtn.dataset.type = "text";
	shareBtn.innerHTML = `${LINK_ICON_SVG}共有リンク`;
	shareBtn.classList.add("studio-toolbar__share-btn");
	shareBtn.onclick = async () => {
		if (state.palettes.length === 0) return;

		const url = buildShareUrl(dadsTokens);
		const originalHTML = shareBtn.innerHTML;
		const ok = await copyTextToClipboard(url);
		setTemporaryButtonText(shareBtn, ok ? "コピー完了" : "コピー失敗", {
			resetHTML: originalHTML,
		});
	};

	// Export button with Material Symbol icon
	const exportBtn = document.createElement("button");
	exportBtn.type = "button";
	exportBtn.className = "studio-export-btn dads-button";
	exportBtn.dataset.size = "sm";
	exportBtn.dataset.type = "outline";
	exportBtn.innerHTML = EXPORT_BUTTON_CONTENT_HTML;
	exportBtn.onclick = () => {
		const exportDialog = document.getElementById(
			"export-dialog",
		) as HTMLDialogElement | null;
		if (exportDialog) exportDialog.showModal();
	};

	// UX最適化されたボタン配置:
	// [swatches] | [戻る | 生成] [設定] | [共有リンク] [エクスポート]
	controls.appendChild(undoBtn);
	controls.appendChild(generateBtn);
	controls.appendChild(settingsDetails);
	controls.appendChild(shareBtn);
	controls.appendChild(exportBtn);

	toolbar.appendChild(swatches);
	toolbar.appendChild(controls);
	container.appendChild(toolbar);
	container.appendChild(toast);

	if (state.palettes.length === 0 || dadsTokens.length === 0) {
		renderEmptyState(container);
		return;
	}

	const paletteColors = computePaletteColors(dadsTokens, state.activePreset);
	const bgHex = state.lightBackgroundColor || DEFAULT_STUDIO_BACKGROUND;

	const desiredAccentCount = Math.max(2, Math.min(4, state.studioAccentCount));
	const accentHexes = paletteColors.accentHexes.slice(0, desiredAccentCount);
	const rawAccentHexes =
		accentHexes.length > 0 ? accentHexes : [paletteColors.accentHex];

	// パステルプリセット時はアクセント色をコントラスト確保版に変換
	// プレビュー内のボタン・テキスト要素が読めるようにする
	const minContrast = studioViewDeps.resolvePresetMinContrast(
		state.activePreset,
	);
	const resolvedAccentHexes =
		state.activePreset === "pastel"
			? rawAccentHexes.map((hex) =>
					studioViewDeps.adjustLightnessForContrast(hex, bgHex, minContrast),
				)
			: rawAccentHexes;

	// Close any open popover when clicking outside
	let activePopover: HTMLElement | null = null;

	// Escape key listener management
	const addEscapeListener = () => {
		if (popoverEscapeHandler) return;
		popoverEscapeHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape" && activePopover) {
				e.preventDefault();
				closeActivePopover();
			}
		};
		document.addEventListener("keydown", popoverEscapeHandler);
	};

	const removeEscapeListener = () => {
		if (popoverEscapeHandler) {
			document.removeEventListener("keydown", popoverEscapeHandler);
			popoverEscapeHandler = null;
		}
	};

	const closeActivePopover = () => {
		if (activePopover) {
			activePopover.dataset.open = "false";
			activePopover.remove();
			activePopover = null;
			removeEscapeListener();
		}
	};

	// Remove previous handler to prevent memory leak from accumulating listeners
	if (popoverClickHandler) {
		document.removeEventListener("click", popoverClickHandler);
	}

	popoverClickHandler = (e: MouseEvent) => {
		if (activePopover) {
			const target = e.target as Node;
			// Check if click is inside the popover or any swatch
			const isInsidePopover = activePopover.contains(target);
			const isInsideSwatch = (target as Element).closest?.(
				".studio-toolbar-swatch",
			);
			if (!isInsidePopover && !isInsideSwatch) {
				closeActivePopover();
			}
		}
	};

	document.addEventListener("click", popoverClickHandler);

	const createColorPickerRow = (
		label: string,
		hex: string,
		circle: HTMLSpanElement,
		onColorChange: (newHex: string) => void,
	): HTMLElement => {
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

		colorPicker.oninput = (e) => {
			e.stopPropagation();
			const newHex = colorPicker.value;
			circle.style.backgroundColor = getDisplayHex(newHex);
			hexInput.value = newHex.toUpperCase();
			hexInput.classList.remove("studio-swatch-popover__hex-input--invalid");
			onColorChange(newHex);
		};

		hexInput.oninput = (e) => {
			e.stopPropagation();
			const input = hexInput.value.trim();
			const result = validateBackgroundColor(input);
			if (result.valid && result.hex) {
				circle.style.backgroundColor = getDisplayHex(result.hex);
				colorPicker.value = result.hex;
				hexInput.classList.remove("studio-swatch-popover__hex-input--invalid");
				onColorChange(result.hex);
			} else {
				hexInput.classList.add("studio-swatch-popover__hex-input--invalid");
			}
		};

		hexInput.onblur = () => {
			const input = hexInput.value.trim();
			const result = validateBackgroundColor(input);
			if (result.valid && result.hex) {
				hexInput.value = result.hex.toUpperCase();
				hexInput.classList.remove("studio-swatch-popover__hex-input--invalid");
			}
		};

		colorRow.appendChild(colorPicker);
		colorRow.appendChild(hexInput);
		return colorRow;
	};

	const createLockToggleRow = (
		lockType: "background" | "text" | "primary" | "accent",
		isLocked: boolean,
		wrapper: HTMLElement,
	): HTMLElement => {
		const lockRow = document.createElement("div");
		lockRow.className = "studio-swatch-popover__lock";

		const lockLabel = document.createElement("span");
		lockLabel.className = "studio-swatch-popover__lock-label";
		lockLabel.innerHTML = `<span>🔒</span><span>ロック</span>`;

		const toggle = document.createElement("button");
		toggle.type = "button";
		toggle.className = "studio-swatch-popover__toggle";
		toggle.dataset.checked = String(isLocked);
		toggle.setAttribute("aria-pressed", String(isLocked));
		toggle.setAttribute("aria-label", "ロック切り替え");
		toggle.onclick = (e) => {
			e.stopPropagation();
			const newLocked = toggle.dataset.checked !== "true";
			setLockedColors({ [lockType]: newLocked });
			toggle.dataset.checked = String(newLocked);
			toggle.setAttribute("aria-pressed", String(newLocked));
			const existingIndicator = wrapper.querySelector(
				".studio-toolbar-swatch__lock-indicator",
			);
			if (newLocked && !existingIndicator) {
				const lockIndicator = document.createElement("span");
				lockIndicator.className = "studio-toolbar-swatch__lock-indicator";
				lockIndicator.textContent = "🔒";
				wrapper.appendChild(lockIndicator);
			} else if (!newLocked && existingIndicator) {
				existingIndicator.remove();
			}
		};

		lockRow.appendChild(lockLabel);
		lockRow.appendChild(toggle);
		return lockRow;
	};

	const createToolbarSwatchWithPopover = (
		label: string,
		hex: string,
		lockType: "background" | "text" | "primary" | "accent" | null,
		onDelete?: () => void,
		onColorChange?: (newHex: string) => void,
		tokenName?: string,
	): HTMLElement => {
		const wrapper = document.createElement("div");
		wrapper.className = "studio-toolbar-swatch";
		wrapper.style.position = "relative";
		wrapper.setAttribute("role", "button");
		wrapper.setAttribute("tabindex", "0");
		wrapper.setAttribute("aria-label", `${label}: ${hex.toUpperCase()}`);

		const circle = document.createElement("span");
		circle.className = "studio-toolbar-swatch__circle";
		circle.style.backgroundColor = getDisplayHex(hex);
		wrapper.appendChild(circle);

		// Delete button for accent colors (not primary)
		if (onDelete) {
			const deleteBtn = document.createElement("button");
			deleteBtn.type = "button";
			deleteBtn.className = "studio-toolbar-swatch__delete";
			deleteBtn.setAttribute("aria-label", `${label}を削除`);
			deleteBtn.onclick = (e) => {
				e.stopPropagation();
				closeActivePopover();
				onDelete();
			};
			wrapper.appendChild(deleteBtn);
		}

		// Lock indicator
		const isLocked = getLockStateForType(lockType);
		if (isLocked) {
			const lockIndicator = document.createElement("span");
			lockIndicator.className = "studio-toolbar-swatch__lock-indicator";
			lockIndicator.textContent = "🔒";
			wrapper.appendChild(lockIndicator);
		}

		// Popover
		const popover = document.createElement("div");
		popover.className = "studio-swatch-popover";
		popover.dataset.open = "false";

		// Popover header with role label and close button
		const popoverHeader = document.createElement("div");
		popoverHeader.className = "studio-swatch-popover__header";

		const roleLabel = document.createElement("div");
		roleLabel.className = "studio-swatch-popover__role";
		roleLabel.textContent = label;
		popoverHeader.appendChild(roleLabel);

		const closeButton = document.createElement("button");
		closeButton.type = "button";
		closeButton.className = "studio-swatch-popover__close";
		closeButton.setAttribute("aria-label", "閉じる");
		closeButton.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
			<path d="M1 1L13 13M1 13L13 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
		</svg>`;
		closeButton.onclick = (e) => {
			e.stopPropagation();
			closeActivePopover();
		};
		popoverHeader.appendChild(closeButton);

		popover.appendChild(popoverHeader);

		// Color picker row (for background, text, primary)
		if (onColorChange) {
			popover.appendChild(
				createColorPickerRow(label, hex, circle, onColorChange),
			);
		}

		// Copy icon SVG template
		const copyIconSvg = `<svg class="studio-swatch-popover__copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
		</svg>`;

		// Hex code copy button
		const hexBtn = document.createElement("button");
		hexBtn.type = "button";
		hexBtn.className = "studio-swatch-popover__copy-btn";
		const displayHex = hex.toUpperCase();
		hexBtn.innerHTML = `<span>${displayHex}</span>${copyIconSvg}`;
		hexBtn.onclick = async (e) => {
			e.stopPropagation();
			const currentHex = onColorChange ? circle.style.backgroundColor : hex;
			const hexToCopy = currentHex.startsWith("#")
				? currentHex.toUpperCase()
				: hex.toUpperCase();
			const ok = await copyTextToClipboard(hexToCopy);
			const originalHtml = hexBtn.innerHTML;
			hexBtn.innerHTML = `<span>${ok ? "コピー完了" : "失敗"}</span>`;
			setTimeout(() => {
				hexBtn.innerHTML = originalHtml;
			}, 1500);
		};
		popover.appendChild(hexBtn);

		// Token name copy button (if available)
		if (tokenName) {
			const tokenBtn = document.createElement("button");
			tokenBtn.type = "button";
			tokenBtn.className =
				"studio-swatch-popover__copy-btn studio-swatch-popover__copy-btn--token";
			tokenBtn.innerHTML = `<span>${tokenName}</span>${copyIconSvg}`;
			tokenBtn.onclick = async (e) => {
				e.stopPropagation();
				const ok = await copyTextToClipboard(tokenName);
				const originalHtml = tokenBtn.innerHTML;
				tokenBtn.innerHTML = `<span>${ok ? "コピー完了" : "失敗"}</span>`;
				setTimeout(() => {
					tokenBtn.innerHTML = originalHtml;
				}, 1500);
			};
			popover.appendChild(tokenBtn);
		}

		// Lock toggle (for background, text, primary, accent)
		if (lockType) {
			popover.appendChild(createLockToggleRow(lockType, isLocked, wrapper));
		}

		// Popover is appended to body to avoid transform issues
		// (toolbar has transform which creates new containing block for fixed elements)

		// Click to toggle popover
		wrapper.onclick = (e) => {
			e.stopPropagation();
			if (activePopover && activePopover !== popover) {
				closeActivePopover();
			}
			const isOpen = popover.dataset.open === "true";
			if (!isOpen) {
				// Append to body to escape toolbar's transform context
				document.body.appendChild(popover);
				// Position the popover above the swatch using fixed positioning
				// CSS transform: translateX(-50%) handles horizontal centering
				const rect = wrapper.getBoundingClientRect();
				popover.style.left = `${rect.left + rect.width / 2}px`;
				popover.style.bottom = `${window.innerHeight - rect.top + 8}px`;
				popover.dataset.open = "true";
				activePopover = popover;
				addEscapeListener();
			} else {
				popover.dataset.open = "false";
				popover.remove();
				activePopover = null;
				removeEscapeListener();
			}
		};

		// Keyboard support
		wrapper.onkeydown = (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				wrapper.click();
			} else if (e.key === "Escape") {
				closeActivePopover();
			}
		};

		return wrapper;
	};

	swatches.innerHTML = "";

	// Background color swatch (before Primary)
	const handleBackgroundColorChange = (newHex: string) => {
		if (!isValidHex6(newHex)) return;
		state.lightBackgroundColor = newHex;
		// Update preview
		void renderStudioView(container, callbacks);
	};
	swatches.appendChild(
		createToolbarSwatchWithPopover(
			"背景色",
			state.lightBackgroundColor || DEFAULT_STUDIO_BACKGROUND,
			"background",
			undefined,
			handleBackgroundColorChange,
		),
	);

	// Text color swatch (before Primary)
	const handleTextColorChange = (newHex: string) => {
		if (!isValidHex6(newHex)) return;
		state.darkBackgroundColor = newHex;
		// Update preview
		void renderStudioView(container, callbacks);
	};
	const textSwatch = createToolbarSwatchWithPopover(
		"テキスト色",
		state.darkBackgroundColor || "#000000",
		"text",
		undefined,
		handleTextColorChange,
	);
	textSwatch.classList.add("studio-toolbar-swatch--zone-end");
	swatches.appendChild(textSwatch);

	// Primary color swatch (with color picker)
	const handlePrimaryColorChange = async (newHex: string) => {
		if (!isValidHex6(newHex)) return;
		const { dadsInfo, baseChromaName } = getDadsInfoWithChromaName(
			dadsTokens,
			newHex,
		);
		await rebuildStudioPalettes({
			dadsTokens,
			primaryHex: newHex,
			primaryStep: dadsInfo?.scale,
			primaryBaseChromaName: baseChromaName,
			accentCandidates: paletteColors.accentHexes.map((hex) => {
				const info = findDadsColorByHex(dadsTokens, hex);
				return { hex, step: info?.scale };
			}),
		});
		void renderStudioView(container, callbacks);
	};
	const primaryDadsInfo = findDadsColorByHex(
		dadsTokens,
		paletteColors.primaryHex,
	);
	const primarySwatch = createToolbarSwatchWithPopover(
		"キーカラー",
		paletteColors.primaryHex,
		"primary",
		undefined,
		handlePrimaryColorChange,
		primaryDadsInfo?.token.id,
	);
	swatches.appendChild(primarySwatch);

	// Secondary color swatch (if exists)
	if (paletteColors.secondaryHex) {
		const secondaryDadsInfo = findDadsColorByHex(
			dadsTokens,
			paletteColors.secondaryHex,
		);
		const secondarySwatch = createToolbarSwatchWithPopover(
			"セカンダリ",
			paletteColors.secondaryHex,
			null,
			undefined,
			undefined,
			secondaryDadsInfo?.token.id,
		);
		swatches.appendChild(secondarySwatch);
	}

	// Tertiary color swatch (if exists) with zone-end
	if (paletteColors.tertiaryHex) {
		const tertiaryDadsInfo = findDadsColorByHex(
			dadsTokens,
			paletteColors.tertiaryHex,
		);
		const tertiarySwatch = createToolbarSwatchWithPopover(
			"ターシャリ",
			paletteColors.tertiaryHex,
			null,
			undefined,
			undefined,
			tertiaryDadsInfo?.token.id,
		);
		tertiarySwatch.classList.add("studio-toolbar-swatch--zone-end");
		swatches.appendChild(tertiarySwatch);
	} else if (paletteColors.secondaryHex) {
		// Secondaryはあるがtertiaryがない場合、最後のswatchにzone-endを付ける
		const lastSwatch = swatches.lastElementChild;
		if (lastSwatch) {
			lastSwatch.classList.add("studio-toolbar-swatch--zone-end");
		}
	} else {
		// Secondary/Tertiaryがない場合、Primaryにzone-endを付ける
		primarySwatch.classList.add("studio-toolbar-swatch--zone-end");
	}

	// Helper to decrease accent count (for delete button)
	const handleDeleteAccent = async () => {
		if (state.studioAccentCount <= 2) return;
		pushUndoSnapshot();
		state.studioAccentCount = Math.max(2, state.studioAccentCount - 1) as
			| 2
			| 3
			| 4;
		await renderStudioView(container, callbacks);
	};

	for (let i = 0; i < resolvedAccentHexes.length; i++) {
		const hex = resolvedAccentHexes[i];
		if (!hex) continue;
		// Only first accent can be locked (same as before)
		const lockType = i === 0 ? "accent" : null;
		// Delete button only on the LAST accent, and only if count > 2 (minimum required)
		const isLastAccent = i === resolvedAccentHexes.length - 1;
		const canDelete = isLastAccent && state.studioAccentCount > 2;
		const accentDadsInfo = findDadsColorByHex(dadsTokens, hex);
		swatches.appendChild(
			createToolbarSwatchWithPopover(
				`Accent ${i + 1}`,
				hex,
				lockType as "accent" | null,
				canDelete ? handleDeleteAccent : undefined,
				undefined,
				accentDadsInfo?.token.id,
			),
		);
	}

	appendAccentPlaceholders({
		swatches,
		resolvedAccentHexes,
		dadsTokens,
		rerender: () => renderStudioView(container, callbacks),
	});

	// Add spacer between swatches and controls (one swatch width)
	const swatchSpacer = document.createElement("div");
	swatchSpacer.className = "studio-toolbar__swatch-spacer";
	swatchSpacer.setAttribute("aria-hidden", "true");
	swatches.appendChild(swatchSpacer);

	appendPreviewAndA11ySummary({
		container,
		paletteColors,
		resolvedAccentHexes,
		bgHex,
	});
}

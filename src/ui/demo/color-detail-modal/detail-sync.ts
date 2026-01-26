import { getAPCA } from "@/accessibility/apca";
import { verifyContrast } from "@/accessibility/wcag2";
import { Color } from "@/core/color";
import { STEP_NAMES } from "@/ui/style-constants";
import { determineColorMode, state } from "../state";
import type { PaletteConfig } from "../types";

/**
 * パレット情報
 */
interface PaletteInfo {
	name: string;
	baseChromaName?: string;
	/** パレットID（名前編集時に必要） */
	paletteId?: string;
	step?: number;
}

/**
 * トークン情報を計算する
 *
 * @param _color 色
 * @param selectedIndex 選択されたインデックス
 * @param paletteInfo パレット情報
 * @param keyIndex キーインデックス
 * @param scaleNames カラーストリップの各色の名前配列（カスタムキーカラー用）
 */
export function calculateTokenInfo(
	_color: Color,
	selectedIndex: number,
	paletteInfo: PaletteInfo,
	keyIndex = 0,
	scaleNames?: string[],
): {
	tokenName: string;
	step: number;
	chromaDisplayName: string;
} {
	const tokenIndex = selectedIndex >= 0 ? selectedIndex : keyIndex;
	const step = STEP_NAMES[tokenIndex] ?? 600;

	// カスタムキーカラー（names配列あり）の場合はトークン名を空にする
	if (scaleNames && scaleNames.length > 0) {
		// 選択されたインデックスに対応する名前を使用
		const nameIndex = selectedIndex >= 0 ? selectedIndex : keyIndex;
		const chromaDisplayName = scaleNames[nameIndex] ?? paletteInfo.name;
		return {
			tokenName: "", // カスタムキーカラーにはDADSトークン名がない
			step,
			chromaDisplayName,
		};
	}

	const chromaNameLower = (
		paletteInfo.baseChromaName ||
		paletteInfo.name ||
		"color"
	)
		.toLowerCase()
		.replace(/\s+/g, "-");

	// Issue #41: Display only the token name without baseChromaName
	// e.g., "アクセントカラー 1" instead of "Red | アクセント 1"
	const chromaDisplayName = paletteInfo.name;

	return {
		tokenName: `${chromaNameLower}-${step}`,
		step,
		chromaDisplayName,
	};
}

/** コントラストレベル判定の閾値テーブル */
const CONTRAST_GRADES: {
	minRatio: number;
	level: "success" | "warning" | "error";
	badgeText: string;
}[] = [
	{ minRatio: 7.0, level: "success", badgeText: "AAA" },
	{ minRatio: 4.5, level: "success", badgeText: "AA" },
	{ minRatio: 3.0, level: "warning", badgeText: "Large Text" },
	{ minRatio: 0, level: "error", badgeText: "Fail" },
];

/**
 * コントラスト情報を計算する
 */
export function calculateContrastInfo(
	foreground: Color,
	background: Color,
): {
	ratio: number;
	apca: number;
	level: "success" | "warning" | "error";
	badgeText: string;
} {
	const wcag = verifyContrast(foreground, background);
	const apca = getAPCA(foreground, background);
	const ratio = Math.round(wcag.contrast * 100) / 100;
	const lc = Math.round(apca);

	const grade =
		CONTRAST_GRADES.find((g) => ratio >= g.minRatio) ??
		CONTRAST_GRADES[CONTRAST_GRADES.length - 1];

	// 注: CONTRAST_GRADES は空配列ではないため、grade は必ず存在する
	// TypeScript の型推論のため、フォールバック値を提供
	const level = grade?.level ?? "error";
	const badgeText = grade?.badgeText ?? "Fail";

	return {
		ratio,
		apca: lc,
		level,
		badgeText,
	};
}

/**
 * コントラストカードの背景色とテキスト色を更新する
 *
 * @param prefix - 要素IDのプレフィックス（"white" または "black"）
 * @param bgHex - 背景色のHEX値
 */
function updateContrastCardStyling(prefix: string, bgHex: string): void {
	const cardEl = document.getElementById(`detail-${prefix}-card`);
	const labelEl = document.getElementById(`detail-${prefix}-label`);

	if (!cardEl) return;

	cardEl.style.backgroundColor = bgHex;

	const mode = determineColorMode(bgHex);
	cardEl.dataset.bg = "custom";
	cardEl.dataset.mode = mode;

	// テキスト色の決定
	const textColor = mode === "light" ? "#1a1a1a" : "#ffffff";
	const labelColor = mode === "light" ? "#666666" : "#aaaaaa";
	const unitColor = mode === "light" ? "#888888" : "#cccccc";
	const failColor = mode === "light" ? "#dc2626" : "#fca5a5";

	// ラベル色
	if (labelEl) {
		labelEl.style.color = labelColor;
	}

	// コントラスト比テキスト色
	const ratioEl = document.getElementById(`detail-${prefix}-ratio`);
	if (ratioEl) {
		ratioEl.style.color = textColor;
	}

	// 単位テキスト色
	const unitEl = cardEl.querySelector(".dads-contrast-card__unit");
	if (unitEl instanceof HTMLElement) {
		unitEl.style.color = unitColor;
	}

	// 失敗アイコン色
	const failEl = document.getElementById(`detail-${prefix}-fail-icon`);
	if (failEl) {
		failEl.style.color = failColor;
	}

	// ダーク背景のバッジ枠線色
	const badgeEl = document.getElementById(`detail-${prefix}-badge`);
	if (badgeEl) {
		badgeEl.style.borderColor =
			mode === "dark" ? "rgba(255, 255, 255, 0.3)" : "";
	}
}

/**
 * パレット配列内のマッチするパレットのkeyColorsを更新する
 */
export function syncPalette(
	palettes: PaletteConfig[],
	newKeyColorHex: string,
	paletteInfo: PaletteInfo,
): void {
	const match = palettes.find((other) => {
		if (paletteInfo.baseChromaName && other.baseChromaName) {
			return paletteInfo.baseChromaName === other.baseChromaName;
		}
		return paletteInfo.name === other.name;
	});

	if (match) {
		match.keyColors = [newKeyColorHex];
	}
}

/**
 * パレット名編集UIをセットアップする
 *
 * @param paletteInfo パレット情報
 * @param onRenderMain 再描画コールバック
 * @param signal AbortSignal（イベントリスナーのクリーンアップ用）
 */
export function setupPaletteNameEditing(
	paletteInfo: PaletteInfo,
	onRenderMain: () => void,
	signal: AbortSignal,
): void {
	const editBtn = document.getElementById("detail-name-edit-btn");
	const nameInput = document.getElementById(
		"detail-name-input",
	) as HTMLInputElement | null;
	const chromaName = document.getElementById("detail-chroma-name");

	// パレットIDがない場合は編集ボタンを非表示
	// NOTE: readOnlyはスクラバー（色相調整）用で、名前編集には影響しない
	if (!paletteInfo.paletteId) {
		if (editBtn) editBtn.style.display = "none";
		if (nameInput) nameInput.style.display = "none";
		return;
	}

	if (!editBtn || !nameInput || !chromaName) return;

	// 編集ボタンを表示
	editBtn.style.display = "";
	nameInput.style.display = "none";

	// 編集モードに入る
	const enterEditMode = () => {
		// パレットの現在の名前を取得（baseChromaNameは除く）
		const currentName = paletteInfo.name;
		nameInput.value = currentName;
		nameInput.style.display = "";
		chromaName.style.display = "none";
		editBtn.style.display = "none";
		nameInput.focus();
		nameInput.select();
	};

	// 編集モードを終了して保存
	const saveEdit = () => {
		const newName = nameInput.value.trim();
		if (newName && newName !== paletteInfo.name && paletteInfo.paletteId) {
			// パレットの名前を更新
			const palette = state.palettes.find(
				(p) => p.id === paletteInfo.paletteId,
			);
			if (palette) {
				palette.name = newName;
				paletteInfo.name = newName;
			}

			// シェードパレットも更新
			const shadesPalette = state.shadesPalettes.find(
				(p) => p.id === paletteInfo.paletteId,
			);
			if (shadesPalette) {
				shadesPalette.name = newName;
			}

			// 変更を反映するため再描画
			onRenderMain();
		}

		// 表示を戻す
		nameInput.style.display = "none";
		chromaName.style.display = "";
		editBtn.style.display = "";
	};

	// 編集をキャンセル
	const cancelEdit = () => {
		nameInput.style.display = "none";
		chromaName.style.display = "";
		editBtn.style.display = "";
	};

	editBtn.addEventListener("click", enterEditMode, { signal });

	nameInput.addEventListener(
		"keydown",
		(e) => {
			if (e.key === "Enter") {
				saveEdit();
			} else if (e.key === "Escape") {
				cancelEdit();
			}
		},
		{ signal },
	);

	nameInput.addEventListener("blur", saveEdit, { signal });
}

/**
 * updateDetailハンドラの設定
 */
interface UpdateDetailHandlerConfig {
	fixedScale: {
		colors: Color[];
		keyIndex: number;
		hexValues?: string[];
		/** 各色の表示名（カスタムキーカラー用） */
		names?: string[];
	};
	paletteInfo: PaletteInfo;
	readOnly: boolean;
	keyColor: Color;
	drawScrubber: () => void;
	getCurrentColor: () => Color;
	setCurrentColor: (color: Color) => void;
	onRenderMain: () => void;
}

/**
 * updateDetailハンドラのインターフェース
 */
interface UpdateDetailHandler {
	updateDetail: (
		color: Color,
		selectedIndex: number,
		hexOverride?: string,
	) => void;
	getSelectedScaleIndex: () => number;
	setSelectedScaleIndex: (index: number) => void;
	isReadOnly: () => boolean;
}

/**
 * updateDetailハンドラを作成する
 */
export function createUpdateDetailHandler(
	config: UpdateDetailHandlerConfig,
): UpdateDetailHandler {
	let selectedScaleIndex = config.fixedScale.keyIndex;

	const updateDetail = (
		color: Color,
		selectedIndex: number,
		hexOverride?: string,
	): void => {
		config.setCurrentColor(color);
		const colorL = color.oklch.l as number;

		const detailSwatch = document.getElementById("detail-swatch");
		const detailTokenName = document.getElementById("detail-token-name");
		const detailHex = document.getElementById("detail-hex");
		const detailLightness = document.getElementById("detail-lightness");
		const detailChromaName = document.getElementById("detail-chroma-name");

		const { keyIndex, hexValues, names } = config.fixedScale;
		const tokenInfo = calculateTokenInfo(
			color,
			selectedIndex,
			config.paletteInfo,
			keyIndex,
			names,
		);

		if (detailSwatch) detailSwatch.style.backgroundColor = color.toCss();
		// トークン名が空の場合は非表示にする（カスタムキーカラーの場合）
		if (detailTokenName) {
			detailTokenName.textContent = tokenInfo.tokenName;
			detailTokenName.style.display = tokenInfo.tokenName ? "" : "none";
		}

		// 元のHEX値を優先して使用（変換誤差回避）
		const displayHex =
			hexOverride ??
			(hexValues && selectedIndex >= 0 ? hexValues[selectedIndex] : null) ??
			color.toHex();
		if (detailHex) detailHex.textContent = displayHex;
		if (detailLightness) {
			detailLightness.textContent = `${Math.round(colorL * 100)}% L`;
		}
		if (detailChromaName) {
			detailChromaName.textContent = tokenInfo.chromaDisplayName;
		}

		// "Set as key color" button
		const setKeyColorBtn = document.getElementById(
			"set-key-color-btn",
		) as HTMLButtonElement;
		if (setKeyColorBtn) {
			if (config.readOnly) {
				setKeyColorBtn.style.display = "none";
			} else {
				setKeyColorBtn.style.display = "";
				const paletteName =
					config.paletteInfo.name || config.paletteInfo.baseChromaName || "";
				setKeyColorBtn.textContent = `${color.toHex()} を ${paletteName} のパレットの色に指定`;
				setKeyColorBtn.onclick = () => {
					const newKeyColorHex = color.toHex();
					syncPalette(state.palettes, newKeyColorHex, config.paletteInfo);
					syncPalette(state.shadesPalettes, newKeyColorHex, config.paletteInfo);

					const dialog = document.getElementById(
						"color-detail-dialog",
					) as HTMLDialogElement;
					if (dialog) dialog.close();
					config.onRenderMain();
				};
			}
		}

		// Contrast cards - use light/dark background colors from state
		updateContrastCard(color, state.lightBackgroundColor, "white");
		updateContrastCard(color, state.darkBackgroundColor, "black");

		// Update card labels to show actual background colors
		const whiteLabelEl = document.getElementById("detail-white-label");
		const blackLabelEl = document.getElementById("detail-black-label");
		if (whiteLabelEl) {
			whiteLabelEl.textContent = `${state.lightBackgroundColor.toUpperCase()} に対するコントラスト`;
		}
		if (blackLabelEl) {
			blackLabelEl.textContent = `${state.darkBackgroundColor.toUpperCase()} に対するコントラスト`;
		}

		// Update contrast card styling for both light and dark backgrounds
		updateContrastCardStyling("white", state.lightBackgroundColor);
		updateContrastCardStyling("black", state.darkBackgroundColor);

		// Preferred card highlighting - use actual background colors
		const whiteContrastVal = verifyContrast(
			color,
			new Color(state.lightBackgroundColor),
		).contrast;
		const blackContrastVal = verifyContrast(
			color,
			new Color(state.darkBackgroundColor),
		).contrast;
		const whiteCard = document.getElementById("detail-white-card");
		const blackCard = document.getElementById("detail-black-card");

		if (whiteCard && blackCard) {
			if (whiteContrastVal >= blackContrastVal) {
				whiteCard.dataset.preferred = "true";
				delete blackCard.dataset.preferred;
			} else {
				blackCard.dataset.preferred = "true";
				delete whiteCard.dataset.preferred;
			}
		}

		// Redraw scrubber
		config.drawScrubber();

		// Mini scale
		const miniScale = document.getElementById("detail-mini-scale");
		if (miniScale) {
			miniScale.innerHTML = "";
			const { colors: scaleColors, keyIndex: originalKeyIndex } =
				config.fixedScale;
			const currentHighlightIndex =
				selectedScaleIndex >= 0 ? selectedScaleIndex : originalKeyIndex;

			scaleColors.forEach((c, i) => {
				const div = document.createElement("button");
				div.type = "button";
				div.className = "dads-mini-scale__item";
				div.style.backgroundColor = c.toCss();
				div.setAttribute("aria-label", `Color ${c.toHex()}`);

				div.onclick = () => {
					selectedScaleIndex = i;
					updateDetail(c, i);
				};

				if (i === currentHighlightIndex) {
					const check = document.createElement("div");
					check.className = "dads-mini-scale__check";
					check.textContent = "✓";
					check.style.color =
						c.contrast(new Color("#fff")) > 4.5 ? "white" : "black";
					div.appendChild(check);
				}

				miniScale.appendChild(div);
			});
		}
	};

	return {
		updateDetail,
		getSelectedScaleIndex: () => selectedScaleIndex,
		setSelectedScaleIndex: (index: number) => {
			selectedScaleIndex = index;
		},
		isReadOnly: () => config.readOnly,
	};
}

/**
 * コントラストカードを更新する
 */
export function updateContrastCard(
	foreground: Color,
	bgHex: string,
	prefix: string,
): void {
	const bgColor = new Color(bgHex);
	const info = calculateContrastInfo(foreground, bgColor);

	const badge = document.getElementById(`detail-${prefix}-badge`);
	const ratioEl = document.getElementById(`detail-${prefix}-ratio`);
	const apcaEl = document.getElementById(`detail-${prefix}-apca`);
	const preview = document.getElementById(`detail-${prefix}-preview`);
	const previewLarge = document.getElementById(
		`detail-${prefix}-preview-large`,
	);
	const failIcon = document.getElementById(`detail-${prefix}-fail-icon`);

	if (ratioEl) ratioEl.textContent = `${info.ratio}`;
	if (apcaEl) apcaEl.textContent = `${info.apca}`;

	if (preview) {
		preview.style.backgroundColor = foreground.toCss();
		preview.style.color = bgHex;
	}
	if (previewLarge) {
		previewLarge.style.backgroundColor = foreground.toCss();
		previewLarge.style.color = bgHex;
	}

	if (badge) {
		badge.textContent = info.badgeText;
		badge.dataset.level = info.level;
		if (failIcon) {
			failIcon.style.display = info.level === "error" ? "block" : "none";
		}
	}
}

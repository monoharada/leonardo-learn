/**
 * パレットビューモジュール
 *
 * パレット詳細画面のレンダリングを担当する。
 * カードクリック時はonColorClickコールバック経由でcolor-detail-modalと接続する。
 *
 * @module @/ui/demo/views/palette-view
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 5.1, 6.3, 6.4
 */

import { simulateCVD } from "@/accessibility/cvd-simulator";
import { Color } from "@/core/color";
import { findColorForContrast } from "@/core/solver";
import {
	getDadsColorsByHue,
	getDadsHueFromDisplayName,
	loadDadsTokens,
} from "@/core/tokens/dads-data-provider";
import {
	createCudBadge,
	type PaletteColor,
	showPaletteValidation,
	snapToCudColor,
} from "@/ui/cud-components";
import { getContrastRatios, STEP_NAMES } from "@/ui/style-constants";
import { createBackgroundColorSelector } from "../background-color-selector";
import { parseKeyColor, persistBackgroundColors, state } from "../state";
import type { ColorDetailModalOptions, CVDType, PaletteConfig } from "../types";

/**
 * パレットビューのコールバック
 */
export interface PaletteViewCallbacks {
	/** 色クリック時のコールバック（モーダル表示用） */
	onColorClick: (options: ColorDetailModalOptions) => void;
}

/**
 * 空状態のメッセージを表示する
 */
function renderEmptyState(container: HTMLElement, viewName: string): void {
	const empty = document.createElement("div");
	empty.className = "dads-empty-state";
	empty.innerHTML = `
		<p>${viewName}が生成されていません</p>
		<p>ハーモニービューでスタイルを選択してパレットを生成してください。</p>
	`;
	container.innerHTML = "";
	container.appendChild(empty);
}

/**
 * CVDシミュレーションを適用する
 */
function applySimulation(color: Color): Color {
	if (state.cvdSimulation === "normal") {
		return color;
	}
	return simulateCVD(color, state.cvdSimulation as CVDType);
}

/**
 * セマンティックカテゴリを取得する
 */
function getSemanticCategory(name: string): string {
	if (name === "Primary" || name.startsWith("Primary")) return "Primary";
	if (name.startsWith("Success")) return "Success";
	if (name.startsWith("Error")) return "Error";
	if (name.startsWith("Warning")) return "Warning";
	if (name.startsWith("Link")) return "Link";
	if (name.startsWith("Accent")) return "Accent";
	if (name === "Neutral" || name === "Neutral Variant") return "Neutral";
	if (name === "Secondary") return "Secondary";
	return name;
}

/**
 * 固定スケールを計算する
 *
 * Requirements: 5.1 - 背景色に対するコントラスト計算
 */
function calculateFixedScale(
	keyColor: Color,
	palette: PaletteConfig,
	definedStep: number | undefined,
	dadsTokens: Awaited<ReturnType<typeof loadDadsTokens>> | null,
): {
	colors: Color[];
	keyIndex: number;
	hexValues: string[];
	isBrandColor?: boolean;
} {
	const isPrimary =
		palette.name === "Primary" || palette.name?.startsWith("Primary");
	// Requirements: 5.1 - ライト背景色を使用
	const bgColor = new Color(state.lightBackgroundColor);

	// Primaryはブランドカラー：シェードなしで単一色のみ返す
	if (isPrimary) {
		return {
			colors: [keyColor],
			keyIndex: 0,
			hexValues: [keyColor.toHex()],
			isBrandColor: true,
		};
	}

	// DADSモード判定
	const dadsStep = palette.step ?? definedStep;
	if (palette.baseChromaName && dadsTokens) {
		const dadsHue = getDadsHueFromDisplayName(palette.baseChromaName);

		if (dadsHue) {
			const colorScale = getDadsColorsByHue(dadsTokens, dadsHue);
			// colorScale.colorsは50→1200の順（明→暗）だが、
			// STEP_NAMESは1200→50の順（暗→明）なので逆順にする
			const colors = colorScale.colors.map((c) => new Color(c.hex)).reverse();
			const hexValues = colorScale.colors.map((c) => c.hex).reverse();

			let keyColorIndex = dadsStep
				? STEP_NAMES.findIndex((s) => s === dadsStep)
				: 6;
			if (keyColorIndex === -1) keyColorIndex = 6;

			return { colors, keyIndex: keyColorIndex, hexValues };
		}
	}

	// フォールバック: 従来のロジック
	const baseRatios = getContrastRatios(state.contrastIntensity);
	const keyContrastRatio = keyColor.contrast(bgColor);

	let keyColorIndex = -1;
	let minDiff = Number.POSITIVE_INFINITY;
	for (let i = 0; i < baseRatios.length; i++) {
		const diff = Math.abs((baseRatios[i] ?? 0) - keyContrastRatio);
		if (diff < minDiff) {
			minDiff = diff;
			keyColorIndex = i;
		}
	}
	if (keyColorIndex >= 0) {
		baseRatios[keyColorIndex] = keyContrastRatio;
	}

	const colors: Color[] = baseRatios.map((ratio, i) => {
		if (i === keyColorIndex) return keyColor;
		const solved = findColorForContrast(keyColor, bgColor, ratio);
		return solved || keyColor;
	});

	colors.reverse();
	const hexValues = colors.map((c) => c.toHex());
	const reversedKeyIndex = colors.length - 1 - keyColorIndex;

	return { colors, keyIndex: reversedKeyIndex, hexValues };
}

/**
 * パレットカードを作成する
 */
function createPaletteCard(
	palette: PaletteConfig,
	keyColor: Color,
	keyColorIndex: number,
	fixedScale: {
		colors: Color[];
		keyIndex: number;
		hexValues?: string[];
		isBrandColor?: boolean;
	},
	definedStep: number | undefined,
	callbacks: PaletteViewCallbacks,
): HTMLButtonElement {
	const card = document.createElement("button");
	card.type = "button";
	card.className = "dads-card";
	card.dataset.interactive = "true";

	const isPrimary =
		palette.name === "Primary" || palette.name?.startsWith("Primary");

	// DADSトークンの正確なHEX値を優先使用（Color変換による誤差を回避）
	// fixedScale.hexValuesがある場合はそれを使用、なければkeyColor.toHex()にフォールバック
	let displayHex =
		fixedScale.hexValues?.[fixedScale.keyIndex] ?? keyColor.toHex();
	let snapInfo: { snapped: boolean; originalHex: string } | null = null;
	if (state.cudMode === "strict") {
		const snapResult = snapToCudColor(displayHex, { mode: "strict" });
		snapInfo = { snapped: snapResult.snapped, originalHex: displayHex };
		displayHex = snapResult.hex;
	}

	// CVDシミュレーションを適用
	const displayColor = applySimulation(new Color(displayHex));

	// スウォッチ
	const swatch = document.createElement("div");
	swatch.className = "dads-card__swatch";
	swatch.style.backgroundColor = displayColor.toCss();

	// 情報セクション
	const info = document.createElement("div");
	info.className = "dads-card__body";

	// ステップを計算
	const step = palette.step ?? definedStep ?? STEP_NAMES[keyColorIndex] ?? 600;

	// トークン名
	const tokenName = document.createElement("h3");
	if (isPrimary) {
		tokenName.textContent = "Brand Color";
	} else {
		const chromaNameLower = (palette.baseChromaName || palette.name || "color")
			.toLowerCase()
			.replace(/\s+/g, "-");
		tokenName.textContent = `${chromaNameLower}-${step}`;
	}
	tokenName.className = "dads-card__title";

	// HEXコード
	const hexCode = document.createElement("code");
	hexCode.textContent = displayHex;
	hexCode.className = "dads-text-mono";

	info.appendChild(tokenName);
	info.appendChild(hexCode);

	// strictモードでスナップされた場合は元の色を表示
	if (snapInfo?.snapped) {
		const originalHexCode = document.createElement("code");
		originalHexCode.textContent = `(元: ${snapInfo.originalHex})`;
		originalHexCode.className = "dads-text-mono";
		originalHexCode.style.cssText =
			"font-size: 10px; color: #666; display: block;";
		info.appendChild(originalHexCode);
	}

	// CUDモードがoff以外の場合はバッジを追加
	if (state.cudMode !== "off") {
		const badge = createCudBadge(displayHex);
		badge.style.marginTop = "4px";
		info.appendChild(badge);
	}

	// CVDモードがアクティブな場合はシミュレーション情報を表示
	if (state.cvdSimulation !== "normal") {
		const simInfo = document.createElement("div");
		simInfo.className = "dads-card__sim-info";
		simInfo.textContent = `(${displayColor.toHex()})`;
		info.appendChild(simInfo);
	}

	card.appendChild(swatch);
	card.appendChild(info);

	// カードクリック時のハンドラ
	card.onclick = () => {
		callbacks.onColorClick({
			stepColor: keyColor,
			keyColor,
			index: keyColorIndex,
			fixedScale: {
				colors: fixedScale.colors,
				keyIndex: fixedScale.keyIndex,
				hexValues: fixedScale.hexValues,
			},
			paletteInfo: {
				name: palette.name,
				baseChromaName: palette.baseChromaName,
				paletteId: palette.id,
			},
			readOnly: isPrimary,
			// originalHexは未指定（旧実装との一致、モーダル内でfixedScale.hexValues優先）
		});
	};

	return card;
}

/**
 * CUD検証パネルを作成する
 */
function createCudValidationPanel(): HTMLElement {
	const validationSection = document.createElement("section");
	validationSection.className = "dads-section";
	validationSection.style.marginTop = "24px";

	const validationHeading = document.createElement("h2");
	validationHeading.className = "dads-section__heading";
	validationHeading.textContent =
		state.cudMode === "strict"
			? "CUD パレット検証（CUD互換モード：スナップ適用済み）"
			: "CUD パレット検証";
	validationSection.appendChild(validationHeading);

	// パレットの色をPaletteColor形式に変換
	const paletteColors: PaletteColor[] = state.palettes.map((p) => {
		const keyColorInput = p.keyColors[0];
		let { color: hex } = parseKeyColor(keyColorInput || "#000000");

		// strictモードの場合はCUD推奨色にスナップ
		if (state.cudMode === "strict") {
			const snapResult = snapToCudColor(hex, { mode: "strict" });
			hex = snapResult.hex;
		}

		const name = p.name.toLowerCase();
		// セマンティック名をColorRoleにマッピング
		const role: "accent" | "base" | "text" | "background" | "neutral" =
			name.includes("primary")
				? "accent"
				: name.includes("secondary")
					? "accent"
					: name.includes("accent")
						? "accent"
						: name.includes("success")
							? "accent"
							: name.includes("error")
								? "accent"
								: name.includes("warning")
									? "accent"
									: name.includes("info")
										? "accent"
										: name.includes("neutral")
											? "neutral"
											: name.includes("background")
												? "background"
												: name.includes("text")
													? "text"
													: "base";
		return { hex, role };
	});

	const validationContainer = document.createElement("div");
	showPaletteValidation(paletteColors, validationContainer);
	validationSection.appendChild(validationContainer);

	return validationSection;
}

/**
 * パレットビューをレンダリングする
 *
 * Requirements: 1.1, 5.1 - パレットビューに背景色セレクターを統合する
 *
 * @param container レンダリング先のコンテナ要素
 * @param callbacks コールバック関数
 */
export async function renderPaletteView(
	container: HTMLElement,
	callbacks: PaletteViewCallbacks,
): Promise<void> {
	container.className = "dads-section";

	// パレットが生成されていない場合
	if (state.palettes.length === 0) {
		renderEmptyState(container, "パレット");
		return;
	}

	// DADSトークンを読み込む
	let dadsTokens: Awaited<ReturnType<typeof loadDadsTokens>> | null = null;
	try {
		dadsTokens = await loadDadsTokens();
	} catch (error) {
		console.error("Failed to load DADS tokens for palette view:", error);
	}

	// パレットをセマンティックカテゴリでグループ化
	const groupedPalettes = new Map<string, PaletteConfig[]>();
	for (const p of state.palettes) {
		const category = getSemanticCategory(p.name);
		if (!groupedPalettes.has(category)) {
			groupedPalettes.set(category, []);
		}
		groupedPalettes.get(category)?.push(p);
	}

	// コンテナをクリア
	container.innerHTML = "";

	// Requirements: 1.1, 5.1 - 背景色セレクターをビュー上部に配置
	const backgroundSelectorSection = document.createElement("section");
	backgroundSelectorSection.className = "background-color-selector-wrapper";
	const backgroundSelector = createBackgroundColorSelector({
		lightColor: state.lightBackgroundColor,
		darkColor: state.darkBackgroundColor,
		onLightColorChange: (hex: string) => {
			// ライト背景色を更新
			state.lightBackgroundColor = hex;
			// Requirements: 5.1 - localStorageに永続化
			persistBackgroundColors(
				state.lightBackgroundColor,
				state.darkBackgroundColor,
			);
			// コンテナの背景色を更新
			container.style.backgroundColor = hex;
			// 再レンダリング（コントラスト値更新のため）
			void renderPaletteView(container, callbacks).catch((err) => {
				console.error("Failed to re-render palette view:", err);
			});
		},
		onDarkColorChange: (hex: string) => {
			// ダーク背景色を更新
			state.darkBackgroundColor = hex;
			// Requirements: 5.1 - localStorageに永続化
			persistBackgroundColors(
				state.lightBackgroundColor,
				state.darkBackgroundColor,
			);
			// 再レンダリング（コントラスト値更新のため）
			void renderPaletteView(container, callbacks).catch((err) => {
				console.error("Failed to re-render palette view:", err);
			});
		},
	});
	backgroundSelectorSection.appendChild(backgroundSelector);
	container.appendChild(backgroundSelectorSection);

	// Requirements: 5.1 - ライト背景色をコンテナの背景に設定
	container.style.backgroundColor = state.lightBackgroundColor;

	// 各グループをレンダリング
	for (const [category, palettes] of groupedPalettes) {
		const section = document.createElement("section");

		// セクション見出し
		const heading = document.createElement("h2");
		heading.textContent = category;
		heading.className = "dads-section__heading";
		section.appendChild(heading);

		// カードコンテナ
		const cardsContainer = document.createElement("div");
		cardsContainer.className = "dads-grid";
		cardsContainer.dataset.columns = "auto-fill";

		for (const p of palettes) {
			const keyColorInput = p.keyColors[0];
			if (!keyColorInput) continue;

			const { color: hex, step: definedStep } = parseKeyColor(keyColorInput);
			const originalKeyColor = new Color(hex);
			// Requirements: 5.1 - ライト背景色を使用
			const bgColor = new Color(state.lightBackgroundColor);

			let colors: Color[];
			let keyColorIndex: number;
			let keyColor: Color;

			// Primaryはブランドカラー（ユーザー入力色）を使用
			const isPrimary = p.name === "Primary" || p.name?.startsWith("Primary");

			// DADSモード: baseChromaNameがあり、DADSトークンが読み込めた場合（Primaryは除く）
			if (p.baseChromaName && dadsTokens && !isPrimary) {
				const dadsHue = getDadsHueFromDisplayName(p.baseChromaName);

				if (dadsHue) {
					const colorScale = getDadsColorsByHue(dadsTokens, dadsHue);
					colors = colorScale.colors.map((c) => new Color(c.hex)).reverse();

					keyColorIndex = p.step
						? STEP_NAMES.findIndex((s) => s === p.step)
						: 6;
					if (keyColorIndex === -1) keyColorIndex = 6;

					keyColor = colors[keyColorIndex] ?? originalKeyColor;
				} else {
					// フォールバック
					keyColor = originalKeyColor;
					const baseRatios = getContrastRatios(state.contrastIntensity);
					const keyContrastRatio = keyColor.contrast(bgColor);

					keyColorIndex = -1;
					let minDiff = Number.POSITIVE_INFINITY;
					for (let i = 0; i < baseRatios.length; i++) {
						const diff = Math.abs((baseRatios[i] ?? 0) - keyContrastRatio);
						if (diff < minDiff) {
							minDiff = diff;
							keyColorIndex = i;
						}
					}
					if (keyColorIndex >= 0) {
						baseRatios[keyColorIndex] = keyContrastRatio;
					}

					colors = baseRatios.map((ratio, i) => {
						if (i === keyColorIndex) return keyColor;
						const solved = findColorForContrast(keyColor, bgColor, ratio);
						return solved || keyColor;
					});
					colors.reverse();
					keyColorIndex = colors.length - 1 - keyColorIndex;
				}
			} else {
				// 非DADSモード
				keyColor = originalKeyColor;
				const baseRatios = getContrastRatios(state.contrastIntensity);
				const keyContrastRatio = keyColor.contrast(bgColor);

				keyColorIndex = -1;
				let minDiff = Number.POSITIVE_INFINITY;
				for (let i = 0; i < baseRatios.length; i++) {
					const diff = Math.abs((baseRatios[i] ?? 0) - keyContrastRatio);
					if (diff < minDiff) {
						minDiff = diff;
						keyColorIndex = i;
					}
				}
				if (keyColorIndex >= 0) {
					baseRatios[keyColorIndex] = keyContrastRatio;
				}

				colors = baseRatios.map((ratio, i) => {
					if (i === keyColorIndex) return keyColor;
					const solved = findColorForContrast(keyColor, bgColor, ratio);
					return solved || keyColor;
				});
				colors.reverse();
				keyColorIndex = colors.length - 1 - keyColorIndex;
			}

			// 固定スケールを計算
			const fixedScale = calculateFixedScale(
				keyColor,
				p,
				definedStep,
				dadsTokens,
			);

			// カードを作成
			const card = createPaletteCard(
				p,
				keyColor,
				keyColorIndex,
				fixedScale,
				definedStep,
				callbacks,
			);

			cardsContainer.appendChild(card);
		}

		section.appendChild(cardsContainer);
		container.appendChild(section);
	}

	// CUDモードがoff以外の場合は検証パネルを表示
	if (state.cudMode !== "off" && state.palettes.length > 0) {
		const validationPanel = createCudValidationPanel();
		container.appendChild(validationPanel);
	}
}

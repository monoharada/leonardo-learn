/**
 * エクスポートハンドラモジュール
 *
 * CSS/Tailwind/JSONエクスポート機能を提供する。
 * state.palettesまたはstate.shadesPalettesから色を生成してエクスポートする。
 *
 * @module @/ui/demo/export-handlers
 * Requirements: 3.1, 3.2, 3.3
 */

import { Color } from "@/core/color";
import { exportToCSS } from "@/core/export/css-exporter";
import {
	exportDadsSemanticLinkTokensSync,
	exportToDTCG,
} from "@/core/export/dtcg-exporter";
import { exportToTailwind } from "@/core/export/tailwind-exporter";
import { findColorForContrast, isWarmYellowHue } from "@/core/solver";
import {
	getContrastRatios,
	STEP_NAMES,
	setButtonActive,
} from "@/ui/style-constants";
import { syncModalOpenState } from "./modal-scroll-lock";
import { parseKeyColor, state } from "./state";

/**
 * エクスポートフォーマット
 */
export type ExportFormat = "css" | "tailwind" | "json";

/**
 * 現在の有効な警告パターンを取得
 *
 * 自動選択の場合はresolvedWarningPatternを使用
 */
function getActiveWarningPattern(): "yellow" | "orange" {
	const config = state.semanticColorConfig;
	if (config.warningPattern === "auto") {
		return config.resolvedWarningPattern || "yellow";
	}
	return config.warningPattern;
}

/**
 * パレット名が現在の警告パターンに含まれるかを判定
 *
 * Warning-YL* / Warning-OR* のフィルタリングに使用
 *
 * @param paletteName - パレット名
 * @returns 含まれる場合true
 */
function shouldIncludePalette(paletteName: string): boolean {
	const lowerName = paletteName.toLowerCase();
	const activePattern = getActiveWarningPattern();

	// Warning-YL* / Warning-OR* のパターンチェック
	if (lowerName.includes("warning-yl")) {
		// 黄色パターンが選択されている場合のみ含める
		return activePattern === "yellow";
	}
	if (lowerName.includes("warning-or")) {
		// オレンジパターンが選択されている場合のみ含める
		return activePattern === "orange";
	}

	// Warning以外は常に含める
	return true;
}

/**
 * エクスポート関連DOM要素
 */
export interface ExportElements {
	exportBtn: HTMLElement | null;
	exportDialog: HTMLDialogElement | null;
	exportArea: HTMLTextAreaElement | null;
	exportFormatButtons: NodeListOf<Element>;
	exportCopyBtn: HTMLElement | null;
	exportDownloadBtn: HTMLElement | null;
}

/**
 * 全パレットから色を生成する
 *
 * shadesPalettesが存在する場合はそちらを使用、
 * ない場合はpalettesを使用する。
 *
 * @returns パレット名-ステップ番号 をキーとした色のRecord
 */
export function generateExportColors(): Record<string, Color> {
	const colors: Record<string, Color> = {};
	const bgColor = new Color("#ffffff");

	// エクスポートは全13色パレットを使用
	const palettesToExport =
		state.shadesPalettes.length > 0 ? state.shadesPalettes : state.palettes;

	for (const p of palettesToExport) {
		// 警告パターンフィルタ: 選択されていないパターンはスキップ
		if (!shouldIncludePalette(p.name)) continue;

		const keyColorInput = p.keyColors[0];
		if (!keyColorInput) continue;

		const { color: hex } = parseKeyColor(keyColorInput);
		const keyColor = new Color(hex);

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

		// 黄色系かどうかを判定
		const keyHue = keyColor.oklch.h ?? 0;
		const isYellowish = isWarmYellowHue(keyHue);

		const scaleColors: Color[] = baseRatios.map((ratio, i) => {
			// 黄色系以外はキーカラーをそのまま使用
			if (i === keyColorIndex && !isYellowish) return keyColor;
			// 黄色系はキーカラーも含めて全て変換（UIと一致させる）
			const solved = findColorForContrast(keyColor, bgColor, ratio);
			return solved || keyColor;
		});
		scaleColors.reverse();

		// Generate color name from palette name
		const paletteName = p.name.toLowerCase().replace(/\s+/g, "-");

		for (let index = 0; index < scaleColors.length; index++) {
			const color = scaleColors[index];
			if (!color) continue;
			const stepName = STEP_NAMES[index] ?? index * 100 + 50;
			colors[`${paletteName}-${stepName}`] = color;
		}
	}

	return colors;
}

/**
 * ファイルをダウンロードする
 *
 * @param content ファイル内容
 * @param filename ファイル名
 * @param mimeType MIMEタイプ
 */
export function downloadFile(
	content: string,
	filename: string,
	mimeType: string,
): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * 指定フォーマットでエクスポート内容を取得する
 *
 * @param format エクスポートフォーマット
 * @returns エクスポート内容の文字列
 */
export function getExportContent(format: ExportFormat): string {
	const colors = generateExportColors();

	switch (format) {
		case "css": {
			const result = exportToCSS(colors, {
				includeWideGamutFallback: true,
			});
			return result.css;
		}
		case "tailwind": {
			const result = exportToTailwind(colors, {
				esModule: false,
			});
			return result.config;
		}
		case "json": {
			const baseResult = exportToDTCG(colors);

			// Warning パターンを取得
			const warningPattern = getActiveWarningPattern();

			// DADS semantic/link トークンを追加
			const dadsTokens = exportDadsSemanticLinkTokensSync(warningPattern);

			return JSON.stringify({ ...baseResult.tokens, ...dadsTokens }, null, 2);
		}
	}
}

/**
 * エクスポートハンドラのセットアップ
 *
 * @param elements エクスポート関連DOM要素
 */
export function setupExportHandlers(elements: ExportElements): void {
	const {
		exportBtn,
		exportDialog,
		exportArea,
		exportFormatButtons,
		exportCopyBtn,
		exportDownloadBtn,
	} = elements;

	let currentExportFormat: ExportFormat = "css";

	const updateExportPreview = () => {
		const content = getExportContent(currentExportFormat);
		if (exportArea) {
			exportArea.value = content;
		}
	};

	const openExportDialog = () => {
		updateExportPreview();
		if (!exportDialog) return;

		const isOpen = exportDialog.open || exportDialog.hasAttribute("open");
		if (!isOpen) {
			try {
				if (typeof exportDialog.showModal === "function") {
					exportDialog.showModal();
				} else {
					exportDialog.setAttribute("open", "");
				}
			} catch {
				// JSDOMなどでshowModalが未実装の場合でもプレビュー表示は維持する
				exportDialog.setAttribute("open", "");
			}
		}
		syncModalOpenState();
	};

	if (exportDialog) {
		exportDialog.addEventListener("close", () => {
			syncModalOpenState();
		});
	}

	if (exportBtn) {
		exportBtn.onclick = () => {
			openExportDialog();
		};
	}

	// Studio/Manual では Export ボタンが動的生成されるためクリックを委譲する
	if (typeof document !== "undefined") {
		document.addEventListener("click", (event) => {
			const target = event.target as
				| (EventTarget & { closest?: (selector: string) => Element | null })
				| null;
			if (!target?.closest) return;

			const trigger = target.closest(".studio-export-btn");
			if (!trigger) return;

			openExportDialog();
		});
	}

	exportFormatButtons.forEach((btn) => {
		btn.addEventListener("click", () => {
			const format = (btn as HTMLElement).dataset.format as ExportFormat;
			if (!format) return;

			currentExportFormat = format;

			// Update button states
			exportFormatButtons.forEach((b) => {
				setButtonActive(b as HTMLElement, false);
			});
			setButtonActive(btn as HTMLElement, true);

			updateExportPreview();
		});
	});

	if (exportCopyBtn && exportArea) {
		exportCopyBtn.onclick = () => {
			navigator.clipboard.writeText(exportArea.value).then(() => {
				const originalText = exportCopyBtn.textContent;
				exportCopyBtn.textContent = "Copied!";
				setTimeout(() => {
					exportCopyBtn.textContent = originalText;
				}, 2000);
			});
		};
	}

	if (exportDownloadBtn && exportArea) {
		exportDownloadBtn.onclick = () => {
			const extensions: Record<ExportFormat, string> = {
				css: "colors.css",
				tailwind: "tailwind.colors.js",
				json: "colors.tokens.json",
			};
			const mimeTypes: Record<ExportFormat, string> = {
				css: "text/css",
				tailwind: "application/javascript",
				json: "application/json",
			};
			downloadFile(
				exportArea.value,
				extensions[currentExportFormat],
				mimeTypes[currentExportFormat],
			);
		};
	}
}

/**
 * 直接エクスポートボタン用のセットアップ（ヘッダー以外の個別ボタン）
 *
 * @param cssBtn CSSエクスポートボタン
 * @param tailwindBtn Tailwindエクスポートボタン
 * @param jsonBtn JSONエクスポートボタン
 */
export function setupDirectExportButtons(
	cssBtn: HTMLElement | null,
	tailwindBtn: HTMLElement | null,
	jsonBtn: HTMLElement | null,
): void {
	if (cssBtn) {
		cssBtn.onclick = () => {
			const colors = generateExportColors();
			const result = exportToCSS(colors, {
				prefix: "color",
				includeWideGamutFallback: true,
			});
			downloadFile(result.css, "colors.css", "text/css");
		};
	}

	if (tailwindBtn) {
		tailwindBtn.onclick = () => {
			const colors = generateExportColors();
			const result = exportToTailwind(colors, {
				colorSpace: "oklch",
				esModule: false,
			});
			downloadFile(
				result.config,
				"tailwind.colors.js",
				"application/javascript",
			);
		};
	}

	if (jsonBtn) {
		jsonBtn.onclick = () => {
			const colors = generateExportColors();
			const result = exportToDTCG(colors, {
				colorSpace: "oklch",
			});
			downloadFile(result.json, "colors.tokens.json", "application/json");
		};
	}
}

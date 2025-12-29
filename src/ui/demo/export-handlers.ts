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
import { exportToDTCG } from "@/core/export/dtcg-exporter";
import { exportToTailwind } from "@/core/export/tailwind-exporter";
import { findColorForContrast, isWarmYellowHue } from "@/core/solver";
import {
	getContrastRatios,
	STEP_NAMES,
	setButtonActive,
} from "@/ui/style-constants";
import { parseKeyColor, state } from "./state";

/**
 * エクスポートフォーマット
 */
export type ExportFormat = "css" | "tailwind" | "json";

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
			const result = exportToDTCG(colors);
			return result.json;
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

	if (exportBtn && exportDialog) {
		exportBtn.onclick = () => {
			updateExportPreview();
			exportDialog.showModal();
		};
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

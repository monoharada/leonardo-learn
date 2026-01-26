import { Color } from "@/core/color";
import { findDadsColorByHex } from "@/core/tokens/dads-data-provider";
import type { DadsToken } from "@/core/tokens/types";
import { getContrastTextColor } from "@/ui/semantic-role/circular-swatch-transformer";
import { parseKeyColor, state } from "../state";
import type { PaletteConfig } from "../types";
import type { ManualViewCallbacks } from "./manual-view.render";

/**
 * キーカラー役割の定義
 * P/S/T の役割名、短縮ラベル、日本語名を定義
 */
const KEY_COLOR_ROLE_DEFINITIONS = [
	{ name: "Primary", shortLabel: "P", label: "プライマリ" },
	{ name: "Secondary", shortLabel: "S", label: "セカンダリ" },
	{ name: "Tertiary", shortLabel: "T", label: "ターシャリ" },
] as const;

/**
 * Primary/Secondary/Tertiary キーカラースウォッチをレンダリングする
 *
 * DADSトークンに含まれない独自色のみ表示する。
 * DADSに含まれるキーカラーはDADSスケール内で円形表示される。
 *
 * @param callbacks コールバック関数
 * @param dadsTokens DADSトークン配列（DADS含有判定用）
 * @returns キーカラーセクション要素（表示すべき独自色がない場合はnull）
 */
export function renderKeyColorSwatches(
	callbacks: ManualViewCallbacks,
	dadsTokens: DadsToken[],
): HTMLElement | null {
	// DADSに含まれない独自色のみをフィルタリング
	const nonDadsColors: Array<{
		palette: PaletteConfig;
		shortLabel: string;
		label: string;
	}> = [];

	for (const role of KEY_COLOR_ROLE_DEFINITIONS) {
		const palette = state.palettes.find((p) => p.name === role.name);
		if (!palette) continue;

		const hex = parseKeyColor(palette.keyColors[0] ?? "").color;
		const dadsMatch = findDadsColorByHex(dadsTokens, hex);
		if (!dadsMatch) {
			nonDadsColors.push({
				palette,
				shortLabel: role.shortLabel,
				label: role.label,
			});
		}
	}

	// 表示すべき独自色がない場合はnullを返す
	if (nonDadsColors.length === 0) {
		return null;
	}

	const section = document.createElement("section");
	section.className = "dads-key-colors-section";

	// 見出し
	const header = document.createElement("h2");
	header.className = "dads-section__heading";
	header.innerHTML = `
		<span class="dads-section__heading-en">Key Colors</span>
		<span class="dads-section__heading-ja">(キーカラー)</span>
	`;
	section.appendChild(header);

	// スウォッチコンテナ
	const swatchContainer = document.createElement("div");
	swatchContainer.className = "dads-key-colors-container";

	// 全キーカラーのHEX値とラベルを取得（モーダルのカラーシェード表示用）
	const allKeyColorHexes = nonDadsColors.map(
		({ palette }) => parseKeyColor(palette.keyColors[0] ?? "").color,
	);
	const allKeyColorLabels = nonDadsColors.map(({ label }) => label);

	// 独自色のみスウォッチを作成
	for (const [i, item] of nonDadsColors.entries()) {
		const { palette, shortLabel, label } = item;
		const swatch = createKeyColorSwatch(
			palette,
			shortLabel,
			label,
			callbacks,
			allKeyColorHexes,
			allKeyColorLabels,
			i,
		);
		swatchContainer.appendChild(swatch);
	}

	section.appendChild(swatchContainer);
	return section;
}

/**
 * キーカラー円形スウォッチを作成する
 *
 * @param palette パレット設定
 * @param shortLabel 短縮ラベル（P/S/T）
 * @param label 日本語ラベル
 * @param callbacks コールバック関数
 * @param allKeyColorHexes 全キーカラーのHEX値配列（モーダル表示用）
 * @param allKeyColorLabels 全キーカラーのラベル配列（モーダル名前切替用）
 * @param currentIndex 現在のキーカラーのインデックス
 * @returns スウォッチ要素
 */
function createKeyColorSwatch(
	palette: PaletteConfig,
	shortLabel: string,
	label: string,
	callbacks: ManualViewCallbacks,
	allKeyColorHexes: string[],
	allKeyColorLabels: string[],
	currentIndex: number,
): HTMLElement {
	const keyColor = palette.keyColors[0];
	const hex = keyColor ? parseKeyColor(keyColor).color : "#000000";

	const swatch = document.createElement("button");
	swatch.type = "button";
	swatch.className = "dads-key-color-swatch";
	swatch.style.backgroundColor = hex;
	swatch.dataset.testid = `key-color-${shortLabel.toLowerCase()}`;

	// テキスト色を背景色に基づいて決定
	const textColor = getContrastTextColor(hex);

	// ラベル（役割名）
	const labelEl = document.createElement("span");
	labelEl.className = "dads-key-color-swatch__label";
	labelEl.textContent = label;
	labelEl.style.color = textColor;
	swatch.appendChild(labelEl);

	// HEX値
	const hexEl = document.createElement("span");
	hexEl.className = "dads-key-color-swatch__hex";
	hexEl.textContent = hex.toUpperCase();
	hexEl.style.color = textColor;
	swatch.appendChild(hexEl);

	// アクセシビリティ属性
	swatch.setAttribute("aria-label", `${label} ${hex} の詳細を表示`);
	swatch.setAttribute("title", `${label}: ${hex}`);

	// クリックイベント - モーダルを表示
	swatch.addEventListener("click", () => {
		const stepColor = new Color(hex);
		const keyColorObj = new Color(hex);

		// 全キーカラーをColorオブジェクトに変換
		const allKeyColors = allKeyColorHexes.map((h) => new Color(h));

		callbacks.onColorClick({
			stepColor,
			keyColor: keyColorObj,
			index: currentIndex,
			fixedScale: {
				colors: allKeyColors,
				keyIndex: currentIndex,
				hexValues: allKeyColorHexes,
				names: allKeyColorLabels, // カスタムキーカラーのラベル配列
			},
			paletteInfo: {
				name: label,
				// カスタムキーカラーにはDADSトークン情報がないので渡さない
			},
			readOnly: true,
			originalHex: hex,
		});
	});

	return swatch;
}

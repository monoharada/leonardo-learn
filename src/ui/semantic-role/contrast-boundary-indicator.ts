/**
 * ContrastBoundaryIndicator - コントラスト比境界ピル表示
 *
 * 白/黒背景に対するコントラスト比境界をピルで視覚化する
 *
 * Requirements: 6.1, 6.4, 6.5
 */

import type { ContrastBoundaryResult } from "@/core/semantic-role/contrast-boundary-calculator";

/**
 * 境界ピル設定
 */
export interface BoundaryPillConfig {
	/** 境界が存在するscale値 */
	scale: number;
	/** ピルに表示するラベル（例: "3:1→", "←4.5:1"） */
	label: string;
	/** スタイル種別 */
	style: "outline" | "filled";
	/** 方向（白背景はstart、黒背景はend） */
	direction: "start" | "end";
}

/**
 * コントラスト境界ピル要素を生成
 *
 * @param config - ピル設定
 * @returns ピル要素
 *
 * スタイル:
 * - 白抜き（outline）: border: 1px solid #333, background: transparent, color: #333
 * - 黒塗り（filled）: border: none, background: #333, color: white
 * - 共通: border-radius: 9999px, font-size: 10px, padding: 2px 8px
 *
 * Requirements: 6.2, 6.3, 6.4
 */
export function createBoundaryPill(
	config: BoundaryPillConfig,
): HTMLSpanElement {
	const pill = document.createElement("span");

	// 基本クラス
	pill.className = "dads-contrast-pill";

	// スタイル別クラス
	if (config.style === "outline") {
		pill.classList.add("dads-contrast-pill--outline");
	} else {
		pill.classList.add("dads-contrast-pill--filled");
	}

	// ラベルテキスト
	pill.textContent = config.label;

	// データ属性
	pill.dataset.scale = String(config.scale);
	pill.dataset.direction = config.direction;

	return pill;
}

/**
 * 境界ピル設定のリスト定義
 */
interface BoundaryPillDefinition {
	key: keyof ContrastBoundaryResult;
	label: string;
	style: "outline" | "filled";
	direction: "start" | "end";
}

/**
 * 4種類の境界ピル定義
 * - 白背景: 3:1→, 4.5:1→ (outline, start)
 * - 黒背景: ←4.5:1, ←3:1 (filled, end)
 */
const BOUNDARY_PILL_DEFINITIONS: BoundaryPillDefinition[] = [
	{ key: "white3to1", label: "3:1→", style: "outline", direction: "start" },
	{ key: "white4_5to1", label: "4.5:1→", style: "outline", direction: "start" },
	{ key: "black4_5to1", label: "←4.5:1", style: "filled", direction: "end" },
	{ key: "black3to1", label: "←3:1", style: "filled", direction: "end" },
];

/**
 * コントラスト境界ピルコンテナを生成
 *
 * ContrastBoundaryResultから4種類のピルを生成し、
 * 対応するscale位置に配置する。
 *
 * @param boundaries - 境界計算結果
 * @param scaleElements - scale→DOM要素のマップ（位置参照用）
 * @returns ピルコンテナ要素
 *
 * Requirements: 6.1, 6.5
 */
export function renderBoundaryPills(
	boundaries: ContrastBoundaryResult,
	scaleElements: Map<number, HTMLElement>,
): HTMLDivElement {
	const container = document.createElement("div");
	container.className = "dads-contrast-boundary";

	// 基準点となるスウォッチを取得（位置計算の基準）
	// 最小scale値の要素を基準とすることで、視覚順とMapの挿入順に依存しない
	const sortedScales = [...scaleElements.keys()].sort((a, b) => a - b);
	if (sortedScales.length === 0) {
		return container;
	}
	const referenceElement = scaleElements.get(sortedScales[0]);
	if (!referenceElement) {
		return container;
	}
	const referenceRect = referenceElement.getBoundingClientRect();

	for (const def of BOUNDARY_PILL_DEFINITIONS) {
		const scale = boundaries[def.key];

		// 境界がnullの場合はスキップ
		if (scale === null) {
			continue;
		}

		// スウォッチ要素が存在しない場合はスキップ
		const swatchElement = scaleElements.get(scale);
		if (!swatchElement) {
			continue;
		}

		const pill = createBoundaryPill({
			scale,
			label: def.label,
			style: def.style,
			direction: def.direction,
		});

		// getBoundingClientRect()を使用してコンテナ相対位置を計算
		// offsetLeft/offsetWidthはoffsetParent依存のため、getBoundingClientRect()で
		// ビューポート基準の座標を取得し、基準要素との差分で相対位置を算出
		const swatchRect = swatchElement.getBoundingClientRect();
		const relativeLeft = swatchRect.left - referenceRect.left;

		if (def.direction === "start") {
			// 白背景ピル: 対応scaleの左端に配置
			pill.style.left = `${relativeLeft}px`;
		} else {
			// 黒背景ピル: 対応scaleの右端に配置
			pill.style.left = `${relativeLeft + swatchRect.width}px`;
			pill.style.transform = "translateX(-100%)";
		}

		container.appendChild(pill);
	}

	return container;
}

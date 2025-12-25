/**
 * ContrastBoundaryIndicator - コントラスト比境界ピル表示
 *
 * 白/黒背景に対するコントラスト比境界をピルで視覚化する
 *
 * Requirements: 6.1, 6.4, 6.5
 */

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

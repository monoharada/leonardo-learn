/**
 * DOM ヘルパーモジュール
 *
 * アクセシビリティビューで使用するDOM要素の生成ヘルパー関数を提供する。
 *
 * @module @/ui/demo/utils/dom-helpers
 */

import { Color } from "@/core/color";
import type { Color as ColorType } from "../types";

/**
 * カラースウォッチ要素を作成する
 *
 * オプションでラベルを表示し、コントラストに応じてテキスト色を調整する。
 *
 * @param color - 表示する色
 * @param name - スウォッチの名前（ツールチップとラベルに使用）
 * @param showLabel - ラベルをテキストとして表示するかどうか
 * @returns スウォッチのdiv要素
 */
export function createColorSwatch(
	color: ColorType,
	name?: string,
	showLabel = true,
): HTMLDivElement {
	const swatch = document.createElement("div");
	swatch.className = "dads-cvd-strip__swatch";
	swatch.style.backgroundColor = color.toCss();

	if (name) {
		swatch.title = `${name} (${color.toHex()})`;
		if (showLabel) {
			swatch.style.color =
				color.contrast(new Color("white")) > 4.5 ? "white" : "black";
			swatch.textContent = name;
		}
	}

	return swatch;
}

/**
 * ペア表示用の小さなカラースウォッチを作成する
 *
 * ラベルなし、背景色のみの小さなスウォッチ。
 *
 * @param color - 表示する色
 * @returns スウォッチのspan要素
 */
export function createPairSwatch(color: ColorType): HTMLSpanElement {
	const swatch = document.createElement("span");
	swatch.className = "dads-a11y-cvd-pair-swatch";
	swatch.style.backgroundColor = color.toHex();
	return swatch;
}

/**
 * 衝突インジケーター要素を作成する
 *
 * 指定された位置に線とアイコンを配置する。
 *
 * @param position - 位置（パーセンテージ、0-100）
 * @param useCalc - calc()を使用して位置調整するかどうか
 * @returns 線とアイコン要素のオブジェクト
 */
export function createConflictIndicator(
	position: number,
	useCalc = false,
): { line: HTMLDivElement; icon: HTMLDivElement } {
	const line = document.createElement("div");
	line.className = "dads-cvd-conflict-line";
	line.style.left = useCalc ? `calc(${position}% - 1px)` : `${position}%`;

	const icon = document.createElement("div");
	icon.className = "dads-cvd-conflict-icon";
	icon.textContent = "!";

	if (useCalc) {
		icon.style.left = `calc(${position}% - 10px)`;
	} else {
		icon.style.left = `${position}%`;
		icon.style.transform = "translate(-50%, -50%)";
	}

	return { line, icon };
}

/**
 * 衝突オーバーレイをレンダリングする
 *
 * 衝突位置にインジケーターを配置したオーバーレイ要素を作成する。
 *
 * @param conflicts - 衝突インデックスの配列
 * @param segmentCount - セグメント数（色の数）
 * @param useCalc - calc()を使用するかどうか
 * @returns オーバーレイのdiv要素
 */
export function renderConflictOverlay(
	conflicts: number[],
	segmentCount: number,
	useCalc = true,
): HTMLDivElement {
	const overlay = document.createElement("div");
	overlay.className = "dads-cvd-overlay";

	const segmentWidth = 100 / segmentCount;

	for (const index of conflicts) {
		const leftPos = (index + 1) * segmentWidth;
		const { line, icon } = createConflictIndicator(leftPos, useCalc);
		overlay.appendChild(line);
		overlay.appendChild(icon);
	}

	return overlay;
}

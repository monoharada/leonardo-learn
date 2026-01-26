/**
 * スタジオビューモジュール（Huemint風）
 *
 * プレビューを中心に、Random（DADSトークン）→ ロック → Export の体験を提供する。
 * 生成AI機能は実装せず、DADSトークンと既存機能の組み合わせで構成する。
 *
 * 制約:
 * - DADSに存在しない色の生成は行わない（Primaryの手入力のみ例外として許可）
 *
 * @module @/ui/demo/views/studio-view
 */

import type { DadsToken } from "@/core/tokens/types";
import type { ColorDetailModalOptions } from "../types";
import { generateNewStudioPalette as generateNewStudioPaletteImpl } from "./studio-view.generation";
import { renderStudioView as renderStudioViewImpl } from "./studio-view.render";

export interface StudioViewCallbacks {
	onColorClick: (options: ColorDetailModalOptions) => void;
}

export async function generateNewStudioPalette(
	dadsTokens: DadsToken[],
): Promise<void> {
	return generateNewStudioPaletteImpl(dadsTokens);
}

export async function renderStudioView(
	container: HTMLElement,
	callbacks: StudioViewCallbacks,
): Promise<void> {
	return renderStudioViewImpl(container, callbacks);
}

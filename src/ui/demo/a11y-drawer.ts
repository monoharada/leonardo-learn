/**
 * アクセシビリティドロワーモジュール
 *
 * 右側スライドドロワーでアクセシビリティビューを表示する。
 * ヘッダーの識別性スコア横のトリガーボタンから開閉を制御する。
 *
 * @module @/ui/demo/a11y-drawer
 */

import { Color } from "@/core/color";
import { detectCvdConfusionPairs } from "@/ui/accessibility/cvd-detection";
import { applySimulation } from "./cvd-controls";
import { syncModalOpenState } from "./modal-scroll-lock";
import { parseKeyColor, state } from "./state";
import { renderAccessibilityView } from "./views/accessibility-view";

/** ドロワー関連のDOM要素を取得する */
function getDrawerElements(): {
	trigger: HTMLElement;
	drawer: HTMLDialogElement;
	content: HTMLElement;
} | null {
	if (typeof document === "undefined") return null;

	const trigger = document.getElementById("a11y-drawer-trigger");
	const drawer = document.getElementById(
		"a11y-drawer",
	) as HTMLDialogElement | null;
	const content = document.getElementById("a11y-drawer-content");

	if (!trigger || !drawer || !content) return null;
	return { trigger, drawer, content };
}

/**
 * アクセシビリティドロワーのセットアップ
 *
 * トリガーボタンとドロワーのイベントハンドラを設定する。
 */
export function setupA11yDrawer(): void {
	const elements = getDrawerElements();
	if (!elements) return;

	const { trigger, drawer, content } = elements;

	trigger.addEventListener("click", () => {
		if (drawer.open) {
			drawer.close();
		} else {
			drawer.showModal();
			renderAccessibilityView(content, { applySimulation });
			trigger.setAttribute("aria-expanded", "true");
			syncModalOpenState();
		}
	});

	drawer.addEventListener("close", () => {
		trigger.setAttribute("aria-expanded", "false");
		syncModalOpenState();
	});

	drawer.addEventListener("click", (e) => {
		if (e.target === drawer) {
			drawer.close();
		}
	});
}

/**
 * アクセシビリティドロワーの内容を更新
 *
 * パレット変更時などにドロワーが開いている場合は再レンダリングする。
 */
export function refreshA11yDrawer(): void {
	const elements = getDrawerElements();
	if (!elements?.drawer.open) return;

	renderAccessibilityView(elements.content, { applySimulation });
}

/**
 * CVD混同リスク件数を計算してバッジを更新
 *
 * パレットのキーカラーからCVD混同ペアを検出し、
 * エラー件数があれば「詳細」ボタンにバッジで表示する。
 */
export function updateA11yIssueBadge(): void {
	if (typeof document === "undefined") return;

	const badge = document.getElementById("a11y-issue-badge");
	if (!badge) return;

	const namedColors = state.palettes
		.map((p) => {
			const keyColorInput = p.keyColors[0];
			if (!keyColorInput) return null;
			const { color: hex } = parseKeyColor(keyColorInput);
			return { name: p.name, color: new Color(hex) };
		})
		.filter((c): c is { name: string; color: Color } => c !== null);

	if (namedColors.length < 2) {
		badge.hidden = true;
		return;
	}

	const pairs = detectCvdConfusionPairs(namedColors);
	badge.hidden = pairs.length === 0;
	if (pairs.length > 0) {
		badge.textContent = pairs.length > 99 ? "99+" : String(pairs.length);
	}
}

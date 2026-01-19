/**
 * パレット関連のユーティリティ
 *
 * ビュー間で重複しやすい「アクセント取得」「警告パターン解決」などの
 * 小さな純関数を集約する。
 *
 * @module @/ui/demo/utils/palette-utils
 */

import type { PaletteConfig, SemanticColorConfig } from "../types";
import { stripStepSuffix } from "../types";

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(hex: string): boolean {
	return HEX_COLOR_RE.test(hex);
}

export function hasUsableKeyColor(palette: PaletteConfig): boolean {
	const keyColorInput = palette.keyColors[0];
	if (!keyColorInput) return false;
	const hex = stripStepSuffix(keyColorInput);
	return isValidHexColor(hex);
}

export function resolveAccentSourcePalette(
	palettes: PaletteConfig[],
): PaletteConfig | undefined {
	return (
		palettes.find((p) => p.name.startsWith("Accent") && hasUsableKeyColor(p)) ??
		palettes.find(
			(p) =>
				(p.derivedFrom?.derivationType === "secondary" ||
					p.name.startsWith("Secondary")) &&
				hasUsableKeyColor(p),
		)
	);
}

export function resolveWarningPattern(
	config: SemanticColorConfig,
): "yellow" | "orange" {
	if (config.warningPattern === "auto") {
		return config.resolvedWarningPattern || "yellow";
	}
	return config.warningPattern;
}

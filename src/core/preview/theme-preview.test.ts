/**
 * ThemePreview - テーマプレビューのテスト
 */

import { describe, expect, it } from "bun:test";
import { Color } from "../color";
import type { ToneScale, ToneValue } from "../strategies/m3-generator";
import {
	DEFAULT_DARK_THEME,
	DEFAULT_LIGHT_THEME,
	generateThemePreview,
	getAccessibilityHighlights,
	switchTheme,
} from "./theme-preview";

// テスト用のToneScaleを作成するヘルパー
function createTestToneScale(role = "primary"): ToneScale {
	const tones = new Map<ToneValue, Color>();
	const toneValues: ToneValue[] = [
		0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100,
	];

	for (const tone of toneValues) {
		const lightness = tone / 100;
		tones.set(
			tone,
			new Color({ mode: "oklch", l: lightness, c: 0.15, h: 250 }),
		);
	}

	return {
		role,
		tones,
		sourceColor: new Color({ mode: "oklch", l: 0.5, c: 0.15, h: 250 }),
	};
}

describe("ThemePreview", () => {
	describe("DEFAULT_LIGHT_THEME", () => {
		it("ライトテーマのデフォルト設定を持つ", () => {
			expect(DEFAULT_LIGHT_THEME.mode).toBe("light");
			expect(DEFAULT_LIGHT_THEME.backgroundColor.oklch.l).toBeGreaterThan(0.9);
			expect(DEFAULT_LIGHT_THEME.foregroundColor.oklch.l).toBeLessThan(0.2);
		});
	});

	describe("DEFAULT_DARK_THEME", () => {
		it("ダークテーマのデフォルト設定を持つ", () => {
			expect(DEFAULT_DARK_THEME.mode).toBe("dark");
			expect(DEFAULT_DARK_THEME.backgroundColor.oklch.l).toBeLessThan(0.2);
			expect(DEFAULT_DARK_THEME.foregroundColor.oklch.l).toBeGreaterThan(0.9);
		});
	});

	describe("generateThemePreview", () => {
		it("ライトモードのプレビューを生成する", () => {
			const scales = {
				primary: createTestToneScale("primary"),
			};

			const preview = generateThemePreview(scales, "light");

			expect(preview.mode).toBe("light");
			expect(preview.config).toBeDefined();
			expect(preview.scales).toHaveLength(1);
		});

		it("ダークモードのプレビューを生成する", () => {
			const scales = {
				primary: createTestToneScale("primary"),
			};

			const preview = generateThemePreview(scales, "dark");

			expect(preview.mode).toBe("dark");
			expect(preview.config.mode).toBe("dark");
		});

		it("複数スケールのプレビューを生成する", () => {
			const scales = {
				primary: createTestToneScale("primary"),
				secondary: createTestToneScale("secondary"),
				error: createTestToneScale("error"),
			};

			const preview = generateThemePreview(scales, "light");

			expect(preview.scales).toHaveLength(3);
		});

		it("全体の警告を集約する", () => {
			const scales = {
				primary: createTestToneScale("primary"),
			};

			const preview = generateThemePreview(scales, "light");

			expect(preview.warnings).toBeDefined();
			expect(Array.isArray(preview.warnings)).toBe(true);
		});

		it("修正提案を生成する", () => {
			const scales = {
				primary: createTestToneScale("primary"),
			};

			const preview = generateThemePreview(scales, "light");

			expect(preview.suggestions).toBeDefined();
			expect(Array.isArray(preview.suggestions)).toBe(true);
		});

		it("修正提案は優先度でソートされる", () => {
			const scales = {
				primary: createTestToneScale("primary"),
			};

			const preview = generateThemePreview(scales, "light");

			if (preview.suggestions.length > 1) {
				const priorities = preview.suggestions.map((s) => s.priority);
				// highがmediumより先、mediumがlowより先
				let foundMedium = false;
				let foundLow = false;
				for (const p of priorities) {
					if (p === "medium") foundMedium = true;
					if (p === "low") foundLow = true;
					if (p === "high" && (foundMedium || foundLow)) {
						throw new Error("Priority order is wrong");
					}
					if (p === "medium" && foundLow) {
						throw new Error("Priority order is wrong");
					}
				}
			}
		});

		it("デフォルトはライトモード", () => {
			const scales = {
				primary: createTestToneScale("primary"),
			};

			const preview = generateThemePreview(scales);

			expect(preview.mode).toBe("light");
		});
	});

	describe("switchTheme", () => {
		it("ライトからダークに切り替える", () => {
			const scales = {
				primary: createTestToneScale("primary"),
			};

			const preview = switchTheme(scales, "dark");

			expect(preview.mode).toBe("dark");
		});

		it("ダークからライトに切り替える", () => {
			const scales = {
				primary: createTestToneScale("primary"),
			};

			const preview = switchTheme(scales, "light");

			expect(preview.mode).toBe("light");
		});

		it("切り替え後もスケールデータを保持する", () => {
			const scales = {
				primary: createTestToneScale("primary"),
				secondary: createTestToneScale("secondary"),
			};

			const preview = switchTheme(scales, "dark");

			expect(preview.scales).toHaveLength(2);
		});
	});

	describe("getAccessibilityHighlights", () => {
		it("アクセシビリティ違反のハイライト情報を返す", () => {
			const scales = {
				primary: createTestToneScale("primary"),
			};

			const preview = generateThemePreview(scales, "light");
			const highlights = getAccessibilityHighlights(preview);

			expect(Array.isArray(highlights)).toBe(true);
		});

		it("ハイライト情報にロール、トーン、レベルを含む", () => {
			const scales = {
				primary: createTestToneScale("primary"),
			};

			const preview = generateThemePreview(scales, "light");
			const highlights = getAccessibilityHighlights(preview);

			for (const highlight of highlights) {
				expect(highlight.role).toBeDefined();
				expect(highlight.tone).toBeDefined();
				expect(["error", "warning", "info"]).toContain(highlight.level);
			}
		});
	});

	describe("FixSuggestion", () => {
		it("修正提案にrole、tone、issue、suggestionを含む", () => {
			const scales = {
				primary: createTestToneScale("primary"),
			};

			const preview = generateThemePreview(scales, "light");

			for (const suggestion of preview.suggestions) {
				expect(suggestion.role).toBeDefined();
				expect(suggestion.tone).toBeDefined();
				expect(suggestion.issue).toBeDefined();
				expect(suggestion.suggestion).toBeDefined();
				expect(["high", "medium", "low"]).toContain(suggestion.priority);
			}
		});
	});
});

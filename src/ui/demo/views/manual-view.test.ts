/**
 * マニュアル選択ビューのテスト
 *
 * @module @/ui/demo/views/manual-view.test
 * Requirements: 6.3, 6.4 - マニュアル選択ツールバーとStudioビューの同期
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { HarmonyType } from "@/core/harmony";
import { resetState, state } from "../state";
import type { ManualColorSelection, PaletteConfig } from "../types";
import {
	applyColorToManualSelection,
	getSelectedApplyTarget,
	resetApplyTargetState,
	setSelectedApplyTarget,
	syncFromStudioPalettes,
} from "./manual-view";

/**
 * localStorageのモック実装
 * Bun test環境ではlocalStorageが存在しないため
 */
function createLocalStorageMock() {
	const store = new Map<string, string>();
	return {
		getItem: (key: string): string | null => store.get(key) ?? null,
		setItem: (key: string, value: string): void => {
			store.set(key, value);
		},
		removeItem: (key: string): void => {
			store.delete(key);
		},
		clear: (): void => {
			store.clear();
		},
		get length(): number {
			return store.size;
		},
		key: (index: number): string | null => {
			const keys = Array.from(store.keys());
			return keys[index] ?? null;
		},
	};
}

// グローバルにlocalStorageモックを設定
const localStorageMock = createLocalStorageMock();
(globalThis as unknown as { localStorage: Storage }).localStorage =
	localStorageMock as Storage;

describe("manual-view module", () => {
	beforeEach(() => {
		resetState();
		localStorageMock.clear();
		resetApplyTargetState();
	});

	afterEach(() => {
		resetState();
		localStorageMock.clear();
		resetApplyTargetState();
	});

	describe("getSelectedApplyTarget / setSelectedApplyTarget", () => {
		it("should return null initially", () => {
			expect(getSelectedApplyTarget()).toBeNull();
		});

		it("should set and get key target", () => {
			setSelectedApplyTarget("key");
			expect(getSelectedApplyTarget()).toBe("key");
		});

		it("should set and get secondary target", () => {
			setSelectedApplyTarget("secondary");
			expect(getSelectedApplyTarget()).toBe("secondary");
		});

		it("should set and get tertiary target", () => {
			setSelectedApplyTarget("tertiary");
			expect(getSelectedApplyTarget()).toBe("tertiary");
		});

		it("should set and get accent-1 target", () => {
			setSelectedApplyTarget("accent-1");
			expect(getSelectedApplyTarget()).toBe("accent-1");
		});

		it("should set and get accent-4 target", () => {
			setSelectedApplyTarget("accent-4");
			expect(getSelectedApplyTarget()).toBe("accent-4");
		});

		it("should reset to null", () => {
			setSelectedApplyTarget("key");
			setSelectedApplyTarget(null);
			expect(getSelectedApplyTarget()).toBeNull();
		});
	});

	describe("resetApplyTargetState", () => {
		it("should reset state to null", () => {
			setSelectedApplyTarget("key");
			expect(getSelectedApplyTarget()).toBe("key");

			resetApplyTargetState();
			expect(getSelectedApplyTarget()).toBeNull();
		});

		it("should be safe to call multiple times", () => {
			resetApplyTargetState();
			resetApplyTargetState();
			expect(getSelectedApplyTarget()).toBeNull();
		});
	});

	describe("applyColorToManualSelection", () => {
		describe("key color application", () => {
			it("should apply color to keyColor in manualColorSelection", () => {
				applyColorToManualSelection("key", "#ff5454");

				expect(state.manualColorSelection.keyColor).toBe("#ff5454");
			});

			it("should update existing Primary palette keyColors", () => {
				// 既存のPrimaryパレットを作成
				const existingPalette: PaletteConfig = {
					id: "existing-primary",
					name: "Primary",
					keyColors: ["#000000"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				state.palettes.push(existingPalette);

				applyColorToManualSelection("key", "#ff5454");

				const primaryPalette = state.palettes.find((p) =>
					p.name.toLowerCase().startsWith("primary"),
				);
				expect(primaryPalette?.keyColors[0]).toBe("#ff5454");
			});

			it("should create new Primary palette if none exists", () => {
				expect(state.palettes.length).toBe(0);

				applyColorToManualSelection("key", "#ff5454");

				expect(state.palettes.length).toBe(1);
				const primaryPalette = state.palettes.find((p) =>
					p.name.toLowerCase().startsWith("primary"),
				);
				expect(primaryPalette).toBeDefined();
				expect(primaryPalette?.keyColors[0]).toBe("#ff5454");
			});
		});

		describe("secondary color application", () => {
			it("should apply color to secondaryColor in manualColorSelection", () => {
				applyColorToManualSelection("secondary", "#00cc66");

				expect(state.manualColorSelection.secondaryColor).toBe("#00cc66");
			});

			it("should update existing Secondary palette keyColors", () => {
				const existingPalette: PaletteConfig = {
					id: "existing-secondary",
					name: "Secondary",
					keyColors: ["#000000"],
					ratios: [4.5],
					harmony: HarmonyType.ANALOGOUS,
				};
				state.palettes.push(existingPalette);

				applyColorToManualSelection("secondary", "#00cc66");

				const secondaryPalette = state.palettes.find((p) =>
					p.name.toLowerCase().startsWith("secondary"),
				);
				expect(secondaryPalette?.keyColors[0]).toBe("#00cc66");
			});

			it("should create new Secondary palette if none exists", () => {
				applyColorToManualSelection("secondary", "#00cc66");

				const secondaryPalette = state.palettes.find((p) =>
					p.name.toLowerCase().startsWith("secondary"),
				);
				expect(secondaryPalette).toBeDefined();
				expect(secondaryPalette?.keyColors[0]).toBe("#00cc66");
			});

			it("should insert Secondary palette after Primary", () => {
				// Primaryパレットを先に追加
				const primaryPalette: PaletteConfig = {
					id: "primary",
					name: "Primary",
					keyColors: ["#ff0000"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				state.palettes.push(primaryPalette);

				applyColorToManualSelection("secondary", "#00cc66");

				expect(state.palettes[0]?.name).toBe("Primary");
				expect(state.palettes[1]?.name).toBe("Secondary");
			});
		});

		describe("tertiary color application", () => {
			it("should apply color to tertiaryColor in manualColorSelection", () => {
				applyColorToManualSelection("tertiary", "#cc6600");

				expect(state.manualColorSelection.tertiaryColor).toBe("#cc6600");
			});

			it("should update existing Tertiary palette keyColors", () => {
				const existingPalette: PaletteConfig = {
					id: "existing-tertiary",
					name: "Tertiary",
					keyColors: ["#000000"],
					ratios: [4.5],
					harmony: HarmonyType.TRIADIC,
				};
				state.palettes.push(existingPalette);

				applyColorToManualSelection("tertiary", "#cc6600");

				const tertiaryPalette = state.palettes.find((p) =>
					p.name.toLowerCase().startsWith("tertiary"),
				);
				expect(tertiaryPalette?.keyColors[0]).toBe("#cc6600");
			});

			it("should insert Tertiary palette after Secondary", () => {
				const primaryPalette: PaletteConfig = {
					id: "primary",
					name: "Primary",
					keyColors: ["#ff0000"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				const secondaryPalette: PaletteConfig = {
					id: "secondary",
					name: "Secondary",
					keyColors: ["#00ff00"],
					ratios: [4.5],
					harmony: HarmonyType.ANALOGOUS,
				};
				state.palettes.push(primaryPalette, secondaryPalette);

				applyColorToManualSelection("tertiary", "#cc6600");

				expect(state.palettes[0]?.name).toBe("Primary");
				expect(state.palettes[1]?.name).toBe("Secondary");
				expect(state.palettes[2]?.name).toBe("Tertiary");
			});
		});

		describe("accent color application", () => {
			it("should apply color to accent-1 in accentColors array", () => {
				applyColorToManualSelection("accent-1", "#ff0000");

				expect(state.manualColorSelection.accentColors[0]).toBe("#ff0000");
			});

			it("should apply color to accent-2 in accentColors array", () => {
				applyColorToManualSelection("accent-2", "#00ff00");

				expect(state.manualColorSelection.accentColors[1]).toBe("#00ff00");
			});

			it("should apply color to accent-3 in accentColors array", () => {
				applyColorToManualSelection("accent-3", "#0000ff");

				expect(state.manualColorSelection.accentColors[2]).toBe("#0000ff");
			});

			it("should apply color to accent-4 in accentColors array", () => {
				applyColorToManualSelection("accent-4", "#ffff00");

				expect(state.manualColorSelection.accentColors[3]).toBe("#ffff00");
			});

			it("should expand accentColors array when needed", () => {
				// 最初にaccent-3を設定（配列が自動的に拡張される）
				applyColorToManualSelection("accent-3", "#0000ff");

				expect(
					state.manualColorSelection.accentColors.length,
				).toBeGreaterThanOrEqual(3);
				expect(state.manualColorSelection.accentColors[0]).toBeNull();
				expect(state.manualColorSelection.accentColors[1]).toBeNull();
				expect(state.manualColorSelection.accentColors[2]).toBe("#0000ff");
			});

			it("should create Accent palette in state.palettes", () => {
				applyColorToManualSelection("accent-1", "#ff0000");

				const accentPalette = state.palettes.find((p) =>
					p.name.toLowerCase().startsWith("accent 1"),
				);
				expect(accentPalette).toBeDefined();
				expect(accentPalette?.keyColors[0]).toBe("#ff0000");
			});

			it("should update existing Accent palette", () => {
				const existingPalette: PaletteConfig = {
					id: "existing-accent-1",
					name: "Accent 1",
					keyColors: ["#000000"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				state.palettes.push(existingPalette);

				applyColorToManualSelection("accent-1", "#ff0000");

				const accentPalette = state.palettes.find((p) =>
					p.name.toLowerCase().startsWith("accent 1"),
				);
				expect(accentPalette?.keyColors[0]).toBe("#ff0000");
			});
		});

		describe("persistence and callback", () => {
			it("should persist manualColorSelection to localStorage", () => {
				applyColorToManualSelection("key", "#ff5454");

				const stored = localStorageMock.getItem(
					"leonardo-manualColorSelection",
				);
				expect(stored).not.toBeNull();

				const parsed = JSON.parse(stored as string) as ManualColorSelection;
				expect(parsed.keyColor).toBe("#ff5454");
			});

			it("should call onUpdate callback after applying color", () => {
				const onUpdate = mock(() => {});

				applyColorToManualSelection("key", "#ff5454", onUpdate);

				expect(onUpdate).toHaveBeenCalledTimes(1);
			});

			it("should not throw if onUpdate is not provided", () => {
				expect(() => {
					applyColorToManualSelection("key", "#ff5454");
				}).not.toThrow();
			});
		});

		describe("multiple color applications", () => {
			it("should handle applying multiple colors to different targets", () => {
				applyColorToManualSelection("key", "#ff0000");
				applyColorToManualSelection("secondary", "#00ff00");
				applyColorToManualSelection("tertiary", "#0000ff");
				applyColorToManualSelection("accent-1", "#ffff00");
				applyColorToManualSelection("accent-2", "#ff00ff");

				expect(state.manualColorSelection.keyColor).toBe("#ff0000");
				expect(state.manualColorSelection.secondaryColor).toBe("#00ff00");
				expect(state.manualColorSelection.tertiaryColor).toBe("#0000ff");
				expect(state.manualColorSelection.accentColors[0]).toBe("#ffff00");
				expect(state.manualColorSelection.accentColors[1]).toBe("#ff00ff");
			});

			it("should sync all colors to studio palettes", () => {
				applyColorToManualSelection("key", "#ff0000");
				applyColorToManualSelection("secondary", "#00ff00");
				applyColorToManualSelection("tertiary", "#0000ff");
				applyColorToManualSelection("accent-1", "#ffff00");

				const primary = state.palettes.find((p) =>
					p.name.toLowerCase().startsWith("primary"),
				);
				const secondary = state.palettes.find((p) =>
					p.name.toLowerCase().startsWith("secondary"),
				);
				const tertiary = state.palettes.find((p) =>
					p.name.toLowerCase().startsWith("tertiary"),
				);
				const accent1 = state.palettes.find((p) =>
					p.name.toLowerCase().startsWith("accent 1"),
				);

				expect(primary?.keyColors[0]).toBe("#ff0000");
				expect(secondary?.keyColors[0]).toBe("#00ff00");
				expect(tertiary?.keyColors[0]).toBe("#0000ff");
				expect(accent1?.keyColors[0]).toBe("#ffff00");
			});

			it("should maintain palette order: Primary, Secondary, Tertiary, Accents", () => {
				applyColorToManualSelection("accent-1", "#ffff00");
				applyColorToManualSelection("tertiary", "#0000ff");
				applyColorToManualSelection("secondary", "#00ff00");
				applyColorToManualSelection("key", "#ff0000");

				// Primaryが先頭、Secondaryがその後、Tertiaryがその後、Accentが末尾
				const primaryIndex = state.palettes.findIndex((p) =>
					p.name.toLowerCase().startsWith("primary"),
				);
				const secondaryIndex = state.palettes.findIndex((p) =>
					p.name.toLowerCase().startsWith("secondary"),
				);
				const tertiaryIndex = state.palettes.findIndex((p) =>
					p.name.toLowerCase().startsWith("tertiary"),
				);
				const accent1Index = state.palettes.findIndex((p) =>
					p.name.toLowerCase().startsWith("accent 1"),
				);

				expect(primaryIndex).toBeLessThan(secondaryIndex);
				expect(secondaryIndex).toBeLessThan(tertiaryIndex);
				expect(tertiaryIndex).toBeLessThan(accent1Index);
			});
		});
	});

	describe("state synchronization", () => {
		it("should update state.manualColorSelection directly", () => {
			const initialSelection = { ...state.manualColorSelection };

			applyColorToManualSelection("key", "#ff5454");

			expect(state.manualColorSelection.keyColor).toBe("#ff5454");
			expect(initialSelection.keyColor).not.toBe("#ff5454");
		});

		it("should reflect changes in state.palettes", () => {
			applyColorToManualSelection("key", "#ff5454");

			const hasPrimaryPalette = state.palettes.some((p) =>
				p.name.toLowerCase().startsWith("primary"),
			);
			expect(hasPrimaryPalette).toBe(true);
		});
	});

	describe("syncFromStudioPalettes", () => {
		describe("Primary palette sync", () => {
			it("should sync Primary palette to keyColor", () => {
				const primaryPalette: PaletteConfig = {
					id: "studio-primary",
					name: "Primary",
					keyColors: ["#ff5454"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				state.palettes.push(primaryPalette);

				syncFromStudioPalettes();

				expect(state.manualColorSelection.keyColor).toBe("#ff5454");
			});

			it("should set keyColor to null when Primary palette is missing", () => {
				// No palettes added
				syncFromStudioPalettes();

				expect(state.manualColorSelection.keyColor).toBeNull();
			});

			it("should parse keyColor with step suffix", () => {
				const primaryPalette: PaletteConfig = {
					id: "studio-primary",
					name: "Primary",
					keyColors: ["#ff5454@600"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				state.palettes.push(primaryPalette);

				syncFromStudioPalettes();

				expect(state.manualColorSelection.keyColor).toBe("#ff5454");
			});
		});

		describe("Secondary palette sync", () => {
			it("should sync Secondary palette to secondaryColor", () => {
				const secondaryPalette: PaletteConfig = {
					id: "studio-secondary",
					name: "Secondary",
					keyColors: ["#00cc66"],
					ratios: [4.5],
					harmony: HarmonyType.ANALOGOUS,
				};
				state.palettes.push(secondaryPalette);

				syncFromStudioPalettes();

				expect(state.manualColorSelection.secondaryColor).toBe("#00cc66");
			});

			it("should set secondaryColor to null when Secondary palette is missing", () => {
				syncFromStudioPalettes();

				expect(state.manualColorSelection.secondaryColor).toBeNull();
			});
		});

		describe("Tertiary palette sync", () => {
			it("should sync Tertiary palette to tertiaryColor", () => {
				const tertiaryPalette: PaletteConfig = {
					id: "studio-tertiary",
					name: "Tertiary",
					keyColors: ["#cc6600"],
					ratios: [4.5],
					harmony: HarmonyType.TRIADIC,
				};
				state.palettes.push(tertiaryPalette);

				syncFromStudioPalettes();

				expect(state.manualColorSelection.tertiaryColor).toBe("#cc6600");
			});

			it("should set tertiaryColor to null when Tertiary palette is missing", () => {
				syncFromStudioPalettes();

				expect(state.manualColorSelection.tertiaryColor).toBeNull();
			});
		});

		describe("Accent palettes sync", () => {
			it("should sync Accent 1 palette to accentColors[0]", () => {
				const accentPalette: PaletteConfig = {
					id: "studio-accent-1",
					name: "Accent 1",
					keyColors: ["#ff0000"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				state.palettes.push(accentPalette);

				syncFromStudioPalettes();

				expect(state.manualColorSelection.accentColors[0]).toBe("#ff0000");
			});

			it("should sync multiple Accent palettes", () => {
				const accent1: PaletteConfig = {
					id: "studio-accent-1",
					name: "Accent 1",
					keyColors: ["#ff0000"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				const accent2: PaletteConfig = {
					id: "studio-accent-2",
					name: "Accent 2",
					keyColors: ["#00ff00"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				state.palettes.push(accent1, accent2);

				syncFromStudioPalettes();

				expect(state.manualColorSelection.accentColors[0]).toBe("#ff0000");
				expect(state.manualColorSelection.accentColors[1]).toBe("#00ff00");
			});

			it("should trim trailing nulls from accentColors", () => {
				// Only Accent 1 exists, Accent 2-4 are missing
				const accent1: PaletteConfig = {
					id: "studio-accent-1",
					name: "Accent 1",
					keyColors: ["#ff0000"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				state.palettes.push(accent1);

				syncFromStudioPalettes();

				// accentColors is always normalized to 4 elements
				expect(state.manualColorSelection.accentColors.length).toBe(4);
				expect(state.manualColorSelection.accentColors[0]).toBe("#ff0000");
				expect(state.manualColorSelection.accentColors.slice(1)).toEqual([
					null,
					null,
					null,
				]);
			});

			it("should return normalized array with all nulls when no Accent palettes exist", () => {
				syncFromStudioPalettes();

				// accentColors is always normalized to 4 elements (all null when empty)
				expect(state.manualColorSelection.accentColors).toEqual([
					null,
					null,
					null,
					null,
				]);
			});
		});

		describe("full palette sync", () => {
			it("should sync all palette types at once", () => {
				const primary: PaletteConfig = {
					id: "p",
					name: "Primary",
					keyColors: ["#ff0000"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				const secondary: PaletteConfig = {
					id: "s",
					name: "Secondary",
					keyColors: ["#00ff00"],
					ratios: [4.5],
					harmony: HarmonyType.ANALOGOUS,
				};
				const tertiary: PaletteConfig = {
					id: "t",
					name: "Tertiary",
					keyColors: ["#0000ff"],
					ratios: [4.5],
					harmony: HarmonyType.TRIADIC,
				};
				const accent1: PaletteConfig = {
					id: "a1",
					name: "Accent 1",
					keyColors: ["#ffff00"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				const accent2: PaletteConfig = {
					id: "a2",
					name: "Accent 2",
					keyColors: ["#ff00ff"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};

				state.palettes.push(primary, secondary, tertiary, accent1, accent2);

				syncFromStudioPalettes();

				expect(state.manualColorSelection.keyColor).toBe("#ff0000");
				expect(state.manualColorSelection.secondaryColor).toBe("#00ff00");
				expect(state.manualColorSelection.tertiaryColor).toBe("#0000ff");
				expect(state.manualColorSelection.accentColors[0]).toBe("#ffff00");
				expect(state.manualColorSelection.accentColors[1]).toBe("#ff00ff");
			});

			it("should sync background and text colors from state", () => {
				state.lightBackgroundColor = "#f8fafc";
				state.darkBackgroundColor = "#18181b";

				syncFromStudioPalettes();

				expect(state.manualColorSelection.backgroundColor).toBe("#f8fafc");
				expect(state.manualColorSelection.textColor).toBe("#18181b");
			});

			it("should persist to localStorage after sync", () => {
				const primary: PaletteConfig = {
					id: "p",
					name: "Primary",
					keyColors: ["#ff5454"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				state.palettes.push(primary);

				syncFromStudioPalettes();

				const stored = localStorageMock.getItem(
					"leonardo-manualColorSelection",
				);
				expect(stored).not.toBeNull();

				const parsed = JSON.parse(stored as string) as ManualColorSelection;
				expect(parsed.keyColor).toBe("#ff5454");
			});
		});

		describe("bidirectional sync", () => {
			it("should maintain sync: studio → manual → studio", () => {
				// 1. Create studio palette
				const primary: PaletteConfig = {
					id: "p",
					name: "Primary",
					keyColors: ["#ff0000"],
					ratios: [4.5],
					harmony: HarmonyType.COMPLEMENTARY,
				};
				state.palettes.push(primary);

				// 2. Sync to manual
				syncFromStudioPalettes();
				expect(state.manualColorSelection.keyColor).toBe("#ff0000");

				// 3. Update via manual selection (updates studio palette)
				applyColorToManualSelection("key", "#00ff00");
				expect(state.palettes[0]?.keyColors[0]).toBe("#00ff00");

				// 4. Sync back to manual (should still have updated value)
				syncFromStudioPalettes();
				expect(state.manualColorSelection.keyColor).toBe("#00ff00");
			});
		});
	});
});

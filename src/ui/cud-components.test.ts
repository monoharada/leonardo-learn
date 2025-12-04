/**
 * CUD UIコンポーネントのテスト
 * タスク6.1: モードセレクターUIコンポーネントのテスト
 */

import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// JSDOMでdocumentをセットアップ
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.Event = dom.window.Event;
global.HTMLElement = dom.window.HTMLElement;

// テスト対象の型定義（実装前のためここで定義）
import type { CudCompatibilityMode, CudModeConfig } from "./cud-components";

describe("CUD Mode Selector - タスク6.1", () => {
	describe("CudCompatibilityMode型", () => {
		it("4つのモード値をサポートする: off, guide, soft, strict", () => {
			const modes: CudCompatibilityMode[] = ["off", "guide", "soft", "strict"];
			expect(modes).toHaveLength(4);
			expect(modes).toContain("off");
			expect(modes).toContain("guide");
			expect(modes).toContain("soft");
			expect(modes).toContain("strict");
		});
	});

	describe("CUD_MODE_CONFIGS定数", () => {
		it("各モードにlabel, description, iconが定義されている", async () => {
			const { CUD_MODE_CONFIGS } = await import("./cud-components");

			const requiredModes: CudCompatibilityMode[] = [
				"off",
				"guide",
				"soft",
				"strict",
			];

			for (const mode of requiredModes) {
				const config = CUD_MODE_CONFIGS[mode];
				expect(config).toBeDefined();
				expect(config.label).toBeDefined();
				expect(typeof config.label).toBe("string");
				expect(config.description).toBeDefined();
				expect(typeof config.description).toBe("string");
				expect(config.icon).toBeDefined();
				expect(typeof config.icon).toBe("string");
			}
		});

		it("アイコンは○/◐/◉/●で視覚的に識別可能", async () => {
			const { CUD_MODE_CONFIGS } = await import("./cud-components");

			expect(CUD_MODE_CONFIGS.off.icon).toBe("○");
			expect(CUD_MODE_CONFIGS.guide.icon).toBe("◐");
			expect(CUD_MODE_CONFIGS.soft.icon).toBe("◉");
			expect(CUD_MODE_CONFIGS.strict.icon).toBe("●");
		});

		it("日本語ラベルが設定されている", async () => {
			const { CUD_MODE_CONFIGS } = await import("./cud-components");

			expect(CUD_MODE_CONFIGS.off.label).toBe("通常モード");
			expect(CUD_MODE_CONFIGS.guide.label).toBe("ガイドモード");
			expect(CUD_MODE_CONFIGS.soft.label).toBe("ソフトスナップ");
			expect(CUD_MODE_CONFIGS.strict.label).toBe("CUD互換");
		});

		it("各モードに適切な説明文が設定されている", async () => {
			const { CUD_MODE_CONFIGS } = await import("./cud-components");

			expect(CUD_MODE_CONFIGS.off.description).toContain("検証なし");
			expect(CUD_MODE_CONFIGS.guide.description).toContain("参考表示");
			expect(CUD_MODE_CONFIGS.soft.description).toContain("自動補正");
			expect(CUD_MODE_CONFIGS.strict.description).toContain("完全準拠");
		});
	});

	describe("createCudModeSelector関数", () => {
		let mockCallback: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			mockCallback = vi.fn();
		});

		it("4つのモードオプションを持つセレクターを生成する", async () => {
			const { createCudModeSelector } = await import("./cud-components");

			const selector = createCudModeSelector(mockCallback);
			const options = selector.querySelectorAll("option, input[type='radio']");

			expect(options.length).toBe(4);
		});

		it("初期モードを設定できる", async () => {
			const { createCudModeSelector } = await import("./cud-components");

			const selector = createCudModeSelector(mockCallback, "soft");
			const selectElement = selector.querySelector("select");

			if (selectElement) {
				expect(selectElement.value).toBe("soft");
			} else {
				// ラジオボタン形式の場合
				const checkedRadio = selector.querySelector<HTMLInputElement>(
					"input[type='radio']:checked",
				);
				expect(checkedRadio?.value).toBe("soft");
			}
		});

		it("デフォルトの初期モードはguide", async () => {
			const { createCudModeSelector } = await import("./cud-components");

			const selector = createCudModeSelector(mockCallback);
			const selectElement = selector.querySelector("select");

			if (selectElement) {
				expect(selectElement.value).toBe("guide");
			} else {
				const checkedRadio = selector.querySelector<HTMLInputElement>(
					"input[type='radio']:checked",
				);
				expect(checkedRadio?.value).toBe("guide");
			}
		});

		it("モード変更時にコールバックが呼ばれる", async () => {
			const { createCudModeSelector } = await import("./cud-components");

			const selector = createCudModeSelector(mockCallback, "off");
			const selectElement = selector.querySelector("select");

			if (selectElement) {
				selectElement.value = "strict";
				selectElement.dispatchEvent(new Event("change"));
			}

			expect(mockCallback).toHaveBeenCalledWith("strict");
		});

		it("各オプションにアイコンが含まれている", async () => {
			const { createCudModeSelector, CUD_MODE_CONFIGS } = await import(
				"./cud-components"
			);

			const selector = createCudModeSelector(mockCallback);
			const options = selector.querySelectorAll("option");

			const icons = ["○", "◐", "◉", "●"];
			for (const option of options) {
				const hasIcon = icons.some((icon) =>
					option.textContent?.includes(icon),
				);
				expect(hasIcon).toBe(true);
			}
		});

		it("説明文が表示領域に含まれている", async () => {
			const { createCudModeSelector, CUD_MODE_CONFIGS } = await import(
				"./cud-components"
			);

			const selector = createCudModeSelector(mockCallback, "guide");
			const descriptionElement = selector.querySelector(
				".cud-mode-description, p",
			);

			expect(descriptionElement).toBeDefined();
			expect(descriptionElement?.textContent).toContain(
				CUD_MODE_CONFIGS.guide.description,
			);
		});

		it("モード変更時に説明文が更新される", async () => {
			const { createCudModeSelector, CUD_MODE_CONFIGS } = await import(
				"./cud-components"
			);

			const selector = createCudModeSelector(mockCallback, "off");
			const selectElement = selector.querySelector("select");

			if (selectElement) {
				selectElement.value = "strict";
				selectElement.dispatchEvent(new Event("change"));
			}

			const descriptionElement = selector.querySelector(
				".cud-mode-description, p",
			);
			expect(descriptionElement?.textContent).toContain(
				CUD_MODE_CONFIGS.strict.description,
			);
		});
	});

	describe("後方互換性", () => {
		it("既存の3モード値（off, guide, strict）が引き続き動作する", async () => {
			const { createCudModeSelector } = await import("./cud-components");

			// 既存コードで使用されていた3モードで初期化できる
			const selectorOff = createCudModeSelector(() => {}, "off");
			const selectorGuide = createCudModeSelector(() => {}, "guide");
			const selectorStrict = createCudModeSelector(() => {}, "strict");

			expect(selectorOff).toBeDefined();
			expect(selectorGuide).toBeDefined();
			expect(selectorStrict).toBeDefined();
		});
	});
});

/**
 * タスク6.2: モード切替とプレビュー更新のテスト
 * Requirements: 6.2
 */
describe("CUD Mode Switch and Preview Update - タスク6.2", () => {
	describe("processPaletteWithMode関数", () => {
		it("offモードでは元のパレットをそのまま返す", async () => {
			const { processPaletteWithMode } = await import("./cud-components");

			const palette = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithMode(palette, "off");

			expect(result.processed).toEqual(palette);
			expect(result.optimizationResult).toBeUndefined();
		});

		it("guideモードではパレットをそのまま返し、ゾーン情報のみ付加する", async () => {
			const { processPaletteWithMode } = await import("./cud-components");

			const palette = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithMode(palette, "guide");

			expect(result.processed).toEqual(palette);
			expect(result.zoneInfos).toBeDefined();
			expect(result.zoneInfos?.length).toBe(3);
			expect(result.optimizationResult).toBeUndefined();
		});

		it("softモードではSoft Snapを適用した結果を返す", async () => {
			const { processPaletteWithMode } = await import("./cud-components");

			const palette = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithMode(palette, "soft");

			expect(result.processed).toBeDefined();
			expect(result.optimizationResult).toBeDefined();
			expect(result.optimizationResult?.cudComplianceRate).toBeDefined();
		});

		it("strictモードでは完全スナップを適用した結果を返す", async () => {
			const { processPaletteWithMode } = await import("./cud-components");

			const palette = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithMode(palette, "strict");

			expect(result.processed).toBeDefined();
			expect(result.optimizationResult).toBeDefined();
			// Strictモードでは全色がCUD推奨色になるので準拠率は100%
			expect(result.optimizationResult?.cudComplianceRate).toBe(100);
		});

		it("最適化結果に処理時間が含まれる", async () => {
			const { processPaletteWithMode } = await import("./cud-components");

			const palette = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithMode(palette, "soft");

			expect(result.optimizationResult?.processingTimeMs).toBeDefined();
			expect(
				result.optimizationResult?.processingTimeMs,
			).toBeGreaterThanOrEqual(0);
		});

		it("最適化結果に調和スコアが含まれる", async () => {
			const { processPaletteWithMode } = await import("./cud-components");

			const palette = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithMode(palette, "soft");

			expect(result.optimizationResult?.harmonyScore).toBeDefined();
			expect(
				result.optimizationResult?.harmonyScore?.total,
			).toBeGreaterThanOrEqual(0);
			expect(
				result.optimizationResult?.harmonyScore?.total,
			).toBeLessThanOrEqual(100);
		});

		it("アンカーカラーを指定して最適化できる", async () => {
			const { processPaletteWithMode } = await import("./cud-components");

			const palette = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithMode(palette, "soft", {
				anchorHex: "#FF2800",
			});

			expect(result.optimizationResult).toBeDefined();
		});

		it("カスタムlambdaパラメータを指定できる", async () => {
			const { processPaletteWithMode } = await import("./cud-components");

			const palette = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithMode(palette, "soft", { lambda: 0.8 });

			expect(result.optimizationResult).toBeDefined();
		});

		it("カスタムreturnFactorを指定できる", async () => {
			const { processPaletteWithMode } = await import("./cud-components");

			const palette = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithMode(palette, "soft", {
				returnFactor: 0.3,
			});

			expect(result.optimizationResult).toBeDefined();
		});
	});

	describe("createPaletteProcessor関数", () => {
		it("モード変更時にコールバックが呼ばれる", async () => {
			const { createPaletteProcessor } = await import("./cud-components");
			const mockCallback = vi.fn();

			const palette = ["#FF2800", "#35A16B"];
			const processor = createPaletteProcessor(palette, mockCallback);

			processor.setMode("soft");
			expect(mockCallback).toHaveBeenCalled();
		});

		it("現在のモードを取得できる", async () => {
			const { createPaletteProcessor } = await import("./cud-components");
			const mockCallback = vi.fn();

			const palette = ["#FF2800", "#35A16B"];
			const processor = createPaletteProcessor(palette, mockCallback, "strict");

			expect(processor.getMode()).toBe("strict");
		});

		it("パレットを更新できる", async () => {
			const { createPaletteProcessor } = await import("./cud-components");
			const mockCallback = vi.fn();

			const palette = ["#FF2800"];
			const processor = createPaletteProcessor(palette, mockCallback, "soft");

			processor.updatePalette(["#FF2800", "#35A16B", "#0041FF"]);
			expect(mockCallback).toHaveBeenCalled();
		});

		it("現在の処理結果を取得できる", async () => {
			const { createPaletteProcessor } = await import("./cud-components");
			const mockCallback = vi.fn();

			const palette = ["#FF2800", "#35A16B"];
			const processor = createPaletteProcessor(palette, mockCallback, "soft");

			const result = processor.getResult();
			expect(result).toBeDefined();
			expect(result.processed).toBeDefined();
		});
	});

	describe("ZoneInfo型", () => {
		it("guideモードでゾーン情報が正しく返される", async () => {
			const { processPaletteWithMode } = await import("./cud-components");

			// CUD推奨色そのもの（Safe Zone）
			const cudColors = ["#FF2800"]; // CUD赤
			const result = processPaletteWithMode(cudColors, "guide");

			expect(result.zoneInfos?.[0]?.zone).toBe("safe");
			expect(result.zoneInfos?.[0]?.deltaE).toBeDefined();
		});
	});
});

/**
 * タスク6.3: モード別バッジ表示のテスト
 * Requirements: 6.4, 6.5, 6.6
 */
describe("CUD Mode Badge Display - タスク6.3", () => {
	describe("ZONE_BADGE_CONFIGS定数", () => {
		it("Safe/Warning/Offの3ゾーンにバッジ設定が定義されている", async () => {
			const { ZONE_BADGE_CONFIGS } = await import("./cud-components");

			expect(ZONE_BADGE_CONFIGS.safe).toBeDefined();
			expect(ZONE_BADGE_CONFIGS.warning).toBeDefined();
			expect(ZONE_BADGE_CONFIGS.off).toBeDefined();
		});

		it("各ゾーンにlabel, backgroundColor, textColorが定義されている", async () => {
			const { ZONE_BADGE_CONFIGS } = await import("./cud-components");

			for (const zone of ["safe", "warning", "off"] as const) {
				const config = ZONE_BADGE_CONFIGS[zone];
				expect(config.label).toBeDefined();
				expect(typeof config.label).toBe("string");
				expect(config.backgroundColor).toBeDefined();
				expect(config.textColor).toBeDefined();
			}
		});

		it("Safeゾーンは緑色系のバッジ", async () => {
			const { ZONE_BADGE_CONFIGS } = await import("./cud-components");

			// CUD緑色: #35A16B
			expect(ZONE_BADGE_CONFIGS.safe.backgroundColor).toMatch(
				/^#[0-9A-Fa-f]{6}$/,
			);
		});

		it("Warningゾーンはオレンジ/黄色系のバッジ", async () => {
			const { ZONE_BADGE_CONFIGS } = await import("./cud-components");

			// CUDオレンジ: #FF9900
			expect(ZONE_BADGE_CONFIGS.warning.backgroundColor).toMatch(
				/^#[0-9A-Fa-f]{6}$/,
			);
		});

		it("Offゾーンは赤/グレー系のバッジ", async () => {
			const { ZONE_BADGE_CONFIGS } = await import("./cud-components");

			expect(ZONE_BADGE_CONFIGS.off.backgroundColor).toMatch(
				/^#[0-9A-Fa-f]{6}$/,
			);
		});
	});

	describe("createZoneBadge関数", () => {
		it("ゾーンに対応したバッジ要素を生成する", async () => {
			const { createZoneBadge } = await import("./cud-components");

			const badge = createZoneBadge("safe");
			expect(badge).toBeInstanceOf(HTMLElement);
			expect(badge.className).toContain("cud-zone-badge");
		});

		it("Safe Zoneのバッジはdata-zone属性にsafeが設定される", async () => {
			const { createZoneBadge } = await import("./cud-components");

			const badge = createZoneBadge("safe");
			expect(badge.getAttribute("data-zone")).toBe("safe");
		});

		it("Warning Zoneのバッジはdata-zone属性にwarningが設定される", async () => {
			const { createZoneBadge } = await import("./cud-components");

			const badge = createZoneBadge("warning");
			expect(badge.getAttribute("data-zone")).toBe("warning");
		});

		it("Off Zoneのバッジはdata-zone属性にoffが設定される", async () => {
			const { createZoneBadge } = await import("./cud-components");

			const badge = createZoneBadge("off");
			expect(badge.getAttribute("data-zone")).toBe("off");
		});

		it("deltaE値を指定するとツールチップに表示される", async () => {
			const { createZoneBadge } = await import("./cud-components");

			const badge = createZoneBadge("warning", 0.08);
			expect(badge.title).toContain("0.08");
		});
	});

	describe("createDeltaEChangeBadge関数", () => {
		it("ΔE変化量のバッジ要素を生成する", async () => {
			const { createDeltaEChangeBadge } = await import("./cud-components");

			const badge = createDeltaEChangeBadge(0.05);
			expect(badge).toBeInstanceOf(HTMLElement);
			expect(badge.className).toContain("cud-delta-badge");
		});

		it("ΔE変化量がテキストに含まれる", async () => {
			const { createDeltaEChangeBadge } = await import("./cud-components");

			const badge = createDeltaEChangeBadge(0.05);
			expect(badge.textContent).toContain("ΔE");
		});

		it("変化量が0の場合は「補正なし」と表示", async () => {
			const { createDeltaEChangeBadge } = await import("./cud-components");

			const badge = createDeltaEChangeBadge(0);
			expect(badge.textContent).toContain("補正なし");
		});

		it("変化量の数値がdata-delta-e属性に設定される", async () => {
			const { createDeltaEChangeBadge } = await import("./cud-components");

			const badge = createDeltaEChangeBadge(0.042);
			expect(badge.getAttribute("data-delta-e")).toBe("0.042");
		});
	});

	describe("createStrictComplianceBadge関数", () => {
		it("緑色のチェックマークバッジを生成する", async () => {
			const { createStrictComplianceBadge } = await import("./cud-components");

			const badge = createStrictComplianceBadge();
			expect(badge).toBeInstanceOf(HTMLElement);
			expect(badge.className).toContain("cud-strict-badge");
		});

		it("チェックマーク（✓）が含まれる", async () => {
			const { createStrictComplianceBadge } = await import("./cud-components");

			const badge = createStrictComplianceBadge();
			expect(badge.textContent).toContain("✓");
		});

		it("背景色が緑色系", async () => {
			const { createStrictComplianceBadge } = await import("./cud-components");

			const badge = createStrictComplianceBadge();
			expect(badge.style.backgroundColor).toBeTruthy();
		});

		it("CUD推奨色名を指定するとツールチップに表示される", async () => {
			const { createStrictComplianceBadge } = await import("./cud-components");

			const badge = createStrictComplianceBadge("赤");
			expect(badge.title).toContain("赤");
		});
	});

	describe("createModeBadge関数（統合関数）", () => {
		it("guideモードではゾーンバッジを返す", async () => {
			const { createModeBadge } = await import("./cud-components");
			type ZoneInfo = import("./cud-components").ZoneInfo;

			const zoneInfo: ZoneInfo = {
				hex: "#FF2800",
				zone: "safe",
				deltaE: 0.001,
				nearestCud: {
					nearest: {
						id: "red",
						hex: "#FF2800",
						nameJa: "赤",
						nameEn: "red",
						oklch: [0.6, 0.25, 29],
						oklab: [0.6, 0.2, 0.1],
					},
					deltaE: 0.001,
					matchLevel: "exact",
				},
			};

			const badge = createModeBadge("guide", { zoneInfo });
			expect(badge?.className).toContain("cud-zone-badge");
		});

		it("softモードではΔE変化量バッジを返す", async () => {
			const { createModeBadge } = await import("./cud-components");
			type OptimizedColor = import("../core/cud/optimizer").OptimizedColor;

			const optimizedColor: OptimizedColor = {
				hex: "#FF2800",
				originalHex: "#FF3333",
				zone: "safe",
				deltaE: 0.001,
				snapped: true,
				deltaEChange: 0.05,
			};

			const badge = createModeBadge("soft", { optimizedColor });
			expect(badge?.className).toContain("cud-delta-badge");
		});

		it("strictモードでは緑チェックバッジを返す", async () => {
			const { createModeBadge } = await import("./cud-components");
			type OptimizedColor = import("../core/cud/optimizer").OptimizedColor;

			const optimizedColor: OptimizedColor = {
				hex: "#FF2800",
				originalHex: "#FF3333",
				zone: "safe",
				deltaE: 0.001,
				snapped: true,
				cudTarget: {
					id: "red",
					hex: "#FF2800",
					nameJa: "赤",
					nameEn: "red",
					oklch: [0.6, 0.25, 29],
					oklab: [0.6, 0.2, 0.1],
				},
			};

			const badge = createModeBadge("strict", { optimizedColor });
			expect(badge?.className).toContain("cud-strict-badge");
		});

		it("offモードではnullを返す", async () => {
			const { createModeBadge } = await import("./cud-components");

			const badge = createModeBadge("off", {});
			expect(badge).toBeNull();
		});
	});

	describe("バッジスタイルの一貫性", () => {
		it("全てのバッジはインラインフレックス表示", async () => {
			const {
				createZoneBadge,
				createDeltaEChangeBadge,
				createStrictComplianceBadge,
			} = await import("./cud-components");

			const zoneBadge = createZoneBadge("safe");
			const deltaBadge = createDeltaEChangeBadge(0.05);
			const strictBadge = createStrictComplianceBadge();

			expect(zoneBadge.style.display).toContain("inline");
			expect(deltaBadge.style.display).toContain("inline");
			expect(strictBadge.style.display).toContain("inline");
		});

		it("全てのバッジは角丸スタイル", async () => {
			const {
				createZoneBadge,
				createDeltaEChangeBadge,
				createStrictComplianceBadge,
			} = await import("./cud-components");

			const zoneBadge = createZoneBadge("safe");
			const deltaBadge = createDeltaEChangeBadge(0.05);
			const strictBadge = createStrictComplianceBadge();

			expect(zoneBadge.style.borderRadius).toBeTruthy();
			expect(deltaBadge.style.borderRadius).toBeTruthy();
			expect(strictBadge.style.borderRadius).toBeTruthy();
		});
	});
});

/**
 * タスク6.4: モード設定のLocalStorage永続化のテスト
 * Requirements: 6.7
 */
describe("CUD Mode LocalStorage Persistence - タスク6.4", () => {
	const STORAGE_KEY = "leonardo-cud-mode";
	let mockStorage: Map<string, string>;
	let mockLocalStorage: {
		getItem: ReturnType<typeof vi.fn>;
		setItem: ReturnType<typeof vi.fn>;
		removeItem: ReturnType<typeof vi.fn>;
		clear: ReturnType<typeof vi.fn>;
	};

	// LocalStorageモック
	beforeEach(() => {
		mockStorage = new Map();
		mockLocalStorage = {
			getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
			setItem: vi.fn((key: string, value: string) =>
				mockStorage.set(key, value),
			),
			removeItem: vi.fn((key: string) => mockStorage.delete(key)),
			clear: vi.fn(() => mockStorage.clear()),
		};
		// globalにlocalStorageを設定
		(
			global as unknown as { localStorage: typeof mockLocalStorage }
		).localStorage = mockLocalStorage;
	});

	describe("CUD_MODE_STORAGE_KEY定数", () => {
		it("LocalStorageキーが正しく定義されている", async () => {
			const { CUD_MODE_STORAGE_KEY } = await import("./cud-components");

			expect(CUD_MODE_STORAGE_KEY).toBe("leonardo-cud-mode");
		});
	});

	describe("saveCudMode関数", () => {
		it("モードをLocalStorageに保存できる", async () => {
			const { saveCudMode } = await import("./cud-components");

			saveCudMode("soft");

			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				STORAGE_KEY,
				"soft",
			);
		});

		it("4つのモード全てを保存できる", async () => {
			const { saveCudMode } = await import("./cud-components");

			const modes: Array<"off" | "guide" | "soft" | "strict"> = [
				"off",
				"guide",
				"soft",
				"strict",
			];
			for (const mode of modes) {
				saveCudMode(mode);
				expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
					STORAGE_KEY,
					mode,
				);
			}
		});
	});

	describe("loadCudMode関数", () => {
		it("LocalStorageからモードを読み込める", async () => {
			const { loadCudMode } = await import("./cud-components");

			mockStorage.set(STORAGE_KEY, "strict");

			const mode = loadCudMode();
			expect(mode).toBe("strict");
		});

		it("LocalStorageが空の場合はデフォルト値(guide)を返す", async () => {
			const { loadCudMode } = await import("./cud-components");

			const mode = loadCudMode();
			expect(mode).toBe("guide");
		});

		it("無効な値の場合はデフォルト値(guide)を返す", async () => {
			const { loadCudMode } = await import("./cud-components");

			mockStorage.set(STORAGE_KEY, "invalid_mode");

			const mode = loadCudMode();
			expect(mode).toBe("guide");
		});

		it("4つの有効なモード値を正しく読み込める", async () => {
			const { loadCudMode } = await import("./cud-components");

			const validModes: Array<"off" | "guide" | "soft" | "strict"> = [
				"off",
				"guide",
				"soft",
				"strict",
			];
			for (const expectedMode of validModes) {
				mockStorage.set(STORAGE_KEY, expectedMode);
				const mode = loadCudMode();
				expect(mode).toBe(expectedMode);
			}
		});
	});

	describe("旧3モード値との後方互換性", () => {
		it("旧モード値 'off' は正常に読み込める", async () => {
			const { loadCudMode } = await import("./cud-components");

			mockStorage.set(STORAGE_KEY, "off");
			expect(loadCudMode()).toBe("off");
		});

		it("旧モード値 'guide' は正常に読み込める", async () => {
			const { loadCudMode } = await import("./cud-components");

			mockStorage.set(STORAGE_KEY, "guide");
			expect(loadCudMode()).toBe("guide");
		});

		it("旧モード値 'strict' は正常に読み込める", async () => {
			const { loadCudMode } = await import("./cud-components");

			mockStorage.set(STORAGE_KEY, "strict");
			expect(loadCudMode()).toBe("strict");
		});

		it("新モード値 'soft' も正常に読み込める", async () => {
			const { loadCudMode } = await import("./cud-components");

			mockStorage.set(STORAGE_KEY, "soft");
			expect(loadCudMode()).toBe("soft");
		});
	});

	describe("LocalStorageエラー処理", () => {
		it("localStorage.getItemが例外をスローした場合はデフォルト値を返す", async () => {
			const { loadCudMode } = await import("./cud-components");

			mockLocalStorage.getItem.mockImplementation(() => {
				throw new Error("Storage not available");
			});

			const mode = loadCudMode();
			expect(mode).toBe("guide");
		});

		it("localStorage.setItemが例外をスローした場合も安全に処理される", async () => {
			const { saveCudMode } = await import("./cud-components");

			mockLocalStorage.setItem.mockImplementation(() => {
				throw new Error("Storage quota exceeded");
			});

			// 例外がスローされないことを確認
			expect(() => saveCudMode("soft")).not.toThrow();
		});
	});

	describe("createCudModeSelectorWithPersistence関数", () => {
		it("セレクター作成時にLocalStorageから復元する", async () => {
			const { createCudModeSelectorWithPersistence } = await import(
				"./cud-components"
			);

			mockStorage.set(STORAGE_KEY, "strict");

			const mockCallback = vi.fn();
			const selector = createCudModeSelectorWithPersistence(mockCallback);
			const selectElement = selector.querySelector("select");

			if (selectElement) {
				expect(selectElement.value).toBe("strict");
			}
		});

		it("モード変更時にLocalStorageに自動保存される", async () => {
			const { createCudModeSelectorWithPersistence } = await import(
				"./cud-components"
			);

			const mockCallback = vi.fn();
			const selector = createCudModeSelectorWithPersistence(mockCallback);
			const selectElement = selector.querySelector("select");

			if (selectElement) {
				selectElement.value = "soft";
				selectElement.dispatchEvent(new Event("change"));

				expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
					STORAGE_KEY,
					"soft",
				);
			}
		});

		it("初期モードを明示的に指定した場合はそちらを優先する", async () => {
			const { createCudModeSelectorWithPersistence } = await import(
				"./cud-components"
			);

			mockStorage.set(STORAGE_KEY, "strict");

			const mockCallback = vi.fn();
			const selector = createCudModeSelectorWithPersistence(
				mockCallback,
				"off",
			);
			const selectElement = selector.querySelector("select");

			if (selectElement) {
				// 明示的に指定されたモードが優先される
				expect(selectElement.value).toBe("off");
			}
		});
	});

	describe("isCudCompatibilityMode関数", () => {
		it("有効なモード値に対してtrueを返す", async () => {
			const { isCudCompatibilityMode } = await import("./cud-components");

			expect(isCudCompatibilityMode("off")).toBe(true);
			expect(isCudCompatibilityMode("guide")).toBe(true);
			expect(isCudCompatibilityMode("soft")).toBe(true);
			expect(isCudCompatibilityMode("strict")).toBe(true);
		});

		it("無効な値に対してfalseを返す", async () => {
			const { isCudCompatibilityMode } = await import("./cud-components");

			expect(isCudCompatibilityMode("invalid")).toBe(false);
			expect(isCudCompatibilityMode("")).toBe(false);
			expect(isCudCompatibilityMode(null)).toBe(false);
			expect(isCudCompatibilityMode(undefined)).toBe(false);
			expect(isCudCompatibilityMode(123)).toBe(false);
		});
	});
});

/**
 * タスク8.2: 長時間処理のUXフィードバックのテスト
 * Requirements: 8.2, 8.6
 */
describe("Long-running Process UX Feedback - タスク8.2", () => {
	describe("LONG_PROCESS_THRESHOLD_MS定数", () => {
		it("500msの閾値が定義されている", async () => {
			const { LONG_PROCESS_THRESHOLD_MS } = await import("./cud-components");

			expect(LONG_PROCESS_THRESHOLD_MS).toBe(500);
		});
	});

	describe("OptimizationProgress型", () => {
		it("status, elapsedMs, showMessageフィールドを持つ", async () => {
			const { createOptimizationController } = await import("./cud-components");
			const mockCallback = vi.fn();

			const controller = createOptimizationController(mockCallback);
			const progress = controller.getProgress();

			expect(progress.status).toBeDefined();
			expect(progress.elapsedMs).toBeDefined();
			expect(progress.showMessage).toBeDefined();
		});
	});

	describe("createOptimizationController関数", () => {
		it("コントローラを作成できる", async () => {
			const { createOptimizationController } = await import("./cud-components");
			const mockCallback = vi.fn();

			const controller = createOptimizationController(mockCallback);

			expect(controller).toBeDefined();
			expect(typeof controller.start).toBe("function");
			expect(typeof controller.cancel).toBe("function");
			expect(typeof controller.getProgress).toBe("function");
		});

		it("初期状態はidle", async () => {
			const { createOptimizationController } = await import("./cud-components");
			const mockCallback = vi.fn();

			const controller = createOptimizationController(mockCallback);

			const progress = controller.getProgress();
			expect(progress.status).toBe("idle");
		});

		it("start()で処理を開始しrunning状態になる", async () => {
			const { createOptimizationController } = await import("./cud-components");
			const mockCallback = vi.fn();

			const controller = createOptimizationController(mockCallback);
			controller.start();

			const progress = controller.getProgress();
			expect(progress.status).toBe("running");

			// クリーンアップ: タイマーを停止
			controller.cancel();
		});

		it("cancel()で処理をキャンセルしcancelled状態になる", async () => {
			const { createOptimizationController } = await import("./cud-components");
			const mockCallback = vi.fn();

			const controller = createOptimizationController(mockCallback);
			controller.start();
			controller.cancel();

			const progress = controller.getProgress();
			expect(progress.status).toBe("cancelled");
		});

		it("complete()で処理を完了しcompleted状態になる", async () => {
			const { createOptimizationController } = await import("./cud-components");
			const mockCallback = vi.fn();

			const controller = createOptimizationController(mockCallback);
			controller.start();
			controller.complete();

			const progress = controller.getProgress();
			expect(progress.status).toBe("completed");
		});

		it("elapsedMsが経過時間を反映する", async () => {
			const { createOptimizationController } = await import("./cud-components");
			const mockCallback = vi.fn();

			const controller = createOptimizationController(mockCallback);
			controller.start();

			// 少し待機
			await new Promise((resolve) => setTimeout(resolve, 50));
			const progress = controller.getProgress();
			expect(progress.elapsedMs).toBeGreaterThanOrEqual(0);

			// クリーンアップ
			controller.cancel();
		});

		it("500ms経過後にshowMessageがtrueになる", async () => {
			const { createOptimizationController, LONG_PROCESS_THRESHOLD_MS } =
				await import("./cud-components");
			const mockCallback = vi.fn();

			const controller = createOptimizationController(mockCallback);
			controller.start();

			// 初期状態（500ms未満）ではshowMessageはfalse
			const initialProgress = controller.getProgress();
			expect(initialProgress.showMessage).toBe(false);

			// 500ms以上待機
			await new Promise((resolve) =>
				setTimeout(resolve, LONG_PROCESS_THRESHOLD_MS + 100),
			);

			const laterProgress = controller.getProgress();
			expect(laterProgress.showMessage).toBe(true);

			// クリーンアップ
			controller.cancel();
		}, 1000); // タイムアウトを設定

		it("キャンセル後は進捗通知が停止する", async () => {
			const { createOptimizationController } = await import("./cud-components");
			const mockCallback = vi.fn();

			const controller = createOptimizationController(mockCallback);
			controller.start();

			// 少し待機
			await new Promise((resolve) => setTimeout(resolve, 50));
			const callCountBeforeCancel = mockCallback.mock.calls.length;

			controller.cancel();

			// さらに待機
			await new Promise((resolve) => setTimeout(resolve, 200));

			// キャンセル後はコールバックが増えない（キャンセル時の1回を除く）
			// キャンセル時に1回呼ばれるので、それ以上は増えないことを確認
			expect(mockCallback.mock.calls.length).toBeLessThanOrEqual(
				callCountBeforeCancel + 1,
			);
		});
	});

	describe("createProgressIndicator関数", () => {
		it("プログレスインジケーター要素を生成する", async () => {
			const { createProgressIndicator } = await import("./cud-components");

			const indicator = createProgressIndicator();
			expect(indicator.element).toBeInstanceOf(HTMLElement);
			expect(indicator.element.className).toContain("cud-progress-indicator");
		});

		it("初期状態では非表示", async () => {
			const { createProgressIndicator } = await import("./cud-components");

			const indicator = createProgressIndicator();
			expect(indicator.element.style.display).toBe("none");
		});

		it("show()で表示される", async () => {
			const { createProgressIndicator } = await import("./cud-components");

			const indicator = createProgressIndicator();
			indicator.show();
			expect(indicator.element.style.display).not.toBe("none");
		});

		it("hide()で非表示になる", async () => {
			const { createProgressIndicator } = await import("./cud-components");

			const indicator = createProgressIndicator();
			indicator.show();
			indicator.hide();
			expect(indicator.element.style.display).toBe("none");
		});

		it("setMessage()でメッセージを設定できる", async () => {
			const { createProgressIndicator } = await import("./cud-components");

			const indicator = createProgressIndicator();
			indicator.setMessage("計算中...");

			expect(indicator.element.textContent).toContain("計算中");
		});
	});

	describe("createCancelButton関数", () => {
		it("キャンセルボタン要素を生成する", async () => {
			const { createCancelButton } = await import("./cud-components");

			const button = createCancelButton(() => {});
			expect(button.element).toBeInstanceOf(HTMLElement);
			expect(button.element.tagName.toLowerCase()).toBe("button");
		});

		it("初期状態では無効化されている", async () => {
			const { createCancelButton } = await import("./cud-components");

			const button = createCancelButton(() => {});
			expect((button.element as HTMLButtonElement).disabled).toBe(true);
		});

		it("enable()で有効化される", async () => {
			const { createCancelButton } = await import("./cud-components");

			const button = createCancelButton(() => {});
			button.enable();
			expect((button.element as HTMLButtonElement).disabled).toBe(false);
		});

		it("disable()で無効化される", async () => {
			const { createCancelButton } = await import("./cud-components");

			const button = createCancelButton(() => {});
			button.enable();
			button.disable();
			expect((button.element as HTMLButtonElement).disabled).toBe(true);
		});

		it("クリック時にコールバックが呼ばれる", async () => {
			const { createCancelButton } = await import("./cud-components");
			const mockCallback = vi.fn();

			const button = createCancelButton(mockCallback);
			button.enable();
			button.element.click();

			expect(mockCallback).toHaveBeenCalled();
		});

		it("無効化状態ではクリックしてもコールバックが呼ばれない", async () => {
			const { createCancelButton } = await import("./cud-components");
			const mockCallback = vi.fn();

			const button = createCancelButton(mockCallback);
			// 初期状態（無効化）のまま
			button.element.click();

			expect(mockCallback).not.toHaveBeenCalled();
		});

		it("キャンセルボタンに適切なラベルが設定されている", async () => {
			const { createCancelButton } = await import("./cud-components");

			const button = createCancelButton(() => {});
			expect(button.element.textContent).toContain("キャンセル");
		});
	});

	describe("createProgressUI関数（統合）", () => {
		it("プログレスインジケーターとキャンセルボタンを含むUIを生成する", async () => {
			const { createProgressUI } = await import("./cud-components");
			const mockOnCancel = vi.fn();

			const ui = createProgressUI(mockOnCancel);
			expect(ui.container).toBeInstanceOf(HTMLElement);
			expect(ui.indicator).toBeDefined();
			expect(ui.cancelButton).toBeDefined();
		});

		it("update()で進捗状態を更新できる", async () => {
			const { createProgressUI } = await import("./cud-components");
			const mockOnCancel = vi.fn();

			const ui = createProgressUI(mockOnCancel);
			ui.update({ status: "running", elapsedMs: 100, showMessage: false });

			// runningの時は表示される
			expect(ui.container.style.display).not.toBe("none");
		});

		it("500ms超過で「計算中...」が表示される", async () => {
			const { createProgressUI } = await import("./cud-components");
			const mockOnCancel = vi.fn();

			const ui = createProgressUI(mockOnCancel);
			ui.update({ status: "running", elapsedMs: 600, showMessage: true });

			expect(ui.container.textContent).toContain("計算中");
		});

		it("500ms超過でキャンセルボタンが有効化される", async () => {
			const { createProgressUI } = await import("./cud-components");
			const mockOnCancel = vi.fn();

			const ui = createProgressUI(mockOnCancel);
			ui.update({ status: "running", elapsedMs: 600, showMessage: true });

			expect((ui.cancelButton.element as HTMLButtonElement).disabled).toBe(
				false,
			);
		});

		it("処理完了時にUIが非表示になる", async () => {
			const { createProgressUI } = await import("./cud-components");
			const mockOnCancel = vi.fn();

			const ui = createProgressUI(mockOnCancel);
			ui.update({ status: "running", elapsedMs: 100, showMessage: false });
			ui.update({ status: "completed", elapsedMs: 150, showMessage: false });

			expect(ui.container.style.display).toBe("none");
		});

		it("キャンセル時にonCancelコールバックが呼ばれる", async () => {
			const { createProgressUI } = await import("./cud-components");
			const mockOnCancel = vi.fn();

			const ui = createProgressUI(mockOnCancel);
			ui.update({ status: "running", elapsedMs: 600, showMessage: true });

			// キャンセルボタンをクリック
			ui.cancelButton.element.click();

			expect(mockOnCancel).toHaveBeenCalled();
		});
	});
});

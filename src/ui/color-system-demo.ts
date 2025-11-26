/**
 * ColorSystem Demo - ColorSystemファサードのデモUI
 *
 * 状態遷移:
 * - harmony: ハーモニー選択画面（起点）
 * - palette: パレットビュー（詳細）
 * - shades: シェードビュー（詳細）
 * - a11y: アクセシビリティビュー（詳細）
 */

import { verifyContrast } from "../accessibility/wcag2";
import { Color } from "../core/color";
import {
	generateSystemPalette,
	HarmonyType,
	type SystemPaletteColor,
} from "../core/harmony";
import { ColorSystem, type GenerationMode } from "../core/system/color-system";

/** ビューの状態型 */
type ViewState = "harmony" | "palette" | "shades" | "a11y";

/** ハーモニータイプの定義 */
interface HarmonyTypeConfig {
	id: string;
	name: string;
	description: string;
	harmonyType: HarmonyType;
	mode: GenerationMode;
}

/** 利用可能なハーモニータイプ */
const HARMONY_TYPES: HarmonyTypeConfig[] = [
	{
		id: "complementary",
		name: "Complementary",
		description: "補色",
		harmonyType: HarmonyType.COMPLEMENTARY,
		mode: "default",
	},
	{
		id: "analogous",
		name: "Analogous",
		description: "類似色",
		harmonyType: HarmonyType.ANALOGOUS,
		mode: "default",
	},
	{
		id: "triadic",
		name: "Triadic",
		description: "三角配色",
		harmonyType: HarmonyType.TRIADIC,
		mode: "default",
	},
	{
		id: "split",
		name: "Split Comp.",
		description: "分裂補色",
		harmonyType: HarmonyType.SPLIT_COMPLEMENTARY,
		mode: "default",
	},
	{
		id: "tetradic",
		name: "Tetradic",
		description: "四角形",
		harmonyType: HarmonyType.TETRADIC,
		mode: "default",
	},
	{
		id: "square",
		name: "Square",
		description: "正方形",
		harmonyType: HarmonyType.SQUARE,
		mode: "default",
	},
	{
		id: "m3",
		name: "Material 3",
		description: "Material Design",
		harmonyType: HarmonyType.M3,
		mode: "m3",
	},
	{
		id: "dads",
		name: "DADS",
		description: "12色相",
		harmonyType: HarmonyType.DADS,
		mode: "default",
	},
];

/**
 * ColorSystem デモを実行
 */
export function runColorSystemDemo(containerId: string = "color-system-demo") {
	const container = document.getElementById(containerId);
	if (!container) {
		console.warn(`Container #${containerId} not found for ColorSystem demo`);
		return;
	}

	const colorSystem = new ColorSystem();

	// 状態管理
	let currentView: ViewState = "harmony";
	let currentMode: GenerationMode = "m3";
	let currentColor = "#3366cc";
	let selectedHarmony: HarmonyTypeConfig | null = null;
	let generatedPalettes: SystemPaletteColor[] = [];

	/**
	 * メインレイアウトのHTML構築
	 */
	const buildLayout = (): string => `
		<div class="dads-layout">
			<!-- サイドバー -->
			<aside class="dads-sidebar">
				<header class="dads-sidebar__header">
					<h1>Color System</h1>
					<div class="dads-form-field">
						<label class="dads-label" for="cs-source-color">Brand Color</label>
						<div class="dads-form-row">
							<input
								type="color"
								id="cs-source-color"
								value="${currentColor}"
								class="dads-input"
								style="width: 48px; height: 36px; padding: 2px;"
							/>
							<input
								type="text"
								id="cs-source-color-text"
								value="${currentColor}"
								class="dads-input"
								placeholder="#000000"
								pattern="^#[0-9A-Fa-f]{6}$"
							/>
						</div>
					</div>
				</header>
				<div class="dads-sidebar__content" id="cs-sidebar-content">
					<!-- 動的に更新 -->
				</div>
				<footer class="dads-sidebar__footer" id="cs-sidebar-footer">
					<!-- エクスポートボタン等 -->
				</footer>
			</aside>

			<!-- メインコンテンツ -->
			<main class="dads-main">
				<header class="dads-main__header">
					<!-- Harmonyボタン（独立） -->
					<button
						id="cs-harmony-btn"
						class="dads-button"
						aria-current="${currentView === "harmony" ? "page" : "false"}"
						data-active="${currentView === "harmony"}"
					>
						Harmony
					</button>

					<!-- 詳細ビュー切替（タブリスト） -->
					<div
						class="dads-view-switcher"
						role="tablist"
						aria-label="ビュー切替"
						id="cs-view-switcher"
					>
						<button
							id="tab-palette"
							class="dads-view-switcher__button"
							role="tab"
							aria-selected="${currentView === "palette"}"
							aria-controls="panel-palette"
							tabindex="${currentView === "palette" ? "0" : "-1"}"
							data-active="${currentView === "palette"}"
							${!selectedHarmony ? "disabled" : ""}
						>
							パレット
						</button>
						<button
							id="tab-shades"
							class="dads-view-switcher__button"
							role="tab"
							aria-selected="${currentView === "shades"}"
							aria-controls="panel-shades"
							tabindex="${currentView === "shades" ? "0" : "-1"}"
							data-active="${currentView === "shades"}"
							${!selectedHarmony ? "disabled" : ""}
						>
							シェード
						</button>
						<button
							id="tab-a11y"
							class="dads-view-switcher__button"
							role="tab"
							aria-selected="${currentView === "a11y"}"
							aria-controls="panel-a11y"
							tabindex="${currentView === "a11y" ? "0" : "-1"}"
							data-active="${currentView === "a11y"}"
							${!selectedHarmony ? "disabled" : ""}
						>
							アクセシビリティ
						</button>
					</div>
				</header>

				<!-- タブパネル（詳細ビュー用） -->
				<div
					id="panel-palette"
					role="tabpanel"
					aria-labelledby="tab-palette"
					tabindex="0"
					class="dads-main__content"
					${currentView !== "palette" ? "hidden" : ""}
				>
					<!-- パレットビューの内容 -->
				</div>

				<div
					id="panel-shades"
					role="tabpanel"
					aria-labelledby="tab-shades"
					tabindex="0"
					class="dads-main__content"
					${currentView !== "shades" ? "hidden" : ""}
				>
					<!-- シェードビューの内容 -->
				</div>

				<div
					id="panel-a11y"
					role="tabpanel"
					aria-labelledby="tab-a11y"
					tabindex="0"
					class="dads-main__content"
					${currentView !== "a11y" ? "hidden" : ""}
				>
					<!-- アクセシビリティビューの内容 -->
				</div>

				<!-- ハーモニー選択ビュー（起点） -->
				<div
					id="cs-main-content"
					class="dads-main__content"
					${currentView !== "harmony" ? "hidden" : ""}
				>
					<!-- 動的に更新 -->
				</div>
			</main>
		</div>

		<!-- 状態通知用ライブリージョン -->
		<div id="cs-live-region" class="visually-hidden" aria-live="polite" aria-atomic="true"></div>
	`;

	/**
	 * Harmony選択ビューのHTML構築
	 */
	const buildHarmonyView = (): string => {
		const primaryColor = new Color(currentColor);

		const cards = HARMONY_TYPES.map((harmony) => {
			// 実際のハーモニーパレットを生成してプレビュー色を取得
			const palettes = generateSystemPalette(primaryColor, harmony.harmonyType);

			// パレットのキーカラーをプレビューとして使用（最大6色）
			const previewColors = palettes.slice(0, 6).map((p) => p.keyColor.toHex());

			return `
				<button
					class="dads-card dads-harmony-card"
					data-interactive="true"
					data-harmony-id="${harmony.id}"
				>
					<div class="dads-harmony-card__preview" data-count="${previewColors.length}">
						${previewColors.map((c) => `<span class="dads-harmony-card__swatch" style="background: ${c}"></span>`).join("")}
					</div>
					<div class="dads-harmony-card__label">
						<span class="dads-harmony-card__name">${harmony.name}</span>
						<span class="dads-harmony-card__description">${harmony.description}（${palettes.length}色）</span>
					</div>
				</button>
			`;
		}).join("");

		return `
			<div class="dads-section">
				<div class="dads-section__description">
					<p>ハーモニースタイルを選択してください。各スタイルは異なる色の組み合わせを生成します。</p>
				</div>
				<div class="dads-grid dads-harmony-grid" data-columns="auto-fill">
					${cards}
				</div>
			</div>
		`;
	};

	/**
	 * パレットビューのHTML構築（カード形式）
	 */
	const buildPaletteView = (): string => {
		if (!selectedHarmony || generatedPalettes.length === 0) {
			return "<p>ハーモニーを選択してください</p>";
		}

		const cards = generatedPalettes
			.map((palette) => {
				const hex = palette.keyColor.toHex();

				return `
				<div class="dads-card">
					<div class="dads-card__swatch" style="background: ${hex}"></div>
					<div class="dads-card__body">
						<h3 class="dads-card__title">${palette.name}</h3>
						<code class="dads-text-mono">${hex}</code>
						${palette.baseChromaName ? `<div class="dads-card__sim-info">${palette.baseChromaName}</div>` : ""}
					</div>
				</div>
			`;
			})
			.join("");

		return `
			<div class="dads-section">
				<h2 class="dads-section__heading">${selectedHarmony.name} パレット</h2>
				<p class="dads-section__description">
					${selectedHarmony.description}から生成された${generatedPalettes.length}色のパレットです。
				</p>
				<div class="dads-grid" data-columns="auto-fill">
					${cards}
				</div>
			</div>
		`;
	};

	/**
	 * シェードビューのHTML構築（スケール形式）
	 */
	const buildShadesView = (): string => {
		if (!selectedHarmony || generatedPalettes.length === 0) {
			return "<p>ハーモニーを選択してください</p>";
		}

		const sections = generatedPalettes
			.map((palette) => {
				// ColorSystemを使ってシェードを生成
				const result = colorSystem.generate(palette.keyColor.toHex(), {
					mode: selectedHarmony?.mode,
					roles: ["primary"],
				});
				const scale = result.scales.get("primary");

				if (!scale) return "";

				const sortedTones = [...scale.tones.entries()].sort(
					(a, b) => a[0] - b[0],
				);

				const swatches = sortedTones
					.map(([tone, color]) => {
						const hex = color.toHex();
						const lightness = color.oklch.l;
						const textColor = lightness > 0.6 ? "dark" : "light";

						return `
					<button
						class="dads-swatch"
						style="background: ${hex}"
						data-text="${textColor}"
						title="${hex} (Tone ${tone})"
					>
						<span class="dads-swatch__label">${tone}</span>
					</button>
				`;
					})
					.join("");

				return `
				<div class="dads-palette-section">
					<h3 class="dads-section__heading">${palette.name}</h3>
					<div class="dads-scale">${swatches}</div>
				</div>
			`;
			})
			.join("");

		return `
			<div class="dads-section">
				<h2 class="dads-section__heading">シェード</h2>
				<p class="dads-section__description">
					各パレットの明度バリエーションです。
				</p>
				${sections}
			</div>
		`;
	};

	/**
	 * アクセシビリティビューのHTML構築
	 */
	const buildA11yView = (): string => {
		if (!selectedHarmony || generatedPalettes.length === 0) {
			return "<p>ハーモニーを選択してください</p>";
		}

		const white = new Color("#ffffff");
		const black = new Color("#000000");

		const rows = generatedPalettes
			.map((palette) => {
				const hex = palette.keyColor.toHex();
				const whiteContrast = verifyContrast(palette.keyColor, white);
				const blackContrast = verifyContrast(palette.keyColor, black);

				const getLevel = (ratio: number): string => {
					if (ratio >= 7) return "AAA";
					if (ratio >= 4.5) return "AA";
					if (ratio >= 3) return "Large";
					return "Fail";
				};

				const getLevelClass = (ratio: number): string => {
					if (ratio >= 4.5) return "success";
					if (ratio >= 3) return "warning";
					return "error";
				};

				return `
				<tr>
					<td>
						<div style="display: flex; align-items: center; gap: 0.5rem;">
							<span class="dads-palette-item__dot" style="background: ${hex}"></span>
							${palette.name}
						</div>
					</td>
					<td><code class="dads-text-mono">${hex}</code></td>
					<td>
						<span class="dads-badge" data-level="${getLevelClass(whiteContrast.contrast)}">
							${whiteContrast.contrast.toFixed(2)}:1 (${getLevel(whiteContrast.contrast)})
						</span>
					</td>
					<td>
						<span class="dads-badge" data-level="${getLevelClass(blackContrast.contrast)}">
							${blackContrast.contrast.toFixed(2)}:1 (${getLevel(blackContrast.contrast)})
						</span>
					</td>
				</tr>
			`;
			})
			.join("");

		return `
			<div class="dads-section">
				<h2 class="dads-section__heading">アクセシビリティ</h2>
				<p class="dads-section__description">
					各パレットのWCAG 2.1コントラスト比です。
				</p>
				<div class="dads-a11y-table-wrapper">
					<table class="dads-a11y-table">
						<thead>
							<tr>
								<th>パレット</th>
								<th>HEX</th>
								<th>vs 白 (#FFF)</th>
								<th>vs 黒 (#000)</th>
							</tr>
						</thead>
						<tbody>
							${rows}
						</tbody>
					</table>
				</div>
			</div>
		`;
	};

	/**
	 * サイドバーコンテンツの更新
	 */
	const updateSidebarContent = (): void => {
		const sidebarContent = document.getElementById("cs-sidebar-content");
		if (!sidebarContent) return;

		if (currentView === "harmony") {
			sidebarContent.innerHTML = `
				<h3>ハーモニー選択</h3>
				<p class="dads-section__description">右側のカードからハーモニースタイルを選択してください。</p>
			`;
		} else if (selectedHarmony) {
			sidebarContent.innerHTML = `
				<h3>${selectedHarmony.name}</h3>
				<p class="dads-section__description">${selectedHarmony.description}</p>
				<div class="dads-palette-item">
					<button class="dads-palette-item__button" data-active="true">
						<span class="dads-palette-item__dot" style="background: ${currentColor}"></span>
						Primary
					</button>
				</div>
			`;
		}
	};

	/**
	 * メインコンテンツの更新
	 */
	const updateMainContent = (): void => {
		const harmonyContent = document.getElementById("cs-main-content");
		const palettePanel = document.getElementById("panel-palette");
		const shadesPanel = document.getElementById("panel-shades");
		const a11yPanel = document.getElementById("panel-a11y");

		// すべてのパネルを非表示にする
		if (harmonyContent) harmonyContent.hidden = currentView !== "harmony";
		if (palettePanel) palettePanel.hidden = currentView !== "palette";
		if (shadesPanel) shadesPanel.hidden = currentView !== "shades";
		if (a11yPanel) a11yPanel.hidden = currentView !== "a11y";

		// 現在のビューにコンテンツを挿入
		switch (currentView) {
			case "harmony":
				if (harmonyContent) {
					harmonyContent.innerHTML = buildHarmonyView();
					setupHarmonyCardListeners();
				}
				break;
			case "palette":
				if (palettePanel) {
					palettePanel.innerHTML = buildPaletteView();
				}
				break;
			case "shades":
				if (shadesPanel) {
					shadesPanel.innerHTML = buildShadesView();
				}
				break;
			case "a11y":
				if (a11yPanel) {
					a11yPanel.innerHTML = buildA11yView();
				}
				break;
		}
	};

	/**
	 * ヘッダーの状態更新
	 */
	const updateHeader = (): void => {
		const harmonyBtn = document.getElementById("cs-harmony-btn");
		const tabs = document.querySelectorAll('[role="tab"]');

		if (harmonyBtn) {
			harmonyBtn.setAttribute(
				"aria-current",
				currentView === "harmony" ? "page" : "false",
			);
			harmonyBtn.setAttribute("data-active", String(currentView === "harmony"));
		}

		tabs.forEach((tab) => {
			const tabEl = tab as HTMLButtonElement;
			const tabId = tabEl.id.replace("tab-", "");
			const isSelected = currentView === tabId;

			tabEl.setAttribute("aria-selected", String(isSelected));
			tabEl.setAttribute("tabindex", isSelected ? "0" : "-1");
			tabEl.setAttribute("data-active", String(isSelected));
			tabEl.disabled = !selectedHarmony;
		});
	};

	/**
	 * ビュー切替
	 */
	const switchView = (newView: ViewState): void => {
		if (newView === currentView) return;
		if (newView !== "harmony" && !selectedHarmony) return;

		currentView = newView;
		updateHeader();
		updateMainContent();
		updateSidebarContent();
		announceViewChange(newView);
	};

	/**
	 * ビュー変更をスクリーンリーダーに通知
	 */
	const announceViewChange = (view: ViewState): void => {
		const liveRegion = document.getElementById("cs-live-region");
		if (!liveRegion) return;

		const viewNames: Record<ViewState, string> = {
			harmony: "ハーモニー選択",
			palette: "パレット",
			shades: "シェード",
			a11y: "アクセシビリティ",
		};

		liveRegion.textContent = `${viewNames[view]}ビューに切り替えました`;
	};

	/**
	 * パレット生成
	 */
	const generatePalettes = (): void => {
		if (!selectedHarmony) {
			generatedPalettes = [];
			return;
		}

		const primaryColor = new Color(currentColor);
		generatedPalettes = generateSystemPalette(
			primaryColor,
			selectedHarmony.harmonyType,
		);
	};

	const setupHarmonyCardListeners = (): void => {
		const cards = document.querySelectorAll(".dads-harmony-card");
		cards.forEach((card) => {
			card.addEventListener("click", (e) => {
				const target = e.currentTarget as HTMLElement;
				const harmonyId = target.getAttribute("data-harmony-id");
				const harmony = HARMONY_TYPES.find((h) => h.id === harmonyId);

				if (harmony) {
					selectedHarmony = harmony;
					currentMode = harmony.mode;
					generatePalettes();
					switchView("palette");
				}
			});
		});
	};

	/**
	 * タブのキーボード操作
	 */
	const setupTabKeyboardNavigation = (): void => {
		const tablist = document.getElementById("cs-view-switcher");
		if (!tablist) return;

		tablist.addEventListener("keydown", (e) => {
			const target = e.target as HTMLElement;
			if (target.getAttribute("role") !== "tab") return;

			const tabs = Array.from(
				tablist.querySelectorAll('[role="tab"]:not([disabled])'),
			) as HTMLElement[];
			const currentIndex = tabs.indexOf(target);

			let newIndex = currentIndex;

			switch (e.key) {
				case "ArrowLeft":
					newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
					e.preventDefault();
					break;
				case "ArrowRight":
					newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
					e.preventDefault();
					break;
				case "Home":
					newIndex = 0;
					e.preventDefault();
					break;
				case "End":
					newIndex = tabs.length - 1;
					e.preventDefault();
					break;
				default:
					return;
			}

			const newTab = tabs[newIndex];
			if (newTab) {
				newTab.focus();
				const viewId = newTab.id.replace("tab-", "") as ViewState;
				switchView(viewId);
			}
		});
	};

	// UI初期化
	container.innerHTML = buildLayout();

	// 要素参照
	const sourceColorInput = document.getElementById(
		"cs-source-color",
	) as HTMLInputElement;
	const sourceColorText = document.getElementById(
		"cs-source-color-text",
	) as HTMLInputElement;
	const harmonyBtn = document.getElementById("cs-harmony-btn");
	const tabs = document.querySelectorAll('[role="tab"]');

	/**
	 * カラー入力の同期
	 */
	const syncColorInputs = (color: string, source: "picker" | "text"): void => {
		if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return;

		currentColor = color;

		if (source === "picker" && sourceColorText) {
			sourceColorText.value = color;
		} else if (source === "text" && sourceColorInput) {
			sourceColorInput.value = color;
		}

		// ハーモニービューの場合はカードを再描画
		if (currentView === "harmony") {
			updateMainContent();
		} else if (selectedHarmony) {
			// 詳細ビューの場合はパレットを再生成してから再描画
			generatePalettes();
			updateMainContent();
		}
	};

	// カラーピッカーのイベント
	sourceColorInput?.addEventListener("input", (e) => {
		syncColorInputs((e.target as HTMLInputElement).value, "picker");
	});

	// テキスト入力のイベント
	sourceColorText?.addEventListener("input", (e) => {
		const value = (e.target as HTMLInputElement).value;
		if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
			syncColorInputs(value, "text");
		}
	});

	sourceColorText?.addEventListener("blur", (e) => {
		const value = (e.target as HTMLInputElement).value;
		if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
			// 不正な値の場合は現在の値に戻す
			(e.target as HTMLInputElement).value = currentColor;
		}
	});

	// Harmonyボタンのイベント
	harmonyBtn?.addEventListener("click", () => {
		switchView("harmony");
	});

	// タブのクリックイベント
	tabs.forEach((tab) => {
		tab.addEventListener("click", (e) => {
			const target = e.target as HTMLElement;
			const viewId = target.id.replace("tab-", "") as ViewState;
			if (!target.hasAttribute("disabled")) {
				switchView(viewId);
			}
		});
	});

	// タブのキーボードナビゲーション設定
	setupTabKeyboardNavigation();

	// 初期表示
	updateMainContent();
	updateSidebarContent();

	// サイドバーフッターにエクスポートボタンを追加
	const sidebarFooter = document.getElementById("cs-sidebar-footer");
	if (sidebarFooter) {
		sidebarFooter.innerHTML = `
			<h3>エクスポート</h3>
			<button id="cs-export-css" class="dads-button dads-button--block">CSS Variables</button>
			<button id="cs-export-json" class="dads-button dads-button--block">JSON</button>
		`;

		// エクスポートボタンのイベント
		document.getElementById("cs-export-json")?.addEventListener("click", () => {
			if (!selectedHarmony) {
				alert("先にハーモニーを選択してください");
				return;
			}

			const result = colorSystem.generate(currentColor, {
				mode: currentMode,
				roles: ["primary", "neutral"],
			});
			const json = colorSystem.export(result, "json");

			navigator.clipboard
				.writeText(json)
				.then(() => {
					alert("JSONをクリップボードにコピーしました");
				})
				.catch(() => {
					const win = window.open("", "_blank");
					if (win) {
						win.document.write(`<pre>${json}</pre>`);
					}
				});
		});

		document.getElementById("cs-export-css")?.addEventListener("click", () => {
			if (!selectedHarmony) {
				alert("先にハーモニーを選択してください");
				return;
			}

			const result = colorSystem.generate(currentColor, {
				mode: currentMode,
				roles: ["primary", "neutral"],
			});
			const css = colorSystem.export(result, "css");

			navigator.clipboard
				.writeText(css)
				.then(() => {
					alert("CSS変数をクリップボードにコピーしました");
				})
				.catch(() => {
					const win = window.open("", "_blank");
					if (win) {
						win.document.write(`<pre>${css}</pre>`);
					}
				});
		});
	}
}

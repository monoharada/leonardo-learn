/**
 * シェードビューモジュール
 *
 * シェード一覧画面のレンダリングを担当する。
 * DADSカラーの各色相セクションとブランドカラーセクションを表示する。
 * カードクリック時はonColorClickコールバック経由でcolor-detail-modalと接続する。
 *
 * @module @/ui/demo/views/shades-view
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.5, 5.6, 6.3, 6.4
 */

import { simulateCVD } from "@/accessibility/cvd-simulator";
import { Color } from "@/core/color";
import { calculateBoundaries } from "@/core/semantic-role/contrast-boundary-calculator";
import {
	createSemanticRoleMapper,
	type PaletteInfo,
	type SemanticRoleMapperService,
} from "@/core/semantic-role/role-mapper";
import type { SemanticRole } from "@/core/semantic-role/types";
import type { DadsColorScale } from "@/core/tokens/dads-data-provider";
import {
	findDadsColorByHex,
	getAllDadsChromatic,
	loadDadsTokens,
} from "@/core/tokens/dads-data-provider";
import type {
	DadsChromaScale,
	DadsColorHue,
	DadsToken,
} from "@/core/tokens/types";
import {
	getContrastTextColor,
	transformToCircle,
} from "@/ui/semantic-role/circular-swatch-transformer";
import { renderBoundaryPills } from "@/ui/semantic-role/contrast-boundary-indicator";
import { applyOverlay } from "@/ui/semantic-role/semantic-role-overlay";
import { createBackgroundColorSelector } from "../background-color-selector";
import {
	getActivePalette,
	parseKeyColor,
	persistBackgroundColors,
	state,
} from "../state";
import type {
	ColorDetailModalOptions,
	CVDType,
	HarmonyType,
	PaletteConfig,
} from "../types";

/**
 * シェードビューのコールバック
 */
export interface ShadesViewCallbacks {
	/** 色クリック時のコールバック（モーダル表示用） */
	onColorClick: (options: ColorDetailModalOptions) => void;
}

/**
 * 空状態のメッセージを表示する
 */
function renderEmptyState(container: HTMLElement, viewName: string): void {
	const empty = document.createElement("div");
	empty.className = "dads-empty-state";
	empty.innerHTML = `
		<p>${viewName}が生成されていません</p>
		<p>ハーモニービューでスタイルを選択してパレットを生成してください。</p>
	`;
	container.innerHTML = "";
	container.appendChild(empty);
}

/**
 * CVDシミュレーションを適用する
 */
function applySimulation(color: Color): Color {
	if (state.cvdSimulation === "normal") {
		return color;
	}
	return simulateCVD(color, state.cvdSimulation as CVDType);
}

/**
 * キーカラー役割の定義
 * P/S/T の役割名、短縮ラベル、日本語名を定義
 */
const KEY_COLOR_ROLE_DEFINITIONS = [
	{ name: "Primary", shortLabel: "P", label: "プライマリ" },
	{ name: "Secondary", shortLabel: "S", label: "セカンダリ" },
	{ name: "Tertiary", shortLabel: "T", label: "ターシャリ" },
] as const;

/**
 * Primary/Secondary/Tertiary キーカラースウォッチをレンダリングする
 *
 * DADSトークンに含まれない独自色のみ表示する。
 * DADSに含まれるキーカラーはDADSスケール内で円形表示される。
 *
 * @param callbacks コールバック関数
 * @param dadsTokens DADSトークン配列（DADS含有判定用）
 * @returns キーカラーセクション要素（表示すべき独自色がない場合はnull）
 */
function renderKeyColorSwatches(
	callbacks: ShadesViewCallbacks,
	dadsTokens: DadsToken[],
): HTMLElement | null {
	// DADSに含まれない独自色のみをフィルタリング
	const nonDadsColors: Array<{
		palette: PaletteConfig;
		shortLabel: string;
		label: string;
	}> = [];

	for (const role of KEY_COLOR_ROLE_DEFINITIONS) {
		const palette = state.palettes.find((p) => p.name === role.name);
		if (!palette) continue;

		const hex = parseKeyColor(palette.keyColors[0] ?? "").color;
		const dadsMatch = findDadsColorByHex(dadsTokens, hex);
		if (!dadsMatch) {
			nonDadsColors.push({
				palette,
				shortLabel: role.shortLabel,
				label: role.label,
			});
		}
	}

	// 表示すべき独自色がない場合はnullを返す
	if (nonDadsColors.length === 0) {
		return null;
	}

	const section = document.createElement("section");
	section.className = "dads-key-colors-section";

	// 見出し
	const header = document.createElement("h2");
	header.className = "dads-section__heading";
	header.innerHTML = `
		<span class="dads-section__heading-en">Key Colors</span>
		<span class="dads-section__heading-ja">(キーカラー)</span>
	`;
	section.appendChild(header);

	// スウォッチコンテナ
	const swatchContainer = document.createElement("div");
	swatchContainer.className = "dads-key-colors-container";

	// 全キーカラーのHEX値とラベルを取得（モーダルのカラーシェード表示用）
	const allKeyColorHexes = nonDadsColors.map(
		({ palette }) => parseKeyColor(palette.keyColors[0] ?? "").color,
	);
	const allKeyColorLabels = nonDadsColors.map(({ label }) => label);

	// 独自色のみスウォッチを作成
	for (const [i, item] of nonDadsColors.entries()) {
		const { palette, shortLabel, label } = item;
		const swatch = createKeyColorSwatch(
			palette,
			shortLabel,
			label,
			callbacks,
			allKeyColorHexes,
			allKeyColorLabels,
			i,
		);
		swatchContainer.appendChild(swatch);
	}

	section.appendChild(swatchContainer);
	return section;
}

/**
 * キーカラー円形スウォッチを作成する
 *
 * @param palette パレット設定
 * @param shortLabel 短縮ラベル（P/S/T）
 * @param label 日本語ラベル
 * @param callbacks コールバック関数
 * @param allKeyColorHexes 全キーカラーのHEX値配列（モーダル表示用）
 * @param allKeyColorLabels 全キーカラーのラベル配列（モーダル名前切替用）
 * @param currentIndex 現在のキーカラーのインデックス
 * @returns スウォッチ要素
 */
function createKeyColorSwatch(
	palette: PaletteConfig,
	shortLabel: string,
	label: string,
	callbacks: ShadesViewCallbacks,
	allKeyColorHexes: string[],
	allKeyColorLabels: string[],
	currentIndex: number,
): HTMLElement {
	const keyColor = palette.keyColors[0];
	const hex = keyColor ? parseKeyColor(keyColor).color : "#000000";

	const swatch = document.createElement("button");
	swatch.type = "button";
	swatch.className = "dads-key-color-swatch";
	swatch.style.backgroundColor = hex;
	swatch.dataset.testid = `key-color-${shortLabel.toLowerCase()}`;

	// テキスト色を背景色に基づいて決定
	const textColor = getContrastTextColor(hex);

	// ラベル（役割名）
	const labelEl = document.createElement("span");
	labelEl.className = "dads-key-color-swatch__label";
	labelEl.textContent = label;
	labelEl.style.color = textColor;
	swatch.appendChild(labelEl);

	// HEX値
	const hexEl = document.createElement("span");
	hexEl.className = "dads-key-color-swatch__hex";
	hexEl.textContent = hex.toUpperCase();
	hexEl.style.color = textColor;
	swatch.appendChild(hexEl);

	// アクセシビリティ属性
	swatch.setAttribute("aria-label", `${label} ${hex} の詳細を表示`);
	swatch.setAttribute("title", `${label}: ${hex}`);

	// クリックイベント - モーダルを表示
	swatch.addEventListener("click", () => {
		const stepColor = new Color(hex);
		const keyColorObj = new Color(hex);

		// 全キーカラーをColorオブジェクトに変換
		const allKeyColors = allKeyColorHexes.map((h) => new Color(h));

		callbacks.onColorClick({
			stepColor,
			keyColor: keyColorObj,
			index: currentIndex,
			fixedScale: {
				colors: allKeyColors,
				keyIndex: currentIndex,
				hexValues: allKeyColorHexes,
				names: allKeyColorLabels, // カスタムキーカラーのラベル配列
			},
			paletteInfo: {
				name: label,
				// カスタムキーカラーにはDADSトークン情報がないので渡さない
			},
			readOnly: true,
			originalHex: hex,
		});
	});

	return swatch;
}

/**
 * シェードビューをレンダリングする
 *
 * Requirements: 1.1, 5.5, 5.6 - シェードビューに背景色セレクターを統合する
 *
 * @param container レンダリング先のコンテナ要素
 * @param callbacks コールバック関数
 */
export async function renderShadesView(
	container: HTMLElement,
	callbacks: ShadesViewCallbacks,
): Promise<void> {
	// コンテナをクリアして前のビューのDOMが残らないようにする
	container.innerHTML = "";
	container.className = "dads-section";

	// Requirements: 5.5, 5.6 - ライト背景色をコンテナに適用
	container.style.backgroundColor = state.lightBackgroundColor;

	// Requirements: 1.1, 5.5 - 背景色セレクターをビュー上部に配置
	const backgroundSelectorSection = document.createElement("section");
	backgroundSelectorSection.className = "background-color-selector-wrapper";
	const backgroundSelector = createBackgroundColorSelector({
		lightColor: state.lightBackgroundColor,
		darkColor: state.darkBackgroundColor,
		onLightColorChange: (hex: string) => {
			// ライト背景色を更新
			state.lightBackgroundColor = hex;
			// Requirements: 5.5 - localStorageに永続化
			persistBackgroundColors(
				state.lightBackgroundColor,
				state.darkBackgroundColor,
			);
			// コンテナの背景色を更新
			container.style.backgroundColor = hex;
			// 再レンダリング（コントラスト値更新のため）
			void renderShadesView(container, callbacks).catch((err) => {
				console.error("Failed to re-render shades view:", err);
			});
		},
		onDarkColorChange: (hex: string) => {
			// ダーク背景色を更新
			state.darkBackgroundColor = hex;
			// Requirements: 5.5 - localStorageに永続化
			persistBackgroundColors(
				state.lightBackgroundColor,
				state.darkBackgroundColor,
			);
			// 再レンダリング（コントラスト境界の更新のため）
			void renderShadesView(container, callbacks).catch((err) => {
				console.error("Failed to re-render shades view:", err);
			});
		},
	});
	backgroundSelectorSection.appendChild(backgroundSelector);
	container.appendChild(backgroundSelectorSection);

	const loadingEl = document.createElement("div");
	loadingEl.className = "dads-loading";
	loadingEl.textContent = "DADSカラーを読み込み中...";
	container.appendChild(loadingEl);

	try {
		const dadsTokens = await loadDadsTokens();
		const chromaticScales = getAllDadsChromatic(dadsTokens);
		// 再レンダー競合対策: loadingElが既に削除されている可能性があるため存在確認
		if (loadingEl.isConnected) {
			container.removeChild(loadingEl);
		}

		// Primary/Secondary/Tertiary キーカラースウォッチセクション
		// DADSに含まれない独自色のみ表示する
		const keyColorSection = renderKeyColorSwatches(callbacks, dadsTokens);
		if (keyColorSection) {
			container.appendChild(keyColorSection);
		}

		// Task 4.2: ロールマッピング生成
		// state.shadesPalettesが未生成の場合（ハーモニービュー経由など）はstate.palettesを使用
		const palettesForRoleMapping =
			state.shadesPalettes.length > 0 ? state.shadesPalettes : state.palettes;

		// PaletteInfo形式に変換（UI層→Core層の最小情報）
		const palettesInfo: PaletteInfo[] = palettesForRoleMapping.map((p) => ({
			name: p.name,
			baseChromaName: p.baseChromaName,
			step: p.step,
		}));

		// 現在のハーモニー種別を取得（アクティブパレットのharmony）
		const activePalette = getActivePalette();
		const harmonyType: HarmonyType | string = activePalette?.harmony ?? "dads";

		// SemanticRoleMapperを生成
		const roleMapper = createSemanticRoleMapper(palettesInfo, harmonyType);

		// ブランドカラーのDADSトークン含有判定
		let brandDadsMatch:
			| { hue: DadsColorHue; scale: DadsChromaScale; token: DadsToken }
			| undefined;
		let brandHex: string | undefined;

		if (activePalette?.keyColors[0]) {
			const parsed = parseKeyColor(activePalette.keyColors[0]);
			brandHex = parsed.color;
			brandDadsMatch = findDadsColorByHex(dadsTokens, brandHex);
		}

		// Note: Key Colorsセクションで非DADSキーカラーを表示するため、
		// renderPrimaryBrandSectionは呼び出さない（重複を避けるため）

		// 各色相のセクションを描画（Task 4.3: オーバーレイ適用のためにroleMapperを渡す）
		// brandDadsMatchがある場合は該当スウォッチを円形化
		for (const colorScale of chromaticScales) {
			renderDadsHueSection(
				container,
				colorScale,
				roleMapper,
				callbacks,
				brandDadsMatch,
			);
		}
	} catch (error) {
		console.error("Failed to load DADS tokens:", error);
		// loadingElが既にDOMから削除されている可能性があるため、存在確認してから削除
		if (loadingEl.isConnected) {
			container.removeChild(loadingEl);
		}
		renderEmptyState(container, "シェード（読み込みエラー）");
	}
}

/**
 * セマンティックロールから日本語表示名を生成する
 *
 * 現在サポートするカテゴリ: primary, accent, secondary
 * TODO: semantic, link等の追加カテゴリが必要になった場合は
 *       SemanticRoleCategory型に合わせて拡張する
 *
 * @param role - セマンティックロール
 * @returns 日本語表示名
 */
function getRoleDisplayName(role: SemanticRole): string {
	switch (role.category) {
		case "primary":
			return "プライマリーカラー";
		case "accent": {
			// アクセント番号を抽出（例: "Accent 2" → "2"）
			// 番号が見つからない場合は "1" をデフォルトとする
			// （単一アクセントの場合や番号なしロール名に対応）
			const match = role.name.match(/\d+/);
			const num = match ? match[0] : "1";
			return `アクセントカラー ${num}`;
		}
		case "secondary":
			return "セカンダリーカラー";
		default:
			// 未知のカテゴリはfullNameまたはnameをそのまま使用
			return role.fullName || role.name;
	}
}

/**
 * 色相セクションを描画
 *
 * @param container - 描画先コンテナ
 * @param colorScale - 色相スケール情報
 * @param roleMapper - セマンティックロールマッパー
 * @param callbacks - コールバック
 * @param brandDadsMatch - ブランドカラーがDADSに含まれる場合のマッチ情報（オプション）
 */
export function renderDadsHueSection(
	container: HTMLElement,
	colorScale: DadsColorScale,
	roleMapper: SemanticRoleMapperService | undefined,
	callbacks: ShadesViewCallbacks,
	brandDadsMatch?: {
		hue: DadsColorHue;
		scale: DadsChromaScale;
		token: DadsToken;
	},
): void {
	const section = document.createElement("section");
	section.className = "dads-hue-section";

	const header = document.createElement("h2");
	header.className = "dads-section__heading";
	header.innerHTML = `
		<span class="dads-section__heading-en">${colorScale.hueName.en}</span>
		<span class="dads-section__heading-ja">(${colorScale.hueName.ja})</span>
	`;
	section.appendChild(header);

	const scaleContainer = document.createElement("div");
	scaleContainer.className = "dads-scale";

	// Task 10.4: コントラスト境界表示用のscale→スウォッチ要素マップ
	const scaleElements = new Map<number, HTMLElement>();

	for (const colorItem of colorScale.colors) {
		const swatch = document.createElement("button");
		swatch.type = "button";
		swatch.className = "dads-swatch dads-swatch--readonly";

		// Task 4.1: data属性とdata-testidを追加（E2Eテスト・オーバーレイ統合用）
		swatch.dataset.hue = colorScale.hue;
		swatch.dataset.scale = String(colorItem.scale);
		swatch.dataset.testid = `swatch-${colorScale.hue}-${colorItem.scale}`;

		const originalColor = new Color(colorItem.hex);
		const displayColor = applySimulation(originalColor);
		swatch.style.backgroundColor = displayColor.toCss();

		const textColor = getContrastTextColor(colorItem.hex);

		const scaleLabel = document.createElement("span");
		scaleLabel.className = "dads-swatch__scale";
		scaleLabel.style.color = textColor;
		scaleLabel.textContent = String(colorItem.scale);
		swatch.appendChild(scaleLabel);

		const hexLabel = document.createElement("span");
		hexLabel.className = "dads-swatch__hex";
		hexLabel.style.color = textColor;
		hexLabel.textContent = colorItem.hex.toUpperCase();
		swatch.appendChild(hexLabel);

		swatch.setAttribute(
			"aria-label",
			`${colorScale.hueName.en} ${colorItem.scale}: ${colorItem.hex}`,
		);
		swatch.setAttribute(
			"title",
			`${colorItem.hex} - ${colorItem.token.nameJa}`,
		);
		swatch.style.cursor = "pointer";
		swatch.onclick = () => {
			const stepColor = new Color(colorItem.hex);

			// colorScale.colorsは50→1200の順（明→暗）
			// STEP_NAMESは1200→50の順（暗→明）なので逆順にする
			const reversedColors = [...colorScale.colors].reverse();
			const scaleColors = reversedColors.map((c) => new Color(c.hex));
			const hexValues = reversedColors.map((c) => c.hex);

			// クリックされた色のインデックスを計算（reverse後）
			const originalIndex = colorScale.colors.findIndex(
				(c) => c.scale === colorItem.scale,
			);
			const index =
				originalIndex >= 0 ? colorScale.colors.length - 1 - originalIndex : 0;

			// 代表色としてステップ600を使用（なければクリックした色）
			const keyColorItem =
				colorScale.colors.find((c) => c.scale === 600) || colorItem;
			const keyColor = new Color(keyColorItem.hex);

			// Issue #41: 役割がある場合は役割名、ない場合はトークン名を表示
			let displayName = `${colorScale.hue}-${colorItem.scale}`;
			if (roleMapper) {
				const roles = roleMapper.lookupRoles(
					colorScale.hue as DadsColorHue,
					colorItem.scale,
				);
				// 防御的チェック: roles[0]の存在確認は型安全性のため
				// （lookupRolesが空配列以外でundefined要素を返す可能性に備える）
				if (roles.length > 0 && roles[0]) {
					displayName = getRoleDisplayName(roles[0]);
				}
			}

			callbacks.onColorClick({
				stepColor,
				keyColor,
				index,
				fixedScale: { colors: scaleColors, keyIndex: index, hexValues },
				originalHex: colorItem.hex,
				paletteInfo: {
					name: displayName,
					baseChromaName: colorScale.hueName.en,
				},
				readOnly: true,
			});
		};

		// Task 4.3: セマンティックロールのオーバーレイを適用
		// colorScale.hueはDadsColorHue型として直接使用
		// lookupRolesはDADS+ブランド統合済みロールを返却（hue-scale特定可能なブランドロールを含む）
		// セマンティックロールのオーバーレイ適用とロール名表示
		if (roleMapper) {
			const roles = roleMapper.lookupRoles(
				colorScale.hue as DadsColorHue,
				colorItem.scale,
			);
			if (roles.length > 0) {
				applyOverlay(
					swatch,
					colorScale.hue as DadsColorHue,
					colorItem.scale,
					roles,
					false,
					colorItem.hex,
				);
			}
		}

		// Issue #39: DADSトークンに含まれるブランドカラーを円形化
		// 注: applyOverlayで既に円形化されている場合はスキップ（二重円形化防止）
		if (
			brandDadsMatch &&
			brandDadsMatch.hue === colorScale.hue &&
			brandDadsMatch.scale === colorItem.scale &&
			!swatch.classList.contains("dads-swatch--circular")
		) {
			const primaryRole: SemanticRole = {
				name: "Primary",
				category: "primary",
				fullName: "[プライマリー] Primary",
				shortLabel: "P",
			};
			transformToCircle(swatch, primaryRole, colorItem.hex);
			swatch.dataset.brandPrimary = "true";
		}

		scaleContainer.appendChild(swatch);

		// Task 10.4: スウォッチ要素をマップに追加（コントラスト境界表示用）
		scaleElements.set(colorItem.scale, swatch);
	}

	section.appendChild(scaleContainer);

	// sectionをDOMに追加（コントラスト境界ピルの位置計算のため先に追加が必要）
	container.appendChild(section);

	// Task 10.4: コントラスト境界表示を追加
	// 注: renderBoundaryPillsはgetBoundingClientRect()を使用するため、
	// sectionがDOMに追加された後に呼び出す必要がある
	const colorItems = colorScale.colors.map((item) => ({
		scale: item.scale,
		hex: item.hex,
	}));
	// ライト/ダーク背景色を渡してコントラスト境界を計算
	const boundaries = calculateBoundaries(
		colorItems,
		state.lightBackgroundColor,
		state.darkBackgroundColor,
	);
	const boundaryContainer = renderBoundaryPills(boundaries, scaleElements);
	section.appendChild(boundaryContainer);
}

/**
 * DADSトークンに含まれないブランドカラーのプライマリーセクションを描画
 *
 * Issue #39: シェード一覧の最上部に「プライマリー」見出しセクション追加
 * 単一スウォッチのみ表示（シェード不要）
 *
 * @param container - 描画先コンテナ
 * @param brandHex - ブランドカラーのHEX値
 * @param brandName - ブランド名
 * @param roleMapper - セマンティックロールマッパー
 * @param callbacks - コールバック
 */
export function renderPrimaryBrandSection(
	container: HTMLElement,
	brandHex: string,
	brandName: string,
	roleMapper: SemanticRoleMapperService | undefined,
	_callbacks: ShadesViewCallbacks,
): void {
	const section = document.createElement("section");
	section.className = "dads-primary-section";

	const header = document.createElement("h2");
	header.className = "dads-section__heading";
	header.innerHTML = `
		<span class="dads-section__heading-en">Primary</span>
		<span class="dads-section__heading-ja">(プライマリー)</span>
	`;
	section.appendChild(header);

	const swatchContainer = document.createElement("div");
	swatchContainer.className = "dads-primary-swatch-container";

	const swatch = document.createElement("button");
	swatch.type = "button";
	swatch.className = "dads-swatch dads-swatch--circular dads-swatch--primary";

	// data-testidを追加（E2Eテスト用）
	swatch.dataset.testid = "swatch-primary";
	swatch.dataset.brandPrimary = "true";

	const originalColor = new Color(brandHex);
	const displayColor = applySimulation(originalColor);
	swatch.style.backgroundColor = displayColor.toCss();

	const textColor = getContrastTextColor(brandHex);

	// 「プライマリ」ラベルを追加
	const roleLabel = document.createElement("span");
	roleLabel.className = "dads-swatch__role-label";
	roleLabel.textContent = "プライマリ";
	roleLabel.style.color = textColor;
	swatch.appendChild(roleLabel);

	// HEX値ラベル
	const hexLabel = document.createElement("span");
	hexLabel.className = "dads-swatch__hex";
	hexLabel.style.color = textColor;
	hexLabel.textContent = brandHex.toUpperCase();
	swatch.appendChild(hexLabel);

	// title属性を設定（ツールチップ用）
	swatch.setAttribute("title", `${brandName}: ${brandHex.toUpperCase()}`);
	swatch.setAttribute(
		"aria-label",
		`プライマリーカラー ${brandName}: ${brandHex}`,
	);

	// 未解決ブランドロールのオーバーレイ適用
	if (roleMapper) {
		const brandRoles = roleMapper.lookupUnresolvedBrandRoles();
		if (brandRoles.length > 0) {
			applyOverlay(swatch, undefined, undefined, brandRoles, true, brandHex);
		}
	}

	swatchContainer.appendChild(swatch);
	section.appendChild(swatchContainer);

	container.appendChild(section);
}

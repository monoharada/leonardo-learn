/**
 * シェードビューモジュール
 *
 * シェード一覧画面のレンダリングを担当する。
 * DADSカラーの各色相セクションとブランドカラーセクションを表示する。
 * カードクリック時はonColorClickコールバック経由でcolor-detail-modalと接続する。
 *
 * @module @/ui/demo/views/shades-view
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { simulateCVD } from "@/accessibility/cvd-simulator";
import { verifyContrast } from "@/accessibility/wcag2";
import { Color } from "@/core/color";
import { calculateBoundaries } from "@/core/semantic-role/contrast-boundary-calculator";
import {
	createSemanticRoleMapper,
	type PaletteInfo,
	type SemanticRoleMapperService,
} from "@/core/semantic-role/role-mapper";
import type { DadsColorScale } from "@/core/tokens/dads-data-provider";
import {
	getAllDadsChromatic,
	loadDadsTokens,
} from "@/core/tokens/dads-data-provider";
import type { DadsColorHue } from "@/core/tokens/types";
import { renderBoundaryPills } from "@/ui/semantic-role/contrast-boundary-indicator";
import {
	type RoleInfoItem,
	renderRoleInfoBar,
	renderUnresolvedRolesBar,
	type UnresolvedRoleItem,
} from "@/ui/semantic-role/external-role-info-bar";
import { applyOverlay } from "@/ui/semantic-role/semantic-role-overlay";
import { getActivePalette, parseKeyColor, state } from "../state";
import type { ColorDetailModalOptions, CVDType, HarmonyType } from "../types";

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
 * シェードビューをレンダリングする
 *
 * @param container レンダリング先のコンテナ要素
 * @param callbacks コールバック関数
 */
export async function renderShadesView(
	container: HTMLElement,
	callbacks: ShadesViewCallbacks,
): Promise<void> {
	container.className = "dads-section";

	const loadingEl = document.createElement("div");
	loadingEl.className = "dads-loading";
	loadingEl.textContent = "DADSカラーを読み込み中...";
	container.appendChild(loadingEl);

	try {
		const dadsTokens = await loadDadsTokens();
		const chromaticScales = getAllDadsChromatic(dadsTokens);
		container.removeChild(loadingEl);

		// Task 4.2: ロールマッピング生成
		// state.shadesPalettesからPaletteInfo形式に変換
		const palettesInfo: PaletteInfo[] = state.shadesPalettes.map((p) => ({
			name: p.name,
			baseChromaName: p.baseChromaName,
			step: p.step,
		}));

		// 現在のハーモニー種別を取得（アクティブパレットのharmony）
		const activePalette = getActivePalette();
		const harmonyType: HarmonyType | string = activePalette?.harmony ?? "dads";

		// SemanticRoleMapperを生成
		const roleMapper = createSemanticRoleMapper(palettesInfo, harmonyType);

		// 説明セクション
		const infoSection = document.createElement("div");
		infoSection.className = "dads-info-section";
		infoSection.innerHTML = `
			<p class="dads-info-section__text">
				デジタル庁デザインシステム（DADS）のプリミティブカラーです。
				これらの色はデザイントークンとして定義されており、変更できません。
			</p>
		`;
		container.appendChild(infoSection);

		// Task 10.2: hue-scale不定ブランドロールバーを最初の色相セクションの前に表示
		// シェードビュー全体で1回のみ表示（各色相セクションでの繰り返し表示は行わない）
		const unresolvedBrandRoles = roleMapper.lookupUnresolvedBrandRoles();
		if (unresolvedBrandRoles.length > 0) {
			const unresolvedItems: UnresolvedRoleItem[] = unresolvedBrandRoles.map(
				(role) => ({
					role,
				}),
			);
			const unresolvedBar = renderUnresolvedRolesBar(unresolvedItems);
			if (unresolvedBar) {
				container.appendChild(unresolvedBar);
			}
		}

		// 各色相のセクションを描画（Task 4.3: オーバーレイ適用のためにroleMapperを渡す）
		for (const colorScale of chromaticScales) {
			renderDadsHueSection(container, colorScale, roleMapper, callbacks);
		}

		// ブランドカラーセクション（Task 4.4: ブランドロール表示のためにroleMapperを渡す）
		if (activePalette && activePalette.keyColors[0]) {
			const { color: brandHex } = parseKeyColor(activePalette.keyColors[0]);
			renderBrandColorSection(
				container,
				brandHex,
				activePalette.name,
				roleMapper,
				callbacks,
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
 * 色相セクションを描画
 */
export function renderDadsHueSection(
	container: HTMLElement,
	colorScale: DadsColorScale,
	roleMapper: SemanticRoleMapperService | undefined,
	callbacks: ShadesViewCallbacks,
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

	// Task 10.3: 欄外ロール情報バー用のRoleInfoItemを収集
	const roleInfoItems: RoleInfoItem[] = [];

	// Task 10.4: コントラスト境界表示用のscale→スウォッチ要素マップ
	const scaleElements = new Map<number, HTMLElement>();

	for (const colorItem of colorScale.colors) {
		const swatch = document.createElement("div");
		swatch.className = "dads-swatch dads-swatch--readonly";

		// Task 4.1: data属性とdata-testidを追加（E2Eテスト・オーバーレイ統合用）
		swatch.dataset.hue = colorScale.hue;
		swatch.dataset.scale = String(colorItem.scale);
		swatch.dataset.testid = `swatch-${colorScale.hue}-${colorItem.scale}`;

		const originalColor = new Color(colorItem.hex);
		const displayColor = applySimulation(originalColor);
		swatch.style.backgroundColor = displayColor.toCss();

		const whiteContrast = verifyContrast(
			originalColor,
			new Color("#ffffff"),
		).contrast;
		const blackContrast = verifyContrast(
			originalColor,
			new Color("#000000"),
		).contrast;
		const textColor = whiteContrast >= blackContrast ? "white" : "black";

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

			callbacks.onColorClick({
				stepColor,
				keyColor,
				index,
				fixedScale: { colors: scaleColors, keyIndex: index, hexValues },
				originalHex: colorItem.hex,
				paletteInfo: {
					name: colorScale.hueName.ja,
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

				// Task 10.3: 各ロールについてRoleInfoItemを収集
				// hue-scale特定可能なブランドロールも含まれる（該当DADSスウォッチと連携）
				for (const role of roles) {
					roleInfoItems.push({
						role,
						scale: colorItem.scale,
						swatchElement: swatch,
					});
				}
			}
		}

		scaleContainer.appendChild(swatch);

		// Task 10.4: スウォッチ要素をマップに追加（コントラスト境界表示用）
		scaleElements.set(colorItem.scale, swatch);
	}

	section.appendChild(scaleContainer);

	// Task 10.3: 欄外ロール情報バーを追加
	// hue-scale特定可能なブランドロールも対象に含まれる（lookupRolesで統合済み）
	// hue-scale特定不可ロールはTask 10.2で処理済みのため除外
	if (roleInfoItems.length > 0) {
		const roleInfoBar = renderRoleInfoBar(roleInfoItems);
		section.appendChild(roleInfoBar);
	}

	// sectionをDOMに追加（コントラスト境界ピルの位置計算のため先に追加が必要）
	container.appendChild(section);

	// Task 10.4: コントラスト境界表示を追加
	// 注: renderBoundaryPillsはgetBoundingClientRect()を使用するため、
	// sectionがDOMに追加された後に呼び出す必要がある
	const colorItems = colorScale.colors.map((item) => ({
		scale: item.scale,
		hex: item.hex,
	}));
	const boundaries = calculateBoundaries(colorItems);
	const boundaryContainer = renderBoundaryPills(boundaries, scaleElements);
	section.appendChild(boundaryContainer);
}

/**
 * ブランドカラーセクションを描画
 */
export function renderBrandColorSection(
	container: HTMLElement,
	brandHex: string,
	brandName: string,
	roleMapper: SemanticRoleMapperService | undefined,
	_callbacks: ShadesViewCallbacks,
): void {
	const section = document.createElement("section");
	section.className = "dads-brand-section";

	const header = document.createElement("h2");
	header.className = "dads-section__heading";
	header.innerHTML = `
		<span class="dads-section__heading-en">Brand Color</span>
		<span class="dads-section__heading-ja">(${brandName})</span>
	`;
	section.appendChild(header);

	const swatchContainer = document.createElement("div");
	swatchContainer.className = "dads-brand-swatch-container";

	const swatch = document.createElement("div");
	swatch.className = "dads-swatch dads-swatch--brand";

	// Task 4.1: data-testidを追加（E2Eテスト・オーバーレイ統合用）
	swatch.dataset.testid = "swatch-brand";

	const originalColor = new Color(brandHex);
	const displayColor = applySimulation(originalColor);
	swatch.style.backgroundColor = displayColor.toCss();

	const whiteContrast = verifyContrast(
		originalColor,
		new Color("#ffffff"),
	).contrast;
	const blackContrast = verifyContrast(
		originalColor,
		new Color("#000000"),
	).contrast;
	const textColor = whiteContrast >= blackContrast ? "white" : "black";

	const hexLabel = document.createElement("span");
	hexLabel.className = "dads-swatch__hex";
	hexLabel.style.color = textColor;
	hexLabel.textContent = brandHex.toUpperCase();
	swatch.appendChild(hexLabel);

	// title属性を設定（ツールチップ用）
	swatch.setAttribute("title", brandHex.toUpperCase());

	// Task 4.4: ブランドロール表示を統合
	// lookupUnresolvedBrandRolesで「brand-unresolved」キーから未解決ブランドロール配列を取得
	// DADSシェードと同様のドット・バッジ表示スタイルを適用
	if (roleMapper) {
		const brandRoles = roleMapper.lookupUnresolvedBrandRoles();
		if (brandRoles.length > 0) {
			applyOverlay(swatch, undefined, undefined, brandRoles, true, brandHex);
		}
	}

	swatchContainer.appendChild(swatch);
	section.appendChild(swatchContainer);

	const note = document.createElement("p");
	note.className = "dads-brand-section__note";
	note.textContent = "ブランドカラーのシェード生成は今後の拡張で対応予定です。";
	section.appendChild(note);

	container.appendChild(section);
}

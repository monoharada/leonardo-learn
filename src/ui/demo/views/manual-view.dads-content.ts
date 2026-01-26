import { HarmonyType } from "@/core/harmony";
import {
	createSemanticRoleMapper,
	type PaletteInfo,
} from "@/core/semantic-role/role-mapper";
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
import { getActivePalette, parseKeyColor, state } from "../state";
import { renderKeyColorSwatches } from "./manual-view.key-swatches";
import type { ManualViewCallbacks } from "./manual-view.render";
import { renderEmptyState } from "./manual-view.render-utils";
import { renderDadsHueSection } from "./manual-view.sections";

export async function renderManualDadsContent(
	container: HTMLElement,
	callbacks: ManualViewCallbacks,
): Promise<void> {
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
		// Manual Viewでは常にstate.palettesを使用
		// （applyColorToManualSelection()でsyncToStudioPalette()が呼ばれ、
		//  state.palettesに新しいパレットが追加されるため）
		// state.shadesPalettesはStudio View専用
		const palettesForRoleMapping = state.palettes;

		// baseChromaNameまたはstepが未設定のパレットを更新（Manual Viewで適用した色のため）
		// roleMapperはbaseChromaNameとstepの両方が必要（role-mapper.ts line 246）
		for (const palette of palettesForRoleMapping) {
			if (
				(!palette.baseChromaName || palette.step === undefined) &&
				palette.keyColors[0]
			) {
				const parsed = parseKeyColor(palette.keyColors[0]);
				const dadsMatch = findDadsColorByHex(dadsTokens, parsed.color);
				if (dadsMatch) {
					palette.baseChromaName = dadsMatch.hue;
					palette.step = dadsMatch.scale;
				}
			}
		}

		// PaletteInfo形式に変換（UI層→Core層の最小情報）
		const palettesInfo: PaletteInfo[] = palettesForRoleMapping.map((p) => ({
			name: p.name,
			baseChromaName: p.baseChromaName,
			step: p.step,
		}));

		// Manual View では常に DADS ロールを有効にする
		// （activePalette.harmony が "none" でも DADS semantic/link を表示）
		const activePalette = getActivePalette();
		const harmonyType = HarmonyType.DADS;

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

		// プリミティブカラーセクションの見出しを追加
		const primitiveHeading = document.createElement("h2");
		primitiveHeading.className = "dads-section__heading";
		primitiveHeading.innerHTML = `
			<span class="dads-section__heading-en">Primitive Colors</span>
			<span class="dads-section__heading-ja">(プリミティブカラー)</span>
		`;
		container.appendChild(primitiveHeading);

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

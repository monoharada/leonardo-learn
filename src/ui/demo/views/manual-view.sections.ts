import { Color } from "@/core/color";
import { calculateBoundaries } from "@/core/semantic-role/contrast-boundary-calculator";
import type { SemanticRoleMapperService } from "@/core/semantic-role/role-mapper";
import type { SemanticRole } from "@/core/semantic-role/types";
import type { DadsColorScale } from "@/core/tokens/dads-data-provider";
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
import { state } from "../state";
import { getSelectedApplyTarget } from "./manual-view.apply-target";
import type { ManualViewCallbacks } from "./manual-view.render";
import { applySimulation } from "./manual-view.render-utils";

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
	callbacks: ManualViewCallbacks,
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
				showApplySection: true,
				onApply: () => {
					// ツールバーを再描画して適用結果を反映
					void import("./manual-view.render").then((mod) =>
						mod.renderManualView(container, callbacks),
					);
				},
				preSelectedTarget: getSelectedApplyTarget() ?? undefined,
			});
		};

		// Task 4.3: セマンティックロールのオーバーレイを適用
		// colorScale.hueはDadsColorHue型として直接使用
		// lookupRolesはDADS+ブランド統合済みロールを返却（hue-scale特定可能なブランドロールを含む）
		// セマンティックロールのオーバーレイ適用とロール名表示
		if (roleMapper) {
			const allRoles = roleMapper.lookupRoles(
				colorScale.hue as DadsColorHue,
				colorItem.scale,
			);
			// DADS accent を除外（DADS semantic/link と競合するため）
			// ※ brand accent は残す（ユーザー選択色のマーカーとして必要）
			const displayRoles = allRoles.filter(
				(role) => !(role.source === "dads" && role.category === "accent"),
			);
			if (displayRoles.length > 0) {
				applyOverlay(
					swatch,
					colorScale.hue as DadsColorHue,
					colorItem.scale,
					displayRoles,
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
	_callbacks: ManualViewCallbacks,
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

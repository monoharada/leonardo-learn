/**
 * SemanticRoleMapper - セマンティックロールマッピング生成
 *
 * パレット状態からセマンティックロールマッピングを生成し、
 * 各シェードに対応するロール情報を提供する
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1
 */

import { DADS_COLORS, HarmonyType } from "@/core/harmony";
import type { DadsColorHue } from "@/core/tokens/types";
import { chromaNameToDadsHue, normalizeToDadsHue } from "./hue-name-normalizer";
import type { RoleCategory, RoleMapping, SemanticRole } from "./types";

/**
 * Core層用パレット情報（UI層PaletteConfigの最小サブセット）
 * UI層に依存しない形でブランドロール検索に必要な情報のみ定義
 */
export interface PaletteInfo {
	/** パレット名（"Primary", "Secondary"等） */
	name: string;
	/** ベースクロマ名（オプション） */
	baseChromaName?: string;
	/** ステップ値（オプション） */
	step?: number;
}

/**
 * マッピングキー形式
 */
export type MappingKey = `${DadsColorHue}-${number}` | "brand";

/**
 * SemanticRoleMapperサービスインターフェース
 */
export interface SemanticRoleMapperService {
	/**
	 * 特定のhue-scaleに対するロールを検索
	 * @param dadsHue - DadsColorHue（例: "blue", "light-blue"）
	 * @param scale - スケール値（例: 600）
	 * @returns ロール配列（空配列は該当なし）
	 */
	lookupRoles(dadsHue: DadsColorHue, scale: number): SemanticRole[];

	/**
	 * ブランドロール配列を取得
	 * @returns ブランドロール配列（Primary/Secondary）
	 */
	lookupBrandRoles(): SemanticRole[];

	/**
	 * ロールマッピングを取得
	 * @returns ロールマッピングMap
	 */
	getRoleMapping(): RoleMapping;
}

/**
 * DADS_COLORSのカテゴリからRoleCategoryへの変換
 */
function dadsColorCategoryToRoleCategory(
	category: "semantic" | "link" | "accent",
): RoleCategory {
	switch (category) {
		case "semantic":
			return "semantic";
		case "link":
			return "link";
		case "accent":
			return "accent";
	}
}

/**
 * カテゴリの表示名を取得
 */
function getCategoryDisplayName(category: RoleCategory): string {
	switch (category) {
		case "primary":
			return "Primary";
		case "secondary":
			return "Secondary";
		case "accent":
			return "Accent";
		case "semantic":
			return "Semantic";
		case "link":
			return "Link";
	}
}

/**
 * SemanticRoleを生成
 * @param name - ロール名
 * @param category - カテゴリ
 * @param hueScale - hue-scale情報（オプション、ブランドロール用）
 */
function createSemanticRole(
	name: string,
	category: RoleCategory,
	hueScale?: string,
): SemanticRole {
	const categoryName = getCategoryDisplayName(category);
	const role: SemanticRole = {
		name,
		category,
		fullName: `[${categoryName}] ${name}`,
	};
	if (hueScale) {
		role.hueScale = hueScale;
	}
	return role;
}

/**
 * パレットからセマンティックロールマッピングを生成
 *
 * @param palettes - PaletteInfo配列（UI層から渡される最小情報）
 * @param harmonyType - 現在のハーモニー種別
 * @returns dadsHue-scale → ロール配列のMap（DADS以外のハーモニー種別では空Map）
 *
 * 処理フロー:
 * 1. ハーモニー種別がDADSかチェック（DADS以外は空Mapを返却）
 * 2. DADS_COLORSをイテレート
 * 3. chromaName → DADS_CHROMAS.displayName → DadsColorHue に変換
 * 4. キー "${dadsHue}-${step}" でマッピング登録
 * 5. ブランドロール: palettesからname === "Primary"/"Secondary"を検索し、キー "brand" に集約
 */
export function generateRoleMapping(
	palettes: PaletteInfo[],
	harmonyType: HarmonyType | string,
): RoleMapping {
	const mapping: RoleMapping = new Map();

	// ハーモニー種別がDADS以外の場合は空Mapを返却
	if (harmonyType !== HarmonyType.DADS) {
		return mapping;
	}

	// DADS_COLORSからマッピング生成
	for (const dadsColor of DADS_COLORS) {
		// chromaName → DadsColorHue に正規化
		const dadsHue = chromaNameToDadsHue(dadsColor.chromaName);
		if (!dadsHue) {
			console.warn(
				`Unknown chromaName in DADS_COLORS: ${dadsColor.chromaName}`,
			);
			continue;
		}

		// キー形式: "${dadsHue}-${step}"
		const key: MappingKey = `${dadsHue}-${dadsColor.step}`;

		// カテゴリ変換
		const category = dadsColorCategoryToRoleCategory(dadsColor.category);

		// ロール生成
		const role = createSemanticRole(dadsColor.name, category);

		// 既存のロール配列に追加（同一hue-scaleに複数ロールが割り当てられる場合）
		const existingRoles = mapping.get(key) || [];
		existingRoles.push(role);
		mapping.set(key, existingRoles);
	}

	// ブランドロール検索（name === "Primary" または "Secondary"）
	// Requirements 1.3: baseChromaName/stepが存在する場合のみhue-scaleを特定
	const brandPalettes = palettes.filter(
		(p) => p.name === "Primary" || p.name === "Secondary",
	);

	if (brandPalettes.length > 0) {
		const brandRoles: SemanticRole[] = brandPalettes.map((palette) => {
			const category: RoleCategory =
				palette.name === "Primary" ? "primary" : "secondary";

			// baseChromaName/stepが両方存在する場合のみhue-scaleを生成
			let hueScale: string | undefined;
			if (palette.baseChromaName && palette.step !== undefined) {
				// baseChromaName（displayName形式）をDadsColorHueに変換
				const dadsHue = normalizeToDadsHue(palette.baseChromaName);
				if (dadsHue) {
					hueScale = `${dadsHue}-${palette.step}`;
				}
			}

			return createSemanticRole(palette.name, category, hueScale);
		});

		mapping.set("brand", brandRoles);
	}

	return mapping;
}

/**
 * SemanticRoleMapperサービスを生成
 *
 * @param palettes - PaletteInfo配列
 * @param harmonyType - ハーモニー種別
 * @returns SemanticRoleMapperService
 */
export function createSemanticRoleMapper(
	palettes: PaletteInfo[],
	harmonyType: HarmonyType | string,
): SemanticRoleMapperService {
	const roleMapping = generateRoleMapping(palettes, harmonyType);

	return {
		lookupRoles(dadsHue: DadsColorHue, scale: number): SemanticRole[] {
			const key: MappingKey = `${dadsHue}-${scale}`;
			return roleMapping.get(key) || [];
		},

		lookupBrandRoles(): SemanticRole[] {
			return roleMapping.get("brand") || [];
		},

		getRoleMapping(): RoleMapping {
			return roleMapping;
		},
	};
}

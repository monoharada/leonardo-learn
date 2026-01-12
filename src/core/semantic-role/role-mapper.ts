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
import type {
	RoleCategory,
	RoleMapping,
	SemanticRole,
	SemanticSubType,
} from "./types";
import { BRAND_UNRESOLVED_KEY } from "./types";

/**
 * DADS公式ロール名セット（重複登録回避用）
 */
const DADS_ROLE_NAMES = new Set(DADS_COLORS.map((c) => c.name));

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
 * - DADSロール / ブランドロール（hue-scale特定可能時）: "${dadsHue}-${scale}"
 * - ブランドロール（hue-scale特定不可時）: "brand-unresolved"
 */
export type MappingKey = `${DadsColorHue}-${number}` | "brand-unresolved";

/**
 * SemanticRoleMapperサービスインターフェース
 */
export interface SemanticRoleMapperService {
	/**
	 * 特定のhue-scaleに対するロールを検索
	 * @param dadsHue - DadsColorHue（例: "blue", "light-blue"）
	 * @param scale - スケール値（例: 600）
	 * @returns ロール配列（DADS + ブランド統合済み、空配列は該当なし）
	 */
	lookupRoles(dadsHue: DadsColorHue, scale: number): SemanticRole[];

	/**
	 * hue-scale特定不可のブランドロール配列を取得
	 * @returns ブランドロール配列（「brand-unresolved」キーから取得）
	 */
	lookupUnresolvedBrandRoles(): SemanticRole[];

	/**
	 * ロールマッピングを取得
	 * @returns ロールマッピングMap
	 */
	getRoleMapping(): RoleMapping;
}

/**
 * カテゴリ別の短縮ラベル
 */
const CATEGORY_SHORT_LABELS: Record<RoleCategory, string> = {
	primary: "P",
	secondary: "S",
	accent: "A",
	semantic: "", // semanticSubTypeで決定
	link: "L",
};

/**
 * semanticサブタイプ別の短縮ラベル
 */
const SEMANTIC_SUBTYPE_LABELS: Record<SemanticSubType, string> = {
	success: "Su",
	error: "E",
	warning: "W",
};

/**
 * DADS_COLORSのカテゴリからRoleCategoryへの変換
 * Note: DADS_COLORSのカテゴリはRoleCategoryのサブセットなので直接キャスト可能
 */
function dadsColorCategoryToRoleCategory(
	category: "semantic" | "link" | "accent",
): RoleCategory {
	return category;
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
 * ロール名からsemanticSubTypeを推定
 */
function inferSemanticSubType(name: string): SemanticSubType | undefined {
	const lowerName = name.toLowerCase();
	if (lowerName.includes("success")) return "success";
	if (lowerName.includes("error")) return "error";
	if (lowerName.includes("warning")) return "warning";
	return undefined;
}

/**
 * カテゴリとサブタイプから短縮ラベルを取得
 */
function getShortLabel(
	category: RoleCategory,
	semanticSubType?: SemanticSubType,
): string {
	if (category === "semantic" && semanticSubType) {
		return SEMANTIC_SUBTYPE_LABELS[semanticSubType];
	}
	return CATEGORY_SHORT_LABELS[category];
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
	source?: SemanticRole["source"],
): SemanticRole {
	const categoryName = getCategoryDisplayName(category);
	const semanticSubType =
		category === "semantic" ? inferSemanticSubType(name) : undefined;
	const shortLabel = getShortLabel(category, semanticSubType);

	const role: SemanticRole = {
		name,
		category,
		fullName: `[${categoryName}] ${name}`,
		shortLabel,
	};

	if (source) {
		role.source = source;
	}
	if (semanticSubType) {
		role.semanticSubType = semanticSubType;
	}
	if (hueScale) {
		role.hueScale = hueScale;
	}
	return role;
}

/**
 * マッピングにロールを追加するヘルパー
 */
function addRoleToMapping(
	mapping: RoleMapping,
	key: string,
	role: SemanticRole,
): void {
	const existingRoles = mapping.get(key) || [];
	existingRoles.push(role);
	mapping.set(key, existingRoles);
}

/**
 * パレット名からカテゴリを判定
 */
function determineCategoryFromPaletteName(name: string): RoleCategory {
	if (name === "Primary") return "primary";
	if (name === "Secondary") return "secondary";
	return "accent";
}

/**
 * パレットからセマンティックロールマッピングを生成
 *
 * @param palettes - PaletteInfo配列（UI層から渡される最小情報）
 * @param harmonyType - 現在のハーモニー種別
 * @returns dadsHue-scale → ロール配列のMap
 *
 * 処理フロー:
 * 1. DADSモードの場合のみ、DADS_COLORS を登録
 * 2. ブランドロール（Primary/Secondary/Accent-*）は全モードで処理:
 *    - hue-scale特定可能時: キー「${dadsHue}-${scale}」へ登録
 *    - hue-scale特定不可時: 「brand-unresolved」キーに集約
 */
export function generateRoleMapping(
	palettes: PaletteInfo[],
	harmonyType: HarmonyType | string,
): RoleMapping {
	const mapping: RoleMapping = new Map();

	// DADS_COLORSからマッピング生成（DADSモードのみ）
	if (harmonyType === HarmonyType.DADS) {
		for (const dadsColor of DADS_COLORS) {
			const dadsHue = chromaNameToDadsHue(dadsColor.chromaName);
			if (!dadsHue) {
				console.warn(
					`Unknown chromaName in DADS_COLORS: ${dadsColor.chromaName}`,
				);
				continue;
			}

			const key: MappingKey = `${dadsHue}-${dadsColor.step}`;
			const category = dadsColorCategoryToRoleCategory(dadsColor.category);
			const role = createSemanticRole(
				dadsColor.name,
				category,
				undefined,
				"dads",
			);
			addRoleToMapping(mapping, key, role);
		}
	}

	// ハーモニー生成ロール検索（Primary, Secondary, Accent-*）
	const harmonyPalettes = palettes.filter(
		(p) =>
			p.name === "Primary" ||
			p.name === "Secondary" ||
			p.name.startsWith("Accent"),
	);

	for (const palette of harmonyPalettes) {
		// DADSモードでDADS公式ロール名は登録済みのためスキップ
		if (harmonyType === HarmonyType.DADS && DADS_ROLE_NAMES.has(palette.name)) {
			continue;
		}

		const category = determineCategoryFromPaletteName(palette.name);

		// hue-scale特定可能な場合
		if (palette.baseChromaName && palette.step !== undefined) {
			const dadsHue = normalizeToDadsHue(palette.baseChromaName);
			if (dadsHue) {
				const hueScale = `${dadsHue}-${palette.step}`;
				const key: MappingKey = `${dadsHue}-${palette.step}`;
				const role = createSemanticRole(
					palette.name,
					category,
					hueScale,
					"brand",
				);
				addRoleToMapping(mapping, key, role);
				continue;
			}
		}

		// hue-scale特定不可の場合は未解決キーに集約
		const role = createSemanticRole(palette.name, category, undefined, "brand");
		addRoleToMapping(mapping, BRAND_UNRESOLVED_KEY, role);
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

		lookupUnresolvedBrandRoles(): SemanticRole[] {
			return roleMapping.get(BRAND_UNRESOLVED_KEY) || [];
		},

		getRoleMapping(): RoleMapping {
			return roleMapping;
		},
	};
}

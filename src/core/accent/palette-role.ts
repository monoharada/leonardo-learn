/**
 * PaletteRole - Phase 1.1: 役割タイプ定義
 */
import type { HarmonyFilterType } from "./harmony-filter-calculator";

export type PaletteRoleId =
	| "accent"
	| "accentLight"
	| "accentDark"
	| "secondary"
	| "secondaryLight"
	| "secondaryDark"
	| "baseMuted"
	| "baseLight"
	| "baseDark";

export interface PaletteRole {
	id: PaletteRoleId;
	nameJa: string;
	nameEn: string;
	usageJa: string;
	usageEn: string;
	/**
	 * 基準ステップからのオフセット
	 *
	 * - 正の値: より明るい色を選択（DADSでは小さいステップ値）
	 * - 負の値: より暗い色を選択（DADSでは大きいステップ値）
	 * - 計算式: targetStep = baseStep - stepOffset
	 * - DADSステップ範囲: 50（最明）〜 1200（最暗）
	 *
	 * @example
	 * baseStep=500, stepOffset=+300 → targetStep=200 (明るい)
	 * baseStep=500, stepOffset=-400 → targetStep=900 (暗い)
	 */
	stepOffset: number;
	hueDirection: "harmony" | "base";
	harmonyDirectionIndex?: number;
}

export const PALETTE_ROLES: Record<PaletteRoleId, Omit<PaletteRole, "id">> = {
	accent: {
		nameJa: "アクセント",
		nameEn: "Accent",
		usageJa: "主要なアクセントカラー",
		usageEn: "Primary accent",
		stepOffset: 0,
		hueDirection: "harmony",
		harmonyDirectionIndex: 0,
	},
	accentLight: {
		nameJa: "アクセント（明）",
		nameEn: "Accent Light",
		usageJa: "明るいアクセント",
		usageEn: "Light accent",
		stepOffset: 300,
		hueDirection: "harmony",
		harmonyDirectionIndex: 0,
	},
	accentDark: {
		nameJa: "アクセント（暗）",
		nameEn: "Accent Dark",
		usageJa: "暗いアクセント",
		usageEn: "Dark accent",
		stepOffset: -400,
		hueDirection: "harmony",
		harmonyDirectionIndex: 0,
	},
	secondary: {
		nameJa: "セカンダリ",
		nameEn: "Secondary",
		usageJa: "二次アクセント",
		usageEn: "Secondary accent",
		stepOffset: 0,
		hueDirection: "harmony",
		harmonyDirectionIndex: 1,
	},
	secondaryLight: {
		nameJa: "セカンダリ（明）",
		nameEn: "Secondary Light",
		usageJa: "明るいセカンダリ",
		usageEn: "Light secondary",
		stepOffset: 300,
		hueDirection: "harmony",
		harmonyDirectionIndex: 1,
	},
	secondaryDark: {
		nameJa: "セカンダリ（暗）",
		nameEn: "Secondary Dark",
		usageJa: "暗いセカンダリ",
		usageEn: "Dark secondary",
		stepOffset: -400,
		hueDirection: "harmony",
		harmonyDirectionIndex: 1,
	},
	baseMuted: {
		nameJa: "ベース（彩度低）",
		nameEn: "Base Muted",
		usageJa: "落ち着いたトーン",
		usageEn: "Muted tone",
		stepOffset: 200,
		hueDirection: "base",
	},
	baseLight: {
		nameJa: "ベース（明）",
		nameEn: "Base Light",
		usageJa: "明るいベース",
		usageEn: "Light base",
		stepOffset: 400,
		hueDirection: "base",
	},
	baseDark: {
		nameJa: "ベース（暗）",
		nameEn: "Base Dark",
		usageJa: "暗いベース",
		usageEn: "Dark base",
		stepOffset: -300,
		hueDirection: "base",
	},
};

export function getPaletteRole(id: PaletteRoleId): PaletteRole {
	return { id, ...PALETTE_ROLES[id] };
}

export type RoleConfigByCount = {
	2: PaletteRoleId[];
	3: PaletteRoleId[];
	4: PaletteRoleId[];
	5: PaletteRoleId[];
};

export const COMPLEMENTARY_ROLE_CONFIG: RoleConfigByCount = {
	2: ["accent", "accentDark"],
	3: ["accent", "accentDark", "baseMuted"],
	4: ["accent", "accentDark", "baseLight", "baseDark"],
	5: ["accent", "accentLight", "accentDark", "baseLight", "baseDark"],
};

export const TRIADIC_ROLE_CONFIG: RoleConfigByCount = {
	2: ["accent", "secondary"],
	3: ["accent", "secondary", "accentLight"],
	4: ["accent", "accentDark", "secondary", "secondaryLight"],
	5: ["accent", "accentLight", "accentDark", "secondary", "secondaryDark"],
};

export const ANALOGOUS_ROLE_CONFIG: RoleConfigByCount = {
	2: ["accent", "secondary"],
	3: ["accent", "secondary", "accentDark"],
	4: ["accent", "accentDark", "secondary", "secondaryDark"],
	5: ["accent", "accentLight", "accentDark", "secondary", "secondaryLight"],
};

export const SPLIT_COMPLEMENTARY_ROLE_CONFIG: RoleConfigByCount = {
	2: ["accent", "secondary"],
	3: ["accent", "secondary", "accentDark"],
	4: ["accent", "accentDark", "secondary", "secondaryDark"],
	5: ["accent", "accentLight", "secondary", "secondaryLight", "baseMuted"],
};

/**
 * モノクロマティック: 同一色相内で明度・彩度を変化
 * ベース方向のみ使用（hueDirection: "base"）
 */
export const MONOCHROMATIC_ROLE_CONFIG: RoleConfigByCount = {
	2: ["baseMuted", "baseDark"],
	3: ["baseLight", "baseMuted", "baseDark"],
	4: ["baseLight", "baseMuted", "baseDark", "accentDark"],
	5: ["baseLight", "baseMuted", "baseDark", "accentLight", "accentDark"],
};

/**
 * シェード: 同一色相内で明度のみ変化（均等分布）
 * ベース方向のみ使用
 */
export const SHADES_ROLE_CONFIG: RoleConfigByCount = {
	2: ["baseLight", "baseDark"],
	3: ["baseLight", "baseMuted", "baseDark"],
	4: ["baseLight", "baseMuted", "baseDark", "accentDark"],
	5: ["baseLight", "baseMuted", "baseDark", "accentLight", "accentDark"],
};

/**
 * コンパウンド: 類似色（±30°）+ 補色方向（180°）のハイブリッド
 * harmony方向[0]=30°、harmony方向[1]=180°
 */
export const COMPOUND_ROLE_CONFIG: RoleConfigByCount = {
	2: ["accent", "secondary"],
	3: ["accent", "secondary", "accentDark"],
	4: ["accent", "accentDark", "secondary", "secondaryDark"],
	5: ["accent", "accentLight", "accentDark", "secondary", "secondaryDark"],
};

/**
 * 正方形（Square）: 90°, 180°, 270°の3方向
 * 色相環を4等分した配色
 * harmony方向[0]=90°、harmony方向[1]=180°、harmony方向[2]=270°
 */
export const SQUARE_ROLE_CONFIG: RoleConfigByCount = {
	2: ["accent", "secondary"],
	3: ["accent", "secondary", "accentDark"],
	4: ["accent", "accentDark", "secondary", "secondaryDark"],
	5: ["accent", "accentLight", "accentDark", "secondary", "secondaryDark"],
};

export function getRoleConfigForHarmony(
	harmonyType: Exclude<HarmonyFilterType, "all">,
): RoleConfigByCount {
	switch (harmonyType) {
		case "complementary":
			return COMPLEMENTARY_ROLE_CONFIG;
		case "triadic":
			return TRIADIC_ROLE_CONFIG;
		case "analogous":
			return ANALOGOUS_ROLE_CONFIG;
		case "split-complementary":
			return SPLIT_COMPLEMENTARY_ROLE_CONFIG;
		case "monochromatic":
			return MONOCHROMATIC_ROLE_CONFIG;
		case "shades":
			return SHADES_ROLE_CONFIG;
		case "compound":
			return COMPOUND_ROLE_CONFIG;
		case "square":
			return SQUARE_ROLE_CONFIG;
		default: {
			// exhaustive check: 未知のハーモニータイプを検出
			// TypeScriptの型安全性を維持しつつ、ランタイムでの警告を出力
			console.warn(
				`Unknown harmony type: ${harmonyType as string}, falling back to complementary`,
			);
			return COMPLEMENTARY_ROLE_CONFIG;
		}
	}
}

export function getRolesForCount(
	harmonyType: Exclude<HarmonyFilterType, "all">,
	count: 2 | 3 | 4 | 5,
): PaletteRole[] {
	return getRoleConfigForHarmony(harmonyType)[count].map((id) =>
		getPaletteRole(id),
	);
}

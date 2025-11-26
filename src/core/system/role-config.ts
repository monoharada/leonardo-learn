/**
 * RoleConfig - カラーロール別のパラメータ定義
 *
 * デザインシステムにおける各カラーロール（primary、secondary、tertiary、
 * error、warning、success、neutral、neutralVariant）のChroma/Lightness/Hue
 * パラメータを定義します。
 */

/**
 * カラーロールの種類
 */
export type RoleType =
	| "primary"
	| "secondary"
	| "tertiary"
	| "error"
	| "errorVariant"
	| "warning"
	| "warningVariant"
	| "success"
	| "successVariant"
	| "neutral"
	| "neutralVariant";

/**
 * ロール設定の構造体
 */
export interface RoleConfig {
	/** ロール名 */
	name: RoleType;
	/** Chroma範囲 [min, max] (0.0〜0.4) */
	chromaRange: [number, number];
	/** Lightness範囲 [min, max] (0.0〜1.0) */
	lightnessRange: [number, number];
	/** Hue範囲 [min, max] (0°〜360°) - オプション */
	hueRange?: [number, number];
	/** ニュートラルカラーかどうか */
	isNeutral?: boolean;
	/** バリアント（ソースカラーのLightnessに調和） */
	isVariant?: boolean;
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * デフォルトのロール設定
 *
 * 各ロールのChroma/Lightness/Hueパラメータは以下の仕様に基づく：
 * - primary: 高Chroma（0.16〜0.25）・中Lightness（40%〜70%）
 * - secondary: 中Chroma（0.08〜0.16）・中Lightness
 * - tertiary: 低〜中Chroma（0.06〜0.12）
 * - error: 赤系（H: 15°〜45°）・高Chroma・高視認性
 * - warning: 黄/オレンジ系（H: 60°〜90°）・中-高Chroma
 * - success: 緑系（H: 140°〜160°）・中Chroma
 * - neutral: 極低Chroma（0.00〜0.02）
 * - neutralVariant: 極低Chroma（0.00〜0.02）
 */
export const DEFAULT_ROLE_CONFIGS: Record<RoleType, RoleConfig> = {
	primary: {
		name: "primary",
		chromaRange: [0.16, 0.25],
		lightnessRange: [0.4, 0.7],
	},
	secondary: {
		name: "secondary",
		chromaRange: [0.08, 0.16],
		lightnessRange: [0.4, 0.7],
	},
	tertiary: {
		name: "tertiary",
		chromaRange: [0.06, 0.12],
		lightnessRange: [0.4, 0.7],
	},
	error: {
		name: "error",
		chromaRange: [0.18, 0.28],
		lightnessRange: [0.35, 0.65],
		hueRange: [15, 45],
	},
	errorVariant: {
		name: "errorVariant",
		chromaRange: [0.18, 0.28],
		lightnessRange: [0.35, 0.65],
		hueRange: [15, 45],
		isVariant: true,
	},
	warning: {
		name: "warning",
		chromaRange: [0.14, 0.22],
		lightnessRange: [0.5, 0.75],
		hueRange: [60, 90],
	},
	warningVariant: {
		name: "warningVariant",
		chromaRange: [0.14, 0.22],
		lightnessRange: [0.5, 0.75],
		hueRange: [60, 90],
		isVariant: true,
	},
	success: {
		name: "success",
		chromaRange: [0.1, 0.18],
		lightnessRange: [0.4, 0.65],
		hueRange: [140, 160],
	},
	successVariant: {
		name: "successVariant",
		chromaRange: [0.1, 0.18],
		lightnessRange: [0.4, 0.65],
		hueRange: [140, 160],
		isVariant: true,
	},
	neutral: {
		name: "neutral",
		chromaRange: [0.0, 0.02],
		lightnessRange: [0.0, 1.0],
		isNeutral: true,
	},
	neutralVariant: {
		name: "neutralVariant",
		chromaRange: [0.02, 0.06],
		lightnessRange: [0.0, 1.0],
		isNeutral: true,
		isVariant: true,
	},
};

/**
 * ロール設定を取得する
 *
 * @param role - ロールタイプ
 * @param customConfig - カスタム設定（オプション）
 * @returns マージされたロール設定
 */
export function getRoleConfig(
	role: RoleType,
	customConfig?: Partial<RoleConfig>,
): RoleConfig {
	const defaultConfig = DEFAULT_ROLE_CONFIGS[role];

	if (!customConfig) {
		return { ...defaultConfig };
	}

	return {
		...defaultConfig,
		...customConfig,
		name: defaultConfig.name, // nameは上書き不可
	};
}

/**
 * ロール設定をバリデーションする
 *
 * @param config - バリデーション対象の設定
 * @returns バリデーション結果
 */
export function validateRoleConfig(config: RoleConfig): ValidationResult {
	const errors: string[] = [];

	// Chroma範囲のバリデーション
	const [chromaMin, chromaMax] = config.chromaRange;
	if (chromaMin > chromaMax) {
		errors.push("chromaRange: min must be less than or equal to max");
	}
	if (chromaMin < 0 || chromaMax > 0.4) {
		errors.push("chromaRange: values must be between 0 and 0.4");
	}

	// Lightness範囲のバリデーション
	const [lightnessMin, lightnessMax] = config.lightnessRange;
	if (lightnessMin > lightnessMax) {
		errors.push("lightnessRange: min must be less than or equal to max");
	}
	if (lightnessMin < 0 || lightnessMax > 1) {
		errors.push("lightnessRange: values must be between 0 and 1");
	}

	// Hue範囲のバリデーション（指定されている場合）
	if (config.hueRange) {
		const [hueMin, hueMax] = config.hueRange;
		if (hueMin > hueMax) {
			errors.push("hueRange: min must be less than or equal to max");
		}
		if (hueMin < 0 || hueMax > 360) {
			errors.push("hueRange: values must be between 0 and 360");
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

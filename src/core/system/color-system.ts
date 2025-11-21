/**
 * ColorSystem - カラーシステム生成の統合ファサード
 *
 * デザインシステム向けのカラーパレット生成エンジンの統合エントリーポイントです。
 * M3/DADSモードの切り替え、各コンポーネントの統括、エクスポート機能を提供します。
 */

import { Color } from "../color";
import { exportToJSON } from "../export/json-exporter";
import {
	generateM3ToneScale,
	type ToneValue,
} from "../strategies/m3-generator";
import { generateNeutralScale } from "./neutral-scale";
import {
	DEFAULT_ROLE_CONFIGS,
	type RoleConfig,
	type RoleType,
} from "./role-config";

/**
 * 生成モード
 */
export type GenerationMode = "default" | "m3" | "dads" | "m3+dads";

/**
 * 生成オプション
 */
export interface GenerationOptions {
	/** 生成モード */
	mode?: GenerationMode;
	/** 生成するロール */
	roles?: RoleType[];
	/** カスタムロール設定 */
	customRoleConfigs?: Partial<Record<RoleType, Partial<RoleConfig>>>;
}

/**
 * スケール結果
 */
export interface ScaleResult {
	/** トーン値に対応するColor */
	tones: Map<ToneValue | number, Color>;
	/** ロールタイプ */
	role: RoleType;
	/** ソースカラー */
	sourceColor: Color;
}

/**
 * 生成メタデータ
 */
export interface GenerationMetadata {
	/** ソースカラー（hex） */
	sourceColor: string;
	/** 使用したモード */
	mode: GenerationMode;
	/** 生成日時 */
	generatedAt: string;
	/** ロール */
	roles: RoleType[];
}

/**
 * カラーシステム生成結果
 */
export interface ColorSystemResult {
	/** 各ロールのスケール */
	scales: Map<RoleType, ScaleResult>;
	/** メタデータ */
	metadata: GenerationMetadata;
	/** 警告 */
	warnings: string[];
}

/**
 * エクスポートフォーマット
 */
export type ExportFormat = "json" | "css" | "dtcg" | "tailwind";

/**
 * ColorSystem - カラーシステム生成の統合ファサード
 */
export class ColorSystem {
	private cache: Map<string, ColorSystemResult> = new Map();

	/**
	 * キャッシュキーを生成
	 */
	private getCacheKey(sourceColor: string, options: GenerationOptions): string {
		const mode = options.mode ?? "default";
		const roles = options.roles ?? ["primary", "neutral"];
		return `${sourceColor}-${mode}-${roles.sort().join(",")}`;
	}

	/**
	 * カラーシステムを生成する
	 *
	 * @param sourceColor - ソースカラー（hex文字列またはColor）
	 * @param options - 生成オプション
	 * @returns カラーシステム生成結果
	 */
	generate(
		sourceColor: string | Color,
		options: GenerationOptions = {},
	): ColorSystemResult {
		const source =
			sourceColor instanceof Color ? sourceColor : new Color(sourceColor);
		const sourceHex = source.toHex();

		// キャッシュチェック
		const cacheKey = this.getCacheKey(sourceHex, options);
		const cached = this.cache.get(cacheKey);
		if (cached) {
			return cached;
		}

		const mode = options.mode ?? "default";
		const roles = options.roles ?? ["primary", "neutral"];
		const warnings: string[] = [];

		const scales = new Map<RoleType, ScaleResult>();

		for (const role of roles) {
			const scaleResult = this.generateScaleForRole(source, role, mode);
			scales.set(role, scaleResult);
		}

		const result: ColorSystemResult = {
			scales,
			metadata: {
				sourceColor: sourceHex,
				mode,
				generatedAt: new Date().toISOString(),
				roles,
			},
			warnings,
		};

		// キャッシュに保存
		this.cache.set(cacheKey, result);

		return result;
	}

	/**
	 * ロールに対するスケールを生成
	 */
	private generateScaleForRole(
		sourceColor: Color,
		role: RoleType,
		mode: GenerationMode,
	): ScaleResult {
		const roleConfig = DEFAULT_ROLE_CONFIGS[role];

		// ニュートラルロールの場合
		if (roleConfig.isNeutral) {
			const neutralScale = generateNeutralScale(sourceColor);
			const tones = new Map<number, Color>();

			for (const [shade, color] of Object.entries(neutralScale.shades)) {
				tones.set(Number(shade), color);
			}

			return {
				tones,
				role,
				sourceColor,
			};
		}

		// ロールに応じてソースカラーを調整
		let colorForScale = sourceColor;
		const sourceOklch = sourceColor.oklch;
		const sourceHue = sourceOklch.h || 0;

		// セマンティックカラー（hueRangeが指定されている場合）
		// キーカラーのHueを考慮して、被らない色を選択
		if (roleConfig.hueRange) {
			const [hueMin, hueMax] = roleConfig.hueRange;
			const semanticHue = (hueMin + hueMax) / 2; // セマンティックカラーの目標Hue
			const [chromaMin, chromaMax] = roleConfig.chromaRange;
			const targetChroma = (chromaMin + chromaMax) / 2;

			// キーカラーとセマンティックカラーのHue差を計算
			let hueDiff = Math.abs(semanticHue - sourceHue);
			if (hueDiff > 180) hueDiff = 360 - hueDiff;

			let targetHue: number;

			// キーカラーとセマンティックカラーが近い場合（30°以内）は調整
			if (hueDiff < 30) {
				// 被りを避けるため、反対方向にシフト
				if (role === "error") {
					// 赤系が被る場合、より赤方向（0°に近い方）または紫寄りに
					targetHue = sourceHue > 30 ? 15 : 45;
				} else if (role === "warning") {
					// 黄系が被る場合、オレンジ寄りまたは黄緑寄りに
					targetHue = sourceHue > 75 ? 60 : 90;
				} else if (role === "success") {
					// 緑系が被る場合、シアン寄りまたは黄緑寄りに
					targetHue = sourceHue > 150 ? 130 : 170;
				} else {
					targetHue = semanticHue;
				}
			} else {
				// 被らない場合は標準のセマンティックHueを使用
				targetHue = semanticHue;
			}

			// ソースカラーのLightnessを使用
			const targetLightness = sourceOklch.l;

			colorForScale = new Color({
				mode: "oklch",
				l: targetLightness,
				c: targetChroma,
				h: targetHue,
			});
		} else if (role === "secondary") {
			// M3 Secondary: 同じHue、Chroma 16 (HCT) ≈ 0.05 (OKLCH)
			colorForScale = new Color({
				mode: "oklch",
				l: 0.5, // tone 40相当
				c: 0.05, // HCT Chroma 16 ≈ OKLCH 0.05
				h: sourceHue,
			});
		} else if (role === "tertiary") {
			// M3 Tertiary: Hue +60°、Chroma 24 (HCT) ≈ 0.08 (OKLCH)
			const tertiaryHue = (sourceHue + 60) % 360;
			colorForScale = new Color({
				mode: "oklch",
				l: 0.5, // tone 40相当
				c: 0.08, // HCT Chroma 24 ≈ OKLCH 0.08
				h: tertiaryHue,
			});
		}

		// M3モードの場合はM3トーンスケールを生成
		if (mode === "m3" || mode === "m3+dads") {
			const m3Scale = generateM3ToneScale(colorForScale);

			return {
				tones: m3Scale.tones,
				role,
				sourceColor: colorForScale,
			};
		}

		// デフォルトモード: M3トーンスケールをベースとして使用
		const m3Scale = generateM3ToneScale(colorForScale);

		return {
			tones: m3Scale.tones,
			role,
			sourceColor: colorForScale,
		};
	}

	/**
	 * カラーシステムをエクスポートする
	 *
	 * @param result - カラーシステム生成結果
	 * @param format - エクスポートフォーマット
	 * @returns エクスポートされた文字列
	 */
	export(result: ColorSystemResult, format: ExportFormat): string {
		// 全スケールの色をフラットなレコードに変換
		const colors: Record<string, Color> = {};

		for (const [role, scale] of result.scales) {
			for (const [tone, color] of scale.tones) {
				colors[`${role}-${tone}`] = color;
			}
		}

		switch (format) {
			case "json": {
				const exported = exportToJSON(colors);
				return JSON.stringify(exported, null, 2);
			}
			case "css":
			case "dtcg":
			case "tailwind":
				// TODO: 他のフォーマットは後続タスクで実装
				throw new Error(`Export format '${format}' not yet implemented`);
			default:
				throw new Error(`Unknown export format: ${format}`);
		}
	}
}

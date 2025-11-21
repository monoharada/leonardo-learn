/**
 * CollisionDetector - セマンティックカラー間の衝突検出
 *
 * 複数のセマンティックカラー（primary、error、warning等）間で
 * 視覚的に区別しにくい色の組み合わせを検出し、調整提案を生成します。
 */

import { toRgb } from "../../utils/color-space";
import { Color } from "../color";
import type { RoleType } from "./role-config";

/**
 * 色覚多様性タイプ
 */
export type CVDType = "protanopia" | "deuteranopia" | "tritanopia";

/**
 * ペア別閾値設定
 */
export interface PairThreshold {
	/** 対象ペア */
	pair: [RoleType, RoleType];
	/** Hue閾値（度） */
	hueThreshold: number;
}

/**
 * 衝突検出オプション
 */
export interface CollisionDetectionOptions {
	/** 基本Hue閾値（デフォルト: 30°） */
	baseHueThreshold?: number;
	/** 基本Lightness閾値（デフォルト: 0.1） */
	baseLightnessThreshold?: number;
	/** 基本Chroma閾値（デフォルト: 0.05） */
	baseChromaThreshold?: number;
	/** ペア別閾値 */
	pairThresholds?: PairThreshold[];
	/** CVDタイプ */
	cvdTypes?: CVDType[];
	/** 最大Hue調整量（デフォルト: 30°） */
	maxHueAdjustment?: number;
}

/**
 * 衝突結果
 */
export interface CollisionResult {
	/** 衝突タイプ */
	type: "hue" | "chroma-lightness" | "cvd";
	/** 重大度 */
	severity: "warning" | "error";
	/** 対象ペア */
	pair: [RoleType, RoleType];
	/** ΔH（色相差） */
	deltaH?: number;
	/** ΔC（Chroma差） */
	deltaC?: number;
	/** ΔL（Lightness差） */
	deltaL?: number;
	/** CVDタイプ */
	cvdType?: CVDType;
}

/**
 * 調整提案
 */
export interface AdjustmentSuggestion {
	/** 調整対象のロール */
	target: RoleType;
	/** 調整値 */
	adjustments: {
		hue?: number;
		chroma?: number;
		lightness?: number;
	};
	/** 調整優先順位 */
	priority: "chroma" | "lightness" | "hue";
}

/**
 * CollisionDetector - セマンティック衝突検出クラス
 */
export class CollisionDetector {
	private readonly defaultOptions: Required<
		Omit<CollisionDetectionOptions, "pairThresholds" | "cvdTypes">
	> = {
		baseHueThreshold: 30,
		baseLightnessThreshold: 0.1,
		baseChromaThreshold: 0.05,
		maxHueAdjustment: 30,
	};

	/**
	 * デフォルトのペア別強化閾値
	 * - primary-error: 45° (赤系との混同を防ぐ)
	 * - warning-error: 40° (黄/オレンジ系との混同を防ぐ)
	 */
	private readonly defaultPairThresholds: PairThreshold[] = [
		{ pair: ["primary", "error"], hueThreshold: 45 },
		{ pair: ["warning", "error"], hueThreshold: 40 },
	];

	/**
	 * セマンティックカラー間の衝突を検出する
	 *
	 * @param colors - ロールとカラーのマップ
	 * @param options - 検出オプション
	 * @returns 衝突結果の配列
	 */
	detect(
		colors: Map<RoleType, Color>,
		options: CollisionDetectionOptions = {},
	): CollisionResult[] {
		const results: CollisionResult[] = [];

		// デフォルトのペア別閾値とユーザー指定をマージ
		const pairThresholds = options.pairThresholds
			? [...this.defaultPairThresholds, ...options.pairThresholds]
			: this.defaultPairThresholds;

		const mergedOptions = {
			...this.defaultOptions,
			...options,
			pairThresholds,
		};

		const roles = Array.from(colors.keys());

		// 全ペアを検証
		for (let i = 0; i < roles.length; i++) {
			for (let j = i + 1; j < roles.length; j++) {
				const role1 = roles[i];
				const role2 = roles[j];
				const color1 = colors.get(role1);
				const color2 = colors.get(role2);

				if (!color1 || !color2) continue;

				// Hue衝突の検出
				const hueCollision = this.detectHueCollision(
					role1,
					role2,
					color1,
					color2,
					mergedOptions,
				);
				if (hueCollision) {
					results.push(hueCollision);
				}

				// Chroma-Lightness衝突の検出
				const clCollision = this.detectChromaLightnessCollision(
					role1,
					role2,
					color1,
					color2,
					mergedOptions,
				);
				if (clCollision) {
					results.push(clCollision);
				}
			}
		}

		// CVD検証
		if (options.cvdTypes && options.cvdTypes.length > 0) {
			const cvdResults = this.detectCVDCollisions(
				colors,
				options.cvdTypes,
				mergedOptions,
			);
			results.push(...cvdResults);
		}

		return results;
	}

	/**
	 * 衝突に対する調整提案を生成する
	 *
	 * @param collision - 衝突結果
	 * @returns 調整提案
	 */
	suggest(collision: CollisionResult): AdjustmentSuggestion {
		const [role1, role2] = collision.pair;

		// 調整対象を決定
		// - primaryは固定したいのでerror/warning/successを調整
		// - それ以外は2番目のロールを調整
		const target = this.determineAdjustmentTarget(role1, role2);

		switch (collision.type) {
			case "hue": {
				// Hue衝突の調整優先順位: Chroma → Lightness → Hue
				if (collision.deltaH !== undefined) {
					// 非常に近い場合（ΔH < 20°）はHue調整が必要
					if (collision.deltaH < 20) {
						const hueAdjustment = Math.min(
							this.defaultOptions.maxHueAdjustment,
							this.defaultOptions.baseHueThreshold - collision.deltaH + 10,
						);
						return {
							target,
							adjustments: { hue: hueAdjustment },
							priority: "hue",
						};
					}

					// 中程度の近さ（20° <= ΔH < 30°）はChromaで差別化
					if (collision.deltaH < 30) {
						return {
							target,
							adjustments: { chroma: 0.05, lightness: 0.1 },
							priority: "chroma",
						};
					}

					// 特定ペアの強化閾値による検出の場合
					// primary-errorなどは代替色相を提案
					if (this.isSpecialPair(role1, role2)) {
						const hueAdjustment = Math.min(
							this.defaultOptions.maxHueAdjustment,
							45 - collision.deltaH + 5,
						);
						return {
							target,
							adjustments: { hue: hueAdjustment, chroma: 0.03 },
							priority: "hue",
						};
					}
				}

				// デフォルトはChroma調整
				return {
					target,
					adjustments: { chroma: 0.05 },
					priority: "chroma",
				};
			}

			case "chroma-lightness": {
				// Chroma-Lightness衝突はChroma調整を優先
				return {
					target,
					adjustments: {
						chroma: 0.05,
						lightness: 0.1,
					},
					priority: "chroma",
				};
			}

			case "cvd": {
				// CVD衝突はLightness差を広げる
				return {
					target,
					adjustments: { lightness: 0.15 },
					priority: "lightness",
				};
			}

			default:
				return {
					target,
					adjustments: {},
					priority: "chroma",
				};
		}
	}

	/**
	 * 調整対象のロールを決定する
	 */
	private determineAdjustmentTarget(
		role1: RoleType,
		role2: RoleType,
	): RoleType {
		// primaryは通常固定したいので、それ以外を調整
		if (role1 === "primary") return role2;
		if (role2 === "primary") return role1;

		// それ以外は2番目のロールを調整
		return role2;
	}

	/**
	 * 特定の強化閾値が設定されているペアかどうか
	 */
	private isSpecialPair(role1: RoleType, role2: RoleType): boolean {
		return this.defaultPairThresholds.some(
			(pt) =>
				(pt.pair[0] === role1 && pt.pair[1] === role2) ||
				(pt.pair[0] === role2 && pt.pair[1] === role1),
		);
	}

	/**
	 * Hue衝突を検出する
	 */
	private detectHueCollision(
		role1: RoleType,
		role2: RoleType,
		color1: Color,
		color2: Color,
		options: Required<
			Omit<CollisionDetectionOptions, "pairThresholds" | "cvdTypes">
		> &
			CollisionDetectionOptions,
	): CollisionResult | null {
		const oklch1 = color1.oklch;
		const oklch2 = color2.oklch;

		const h1 = oklch1.h || 0;
		const h2 = oklch2.h || 0;

		// 色相差を計算（短い方の経路）
		let deltaH = Math.abs(h2 - h1);
		if (deltaH > 180) {
			deltaH = 360 - deltaH;
		}

		// ペア別閾値をチェック
		let threshold = options.baseHueThreshold;
		let isPairThreshold = false;

		if (options.pairThresholds) {
			for (const pt of options.pairThresholds) {
				if (
					(pt.pair[0] === role1 && pt.pair[1] === role2) ||
					(pt.pair[0] === role2 && pt.pair[1] === role1)
				) {
					threshold = pt.hueThreshold;
					isPairThreshold = true;
					break;
				}
			}
		}

		if (deltaH < threshold) {
			// 重大度の判定
			// ペア別閾値が設定されている場合、またはΔHが非常に小さい場合はerror
			const severity: "warning" | "error" =
				isPairThreshold || deltaH < 15 ? "error" : "warning";

			return {
				type: "hue",
				severity,
				pair: [role1, role2],
				deltaH,
			};
		}

		return null;
	}

	/**
	 * Chroma-Lightness衝突を検出する
	 */
	private detectChromaLightnessCollision(
		role1: RoleType,
		role2: RoleType,
		color1: Color,
		color2: Color,
		options: Required<
			Omit<CollisionDetectionOptions, "pairThresholds" | "cvdTypes">
		>,
	): CollisionResult | null {
		const oklch1 = color1.oklch;
		const oklch2 = color2.oklch;

		const deltaC = Math.abs(oklch2.c - oklch1.c);
		const deltaL = Math.abs(oklch2.l - oklch1.l);

		// 同一Lightness帯でChromaも類似している場合
		if (
			deltaC < options.baseChromaThreshold &&
			deltaL < options.baseLightnessThreshold
		) {
			return {
				type: "chroma-lightness",
				severity: "warning",
				pair: [role1, role2],
				deltaC,
				deltaL,
			};
		}

		return null;
	}

	/**
	 * CVD（色覚多様性）シミュレーションで衝突を検出する
	 */
	private detectCVDCollisions(
		colors: Map<RoleType, Color>,
		cvdTypes: CVDType[],
		options: Required<
			Omit<CollisionDetectionOptions, "pairThresholds" | "cvdTypes">
		>,
	): CollisionResult[] {
		const results: CollisionResult[] = [];
		const roles = Array.from(colors.keys());

		for (const cvdType of cvdTypes) {
			// 各色をCVDシミュレーション
			const simulatedColors = new Map<RoleType, Color>();

			for (const [role, color] of colors) {
				const simulated = this.simulateCVD(color, cvdType);
				simulatedColors.set(role, simulated);
			}

			// シミュレートされた色間の距離を確認
			for (let i = 0; i < roles.length; i++) {
				for (let j = i + 1; j < roles.length; j++) {
					const role1 = roles[i];
					const role2 = roles[j];
					const sim1 = simulatedColors.get(role1);
					const sim2 = simulatedColors.get(role2);

					if (!sim1 || !sim2) continue;

					// シミュレーション後の色差を計算
					const distance = this.calculateColorDistance(sim1, sim2);

					// 距離が近すぎる場合は識別困難
					if (distance < 0.1) {
						results.push({
							type: "cvd",
							severity: "warning",
							pair: [role1, role2],
							cvdType,
						});
					}
				}
			}
		}

		return results;
	}

	/**
	 * CVDシミュレーション（Brettel 1997法の簡易実装）
	 */
	private simulateCVD(color: Color, cvdType: CVDType): Color {
		// sRGBに変換
		const rgb = toRgb(color.oklch);
		const r = rgb?.r ?? 0;
		const g = rgb?.g ?? 0;
		const b = rgb?.b ?? 0;

		// linearRGBに変換
		const linearR = this.srgbToLinear(r);
		const linearG = this.srgbToLinear(g);
		const linearB = this.srgbToLinear(b);

		// 変換行列（Brettel 1997の簡略化版）
		let simR: number;
		let simG: number;
		let simB: number;

		switch (cvdType) {
			case "protanopia":
				// 赤錐体の欠損
				simR = 0.152286 * linearR + 1.052583 * linearG - 0.204868 * linearB;
				simG = 0.114503 * linearR + 0.786281 * linearG + 0.099216 * linearB;
				simB = -0.003882 * linearR - 0.048116 * linearG + 1.051998 * linearB;
				break;

			case "deuteranopia":
				// 緑錐体の欠損
				simR = 0.367322 * linearR + 0.860646 * linearG - 0.227968 * linearB;
				simG = 0.280085 * linearR + 0.672501 * linearG + 0.047414 * linearB;
				simB = -0.01182 * linearR + 0.04294 * linearG + 0.968881 * linearB;
				break;

			case "tritanopia":
				// 青錐体の欠損
				simR = 1.255528 * linearR - 0.076749 * linearG - 0.178779 * linearB;
				simG = -0.078411 * linearR + 0.930809 * linearG + 0.147602 * linearB;
				simB = 0.004733 * linearR + 0.691367 * linearG + 0.3039 * linearB;
				break;

			default:
				simR = linearR;
				simG = linearG;
				simB = linearB;
		}

		// sRGBに戻す
		const finalR = this.linearToSrgb(Math.max(0, Math.min(1, simR)));
		const finalG = this.linearToSrgb(Math.max(0, Math.min(1, simG)));
		const finalB = this.linearToSrgb(Math.max(0, Math.min(1, simB)));

		return new Color({
			mode: "rgb",
			r: finalR,
			g: finalG,
			b: finalB,
		});
	}

	/**
	 * sRGB to linear RGB
	 */
	private srgbToLinear(value: number): number {
		if (value <= 0.04045) {
			return value / 12.92;
		}
		return ((value + 0.055) / 1.055) ** 2.4;
	}

	/**
	 * linear RGB to sRGB
	 */
	private linearToSrgb(value: number): number {
		if (value <= 0.0031308) {
			return value * 12.92;
		}
		return 1.055 * value ** (1 / 2.4) - 0.055;
	}

	/**
	 * 2色間の距離を計算（OKLCH空間）
	 */
	private calculateColorDistance(color1: Color, color2: Color): number {
		const oklch1 = color1.oklch;
		const oklch2 = color2.oklch;

		const dL = oklch2.l - oklch1.l;
		const dC = oklch2.c - oklch1.c;

		// Hue差は循環を考慮
		let dH = (oklch2.h || 0) - (oklch1.h || 0);
		if (dH > 180) dH -= 360;
		if (dH < -180) dH += 360;
		// Hueは度数なので正規化
		const dHNorm = dH / 360;

		// ユークリッド距離
		return Math.sqrt(dL * dL + dC * dC + dHNorm * dHNorm);
	}
}

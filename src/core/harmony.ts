import {
	argbFromHex,
	Hct,
	hexFromArgb,
} from "@material/material-color-utilities";
import { BASE_CHROMAS, DADS_CHROMAS, snapToBaseChroma } from "./base-chroma";
import { Color } from "./color";
import { findColorForContrast } from "./solver";

/**
 * 指定したHueで最大Chromaが得られるToneを見つける
 * 黄色系など、特定のToneでしか鮮やかさを出せない色相に対応
 *
 * @param hue - 色相（0-360）
 * @returns 最大Chromaが得られるTone
 */
function findOptimalToneForHue(hue: number): {
	tone: number;
	maxChroma: number;
} {
	let bestTone = 50;
	let bestChroma = 0;

	// Tone 30-85 の範囲で最大Chromaを探す
	for (let tone = 30; tone <= 85; tone += 5) {
		const testHct = Hct.from(hue, 150, tone);
		if (testHct.chroma > bestChroma) {
			bestChroma = testHct.chroma;
			bestTone = tone;
		}
	}

	return { tone: bestTone, maxChroma: bestChroma };
}

/**
 * 指定したHue/Toneでの最大Chromaを取得する
 *
 * @param hue - 色相（0-360）
 * @param tone - トーン（0-100）
 * @returns 最大Chroma値
 */
function getMaxChromaForHueTone(hue: number, tone: number): number {
	const maxChromaHct = Hct.from(hue, 150, tone);
	return maxChromaHct.chroma;
}

/**
 * Hue値の差を計算（円周上の最短距離）
 *
 * @param hue1 - 色相1（0-360）
 * @param hue2 - 色相2（0-360）
 * @returns 色相の差（0-180）
 */
function hueDistance(hue1: number, hue2: number): number {
	const diff = Math.abs(hue1 - hue2);
	return Math.min(diff, 360 - diff);
}

/**
 * 最も近いハーモニー色を見つける
 *
 * @param targetHue - 対象の色相
 * @param harmonyColors - ハーモニー色の情報リスト
 * @returns 最も近いハーモニー色の情報（色相、距離）またはnull
 */
function findNearestHarmonyColor(
	targetHue: number,
	harmonyColors: Array<{ hue: number; lightness: number; chroma: number }>,
): { hue: number; lightness: number; chroma: number; distance: number } | null {
	if (harmonyColors.length === 0) return null;

	const first = harmonyColors[0];
	if (!first) return null;

	let nearest = first;
	let minDistance = hueDistance(targetHue, nearest.hue);

	for (const hc of harmonyColors) {
		const dist = hueDistance(targetHue, hc.hue);
		if (dist < minDistance) {
			minDistance = dist;
			nearest = hc;
		}
	}

	return {
		hue: nearest.hue,
		lightness: nearest.lightness,
		chroma: nearest.chroma,
		distance: minDistance,
	};
}

/**
 * 黄色系（暖色系）の色相かどうかを判定
 * 黄色系は暗いToneでは鮮やかに見えないため、特別な処理が必要
 *
 * @param hue - 色相（0-360）
 * @returns 黄色系の場合true
 */
function isWarmYellowHue(hue: number): boolean {
	// HCT色相で黄色〜オレンジ系（約60-120°）
	return hue >= 60 && hue <= 120;
}

/**
 * HCT色空間を使用して色相を回転させた色を生成
 * 各色相で最も鮮やかに見えるようにToneとChromaを最適化
 * 特に黄色系は高いToneを使用して鮮やかさを確保
 *
 * @param sourceHex - 元の色（HEX形式）
 * @param hueShift - 色相シフト量（度）
 * @returns 新しい色（Color）
 */
function rotateHueWithHCT(sourceHex: string, hueShift: number): Color {
	const argb = argbFromHex(sourceHex);
	const hct = Hct.fromInt(argb);

	// 新しい色相を計算
	let newHue = (hct.hue + hueShift) % 360;
	if (newHue < 0) newHue += 360;

	// 元の色相での最大Chromaを取得
	const maxChromaAtOriginalHue = getMaxChromaForHueTone(hct.hue, hct.tone);

	// 元の色の相対彩度を計算（0-1）
	const relativeChroma =
		maxChromaAtOriginalHue > 0 ? hct.chroma / maxChromaAtOriginalHue : 0;

	// 新しい色相での最適なToneを取得
	const newOptimal = findOptimalToneForHue(newHue);

	// 黄色系の場合はより積極的にToneを上げる
	let toneBlendFactor: number;
	if (isWarmYellowHue(newHue)) {
		// 黄色系: 最適Toneに強く寄せる（0.85-0.95）
		toneBlendFactor = 0.85 + relativeChroma * 0.1;
	} else {
		// その他: 元のToneをある程度維持（0.5-0.7）
		toneBlendFactor = 0.5 + relativeChroma * 0.2;
	}

	const newTone = hct.tone + (newOptimal.tone - hct.tone) * toneBlendFactor;

	// 新しいToneでの最大Chromaを取得
	const maxChromaAtNewTone = getMaxChromaForHueTone(newHue, newTone);

	// 相対彩度を適用（黄色系は最大に近づける）
	const chromaMultiplier = isWarmYellowHue(newHue)
		? Math.min(relativeChroma * 1.2, 1.0)
		: Math.min(relativeChroma * 1.1, 1.0);
	const newChroma = maxChromaAtNewTone * chromaMultiplier;

	// HCTで新しい色を生成
	const newHct = Hct.from(newHue, newChroma, newTone);
	const newHex = hexFromArgb(newHct.toInt());

	return new Color(newHex);
}

export enum HarmonyType {
	NONE = "none",
	COMPLEMENTARY = "complementary",
	TRIADIC = "triadic",
	ANALOGOUS = "analogous",
	SPLIT_COMPLEMENTARY = "split-complementary",
	TETRADIC = "tetradic",
	SQUARE = "square",
	M3 = "m3", // Material Design 3 color system
	DADS = "dads", // Design Accessible Design System
}

// DADS用のカラー定義
export interface DADSColorDefinition {
	name: string;
	chromaName: string;
	step: number;
	category: "semantic" | "link" | "accent";
}

// DADS用のセマンティック・リンク・アクセントカラー定義
export const DADS_COLORS: DADSColorDefinition[] = [
	// Semantic - Success
	{ name: "Success-1", chromaName: "green", step: 600, category: "semantic" },
	{ name: "Success-2", chromaName: "green", step: 800, category: "semantic" },
	// Semantic - Error
	{ name: "Error-1", chromaName: "red", step: 800, category: "semantic" },
	{ name: "Error-2", chromaName: "red", step: 900, category: "semantic" },
	// Semantic - Warning (Yellow)
	{
		name: "Warning-YL1",
		chromaName: "yellow",
		step: 700,
		category: "semantic",
	},
	{
		name: "Warning-YL2",
		chromaName: "yellow",
		step: 900,
		category: "semantic",
	},
	// Semantic - Warning (Orange alternative)
	{
		name: "Warning-OR1",
		chromaName: "orange",
		step: 600,
		category: "semantic",
	},
	{
		name: "Warning-OR2",
		chromaName: "orange",
		step: 800,
		category: "semantic",
	},
	// Link colors
	{ name: "Link-Default", chromaName: "blue", step: 1000, category: "link" },
	{ name: "Link-Visited", chromaName: "magenta", step: 900, category: "link" },
	{ name: "Link-Active", chromaName: "orange", step: 800, category: "link" },
	// Accent colors (DADS仕様準拠)
	{
		name: "Accent-Purple",
		chromaName: "purple",
		step: 500,
		category: "accent",
	},
	{ name: "Accent-Blue", chromaName: "blue", step: 600, category: "accent" },
	{
		name: "Accent-Light Blue",
		chromaName: "light blue",
		step: 600,
		category: "accent",
	},
	{ name: "Accent-Cyan", chromaName: "cyan", step: 600, category: "accent" },
	{ name: "Accent-Green", chromaName: "green", step: 800, category: "accent" },
	{ name: "Accent-Lime", chromaName: "lime", step: 700, category: "accent" },
	{
		name: "Accent-Yellow",
		chromaName: "yellow",
		step: 700,
		category: "accent",
	},
	{
		name: "Accent-Orange",
		chromaName: "orange",
		step: 600,
		category: "accent",
	},
	{
		name: "Accent-Orange-Dark",
		chromaName: "orange",
		step: 1100,
		category: "accent",
	},
];

export interface HarmonyColor {
	name: string;
	color: Color;
}

export function generateHarmony(
	keyColor: Color,
	type: HarmonyType,
	count: number = 1,
): HarmonyColor[] {
	const baseHue = keyColor.oklch.h || 0;
	const baseChroma = keyColor.oklch.c;
	const baseLightness = keyColor.oklch.l;

	const createColor = (hueShift: number, name: string): HarmonyColor => {
		let newHue = (baseHue + hueShift) % 360;
		if (newHue < 0) newHue += 360;

		return {
			name,
			color: new Color({
				mode: "oklch",
				l: baseLightness,
				c: baseChroma,
				h: newHue,
			}),
		};
	};

	const results: HarmonyColor[] = [{ name: "Primary", color: keyColor }];

	// Helper to add variations around a base angle
	const addVariations = (baseAngle: number, namePrefix: string) => {
		if (count === 1) {
			results.push(createColor(baseAngle, namePrefix));
		} else {
			// Distribute count colors around baseAngle
			// Spread range: 60 degrees total
			const spread = 60;
			const startAngle = baseAngle - spread / 2;
			const step = spread / (count - 1 || 1);

			for (let i = 0; i < count; i++) {
				const angle = startAngle + step * i;
				results.push(createColor(angle, `${namePrefix} ${i + 1}`));
			}
		}
	};

	switch (type) {
		case HarmonyType.NONE:
			break;
		case HarmonyType.COMPLEMENTARY:
			addVariations(180, "Secondary");
			break;
		case HarmonyType.TRIADIC:
			addVariations(120, "Secondary");
			addVariations(240, "Accent");
			break;
		case HarmonyType.ANALOGOUS:
			// Analogous is slightly different as it centers around 0 (Primary)
			// But if we treat it as adding neighbors...
			// Original logic: +30, -30.
			// Let's stick to the previous specific logic for Analogous as it's unique (relative to Primary)
			// OR we can use addVariations around 0? No, that would include Primary.

			if (count === 1) {
				results.push(createColor(30, "Secondary"));
			} else {
				// Distribute count colors around 0 (Primary)
				// Spread range: 90 degrees total
				for (let i = 1; i <= count; i++) {
					// Alternate sides: +30, -30, +60, -60...
					const sign = i % 2 === 0 ? -1 : 1;
					const multiplier = Math.ceil(i / 2);
					const angle = 30 * multiplier * sign;
					results.push(createColor(angle, `Secondary ${i}`));
				}
			}
			break;
		case HarmonyType.SPLIT_COMPLEMENTARY:
			addVariations(150, "Secondary");
			addVariations(210, "Accent");
			break;
		case HarmonyType.TETRADIC:
			addVariations(60, "Secondary");
			addVariations(180, "Accent 1");
			addVariations(240, "Accent 2");
			break;
		case HarmonyType.SQUARE:
			addVariations(90, "Secondary");
			addVariations(180, "Accent 1");
			addVariations(270, "Accent 2");
			break;
	}

	return results;
}

export interface SystemPaletteColor {
	name: string;
	keyColor: Color;
	role: "primary" | "secondary" | "accent" | "neutral" | "semantic";
	baseChromaName?: string; // 基本クロマ名（セマンティックの場合に使用）
	step?: number; // DADS用: 指定されたステップ番号
}

/**
 * ハーモニーベースのシステムパレット生成
 * Paletteビューで使用：選択したハーモニータイプに基づいた色を生成
 *
 * HCT色空間を使用して、知覚的に均一な配色を生成します。
 * これにより、色相を回転させても各色が同等の視覚的強さを持ちます。
 */
export function generateHarmonyPalette(
	keyColor: Color,
	harmonyType: HarmonyType = HarmonyType.COMPLEMENTARY,
): SystemPaletteColor[] {
	const keyHex = keyColor.toHex();

	// Snap key color to nearest base chroma
	const { chroma: primaryChroma } = snapToBaseChroma(keyColor);

	const palette: SystemPaletteColor[] = [];

	// Helper: HCT色空間を使用して色相を回転し、知覚的に均一な色を生成
	const createColorWithHCT = (
		hueShift: number,
		roleName: string,
		role: "primary" | "secondary" | "accent",
	): SystemPaletteColor => {
		// HCTで色相を回転（ChromaとToneは維持）
		const newColor = rotateHueWithHCT(keyHex, hueShift);

		// 基本クロマにスナップ
		const { chroma: snappedChroma } = snapToBaseChroma(newColor);

		return {
			name: roleName,
			keyColor: newColor,
			role,
			baseChromaName: snappedChroma.displayName,
		};
	};

	// Helper: Material 3用 - Hue回転とChroma指定でTone 40のキーカラーを生成
	const createM3KeyColor = (
		hueShift: number,
		targetChroma: number,
		roleName: string,
		role: "primary" | "secondary" | "accent",
	): SystemPaletteColor => {
		// 入力色のHCT値を取得
		const sourceHct = Hct.fromInt(argbFromHex(keyHex));

		// Material 3仕様: キーカラーはTone 60で表示（MTB UI準拠）
		const M3_KEY_TONE = 60;

		// 新しいHCT値を計算（Chromaは固定値）
		const newHue = (sourceHct.hue + hueShift + 360) % 360;

		// HCTからRGBに変換
		const newHct = Hct.from(newHue, targetChroma, M3_KEY_TONE);
		const newHex = hexFromArgb(newHct.toInt());
		const newColor = new Color(newHex);

		// 基本クロマにスナップ
		const { chroma: snappedChroma } = snapToBaseChroma(newColor);

		return {
			name: roleName,
			keyColor: newColor,
			role,
			baseChromaName: snappedChroma.displayName,
		};
	};

	// Primary色を追加（全ハーモニータイプで元の入力色を保持）
	// Material 3でも、Primary Key Colorはブランドカラーそのもの
	palette.push({
		name: "Primary",
		keyColor: keyColor,
		role: "primary",
		baseChromaName: primaryChroma.displayName,
	});

	// ハーモニータイプに基づいて追加の色を生成
	// HCT色空間を使用するため、色相シフト量のみを指定
	switch (harmonyType) {
		case HarmonyType.NONE:
			// Primary のみ
			break;

		case HarmonyType.COMPLEMENTARY:
			// 補色（180度）
			palette.push(createColorWithHCT(180, "Secondary", "secondary"));
			break;

		case HarmonyType.TRIADIC:
			// 三角形（120度, 240度）
			palette.push(createColorWithHCT(120, "Secondary", "secondary"));
			palette.push(createColorWithHCT(240, "Accent", "accent"));
			break;

		case HarmonyType.ANALOGOUS:
			// 類似色（+30度, -30度）
			palette.push(createColorWithHCT(30, "Secondary", "secondary"));
			palette.push(createColorWithHCT(-30, "Accent", "accent"));
			break;

		case HarmonyType.SPLIT_COMPLEMENTARY:
			// 分裂補色（150度, 210度）
			palette.push(createColorWithHCT(150, "Secondary", "secondary"));
			palette.push(createColorWithHCT(210, "Accent", "accent"));
			break;

		case HarmonyType.TETRADIC:
			// 長方形（60度, 180度, 240度）
			palette.push(createColorWithHCT(60, "Secondary", "secondary"));
			palette.push(createColorWithHCT(180, "Accent 1", "accent"));
			palette.push(createColorWithHCT(240, "Accent 2", "accent"));
			break;

		case HarmonyType.SQUARE:
			// 正方形（90度, 180度, 270度）
			palette.push(createColorWithHCT(90, "Secondary", "secondary"));
			palette.push(createColorWithHCT(180, "Accent 1", "accent"));
			palette.push(createColorWithHCT(270, "Accent 2", "accent"));
			break;

		case HarmonyType.M3: {
			// Material Design 3 カラーシステム
			// 公式仕様: https://m3.material.io/styles/color/the-color-system/key-colors-tones
			// - Primary: ブランドカラー（ユーザー入力色）
			// - Secondary: 同じHue、Chroma=16（固定）、Tone=40
			// - Tertiary: Hue+60°、Chroma=24（固定）、Tone=40
			// - Error: 固定色（H=25°, C=84, T=40）
			palette.push(createM3KeyColor(0, 16, "Secondary", "secondary"));
			palette.push(createM3KeyColor(60, 24, "Tertiary", "accent"));

			// Material 3 固定のError色（Tone 60）
			const m3ErrorHct = Hct.from(25, 84, 60);
			const m3ErrorHex = hexFromArgb(m3ErrorHct.toInt());
			const m3ErrorColor = new Color(m3ErrorHex);
			const { chroma: errorChroma } = snapToBaseChroma(m3ErrorColor);
			palette.push({
				name: "Error",
				keyColor: m3ErrorColor,
				role: "semantic",
				baseChromaName: errorChroma.displayName,
			});
			break;
		}

		case HarmonyType.DADS: {
			// DADSモード: セマンティック・リンク・アクセントカラーを抽出
			// 各chromaNameごとにスケールを生成し、指定stepの色を取得

			// STEP_NAMES順序: [1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50]
			const STEP_TO_INDEX: Record<number, number> = {
				1200: 0,
				1100: 1,
				1000: 2,
				900: 3,
				800: 4,
				700: 5,
				600: 6,
				500: 7,
				400: 8,
				300: 9,
				200: 10,
				100: 11,
				50: 12,
			};

			// コントラスト比（moderateベース）
			const baseRatios = [
				21, 15, 10, 7, 4.5, 3, 2.2, 1.6, 1.3, 1.15, 1.07, 1.03, 1.01,
			];
			const bgColor = new Color("#ffffff");

			// chromaNameごとにスケールをキャッシュ
			const scaleCache = new Map<string, Color[]>();

			const getScaleForChroma = (chromaName: string, hue: number): Color[] => {
				if (scaleCache.has(chromaName)) {
					return scaleCache.get(chromaName)!;
				}

				// キーカラー（step 600相当、中間明度）を生成
				const keyColor = new Color({
					mode: "oklch",
					l: 0.55,
					c: 0.15,
					h: hue,
				});

				// スケール生成
				const colors: Color[] = baseRatios.map((ratio) => {
					const solved = findColorForContrast(keyColor, bgColor, ratio);
					return solved || keyColor;
				});

				scaleCache.set(chromaName, colors);
				return colors;
			};

			for (const dadsDef of DADS_COLORS) {
				const chromaDef = DADS_CHROMAS.find(
					(c) => c.name === dadsDef.chromaName,
				);
				if (!chromaDef) continue;

				// スケールを取得
				const scale = getScaleForChroma(dadsDef.chromaName, chromaDef.hue);

				// stepに対応するインデックスから色を取得
				const stepIndex = STEP_TO_INDEX[dadsDef.step] ?? 6; // デフォルト600
				const colorFromScale = scale[stepIndex] ?? scale[6]!;

				palette.push({
					name: dadsDef.name,
					keyColor: colorFromScale!,
					role: dadsDef.category === "semantic" ? "semantic" : "accent",
					baseChromaName: chromaDef.displayName,
					step: dadsDef.step,
				});
			}
			break;
		}
	}

	// Neutral / Neutral Variant を追加
	const primaryHue = primaryChroma.hue;

	// Material 3 Warm Neutral: seed hueを持つ低彩度色
	palette.push({
		name: "Neutral",
		role: "neutral",
		keyColor: new Color({
			mode: "oklch",
			l: 0.5,
			c: 0.01,
			h: primaryHue,
		}),
	});

	palette.push({
		name: "Neutral Variant",
		role: "neutral",
		keyColor: new Color({
			mode: "oklch",
			l: 0.5,
			c: 0.03,
			h: primaryHue,
		}),
	});

	return palette;
}

/**
 * 全13基本クロマのシステムパレット生成
 * Shadesビューで使用：すべての基本クロマを色相順に生成
 *
 * @param keyColor - 入力キーカラー
 * @param harmonyPalette - ハーモニーパレット（指定時はハーモニー色を優先使用）
 */
export function generateFullChromaPalette(
	keyColor: Color,
	harmonyPalette?: SystemPaletteColor[],
): SystemPaletteColor[] {
	const baseLightness = keyColor.oklch.l;
	const baseChroma = keyColor.oklch.c;

	// Snap key color to nearest base chroma
	const { chroma: primaryChroma } = snapToBaseChroma(keyColor);

	// ハーモニーパレットからbaseChromaName→キーカラーのマップを作成
	const harmonyColorMap = new Map<string, SystemPaletteColor>();
	// ハーモニー色のOKLCH情報を収集（近傍色相調整用）
	const harmonyColorInfo: Array<{
		hue: number;
		lightness: number;
		chroma: number;
	}> = [];

	if (harmonyPalette) {
		for (const hc of harmonyPalette) {
			if (hc.baseChromaName) {
				// Primaryを優先：既にPrimaryが登録されている場合は上書きしない
				const existing = harmonyColorMap.get(hc.baseChromaName);
				if (!existing || existing.role !== "primary") {
					harmonyColorMap.set(hc.baseChromaName, hc);
				}
				// ハーモニー色の特性を収集
				const oklch = hc.keyColor.oklch;
				harmonyColorInfo.push({
					hue: oklch.h ?? 0,
					lightness: oklch.l,
					chroma: oklch.c,
				});
			}
		}
	}

	const palette: SystemPaletteColor[] = [];

	// セマンティックカラーの対応表
	const semanticNames: Record<string, string> = {
		green: "Success",
		yellow: "Warning",
		red: "Error",
		cyan: "Info",
	};

	// 近傍色相の影響範囲（度）- この範囲内のハーモニー色から影響を受ける
	const INFLUENCE_RANGE = 45;

	// すべての13基本クロマを色相順（青から）に生成
	for (const chromaDef of BASE_CHROMAS) {
		const isPrimary = chromaDef.name === primaryChroma.name;
		const semanticName = semanticNames[chromaDef.name];

		// ハーモニーパレットにこの色相が含まれているか確認
		const harmonyColor = harmonyColorMap.get(chromaDef.displayName);

		let color: Color;
		let name = "";
		let role: "primary" | "secondary" | "accent" | "neutral" | "semantic";

		if (harmonyColor) {
			// ハーモニーパレットのキーカラーを使用（一貫性のため）
			color = harmonyColor.keyColor;
			// semanticロールの場合、セマンティック名を使用（Error-1/2ではなくError）
			// これによりShadesビューで統一された名前が表示される
			if (harmonyColor.role === "semantic" && semanticName) {
				name = semanticName;
			} else {
				name = harmonyColor.name;
			}
			role = harmonyColor.role;
		} else if (isPrimary) {
			// Primaryは元の入力色を保持
			color = keyColor;
			name = "Primary";
			role = "primary";
		} else {
			// ハーモニーに含まれない色相：近傍ハーモニー色から影響を受ける
			const nearestHarmony = findNearestHarmonyColor(
				chromaDef.hue,
				harmonyColorInfo,
			);

			let adjustedLightness = baseLightness;
			let adjustedChroma = baseChroma;

			if (nearestHarmony && nearestHarmony.distance < INFLUENCE_RANGE) {
				// 距離に基づいて影響度を計算（近いほど強い影響）
				const influence = 1 - nearestHarmony.distance / INFLUENCE_RANGE;

				// ハーモニー色の特性を補間
				adjustedLightness =
					baseLightness +
					(nearestHarmony.lightness - baseLightness) * influence;
				adjustedChroma =
					baseChroma + (nearestHarmony.chroma - baseChroma) * influence;
			}

			color = new Color({
				mode: "oklch",
				l: adjustedLightness,
				c: adjustedChroma,
				h: chromaDef.hue,
			});
			name = semanticName || "";
			role = semanticName ? "semantic" : "accent";
		}

		palette.push({
			name,
			keyColor: color,
			role,
			baseChromaName: chromaDef.displayName,
		});
	}

	// Neutral / Neutral Variant を追加
	const primaryHue = primaryChroma.hue;

	// Material 3 Warm Neutral: seed hueを持つ低彩度色
	palette.push({
		name: "Neutral",
		role: "neutral",
		keyColor: new Color({
			mode: "oklch",
			l: 0.5,
			c: 0.01,
			h: primaryHue,
		}),
	});

	palette.push({
		name: "Neutral Variant",
		role: "neutral",
		keyColor: new Color({
			mode: "oklch",
			l: 0.5,
			c: 0.03,
			h: primaryHue,
		}),
	});

	return palette;
}

/**
 * 後方互換性のためのラッパー関数
 * デフォルトでハーモニーパレットを生成
 */
export function generateSystemPalette(
	keyColor: Color,
	harmonyType: HarmonyType = HarmonyType.COMPLEMENTARY,
): SystemPaletteColor[] {
	return generateHarmonyPalette(keyColor, harmonyType);
}

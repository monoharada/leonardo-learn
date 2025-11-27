import {
	argbFromHex,
	Hct,
	hexFromArgb,
} from "@material/material-color-utilities";
import { BASE_CHROMAS, DADS_CHROMAS, snapToBaseChroma } from "./base-chroma";
import { Color } from "./color";

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

/**
 * HCT色空間を使用して指定されたHue値の色を生成
 * 各色相で最も鮮やかに見えるようにToneとChromaを最適化
 * 特に黄色系は高いToneを使用して鮮やかさを確保
 *
 * @param sourceHex - 元の色（HEX形式）
 * @param targetHue - 目標色相（度）
 * @returns 新しい色（Color）
 */
function createColorAtHueWithHCT(sourceHex: string, targetHue: number): Color {
	const argb = argbFromHex(sourceHex);
	const hct = Hct.fromInt(argb);

	// 目標色相を正規化
	let normalizedHue = targetHue % 360;
	if (normalizedHue < 0) normalizedHue += 360;

	// 元の色相での最大Chromaを取得
	const maxChromaAtOriginalHue = getMaxChromaForHueTone(hct.hue, hct.tone);

	// 元の色の相対彩度を計算（0-1）
	const relativeChroma =
		maxChromaAtOriginalHue > 0 ? hct.chroma / maxChromaAtOriginalHue : 0;

	// 新しい色相での最適なToneを取得
	const newOptimal = findOptimalToneForHue(normalizedHue);

	// 黄色系の場合はより積極的にToneを上げる
	let toneBlendFactor: number;
	if (isWarmYellowHue(normalizedHue)) {
		// 黄色系: 最適Toneに強く寄せる（0.85-0.95）
		toneBlendFactor = 0.85 + relativeChroma * 0.1;
	} else {
		// その他: 元のToneをある程度維持（0.5-0.7）
		toneBlendFactor = 0.5 + relativeChroma * 0.2;
	}

	const newTone = hct.tone + (newOptimal.tone - hct.tone) * toneBlendFactor;

	// 新しいToneでの最大Chromaを取得
	const maxChromaAtNewTone = getMaxChromaForHueTone(normalizedHue, newTone);

	// 相対彩度を適用（黄色系は最大に近づける）
	const chromaMultiplier = isWarmYellowHue(normalizedHue)
		? Math.min(relativeChroma * 1.2, 1.0)
		: Math.min(relativeChroma * 1.1, 1.0);
	const newChroma = maxChromaAtNewTone * chromaMultiplier;

	// HCTで新しい色を生成
	const newHct = Hct.from(normalizedHue, newChroma, newTone);
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
	// Accent colors
	{
		name: "Accent-Purple",
		chromaName: "purple",
		step: 500,
		category: "accent",
	},
	{ name: "Accent-Blue", chromaName: "blue", step: 600, category: "accent" },
	{ name: "Accent-Cyan", chromaName: "cyan", step: 600, category: "accent" },
	{ name: "Accent-Teal", chromaName: "teal", step: 600, category: "accent" },
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

	// Primary色を追加（元の入力色を保持）
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

		case HarmonyType.M3:
			// M3モード: Primary, Secondary, Tertiary
			palette.push(createColorWithHCT(120, "Secondary", "secondary"));
			palette.push(createColorWithHCT(240, "Tertiary", "accent"));
			break;

		case HarmonyType.DADS:
			// DADSモード: セマンティック・リンク・アクセントカラーを抽出
			// Primaryは既に追加済みなので、DADS_COLORSから色を生成
			// HCT色空間を使用して、各色相で知覚的に均一な色を生成
			for (const dadsDef of DADS_COLORS) {
				const chromaDef = DADS_CHROMAS.find(
					(c) => c.name === dadsDef.chromaName,
				);
				if (!chromaDef) continue;

				// HCTで指定されたHue値に色を生成
				const newColor = createColorAtHueWithHCT(keyHex, chromaDef.hue);

				palette.push({
					name: dadsDef.name,
					keyColor: newColor,
					role: dadsDef.category === "semantic" ? "semantic" : "accent",
					baseChromaName: chromaDef.displayName,
					step: dadsDef.step,
				});
			}
			break;
	}

	// Neutral（Gray, Slate）を追加
	const primaryHue = primaryChroma.hue;

	palette.push({
		name: "Gray",
		role: "neutral",
		keyColor: new Color({
			mode: "oklch",
			l: 0.5,
			c: 0.01,
			h: primaryHue,
		}),
	});

	palette.push({
		name: "Slate",
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
 */
export function generateFullChromaPalette(
	keyColor: Color,
): SystemPaletteColor[] {
	const baseLightness = keyColor.oklch.l;
	const baseChroma = keyColor.oklch.c;

	// Snap key color to nearest base chroma
	const { chroma: primaryChroma } = snapToBaseChroma(keyColor);

	const palette: SystemPaletteColor[] = [];

	// セマンティックカラーの対応表
	const semanticNames: Record<string, string> = {
		green: "Success",
		yellow: "Warning",
		red: "Error",
		cyan: "Info",
	};

	// すべての13基本クロマを色相順（青から）に生成
	for (const chromaDef of BASE_CHROMAS) {
		const isPrimary = chromaDef.name === primaryChroma.name;
		const semanticName = semanticNames[chromaDef.name];

		// Primaryは元の入力色を保持、それ以外は基本クロマのHueを使用
		const color = isPrimary
			? keyColor
			: new Color({
					mode: "oklch",
					l: baseLightness,
					c: baseChroma,
					h: chromaDef.hue,
				});

		// 名前の決定: Primary > セマンティック > 空
		let name = "";
		if (isPrimary) {
			name = "Primary";
		} else if (semanticName) {
			name = semanticName;
		}

		palette.push({
			name,
			keyColor: color,
			role: isPrimary ? "primary" : semanticName ? "semantic" : "accent",
			baseChromaName: chromaDef.displayName,
		});
	}

	// Gray と Slate（Neutral）を追加
	const primaryHue = primaryChroma.hue;

	palette.push({
		name: "Gray",
		role: "neutral",
		keyColor: new Color({
			mode: "oklch",
			l: 0.5,
			c: 0.01,
			h: primaryHue,
		}),
	});

	palette.push({
		name: "Slate",
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

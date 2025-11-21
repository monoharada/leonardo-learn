import { Color } from "./color";

export enum HarmonyType {
	NONE = "none",
	COMPLEMENTARY = "complementary",
	TRIADIC = "triadic",
	ANALOGOUS = "analogous",
	SPLIT_COMPLEMENTARY = "split-complementary",
	TETRADIC = "tetradic",
	SQUARE = "square",
}

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
}

export function generateSystemPalette(
	keyColor: Color,
	harmonyType: HarmonyType = HarmonyType.COMPLEMENTARY,
): SystemPaletteColor[] {
	const baseHue = keyColor.oklch.h || 0;
	const baseLightness = keyColor.oklch.l;
	const baseChroma = keyColor.oklch.c;

	const createColor = (
		hue: number,
		chroma: number,
		lightness: number,
		name: string,
		role: SystemPaletteColor["role"],
	): SystemPaletteColor => {
		let h = hue % 360;
		if (h < 0) h += 360;
		return {
			name,
			role,
			keyColor: new Color({
				mode: "oklch",
				l: lightness,
				c: chroma,
				h: h,
			}),
		};
	};

	const palette: SystemPaletteColor[] = [];

	// 1. Primary
	palette.push({ name: "Primary", keyColor: keyColor, role: "primary" });

	// 2. Harmony Colors (Secondary / Accents) based on Type
	switch (harmonyType) {
		case HarmonyType.NONE:
		case HarmonyType.COMPLEMENTARY:
			// Standard: Complementary Secondary + Analogous Accents
			palette.push(
				createColor(
					baseHue + 180,
					baseChroma,
					baseLightness,
					"Secondary",
					"secondary",
				),
			);
			palette.push(
				createColor(
					baseHue - 30,
					baseChroma,
					baseLightness,
					"Accent 1",
					"accent",
				),
			);
			palette.push(
				createColor(
					baseHue + 30,
					baseChroma,
					baseLightness,
					"Accent 2",
					"accent",
				),
			);
			break;
		case HarmonyType.TRIADIC:
			palette.push(
				createColor(
					baseHue + 120,
					baseChroma,
					baseLightness,
					"Secondary",
					"secondary",
				),
			);
			palette.push(
				createColor(
					baseHue + 240,
					baseChroma,
					baseLightness,
					"Accent",
					"accent",
				),
			);
			break;
		case HarmonyType.ANALOGOUS:
			palette.push(
				createColor(
					baseHue - 30,
					baseChroma,
					baseLightness,
					"Secondary",
					"secondary",
				),
			);
			palette.push(
				createColor(
					baseHue + 30,
					baseChroma,
					baseLightness,
					"Accent",
					"accent",
				),
			);
			break;
		case HarmonyType.SPLIT_COMPLEMENTARY:
			palette.push(
				createColor(
					baseHue + 150,
					baseChroma,
					baseLightness,
					"Secondary",
					"secondary",
				),
			);
			palette.push(
				createColor(
					baseHue + 210,
					baseChroma,
					baseLightness,
					"Accent",
					"accent",
				),
			);
			break;
		case HarmonyType.TETRADIC:
			palette.push(
				createColor(
					baseHue + 60,
					baseChroma,
					baseLightness,
					"Secondary",
					"secondary",
				),
			);
			palette.push(
				createColor(
					baseHue + 180,
					baseChroma,
					baseLightness,
					"Accent 1",
					"accent",
				),
			);
			palette.push(
				createColor(
					baseHue + 240,
					baseChroma,
					baseLightness,
					"Accent 2",
					"accent",
				),
			);
			break;
		case HarmonyType.SQUARE:
			palette.push(
				createColor(
					baseHue + 90,
					baseChroma,
					baseLightness,
					"Secondary",
					"secondary",
				),
			);
			palette.push(
				createColor(
					baseHue + 180,
					baseChroma,
					baseLightness,
					"Accent 1",
					"accent",
				),
			);
			palette.push(
				createColor(
					baseHue + 270,
					baseChroma,
					baseLightness,
					"Accent 2",
					"accent",
				),
			);
			break;
	}

	// 3. Neutrals
	// Gray: Very low chroma, same hue
	palette.push(createColor(baseHue, 0.01, 0.5, "Gray", "neutral"));
	// Slate: Slightly more chroma, same hue (Cool gray)
	palette.push(createColor(baseHue, 0.03, 0.5, "Slate", "neutral"));

	// 4. Semantics
	const semanticChroma = Math.max(baseChroma, 0.12);
	const semanticLightness = baseLightness;

	palette.push(
		createColor(145, semanticChroma, semanticLightness, "Success", "semantic"),
	); // Green
	palette.push(
		createColor(100, semanticChroma, semanticLightness, "Warning", "semantic"),
	); // Yellow
	palette.push(
		createColor(30, semanticChroma, semanticLightness, "Error", "semantic"),
	); // Red
	palette.push(
		createColor(250, semanticChroma, semanticLightness, "Info", "semantic"),
	); // Blue

	return palette;
}

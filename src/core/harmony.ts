import { Color } from "./color";
import { ColorSystem } from "./system/color-system";

export enum HarmonyType {
	NONE = "none",
	COMPLEMENTARY = "complementary",
	TRIADIC = "triadic",
	ANALOGOUS = "analogous",
	SPLIT_COMPLEMENTARY = "split-complementary",
	TETRADIC = "tetradic",
	SQUARE = "square",
	M3 = "m3", // Material Design 3 color system
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
		case HarmonyType.M3: {
			// Material Design 3 color system using ColorSystem facade
			const colorSystem = new ColorSystem();
			const result = colorSystem.generate(keyColor.toHex(), {
				mode: "m3",
				roles: [
					"primary",
					"secondary",
					"tertiary",
					"neutral",
					"neutralVariant",
					"success",
					"warning",
					"error",
				],
			});

			// Helper to extract tone from scale
			const getToneColor = (
				roleName: string,
				toneValue: number,
			): Color | null => {
				const scale = result.scales.get(
					roleName as
						| "primary"
						| "secondary"
						| "tertiary"
						| "error"
						| "warning"
						| "success"
						| "neutral"
						| "neutralVariant",
				);
				if (!scale) return null;
				const color = scale.tones.get(toneValue);
				return color || null;
			};

			// Primary is already added, now add others from M3 result
			const secondaryColor = getToneColor("secondary", 40);
			if (secondaryColor) {
				palette.push({
					name: "Secondary",
					role: "secondary",
					keyColor: new Color({
						mode: "oklch",
						l: secondaryColor.oklch.l,
						c: secondaryColor.oklch.c,
						h: secondaryColor.oklch.h,
					}),
				});
			}

			const tertiaryColor = getToneColor("tertiary", 40);
			if (tertiaryColor) {
				palette.push({
					name: "Accent 1",
					role: "accent",
					keyColor: new Color({
						mode: "oklch",
						l: tertiaryColor.oklch.l,
						c: tertiaryColor.oklch.c,
						h: tertiaryColor.oklch.h,
					}),
				});
			}

			// Add neutrals from M3
			const neutralColor = getToneColor("neutral", 50);
			if (neutralColor) {
				palette.push({
					name: "Gray",
					role: "neutral",
					keyColor: new Color({
						mode: "oklch",
						l: neutralColor.oklch.l,
						c: neutralColor.oklch.c,
						h: neutralColor.oklch.h,
					}),
				});
			}

			const neutralVariantColor = getToneColor("neutralVariant", 50);
			if (neutralVariantColor) {
				palette.push({
					name: "Slate",
					role: "neutral",
					keyColor: new Color({
						mode: "oklch",
						l: neutralVariantColor.oklch.l,
						c: neutralVariantColor.oklch.c,
						h: neutralVariantColor.oklch.h,
					}),
				});
			}

			// Add semantics from M3
			const successColor = getToneColor("success", 40);
			if (successColor) {
				palette.push({
					name: "Success",
					role: "semantic",
					keyColor: new Color({
						mode: "oklch",
						l: successColor.oklch.l,
						c: successColor.oklch.c,
						h: successColor.oklch.h,
					}),
				});
			}

			const warningColor = getToneColor("warning", 40);
			if (warningColor) {
				palette.push({
					name: "Warning",
					role: "semantic",
					keyColor: new Color({
						mode: "oklch",
						l: warningColor.oklch.l,
						c: warningColor.oklch.c,
						h: warningColor.oklch.h,
					}),
				});
			}

			const errorColor = getToneColor("error", 40);
			if (errorColor) {
				palette.push({
					name: "Error",
					role: "semantic",
					keyColor: new Color({
						mode: "oklch",
						l: errorColor.oklch.l,
						c: errorColor.oklch.c,
						h: errorColor.oklch.h,
					}),
				});
			}

			// Return early for M3 - we've already added all colors
			return palette;
		}
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

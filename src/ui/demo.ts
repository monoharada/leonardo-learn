import { getAPCA, getAPCAStatus } from "../accessibility/apca";
import { verifyContrast } from "../accessibility/wcag2";
import { BackgroundColor } from "../core/background";
import { Color } from "../core/color";
import { Theme } from "../core/theme";
import { getAPCALabel } from "./i18n";

interface KeyColorWithStep {
	color: string;
	step?: number; // 50, 100, 200, ..., 1200
}

interface PaletteConfig {
	id: string;
	name: string;
	keyColors: string[]; // Format: "#hex" or "#hex@step" (e.g., "#b3e5fc@300")
	ratios: number[];
}

type ContrastIntensity = "subtle" | "moderate" | "strong" | "vivid";
type LightnessDistribution = "linear" | "easeIn" | "easeOut";

// ... (rest of file)

// Contrast ranges for different intensity levels
const contrastRanges: Record<ContrastIntensity, { min: number; max: number }> =
	{
		subtle: { min: 0.35, max: 0.85 }, // Narrow range for subtle contrast
		moderate: { min: 0.25, max: 0.92 }, // Balanced range (default)
		strong: { min: 0.2, max: 0.95 }, // Wide range for strong contrast
		vivid: { min: 0.15, max: 0.98 }, // Maximum range for vivid colors
	};

// Easing functions for lightness distribution
const easingFunctions: Record<LightnessDistribution, (t: number) => number> = {
	linear: (t: number) => t,
	easeIn: (t: number) => t * t, // Slower at start, faster at end (more steps in dark colors)
	easeOut: (t: number) => 1 - (1 - t) ** 2, // Faster at start, slower at end (more steps in light colors)
};

// Default State
const state = {
	palettes: [
		{
			id: "color",
			name: "Color",
			keyColors: ["#008BF2@600"], // Blue at step 600 (default)
			ratios: [21, 15, 10, 7, 4.5, 3, 1],
		},
		{
			id: "neutral",
			name: "Neutral",
			keyColors: ["#1a1a1a@800"], // Dark gray at step 800
			ratios: [21, 15, 10, 7, 4.5, 3, 1],
		},
	] as PaletteConfig[],
	activeId: "color",
	contrastIntensity: "moderate" as ContrastIntensity,
	lightnessDistribution: "linear" as LightnessDistribution,
};

export const runDemo = () => {
	const app = document.getElementById("app");
	const paletteListEl = document.getElementById("palette-list");
	const keyColorsInput = document.getElementById(
		"keyColors",
	) as HTMLInputElement;
	const currentNameEl = document.getElementById("current-palette-name");

	if (!app || !paletteListEl) return;

	// Helper: Get Active Palette
	const getActivePalette = () => {
		const found = state.palettes.find((p) => p.id === state.activeId);
		return found || state.palettes[0];
	};

	// Helper: Generate Token Name (e.g., primary-900)
	// Standard Scale: 50, 100, 200 ... 1200 (13 steps)
	// If we have extra steps (due to key color injection), we need to handle that.
	// For now, let's just map linearly or use closest standard step.
	// Simple approach: Map index to standard steps if length matches, else fallback.
	const standardSteps = [
		1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50,
	];

	const getTokenName = (name: string, index: number, total: number) => {
		// If we have exactly 13 items, map directly.
		if (total === standardSteps.length) {
			return `${name.toLowerCase()}-${standardSteps[index]}`;
		}

		// If mismatch (e.g. duplicates removed), try to map proportionally or just use standard steps if within range.
		// Since we sort Descending (Dark -> Light), and standardSteps is Dark -> Light (1200 -> 50),
		// we can try to align.
		if (index < standardSteps.length) {
			return `${name.toLowerCase()}-${standardSteps[index]}`;
		}

		// Fallback for overflow
		return `${name.toLowerCase()}-${(total - index) * 10}`;
	};

	const renderSidebar = () => {
		paletteListEl.innerHTML = "";
		state.palettes.forEach((p) => {
			const btn = document.createElement("div");
			btn.textContent = p.name;
			btn.style.padding = "0.5rem 1rem";
			btn.style.cursor = "pointer";
			btn.style.borderRadius = "4px";
			btn.style.marginBottom = "4px";

			if (p.id === state.activeId) {
				btn.style.background = "#e3f2fd";
				btn.style.color = "#0052cc";
				btn.style.fontWeight = "bold";
			} else {
				btn.style.background = "transparent";
			}

			btn.onclick = () => {
				state.activeId = p.id;
				updateEditor();
				renderSidebar();
				renderMain();
			};
			paletteListEl.appendChild(btn);
		});
	};

	const updateEditor = () => {
		const p = getActivePalette();
		if (!p) return;
		currentNameEl!.textContent = p.name;
		// Display only hex colors, remove @step for clean UI
		keyColorsInput.value = p.keyColors
			.map((kc) => kc.split("@")[0]?.trim() ?? kc)
			.join(", ");
	};

	// Helper: Parse key color with optional step specification
	const parseKeyColor = (input: string): KeyColorWithStep => {
		const trimmed = input.trim();
		const parts = trimmed.split("@");
		const color = parts[0]?.trim() ?? trimmed;

		// Parse step if present (e.g., "#008BF2@600")
		let step: number | undefined;
		if (parts.length > 1) {
			const stepStr = parts[1]?.trim();
			const parsedStep = parseInt(stepStr ?? "", 10);
			if (!isNaN(parsedStep)) {
				step = parsedStep;
			}
		}

		return { color, step };
	};

	const renderMain = () => {
		const p = getActivePalette();
		if (!p) return;

		// Standard 13-step scale (50-1200)
		// 50 is lightest, 1200 is darkest
		const standardSteps = [
			50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
		];
		const standardRatios = [
			1.05, // 50
			1.1, // 100
			1.2, // 200
			1.35, // 300
			1.7, // 400
			2.5, // 500
			3.5, // 600
			4.5, // 700 (AA)
			6.0, // 800
			8.5, // 900
			11.0, // 1000
			14.0, // 1100
			17.0, // 1200
		];

		// Override ratios with standard scale for this phase
		// In a real app, this might be toggleable
		const targetRatios = standardRatios;

		// Parse inputs with optional step specification
		let keyColorsWithSteps: KeyColorWithStep[];
		let keyColors: Color[];
		try {
			keyColorsWithSteps = p.keyColors.map(parseKeyColor);
			// Use skipClamp: true to preserve exact input colors for key colors
			keyColors = keyColorsWithSteps.map(
				(kc) => new Color(kc.color, { skipClamp: true }),
			);
		} catch (e) {
			return;
		}

		const bg = BackgroundColor.White;

		// Store original key colors for badge logic and ratio injection
		const originalKeyColors = [...keyColors];

		// Store original hex values (before clampChroma) for exact override
		const originalHexValues = keyColorsWithSteps.map((kc) => kc.color);

		// Check if any key color has an explicit step
		const hasExplicitStep = keyColorsWithSteps.some(
			(kc) => kc.step !== undefined,
		);

		// SMART RANGE EXTENSION
		// Only apply automatic anchor generation if no explicit steps are specified
		if (!hasExplicitStep) {
			// Check if we need to add a dark or light anchor
			// 1. Find the most colorful key color to use as a base for anchors
			const primaryKey = keyColors.reduce((prev, curr) => {
				if (!prev) return curr;
				return prev.oklch.c > curr.oklch.c ? prev : curr;
			}, keyColors[0]);

			if (!primaryKey) return; // Should not happen if keyColors is not empty

			// 2. Check contrast range
			const contrasts = keyColors.map((k) => k.contrast(bg));
			const maxContrast = Math.max(...contrasts);
			const minContrast = Math.min(...contrasts);

			// 3. Inject Dark Anchor if max contrast is too low (e.g. < 4.5)
			// Meaning we only have light colors
			if (maxContrast < 4.5) {
				// Create a dark version of the primary key
				// OKLCH Strategy: Preserve chroma (vividness) while adjusting hue to avoid greenish tint
				let adjustedHue = primaryKey.oklch.h ?? 0;
				let chromaMultiplier = 0.8; // Keep high chroma for vivid dark colors
				const lightnessTarget = 0.25; // Reasonably dark but not too dark

				if (adjustedHue >= 180 && adjustedHue <= 270) {
					// For cyan/blue hues, shift towards purple (260-280°) to avoid green
					// Target the "deep blue-purple" range which stays vivid when dark
					const targetHue = 265; // Deep purple-blue (vivid when dark, no green tint)
					const currentDistance = Math.abs(adjustedHue - targetHue);

					// Shift towards target hue, but preserve some of the original character
					if (adjustedHue < targetHue) {
						adjustedHue = adjustedHue + currentDistance * 0.6; // 60% shift towards target
					} else {
						adjustedHue = adjustedHue - currentDistance * 0.4; // 40% shift towards target
					}

					// Keep chroma high for vivid colors
					chromaMultiplier = 0.7;
				}

				const darkAnchor = new Color({
					mode: "oklch",
					l: lightnessTarget,
					c: primaryKey.oklch.c * chromaMultiplier, // Preserve chroma for vividness
					h: adjustedHue,
				});
				keyColors.push(darkAnchor);
			}

			// 4. Inject Light Anchor if min contrast is too high (e.g. > 3.0)
			// Meaning we only have dark colors
			if (minContrast > 3.0) {
				// Create a light version (or just use white if very light)
				// For now, let's just ensure White is there if not present
				// Actually, usually we want a tinted light color.
				const lightAnchor = new Color({
					mode: "oklch",
					l: 0.98, // Very light
					c: primaryKey.oklch.c * 0.2, // Very low chroma
					h: primaryKey.oklch.h,
				});
				keyColors.unshift(lightAnchor);
			}
		} else {
			// When explicit step is specified, add multiple anchors for richer gradation
			// This creates a more distinct color scale with better perceptual differences
			const primaryKey = keyColors[0];
			if (!primaryKey) return;

			const baseHue = primaryKey.oklch.h;
			const baseChroma = primaryKey.oklch.c;

			// Add multiple dark anchors for richer dark scale
			const darkAnchor1 = new Color({
				mode: "oklch",
				l: 0.25, // Mid-dark
				c: baseChroma * 0.95,
				h: baseHue,
			});

			const darkAnchor2 = new Color({
				mode: "oklch",
				l: 0.15, // Very dark
				c: baseChroma * 0.85,
				h: baseHue,
			});

			keyColors.push(darkAnchor1, darkAnchor2);

			// Add multiple light anchors for richer light scale
			const lightAnchor1 = new Color({
				mode: "oklch",
				l: 0.85, // Mid-light
				c: baseChroma * 0.6,
				h: baseHue,
			});

			const lightAnchor2 = new Color({
				mode: "oklch",
				l: 0.95, // Very light
				c: baseChroma * 0.3,
				h: baseHue,
			});

			keyColors.unshift(lightAnchor2, lightAnchor1);
		}

		// INJECTION: Add Key Color Ratios
		// Strategy: If step is explicitly specified, use that step's index.
		// Otherwise, replace the nearest standard ratio with the key color ratio.
		// IMPORTANT: Only inject ratios for ORIGINAL user key colors.

		let finalRatios = [...targetRatios];

		// Process each original key color (before anchors were added)
		keyColorsWithSteps.forEach((keyColorSpec, idx) => {
			if (idx >= originalKeyColors.length) return; // Skip if index out of bounds

			const keyColor = originalKeyColors[idx];
			if (!keyColor) return;

			const keyRatio = keyColor.contrast(bg);

			if (keyColorSpec.step !== undefined) {
				// Explicit step specified (e.g., "#b3e5fc@300")
				const stepIndex = standardSteps.indexOf(keyColorSpec.step);
				if (stepIndex !== -1) {
					// Valid step, inject at that position
					finalRatios[stepIndex] = keyRatio;
				}
			} else {
				// No step specified, find closest standard ratio (auto mode)
				let closestIndex = -1;
				let minDiff = Number.MAX_VALUE;

				finalRatios.forEach((r, i) => {
					const diff = Math.abs(r - keyRatio);
					if (diff < minDiff) {
						minDiff = diff;
						closestIndex = i;
					}
				});

				// Replace if found (and valid)
				if (closestIndex !== -1) {
					finalRatios[closestIndex] = keyRatio;
				}
			}
		});

		// Sort Descending (Darker -> Lighter)
		// Note: standardRatios was defined Low->High (1.05 -> 17.0) in code?
		// Let's check the definition in previous file content.
		// standardRatios = [1.05, 1.1, ... 17.0] (Light -> Dark in terms of contrast value, but 1.05 is White-on-White? No.)
		// Contrast 1.05 is very light (near white). Contrast 21 is Black.
		// So [1.05 ... 17.0] is Light -> Dark.
		// But we want 1200 (Dark) -> 50 (Light) for the list?
		// The previous code sorted `b - a` (Descending), so 17.0 first.

		finalRatios.sort((a, b) => b - a);

		// Remove duplicates (with epsilon)
		finalRatios = finalRatios.filter((r, i, arr) => {
			if (i === 0) return true;
			return Math.abs(r - (arr[i - 1] ?? 0)) > 0.01;
		});

		let colors: Color[];

		// If explicit step is specified, generate colors directly without interpolation
		if (hasExplicitStep && originalKeyColors.length > 0) {
			const keyColor = originalKeyColors[0]!;
			const baseL = keyColor.oklch.l;
			const baseC = keyColor.oklch.c;
			const baseH = keyColor.oklch.h ?? 0; // Ensure hue is defined
			const keyStep = keyColorsWithSteps[0]?.step ?? 600;

			// Detect achromatic (neutral/gray) colors
			// Force achromatic for Neutral palette
			const p = getActivePalette();
			const isNeutralPalette = p?.id === "neutral";
			const isAchromatic = isNeutralPalette || baseC < 0.01;

			// Calculate the index of the key color in the 13-step array
			// standardSteps: [50, 100, 200, ..., 1200]
			// Array order: [1200, 1100, ..., 50] (reversed for display)
			const keyStepIndex = standardSteps.indexOf(keyStep);
			const keyArrayIndex = 12 - keyStepIndex; // Reverse index (0 = darkest, 12 = lightest)

			// Generate lightness scale centered on the key color's lightness
			// The key color should be at keyArrayIndex with lightness baseL
			// Distribute other steps evenly, maintaining perceptual uniformity
			const lightnessScale: number[] = [];
			const totalSteps = 13;

			// Get contrast intensity and lightness distribution from state
			const contrastRange = contrastRanges[state.contrastIntensity];
			const easingFunction = easingFunctions[state.lightnessDistribution];

			// Calculate lightness range based on contrast intensity
			// Adjust minL based on hue for natural-looking darks
			const hue = keyColor.oklch.h ?? 0;
			let minL = contrastRange.min;

			// Lime (100-130): Adjust minimum lightness to avoid muddy black
			if (hue >= 100 && hue < 130) {
				minL = Math.max(minL, 0.27);
			}

			const maxL = contrastRange.max;
			const lightnessRange = maxL - minL;

			// Calculate step size based on key color position with easing
			// Apply easing function to distribute steps according to selected distribution
			for (let i = 0; i < totalSteps; i++) {
				if (i === keyArrayIndex) {
					lightnessScale.push(baseL); // Use exact key color lightness
				} else {
					// Apply easing function to progress
					const rawProgress = i / (totalSteps - 1); // 0 to 1
					const easedProgress = easingFunction(rawProgress);
					const targetL = minL + lightnessRange * easedProgress;

					// Adjust to anchor at key color position
					const keyProgress = keyArrayIndex / (totalSteps - 1);
					const easedKeyProgress = easingFunction(keyProgress);
					const offset = baseL - (minL + lightnessRange * easedKeyProgress);

					// For the lightest color (index 12), allow higher lightness for differentiation
					const effectiveMaxL =
						i === totalSteps - 1 ? Math.min(maxL + 0.03, 0.98) : maxL;
					const adjustedL = Math.max(
						minL,
						Math.min(effectiveMaxL, targetL + offset),
					);

					lightnessScale.push(adjustedL);
				}
			}

			// Generate absolute chroma values based on lightness
			// NOT relative to key color's chroma (which may be very low or very high)
			// Instead, use perceptually optimal chroma for each lightness level
			const chromaValues: number[] = [];

			// Reference: Maximum safe chroma for each lightness in OKLCH->sRGB
			// These values ensure hue preservation while maintaining vibrancy
			for (let i = 0; i < totalSteps; i++) {
				const l = lightnessScale[i]!;

				// If key color is achromatic (gray), keep entire palette achromatic
				if (isAchromatic) {
					chromaValues.push(0);
					continue;
				}

				// Absolute chroma values - aim high, let clampChroma() find maximum
				// Strategy: Request high chroma, clampChroma() will find the actual maximum
				// for this specific lightness and hue in sRGB gamut
				let absoluteChroma: number;

				// Special handling for magenta/pink hues (280-350°)
				// These hues require higher chroma to maintain vibrancy across lightness range
				const isMagentaPink = baseH >= 280 && baseH <= 350;

				if (isMagentaPink) {
					// Magenta/pink: use higher chroma values for better vibrancy
					if (l < 0.15) {
						absoluteChroma = 0.2;
					} else if (l < 0.25) {
						absoluteChroma = 0.28;
					} else if (l < 0.4) {
						absoluteChroma = 0.35; // Higher for dark magenta
					} else if (l < 0.55) {
						absoluteChroma = 0.37; // Peak chroma for mid-range
					} else if (l < 0.7) {
						absoluteChroma = 0.35; // Maintain high chroma
					} else if (l < 0.85) {
						absoluteChroma = 0.28; // Gradual decrease
					} else if (l < 0.93) {
						absoluteChroma = 0.2;
					} else {
						absoluteChroma = 0.15;
					}
				} else {
					// Default handling for other hues
					if (l < 0.15) {
						absoluteChroma = 0.15; // Let clampChroma() find max for dark colors
					} else if (l < 0.25) {
						absoluteChroma = 0.2;
					} else if (l < 0.4) {
						absoluteChroma = 0.25;
					} else if (l < 0.55) {
						absoluteChroma = 0.3; // Request peak vibrancy
					} else if (l < 0.7) {
						absoluteChroma = 0.25;
					} else if (l < 0.85) {
						absoluteChroma = 0.2;
					} else if (l < 0.93) {
						absoluteChroma = 0.15;
					} else {
						absoluteChroma = 0.1; // Even light colors can be vibrant
					}
				}

				chromaValues.push(absoluteChroma);
			}

			// Override key color position with its actual chroma
			chromaValues[keyArrayIndex] = baseC;

			colors = lightnessScale.map((l, i) => {
				const targetC = chromaValues[i]!;
				const generatedColor = new Color({
					mode: "oklch",
					l: l,
					c: targetC,
					h: baseH, // Preserve hue completely
				});

				return generatedColor;
			});

			// Override the key color position with the exact original color
			// IMPORTANT: Use original hex value to preserve user's exact input
			// Skip clampChroma to preserve the exact color specified by the user
			if (
				keyArrayIndex >= 0 &&
				keyArrayIndex < colors.length &&
				originalHexValues[0]
			) {
				// Create Color object with skipClamp option to preserve exact input
				const exactColor = new Color(originalHexValues[0], { skipClamp: true });
				colors[keyArrayIndex] = exactColor;
			}
		} else {
			// Use interpolation for auto-positioned colors
			const theme = new Theme(keyColors, bg, finalRatios);
			colors = theme.colors;
		}

		// Render Swatches
		app.innerHTML = "";
		colors.forEach((color, index) => {
			const hex = color.toHex();
			const wcag = verifyContrast(color, bg);
			const apcaLc = getAPCA(color, bg);
			const apcaStatus = getAPCAStatus(apcaLc);
			const tokenName = getTokenName(p.name, index, colors.length);

			// Check if this color corresponds to a key color
			// Method 1: Check by explicit step (if specified)
			// Method 2: Check by ratio match (if no step specified)
			let isKeyColor = false;

			keyColorsWithSteps.forEach((keyColorSpec, idx) => {
				if (idx >= originalKeyColors.length) return;

				if (keyColorSpec.step !== undefined) {
					// Explicit step: match by token name
					const expectedName = `${p.name.toLowerCase()}-${keyColorSpec.step}`;
					if (tokenName === expectedName) {
						isKeyColor = true;
					}
				} else {
					// Auto mode: match by ratio
					const keyColor = originalKeyColors[idx];
					if (keyColor) {
						const keyRatio = keyColor.contrast(bg);
						if (Math.abs(keyRatio - wcag.contrast) < 0.01) {
							isKeyColor = true;
						}
					}
				}
			});

			const keyIndicator = isKeyColor
				? '<span style="background:#ffd700; color:black; padding:2px 4px; border-radius:4px; font-size:0.7rem; margin-left:8px;">KEY</span>'
				: "";

			const el = document.createElement("div");
			el.className = "swatch";
			el.style.backgroundColor = hex;

			const white = new Color("#ffffff");
			const textCol = color.contrast(white) > 4.5 ? "#ffffff" : "#000000";
			el.style.color = textCol;

			el.innerHTML = `
        <div class="swatch-info">
          <div style="font-weight:bold;">${tokenName} ${keyIndicator}</div>
          <div style="font-size:0.8rem; opacity:0.8;">${hex}</div>
        </div>
        <div style="text-align:right; font-size: 0.8rem;">
          <div class="contrast-badge" style="margin-bottom:4px;">
            WCAG: <strong>${wcag.contrast.toFixed(2)}</strong>
          </div>
          <div class="contrast-badge">
            APCA: <strong>${apcaLc.toFixed(0)}</strong>
          </div>
        </div>
      `;
			el.title = `APCA Status: ${getAPCALabel(apcaStatus)}`; // Show status on hover to save space
			app.appendChild(el);
		});
	};

	const saveChanges = () => {
		const p = getActivePalette();
		if (!p) return;

		// Get hex color from input field
		const hexColor = keyColorsInput.value.trim().split("@")[0]?.trim() ?? "";

		// Get currently selected step from slider
		const sliderIndex = Number.parseInt(stepSlider.value, 10);
		const selectedStep = getStepFromSliderIndex(sliderIndex);

		// Save with @step if step is selected, otherwise just the color
		if (hexColor && selectedStep) {
			p.keyColors = [`${hexColor}@${selectedStep}`];
		} else if (hexColor) {
			p.keyColors = [hexColor];
		}

		renderMain();
	};

	// Event Listeners
	keyColorsInput.onchange = saveChanges;

	document.getElementById("add-palette")!.onclick = () => {
		const name = prompt("Palette Name?");
		if (name) {
			const id = name.toLowerCase().replace(/\s+/g, "-");
			state.palettes.push({
				id,
				name,
				keyColors: ["#000", "#fff"],
				ratios: [21, 15, 10, 7, 4.5, 3, 1],
			});
			state.activeId = id;
			renderSidebar();
			updateEditor();
			renderMain();
		}
	};

	document.getElementById("export-css")!.onclick = () => {
		let css = ":root {\n";
		state.palettes.forEach((p) => {
			const theme = new Theme(
				p.keyColors.map((s) => new Color(s)),
				BackgroundColor.White,
				p.ratios,
			);
			theme.colors.forEach((c, i) => {
				css += `  --color-${getTokenName(p.name, i, theme.colors.length)}: ${c.toHex()};\n`;
			});
			css += "\n";
		});
		css += "}";

		const dialog = document.getElementById(
			"export-dialog",
		) as HTMLDialogElement;
		const area = document.getElementById("export-area") as HTMLTextAreaElement;
		area.value = css;
		dialog.showModal();
	};

	document.getElementById("export-json")!.onclick = () => {
		const json: any = {};
		state.palettes.forEach((p) => {
			const theme = new Theme(
				p.keyColors.map((s) => new Color(s)),
				BackgroundColor.White,
				p.ratios,
			);
			const colors: any = {};
			theme.colors.forEach((c, i) => {
				colors[(i + 1) * 100] = c.toHex();
			});
			json[p.id] = colors;
		});

		const dialog = document.getElementById(
			"export-dialog",
		) as HTMLDialogElement;
		const area = document.getElementById("export-area") as HTMLTextAreaElement;
		area.value = JSON.stringify(json, null, 2);
		dialog.showModal();
	};

	// Helper: Analyze color lightness and recommend optimal step
	const recommendStep = (hexColor: string): number | null => {
		try {
			const color = new Color(hexColor);
			const lightness = color.oklch.l;

			const hue = color.oklch.h ?? 0;

			// Recommend step based on lightness and hue
			// Lime (100-130°) needs special handling
			if (hue >= 100 && hue < 130) {
				// #9DDD15 (L=0.823) should be 400
				// #7EB40D (L=0.706) should be 700
				if (lightness > 0.88) {
					return 200;
				} else if (lightness > 0.8) {
					return 300;
				} else if (lightness > 0.76) {
					return 400;
				} else if (lightness > 0.72) {
					return 500;
				} else if (lightness > 0.62) {
					return 600;
				} else if (lightness > 0.48) {
					return 700;
				} else {
					return 900;
				}
			}

			// Default thresholds for other colors
			if (lightness > 0.85) {
				return 200;
			} else if (lightness > 0.7) {
				return 400;
			} else if (lightness > 0.5) {
				return 600;
			} else if (lightness > 0.3) {
				return 800;
			} else if (lightness > 0.15) {
				return 1000;
			} else if (lightness > 0.05) {
				return 1100;
			} else {
				return 1200; // Very dark/black colors
			}
		} catch (e) {
			return null;
		}
	};

	// UI: Step selection with range slider
	const stepSlider = document.getElementById("stepSlider") as HTMLInputElement;
	const stepHint = document.getElementById("stepHint") as HTMLElement;
	const stepValues = [
		50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
	];

	// Helper: Get step value from slider index
	const getStepFromSliderIndex = (index: number): number => {
		return stepValues[index] ?? 600;
	};

	// Helper: Get slider index from step value
	const getSliderIndexFromStep = (step: number): number => {
		const index = stepValues.indexOf(step);
		return index !== -1 ? index : 6; // Default to 600 (index 6)
	};

	// Debounce timer for color code input
	let colorInputDebounceTimer: number | null = null;

	// Update palette when color code changes (debounced + Enter key)
	const applyColorChange = (hexColor: string) => {
		const recommended = recommendStep(hexColor);
		if (recommended !== null) {
			// Auto-select recommended step
			const sliderIndex = getSliderIndexFromStep(recommended);
			stepSlider.value = String(sliderIndex);

			// Update hint message
			stepHint.innerHTML = `<strong>${hexColor}</strong>の明度から<strong>${recommended}</strong>を最適なスケール配置としました`;

			// Automatically generate palette with recommended step
			const p = getActivePalette();
			if (p) {
				p.keyColors = [`${hexColor}@${recommended}`];
				renderMain();
			}
		}
	};

	// Color code input with debounce (300ms)
	keyColorsInput.addEventListener("input", () => {
		const value = keyColorsInput.value.trim();
		if (!value) {
			stepHint.textContent =
				"このカラーをスケール内のどの位置に配置するか選択してください";
			return;
		}

		// Parse color (ignore @step if present)
		const hexColor = value.split("@")[0]?.trim() ?? "";
		if (!hexColor) return;

		// Only apply if valid hex color (#RRGGBB)
		if (/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
			if (colorInputDebounceTimer) clearTimeout(colorInputDebounceTimer);
			colorInputDebounceTimer = window.setTimeout(() => {
				applyColorChange(hexColor);
			}, 300);
		}
	});

	// Enter key to immediately apply color code
	keyColorsInput.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			const value = keyColorsInput.value.trim();
			const hexColor = value.split("@")[0]?.trim() ?? "";

			if (/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
				if (colorInputDebounceTimer) clearTimeout(colorInputDebounceTimer);
				applyColorChange(hexColor);
			}
		}
	});

	// Update palette when slider changes (real-time)
	stepSlider.addEventListener("input", () => {
		// Cancel debounce timer to prevent overwriting manual changes
		if (colorInputDebounceTimer) {
			clearTimeout(colorInputDebounceTimer);
			colorInputDebounceTimer = null;
		}

		const hexColor = keyColorsInput.value.trim().split("@")[0]?.trim() ?? "";
		const sliderIndex = Number.parseInt(stepSlider.value, 10);
		const selectedStep = getStepFromSliderIndex(sliderIndex);

		if (hexColor && /^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
			const p = getActivePalette();
			if (p) {
				p.keyColors = [`${hexColor}@${selectedStep}`];
				stepHint.innerHTML = `<strong>${hexColor}</strong>をスケール位置<strong>${selectedStep}</strong>に配置しました`;
				renderMain();
			}
		}
	});

	// Button group helper: Update active state
	const updateButtonGroupState = (
		container: HTMLElement,
		activeValue: string,
	) => {
		const buttons = container.querySelectorAll("button");
		buttons.forEach((btn) => {
			const value = btn.getAttribute("data-value");
			if (value === activeValue) {
				btn.style.border = "2px solid #0052cc";
				btn.style.background = "#e3f2fd";
				btn.style.fontWeight = "bold";
				btn.classList.add("active");
			} else {
				btn.style.border = "1px solid #ccc";
				btn.style.background = "white";
				btn.style.fontWeight = "normal";
				btn.classList.remove("active");
			}
		});
	};

	// Contrast intensity button group
	const contrastIntensityButtons = document.getElementById(
		"contrastIntensityButtons",
	);
	if (contrastIntensityButtons) {
		contrastIntensityButtons.addEventListener("click", (e) => {
			const target = e.target as HTMLElement;
			if (target.tagName === "BUTTON") {
				const value = target.getAttribute("data-value") as ContrastIntensity;
				if (value) {
					state.contrastIntensity = value;
					updateButtonGroupState(contrastIntensityButtons, value);
					renderMain();
				}
			}
		});
	}

	// Lightness distribution button group
	const lightnessDistributionButtons = document.getElementById(
		"lightnessDistributionButtons",
	);
	if (lightnessDistributionButtons) {
		lightnessDistributionButtons.addEventListener("click", (e) => {
			const target = e.target as HTMLElement;
			if (target.tagName === "BUTTON") {
				const value = target.getAttribute(
					"data-value",
				) as LightnessDistribution;
				if (value) {
					state.lightnessDistribution = value;
					updateButtonGroupState(lightnessDistributionButtons, value);
					renderMain();
				}
			}
		});
	}

	// Init
	renderSidebar();
	updateEditor();
	renderMain();

	// Trigger initial recommendation if there's a default value
	if (keyColorsInput.value) {
		keyColorsInput.dispatchEvent(new Event("input"));
	}
};

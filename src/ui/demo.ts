import { getAPCA } from "../accessibility/apca";
import { verifyContrast } from "../accessibility/wcag2";
import { BackgroundColor } from "../core/background";
import { Color } from "../core/color";
import { Theme } from "../core/theme";

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
	// Standard Scale: 50, 100, 200 ... 1200 (13 steps)
	// Light (50) -> Dark (1200)
	const standardSteps = [
		50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
	];

	const getTokenName = (name: string, index: number, total: number) => {
		// If we have exactly 13 items, map directly.
		if (total === standardSteps.length) {
			return `${name.toLowerCase()}-${standardSteps[index]}`;
		}

		// If mismatch (e.g. duplicates removed), try to map proportionally or just use standard steps if within range.
		// We align with the visual order (Light -> Dark) which matches standardSteps (50 -> 1200).
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
		// Standard 13-step scale (50-1200)
		// Uses the shared standardSteps definition
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

		// Render Swatches - Horizontal Layout
		// Reverse colors to go from Light (50) to Dark (1200)
		colors.reverse();

		// Render Swatches - Horizontal Layout
		app.innerHTML = "";

		// Container for horizontal palette
		const paletteContainer = document.createElement("div");
		paletteContainer.style.cssText = `
			display: flex;
			flex-direction: column;
			gap: 1rem;
			margin-top: 2rem;
			padding-bottom: 2rem;
			width: 100%;
			overflow-x: hidden; /* Prevent scroll */
		`;

		// Swatches row
		const swatchesRow = document.createElement("div");
		swatchesRow.style.cssText = `
			display: flex;
			justify-content: space-between;
			gap: 8px;
			padding: 16px; /* Space for shadows */
			width: 100%;
			box-sizing: border-box;
		`;

		colors.forEach((color, index) => {
			const hex = color.toHex();
			// Contrast Checks
			// We want to check legibility of White/Black text ON this color (Background)
			const white = new Color("#ffffff");
			const black = new Color("#000000");

			// WCAG: Contrast(Text, Bg) - Symmetric
			const wcagWhite = verifyContrast(white, color);
			const wcagBlack = verifyContrast(black, color);

			// APCA: getAPCA(Text, Bg) - Asymmetric
			const apcaWhite = getAPCA(white, color);
			const apcaBlack = getAPCA(black, color);

			const tokenName = getTokenName(p.name, index, colors.length);

			// Extract step number from token name (e.g., "color-600" -> "600")
			const stepMatch = tokenName.match(/(\d+)$/);
			const stepNumber = stepMatch ? (stepMatch[1] ?? "") : "";

			// Check if this color corresponds to a key color
			let isKeyColor = false;

			keyColorsWithSteps.forEach((keyColorSpec, idx) => {
				if (idx >= originalKeyColors.length) return;

				if (keyColorSpec.step !== undefined) {
					const expectedName = `${p.name.toLowerCase()}-${keyColorSpec.step}`;
					if (tokenName === expectedName) {
						isKeyColor = true;
					}
				} else {
					const keyColor = originalKeyColors[idx];
					if (keyColor) {
						const keyRatio = keyColor.contrast(bg);
						if (Math.abs(keyRatio - wcagWhite.contrast) < 0.01) {
							isKeyColor = true;
						}
					}
				}
			});

			// Create swatch element
			const swatchWrapper = document.createElement("div");
			swatchWrapper.style.cssText = `
				position: relative;
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 8px;
				flex: 1;
				min-width: 0;
			`;

			const swatch = document.createElement("div");
			swatch.className = "color-swatch";
			swatch.style.cssText = `
				width: 100%;
				height: auto;
				aspect-ratio: 1 / 1;
				background-color: ${hex};
				border-radius: ${isKeyColor ? "50%" : "12px"};
				display: flex;
				align-items: center;
				justify-content: center;
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
				cursor: pointer;
				transition: transform 0.15s ease, box-shadow 0.15s ease;
				position: relative;
				z-index: 1;
			`;

			// Add hover effect
			swatch.onmouseenter = () => {
				if (swatch.dataset.selected === "true") return;
				swatch.style.transform = "scale(1.05) translateY(-2px)";
				swatch.style.boxShadow = "0 8px 16px rgba(0,0,0,0.15)";
				swatch.style.zIndex = "10";
			};

			swatch.onmouseleave = () => {
				if (swatch.dataset.selected === "true") return;
				swatch.style.transform = "scale(1)";
				swatch.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
				swatch.style.zIndex = "1";
			};

			// Contrast Checks for Indicators
			const isWhitePass = wcagWhite.contrast >= 4.5;
			const isBlackPass = wcagBlack.contrast >= 4.5;

			// Container for indicators
			const indicators = document.createElement("div");
			indicators.style.cssText = `
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				display: flex;
				gap: 8px;
				pointer-events: none;
				align-items: center;
				justify-content: center;
			`;

			// White Indicator
			if (isWhitePass) {
				const icon = document.createElement("div");
				icon.style.cssText = `
					display: flex;
					align-items: center;
					justify-content: center;
				`;
				icon.innerHTML = `
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
				`;
				indicators.appendChild(icon);
			}

			// Black Indicator
			if (isBlackPass) {
				const icon = document.createElement("div");
				icon.style.cssText = `
					display: flex;
					align-items: center;
					justify-content: center;
				`;
				icon.innerHTML = `
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
				`;
				indicators.appendChild(icon);
			}

			swatch.appendChild(indicators);

			// Add Key Color Indicator (Outer Ring)
			if (isKeyColor) {
				const ring = document.createElement("div");
				ring.style.cssText = `
					position: absolute;
					top: -6px;
					left: -6px;
					right: -6px;
					bottom: -6px;
					border: 3px solid #0052cc;
					border-radius: 50%;
					pointer-events: none;
					z-index: 10;
				`;
				swatch.appendChild(ring);
				// Also make the swatch circular
				swatch.style.borderRadius = "50%";
			}
			swatchWrapper.appendChild(swatch);

			// Add click handler for Detail View
			swatchWrapper.onclick = () => {
				renderDetailPanel(
					stepNumber,
					hex,
					wcagWhite,
					wcagBlack,
					apcaWhite,
					apcaBlack,
				);

				// Update selection visual
				document.querySelectorAll(".color-swatch").forEach((s) => {
					const el = s as HTMLElement;
					el.dataset.selected = "false";
					el.style.transform = "scale(1)";
					el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"; // Reset to default
					el.style.zIndex = "1";
				});

				// Apply new selection style to the clicked swatch
				swatch.dataset.selected = "true";
				swatch.style.transform = "scale(1.1)";
				swatch.style.boxShadow = "0 0 0 4px #fff, 0 0 0 7px #0052cc";
				swatch.style.zIndex = "10";
			};

			swatchWrapper.classList.add("swatch-wrapper");
			swatchWrapper.style.cursor = "pointer";

			// Auto-select key color or middle color on initial render
			if (isKeyColor) {
				setTimeout(() => swatchWrapper.click(), 0);
			}

			swatchesRow.appendChild(swatchWrapper);

			// Info below swatch (Compact)
			const info = document.createElement("div");
			info.style.cssText = `
				text-align: center;
				display: flex;
				flex-direction: column;
				gap: 2px;
				margin-top: 12px;
				width: 100%;
			`;

			const stepLabel = document.createElement("div");
			stepLabel.style.cssText = `
				font-size: 1rem;
				font-weight: ${isKeyColor ? "bold" : "500"};
				color: #333;
			`;
			stepLabel.textContent = stepNumber;

			const hexLabel = document.createElement("div");
			hexLabel.style.cssText = `
				font-size: 0.8rem;
				color: #666;
				font-family: monospace;
			`;
			hexLabel.textContent = hex;

			info.appendChild(stepLabel);
			info.appendChild(hexLabel);

			swatchWrapper.appendChild(info);
		});

		paletteContainer.appendChild(swatchesRow);
		app.appendChild(paletteContainer);
	};

	// Render Detail Panel Function
	const renderDetailPanel = (
		step: string,
		hex: string,
		wcagWhite: any,
		wcagBlack: any,
		apcaWhite: number,
		apcaBlack: number,
	) => {
		const panel = document.getElementById("detail-panel");
		if (!panel) return;

		const isWhitePass = wcagWhite.contrast >= 4.5;
		const isBlackPass = wcagBlack.contrast >= 4.5;

		panel.innerHTML = "";
		panel.style.display = "block";

		// Container
		const container = document.createElement("div");
		container.style.cssText = `
			display: flex;
			flex-direction: column;
			gap: 2rem;
			height: 100%;
		`;

		// Header: Large Swatch + Title
		const header = document.createElement("div");
		header.style.cssText = `
			display: flex;
			align-items: center;
			gap: 2rem;
		`;

		const largeSwatch = document.createElement("div");
		largeSwatch.style.cssText = `
			width: 120px;
			height: 120px;
			background-color: ${hex};
			border-radius: 16px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.1);
			flex-shrink: 0;
		`;

		const titleArea = document.createElement("div");
		titleArea.innerHTML = `
			<div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem;">${step}</div>
			<div style="font-size: 1.2rem; font-family: monospace; color: #666;">${hex}</div>
		`;

		header.appendChild(largeSwatch);
		header.appendChild(titleArea);
		container.appendChild(header);

		// Dashboard Grid
		const grid = document.createElement("div");
		grid.style.cssText = `
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 1.5rem;
		`;

		// Helper for Cards
		const createCard = (
			title: string,
			textColor: string,
			wcag: number,
			apca: number,
			isPass: boolean,
		) => {
			const card = document.createElement("div");
			card.style.cssText = `
				background: ${isPass ? "white" : "#f5f5f5"};
				border-radius: 12px;
				padding: 1.5rem;
				box-shadow: 0 2px 8px rgba(0,0,0,0.05);
				border: 1px solid ${isPass ? "#eee" : "#ddd"};
			`;

			const passBadge = isPass
				? '<span style="background: #e6f4ea; color: #137333; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">合格 (AA)</span>'
				: '<span style="background: #fce8e6; color: #c5221f; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">不合格</span>';

			card.innerHTML = `
				<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
					<div style="display: flex; align-items: center; gap: 0.5rem;">
						<div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${textColor}; border: 1px solid #ddd;"></div>
						<div style="font-weight: bold; color: #333;">${title}</div>
					</div>
					${passBadge}
				</div>

				<div style="margin-bottom: 1.5rem;">
					<div style="font-size: 0.8rem; color: #666; margin-bottom: 0.25rem;">WCAG コントラスト</div>
					<div style="font-size: 2.5rem; font-weight: bold; color: #333;">${wcag.toFixed(2)}</div>
				</div>

				<div style="margin-bottom: 1.5rem;">
					<div style="font-size: 0.8rem; color: #666; margin-bottom: 0.25rem;">APCA (Lc)</div>
					<div style="font-size: 1.5rem; font-weight: bold; color: #333;">${Math.round(Math.abs(apca))}</div>
				</div>

				<div style="
					background-color: ${hex};
					color: ${textColor};
					padding: 1rem;
					border-radius: 8px;
					font-size: 0.9rem;
					line-height: 1.5;
					text-align: center;
				">
					視認性の確認用テキストです。読みやすさを確認してください。
				</div>
			`;

			return card;
		};

		grid.appendChild(
			createCard(
				"白に対するコントラスト",
				"#ffffff",
				wcagWhite.contrast,
				apcaWhite,
				isWhitePass,
			),
		);
		grid.appendChild(
			createCard(
				"黒に対するコントラスト",
				"#000000",
				wcagBlack.contrast,
				apcaBlack,
				isBlackPass,
			),
		);

		container.appendChild(grid);
		panel.appendChild(container);
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
			p.keyColors = [`${hexColor} @${selectedStep} `];
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
				p.keyColors.map((s) => new Color((s.split("@")[0] ?? "").trim())),
				BackgroundColor.White,
				p.ratios,
			);
			theme.colors.forEach((c, i) => {
				css += `  --color - ${getTokenName(p.name, i, theme.colors.length)}: ${c.toHex()}; \n`;
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
				p.keyColors.map((s) => new Color((s.split("@")[0] ?? "").trim())),
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
				p.keyColors = [`${hexColor} @${recommended} `];
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
			const colorOnly = value.split("@")[0]?.trim() ?? "";

			if (/^#[0-9A-Fa-f]{6}$/.test(colorOnly)) {
				if (colorInputDebounceTimer) clearTimeout(colorInputDebounceTimer);
				applyColorChange(colorOnly);
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
				p.keyColors = [`${hexColor} @${selectedStep} `];
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

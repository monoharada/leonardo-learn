import { Color } from '../core/color';
import { BackgroundColor } from '../core/background';
import { Theme } from '../core/theme';
import { verifyContrast } from '../accessibility/wcag2';
import { getAPCA, getAPCAStatus } from '../accessibility/apca';
import { getAPCALabel } from './i18n';

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
// ... (rest of file)



// Default State
const state = {
  palettes: [
    {
      id: 'primary',
      name: 'Primary',
      keyColors: ['#b3e5fc'], // Light blue (step will be selected via UI)
      ratios: [21, 15, 10, 7, 4.5, 3, 1]
    },
    {
      id: 'neutral',
      name: 'Neutral',
      keyColors: ['#1a1a1a'],
      ratios: [21, 15, 10, 7, 4.5, 3, 1]
    },
    {
      id: 'error',
      name: 'Error',
      keyColors: ['#c00'],
      ratios: [21, 15, 10, 7, 4.5, 3, 1]
    }
  ] as PaletteConfig[],
  activeId: 'primary'
};

export const runDemo = () => {
  const app = document.getElementById('app');
  const paletteListEl = document.getElementById('palette-list');
  const keyColorsInput = document.getElementById('keyColors') as HTMLInputElement;
  const currentNameEl = document.getElementById('current-palette-name');

  if (!app || !paletteListEl) return;

  // Helper: Get Active Palette
  const getActivePalette = () => {
    const found = state.palettes.find(p => p.id === state.activeId);
    return found || state.palettes[0];
  };

  // Helper: Generate Token Name (e.g., primary-900)
  // Standard Scale: 50, 100, 200 ... 1200 (13 steps)
  // If we have extra steps (due to key color injection), we need to handle that.
  // For now, let's just map linearly or use closest standard step.
  // Simple approach: Map index to standard steps if length matches, else fallback.
  const standardSteps = [1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50];

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
    paletteListEl.innerHTML = '';
    state.palettes.forEach(p => {
      const btn = document.createElement('div');
      btn.textContent = p.name;
      btn.style.padding = '0.5rem 1rem';
      btn.style.cursor = 'pointer';
      btn.style.borderRadius = '4px';
      btn.style.marginBottom = '4px';

      if (p.id === state.activeId) {
        btn.style.background = '#e3f2fd';
        btn.style.color = '#0052cc';
        btn.style.fontWeight = 'bold';
      } else {
        btn.style.background = 'transparent';
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
    keyColorsInput.value = p.keyColors.map(kc => kc.split('@')[0]?.trim() ?? kc).join(', ');
  };

  // Helper: Parse key color with optional step specification
  const parseKeyColor = (input: string): KeyColorWithStep => {
    const trimmed = input.trim();
    const parts = trimmed.split('@');
    const color = parts[0]?.trim() ?? trimmed;

    // Parse step if present (e.g., "#008BF2@600")
    let step: number | undefined = undefined;
    if (parts.length > 1) {
      const stepStr = parts[1]?.trim();
      const parsedStep = parseInt(stepStr ?? '', 10);
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
    const standardSteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];
    const standardRatios = [
      1.05, // 50
      1.1,  // 100
      1.2,  // 200
      1.35, // 300
      1.7,  // 400
      2.5,  // 500
      3.5,  // 600
      4.5,  // 700 (AA)
      6.0,  // 800
      8.5,  // 900
      11.0, // 1000
      14.0, // 1100
      17.0  // 1200
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
      keyColors = keyColorsWithSteps.map(kc => new Color(kc.color, { skipClamp: true }));
    } catch (e) { return; }

    const bg = BackgroundColor.White;

    // Store original key colors for badge logic and ratio injection
    const originalKeyColors = [...keyColors];

    // Store original hex values (before clampChroma) for exact override
    const originalHexValues = keyColorsWithSteps.map(kc => kc.color);

    // Check if any key color has an explicit step
    const hasExplicitStep = keyColorsWithSteps.some(kc => kc.step !== undefined);

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
      const contrasts = keyColors.map(k => k.contrast(bg));
      const maxContrast = Math.max(...contrasts);
      const minContrast = Math.min(...contrasts);

      // 3. Inject Dark Anchor if max contrast is too low (e.g. < 4.5)
      // Meaning we only have light colors
      if (maxContrast < 4.5) {
        // Create a dark version of the primary key
        // OKLCH Strategy: Preserve chroma (vividness) while adjusting hue to avoid greenish tint
        let adjustedHue = primaryKey.oklch.h ?? 0;
        let chromaMultiplier = 0.8; // Keep high chroma for vivid dark colors
        let lightnessTarget = 0.25; // Reasonably dark but not too dark

        if (adjustedHue >= 180 && adjustedHue <= 270) {
          // For cyan/blue hues, shift towards purple (260-280°) to avoid green
          // Target the "deep blue-purple" range which stays vivid when dark
          const targetHue = 265; // Deep purple-blue (vivid when dark, no green tint)
          const currentDistance = Math.abs(adjustedHue - targetHue);

          // Shift towards target hue, but preserve some of the original character
          if (adjustedHue < targetHue) {
            adjustedHue = adjustedHue + (currentDistance * 0.6); // 60% shift towards target
          } else {
            adjustedHue = adjustedHue - (currentDistance * 0.4); // 40% shift towards target
          }

          // Keep chroma high for vivid colors
          chromaMultiplier = 0.7;
        }

        const darkAnchor = new Color({
          mode: 'oklch',
          l: lightnessTarget,
          c: primaryKey.oklch.c * chromaMultiplier, // Preserve chroma for vividness
          h: adjustedHue
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
          mode: 'oklch',
          l: 0.98, // Very light
          c: primaryKey.oklch.c * 0.2, // Very low chroma
          h: primaryKey.oklch.h
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
        mode: 'oklch',
        l: 0.25, // Mid-dark
        c: baseChroma * 0.95,
        h: baseHue
      });

      const darkAnchor2 = new Color({
        mode: 'oklch',
        l: 0.15, // Very dark
        c: baseChroma * 0.85,
        h: baseHue
      });

      keyColors.push(darkAnchor1, darkAnchor2);

      // Add multiple light anchors for richer light scale
      const lightAnchor1 = new Color({
        mode: 'oklch',
        l: 0.85, // Mid-light
        c: baseChroma * 0.6,
        h: baseHue
      });

      const lightAnchor2 = new Color({
        mode: 'oklch',
        l: 0.95, // Very light
        c: baseChroma * 0.3,
        h: baseHue
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

      // Calculate lightness range - avoid extremes where chroma is impossible
      // sRGB gamut is very limited at L<0.20 and L>0.95
      const minL = 0.20; // Darkest useful color (was 0.10)
      const maxL = 0.95; // Lightest useful color (was 0.98)
      const lightnessRange = maxL - minL;

      // Calculate step size based on key color position
      // If key is at index 6 (middle), distribute evenly
      // If key is at index 10 (lighter), compress dark side, expand light side
      for (let i = 0; i < totalSteps; i++) {
        if (i === keyArrayIndex) {
          lightnessScale.push(baseL); // Use exact key color lightness
        } else {
          // Linear interpolation based on distance from key
          const progress = i / (totalSteps - 1); // 0 to 1
          const targetL = minL + lightnessRange * progress;

          // Adjust to anchor at key color position
          const keyProgress = keyArrayIndex / (totalSteps - 1);
          const offset = baseL - (minL + lightnessRange * keyProgress);

          // For the lightest color (index 12), allow higher lightness for differentiation
          const effectiveMaxL = (i === totalSteps - 1) ? 0.98 : maxL;
          const adjustedL = Math.max(minL, Math.min(effectiveMaxL, targetL + offset));

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

        // Absolute chroma values - aim high, let clampChroma() find maximum
        // Strategy: Request high chroma, clampChroma() will find the actual maximum
        // for this specific lightness and hue in sRGB gamut
        let absoluteChroma: number;
        if (l < 0.15) {
          absoluteChroma = 0.15; // Let clampChroma() find max for dark colors
        } else if (l < 0.25) {
          absoluteChroma = 0.20;
        } else if (l < 0.40) {
          absoluteChroma = 0.25;
        } else if (l < 0.55) {
          absoluteChroma = 0.30; // Request peak vibrancy
        } else if (l < 0.70) {
          absoluteChroma = 0.25;
        } else if (l < 0.85) {
          absoluteChroma = 0.20;
        } else if (l < 0.93) {
          absoluteChroma = 0.15;
        } else {
          absoluteChroma = 0.10; // Even light colors can be vibrant
        }

        chromaValues.push(absoluteChroma);
      }

      // Override key color position with its actual chroma
      chromaValues[keyArrayIndex] = baseC;

      colors = lightnessScale.map((l, i) => {
        const targetC = chromaValues[i]!;
        const generatedColor = new Color({
          mode: 'oklch',
          l: l,
          c: targetC,
          h: baseH // Preserve hue completely
        });

        return generatedColor;
      });

      // Override the key color position with the exact original color
      // IMPORTANT: Use original hex value to preserve user's exact input
      // Skip clampChroma to preserve the exact color specified by the user
      if (keyArrayIndex >= 0 && keyArrayIndex < colors.length && originalHexValues[0]) {
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
    app.innerHTML = '';
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

      const keyIndicator = isKeyColor ? '<span style="background:#ffd700; color:black; padding:2px 4px; border-radius:4px; font-size:0.7rem; margin-left:8px;">KEY</span>' : '';

      const el = document.createElement('div');
      el.className = 'swatch';
      el.style.backgroundColor = hex;

      const white = new Color('#ffffff');
      const textCol = color.contrast(white) > 4.5 ? '#ffffff' : '#000000';
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
    const hexColor = keyColorsInput.value.trim().split('@')[0]?.trim() ?? '';

    // Get currently selected step from dropdown
    const selectedStep = stepSelect.value;

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

  document.getElementById('add-palette')!.onclick = () => {
    const name = prompt('Palette Name?');
    if (name) {
      const id = name.toLowerCase().replace(/\s+/g, '-');
      state.palettes.push({
        id,
        name,
        keyColors: ['#000', '#fff'],
        ratios: [21, 15, 10, 7, 4.5, 3, 1]
      });
      state.activeId = id;
      renderSidebar();
      updateEditor();
      renderMain();
    }
  };

  document.getElementById('export-css')!.onclick = () => {
    let css = ':root {\n';
    state.palettes.forEach(p => {
      const theme = new Theme(
        p.keyColors.map(s => new Color(s)),
        BackgroundColor.White,
        p.ratios
      );
      theme.colors.forEach((c, i) => {
        css += `  --color-${getTokenName(p.name, i, theme.colors.length)}: ${c.toHex()};\n`;
      });
      css += '\n';
    });
    css += '}';

    const dialog = document.getElementById('export-dialog') as HTMLDialogElement;
    const area = document.getElementById('export-area') as HTMLTextAreaElement;
    area.value = css;
    dialog.showModal();
  };

  document.getElementById('export-json')!.onclick = () => {
    const json: any = {};
    state.palettes.forEach(p => {
      const theme = new Theme(
        p.keyColors.map(s => new Color(s)),
        BackgroundColor.White,
        p.ratios
      );
      const colors: any = {};
      theme.colors.forEach((c, i) => {
        colors[(i + 1) * 100] = c.toHex();
      });
      json[p.id] = colors;
    });

    const dialog = document.getElementById('export-dialog') as HTMLDialogElement;
    const area = document.getElementById('export-area') as HTMLTextAreaElement;
    area.value = JSON.stringify(json, null, 2);
    dialog.showModal();
  };

  // Helper: Analyze color lightness and recommend optimal step
  const recommendStep = (hexColor: string): number | null => {
    try {
      const color = new Color(hexColor);
      const lightness = color.oklch.l;

      // Recommend step based on lightness
      // L > 0.85: 100-300 (very light colors)
      // L = 0.70-0.85: 300-500 (light-medium colors)
      // L = 0.50-0.70: 500-700 (medium colors)
      // L = 0.30-0.50: 700-900 (medium-dark colors)
      // L < 0.30: 900-1100 (dark colors)

      if (lightness > 0.85) {
        return 200;
      } else if (lightness > 0.70) {
        return 400;
      } else if (lightness > 0.50) {
        return 600;
      } else if (lightness > 0.30) {
        return 800;
      } else {
        return 1000;
      }
    } catch (e) {
      return null;
    }
  };

  // UI: Step selection
  const stepSelect = document.getElementById('stepSelect') as HTMLSelectElement;
  const stepHint = document.getElementById('stepHint') as HTMLElement;

  // Update step recommendations when key color changes
  keyColorsInput.addEventListener('input', () => {
    const value = keyColorsInput.value.trim();
    if (!value) {
      stepHint.textContent = 'このカラーをスケール内のどの位置に配置するか選択してください';
      return;
    }

    // Parse color (ignore @step if present)
    const hexColor = value.split('@')[0]?.trim() ?? '';
    if (!hexColor) return;

    const recommended = recommendStep(hexColor);
    if (recommended !== null) {
      // Auto-select recommended step
      stepSelect.value = String(recommended);

      // Update hint message
      stepHint.innerHTML = `💡 このカラーの明度に基づき、<strong>${recommended}</strong> が最適なスケール配置として推奨されます`;

      // Automatically generate palette with recommended step
      const p = getActivePalette();
      if (p) {
        p.keyColors = [`${hexColor}@${recommended}`];
        // Keep input field clean (color only, no @step)
        renderMain();
      }
    }
  });

  // Update palette when step is selected
  stepSelect.addEventListener('change', () => {
    const hexColor = keyColorsInput.value.trim().split('@')[0]?.trim() ?? '';
    const selectedStep = stepSelect.value;

    if (hexColor && selectedStep) {
      const p = getActivePalette();
      if (p) {
        p.keyColors = [`${hexColor}@${selectedStep}`];
        // Keep input field clean (color only, no @step)
        renderMain();
      }
    }
  });

  // Init
  renderSidebar();
  updateEditor();
  renderMain();

  // Trigger initial recommendation if there's a default value
  if (keyColorsInput.value) {
    keyColorsInput.dispatchEvent(new Event('input'));
  }
};

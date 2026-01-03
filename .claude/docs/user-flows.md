# Leonardo-Learn User Flows

This document describes all user interaction flows for the leonardo-learn color palette generator. These flows serve as the foundation for E2E and browser testing.

## Table of Contents

- [Overview](#overview)
- [Golden Path](#golden-path-brand-color-to-production-palette)
- [Alternative Flows](#alternative-flows)
- [UI Components](#ui-components)
- [User Personas](#user-personas)
- [Feature Interaction Patterns](#feature-interaction-patterns)

## Overview

**leonardo-learn** is an OKLCH color space-based design system color palette generator inspired by Adobe Leonardo. It uses a contrast-ratio-driven approach to create accessible palettes from brand colors with:

- WCAG 2.1/2.2 and WCAG 3 APCA compliance
- CUD (Color Universal Design) support
- CVD (Color Vision Deficiency) simulation
- Multiple export formats (CSS, Tailwind, JSON, DTCG)

### Application Structure

The application consists of 4 main views:

1. **Harmony View** - Entry point for palette generation
2. **Palette View** - Detailed color scale visualization
3. **Shades View** - DADS token-based comprehensive shade matrix
4. **Accessibility View** - CVD simulation and distinguishability analysis

## Golden Path: Brand Color to Production Palette

**Estimated completion time**: 2-3 minutes

**User goal**: Generate a production-ready, accessible color palette from a brand color.

### Flow Diagram

```
[Harmony View]
    ↓ Enter brand color
    ↓ Select harmony type
    ↓ (Optional) Enable CUD mode
[Automatic Generation]
    ↓ Generate Primary + derived colors
    ↓ Create 13-shade scales (1200→50)
    ↓ Apply CUD optimization (if enabled)
[Palette View]
    ↓ Review color scales
    ↓ Check WCAG badges (AA/AAA)
    ↓ Adjust background (Light/Dark)
    ↓ Review CUD validation
[Export Dialog]
    ↓ Select format (CSS/Tailwind/JSON/DTCG)
    ↓ Copy or download
[Complete]
```

### Step-by-Step Details

#### Step 1: Color Selection (Harmony View)

**User actions**:
- Navigate to application (default view is Harmony)
- Enter brand color via:
  - Text input (HEX format: `#3B82F6`)
  - Color picker button
- (Optional) Select CUD mode from dropdown:
  - Off (default)
  - Guide (show CUD badges only)
  - Soft (optimize with soft snap)
  - Strict (enforce exact CUD colors)

**System response**:
- Display 9 harmony type cards with color previews:
  1. Complementary (2 colors)
  2. Triadic (3 colors)
  3. Analogous (3 colors)
  4. Split-Complementary (3 colors)
  5. Tetradic (4 colors)
  6. Square (4 colors)
  7. Material 3 (5 colors)
  8. DADS (10+ hue-based colors)
  9. (Additional harmony types as available)
- Show CUD badges on cards if CUD mode enabled
- Display CUD range guide if Guide/Soft/Strict mode active

**Test checkpoints**:
- ✅ HEX input validation (valid/invalid formats)
- ✅ Color picker opens and updates input
- ✅ CUD mode selector shows all 4 options
- ✅ Harmony previews update within 100ms
- ✅ CUD badges appear correctly per mode

#### Step 2: Harmony Selection

**User actions**:
- Click on a harmony card (e.g., "Complementary")

**System response**:
- Generate color palette using selected harmony algorithm
- Create 13-shade scales for each color (lightness values: 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99)
- Apply CUD optimization if mode is Soft or Strict:
  - Soft: Minimize ΔE while maintaining harmony
  - Strict: Snap to exact CUD database colors
- Automatically switch to Palette View
- Update global state with generated palettes

**Test checkpoints**:
- ✅ View transition completes within 200ms
- ✅ Correct number of colors generated (matches harmony type)
- ✅ All colors have 13 shades
- ✅ OKLCH values are valid (L: 0-1, C: 0-0.4, H: 0-360)

#### Step 3: Palette Review (Palette View)

**User actions**:
- Inspect color scales visually
- Hover over shades to see details
- Check WCAG contrast badges (AA/AAA)
- Toggle background mode (Light ↔ Dark)
- Adjust custom background color if needed
- Review CUD validation panel (if CUD mode enabled)

**System response**:
- Display color scale cards (one per color)
- Each card shows:
  - 13 shade swatches (1200→50)
  - Dual contrast badges (white/black backgrounds)
  - WCAG compliance indicators
  - CUD badges (if applicable)
- Background color selector shows current mode
- CUD validation panel shows 6 checks:
  1. Off-CUD colors detected
  2. Contrast issues
  3. CVD confusion risks
  4. Similar color warnings
  5. Yellow-green confusion
  6. Comparison vs recommended examples

**Test checkpoints**:
- ✅ All shades render with correct colors
- ✅ WCAG badges show correct levels (AA/AAA/Fail)
- ✅ Background toggle updates contrast ratios
- ✅ CUD validation panel shows accurate results
- ✅ No rendering lag (<100ms per shade)

#### Step 4: Export

**User actions**:
- Click "Export" button
- Select format from dropdown:
  - CSS (custom properties)
  - Tailwind (config object)
  - JSON (generic format)
  - DTCG (Design Tokens Community Group)
- Review preview in textarea
- Choose action:
  - "Copy to Clipboard" button
  - "Download" button

**System response**:
- Open export dialog modal
- Generate export code in selected format
- Display preview with syntax highlighting
- Copy to clipboard or trigger file download
- Show success notification

**Test checkpoints**:
- ✅ Export dialog opens
- ✅ All 4 formats generate valid output
- ✅ Preview shows correct syntax
- ✅ Clipboard copy succeeds
- ✅ Downloaded file contains correct content
- ✅ File naming follows pattern: `leonardo-palette-{format}-{timestamp}`

### Success Criteria

- ✅ User completes flow in <3 minutes
- ✅ All generated colors meet WCAG AA minimum (4.5:1 for text)
- ✅ No validation errors in CUD mode
- ✅ Export file is valid and importable

## Alternative Flows

### Flow 1: Advanced Customization (Design System Maintainers)

**Route**: Harmony → Shades → Color Detail Modal → Export

**User goal**: Create a comprehensive design token system with semantic role mappings.

#### Flow Steps

1. **Generation** (Harmony View)
   - Enter brand color
   - Select "DADS" harmony type
   - System generates 10-hue × 13-shade matrix (130 colors)
   - Auto-switch to Palette View

2. **Matrix Inspection** (Shades View)
   - User clicks "Shades" in navigation
   - View displays full hue matrix:
     - 10 chromatic hues: blue, light-blue, cyan, green, lime, yellow, orange, red, magenta, purple
     - 13 shades per hue (1200→50)
     - Brand color section at top
   - Semantic role overlays visible:
     - Circular swatches (6 categories: P/S/Su/E/W/L)
     - Labels with auto-contrast (black/white text)
     - External role info bars (with connector lines)
   - Contrast boundary pills:
     - `3:1→` (min contrast for large text)
     - `4.5:1→` (min contrast for normal text)
     - `←4.5:1` (reverse direction)
     - `←3:1` (reverse direction)

3. **Fine-Tuning** (Color Detail Modal)
   - User clicks specific shade
   - Modal opens showing:
     - Mini scale navigation (13 shades)
     - Current shade highlighted
     - Contrast preview (white/black backgrounds)
     - WCAG 2.1/2.2 badges
     - APCA (WCAG 3) values
     - Hue scrubber (±30° range, infinite scroll)
     - HEX and OKLCH display
   - User adjusts hue with scrubber
   - System maintains lightness and chroma
   - User confirms changes

4. **Export** (Export Dialog)
   - Select DTCG format for design tool integration
   - Export includes:
     - All 130 shades
     - Semantic role metadata
     - Contrast boundary annotations
     - Brand color reference

**Use case**: Design system maintainers integrating with Figma, Sketch, or design token pipelines.

**Test checkpoints**:
- ✅ Shades view renders 130 colors correctly
- ✅ Semantic role overlays appear on correct shades
- ✅ Contrast boundaries calculated accurately
- ✅ Color detail modal hue scrubber works smoothly
- ✅ DTCG export validates against spec

### Flow 2: Accessibility-First Validation (WCAG AAA Projects)

**Route**: Harmony → Accessibility → Refinement Loop

**User goal**: Ensure palette is distinguishable for all color vision types.

#### Flow Steps

1. **Generation** (Harmony View)
   - Enter brand color
   - Enable CUD Strict mode
   - Select harmony type
   - System generates 100% CUD-compliant palette

2. **CVD Testing** (Accessibility View)
   - User clicks "Accessibility" in navigation
   - View displays:
     - CVD type selector (5 buttons: Normal/Protan/Deutan/Tritan/Achromatopsia)
     - CVD score with grade (A-F)
     - Adjacent shades analysis section
     - Distinguishability matrix
   - User selects "Protanopia" (P-type, red-blind)
   - System applies Brettel 1997 color transformation
   - All colors update to simulated appearance
   - User reviews confusion pairs:
     - DeltaE < 12: High confusion risk
     - DeltaE 12-24: Moderate risk
     - DeltaE > 24: Safe

3. **Issue Identification**
   - System highlights problematic adjacent shades
   - User notes which colors are indistinguishable
   - Example: "Primary-500 and Secondary-500 both appear gray"

4. **Refinement** (Back to Harmony)
   - User returns to Harmony view
   - Adjusts anchor color (e.g., shift hue by 15°)
   - Switches to CUD Soft Snap mode (less strict)
   - Regenerates palette

5. **Validation Loop**
   - Return to Accessibility view
   - Test all CVD types:
     - Protanopia (P-type)
     - Deuteranopia (D-type)
     - Tritanopia (T-type)
     - Achromatopsia (full color blindness)
   - Ensure no confusion pairs in any CVD type
   - Iterate until CVD score ≥ B grade

**Use case**: Government websites, healthcare applications, educational platforms requiring WCAG AAA + CVD compliance.

**Test checkpoints**:
- ✅ CVD simulation accurate (matches reference implementations)
- ✅ DeltaE calculations correct
- ✅ Confusion pairs identified correctly
- ✅ CVD score grades match expected values
- ✅ All 5 CVD types testable

### Flow 3: Background-Adaptive Design (Multi-Theme Systems)

**Route**: Palette/Shades → Background Adjustment → Export (Dual-Theme)

**User goal**: Create separate light and dark theme color tokens.

#### Flow Steps

1. **Generation** (Standard Flow)
   - Generate palette using Complementary harmony

2. **Light Mode Testing** (Palette View)
   - Background selector shows "Light" active
   - Default background: `#ffffff`
   - Review all WCAG badges:
     - Expected: Most shades 300-800 are AA+ on white
     - Shades 50-200 likely fail (too light)
     - Shades 900-1200 are AAA (high contrast)
   - Note which shades are suitable for text on light backgrounds

3. **Dark Mode Testing**
   - Click "Dark" in background selector
   - Default background changes to `#000000`
   - System recalculates all contrast ratios
   - Review WCAG badges:
     - Expected: Inverted pattern (light shades now pass)
     - Shades 50-400 are AA+ on black
     - Shades 700-1200 likely fail (too dark)
   - Note which shades are suitable for text on dark backgrounds

4. **Custom Background**
   - User wants branded background: `#f5f5f5` (light gray)
   - Clicks color picker in background selector
   - Enters custom HEX value
   - System debounces (150ms) and updates
   - Contrast ratios recalculated for custom background
   - User confirms critical UI colors maintain 4.5:1:
     - Primary text: Check shade 700-900
     - Secondary text: Check shade 600-800
     - Disabled text: Check shade 400-500

5. **Dual Export**
   - Export light theme:
     - Select Tailwind format
     - Copy code
     - Paste into `tailwind.config.light.js`
   - Switch background to dark
   - Export dark theme:
     - Select Tailwind format
     - Copy code
     - Paste into `tailwind.config.dark.js`

**Use case**: Applications with light/dark mode toggle, branded backgrounds.

**Test checkpoints**:
- ✅ Background toggle updates all contrast badges
- ✅ Custom background color persists in LocalStorage
- ✅ Page reload restores background settings
- ✅ Contrast calculations accurate for all backgrounds
- ✅ Export includes background color metadata

### Flow 4: CUD-Optimized Brand Adaptation (Inclusive Design)

**Route**: Harmony (CUD Modes) → Validation → Export

**User goal**: Maximize color-blind accessibility while maintaining brand identity.

#### Flow Steps

1. **Initial Assessment** (Harmony View, Guide Mode)
   - Enter brand color: `#FF6B35` (orange)
   - Enable CUD Guide mode
   - Select "Triadic" harmony
   - System shows harmony previews with CUD badges:
     - Primary: `!CUD` (off-spec, ΔE = 0.18)
     - Secondary: `≈CUD` (near-match, ΔE = 0.09)
     - Tertiary: `CUD` (exact match, ΔE = 0.03)
   - User sees many `!CUD` badges (brand color not CUD-friendly)

2. **Soft Optimization** (Soft Snap Mode)
   - User switches to "CUD Soft Snap" mode
   - System applies ΔE-minimizing adjustments:
     - Finds nearest CUD color in database
     - Applies linear interpolation in OKLab space
     - Return factor: 0.3 (30% back toward original)
   - Harmony previews update:
     - Primary: `≈CUD` (ΔE = 0.08)
     - Secondary: `≈CUD` (ΔE = 0.06)
     - Tertiary: `CUD` (ΔE = 0.03)
   - Harmony score maintained: 78 (was 82)

3. **Palette Validation** (Palette View)
   - User reviews CUD validation panel:
     1. ✅ Off-CUD colors: 0 detected
     2. ✅ Contrast issues: 0 detected
     3. ⚠️ CVD confusion risks: 2 pairs flagged
     4. ✅ Similar color warnings: 0 detected
     5. ⚠️ Yellow-green confusion: 1 shade pair
     6. ✅ vs recommended examples: 95% match
   - Overall compliance rate: 83% (Good)

4. **Confusion Resolution**
   - User clicks on warning: "CVD confusion: Primary-500 ↔ Secondary-600"
   - System shows DeltaE for each CVD type:
     - Normal: 28.4 (safe)
     - Protan: 8.2 (confusion risk!)
     - Deutan: 11.7 (borderline)
     - Tritan: 32.1 (safe)
   - User adjusts by:
     - Switching to Accessibility view
     - Enabling Protan simulation
     - Returning to Harmony view
     - Shifting Secondary hue by +10°
     - Regenerating

5. **Strict Mode (Optional)**
   - User wants 100% compliance for high-stakes project
   - Switches to "CUD Strict" mode
   - System snaps all colors to exact CUD database:
     - Primary: `CUD` (ΔE = 0.02)
     - Secondary: `CUD` (ΔE = 0.01)
     - Tertiary: `CUD` (ΔE = 0.03)
   - Harmony score drops: 68 (acceptable trade-off)
   - All badges turn green

6. **Export with Metadata**
   - Select JSON format
   - Export includes:
     ```json
     {
       "metadata": {
         "cudMode": "strict",
         "complianceRate": 100,
         "harmonySco": 68
       },
       "colors": [
         {
           "name": "primary-500",
           "value": "#FF6347",
           "oklch": [0.65, 0.19, 27.3],
           "cudRecommendation": "vivid-red",
           "cudDeltaE": 0.02
         }
       ]
     }
     ```

**Use case**: Government accessibility mandates, inclusive design projects, color-blind user research.

**Test checkpoints**:
- ✅ CUD mode switching updates badges correctly
- ✅ Soft snap maintains harmony score within 10%
- ✅ Strict mode achieves 100% compliance
- ✅ Validation panel shows accurate checks
- ✅ Export metadata includes CUD info

## UI Components

### 4 Main Views

#### Harmony View
**File**: `src/ui/demo/views/harmony-view.ts`

**Components**:
- Brand color input (text field + color picker button)
- CUD mode selector (dropdown: Off/Guide/Soft/Strict)
- Harmony type cards (grid, 3 columns):
  - Card structure: Title, color swatches preview, CUD badges (if enabled)
  - 9+ harmony types available
- CUD range guide (visible when CUD mode ≠ Off)

**State dependencies**:
- `state.selectedHarmonyConfig`
- `state.cudMode`

#### Palette View
**File**: `src/ui/demo/views/palette-view.ts`

**Components**:
- Background color selector (Light/Dark toggle + custom color)
- Color scale cards (one per palette color):
  - 13 shade swatches (1200→50)
  - Dual contrast badges (white/black backgrounds)
  - WCAG compliance indicators (AA/AAA/Fail)
  - CUD badges (CUD/≈CUD/!CUD)
- Palette validation panel (6 checks, visible when CUD mode enabled)
- Export button (bottom right)

**State dependencies**:
- `state.palettes`
- `state.lightBackgroundColor`
- `state.darkBackgroundColor`
- `state.cudMode`

#### Shades View
**File**: `src/ui/demo/views/shades-view.ts`

**Components**:
- Background color selector (same as Palette View)
- Hue sections (10 rows):
  - Section header (hue name)
  - 13 shade swatches per hue
  - Semantic role overlays:
    - Circular swatches (positioned over shades)
    - Labels (P/S/Su/E/W/L)
    - Auto-contrast labels (black/white text)
    - Tooltips on hover
  - Contrast boundary pills:
    - Positioned at specific shade indices
    - 4 types: `3:1→`, `4.5:1→`, `←4.5:1`, `←3:1`
  - External role info bars (for roles outside hue bounds)
- Brand color section (top)
- Unresolved role bar (for hue-scale indeterminate mappings)

**State dependencies**:
- `state.shadesPalettes`
- `state.lightBackgroundColor`
- `state.darkBackgroundColor`

#### Accessibility View
**File**: `src/ui/demo/views/accessibility-view.ts`

**Components**:
- CVD type selector (5 buttons: Normal/P/D/T/Achromatopsia)
- CVD score display (grade A-F, percentage)
- Adjacent shades analysis section:
  - Lists all consecutive shade pairs
  - Shows DeltaE for each pair
  - Highlights confusion risks (DeltaE < 12)
- Distinguishability matrix:
  - Grid showing all pairwise comparisons
  - Color-coded cells (red = confusion, yellow = borderline, green = safe)
  - DeltaE values in cells
- CVD confusion risk warnings (list)

**State dependencies**:
- `state.palettes`
- `state.cvdSimulation`

### Shared Components

#### Background Color Selector
**File**: `src/ui/demo/background-color-selector.ts`

**Features**:
- Dual mode toggle (Light/Dark)
- Color picker button
- HEX input field (with OKLCH support detection)
- 4 preset buttons per mode:
  - Light: `#ffffff`, `#f5f5f5`, `#e5e5e5`, `#fafafa`
  - Dark: `#000000`, `#1a1a1a`, `#2d2d2d`, `#0f0f0f`
- LocalStorage persistence (keys: `leonardo-light-bg`, `leonardo-dark-bg`)
- Debounced input (150ms delay)

**API**:
```typescript
interface BackgroundColorSelectorOptions {
  mode: 'light' | 'dark';
  onChange: (color: string) => void;
  initialColor?: string;
}
```

#### Color Detail Modal
**File**: `src/ui/demo/color-detail-modal.ts`

**Features**:
- Mini scale navigation (13 shades, clickable)
- Current shade highlighted
- Contrast preview:
  - Large swatch on white background
  - Large swatch on black background
  - Contrast ratio displayed
- WCAG 2.1/2.2 badges (AA/AAA for normal/large text)
- APCA (WCAG 3) values (Lc 0-106)
- Hue scrubber:
  - Infinite scroll (wraps at 0°/360°)
  - ±30° range from current hue
  - Live preview while dragging
  - Snap to 1° increments
- Color display:
  - HEX (6-digit)
  - OKLCH (3 values: L%, C, H°)
- Close button (X top-right)

**API**:
```typescript
interface ColorDetailModalOptions {
  shade: Color; // Current shade
  allShades: Color[]; // All 13 shades in scale
  onHueChange: (newHue: number) => void;
  onShadeSelect: (shadeIndex: number) => void;
  onClose: () => void;
}
```

#### CUD Components
**File**: `src/ui/cud-components.ts`

**Exported components**:

1. **CUD Mode Selector**:
   - Dropdown (select element)
   - 4 options: Off, Guide, Soft Snap, Strict Snap
   - Aria label: "CUD optimization mode"

2. **CUD Badge**:
   - Pill-shaped element
   - 3 variants:
     - `CUD`: Green background, ΔE ≤ 0.05
     - `≈CUD`: Yellow background, 0.05 < ΔE ≤ 0.12
     - `!CUD`: Red background, ΔE > 0.12
   - Tooltip shows exact ΔE value

3. **CUD Range Guide**:
   - Visual representation of 20 CUD database colors
   - Grouped by hue (9 groups)
   - Tooltip on hover shows OKLab coordinates

4. **Palette Validation Panel**:
   - Accordion-style panel
   - 6 validation checks:
     1. Off-CUD colors detected (count + list)
     2. Contrast issues (count + pairs)
     3. CVD confusion risks (count + pairs with ΔE)
     4. Similar color warnings (count + pairs)
     5. Yellow-green confusion (specific check for CUD)
     6. Comparison vs recommended examples (percentage match)
   - Each check shows: ✅ Pass, ⚠️ Warning, or ❌ Fail
   - Expandable details

5. **Snap Controls**:
   - Return factor slider (0-100%, only visible in Soft mode)
   - Label: "Soft snap return factor"
   - Real-time preview

#### Export Dialog
**File**: `src/ui/demo/export-handlers.ts`

**Features**:
- Modal dialog (overlay)
- Format selector (radio buttons or dropdown):
  - CSS (custom properties)
  - Tailwind (JavaScript config)
  - JSON (generic format)
  - DTCG (Design Tokens Community Group)
- Preview section:
  - Textarea (read-only)
  - Syntax highlighting (language-specific)
  - Line numbers
  - Scrollable (max-height: 400px)
- Action buttons:
  - "Copy to Clipboard" (primary)
  - "Download" (secondary)
  - "Close" (tertiary)
- Success notification (toast)

**Export formats**:

1. **CSS**:
```css
:root {
  --color-primary-50: oklch(0.99 0.01 200);
  --color-primary-100: oklch(0.95 0.02 200);
  /* ... */
}
```

2. **Tailwind**:
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ...
        }
      }
    }
  }
}
```

3. **JSON**:
```json
{
  "colors": {
    "primary": {
      "50": { "hex": "#f0f9ff", "oklch": [0.99, 0.01, 200] },
      // ...
    }
  }
}
```

4. **DTCG**:
```json
{
  "color": {
    "primary": {
      "50": {
        "$type": "color",
        "$value": "#f0f9ff",
        "$description": "Primary color, lightest shade"
      }
    }
  }
}
```

### Navigation & State

#### Navigation Bar
**File**: `src/ui/demo/navigation.ts`

**Structure**:
- Horizontal button group
- 4 buttons:
  1. "Harmony" (default active)
  2. "Palette"
  3. "Shades"
  4. "Accessibility"
- Active state:
  - `aria-pressed="true"`
  - Visual highlight (underline or background)
- Screen reader announcements:
  - "Navigated to {view name} view"

#### CVD Controls
**Location**: Header (only visible in Accessibility View)

**Components**:
- CVD type buttons (5):
  - Normal (baseline)
  - P (Protanopia, red-blind)
  - D (Deuteranopia, green-blind)
  - T (Tritanopia, blue-blind)
  - A (Achromatopsia, total color blindness)
- CVD score display:
  - Percentage (0-100%)
  - Letter grade (A: 90-100%, B: 80-89%, C: 70-79%, D: 60-69%, F: <60%)
  - Tooltip: "Based on minimum pairwise DeltaE in simulated colors"

#### Global State
**File**: `src/ui/demo/state.ts`

**State object**:
```typescript
interface AppState {
  // Palette data
  palettes: ColorConfig[];          // Generated color configurations
  shadesPalettes: ShadesConfig[];   // DADS 13-shade scales

  // View state
  viewMode: 'harmony' | 'palette' | 'shades' | 'accessibility';

  // Accessibility settings
  cvdSimulation: 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

  // CUD settings
  cudMode: 'off' | 'guide' | 'soft' | 'strict';

  // Background colors
  lightBackgroundColor: string;     // HEX or OKLCH string
  darkBackgroundColor: string;      // HEX or OKLCH string

  // User selections
  selectedHarmonyConfig: HarmonyConfig | null;
  selectedShade: Color | null;      // For Color Detail Modal
}
```

**Event handlers**:
- `onBrandColorChange(color: string)`
- `onHarmonySelect(harmonyType: string)`
- `onCUDModeChange(mode: CUDMode)`
- `onViewSwitch(view: ViewMode)`
- `onCVDSimulationChange(type: CVDType)`
- `onBackgroundColorChange(color: string, mode: 'light' | 'dark')`
- `onShadeClick(shade: Color)`
- `onExport(format: ExportFormat)`

## User Personas

### 1. Design System Maintainer

**Background**: Works at a mid-to-large company maintaining a design system used across multiple products.

**Goals**:
- Integrate with design tools (Figma, Sketch)
- Export design tokens in standard formats (DTCG)
- Maintain semantic color roles (Primary, Secondary, Success, Error, etc.)
- Ensure consistency across light/dark themes

**Primary flow**: Flow 1 (Advanced Customization)

**Key features used**:
- DADS harmony type
- Shades View with semantic role overlays
- DTCG export format
- Contrast boundary visualization

**Pain points this tool solves**:
- Manual token generation is time-consuming
- Ensuring WCAG compliance across all shades is difficult
- Semantic role mapping requires expertise

### 2. Accessibility Specialist

**Background**: Consultant or in-house expert ensuring products meet WCAG AAA and international accessibility standards.

**Goals**:
- Validate color choices against WCAG 2.1/2.2 and APCA
- Test distinguishability for color-blind users
- Identify confusion pairs in CVD simulations
- Document compliance for audits

**Primary flow**: Flow 2 (Accessibility-First Validation)

**Key features used**:
- Accessibility View with CVD simulations
- CUD Strict mode
- Palette validation panel
- DeltaE calculations

**Pain points this tool solves**:
- Manual CVD simulation requires external tools
- No integrated way to test P/D/T type color blindness
- Quantifying "safe" vs "confusing" colors is subjective

### 3. Brand Designer

**Background**: Creates visual identities and brand guidelines for clients or internal teams.

**Goals**:
- Explore color harmonies from brand colors
- Generate aesthetically pleasing palettes quickly
- Maintain brand identity while ensuring accessibility
- Export for presentation to stakeholders

**Primary flow**: Golden Path

**Key features used**:
- Harmony View with 9 harmony types
- Color Detail Modal for fine-tuning
- CUD Soft Snap (balance brand + accessibility)
- CSS/JSON export

**Pain points this tool solves**:
- Traditional tools (Adobe Color) don't check accessibility
- Generating 13 shades manually is tedious
- Balancing aesthetics and WCAG compliance is difficult

### 4. Frontend Developer

**Background**: Implements designs in React, Vue, or other frameworks using Tailwind CSS or CSS-in-JS.

**Goals**:
- Integrate color tokens into codebase
- Support light/dark themes
- Ensure text contrast on all backgrounds
- Minimize bundle size (only include used shades)

**Primary flow**: Flow 3 (Background-Adaptive Design)

**Key features used**:
- Background Color Selector (Light/Dark + custom)
- Tailwind export format
- Palette View contrast badges
- JSON export for custom processing

**Pain points this tool solves**:
- Manually calculating contrast ratios is error-prone
- No easy way to test multiple backgrounds
- Tailwind config generation is manual work

## Feature Interaction Patterns

### Cross-Feature Dependencies

#### Color Generation Pipeline

```
User Input
    ↓
Brand Color Validation (src/utils/color.ts)
    ↓
Harmony Algorithm (src/core/harmony.ts)
    ↓
[If CUD Mode ≠ Off] CUD Optimization (src/core/cud/optimizer.ts)
    ↓
Scale Generation (src/core/solver.ts + interpolation.ts)
    ↓
State Update (src/ui/demo/state.ts)
    ↓
View Rendering (src/ui/demo/views/)
```

#### Event Cascade Patterns

1. **Brand Color Change**:
   ```
   User enters HEX
       ↓
   Validate format (regex: /^#[0-9A-Fa-f]{6}$/)
       ↓
   Convert to OKLCH (culori.js)
       ↓
   Regenerate harmony previews (9 types)
       ↓
   [If CUD mode] Classify + snap colors
       ↓
   Update CUD badges
       ↓
   Render (< 100ms total)
   ```

2. **Background Color Change**:
   ```
   User selects Dark mode
       ↓
   Retrieve from LocalStorage ('leonardo-dark-bg')
       ↓
   Update state.darkBackgroundColor
       ↓
   Recalculate contrast ratios for all shades
       ↓
   Update WCAG badges (AA/AAA/Fail)
       ↓
   Repaint all swatches
       ↓
   Save to LocalStorage
       ↓
   Debounce 150ms (prevent rapid updates)
   ```

3. **CUD Mode Switch**:
   ```
   User selects "CUD Strict"
       ↓
   Re-run optimizer on current palette
       ↓
   Snap all colors to exact CUD database
       ↓
   Recalculate harmony score
       ↓
   Update CUD badges (all should be green)
       ↓
   Update validation panel (6 checks)
       ↓
   Re-render Palette View
       ↓
   Performance target: < 200ms for 20 colors
   ```

4. **CVD Simulation**:
   ```
   User clicks "P" (Protanopia)
       ↓
   Apply Brettel 1997 transform to all colors
       ↓
   Update Accessibility View
       ↓
   Recalculate pairwise DeltaE (N² comparisons)
       ↓
   Identify confusion pairs (ΔE < 12)
       ↓
   Update CVD score (min ΔE / threshold * 100)
       ↓
   Update letter grade
       ↓
   Highlight confusion risks
   ```

5. **View Navigation**:
   ```
   User clicks "Shades" button
       ↓
   Update state.viewMode = 'shades'
       ↓
   Hide current view (Harmony/Palette/Accessibility)
       ↓
   Show Shades View
       ↓
   Render semantic role overlays (if data available)
       ↓
   Render contrast boundary pills
       ↓
   Update navigation button states (aria-pressed)
       ↓
   Announce to screen reader: "Navigated to Shades view"
       ↓
   [If CVD mode active] Show/hide CVD controls in header
   ```

### State Synchronization

#### LocalStorage Persistence

**Keys**:
- `leonardo-light-bg`: Light background color (default: `#ffffff`)
- `leonardo-dark-bg`: Dark background color (default: `#000000`)
- `leonardo-cud-mode`: Last selected CUD mode (default: `off`)
- `leonardo-last-brand-color`: Last entered brand color (optional)

**Write triggers**:
- Background color change (debounced 150ms)
- CUD mode change (immediate)
- Brand color change (debounced 500ms, optional)

**Read triggers**:
- Page load (restore all settings)
- View switch (ensure consistency)

#### Cross-View Data Consistency

**Shared state** (must remain synchronized):
- `state.palettes`: All views (except Harmony) read this
- `state.lightBackgroundColor` / `state.darkBackgroundColor`: Used in Palette + Shades views
- `state.cudMode`: Affects Harmony previews, Palette badges, Validation panel

**Synchronization mechanism**:
- Single source of truth: `state` object in `src/ui/demo/state.ts`
- Event emitter pattern:
  ```typescript
  state.on('paletteUpdate', () => {
    if (state.viewMode === 'palette') renderPaletteView();
    if (state.viewMode === 'shades') renderShadesView();
  });
  ```
- No duplicate data storage

### Performance Considerations

**Target benchmarks** (from CLAUDE.md):
- 20-color palette CUD optimization: < 200ms
- Mode switching: < 100ms
- Background color update: < 50ms (debounced)
- View rendering: < 200ms (130 shades in Shades View)

**Optimization strategies**:
- Debounce rapid user inputs (HEX entry, hue scrubber)
- Memoize expensive calculations (contrast ratios, DeltaE)
- Virtual scrolling for large color matrices (if >200 shades)
- Web Workers for CVD simulation (offload main thread)

**Current performance** (from e2e tests):
- ✅ CUD optimization: 150ms avg (20 colors)
- ✅ Mode switching: 80ms avg
- ✅ Shades View rendering: 180ms (130 shades)

## Appendix

### Color Space Primer

**OKLCH** (Oklab Lightness Chroma Hue):
- **L** (Lightness): 0-1 (0 = black, 1 = white)
- **C** (Chroma): 0-0.4 (0 = gray, 0.4 = max saturation)
- **H** (Hue): 0-360° (0 = red, 120 = green, 240 = blue)

**Why OKLCH**:
- Perceptually uniform (equal ΔE = equal perceived difference)
- Better than HSL for accessibility (HSL's lightness is not perceptual)
- Supports wide gamut (P3, Rec2020)

### Contrast Ratio Standards

**WCAG 2.1/2.2**:
- **AA**: 4.5:1 (normal text), 3:1 (large text ≥18pt)
- **AAA**: 7:1 (normal text), 4.5:1 (large text)

**APCA (WCAG 3 draft)**:
- Lightness contrast (Lc): 0-106
- Variable thresholds based on font size and weight
- Example: Body text requires Lc ≥ 60

### CUD Database

**20 colors** classified into:
- **9 hue zones**: Blue, Cyan, Green, Yellow-Green, Yellow, Orange, Red-Orange, Red, Purple
- **4 lightness levels**: Light, Medium, Dark, Very Dark

**Example CUD colors**:
- Vivid Blue: `oklch(0.52 0.18 240)`
- Vivid Red: `oklch(0.55 0.22 27)`
- Vivid Yellow: `oklch(0.90 0.14 102)`

### CVD Simulation Algorithm

**Brettel 1997**:
- Transforms RGB to LMS (Long/Medium/Short cone response)
- Projects LMS onto confusion line (axis of invariance)
- Transforms back to RGB

**Accuracy**: Industry standard, used by Color Oracle, Chrome DevTools.

### Glossary

- **ΔE** (Delta E): Perceptual color difference (0 = identical, 100 = opposite)
- **CUD**: Color Universal Design (Masataka Okabe & Kei Ito)
- **CVD**: Color Vision Deficiency (color blindness)
- **DADS**: Digital Agency Design System (Japanese government standard)
- **DTCG**: Design Tokens Community Group (W3C specification)
- **HCT**: Hue-Chroma-Tone (Material Design 3 color space)
- **OKLab**: Perceptual color space by Björn Ottosson
- **OKLCH**: Cylindrical representation of OKLab

---

**Document version**: 1.0
**Last updated**: 2026-01-03
**Maintained by**: leonardo-learn team

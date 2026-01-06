# Harmony Types Reference

## Overview

This document covers two distinct color systems in leonardo-learn:
1. **Harmony Filter Types**: UI-level color wheel harmonies for filtering accent candidates
2. **Generation Strategies**: Full palette generation systems (M3, DADS)

---

## Harmony Filter Types (`HarmonyFilterType`)

UI-level color wheel harmonies used to filter accent color candidates based on hue relationships.

**Source**: `src/core/accent/harmony-filter-calculator.ts`

| Type | Hue Offsets | Description |
|------|-------------|-------------|
| **all** | - | No filtering, all candidates shown |
| **complementary** | 180° | Opposite on wheel |
| **triadic** | 120°, 240° | Equidistant triangle |
| **analogous** | -30°, 30° | Adjacent colors |
| **split-complementary** | 150°, 210° | Complement neighbors |
| **monochromatic** | 0° | Same hue, varied L/C |
| **shades** | 0° | Same hue, lightness variation |
| **compound** | 30°, 180° | Analogous + complement |
| **square** | 90°, 180°, 270° | Square on wheel |

### Filtering Logic

Candidates are filtered using `±30°` tolerance from target hues (see `HARMONY_RANGE_DEGREES`).

---

## Generation Strategies

Separate full-palette generation systems with different design philosophies.

### Material 3 (M3)

**Source**: `src/core/strategies/m3-generator.ts`

Google Material Design 3 tonal palette generation:
- HCT color space → OKLCH conversion
- 13-tone scale: 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100
- Semantic roles: primary, secondary, tertiary, neutral, error

### DADS (Design for Accessibility Design System)

**Source**: `src/core/strategies/dads-optimizer.ts`

Accessibility-optimized palette generation:
- WCAG AA/AAA compliance targeting
- APCA contrast calculation support
- Interactive state colors (focus, hover, active, disabled)
- 12+ semantic hue system

---

## Generated Palette Roles

From a single brand color, the system generates:

| Role | Purpose | Generation |
|------|---------|------------|
| **Primary** | Main brand color | Input color |
| **Secondary** | Supporting color | Harmony-based |
| **Accent** | Highlight color | Harmony-based |
| **Gray/Slate** | Neutral | Primary hue, low chroma |
| **Success** | Positive feedback | Fixed green hue |
| **Warning** | Caution | Fixed yellow hue |
| **Error** | Negative feedback | Fixed red hue |
| **Info** | Information | Fixed blue hue |

---

## UI Selection

In the Harmony View, users select harmony filter type from dropdown. Candidates are filtered in real-time based on hue relationships.

## CUD Integration

When CUD submode is enabled:
- Each generated color gets a CUD badge (CUD/≈CUD/!CUD)
- Palette validation runs 6 automatic checks
- CVD confusion risk analysis available

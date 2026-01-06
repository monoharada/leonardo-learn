# Accessibility Reference

## WCAG Standards Support

### WCAG 2.1/2.2

**File**: `src/accessibility/wcag2.ts`

| Level | Contrast Ratio | Use Case |
|-------|----------------|----------|
| AA | 4.5:1 | Normal text |
| AA Large | 3:1 | Large text (18pt+/14pt bold) |
| AAA | 7:1 | Enhanced contrast |

### APCA (WCAG 3)

**File**: `src/accessibility/apca.ts`

APCA (Advanced Perceptual Contrast Algorithm) provides more accurate perceptual contrast measurement.

**Library**: `apca-w3`

## CVD Simulation

**File**: `src/accessibility/cvd-simulator.ts`

| Type | Description | Impact |
|------|-------------|--------|
| Protan (P-type) | Type 1 CVD | Reduced red sensitivity |
| Deutan (D-type) | Type 2 CVD | Reduced green sensitivity |
| Tritan (T-type) | Type 3 CVD | Reduced blue sensitivity |

## Distinguishability

**File**: `src/accessibility/distinguishability.ts`

- Calculates DeltaE (color difference) between adjacent colors
- Detects hard-to-distinguish color pairs under CVD
- Provides warning icons for problem areas

## Dual Contrast Display

The UI shows contrast badges for both:
- White background
- Black background

This helps verify colors work in both light and dark themes.

## Testing Commands

```bash
# Accessibility tests
bun test src/accessibility/

# CVD simulator tests
bun test src/accessibility/cvd-simulator.test.ts

# Distinguishability tests
bun test src/accessibility/distinguishability.test.ts
```

## Key Thresholds

| Metric | Value | Purpose |
|--------|-------|---------|
| WCAG AA | 4.5:1 | Minimum readable |
| WCAG AAA | 7:1 | Enhanced readability |
| CUD Safe ΔE | ≤ 0.05 | CUD compliant |
| CUD Warning ΔE | ≤ 0.12 | Near compliant |

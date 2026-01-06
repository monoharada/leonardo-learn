# CUD Optimization Reference

## Overview

CUD (Color Universal Design) optimization ensures palettes are accessible to people with color vision deficiencies while maintaining brand harmony.

## Algorithm (ADR-007)

**Approach**: Greedy multi-objective optimization

**Performance Target**: 20-color palette in <200ms

## Three-Zone Classification

| Zone | Delta E | Description | Action |
|------|---------|-------------|--------|
| **Safe** | ΔE ≤ 0.05 | CUD compliant | No snap needed |
| **Warning** | 0.05 < ΔE ≤ 0.12 | Near compliant | Soft snap |
| **Off** | ΔE > 0.12 | Non-compliant | Warning shown |

## Objective Function

```
objective = Σ(deltaE_i) + λ × (1 - harmonyScore/100)
```

- `deltaE_i`: Color difference from CUD reference (OKLab)
- `λ`: Weight coefficient (0-1, default 0.5)
- `harmonyScore`: Harmony score (0-100)

## Harmony Score Components

```
harmonyScore = w1 × hueScore + w2 × lightnessScore + w3 × contrastScore
```

**Default weights**: hue=0.4, lightness=0.3, contrast=0.3

## Soft Snap (OKLab Linear Interpolation)

```typescript
result_L = original_L + factor × (cudTarget_L - original_L)
result_a = original_a + factor × (cudTarget_a - original_a)
result_b = original_b + factor × (cudTarget_b - original_b)
```

**Zone Behavior**:
- Safe: No snap (preserve original)
- Warning: Partial snap with return factor
- Off: Snap to Warning boundary (never force to CUD color)

## CUD Recommended Colors (v4)

**20 colors total**:
- Accent colors (9): Red, Yellow, Green, Blue, Sky, Pink, Orange, Purple, Brown
- Base colors (7): Light series + Dark series
- Achromatic (4): White, Light Gray, Gray, Black

## Key Files

- `src/core/cud/optimizer.ts` - Main optimization
- `src/core/cud/zone.ts` - Zone classification
- `src/core/cud/snapper.ts` - Soft snap
- `src/core/cud/harmony-score.ts` - Scoring
- `src/core/cud/colors.ts` - CUD color database
- `src/core/cud/validator.ts` - Palette validation
- `src/core/cud/service.ts` - CUD service API

## Testing

```bash
# CUD unit tests
bun test src/core/cud/

# Performance benchmarks
cross-env CI_BENCH=1 bun test src/core/cud/performance.test.ts
```

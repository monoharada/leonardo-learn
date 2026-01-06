# Architecture Reference

## Three-Layer Design (Adobe Leonardo-inspired)

```
┌─────────────────────────────────────────────────────────────┐
│                     Theme Layer                              │
│  src/core/theme.ts - Multiple color definitions management   │
├─────────────────────────────────────────────────────────────┤
│              Color/BackgroundColor Layer                     │
│  src/core/color.ts, background.ts - Scale definitions        │
├─────────────────────────────────────────────────────────────┤
│                   Algorithm Layer                            │
│  src/core/solver.ts, interpolation.ts - Color generation     │
└─────────────────────────────────────────────────────────────┘
```

## Dependency Direction (MUST follow)

```
UI Layer (src/ui/) → Core Layer (src/core/) → Utils Layer (src/utils/)
```

**Rules**:
- UI can depend on Core, NOT reverse
- Core can depend on Utils, NOT reverse
- Circular dependencies are PROHIBITED

## Module Overview

| Path | Purpose |
|------|---------|
| `src/core/` | Color generation algorithms, Theme/Color classes |
| `src/core/cud/` | CUD optimization (optimizer, zone, snapper, harmony-score) |
| `src/core/export/` | CSS, JSON, Tailwind, DTCG exporters |
| `src/core/tokens/` | Design token system (DADS importer, semantic resolver) |
| `src/core/system/` | Color system coordination |
| `src/core/semantic-role/` | Semantic role mapping |
| `src/core/strategies/` | Generation strategies (DADS, M3) |
| `src/core/preview/` | Preview generation |
| `src/accessibility/` | WCAG 2.1/2.2, APCA, CVD simulation |
| `src/utils/` | OKLCH/OKLab color space operations |
| `src/ui/` | Demo UI, CUD components |

## Path Aliases

- `@/` → `src/`
- `@/core/*` → `src/core/*`
- `@/utils/*` → `src/utils/*`
- `@/ui/*` → `src/ui/*`

## Key Files

### Core Algorithm
- `src/core/solver.ts` - Binary search for target contrast ratios
- `src/core/interpolation.ts` - Catmull-Rom spline interpolation
- `src/core/harmony.ts` - Harmony generation (24k+ lines)

### Accessibility
- `src/accessibility/wcag2.ts` - WCAG 2.1/2.2 contrast
- `src/accessibility/apca.ts` - APCA (WCAG 3) contrast
- `src/accessibility/cvd-simulator.ts` - Color blindness simulation
- `src/accessibility/distinguishability.ts` - Color distinguishability

### CUD Optimization
- `src/core/cud/optimizer.ts` - Greedy optimization algorithm
- `src/core/cud/zone.ts` - 3-zone classification (Safe/Warning/Off)
- `src/core/cud/snapper.ts` - OKLab soft snap
- `src/core/cud/harmony-score.ts` - Harmony scoring

## Design Decisions (ADRs)

| ADR | Decision |
|-----|----------|
| ADR-001 | OKLCH color space adoption |
| ADR-002 | WCAG 2.1 + APCA dual support |
| ADR-003 | 1000-point scale generation |
| ADR-004 | Japanese UI first |
| ADR-005 | Bun runtime adoption |
| ADR-006 | TypeScript strict + Biome |
| ADR-007 | Greedy CUD optimization |

See `.kiro/steering/tech.md` for full ADR details.

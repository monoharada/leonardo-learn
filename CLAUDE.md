# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**leonardo-learn** is an OKLCH color space-based design system color palette generator inspired by Adobe Leonardo. It uses a contrast-ratio-driven approach ("generate colors from contrast requirements" rather than "check contrast after choosing colors") to create accessible palettes from brand colors with WCAG 2.1/2.2 and WCAG 3 APCA compliance, plus CUD (Color Universal Design) support.

## Development Commands

```bash
# Install dependencies
bun install

# Development (watch mode)
bun run dev

# Build (browser-targeted with minification)
bun run build

# Run all tests
bun test

# Run single test file
bun test src/core/cud/optimizer.test.ts

# Watch mode for tests
bun test --watch

# Coverage (target: 90%+)
bun test --coverage

# Performance benchmarks (CI mode)
cross-env CI_BENCH=1 bun test src/core/cud/performance.test.ts

# E2E tests (Playwright)
bun run test:e2e

# E2E tests with UI
bun run test:e2e:ui

# Type check
bun run type-check

# Lint (Biome)
bun run lint
bun run lint:fix

# Format
bun run format

# Full check (lint + format)
bun run check
```

## Architecture

### Three-Layer Design (Adobe Leonardo-inspired)
1. **Theme Layer** (`src/core/theme.ts`): Manages multiple color definitions, theme coordination
2. **Color/BackgroundColor Layer** (`src/core/color.ts`, `background.ts`): Individual color and scale definitions
3. **Algorithm Layer** (`src/core/solver.ts`, `interpolation.ts`): Contrast calculation, binary search, spline interpolation

### Dependency Direction
```
UI Layer (src/ui/) → Core Layer (src/core/) → Utils Layer (src/utils/)
```
Circular dependencies are prohibited.

### Key Modules

| Path | Purpose |
|------|---------|
| `src/core/` | Color generation algorithms, Theme/Color classes |
| `src/core/cud/` | CUD optimization (optimizer, zone, snapper, harmony-score) |
| `src/core/export/` | CSS, JSON, Tailwind, DTCG exporters |
| `src/core/tokens/` | Design token system (DADS importer, semantic resolver) |
| `src/core/system/` | Color system coordination (collision detection, contrast maintenance, role assignment) |
| `src/core/semantic-role/` | Semantic role mapping (contrast boundaries, hue normalization) |
| `src/core/strategies/` | Generation strategies (DADS optimizer, M3 generator) |
| `src/core/preview/` | Preview generation (scale preview, theme preview) |
| `src/accessibility/` | WCAG 2.1/2.2, APCA (WCAG 3), CVD simulation |
| `src/utils/` | OKLCH/OKLab color space operations |
| `src/ui/` | Demo UI, CUD components |
| `e2e/` | Playwright E2E tests |

### CUD Optimization Algorithm (ADR-007)
- **Greedy algorithm** for multi-objective optimization (CUD distance + harmony)
- **3-zone classification**: Safe (ΔE ≤ 0.05), Warning (0.05 < ΔE ≤ 0.12), Off (ΔE > 0.12)
- **Soft Snap**: OKLab linear interpolation with configurable return factor
- Performance target: 20-color palette in <200ms

## Documentation

### User Flows & Testing

**User Flow Documentation**: `.claude/docs/user-flows.md`

Comprehensive documentation of all user interaction flows including:
- **Golden Path**: Brand color → Harmony selection → Palette review → Export (2-3 min)
- **Alternative Flows**: Advanced customization, accessibility validation, background-adaptive design, CUD optimization
- **UI Components**: Detailed breakdown of all 4 views (Harmony, Palette, Shades, Accessibility)
- **User Personas**: Design system maintainers, accessibility specialists, brand designers, frontend developers
- **Feature Interactions**: Event cascades, state management, performance considerations

This document serves as the foundation for E2E and browser testing strategies.

## Code Standards

### TypeScript
- **Strict mode required** (all strict flags enabled in tsconfig.json)
- `any` type prohibited - use `unknown` or proper type definitions
- Path aliases: `@/` for `src/`, `@/core/*`, `@/utils/*`, `@/ui/*`

### Formatting (Biome)
- Tab indentation
- Double quotes
- Auto-organize imports

### Test Placement
Tests are co-located with source files (unit/integration), E2E tests are separate:
```
src/core/cud/optimizer.ts
src/core/cud/optimizer.test.ts      # Unit test (co-located)
e2e/cud-harmony-generator.e2e.ts    # E2E test (separate directory)
```

## Key Libraries

- **culori.js**: OKLCH/OKLab color operations (only runtime dependency)
- **apca-w3**: WCAG 3 APCA contrast calculation
- **@digital-go-jp/design-tokens**: DADS token integration
- **@material/material-color-utilities**: M3 color generation

## Spec-Driven Development

This project uses Kiro-style spec-driven development:
- **Steering docs**: `.kiro/steering/` (product.md, tech.md, structure.md)
- **Specifications**: `.kiro/specs/[feature-name]/`

Key commands:
- `/kiro:spec-status [feature]`: Check progress
- `/kiro:spec-impl [feature] [tasks]`: Implement tasks

### Codex Review Workflow (必須)

**重要**: 各kiro:specフェーズ完了後、必ずCodexレビューを実行すること。

```bash
# 各フェーズ完了後にCodexレビューを実行
/sdd-codex-review requirements [feature]  # kiro:spec-requirements後
/sdd-codex-review design [feature]        # kiro:spec-design後
/sdd-codex-review tasks [feature]         # kiro:spec-tasks後
/sdd-codex-review impl [feature]          # kiro:spec-impl後（従来方式）

# セクション単位レビュー（推奨）
/sdd-codex-review impl-section [feature] [section-id]  # 特定セクション
/sdd-codex-review impl-pending [feature]               # 未レビュー一括

# E2Eエビデンス収集
/sdd-codex-review e2e-evidence [feature] [section-id]  # 手動実行
```

ワークフロー:
1. `/kiro:spec-requirements [feature]` → `/sdd-codex-review requirements [feature]`
2. `/kiro:spec-design [feature]` → `/sdd-codex-review design [feature]`
3. `/kiro:spec-tasks [feature]` → `/sdd-codex-review tasks [feature]`
4. `/kiro:spec-impl [feature] [task]` → `/sdd-codex-review impl-section [feature] [section-id]`（セクション単位推奨）

各フェーズでAPPROVEDを取得してから次へ進む。

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

## E2E Video Evidence Requirements（E2E動画エビデンスルール）

### 必須ルール
E2Eテスト実行後、以下のエビデンスをユーザーに提出すること：

1. **動画エビデンス（必須）**
   - テスト実行中のブラウザ操作が録画された動画ファイル
   - 保存場所: `test-results/` ディレクトリ
   - UIコンポーネント操作（プルダウン、ボタン、入力など）が視認可能であること

2. **HTMLレポート**
   - `bun run test:e2e`実行後、`npx playwright show-report`でレポートを開く
   - トレース情報（スクリーンショット含む）を確認可能にする

### テスト実装要件

E2Eテストでは以下を守ること：

1. **人間的な操作の可視化**:
   - UIコンポーネント操作の前後に`page.waitForTimeout(500-800)`を挿入
   - ボタン、入力フィールドの操作は動画に映る
   - ネイティブ`<select>`のドロップダウン展開はOSレベルUIのため動画に映らない（下記参照）
2. **操作前後の状態変化を明確に**: Before/After状態がわかるようにアサーションを含める
3. **セレクタの明確化**: `data-testid`属性を使用し、要素を確実に特定する

### プルダウン操作の実装

**注意**: ネイティブHTML `<select>` 要素のドロップダウンメニューは、ブラウザのOSネイティブUIでレンダリングされるため、Playwrightの動画録画には展開状態が映りません。

```typescript
// ネイティブ<select>の場合（ドロップダウン展開は動画に映らない）
// クリック→selectOption()で操作し、値の変化を動画で確認
await accentCountSelect.click();              // フォーカスを示す（動画に映る）
await page.waitForTimeout(500);               // 遅延を入れて視認可能に
await accentCountSelect.selectOption("3");    // 値を変更（変更後の値は動画に映る）
await page.waitForTimeout(TIMEOUTS.AFTER_ACTION);
```

**動画で確認できる内容**:
- プルダウンへのクリック（フォーカス）
- 選択後の表示値変化（例: 「3色」→「4色」）
- UIの結果変化（カードの色数変化など）

**動画で確認できない内容**:
- ネイティブドロップダウンの展開・選択肢一覧（OSレベルのUIのため）

### エビデンス提出フロー（Claude Code必須対応）

E2Eテスト実行後、以下の手順でエビデンスを提出すること：

1. `bun run test:e2e` でテスト実行（`playwright.config.ts`で`video: "on"`が有効）
2. テスト結果サマリーをユーザーに報告（パス/失敗数）
3. 動画ファイルの場所を案内: `test-results/[test-name]/video.webm`
4. HTMLレポートの開き方を案内: `npx playwright show-report`
5. 重要な操作のBefore/Afterスクリーンショットを提示（必要に応じて）

### エビデンス提出例

```
## E2Eテスト結果

**テスト実行結果**: 10 passed, 0 failed

### 動画エビデンス
以下のディレクトリに動画ファイルが保存されています：
- `test-results/パレット色数変更-Phase-4-バグ修正-4色パレット選択でカードに4色表示される-chromium/video.webm`
- `test-results/パレット色数変更-Phase-4-バグ修正-5色パレット選択でカードに5色表示される-chromium/video.webm`

### HTMLレポート
以下のコマンドでHTMLレポートを開けます：
npx playwright show-report
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

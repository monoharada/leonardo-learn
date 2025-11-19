# Project Structure

## Organization Philosophy

**ドメイン駆動 + 機能別レイヤー**: 色生成のコアロジック、UI、ドキュメント、テストを明確に分離。Adobe Leonardoの3層アーキテクチャ（Theme/Color/アルゴリズム）を継承しつつ、TypeScriptクラス設計で実装。

## Directory Patterns

### `/src/core/`
**Purpose**: 色生成のコアロジック（Theme、Color、BackgroundColor、アルゴリズム）
**Example**:
```
src/core/
  ├─ theme.ts         # Theme統括クラス
  ├─ color.ts         # Color定義クラス
  ├─ background.ts    # BackgroundColor定義クラス
  ├─ contrast.ts      # WCAG/APCAコントラスト計算
  ├─ interpolate.ts   # Catmull-Romスプライン補間
  └─ search.ts        # 二分探索アルゴリズム
```

### `/src/utils/`
**Purpose**: OKLCH色空間操作、数値計算、型定義などの汎用ユーティリティ
**Example**:
```
src/utils/
  ├─ color-space.ts   # OKLCH/OKLAB変換
  ├─ wcag.ts          # WCAG輝度・コントラスト比計算
  └─ types.ts         # TypeScript型定義
```

### `/src/ui/`
**Purpose**: Reactコンポーネント（日本語UI、プレビュー、パレット出力）
**Example**:
```
src/ui/
  ├─ components/      # 再利用可能UIコンポーネント
  ├─ pages/           # ページレベルコンポーネント
  └─ hooks/           # カスタムフック
```

### `/docs/`
**Purpose**: プロジェクトドキュメント、リファレンス、設計資料
**Example**:
```
docs/
  ├─ reference/       # 外部リソース分析（Adobe Leonardo等）
  └─ design/          # 設計ドキュメント（ADR、アーキテクチャ図）
```

### `/.kiro/`
**Purpose**: Spec-Driven Developmentワークフロー管理
**Note**: プロジェクト固有の開発フロー定義（steering、specs）

## Naming Conventions

- **Files**:
  - TypeScriptクラス: PascalCase（`Theme.ts`, `Color.ts`）
  - ユーティリティ: kebab-case（`color-space.ts`, `wcag.ts`）
  - Reactコンポーネント: PascalCase（`ColorPicker.tsx`, `PalettePreview.tsx`）
- **Components**: PascalCase（`<ColorPicker />`, `<ThemeEditor />`）
- **Functions**: camelCase（`calculateContrast`, `generateScale`, `interpolateColor`）
- **Constants**: UPPER_SNAKE_CASE（`DEFAULT_SCALE_POINTS`, `WCAG_AA_THRESHOLD`）

## Import Organization

```typescript
// 1. 外部ライブラリ
import { oklch, wcagContrast } from 'culori'
import { useState, useEffect } from 'react'

// 2. 内部モジュール（絶対パス優先）
import { Theme, Color } from '@/core'
import { calculateContrast } from '@/utils/wcag'

// 3. 相対パス（同一ディレクトリ内のみ）
import { parseColorInput } from './helpers'
```

**Path Aliases**:
- `@/`: プロジェクトルート（`src/`）
- `@/core`: コアロジック
- `@/utils`: ユーティリティ
- `@/ui`: UIコンポーネント

## Code Organization Principles

### 1. 単一責任の原則
各クラス・モジュールは1つの明確な責務を持つ:
- `Theme`: 複数色の統括管理
- `Color`: 単一色のスケール生成
- `contrast.ts`: コントラスト計算のみ

### 2. 依存性の方向
```
UI層 → Core層 → Utils層
```
- UI層はCoreに依存可、逆は不可
- Core層はUtilsに依存可、逆は不可
- 循環依存の禁止

### 3. 型安全性
- すべてのパブリック関数に明示的な型定義
- `unknown`型を活用（`any`禁止）
- 型ガード関数の使用（`isColor`, `isTheme`）

### 4. テスト配置
```
src/
  core/
    theme.ts
    theme.test.ts  # ソースと同じディレクトリにテスト配置
```

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_

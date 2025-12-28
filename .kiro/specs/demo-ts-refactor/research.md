# Research & Design Decisions

## Summary
- **Feature**: demo-ts-refactor
- **Discovery Scope**: Extension（既存システムのリファクタリング）
- **Key Findings**:
  - demo.tsは3,429行の単一ファイルで、12以上の主要機能が混在
  - 全ての機能がrunDemo()関数内のクロージャとして定義されており、state変数を共有
  - 既存のE2Eテストがあり、DOM構造・class名を維持することが必須条件

## Research Log

### demo.tsの現在の構造分析
- **Context**: リファクタリング対象ファイルの構造把握
- **Sources Consulted**: src/ui/demo.ts（直接分析）
- **Findings**:
  - **総行数**: 3,429行
  - **エントリポイント**: `runDemo()` 関数（176行目〜3,429行目）- 単一の巨大関数
  - **型定義・インターフェース** (63-160行):
    - `KeyColorWithStep`: キーカラーとステップを保持
    - `PaletteConfig`: パレット設定
    - `LightnessDistribution`: 明度分布タイプ
    - `ViewMode`: ビューモード（4種類）
    - `HarmonyTypeConfig`: ハーモニータイプ設定
    - `CVDSimulationType`: CVDシミュレーションタイプ
  - **定数** (91-156行):
    - `HARMONY_TYPES`: 8種類のハーモニー設定配列
  - **状態管理** (162-174行):
    - `state`オブジェクト: グローバル状態（palettes, shadesPalettes, activeId, viewMode等）
  - **主要関数（runDemo内）**:
    | 関数名 | 行番号 | 機能カテゴリ |
    |--------|--------|-------------|
    | parseKeyColor | 200 | ユーティリティ |
    | renderSidebar | 208 | サイドバー |
    | updateEditor | 246 | エディタ |
    | handleGenerate | 285 | パレット生成 |
    | announceViewChange | 387 | ナビゲーション |
    | updateViewButtons | 396 | ナビゲーション |
    | generateExportColors | 484 | エクスポート |
    | downloadFile | 542 | エクスポート |
    | updateExportPreview | 614 | エクスポート |
    | renderMain | 705 | メインルーティング |
    | renderHarmonyView | 756 | ビュー（Harmony） |
    | applySimulation | 1024 | CVD |
    | renderEmptyState | 1034 | ユーティリティ |
    | openColorDetailModal | 1071 | モーダル |
    | renderPaletteView | 1517 | ビュー（Palette） |
    | renderShadesView | 2305 | ビュー（Shades） |
    | renderDadsHueSection | 2382 | ビュー（Shades） |
    | renderBrandColorSection | 2550 | ビュー（Shades） |
    | generateKeyColors | 2947 | CVD |
    | renderAccessibilityView | 3025 | ビュー（Accessibility） |
    | renderDistinguishabilityAnalysis | 3290 | ビュー（Accessibility） |
    | renderAdjacentShadesAnalysis | 3415 | ビュー（Accessibility） |

- **Implications**:
  - 全関数がrunDemo内のクロージャとして定義されているため、状態参照が暗黙的
  - 分離時は状態の明示的な受け渡しまたはインポートが必要
  - モーダル関連のロジック（openColorDetailModal）は450行以上と大きい

### 依存関係の分析
- **Context**: モジュール分割時の依存方向の確認
- **Sources Consulted**: demo.tsのimport文（1-61行）
- **Findings**:
  - **コア依存**:
    - `@/core/semantic-role/*`: セマンティックロール機能
    - `@/core/tokens/*`: DADSトークン
    - `@/core/harmony`: パレット生成
    - `@/core/color`: Colorクラス
    - `@/core/solver`: コントラスト計算
    - `@/core/cud/*`: CUD検証
    - `@/core/export/*`: エクスポーター
  - **アクセシビリティ依存**:
    - `@/accessibility/apca`: APCAコントラスト
    - `@/accessibility/cvd-simulator`: CVDシミュレーション
    - `@/accessibility/distinguishability`: 識別性計算
    - `@/accessibility/wcag2`: WCAG検証
  - **UI内部依存**:
    - `./cud-components`: CUDコンポーネント
    - `./semantic-role/*`: セマンティックロールUI
    - `./style-constants`: 定数・ヘルパー
- **Implications**:
  - 既存の依存構造を維持しつつ、新規モジュール間の依存方向を設計する必要がある
  - 依存方向: `views/*` → `state/constants/types` ← 他のモジュール

### 状態管理パターンの検討
- **Context**: stateオブジェクトの分離方法の決定
- **Findings**:
  - 現在の状態プロパティ:
    - `palettes`: PaletteConfig[] - ハーモニーパレット
    - `shadesPalettes`: PaletteConfig[] - 全13色パレット
    - `activeId`: string - アクティブパレットID
    - `activeHarmonyIndex`: number - 選択中のハーモニーインデックス
    - `contrastIntensity`: ContrastIntensity - コントラスト強度
    - `lightnessDistribution`: LightnessDistribution - 明度分布
    - `viewMode`: ViewMode - 現在のビュー
    - `cvdSimulation`: CVDSimulationType - CVDシミュレーション状態
    - `selectedHarmonyConfig`: HarmonyTypeConfig | null - 選択されたハーモニー設定
    - `cudMode`: CudCompatibilityMode - CUDモード
  - 状態はrunDemo()開始時にconstで定義され、各関数がクロージャ経由でアクセス
- **Implications**:
  - シングルトンパターンでモジュール化可能（`export const state = {...}`）
  - 状態アクセス用のヘルパー関数（getActivePalette等）も同モジュールに配置

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| モジュール分割 + シングルトン状態 | 機能別ファイル分割、状態は単一エクスポートオブジェクト | シンプル、既存コードとの親和性高 | 状態の変更追跡が難しい | 推奨: 最小変更でリファクタリング可能 |
| 状態管理ライブラリ導入 | Zustand等の軽量状態管理 | 状態変更の追跡が容易、DevTools対応 | 追加依存、学習コスト | 今回のスコープ外 |
| クラスベース設計 | 各ビューをクラス化 | 明確なカプセル化 | 既存コードとの乖離大、改修コスト高 | 今回は見送り |

## Design Decisions

### Decision: シングルトン状態パターンの採用
- **Context**: 3,429行のファイルを分割する際、グローバル状態へのアクセス方法を決定する必要がある
- **Alternatives Considered**:
  1. 全関数に状態を引数として渡す — 呼び出し側の変更が多大
  2. シングルトンオブジェクトとしてエクスポート — 最小変更で既存動作を維持
  3. Context/Providerパターン — React環境でないため不適
- **Selected Approach**: シングルトンオブジェクトとしてエクスポート
- **Rationale**: 既存コードの構造を最大限維持しつつ、モジュール分割を実現できる
- **Trade-offs**: 状態の変更追跡は難しいままだが、今回のスコープは分割のみ
- **Follow-up**: 将来的にZustand等の導入を検討可能

### Decision: ビュー関数の独立モジュール化
- **Context**: 4つのビュー（Harmony/Palette/Shades/Accessibility）が単一ファイルに混在
- **Alternatives Considered**:
  1. 各ビューを完全に独立したファイルに分離 — 推奨
  2. ビュー関連を1つのviews.tsにまとめる — 依然として大きくなりすぎる
- **Selected Approach**: `src/ui/demo/views/` ディレクトリに個別ファイルとして分離
- **Rationale**: 各ビューの修正が他に影響しない、テストが容易になる
- **Trade-offs**: ファイル数増加、ただし構造は明確化
- **Follow-up**: 各ビューファイルは500行以下を目標

### Decision: 色詳細モーダルの独立モジュール化
- **Context**: openColorDetailModal関数は450行以上あり、複雑なキャンバス操作を含む
- **Alternatives Considered**:
  1. 独立モジュールとして分離 — 推奨
  2. 各ビューファイルに分散 — 重複コード発生
- **Selected Approach**: `src/ui/demo/color-detail-modal.ts` として独立化
- **Rationale**: スクラバー操作、色同期など特化した責務を持つ
- **Trade-offs**: モーダル内で使用する状態へのアクセス方法を明示化する必要がある
- **Follow-up**: 状態とレンダリングコールバックを引数で渡す設計

### Decision: 後方互換性のためのre-export構造
- **Context**: 既存の `import { runDemo } from "@/ui/demo"` を壊さない
- **Selected Approach**: `src/ui/demo.ts` を `export * from "./demo/index"` のみに変更
- **Rationale**: 既存のインポートパスを維持、段階的移行が可能
- **Trade-offs**: 一時的にファイルが増えるが、将来的に旧demo.tsは削除可能

## Risks & Mitigations

- **循環依存リスク** — 依存方向を明確化（views → state/types ← utils）し、`madge --circular` で検証
- **DOM構造変更リスク** — E2Eテストを分割作業の各段階で実行し、リグレッションを早期発見
- **暗黙的な状態参照の見落とし** — 各関数が参照するstateプロパティを分析し、明示的なインポートに変換
- **大規模リファクタリングによるマージ競合** — 小さなPR単位で進行、1モジュールずつ分離

## References

- [プロジェクト構造ガイドライン](.kiro/steering/structure.md) — ディレクトリパターンと命名規則
- [技術スタック](.kiro/steering/tech.md) — TypeScript strict mode、依存方向の制約
- [madge](https://github.com/pahen/madge) — 循環依存検出ツール

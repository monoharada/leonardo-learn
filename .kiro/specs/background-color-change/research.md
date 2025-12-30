# Research & Design Decisions: 背景色変更機能

---
**Purpose**: 背景色変更機能の技術調査結果と設計判断を記録

**Usage**:
- Discovery phaseで収集した情報
- 設計判断の根拠とトレードオフ
---

## Summary
- **Feature**: `background-color-change`
- **Discovery Scope**: Extension（既存システムへの拡張）
- **Key Findings**:
  - 既存のDemoState構造に`backgroundColor`を追加する形で統合可能
  - コントラスト計算にculori.jsの`wcagContrast`を使用（既存実装）
  - localStorageパターンは`src/ui/cud-components.ts`に前例あり

## Research Log

### 既存の状態管理パターン
- **Context**: DemoStateにbackgroundColorを追加する方法を調査
- **Sources Consulted**: `src/ui/demo/state.ts`, `src/ui/demo/types.ts`, `src/ui/demo/constants.ts`
- **Findings**:
  - DemoStateはシングルトンパターンで管理（state.tsでexport）
  - DEFAULT_STATEで初期値を定義
  - resetState()でテスト間のリセットをサポート
- **Implications**: `backgroundColor`フィールドを追加し、同じパターンに従う

### コントラスト計算の既存実装
- **Context**: 背景色変更時のコントラスト再計算方法
- **Sources Consulted**: `src/utils/wcag.ts`, `src/ui/demo/views/palette-view.ts`, `src/ui/demo/views/shades-view.ts`
- **Findings**:
  - `wcagContrast`（culori.js）を使用
  - `verifyContrast`（src/accessibility/wcag2）でWCAGレベル判定
  - 現在は`#ffffff`固定で計算（palette-view.ts:92, 395行目）
- **Implications**: bgColorを動的に変更可能な設計に拡張

### localStorage永続化パターン
- **Context**: 背景色のセッション間永続化
- **Sources Consulted**: `src/ui/cud-components.ts`
- **Findings**:
  - cud-components.tsでlocalStorageを使用した前例あり
  - 読み込み時のバリデーションとフォールバック処理が必要
- **Implications**: 同様のパターンで`leonardo-backgroundColor`キーを使用

### 色空間変換
- **Context**: HEX→OKLCH変換（モード判定用）
- **Sources Consulted**: CSS Color 4仕様、culori.jsドキュメント
- **Findings**:
  - culori.jsの`oklch()`で変換可能
  - D65白色点を使用（CSS Color 4準拠）
  - L値（明度）0.5を閾値としてlight/dark判定
- **Implications**: culori.jsの既存依存でカバー可能

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| State拡張 | DemoStateにbackgroundColorを追加 | 既存パターンと一貫性、実装シンプル | 状態が大きくなる | 採用 |
| Context API | React Contextで背景色を管理 | コンポーネント分離 | 現在はVanilla TSのため不整合 | 不採用 |
| CSS変数 | CSS Custom Propertiesで管理 | スタイル分離 | JS状態との同期が複雑 | 部分採用（表示のみ） |

## Design Decisions

### Decision: DemoStateへの直接追加
- **Context**: 背景色状態の管理方法
- **Alternatives Considered**:
  1. 専用モジュール作成 — 分離されるが複雑化
  2. DemoStateに追加 — シンプルで既存パターンと一貫
- **Selected Approach**: DemoStateにbackgroundColorフィールドを追加
- **Rationale**: 既存のresetState()やビュー切替で自動的に状態が維持される
- **Trade-offs**: stateオブジェクトが1フィールド増える（許容範囲）
- **Follow-up**: 型定義（types.ts）とデフォルト値（constants.ts）の更新が必要

### Decision: コントラスト計算の抽象化
- **Context**: 背景色変更時の再計算
- **Alternatives Considered**:
  1. 各View内でインライン計算 — 重複発生
  2. 共通関数に抽出 — 再利用可能
- **Selected Approach**: `calculateContrastWithBackground()`ユーティリティ関数を追加
- **Rationale**: palette-view、shades-view、accessibility-viewで共通利用
- **Trade-offs**: 新規関数追加が必要
- **Follow-up**: src/utils/wcag.tsに追加

### Decision: light/darkモード自動判定
- **Context**: 背景色に応じたUI適応
- **Alternatives Considered**:
  1. ユーザー手動選択 — UX低下
  2. OKLCH L値で自動判定 — シームレス
- **Selected Approach**: OKLCH L > 0.5 → light、それ以外 → dark
- **Rationale**: CSS Color 4準拠、知覚的に正確
- **Trade-offs**: 境界付近（L≈0.5）でどちらとも言えない色がある
- **Follow-up**: テストで境界ケースを検証

## Risks & Mitigations
- **既存テストへの影響** — resetState()でbackgroundColorもリセットされるため、既存テストは影響なし
- **パフォーマンス** — 20色×1コントラスト計算は十分高速（200ms以内）
- **ブラウザ互換性** — `<input type="color">`は全モダンブラウザ対応

## References
- [culori.js - WCAG Contrast](https://culorijs.org/color-difference/#wcagcontrast) — コントラスト計算
- [CSS Color Level 4](https://www.w3.org/TR/css-color-4/#ok-lab) — OKLCH仕様
- [WCAG 2.1 Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) — AAA/AA/L基準

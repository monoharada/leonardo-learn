# Research & Design Decisions: シェードUI改善

---
**Purpose**: シェードUI改善機能のディスカバリー結果と設計判断の根拠を記録。

**Usage**:
- design.mdの背景情報として参照
- 将来のメンテナンス時の意思決定トレース
---

## Summary
- **Feature**: `shade-ui-improvement`
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - 既存のシェードビュー（`renderShadesView`）はDADSプリミティブカラー表示に特化しており、セマンティックロール情報を持たない
  - `DADS_COLORS`（harmony.ts）がセマンティックロールの定義を持ち、chromaName/stepでhue-scaleを特定可能
  - CUDバッジシステム（cud-components.ts）の実装パターンが参考になる

## Research Log

### 既存シェードビュー構造の調査
- **Context**: セマンティックロール表示の統合ポイントを特定するため
- **Sources Consulted**: `src/ui/demo.ts:1826-1997`
- **Findings**:
  - `renderShadesView`は`loadDadsTokens()`でDADSトークンを取得
  - `renderDadsHueSection`で各色相セクションを描画
  - 各スウォッチ（`.dads-swatch`）にscaleラベルとhexラベルを表示
  - ブランドカラーセクションは別途`renderBrandColorSection`で描画
- **Implications**: スウォッチ要素にドット・バッジを子要素として追加する設計が適切

### セマンティックロール定義の調査
- **Context**: どのデータ構造からロールマッピングを生成するか
- **Sources Consulted**: `src/core/harmony.ts:175-256`
- **Findings**:
  - `DADS_COLORS`配列がセマンティック/リンク/アクセントロールを定義
  - 各定義は`name`, `chromaName`, `step`, `category`を持つ
  - categoryは`semantic`|`link`|`accent`の3種
  - 例: `{ name: "Success-1", chromaName: "green", step: 600, category: "semantic" }`
- **Implications**: `DADS_COLORS`を参照してhue-scale→ロールのマッピングを構築可能

### ブランドロール（Primary/Secondary）の調査
- **Context**: ブランドロールのhue-scale特定方法
- **Sources Consulted**: `src/core/harmony.ts:356-400`
- **Findings**:
  - `SystemPaletteColor`型に`baseChromaName`と`step`フィールドが存在
  - ハーモニーパレット生成時に`snapToBaseChroma`でbaseChromaNameを決定
  - ブランドロールはユーザー入力色から派生するため、固定のhue-scaleを持たない場合がある
- **Implications**: ブランドロールは`baseChromaName`/`step`が存在する場合のみhue-scaleを表示、ない場合はロール名のみ表示

### 既存バッジシステムの調査
- **Context**: ドット・バッジのUI実装パターン
- **Sources Consulted**: `src/ui/cud-components.ts:119-146, 1083-1120`
- **Findings**:
  - `createCudBadge`関数がDOM要素を直接生成
  - スタイルはインラインCSS（`style.cssText`）で設定
  - `data-*`属性でメタデータを保持
  - ツールチップは`title`属性で実装
- **Implications**: 同様のパターンでセマンティックロールバッジを実装可能

### パフォーマンス考慮事項
- **Context**: 要件5のパフォーマンス要件（200ms以内）
- **Sources Consulted**: ADR-007（tech.md:161-256）
- **Findings**:
  - 貪欲法ベースの最適化で20色パレット200ms以内を達成
  - DOM要素の追加は既存スウォッチの子要素として行う設計が効率的
- **Implications**: マッピング計算は軽量（O(n×m)、n=パレット色数、m=DADS_COLORS数）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A. 既存renderDadsHueSection拡張 | 既存関数内でドット・バッジを追加 | 変更範囲が最小 | 責務が混在 | 短期的には有効 |
| B. SemanticRoleOverlayコンポーネント | 専用オーバーレイコンポーネントを作成 | 責務分離が明確 | 新規コンポーネント追加 | **採用** |
| C. スウォッチコンポーネント拡張 | スウォッチ自体を拡張 | 再利用性向上 | 既存スウォッチとの互換性 | 大規模リファクタ必要 |

**選択**: Option B - SemanticRoleOverlayコンポーネント
- 理由: 既存コードへの影響を最小化しつつ、新機能を分離可能

## Design Decisions

### Decision: セマンティックロールマッピングの生成タイミング
- **Context**: マッピングをいつ計算し、どこに保持するか
- **Alternatives Considered**:
  1. 毎レンダリング時に計算 — シンプルだがパフォーマンスリスク
  2. パレット変更時に事前計算してキャッシュ — 効率的だが同期管理が必要
- **Selected Approach**: パレット変更時に事前計算してマッピングMapを生成
- **Rationale**: 200ms以内のパフォーマンス要件を確実に満たすため
- **Trade-offs**: キャッシュ無効化ロジックが必要
- **Follow-up**: パレット状態変更のトリガーポイントを明確化

### Decision: ドットインジケーターの配置
- **Context**: スウォッチ内のどこにドットを配置するか
- **Alternatives Considered**:
  1. 右上 — 視認性が高い、テキストと重ならない
  2. 左上 — 既存レイアウトと競合しにくい
  3. 右下 — hexラベルと重なる可能性
- **Selected Approach**: 右上に配置（position: absolute）
- **Rationale**: 要件2.1で明示的に右上を指定、既存のscaleラベルは左上のため競合しない
- **Trade-offs**: スウォッチがposition: relativeである必要がある

### Decision: 複数ロール表示の制限
- **Context**: 同一シェードに複数ロールがある場合の表示
- **Alternatives Considered**:
  1. すべて表示 — 情報量最大だがスペース不足
  2. 最大2つ+「+N」表示 — バランスが良い
  3. 最初の1つのみ — シンプルだが情報欠落
- **Selected Approach**: 最大2つまでバッジ表示、残りは「+N」形式
- **Rationale**: 要件1.5および3.4で明示的に指定
- **Trade-offs**: ツールチップで全ロールを確認可能にする必要

### Decision: カテゴリ別ドット色の定義
- **Context**: セマンティックカテゴリをどの色で表現するか
- **Alternatives Considered**:
  1. 要件指定の固定色 — 一貫性が高い
  2. 実際のロール色に基づく — 直感的だが複雑
- **Selected Approach**: 要件2.2の固定色を使用
  - Primary: #6366f1（インディゴ）
  - Secondary: #8b5cf6（パープル）
  - Accent: #ec4899（ピンク）
  - Semantic: #10b981（エメラルド）
  - Link: #3b82f6（ブルー）
- **Rationale**: 要件で明示的に指定されており、CVDシミュレーション時も固定
- **Trade-offs**: 色の意味が実際のロール色と異なる可能性

## Risks & Mitigations
- **R1**: 既存CSSとのスタイル競合 → 新規クラス名にプレフィックス（`.semantic-role-*`）を使用
- **R2**: パフォーマンス劣化 → マッピングキャッシュとメモ化で対応
- **R3**: アクセシビリティ不足 → `aria-describedby`と一意ID生成を確実に実装
- **R4**: CVDシミュレーションとの競合 → ドット・バッジ色は固定、スウォッチのみシミュレーション適用

## References
- [DADS公式ドキュメント](https://design.digital.go.jp/) — デザイントークン仕様
- ADR-007: CUD最適化アルゴリズム（tech.md内）— 貪欲法設計パターン
- WCAG 2.1 Success Criterion 1.4.11 — Non-text Contrast要件

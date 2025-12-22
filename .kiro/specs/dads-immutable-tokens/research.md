# Research & Design Decisions

## Summary
- **Feature**: dads-immutable-tokens
- **Discovery Scope**: Extension（既存CUDシステムの拡張）
- **Key Findings**:
  - 既存Design Doc（v0.6）が包括的な設計を提供済み
  - CUDモジュール構造（snapper/optimizer/service）が明確
  - v1/v2 API並行運用による段階的移行が必要

## Research Log

### 既存コードベース構造分析
- **Context**: 拡張対象のモジュール構造を把握
- **Sources Consulted**: `src/core/cud/`, `src/core/export/`
- **Findings**:
  - `snapper.ts`: SoftSnapResult型、Soft Snap実装
  - `optimizer.ts`: OptimizedColor型、パレット最適化
  - `service.ts`: processPaletteWithMode（UIエントリポイント）
  - `zone.ts`: CudZone型定義
  - `css-exporter.ts`, `json-exporter.ts`: エクスポート機能
- **Implications**: 新規ファイル（`tokens/types.ts`, `tokens/id-generator.ts`）追加と既存ファイル拡張の組み合わせ

### DADSプリミティブカラー仕様
- **Context**: @digital-go-jp/design-tokens の構造理解
- **Sources Consulted**: Design Doc v0.6 Section 4.1
- **Findings**:
  - 10色相 × 13スケール（chromatic）
  - white/black + solid-gray/opacity-gray（neutral）
  - var()参照によるsemantic colors
  - opacity-grayはrgba()形式
- **Implications**: CSS変数パーサーが3カテゴリ対応必要

### API互換性戦略
- **Context**: 既存UIとの互換性維持
- **Sources Consulted**: Design Doc v0.6 Section 9
- **Findings**:
  - v1: OptimizedColor[]（現行）
  - v2: BrandToken[] + dadsReferences
  - 3フェーズ移行（A: v1デフォルト → B: v2デフォルト → C: v1削除）
- **Implications**: TypeScript generics によるバージョン分岐

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Discriminated Union | DadsToken \| BrandToken をsourceで識別 | 型安全、明確な分離 | 型ガード必要 | **採用** |
| 継承ベース | BaseToken → DadsToken/BrandToken | OOP的 | TypeScriptでは冗長 | 不採用 |
| 単一型 + フラグ | Token { isDads: boolean } | シンプル | 型安全性低下 | 不採用 |

## Design Decisions

### Decision: トークン型分離（Discriminated Union）
- **Context**: DADSとBrandの明確な区別が必要
- **Alternatives Considered**:
  1. 継承ベース（BaseToken拡張）
  2. 単一型 + フラグ
- **Selected Approach**: `source: "dads" | "brand"` による Discriminated Union
- **Rationale**: TypeScriptの型ガードと相性が良く、コンパイル時チェックが効く
- **Trade-offs**: isDadsToken/isBrandToken型ガード関数が必要
- **Follow-up**: 将来的にsemantic tokenを追加する場合は型拡張

### Decision: 命名規則Option C採用
- **Context**: CSS変数名の衝突回避
- **Alternatives Considered**:
  1. Option A: `dads-red-500` / `red-500`
  2. Option B: `red-500` / `brand-primary-500`
  3. Option C: `dads-red` / `brand-primary-500`
- **Selected Approach**: Option C（両方に接頭辞）
- **Rationale**: 衝突なし、出自明確、将来的な拡張性
- **Trade-offs**: 変数名がやや長くなる

### Decision: v1/v2 API並行運用
- **Context**: 既存UIの破壊的変更を避ける
- **Alternatives Considered**:
  1. 破壊的変更（v2のみ）
  2. アダプターパターン
  3. バージョン分岐
- **Selected Approach**: TypeScript generics によるバージョン分岐
- **Rationale**: 型安全性を維持しながら段階的移行が可能
- **Trade-offs**: コード複雑性増加

## Risks & Mitigations
- **Risk 1**: 既存テストへの影響 → 後方互換性維持、v1デフォルト
- **Risk 2**: パフォーマンス劣化 → BrandToken生成は最適化後の単純変換
- **Risk 3**: CUD推奨色とDADSの不一致 → deltaE計算で距離を可視化

## References
- [Design Doc v0.6](../../docs/design/dads-immutable-tokens.md) — 詳細設計
- [Issue #11](https://github.com/monoharada/leonardo-learn/issues/11) — 要件定義
- [CUD推奨配色セット ver.4](https://jfly.uni-koeln.de/colorset/) — CUD仕様
- [Design Tokens Community Group](https://design-tokens.github.io/community-group/) — DTCG形式

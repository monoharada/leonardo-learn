# Research & Design Decisions: CUD-aware Harmony Generator

---
**Purpose**: 技術設計を裏付ける調査結果、アーキテクチャ検討、設計判断の根拠を記録する。
---

## Summary
- **Feature**: `cud-aware-harmony-generator`
- **Discovery Scope**: Extension with Complex Integration
- **Key Findings**:
  - 既存CUDモジュール（service.ts, snapper.ts, validator.ts）が堅牢な基盤を提供
  - OKLCH色空間での色差計算（deltaEok）が知覚的均一性を担保
  - 貪欲法ベースの最適化がパフォーマンス要件（200ms以内）を満たす最適解

## Research Log

### OKLCHにおける色調和スコア計算手法
- **Context**: 要件4「ブランド調和スコア維持」の実装アプローチ決定
- **Sources Consulted**:
  - [OKLCH: Bringing Perceptual Harmony to Web Colors](https://algustionesa.com/oklch-bringing-perceptual-harmony-to-web-colors/)
  - [Evil Martians: Exploring the OKLCH ecosystem](https://evilmartians.com/chronicles/exploring-the-oklch-ecosystem-and-its-tools)
  - [CSS-Tricks OKLCH Function](https://css-tricks.com/almanac/functions/o/oklch/)
  - [Oklab color space - Wikipedia](https://en.wikipedia.org/wiki/Oklab_color_space)
- **Findings**:
  - OKLCH色空間は知覚的均一性を提供し、同じ数値変化が同等の視覚的差異に対応
  - 色相の回転で調和的なパレットを数学的に生成可能（360/n度シフト）
  - deltaE（ユークリッド距離）で知覚的色差を正確に測定可能
  - 調和スコアは色相距離・明度差・コントラスト適合度の加重平均で表現可能
- **Implications**:
  - 既存の`deltaEok()`関数をそのまま活用可能
  - 調和スコア計算は3つの独立した部分スコアの合成として設計
  - 重み付けはユーザーカスタマイズ可能にすべき

### 最適化アルゴリズム選定
- **Context**: 要件3「CUD-aware最適化アルゴリズム」のアルゴリズム選定
- **Sources Consulted**:
  - 既存`generateHarmonyPalette()`実装分析
  - パフォーマンス要件（20色/200ms）の制約分析
- **Findings**:
  - **貪欲法**: O(n×m) where n=パレット色数, m=CUD色数（20）
    - 20色パレット: 20×20 = 400回の比較 → <10ms
    - シンプルで予測可能、デバッグ容易
  - **遺伝的アルゴリズム**: 収束まで100-1000世代必要
    - 高品質解だが計算コスト高、200ms制約で困難
  - **線形計画法**: 連続最適化には適するが離散選択問題に不向き
- **Implications**:
  - 貪欲法を採用（パフォーマンス優先）
  - 将来的に品質向上が必要な場合はローカルサーチで拡張可能

### 既存CUDモジュール統合分析
- **Context**: 新機能の既存コードベースへの統合方針決定
- **Sources Consulted**:
  - `src/core/cud/service.ts` - MatchLevel定義、findNearestCudColor()
  - `src/core/cud/snapper.ts` - snapToCudColor(), SnapOptions
  - `src/core/cud/validator.ts` - validatePalette()
  - `src/ui/cud-components.ts` - CudCompatibilityMode, createCudModeSelector()
- **Findings**:
  - 既存MatchLevel (exact/near/moderate/off) と新Zone (safe/warning/off) の概念が重複
  - 閾値の違い: MatchLevel(0.03/0.10/0.20) vs Zone(0.05/0.12)
  - 両概念は目的が異なる: MatchLevelは「分類」、Zoneは「処理方針」
- **Implications**:
  - Zone判定はMatchLevelとは別の新関数として実装
  - ZoneはSnapOptions拡張で活用、MatchLevelは検証用に維持
  - 既存APIの後方互換性を維持

### Soft Snap戻り係数の設計
- **Context**: 要件5「Soft Snapモード」の戻り係数実装方針
- **Sources Consulted**:
  - 色補間アルゴリズム（OKLab空間での線形補間）
  - 既存clampChroma()実装
- **Findings**:
  - OKLab空間での線形補間が知覚的に最も自然
  - 戻り係数0.5でCUD色と元色の中間点、0.0で元色、1.0でCUD色
  - 補間式: `result = original + factor × (cudTarget - original)`
- **Implications**:
  - Soft SnapはOKLab空間で補間を実行
  - 補間後にsRGBガマット境界にクランプ
  - デフォルト戻り係数は0.5（中間的なバランス）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| **Option A: 既存拡張** | 既存ファイルに機能追加 | ファイル数最小、テスト再利用 | ファイル肥大化、責務混在 | harmony.ts既に784行 |
| **Option B: 新規作成** | 全機能を新モジュール化 | 責務分離、テスト容易 | ファイル数増加、設計コスト | インターフェース設計必要 |
| **Option C: ハイブリッド** | コア新規 + 既存拡張 | バランス良好、段階実装可 | 計画複雑さ | **採用** |

**選定理由**: Option Cは責務分離（新規モジュール）と既存活用（API拡張）のバランスが最適。パフォーマンス要件を満たしつつ、保守性も確保できる。

## Design Decisions

### Decision: ハイブリッドアーキテクチャの採用
- **Context**: 8要件を実装するためのモジュール構成決定
- **Alternatives Considered**:
  1. Option A - 既存ファイル拡張のみ
  2. Option B - 完全新規モジュール化
  3. Option C - ハイブリッド（コア新規 + 既存拡張）
- **Selected Approach**: Option C（ハイブリッド）
- **Rationale**:
  - 新規コア機能（optimizer, harmony-score, anchor, zone）は独立した責務を持つ
  - 既存API（snapper, cud-components, exporter）は後方互換性を維持しつつ拡張
  - テストの分離が容易で、段階的な実装・検証が可能
- **Trade-offs**:
  - ✅ 責務分離と既存活用のバランス
  - ✅ 段階的実装・テストが可能
  - ❌ 新旧モジュール間の依存関係管理が必要
- **Follow-up**: 依存関係図を設計書に含める

### Decision: 貪欲法ベース最適化アルゴリズムの採用
- **Context**: CUD最適化のアルゴリズム選定（パフォーマンス vs 品質）
- **Alternatives Considered**:
  1. 貪欲法 - 各色を最も近いCUD色にマッピング
  2. 遺伝的アルゴリズム - 世代進化で最適解探索
  3. 分枝限定法 - 厳密解探索
- **Selected Approach**: 貪欲法
- **Rationale**:
  - 20色パレットで200ms以内の要件を確実に満たす
  - 実装がシンプルで予測可能な動作
  - CUD推奨色が20色と限定的なため、貪欲法でも高品質解が期待できる
- **Trade-offs**:
  - ✅ 高速（<10ms）
  - ✅ 実装・デバッグ容易
  - ❌ 局所最適解にとどまる可能性
- **Follow-up**: パフォーマンステストで実測値を確認

### Decision: Zone閾値の設定（Safe: 0.05, Warning: 0.12）
- **Context**: CUD許容ゾーンの境界値決定
- **Alternatives Considered**:
  1. 既存MatchLevel閾値を流用（exact: 0.03, near: 0.10, moderate: 0.20）
  2. 新規Zone閾値（Safe: 0.05, Warning: 0.12, Off: >0.12）
  3. ユーザー完全カスタマイズ（デフォルトなし）
- **Selected Approach**: 新規Zone閾値（デフォルトあり、カスタマイズ可能）
- **Rationale**:
  - Safe Zone（≤0.05）: CUD exact（0.03）より少し緩く、実用的な「十分近い」範囲
  - Warning Zone（≤0.12）: near（0.10）より少し緩く、視覚的に許容できる範囲
  - Off Zone（>0.12）: 明確にCUD非準拠として警告すべき範囲
- **Trade-offs**:
  - ✅ 実用的なデフォルト値
  - ✅ ユーザーカスタマイズで柔軟性確保
  - ❌ 主観的な閾値設定
- **Follow-up**: ゴールデンテストで妥当性検証

### Decision: 調和スコア計算式の採用
- **Context**: 調和スコアの計算方法決定
- **Alternatives Considered**:
  1. 色相距離のみ
  2. 色相 + 明度 + コントラストの加重平均
  3. 機械学習ベースのスコアリング
- **Selected Approach**: 加重平均（w1×hue + w2×lightness + w3×contrast）
- **Rationale**:
  - 解釈可能性: 各要素の寄与が明確
  - 調整可能性: 重み変更で用途に応じたカスタマイズ
  - 実装容易性: 既存関数を組み合わせて実現可能
- **Trade-offs**:
  - ✅ 透明性が高い
  - ✅ カスタマイズ可能
  - ❌ 主観的な重み設定が必要
- **Follow-up**: デフォルト重み（0.4:0.3:0.3）の妥当性をユーザーテストで検証

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| 最適化パフォーマンス不足 | High | Low | 早期ベンチマーク、必要ならキャッシュ導入 |
| 調和スコアの妥当性不足 | Medium | Medium | ゴールデンテストでCUD公式「良い例」を検証 |
| Zone閾値の不適切さ | Medium | Medium | ユーザーカスタマイズ機能で対応 |
| 既存API破壊 | High | Low | 既存関数は変更せず、新関数を追加 |
| UI複雑化によるUX低下 | Medium | Medium | モード切替の直感的なUI設計 |

## References

- [CUD推奨配色セット ver.4 公式](https://jfly.uni-koeln.de/colorset/) — CUD 20色の公式定義
- [OKLCH Color Picker](https://oklch.org/) — OKLCH色空間の視覚化ツール
- [Evil Martians Harmonizer](https://evilmartians.com/chronicles/exploring-the-oklch-ecosystem-and-its-tools) — OKLCH/APCAベースのパレット生成
- [Oklab color space - Wikipedia](https://en.wikipedia.org/wiki/Oklab_color_space) — Oklab/Oklchの理論的背景
- [CSS Color Level 4](https://www.w3.org/TR/css-color-4/) — OKLCH仕様
